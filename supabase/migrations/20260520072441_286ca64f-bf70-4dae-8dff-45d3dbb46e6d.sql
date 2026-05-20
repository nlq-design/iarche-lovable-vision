
ALTER TABLE public.ai_context_traces
  ADD COLUMN IF NOT EXISTS latency_ms integer,
  ADD COLUMN IF NOT EXISTS llm_provider text,
  ADD COLUMN IF NOT EXISTS llm_cost_estimate_usd numeric(10,6),
  ADD COLUMN IF NOT EXISTS cache_scope text CHECK (cache_scope IN ('user','workspace','system'));

CREATE INDEX IF NOT EXISTS idx_ai_context_traces_ws_mode_date
  ON public.ai_context_traces(workspace_id, cache_mode, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_semantic_cache_expires
  ON public.ai_semantic_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_ai_semantic_cache_fingerprint
  ON public.ai_semantic_cache(context_fingerprint);

CREATE TABLE IF NOT EXISTS public.voice_usage_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  day date NOT NULL DEFAULT (now()::date),
  seconds_transcribed integer NOT NULL DEFAULT 0,
  request_count integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(10,6) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, workspace_id, day)
);

CREATE INDEX IF NOT EXISTS idx_voice_usage_ws_day
  ON public.voice_usage_daily(workspace_id, day DESC);

ALTER TABLE public.voice_usage_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voice_usage_select_own" ON public.voice_usage_daily;
CREATE POLICY "voice_usage_select_own"
  ON public.voice_usage_daily FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "voice_usage_service_all" ON public.voice_usage_daily;
CREATE POLICY "voice_usage_service_all"
  ON public.voice_usage_daily FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW public.ai_cache_metrics AS
SELECT
  workspace_id,
  cache_mode,
  date_trunc('day', created_at)::date AS day,
  count(*) AS total_calls,
  count(*) FILTER (WHERE cache_status = 'hit') AS hits,
  count(*) FILTER (WHERE cache_status = 'miss') AS misses,
  ROUND(
    (count(*) FILTER (WHERE cache_status = 'hit'))::numeric
    / NULLIF(count(*), 0) * 100, 2
  ) AS hit_rate_pct,
  ROUND(AVG(latency_ms) FILTER (WHERE cache_status = 'miss'), 0) AS avg_miss_latency_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) FILTER (WHERE cache_status = 'miss') AS p95_miss_latency_ms,
  ROUND(SUM(llm_cost_estimate_usd) FILTER (WHERE cache_status = 'miss'), 4) AS total_cost_usd,
  ROUND(
    AVG(llm_cost_estimate_usd) FILTER (WHERE cache_status = 'miss')
    * count(*) FILTER (WHERE cache_status = 'hit'), 4
  ) AS estimated_savings_usd
FROM public.ai_context_traces
WHERE created_at >= now() - interval '90 days'
GROUP BY workspace_id, cache_mode, date_trunc('day', created_at);

GRANT SELECT ON public.ai_cache_metrics TO authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_ai_semantic_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.ai_semantic_cache
  WHERE expires_at < now() - interval '7 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-ai-semantic-cache') THEN
      PERFORM cron.unschedule('cleanup-ai-semantic-cache');
    END IF;
    PERFORM cron.schedule(
      'cleanup-ai-semantic-cache',
      '0 3 * * *',
      'SELECT public.cleanup_ai_semantic_cache();'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.bump_voice_usage(
  p_user_id uuid,
  p_workspace_id uuid,
  p_seconds integer,
  p_cost_usd numeric DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.voice_usage_daily (user_id, workspace_id, day, seconds_transcribed, request_count, estimated_cost_usd)
  VALUES (p_user_id, p_workspace_id, now()::date, p_seconds, 1, p_cost_usd)
  ON CONFLICT (user_id, workspace_id, day)
  DO UPDATE SET
    seconds_transcribed = voice_usage_daily.seconds_transcribed + EXCLUDED.seconds_transcribed,
    request_count = voice_usage_daily.request_count + 1,
    estimated_cost_usd = voice_usage_daily.estimated_cost_usd + EXCLUDED.estimated_cost_usd,
    updated_at = now();
END;
$$;
