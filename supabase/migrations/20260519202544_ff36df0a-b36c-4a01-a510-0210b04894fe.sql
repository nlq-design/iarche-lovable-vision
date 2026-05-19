-- Triggers pg_net pour auto-indexer dans le RAG à chaque update
-- voice_transcriptions, leads, opportunities

CREATE OR REPLACE FUNCTION public.trigger_crm_rag_index()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := 'https://mgjyhlyrwnnioctkbdkk.supabase.co/functions/v1/crm-rag-indexer';
  v_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nanlobHlyd25uaW9jdGtiZGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzIwNTQsImV4cCI6MjA3OTkwODA1NH0.r8IpfwFxVNOpNWS3A5p4CbINUbtvG3AyPgtWwK6vAhQ';
  v_type text := TG_ARGV[0];
BEGIN
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','apikey', v_key, 'Authorization','Bearer '||v_key),
    body := jsonb_build_object('task','index','resource_type', v_type, 'resource_id', NEW.id::text)
  );
  RETURN NEW;
END;
$$;

-- voice_transcriptions : raw_transcript ou ai_documents_summary modifié
DROP TRIGGER IF EXISTS trg_rag_voice_transcriptions ON public.voice_transcriptions;
CREATE TRIGGER trg_rag_voice_transcriptions
AFTER INSERT OR UPDATE OF raw_transcript, ai_documents_summary
ON public.voice_transcriptions
FOR EACH ROW
WHEN (NEW.raw_transcript IS NOT NULL)
EXECUTE FUNCTION public.trigger_crm_rag_index('voice_transcription');

-- leads : ai_documents_summary, message, source_context modifié
DROP TRIGGER IF EXISTS trg_rag_leads ON public.leads;
CREATE TRIGGER trg_rag_leads
AFTER INSERT OR UPDATE OF ai_documents_summary, message, source_context, name, company, position, industry, status
ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.trigger_crm_rag_index('lead');

-- opportunities : description, ai_metadata, stage modifié
DROP TRIGGER IF EXISTS trg_rag_opportunities ON public.opportunities;
CREATE TRIGGER trg_rag_opportunities
AFTER INSERT OR UPDATE OF title, description, ai_metadata, stage, value_amount, probability
ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.trigger_crm_rag_index('opportunity');