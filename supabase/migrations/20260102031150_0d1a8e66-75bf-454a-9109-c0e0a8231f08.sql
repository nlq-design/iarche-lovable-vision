-- Add file metadata and context columns to voice_transcriptions
ALTER TABLE public.voice_transcriptions
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS audio_format TEXT,
ADD COLUMN IF NOT EXISTS analysis_context TEXT;