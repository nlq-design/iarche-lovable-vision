-- M6 Semantic Cache infrastructure (retry: index partiel WHERE now() retiré)
CREATE TABLE IF NOT EXISTS public.ai_semantic_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  cache_key text NOT NULL,
  query_embedding vector(1536) NOT NULL,
  context_fingerprint text NOT NULL,
  response jsonb NOT NULL,
  model text,
  prompt_version text,
  hit_count integer NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_semantic_cache_key_idx
  ON public.ai_semantic_cache (workspace_id, cache_key, expires_at DESC);
CREATE INDEX IF NOT EXISTS ai_semantic_cache_fingerprint_idx
  ON public.ai_semantic_cache (workspace_id, cache_key, context_fingerprint);
CREATE INDEX IF NOT EXISTS ai_semantic_cache_expires_idx
  ON public.ai_semantic_cache (expires_at);
CREATE INDEX IF NOT EXISTS ai_semantic_cache_embedding_idx
  ON public.ai_semantic_cache USING hnsw (query_embedding vector_cosine_ops);

ALTER TABLE public.ai_semantic_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_semantic_cache_service_all"
  ON public.ai_semantic_cache
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.match_semantic_cache(
  p_workspace_id uuid,
  p_cache_key text,
  p_embedding vector(1536),
  p_fingerprint text,
  p_threshold double precision DEFAULT 0.93
)
RETURNS TABLE (
  id uuid,
  response jsonb,
  model text,
  similarity double precision,
  age_seconds integer,
  hit_count integer,
  fingerprint_match boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.response, c.model, 1.0::double precision,
         EXTRACT(EPOCH FROM (now() - c.created_at))::integer,
         c.hit_count, true
  FROM public.ai_semantic_cache c
  WHERE c.workspace_id = p_workspace_id
    AND c.cache_key = p_cache_key
    AND c.context_fingerprint = p_fingerprint
    AND c.expires_at > now()
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  RETURN QUERY
  SELECT c.id, c.response, c.model,
         (1 - (c.query_embedding <=> p_embedding))::double precision,
         EXTRACT(EPOCH FROM (now() - c.created_at))::integer,
         c.hit_count, false
  FROM public.ai_semantic_cache c
  WHERE c.workspace_id = p_workspace_id
    AND c.cache_key = p_cache_key
    AND c.expires_at > now()
    AND (1 - (c.query_embedding <=> p_embedding)) >= p_threshold
  ORDER BY c.query_embedding <=> p_embedding ASC
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.match_semantic_cache(uuid, text, vector, text, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_semantic_cache(uuid, text, vector, text, double precision) TO service_role;

CREATE OR REPLACE FUNCTION public.bump_semantic_cache_hit(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ai_semantic_cache
  SET hit_count = hit_count + 1,
      last_hit_at = now()
  WHERE id = p_id;
$$;
REVOKE ALL ON FUNCTION public.bump_semantic_cache_hit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_semantic_cache_hit(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.purge_semantic_cache(
  p_workspace_id uuid,
  p_cache_key text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_cache_key IS NULL THEN
    DELETE FROM public.ai_semantic_cache WHERE workspace_id = p_workspace_id;
  ELSE
    DELETE FROM public.ai_semantic_cache
      WHERE workspace_id = p_workspace_id AND cache_key = p_cache_key;
  END IF;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_semantic_cache(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_semantic_cache(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.semantic_cache_stats(
  p_workspace_id uuid,
  p_since_hours integer DEFAULT 168
)
RETURNS TABLE (
  total_entries bigint,
  total_hits bigint,
  hit_rate numeric,
  top_keys jsonb,
  avg_age_seconds numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_access_entity_workspace(p_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT * FROM public.ai_semantic_cache
    WHERE workspace_id = p_workspace_id
      AND created_at >= now() - (p_since_hours || ' hours')::interval
  ),
  agg AS (
    SELECT
      COUNT(*)::bigint AS total_entries,
      COALESCE(SUM(hit_count),0)::bigint AS total_hits,
      CASE WHEN COUNT(*) = 0 THEN 0
           ELSE ROUND(COALESCE(SUM(hit_count),0)::numeric
                / NULLIF(COUNT(*) + COALESCE(SUM(hit_count),0), 0), 3)
      END AS hit_rate,
      ROUND(AVG(EXTRACT(EPOCH FROM (now() - created_at)))::numeric, 0) AS avg_age_seconds
    FROM base
  ),
  tops AS (
    SELECT jsonb_agg(jsonb_build_object('cache_key', cache_key, 'hits', total_hits))
           AS top_keys
    FROM (
      SELECT cache_key, SUM(hit_count)::bigint AS total_hits
      FROM base GROUP BY cache_key
      ORDER BY total_hits DESC LIMIT 10
    ) t
  )
  SELECT agg.total_entries, agg.total_hits, agg.hit_rate,
         COALESCE(tops.top_keys, '[]'::jsonb), agg.avg_age_seconds
  FROM agg, tops;
END;
$$;
REVOKE ALL ON FUNCTION public.semantic_cache_stats(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.semantic_cache_stats(uuid, integer) TO authenticated;

ALTER TABLE public.ai_context_traces
  ADD COLUMN IF NOT EXISTS cache_status text,
  ADD COLUMN IF NOT EXISTS cache_similarity numeric,
  ADD COLUMN IF NOT EXISTS cache_age_seconds integer;

DO $cron$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'purge-semantic-cache-daily'
  ) THEN
    PERFORM cron.schedule(
      'purge-semantic-cache-daily',
      '15 3 * * *',
      $$ DELETE FROM public.ai_semantic_cache WHERE expires_at < now() $$
    );
  END IF;
END $cron$;