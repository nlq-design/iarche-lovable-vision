-- Ajout colonne titre modifiable pour transcriptions
ALTER TABLE public.voice_transcriptions 
ADD COLUMN IF NOT EXISTS title TEXT DEFAULT NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN public.voice_transcriptions.title IS 'Titre personnalisé (prioritaire sur summary.title si défini)';