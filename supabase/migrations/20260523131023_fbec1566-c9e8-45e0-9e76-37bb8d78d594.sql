CREATE OR REPLACE FUNCTION public.match_public_embeddings(
  query_embedding_text text,
  match_count int DEFAULT 5,
  similarity_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  id uuid,
  resource_type text,
  resource_title text,
  resource_slug text,
  content_chunk text,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  qv extensions.vector;
BEGIN
  qv := query_embedding_text::extensions.vector;
  RETURN QUERY
  SELECT
    re.id,
    re.resource_type,
    re.resource_title,
    re.resource_slug,
    re.content_chunk,
    (1 - (re.embedding OPERATOR(extensions.<=>) qv))::float AS similarity
  FROM public.resource_embeddings re
  WHERE re.is_public = true
    AND (1 - (re.embedding OPERATOR(extensions.<=>) qv)) >= similarity_threshold
  ORDER BY re.embedding OPERATOR(extensions.<=>) qv
  LIMIT match_count;
END;
$$;

-- Drop l'ancienne signature
DROP FUNCTION IF EXISTS public.match_public_embeddings(extensions.vector, int, float);

GRANT EXECUTE ON FUNCTION public.match_public_embeddings(text, int, float) TO anon, authenticated;