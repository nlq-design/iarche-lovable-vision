-- Drop the existing check constraint and recreate with cas-client included
ALTER TABLE public.resource_embeddings 
DROP CONSTRAINT IF EXISTS resource_embeddings_resource_type_check;

ALTER TABLE public.resource_embeddings 
ADD CONSTRAINT resource_embeddings_resource_type_check 
CHECK (resource_type IN ('service', 'article', 'actualite', 'livre-blanc', 'atelier-webinaire', 'solution', 'cas-client'));