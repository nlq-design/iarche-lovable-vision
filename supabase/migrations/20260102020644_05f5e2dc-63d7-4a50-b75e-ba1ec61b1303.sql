-- Add original_filename column to voice_transcriptions
ALTER TABLE public.voice_transcriptions
ADD COLUMN original_filename text;