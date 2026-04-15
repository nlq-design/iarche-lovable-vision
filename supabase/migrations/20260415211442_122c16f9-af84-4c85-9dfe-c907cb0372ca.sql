-- Add article_id to forms to link forms to events
ALTER TABLE public.forms ADD COLUMN article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL;

-- Index for quick lookup
CREATE INDEX idx_forms_article_id ON public.forms(article_id) WHERE article_id IS NOT NULL;

-- Link existing forms to their articles if we can match by title
-- Link "inscription-vague-ia-22-avril-2026" to the Vague de l'IA article
UPDATE public.forms 
SET article_id = (SELECT id FROM public.articles WHERE slug ILIKE '%vague-ia%' AND resource_type = 'atelier-webinaire' LIMIT 1)
WHERE slug = 'inscription-vague-ia-22-avril-2026';

UPDATE public.forms 
SET article_id = (SELECT id FROM public.articles WHERE slug ILIKE '%vague-ia%' AND resource_type = 'atelier-webinaire' LIMIT 1)
WHERE slug = 'inscription-la-vague-de-l-ia';

-- Link Collaboria form
UPDATE public.forms 
SET article_id = (SELECT id FROM public.articles WHERE slug ILIKE '%collaboria%' AND resource_type = 'atelier-webinaire' LIMIT 1)
WHERE slug = 'inscription-a-la-presentation-de-collaboria-qor9rb';