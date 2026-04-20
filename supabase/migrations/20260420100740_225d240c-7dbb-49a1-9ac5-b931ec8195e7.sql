-- ============================================================
-- QW#9d: resource_embeddings HYBRID (CMS global + CRM per-tenant)
-- + Orphan cleanup (Option A)
-- ============================================================
-- Rollback (commented):
-- ALTER TABLE public.resource_embeddings DROP CONSTRAINT IF EXISTS embeddings_workspace_scope_chk;
-- DROP FUNCTION IF EXISTS public.search_similar_resources_text(text, double precision, integer, text[], uuid);
-- (no UPDATE rollback: backfilled workspace_id values are correct CRM ownership)
-- ============================================================

-- ============================================================
-- ÉTAPE 0 — CLEANUP orphan embeddings (40 chunks)
-- ============================================================
DELETE FROM public.resource_embeddings
WHERE (resource_type = 'lead' AND resource_id NOT IN (SELECT id FROM public.leads))
   OR (resource_type = 'project' AND resource_id NOT IN (SELECT id FROM public.projects))
   OR (resource_type = 'partner' AND resource_id NOT IN (SELECT id FROM public.partners))
   OR (resource_type = 'generated_document' AND resource_id NOT IN (SELECT id FROM public.generated_documents));

-- ============================================================
-- ÉTAPE 1 — BACKFILL workspace_id for CRM chunks
-- ============================================================
UPDATE public.resource_embeddings re
SET workspace_id = l.workspace_id
FROM public.leads l
WHERE re.resource_type = 'lead'
  AND re.resource_id = l.id
  AND re.workspace_id IS NULL
  AND l.workspace_id IS NOT NULL;

UPDATE public.resource_embeddings re
SET workspace_id = p.workspace_id
FROM public.projects p
WHERE re.resource_type = 'project'
  AND re.resource_id = p.id
  AND re.workspace_id IS NULL
  AND p.workspace_id IS NOT NULL;

UPDATE public.resource_embeddings re
SET workspace_id = pa.workspace_id
FROM public.partners pa
WHERE re.resource_type = 'partner'
  AND re.resource_id = pa.id
  AND re.workspace_id IS NULL
  AND pa.workspace_id IS NOT NULL;

UPDATE public.resource_embeddings re
SET workspace_id = gd.workspace_id
FROM public.generated_documents gd
WHERE re.resource_type = 'generated_document'
  AND re.resource_id = gd.id
  AND re.workspace_id IS NULL
  AND gd.workspace_id IS NOT NULL;

-- ============================================================
-- ÉTAPE 2 — CHECK constraint: enforce HYBRID scope rules
-- CMS types (article/actualite/cas-client/livre-blanc/atelier-webinaire/solution/service)
--   → workspace_id MUST BE NULL (global, accessible all tenants)
-- CRM types (lead/project/partner/generated_document/uploaded_file/specification/voice_transcription)
--   → workspace_id MUST BE NOT NULL (per-tenant isolation)
-- ============================================================
ALTER TABLE public.resource_embeddings
DROP CONSTRAINT IF EXISTS embeddings_workspace_scope_chk;

ALTER TABLE public.resource_embeddings
ADD CONSTRAINT embeddings_workspace_scope_chk CHECK (
  (
    resource_type IN ('article', 'actualite', 'cas-client', 'livre-blanc', 'atelier-webinaire', 'solution', 'service')
    AND workspace_id IS NULL
  )
  OR (
    resource_type IN ('lead', 'project', 'partner', 'generated_document', 'uploaded_file', 'specification', 'voice_transcription')
    AND workspace_id IS NOT NULL
  )
);

-- ============================================================
-- ÉTAPE 3 — RPC: replace search_similar_resources_text with workspace-aware version
-- p_workspace_id NULL → no tenant filter (super_admin / NLQ bypass)
-- p_workspace_id UUID → return CMS global (workspace_id IS NULL) UNION tenant CRM (workspace_id = param)
-- ============================================================
DROP FUNCTION IF EXISTS public.search_similar_resources_text(text, double precision, integer, text[]);

CREATE OR REPLACE FUNCTION public.search_similar_resources_text(
  query_embedding_text text,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5,
  filter_types text[] DEFAULT NULL,
  p_workspace_id uuid DEFAULT NULL
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
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    re.resource_id,
    re.resource_type,
    re.resource_title,
    re.resource_slug,
    re.content_chunk,
    1 - (re.embedding <=> query_embedding_text::extensions.vector) AS similarity,
    re.metadata
  FROM public.resource_embeddings re
  WHERE
    (filter_types IS NULL OR re.resource_type = ANY(filter_types))
    AND (
      p_workspace_id IS NULL                  -- bypass: admin / NLQ super_admin
      OR re.workspace_id IS NULL              -- CMS global content (any tenant can read)
      OR re.workspace_id = p_workspace_id     -- tenant-scoped CRM content
    )
    AND 1 - (re.embedding <=> query_embedding_text::extensions.vector) > match_threshold
  ORDER BY re.embedding <=> query_embedding_text::extensions.vector
  LIMIT match_count;
END;
$function$;