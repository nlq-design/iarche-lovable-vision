-- Add 'solution' to resource_type CHECK constraint
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_resource_type_check;

ALTER TABLE public.articles
ADD CONSTRAINT articles_resource_type_check 
CHECK (resource_type IN ('actualite', 'article', 'cas-client', 'livre-blanc', 'atelier-webinaire', 'solution'));