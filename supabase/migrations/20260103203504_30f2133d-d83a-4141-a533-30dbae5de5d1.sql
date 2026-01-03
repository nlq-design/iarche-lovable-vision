-- Update the validate_activity_log function to include generated_document
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
    'generated_document'
  ) THEN
    RAISE EXCEPTION 'Invalid entity_type: %. Must be one of: lead, contact, opportunity, project, task, meeting_note, booking, specification, voice_transcription, uploaded_file, generated_document', NEW.entity_type;
  END IF;

  IF NEW.related_entity_id IS NOT NULL AND NEW.related_entity_type IS NULL THEN
    RAISE EXCEPTION 'related_entity_id requires related_entity_type';
  END IF;

  RETURN NEW;
END;
$function$;