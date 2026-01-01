-- Autoriser explicitement new_upload (utilisé par le trigger log_file_upload)
ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_activity_type_check;

ALTER TABLE public.activity_log
ADD CONSTRAINT activity_log_activity_type_check
CHECK (
  activity_type = ANY (
    ARRAY[
      'note', 'email', 'call', 'meeting', 'status_change', 'ai_action', 'document', 'task', 'comment',
      'new_lead', 'new_opportunity', 'new_project', 'new_task', 'new_booking', 'new_document',
      'new_specification', 'new_transcription', 'new_article', 'new_contact',
      'new_upload'
    ]::text[]
  )
);