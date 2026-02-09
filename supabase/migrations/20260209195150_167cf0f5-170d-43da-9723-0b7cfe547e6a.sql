-- Drop old check constraint and replace with a permissive one
ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_activity_type_check;
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_activity_type_check CHECK (
  activity_type IN (
    'note', 'email', 'call', 'meeting', 'status_change', 'ai_action',
    'document', 'task', 'comment', 'new_task', 'task_created', 'task_completed',
    'creation', 'update', 'deletion', 'assignment', 'stage_change',
    'score_change', 'qualification', 'follow_up', 'proposal_sent',
    'contract_signed', 'booking_created', 'booking_confirmed',
    'booking_cancelled', 'specification_created', 'specification_updated',
    'file_uploaded', 'transcription_completed', 'synthesis_generated',
    'partner_linked', 'partner_unlinked', 'synthesis_stale_detected',
    'new_booking', 'new_contact', 'new_generated_document', 'new_lead',
    'new_opportunity', 'new_project', 'new_transcription', 'new_upload'
  )
);

-- Update validate_activity_log to allow 'partner' and 'system' entity_types
CREATE OR REPLACE FUNCTION public.validate_activity_log()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entity_type NOT IN (
    'lead', 'contact', 'opportunity', 'project', 'task',
    'meeting_note', 'booking', 'specification', 'voice_transcription',
    'uploaded_file', 'generated_document', 'partner', 'system'
  ) THEN
    RAISE EXCEPTION 'Invalid entity_type: %. Must be one of: lead, contact, opportunity, project, task, meeting_note, booking, specification, voice_transcription, uploaded_file, generated_document, partner, system', NEW.entity_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;