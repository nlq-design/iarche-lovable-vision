-- 1) RPC entity-scoped : récupère les chunks RAG liés à une entité (sans embedding query)
--    Utilisé par Context Maximizer pour injecter le CRM riche quand on ouvre une fiche.
CREATE OR REPLACE FUNCTION public.match_entity_resources(
  p_entity_type text,
  p_entity_id uuid,
  p_workspace_id uuid DEFAULT NULL,
  p_limit int DEFAULT 20,
  p_types text[] DEFAULT NULL
)
RETURNS TABLE (
  resource_id uuid,
  resource_type text,
  resource_title text,
  content_chunk text,
  chunk_index int,
  source_date timestamptz,
  temporal_weight numeric,
  parent_resource_id uuid,
  metadata jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    re.resource_id,
    re.resource_type,
    re.resource_title,
    re.content_chunk,
    re.chunk_index,
    re.source_date,
    re.temporal_weight,
    re.parent_resource_id,
    re.metadata
  FROM public.resource_embeddings re
  WHERE re.entity_links @> jsonb_build_array(jsonb_build_object('type', p_entity_type, 'id', p_entity_id::text))
    AND (p_workspace_id IS NULL OR re.workspace_id = p_workspace_id OR re.workspace_id IS NULL)
    AND (p_types IS NULL OR re.resource_type = ANY(p_types))
  ORDER BY COALESCE(re.temporal_weight, 0.5) DESC,
           COALESCE(re.source_date, re.created_at) DESC,
           re.chunk_index ASC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_entity_resources(text, uuid, uuid, int, text[]) TO authenticated, service_role;

-- 2) Étendre search_similar_resources_text pour appliquer temporal_weight au score
CREATE OR REPLACE FUNCTION public.search_similar_resources_text(
  query_embedding_text text,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5,
  filter_types text[] DEFAULT NULL::text[],
  p_workspace_id uuid DEFAULT NULL::uuid
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
STABLE
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
    -- Score = cosine similarity x temporal_weight (decay 1.0 → 0.3)
    ((1 - (re.embedding <=> query_embedding_text::extensions.vector)) * COALESCE(re.temporal_weight, 1.0))::double precision AS similarity,
    re.metadata
  FROM public.resource_embeddings re
  WHERE
    (filter_types IS NULL OR re.resource_type = ANY(filter_types))
    AND (
      p_workspace_id IS NULL
      OR re.workspace_id IS NULL
      OR re.workspace_id = p_workspace_id
    )
    AND 1 - (re.embedding <=> query_embedding_text::extensions.vector) > match_threshold
  ORDER BY ((1 - (re.embedding <=> query_embedding_text::extensions.vector)) * COALESCE(re.temporal_weight, 1.0)) DESC
  LIMIT match_count;
END;
$$;

-- 3) Triggers pg_net pour notes
DROP TRIGGER IF EXISTS trg_rag_entity_context_notes ON public.entity_context_notes;
CREATE TRIGGER trg_rag_entity_context_notes
AFTER INSERT OR UPDATE OF content
ON public.entity_context_notes
FOR EACH ROW
WHEN (NEW.content IS NOT NULL)
EXECUTE FUNCTION public.trigger_crm_rag_index('entity_note');

DROP TRIGGER IF EXISTS trg_rag_project_notes ON public.project_notes;
CREATE TRIGGER trg_rag_project_notes
AFTER INSERT OR UPDATE OF content, title
ON public.project_notes
FOR EACH ROW
WHEN (NEW.content IS NOT NULL)
EXECUTE FUNCTION public.trigger_crm_rag_index('project_note');