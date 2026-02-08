
-- Trigger: auto-call synthesize when synthesis_stale is set to true on leads
CREATE OR REPLACE FUNCTION public.notify_stale_synthesis()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when synthesis_stale changes from false/null to true
  IF NEW.synthesis_stale = true AND (OLD.synthesis_stale IS NULL OR OLD.synthesis_stale = false) THEN
    -- Insert a record to track pending recalculations
    INSERT INTO public.activity_log (
      workspace_id,
      entity_type,
      entity_id,
      activity_type,
      title,
      is_ai_generated
    ) VALUES (
      COALESCE(NEW.workspace_id, '00000000-0000-0000-0000-000000000001'),
      TG_ARGV[0],
      NEW.id,
      'synthesis_stale_detected',
      'Synthèse marquée obsolète — recalcul automatique planifié',
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply trigger on leads
CREATE TRIGGER trg_leads_stale_synthesis
  AFTER UPDATE OF synthesis_stale ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_stale_synthesis('lead');

-- Apply trigger on projects
CREATE TRIGGER trg_projects_stale_synthesis
  AFTER UPDATE OF synthesis_stale ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_stale_synthesis('project');

-- Apply trigger on partners
CREATE TRIGGER trg_partners_stale_synthesis
  AFTER UPDATE OF synthesis_stale ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_stale_synthesis('partner');
