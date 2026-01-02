-- Fix search_path for generate_transcription_slug function
CREATE OR REPLACE FUNCTION public.generate_transcription_slug()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;