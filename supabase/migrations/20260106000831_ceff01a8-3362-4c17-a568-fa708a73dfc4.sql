-- =====================================================
-- SECURITY FIX: RLS + search_path for v7.0 tables/functions
-- =====================================================

-- 1. Enable RLS on telegram_conversation_context
ALTER TABLE public.telegram_conversation_context ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policy - only service_role can access (internal use only)
CREATE POLICY "Service role full access on telegram_conversation_context"
ON public.telegram_conversation_context
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Fix search_path for fuzzy search function
CREATE OR REPLACE FUNCTION public.search_entities_fuzzy(
  search_term TEXT,
  entity_types TEXT[] DEFAULT ARRAY['lead', 'project', 'partner']
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  entity_company TEXT,
  similarity_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'lead'::TEXT as entity_type,
    l.id as entity_id,
    l.name as entity_name,
    l.company as entity_company,
    GREATEST(
      similarity(lower(COALESCE(l.name, '')), lower(search_term)),
      similarity(lower(COALESCE(l.company, '')), lower(search_term))
    ) as similarity_score
  FROM leads l
  WHERE 'lead' = ANY(entity_types)
    AND (
      lower(COALESCE(l.name, '')) ILIKE '%' || lower(search_term) || '%'
      OR lower(COALESCE(l.company, '')) ILIKE '%' || lower(search_term) || '%'
      OR similarity(lower(COALESCE(l.name, '')), lower(search_term)) > 0.25
      OR similarity(lower(COALESCE(l.company, '')), lower(search_term)) > 0.25
    )
  
  UNION ALL
  
  SELECT 
    'project'::TEXT as entity_type,
    p.id as entity_id,
    p.name as entity_name,
    NULL::TEXT as entity_company,
    similarity(lower(COALESCE(p.name, '')), lower(search_term)) as similarity_score
  FROM projects p
  WHERE 'project' = ANY(entity_types)
    AND (
      lower(COALESCE(p.name, '')) ILIKE '%' || lower(search_term) || '%'
      OR similarity(lower(COALESCE(p.name, '')), lower(search_term)) > 0.25
    )
  
  UNION ALL
  
  SELECT 
    'partner'::TEXT as entity_type,
    pa.id as entity_id,
    pa.name as entity_name,
    pa.company as entity_company,
    GREATEST(
      similarity(lower(COALESCE(pa.name, '')), lower(search_term)),
      similarity(lower(COALESCE(pa.company, '')), lower(search_term))
    ) as similarity_score
  FROM partners pa
  WHERE 'partner' = ANY(entity_types)
    AND pa.deleted_at IS NULL
    AND (
      lower(COALESCE(pa.name, '')) ILIKE '%' || lower(search_term) || '%'
      OR lower(COALESCE(pa.company, '')) ILIKE '%' || lower(search_term) || '%'
      OR similarity(lower(COALESCE(pa.name, '')), lower(search_term)) > 0.25
      OR similarity(lower(COALESCE(pa.company, '')), lower(search_term)) > 0.25
    )
  
  ORDER BY similarity_score DESC
  LIMIT 10;
END;
$$;

-- 4. Fix search_path for cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_telegram_context()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.telegram_conversation_context
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;