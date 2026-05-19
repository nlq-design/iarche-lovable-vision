CREATE TABLE IF NOT EXISTS public.ai_context_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid,
  mode text NOT NULL,
  entity_type text,
  entity_id uuid,
  estimated_tokens int NOT NULL DEFAULT 0,
  token_budget int,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  rag_chunks jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_context_traces_workspace_created_idx
  ON public.ai_context_traces (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_context_traces_entity_idx
  ON public.ai_context_traces (entity_type, entity_id);

ALTER TABLE public.ai_context_traces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_context_traces_select ON public.ai_context_traces;
CREATE POLICY ai_context_traces_select
ON public.ai_context_traces FOR SELECT
TO authenticated
USING (public.can_access_entity_workspace(workspace_id, auth.uid()));

DROP POLICY IF EXISTS ai_context_traces_service_all ON public.ai_context_traces;
CREATE POLICY ai_context_traces_service_all
ON public.ai_context_traces FOR ALL
TO service_role
USING (true) WITH CHECK (true);

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='ai-context-traces-purge') THEN
      PERFORM cron.unschedule('ai-context-traces-purge');
    END IF;
    PERFORM cron.schedule(
      'ai-context-traces-purge',
      '30 7 * * *',
      'DELETE FROM public.ai_context_traces WHERE created_at < now() - interval ''7 days'''
    );
  END IF;
END
$outer$;