-- Retro-fix is_ai_generated pour les ~100 notes manuelles du 29/05
--
-- Contexte : avant le fix de create_activity_note (commit 989abf8a) qui force désormais
-- is_ai_generated = false par défaut, le tool écrivait toujours is_ai_generated = true en dur.
-- Les ~100 notes créées par les sub-agents et Claude principal lors de l'audit transcriptions
-- du 2026-05-29 entre 18h00 et 20h30 ont donc toutes le flag à true, ce qui les rend
-- insupprimables via delete_activity_note (garde anti-IA-generated).
--
-- Cette migration repasse is_ai_generated à false pour les notes manuelles uniquement,
-- en excluant explicitement les types auto-générés (transcription_*, synthesis_*,
-- new_lead, new_project) pour ne pas casser leur immutabilité.

UPDATE public.activity_log
SET is_ai_generated = false
WHERE created_at BETWEEN '2026-05-29 18:00:00+00' AND '2026-05-29 20:30:00+00'
  AND activity_type NOT LIKE 'transcription_%'
  AND activity_type NOT IN (
    'synthesis_generated',
    'synthesis_stale_detected',
    'new_lead',
    'new_project'
  )
  AND archived_at IS NULL;
