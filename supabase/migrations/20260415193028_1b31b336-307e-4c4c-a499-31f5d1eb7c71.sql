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
    'new_opportunity', 'new_project', 'new_transcription', 'new_upload',
    'new_article', 'new_partner'
  )
);