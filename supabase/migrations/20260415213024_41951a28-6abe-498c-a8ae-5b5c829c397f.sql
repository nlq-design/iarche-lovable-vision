-- Unique index on slug for public URL uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_documents_slug_unique
ON public.generated_documents(slug) WHERE slug IS NOT NULL;

-- RLS policy: anon can SELECT approved documents with a slug (public landing page)
CREATE POLICY "Public can view approved documents with slug"
ON public.generated_documents
FOR SELECT
TO anon
USING (status = 'approved' AND slug IS NOT NULL);

-- RLS policy: anon can SELECT active forms linked to an article (public event page)
CREATE POLICY "Public can view active forms with article_id"
ON public.forms
FOR SELECT
TO anon
USING (is_active = true AND article_id IS NOT NULL);