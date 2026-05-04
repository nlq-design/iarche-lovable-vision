
-- 1. team_invitations
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','editor','viewer')),
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32),'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_workspace ON public.team_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations(token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invitations_unique_pending
  ON public.team_invitations(workspace_id, email)
  WHERE accepted_at IS NULL;

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_invitations_select" ON public.team_invitations;
CREATE POLICY "team_invitations_select" ON public.team_invitations
  FOR SELECT USING (
    public.has_workspace_role(workspace_id, auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'cockpit_admin'::app_role)
  );

DROP POLICY IF EXISTS "team_invitations_insert" ON public.team_invitations;
CREATE POLICY "team_invitations_insert" ON public.team_invitations
  FOR INSERT WITH CHECK (
    public.has_workspace_role(workspace_id, auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'cockpit_admin'::app_role)
  );

DROP POLICY IF EXISTS "team_invitations_delete" ON public.team_invitations;
CREATE POLICY "team_invitations_delete" ON public.team_invitations
  FOR DELETE USING (
    public.has_workspace_role(workspace_id, auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'cockpit_admin'::app_role)
  );

DROP POLICY IF EXISTS "team_invitations_update_blocked" ON public.team_invitations;
CREATE POLICY "team_invitations_update_blocked" ON public.team_invitations
  FOR UPDATE USING (false) WITH CHECK (false);

-- 2. workspace_members extension
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'workspace_members' AND constraint_name = 'workspace_members_status_check'
  ) THEN
    ALTER TABLE public.workspace_members
      ADD CONSTRAINT workspace_members_status_check CHECK (status IN ('active','suspended'));
  END IF;
END $$;

ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
