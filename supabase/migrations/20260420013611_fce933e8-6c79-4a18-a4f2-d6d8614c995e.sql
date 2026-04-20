-- QW#7 - Durcissement ai_sentinel_alerts : NOT NULL + CHECK enum aligné sur activity_log
-- Données vérifiées 100% peuplées (16/16 lignes), aucune migration de données nécessaire

ALTER TABLE public.ai_sentinel_alerts
  ALTER COLUMN entity_id SET NOT NULL,
  ALTER COLUMN entity_type SET NOT NULL;

ALTER TABLE public.ai_sentinel_alerts
  ADD CONSTRAINT ai_sentinel_alerts_entity_type_check
  CHECK (entity_type IN (
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
  ));

-- ============================================================
-- ROLLBACK (à exécuter manuellement si nécessaire) :
-- ALTER TABLE public.ai_sentinel_alerts DROP CONSTRAINT IF EXISTS ai_sentinel_alerts_entity_type_check;
-- ALTER TABLE public.ai_sentinel_alerts ALTER COLUMN entity_id DROP NOT NULL;
-- ALTER TABLE public.ai_sentinel_alerts ALTER COLUMN entity_type DROP NOT NULL;
-- ============================================================
