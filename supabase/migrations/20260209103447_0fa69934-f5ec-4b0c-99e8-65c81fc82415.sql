
-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Sentinel trigger queue for debounce (30s)
CREATE TABLE IF NOT EXISTS public.sentinel_trigger_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_source text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  workspace_id uuid REFERENCES public.workspaces(id)
);

ALTER TABLE public.sentinel_trigger_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.sentinel_trigger_queue
  FOR ALL USING (false);

CREATE INDEX idx_sentinel_queue_recent 
  ON public.sentinel_trigger_queue (workspace_id, created_at DESC);

-- Function: invoke sentinel with debounce
CREATE OR REPLACE FUNCTION public.invoke_sentinel_debounced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _workspace_id uuid;
  _last_trigger timestamptz;
  _supabase_url text;
  _service_key text;
BEGIN
  _workspace_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
  
  IF _workspace_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT MAX(created_at) INTO _last_trigger
  FROM sentinel_trigger_queue
  WHERE workspace_id = _workspace_id
    AND processed_at IS NULL
    AND created_at > now() - interval '30 seconds';

  INSERT INTO sentinel_trigger_queue (trigger_source, entity_type, entity_id, workspace_id)
  VALUES (TG_TABLE_NAME, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), _workspace_id);

  IF _last_trigger IS NOT NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  _supabase_url := current_setting('app.settings.supabase_url', true);
  _service_key := current_setting('app.settings.service_role_key', true);

  IF _supabase_url IS NOT NULL AND _service_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := _supabase_url || '/functions/v1/ai-sentinel',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_key
      ),
      body := jsonb_build_object(
        'workspace_id', _workspace_id::text,
        'trigger_source', TG_TABLE_NAME,
        'entity_id', COALESCE(NEW.id, OLD.id)::text
      )
    );

    UPDATE sentinel_trigger_queue
    SET processed_at = now()
    WHERE workspace_id = _workspace_id
      AND processed_at IS NULL;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers on leads (correct column names)
CREATE TRIGGER sentinel_on_lead_change
  AFTER INSERT OR UPDATE OF qualification_status, email, name, company
  ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_sentinel_debounced();

-- Triggers on opportunities (correct column names)
CREATE TRIGGER sentinel_on_opportunity_change
  AFTER INSERT OR UPDATE OF stage, value_amount, lead_id
  ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_sentinel_debounced();

-- Triggers on projects (correct column names)
CREATE TRIGGER sentinel_on_project_change
  AFTER INSERT OR UPDATE OF status, budget_amount
  ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_sentinel_debounced();

-- Cleanup old queue entries
CREATE OR REPLACE FUNCTION public.cleanup_sentinel_queue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM sentinel_trigger_queue
  WHERE created_at < now() - interval '24 hours';
  RETURN NEW;
END;
$$;

CREATE TRIGGER sentinel_queue_cleanup
  AFTER INSERT ON public.sentinel_trigger_queue
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_sentinel_queue();
