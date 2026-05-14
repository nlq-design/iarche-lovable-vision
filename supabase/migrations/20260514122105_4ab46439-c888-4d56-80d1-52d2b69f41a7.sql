ALTER TABLE public.voice_transcriptions
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS voice_transcriptions_idempotency_key_uniq
  ON public.voice_transcriptions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;