-- Create a wrapper function that accepts text and casts to vector
CREATE OR REPLACE FUNCTION public.search_similar_resources_text(
  query_embedding_text text,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5,
  filter_types text[] DEFAULT NULL::text[]
)
RETURNS TABLE(
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
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    re.resource_id,
    re.resource_type,
    re.resource_title,
    re.resource_slug,
    re.content_chunk,
    1 - (re.embedding <=> query_embedding_text::extensions.vector) as similarity,
    re.metadata
  FROM public.resource_embeddings re
  WHERE 
    (filter_types IS NULL OR re.resource_type = ANY(filter_types))
    AND 1 - (re.embedding <=> query_embedding_text::extensions.vector) > match_threshold
  ORDER BY re.embedding <=> query_embedding_text::extensions.vector
  LIMIT match_count;
END;
$$;