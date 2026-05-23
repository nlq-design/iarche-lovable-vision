-- Cache persistant des intents classés (Phase G — Cache Prewarming)
CREATE TABLE IF NOT EXISTS public.ai_query_intent_cache (
  query_normalized text PRIMARY KEY,
  intent text NOT NULL,
  embedding extensions.vector(1536),
  similarity_best real,
  source text NOT NULL DEFAULT 'prewarm', -- prewarm | semantic | llm
  hit_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  CONSTRAINT ai_query_intent_cache_intent_check CHECK (
    intent IN ('crm_query', 'doc_generation', 'analysis', 'vivier', 'general')
  )
);

CREATE INDEX IF NOT EXISTS ai_query_intent_cache_expires_idx
  ON public.ai_query_intent_cache (expires_at);

ALTER TABLE public.ai_query_intent_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_query_intent_cache_admin_select"
  ON public.ai_query_intent_cache FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Throttle par workspace pour le prewarm
CREATE TABLE IF NOT EXISTS public.ai_prewarm_runs (
  workspace_id uuid PRIMARY KEY,
  last_run_at timestamptz NOT NULL DEFAULT now(),
  queries_count integer NOT NULL DEFAULT 0,
  cache_hits integer NOT NULL DEFAULT 0,
  llm_calls integer NOT NULL DEFAULT 0
);

ALTER TABLE public.ai_prewarm_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_prewarm_runs_admin_select"
  ON public.ai_prewarm_runs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "ai_prewarm_runs_member_select"
  ON public.ai_prewarm_runs FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));