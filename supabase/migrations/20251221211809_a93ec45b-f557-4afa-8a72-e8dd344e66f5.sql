-- ===========================================
-- TRIGGERS DE VALIDATION : Phase 2 CDC Cockpit
-- ===========================================

-- 1. validate_task : Vérifie qu'au moins une FK entité est définie
CREATE OR REPLACE FUNCTION public.validate_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier qu'au moins une FK entité est définie
  IF NEW.lead_id IS NULL 
     AND NEW.opportunity_id IS NULL 
     AND NEW.project_id IS NULL 
     AND NEW.meeting_note_id IS NULL 
     AND NEW.entity_id IS NULL THEN
    RAISE WARNING 'Task % created without entity link', NEW.id;
    -- On ne bloque pas, juste un warning pour monitoring
  END IF;
  
  -- Vérifier cohérence entity_type / entity_id
  IF NEW.entity_id IS NOT NULL AND NEW.entity_type IS NULL THEN
    RAISE EXCEPTION 'entity_id requires entity_type to be set';
  END IF;
  
  IF NEW.entity_type IS NOT NULL AND NEW.entity_id IS NULL THEN
    RAISE EXCEPTION 'entity_type requires entity_id to be set';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_task_trigger ON public.tasks;
CREATE TRIGGER validate_task_trigger
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_task();

-- 2. validate_activity_log : Vérifie cohérence des FK activity_log
CREATE OR REPLACE FUNCTION public.validate_activity_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier qu'entity_id et entity_type sont cohérents
  IF NEW.entity_id IS NULL OR NEW.entity_type IS NULL THEN
    RAISE EXCEPTION 'activity_log requires both entity_id and entity_type';
  END IF;
  
  -- Valider entity_type
  IF NEW.entity_type NOT IN ('lead', 'opportunity', 'project', 'task', 'meeting_note', 'booking', 'specification') THEN
    RAISE EXCEPTION 'Invalid entity_type: %. Must be one of: lead, opportunity, project, task, meeting_note, booking, specification', NEW.entity_type;
  END IF;
  
  -- Valider related_entity cohérence
  IF NEW.related_entity_id IS NOT NULL AND NEW.related_entity_type IS NULL THEN
    RAISE EXCEPTION 'related_entity_id requires related_entity_type';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_activity_log_trigger ON public.activity_log;
CREATE TRIGGER validate_activity_log_trigger
  BEFORE INSERT OR UPDATE ON public.activity_log
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_activity_log();

-- 3. set_updated_at triggers pour toutes les tables cockpit
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Appliquer sur toutes les tables avec updated_at
DROP TRIGGER IF EXISTS set_updated_at_opportunities ON public.opportunities;
CREATE TRIGGER set_updated_at_opportunities
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_projects ON public.projects;
CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_tasks ON public.tasks;
CREATE TRIGGER set_updated_at_tasks
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_meeting_notes ON public.meeting_notes;
CREATE TRIGGER set_updated_at_meeting_notes
  BEFORE UPDATE ON public.meeting_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_specifications ON public.specifications;
CREATE TRIGGER set_updated_at_specifications
  BEFORE UPDATE ON public.specifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_workspaces ON public.workspaces;
CREATE TRIGGER set_updated_at_workspaces
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();