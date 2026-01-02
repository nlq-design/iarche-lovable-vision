-- Add slug column to voice_transcriptions table
ALTER TABLE public.voice_transcriptions 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create function to generate unique slug from transcription
CREATE OR REPLACE FUNCTION public.generate_transcription_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from title or date
  IF NEW.title IS NOT NULL AND NEW.title != '' THEN
    -- Normalize title to slug format
    base_slug := lower(regexp_replace(
      regexp_replace(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ));
    base_slug := left(base_slug, 50);
  ELSE
    -- Use date-based slug
    base_slug := 'transcription-' || to_char(COALESCE(NEW.transcription_date, NEW.created_at), 'YYYYMMDD-HH24MI');
  END IF;
  
  -- Ensure uniqueness
  new_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.voice_transcriptions WHERE slug = new_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := new_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate slug on insert
DROP TRIGGER IF EXISTS trigger_generate_transcription_slug ON public.voice_transcriptions;
CREATE TRIGGER trigger_generate_transcription_slug
  BEFORE INSERT ON public.voice_transcriptions
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION public.generate_transcription_slug();

-- Update existing transcriptions with slugs
UPDATE public.voice_transcriptions 
SET slug = 'transcription-' || to_char(COALESCE(transcription_date, created_at), 'YYYYMMDD-HH24MISS') || '-' || left(id::text, 8)
WHERE slug IS NULL;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_slug ON public.voice_transcriptions(slug);