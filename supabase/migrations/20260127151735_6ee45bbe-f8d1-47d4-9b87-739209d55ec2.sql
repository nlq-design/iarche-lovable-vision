-- =====================================================
-- PHASE 2.2: Fix search_path warnings
-- =====================================================

-- 1. Fix slugify function - Add search_path (keeping original signature)
CREATE OR REPLACE FUNCTION public.slugify(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
DECLARE
  result TEXT;
BEGIN
  -- Lowercase
  result := lower(input_text);
  -- Replace accented characters
  result := translate(result, 'àáâãäåèéêëìíîïòóôõöùúûüýÿñç', 'aaaaaaeeeeiiiioooooouuuuyync');
  -- Replace spaces and special chars with hyphens
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  -- Remove leading/trailing hyphens
  result := trim(both '-' from result);
  -- Limit length
  result := left(result, 80);
  RETURN result;
END;
$function$;

-- 2. Fix generate_lead_slug function - Add search_path
DROP FUNCTION IF EXISTS public.generate_lead_slug() CASCADE;
CREATE FUNCTION public.generate_lead_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := slugify(COALESCE(NEW.company, NEW.name, 'lead'));
  base_slug := base_slug || '-' || to_char(COALESCE(NEW.created_at, now()), 'YYYYMMDD-HH24MI');
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM leads WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;

-- Recreate trigger for leads
DROP TRIGGER IF EXISTS trigger_generate_lead_slug ON leads;
CREATE TRIGGER trigger_generate_lead_slug
  BEFORE INSERT ON leads
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION generate_lead_slug();

-- 3. Fix generate_document_slug function - Add search_path  
DROP FUNCTION IF EXISTS public.generate_document_slug() CASCADE;
CREATE FUNCTION public.generate_document_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := slugify(COALESCE(NEW.title, 'document'));
  base_slug := base_slug || '-' || to_char(COALESCE(NEW.created_at, now()), 'YYYYMMDD-HH24MI');
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM generated_documents WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;

-- Recreate trigger for documents
DROP TRIGGER IF EXISTS trigger_generate_document_slug ON generated_documents;
CREATE TRIGGER trigger_generate_document_slug
  BEFORE INSERT ON generated_documents
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION generate_document_slug();