-- ============================================
-- SLUG MIGRATION FOR LEADS & DOCUMENTS
-- ============================================

-- 1. LEADS - Add slug column
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index (allows nulls initially)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_slug_unique ON public.leads(slug) WHERE slug IS NOT NULL;

-- 2. GENERATED_DOCUMENTS - Add slug column  
ALTER TABLE public.generated_documents ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_documents_slug_unique ON public.generated_documents(slug) WHERE slug IS NOT NULL;

-- ============================================
-- SLUGIFY FUNCTION (reusable)
-- ============================================
CREATE OR REPLACE FUNCTION public.slugify(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
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
$$;

-- ============================================
-- AUTO-GENERATE SLUG TRIGGERS
-- ============================================

-- LEADS: Generate from company + name
CREATE OR REPLACE FUNCTION public.generate_lead_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Only generate if slug is null
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Base slug from company or name
    base_slug := public.slugify(COALESCE(NEW.company, '') || '-' || COALESCE(NEW.name, ''));
    IF base_slug = '' OR base_slug = '-' THEN
      base_slug := 'lead';
    END IF;
    
    final_slug := base_slug;
    
    -- Handle duplicates
    WHILE EXISTS(SELECT 1 FROM public.leads WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS generate_lead_slug_trigger ON public.leads;
CREATE TRIGGER generate_lead_slug_trigger
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_lead_slug();

-- GENERATED_DOCUMENTS: Generate from title + type
CREATE OR REPLACE FUNCTION public.generate_document_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.slugify(COALESCE(NEW.title, 'document') || '-' || COALESCE(NEW.document_type, ''));
    IF base_slug = '' OR base_slug = '-' THEN
      base_slug := 'document';
    END IF;
    
    final_slug := base_slug;
    
    WHILE EXISTS(SELECT 1 FROM public.generated_documents WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS generate_document_slug_trigger ON public.generated_documents;
CREATE TRIGGER generate_document_slug_trigger
  BEFORE INSERT OR UPDATE ON public.generated_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_document_slug();

-- ============================================
-- POPULATE EXISTING RECORDS (trigger fires on update)
-- ============================================

-- Force trigger to generate slugs for existing leads
UPDATE public.leads SET slug = NULL WHERE slug IS NULL;

-- Force trigger to generate slugs for existing documents
UPDATE public.generated_documents SET slug = NULL WHERE slug IS NULL;