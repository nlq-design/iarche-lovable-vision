
CREATE TABLE IF NOT EXISTS public.ai_cross_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  signal_type text NOT NULL CHECK (signal_type IN ('partner_match', 'solution_match', 'project_partner_gap', 'lead_partner_competence', 'opportunity_acceleration', 'cross_entity_pattern')),
  title text NOT NULL,
  narrative text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','dismissed','acted')),
  evidence jsonb DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  dismissed_at timestamptz,
  dismissed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cross_signals_workspace ON public.ai_cross_signals(workspace_id, status, score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cross_signals_expires ON public.ai_cross_signals(expires_at) WHERE status = 'active';

ALTER TABLE public.ai_cross_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view cross signals"
  ON public.ai_cross_signals FOR SELECT TO authenticated
  USING (is_admin() OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members can update cross signals"
  ON public.ai_cross_signals FOR UPDATE TO authenticated
  USING (is_admin() OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages cross signals"
  ON public.ai_cross_signals FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER set_updated_at_ai_cross_signals
  BEFORE UPDATE ON public.ai_cross_signals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.match_partners_for_lead(
  p_lead_id uuid,
  p_workspace_id uuid,
  p_limit int DEFAULT 3
)
RETURNS TABLE(partner_id uuid, partner_name text, similarity float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
  WITH lead_emb AS (
    SELECT embedding FROM public.resource_embeddings
    WHERE resource_type = 'lead' AND resource_id = p_lead_id AND embedding IS NOT NULL
    ORDER BY chunk_index LIMIT 1
  )
  SELECT 
    pe.resource_id,
    pe.resource_title,
    (1 - (pe.embedding <=> (SELECT embedding FROM lead_emb)))::float
  FROM public.resource_embeddings pe, lead_emb
  WHERE pe.resource_type = 'partner'
    AND pe.workspace_id = p_workspace_id
    AND pe.embedding IS NOT NULL
    AND pe.chunk_index = 0
  ORDER BY pe.embedding <=> (SELECT embedding FROM lead_emb)
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.match_solutions_for_lead(
  p_lead_id uuid,
  p_limit int DEFAULT 3
)
RETURNS TABLE(solution_id uuid, solution_name text, similarity float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
  WITH lead_emb AS (
    SELECT embedding FROM public.resource_embeddings
    WHERE resource_type = 'lead' AND resource_id = p_lead_id AND embedding IS NOT NULL
    ORDER BY chunk_index LIMIT 1
  )
  SELECT 
    se.resource_id,
    se.resource_title,
    (1 - (se.embedding <=> (SELECT embedding FROM lead_emb)))::float
  FROM public.resource_embeddings se, lead_emb
  WHERE se.resource_type = 'solution'
    AND se.embedding IS NOT NULL
    AND se.chunk_index = 0
  ORDER BY se.embedding <=> (SELECT embedding FROM lead_emb)
  LIMIT p_limit;
$$;
