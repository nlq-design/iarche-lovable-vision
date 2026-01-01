-- Fix activity_log_activity_type_check to allow new_* types from trigger
ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_activity_type_check;

ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_activity_type_check 
CHECK (activity_type IN (
  'note', 'email', 'call', 'meeting', 'status_change', 'ai_action', 'document', 'task', 'comment',
  'new_lead', 'new_opportunity', 'new_project', 'new_task', 'new_booking', 'new_document', 
  'new_specification', 'new_transcription', 'new_article', 'new_contact'
));