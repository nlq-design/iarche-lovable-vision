UPDATE public.activity_log
SET is_ai_generated = false
WHERE created_at BETWEEN '2026-05-29 18:00:00+00' AND '2026-05-29 20:30:00+00'
  AND is_ai_generated = true
  AND archived_at IS NULL
  AND activity_type NOT LIKE 'transcription_%'
  AND activity_type NOT LIKE 'synthesis_%'
  AND activity_type NOT LIKE 'new_%';