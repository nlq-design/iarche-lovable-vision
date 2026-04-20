-- QW#5b - Drop 5 dénormalized FK columns on activity_log (redundant with entity_id+entity_type)
-- Forward migration

-- Step 1: Recreate validate_activity_log without related_entity_id/_type checks
CREATE OR REPLACE FUNCTION public.validate_activity_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.entity_id IS NULL OR NEW.entity_type IS NULL THEN
    RAISE EXCEPTION 'activity_log requires both entity_id and entity_type';
  END IF;

  IF NEW.entity_type NOT IN (
    'lead',
    'contact',
    'opportunity',
    'project',
    'task',
    'meeting_note',
    'booking',
    'specification',
    'voice_transcription',
    'uploaded_file',
    'generated_document',
    'article',
    'partner',
    'system'
  ) THEN
    RAISE EXCEPTION 'Invalid entity_type: %. Must be one of: lead, contact, opportunity, project, task, meeting_note, booking, specification, voice_transcription, uploaded_file, generated_document, article, partner, system', NEW.entity_type;
  END IF;

  RETURN NEW;
END;
$function$;

-- Step 2: Drop redundant index on opportunity_id (covered by polymorphic entity_id+entity_type)
DROP INDEX IF EXISTS public.idx_activity_log_opportunity;

-- Step 3: Drop the 5 redundant FK columns (100% NULL, 0 reads, 0 filters)
ALTER TABLE public.activity_log DROP COLUMN IF EXISTS meeting_note_id;
ALTER TABLE public.activity_log DROP COLUMN IF EXISTS opportunity_id;
ALTER TABLE public.activity_log DROP COLUMN IF EXISTS task_id;
ALTER TABLE public.activity_log DROP COLUMN IF EXISTS related_entity_id;
ALTER TABLE public.activity_log DROP COLUMN IF EXISTS related_entity_type;

-- =============================================================
-- ROLLBACK (manual execution if needed) :
-- =============================================================
--
-- ALTER TABLE public.activity_log ADD COLUMN meeting_note_id UUID REFERENCES public.meeting_notes(id) ON DELETE SET NULL;
-- ALTER TABLE public.activity_log ADD COLUMN opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL;
-- ALTER TABLE public.activity_log ADD COLUMN task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;
-- ALTER TABLE public.activity_log ADD COLUMN related_entity_id UUID;
-- ALTER TABLE public.activity_log ADD COLUMN related_entity_type TEXT;
-- CREATE INDEX IF NOT EXISTS idx_activity_log_opportunity ON public.activity_log(opportunity_id) WHERE opportunity_id IS NOT NULL;
--
-- -- Restore old validate_activity_log with related_entity_id/_type check :
-- CREATE OR REPLACE FUNCTION public.validate_activity_log()
-- RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
-- AS $function$
-- BEGIN
--   IF NEW.entity_id IS NULL OR NEW.entity_type IS NULL THEN
--     RAISE EXCEPTION 'activity_log requires both entity_id and entity_type';
--   END IF;
--   IF NEW.entity_type NOT IN ('lead','contact','opportunity','project','task','meeting_note','booking','specification','voice_transcription','uploaded_file','generated_document','article','partner') THEN
--     RAISE EXCEPTION 'Invalid entity_type: %', NEW.entity_type;
--   END IF;
--   IF NEW.related_entity_id IS NOT NULL AND NEW.related_entity_type IS NULL THEN
--     RAISE EXCEPTION 'related_entity_id requires related_entity_type';
--   END IF;
--   RETURN NEW;
-- END;
-- $function$;
--
-- =============================================================