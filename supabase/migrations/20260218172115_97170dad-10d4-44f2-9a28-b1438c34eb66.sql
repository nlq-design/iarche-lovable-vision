
-- Table pour stocker le brief intelligence quotidien
CREATE TABLE IF NOT EXISTS public.daily_intelligence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  generated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  generated_at TIMESTAMPTZ DEFAULT now(),
  intelligence JSONB NOT NULL,
  raw_data JSONB,
  consulte_count INTEGER DEFAULT 0,
  llm_model TEXT,
  generation_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Un seul résultat par jour par workspace
CREATE UNIQUE INDEX idx_daily_intelligence_date ON public.daily_intelligence(workspace_id, generated_date);

-- Index pour lookup du dernier résultat
CREATE INDEX idx_daily_intelligence_latest ON public.daily_intelligence(workspace_id, generated_at DESC);

-- RLS
ALTER TABLE public.daily_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can read daily intelligence"
  ON public.daily_intelligence
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );
