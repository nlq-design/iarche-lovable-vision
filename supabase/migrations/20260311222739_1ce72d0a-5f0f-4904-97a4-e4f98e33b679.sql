
-- ============================================================
-- Phase 1b: Create owner_profile table, extend constraints, RLS
-- ============================================================

-- 1. Create owner_profile table
CREATE TABLE public.owner_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  role_label text,
  avatar_url text,
  email text,
  primary_company_id uuid REFERENCES public.billing_entities(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT owner_profile_user_workspace_unique UNIQUE (user_id, workspace_id)
);

-- 2. Add owner_id to workspaces
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.owner_profile(id) ON DELETE SET NULL;

-- 3. Extend linked_entity_type CHECK on transcription_participants
ALTER TABLE public.transcription_participants
  DROP CONSTRAINT IF EXISTS transcription_participants_linked_entity_type_check;
ALTER TABLE public.transcription_participants
  ADD CONSTRAINT transcription_participants_linked_entity_type_check
  CHECK (linked_entity_type = ANY (ARRAY['partner'::text, 'lead_contact'::text, 'lead'::text, 'project'::text, 'owner'::text, NULL::text]));

-- 4. Extend linked_entity_type CHECK on participant_entity_mappings
ALTER TABLE public.participant_entity_mappings
  DROP CONSTRAINT IF EXISTS participant_entity_mappings_linked_entity_type_check;
ALTER TABLE public.participant_entity_mappings
  ADD CONSTRAINT participant_entity_mappings_linked_entity_type_check
  CHECK (linked_entity_type = ANY (ARRAY['partner'::text, 'lead_contact'::text, 'lead'::text, 'project'::text, 'owner'::text]));

-- 5. Enable RLS
ALTER TABLE public.owner_profile ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies
CREATE POLICY "owner_profile_select"
  ON public.owner_profile FOR SELECT
  TO authenticated
  USING (public.can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "owner_profile_insert"
  ON public.owner_profile FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'owner'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "owner_profile_update"
  ON public.owner_profile FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "owner_profile_delete"
  ON public.owner_profile FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'cockpit_admin'::public.app_role));

-- 7. Trigger updated_at
CREATE TRIGGER set_owner_profile_updated_at
  BEFORE UPDATE ON public.owner_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 8. Indexes
CREATE INDEX idx_owner_profile_user_id ON public.owner_profile(user_id);
CREATE INDEX idx_owner_profile_workspace_id ON public.owner_profile(workspace_id);
CREATE INDEX idx_workspaces_owner_id ON public.workspaces(owner_id);
