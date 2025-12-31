-- 1. Corriger la fonction search_similar_resources pour le bon schéma vector
DROP FUNCTION IF EXISTS public.search_similar_resources(extensions.vector, double precision, integer, text[]);

CREATE OR REPLACE FUNCTION public.search_similar_resources(
  query_embedding vector(1536),
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5,
  filter_types text[] DEFAULT NULL
)
RETURNS TABLE (
  resource_id uuid,
  resource_type text,
  resource_title text,
  resource_slug text,
  content_chunk text,
  similarity double precision,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    re.resource_id,
    re.resource_type,
    re.resource_title,
    re.resource_slug,
    re.content_chunk,
    1 - (re.embedding <=> query_embedding) as similarity,
    re.metadata
  FROM public.resource_embeddings re
  WHERE 
    (filter_types IS NULL OR re.resource_type = ANY(filter_types))
    AND 1 - (re.embedding <=> query_embedding) > match_threshold
  ORDER BY re.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 2. Ajouter contrainte unique sur slug si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ai_prompts_slug_key' AND conrelid = 'public.ai_prompts'::regclass
  ) THEN
    ALTER TABLE public.ai_prompts ADD CONSTRAINT ai_prompts_slug_key UNIQUE (slug);
  END IF;
END $$;