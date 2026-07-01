-- Durcissement isolation multi-tenant : search_similar_resources
--
-- La variante vectorielle `search_similar_resources` (0 appelant actif, sœur
-- `search_similar_resources_text` filtrée et vivante) interrogeait
-- `resource_embeddings` SANS filtre workspace → fuite RAG cross-tenant potentielle
-- si un futur appelant l'utilisait. On la redéfinit en FAIL-CLOSED : ajout de
-- `p_workspace_id` obligatoire (défaut NULL → aucun résultat, jamais de fuite).

DROP FUNCTION IF EXISTS public.search_similar_resources(extensions.vector, double precision, integer, text[]);
DROP FUNCTION IF EXISTS public.search_similar_resources(vector, double precision, integer, text[]);

CREATE OR REPLACE FUNCTION public.search_similar_resources(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5,
  filter_types text[] DEFAULT NULL::text[],
  p_workspace_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(resource_id uuid, resource_type text, resource_title text, resource_slug text, content_chunk text, similarity double precision, metadata jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
    re.workspace_id = p_workspace_id            -- 🔒 fail-closed : NULL → aucun résultat
    AND (filter_types IS NULL OR re.resource_type = ANY(filter_types))
    AND 1 - (re.embedding <=> query_embedding) > match_threshold
  ORDER BY re.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;
