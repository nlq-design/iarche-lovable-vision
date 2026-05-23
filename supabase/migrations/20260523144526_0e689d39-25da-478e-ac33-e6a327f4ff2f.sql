-- Table de log des fallbacks LLM du router sémantique (Phase F auto-learning)
CREATE TABLE IF NOT EXISTS public.ai_intent_router_fallbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text text NOT NULL,
  query_normalized text NOT NULL,
  intent_classified text NOT NULL,
  similarity_best real,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_intent_router_fallbacks_norm_idx
  ON public.ai_intent_router_fallbacks (query_normalized, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_intent_router_fallbacks_created_idx
  ON public.ai_intent_router_fallbacks (created_at DESC);

ALTER TABLE public.ai_intent_router_fallbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intent_fallbacks_admin_select"
  ON public.ai_intent_router_fallbacks FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- service_role bypasse RLS pour les insert depuis edge functions

-- RPC pour identifier les requêtes récurrentes à transformer en ancres
CREATE OR REPLACE FUNCTION public.get_recurring_intent_fallbacks(
  min_count integer DEFAULT 3,
  since_days integer DEFAULT 7,
  max_results integer DEFAULT 50
)
RETURNS TABLE (
  query_normalized text,
  intent_classified text,
  occurrences bigint,
  example_query text,
  avg_similarity real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.query_normalized,
    mode() WITHIN GROUP (ORDER BY f.intent_classified) AS intent_classified,
    count(*)::bigint AS occurrences,
    (array_agg(f.query_text ORDER BY f.created_at DESC))[1] AS example_query,
    avg(f.similarity_best)::real AS avg_similarity
  FROM public.ai_intent_router_fallbacks f
  WHERE f.created_at >= now() - make_interval(days => since_days)
  GROUP BY f.query_normalized
  HAVING count(*) >= min_count
  ORDER BY count(*) DESC
  LIMIT max_results;
$$;

REVOKE ALL ON FUNCTION public.get_recurring_intent_fallbacks(integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recurring_intent_fallbacks(integer, integer, integer) TO service_role;