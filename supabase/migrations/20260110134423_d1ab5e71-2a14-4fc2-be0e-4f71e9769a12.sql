-- Add unique constraint on transcription_partners for upsert support
ALTER TABLE public.transcription_partners 
ADD CONSTRAINT transcription_partners_unique_link 
UNIQUE (transcription_id, partner_id);