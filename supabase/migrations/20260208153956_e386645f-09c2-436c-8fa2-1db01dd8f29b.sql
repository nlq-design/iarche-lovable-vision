
-- Table de mémoire cross-transcription pour les liaisons participant ↔ entité CRM
CREATE TABLE public.participant_entity_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  participant_name TEXT NOT NULL,
  linked_entity_type TEXT NOT NULL CHECK (linked_entity_type IN ('partner', 'lead_contact', 'lead', 'project')),
  linked_entity_id UUID NOT NULL,
  linked_entity_name TEXT, -- cached name for display
  usage_count INT NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (workspace_id, participant_name, linked_entity_type, linked_entity_id)
);

ALTER TABLE public.participant_entity_mappings ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access to participant_entity_mappings"
  ON public.participant_entity_mappings
  FOR ALL
  TO authenticated
  USING (public.has_cockpit_access(auth.uid()))
  WITH CHECK (public.has_cockpit_access(auth.uid()));

-- Partners can read mappings in their workspace
CREATE POLICY "Partners can read participant_entity_mappings"
  ON public.participant_entity_mappings
  FOR SELECT
  TO authenticated
  USING (public.is_partner_user());

CREATE INDEX idx_participant_mappings_name ON public.participant_entity_mappings (workspace_id, lower(participant_name));
CREATE INDEX idx_participant_mappings_entity ON public.participant_entity_mappings (linked_entity_type, linked_entity_id);
