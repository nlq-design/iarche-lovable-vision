-- activity_log.activity_type : ajoute les valeurs utilisées par le code mais absentes
-- du CHECK (l'insert échouait / le log d'audit était silencieusement perdu).
-- 7 valeurs de logs fire-and-forget (email_reply, partner_consulte_generated,
-- ai_harvest_cascade, ai_harvest, conversion, email_draft_generated,
-- proactive_notification) + deal_won/deal_lost (workflows MCP).
alter table public.activity_log drop constraint if exists activity_log_activity_type_check;
alter table public.activity_log add constraint activity_log_activity_type_check
  check (activity_type = any (array[
    'note','email','call','meeting','status_change','ai_action','document','task','comment',
    'new_task','task_created','task_completed','creation','update','deletion','assignment',
    'stage_change','score_change','qualification','follow_up','proposal_sent','contract_signed',
    'booking_created','booking_confirmed','booking_cancelled','specification_created',
    'specification_updated','file_uploaded','transcription_completed','synthesis_generated',
    'partner_linked','partner_unlinked','synthesis_stale_detected','new_booking','new_contact',
    'new_generated_document','new_lead','new_opportunity','new_project','new_transcription',
    'new_upload','new_article','new_partner',
    -- ajouts 2026-07-02 :
    'email_reply','partner_consulte_generated','ai_harvest_cascade','ai_harvest','conversion',
    'email_draft_generated','proactive_notification','deal_won','deal_lost'
  ]::text[]));
