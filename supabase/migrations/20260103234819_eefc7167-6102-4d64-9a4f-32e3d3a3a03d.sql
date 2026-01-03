-- Fix activity_log constraint to include new_generated_document
ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_activity_type_check;

ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_activity_type_check 
CHECK (activity_type = ANY (ARRAY[
  'note'::text, 
  'email'::text, 
  'call'::text, 
  'meeting'::text, 
  'status_change'::text, 
  'ai_action'::text, 
  'document'::text, 
  'task'::text, 
  'comment'::text, 
  'new_lead'::text, 
  'new_opportunity'::text, 
  'new_project'::text, 
  'new_task'::text, 
  'new_booking'::text, 
  'new_document'::text, 
  'new_specification'::text, 
  'new_transcription'::text, 
  'new_article'::text, 
  'new_contact'::text, 
  'new_upload'::text,
  'new_generated_document'::text
]));