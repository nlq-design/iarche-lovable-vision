-- Table de mémoire des interactions utilisateur sur les éléments IA du dashboard
CREATE TABLE public.ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID,
  signature TEXT NOT NULL, -- ID stable: source::entity_type::entity_id::hash(action_text)
  source TEXT NOT NULL CHECK (source IN ('top_action', 'cross_signal', 'sentinel', 'prediction')),

  -- Snapshot de l'élément IA au moment de la première interaction
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  action_text TEXT NOT NULL,
  reasoning TEXT,
  urgency TEXT,
  impact_value NUMERIC,

  -- État utilisateur
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'snoozed', 'done', 'dismissed')),
  snooze_until TIMESTAMPTZ,

  -- Contexte ajouté
  user_notes JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{at, by, text}]
  structured_updates JSONB NOT NULL DEFAULT '{}'::jsonb, -- {new_deadline, new_amount, new_contact, ...}

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT ai_actions_signature_workspace_unique UNIQUE (workspace_id, signature)
);

CREATE INDEX idx_ai_actions_workspace_status ON public.ai_actions (workspace_id, status, updated_at DESC);
CREATE INDEX idx_ai_actions_workspace_signature ON public.ai_actions (workspace_id, signature);
CREATE INDEX idx_ai_actions_active ON public.ai_actions (workspace_id, updated_at DESC) WHERE status NOT IN ('done', 'dismissed');

ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;

-- Lecture: membres du workspace
CREATE POLICY "Workspace members can read ai_actions"
  ON public.ai_actions FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Insert/Update/Delete: utilisateurs authentifiés du workspace
CREATE POLICY "Workspace members can insert ai_actions"
  ON public.ai_actions FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Workspace members can update ai_actions"
  ON public.ai_actions FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Workspace members can delete ai_actions"
  ON public.ai_actions FOR DELETE
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Trigger updated_at
CREATE TRIGGER trg_ai_actions_updated_at
  BEFORE UPDATE ON public.ai_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();