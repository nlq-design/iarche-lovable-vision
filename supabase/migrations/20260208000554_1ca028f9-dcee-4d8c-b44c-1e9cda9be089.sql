
-- Table dédiée pour le vocabulaire personnalisé par entité CRM
CREATE TABLE public.entity_vocabulary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('partner', 'lead', 'lead_contact')),
  entity_id UUID NOT NULL,
  term TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- e.g. 'tech', 'product', 'acronym', 'jargon'
  workspace_id UUID REFERENCES public.workspaces(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, term)
);

-- Index pour lookup rapide par entité
CREATE INDEX idx_entity_vocabulary_lookup ON public.entity_vocabulary(entity_type, entity_id);
CREATE INDEX idx_entity_vocabulary_workspace ON public.entity_vocabulary(workspace_id);

-- RLS
ALTER TABLE public.entity_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vocabulary in their workspace"
ON public.entity_vocabulary FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage vocabulary in their workspace"
ON public.entity_vocabulary FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update vocabulary in their workspace"
ON public.entity_vocabulary FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete vocabulary in their workspace"
ON public.entity_vocabulary FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- Trigger updated_at
CREATE TRIGGER update_entity_vocabulary_updated_at
BEFORE UPDATE ON public.entity_vocabulary
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
