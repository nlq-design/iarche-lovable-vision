-- Table des quotas par workspace
CREATE TABLE public.workspace_ai_quotas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  monthly_token_limit BIGINT DEFAULT NULL, -- null = illimité
  monthly_cost_limit_cents INTEGER DEFAULT NULL, -- null = illimité
  alert_threshold_percent INTEGER DEFAULT 80 CHECK (alert_threshold_percent BETWEEN 1 AND 100),
  hard_limit_enabled BOOLEAN DEFAULT false,
  current_period_start DATE DEFAULT date_trunc('month', CURRENT_DATE)::date,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Table de suivi d'usage mensuel
CREATE TABLE public.workspace_ai_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  total_tokens BIGINT DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, period_start)
);

-- Index pour performance
CREATE INDEX idx_workspace_ai_usage_period ON public.workspace_ai_usage(workspace_id, period_start);
CREATE INDEX idx_workspace_ai_quotas_workspace ON public.workspace_ai_quotas(workspace_id);

-- RLS
ALTER TABLE public.workspace_ai_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_ai_usage ENABLE ROW LEVEL SECURITY;

-- Policies pour workspace_ai_quotas
CREATE POLICY "Admins can manage quotas" ON public.workspace_ai_quotas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_ai_quotas.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Policies pour workspace_ai_usage (lecture pour membres, écriture via service role)
CREATE POLICY "Members can view usage" ON public.workspace_ai_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_ai_usage.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Fonction RPC pour incrémenter atomiquement l'usage
CREATE OR REPLACE FUNCTION public.increment_workspace_ai_usage(
  p_workspace_id UUID,
  p_tokens BIGINT,
  p_cost_cents INTEGER,
  p_period_start DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_end DATE;
BEGIN
  -- Calculer la fin de période (dernier jour du mois)
  v_period_end := (date_trunc('month', p_period_start) + interval '1 month' - interval '1 day')::date;
  
  -- Upsert avec incrément atomique
  INSERT INTO workspace_ai_usage (workspace_id, total_tokens, total_cost_cents, request_count, period_start, period_end, updated_at)
  VALUES (p_workspace_id, p_tokens, p_cost_cents, 1, p_period_start, v_period_end, now())
  ON CONFLICT (workspace_id, period_start)
  DO UPDATE SET
    total_tokens = workspace_ai_usage.total_tokens + EXCLUDED.total_tokens,
    total_cost_cents = workspace_ai_usage.total_cost_cents + EXCLUDED.total_cost_cents,
    request_count = workspace_ai_usage.request_count + 1,
    updated_at = now();
END;
$$;