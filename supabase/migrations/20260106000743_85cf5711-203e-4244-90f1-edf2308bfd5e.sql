-- =====================================================
-- MIGRATION: Telegram Conversation Context + Fuzzy Search
-- Version: v7.0 - Agent Expert Upgrade
-- =====================================================

-- 1. Create table for Telegram conversation context
CREATE TABLE IF NOT EXISTS public.telegram_conversation_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  collected_info JSONB DEFAULT '{}',
  active_entity_id UUID,
  active_entity_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 minutes')
);

-- Index for fast lookup by chat_id
CREATE INDEX IF NOT EXISTS idx_telegram_context_chat_id ON public.telegram_conversation_context(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_context_expires ON public.telegram_conversation_context(expires_at);

-- 2. Enable pg_trgm extension for fuzzy search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 3. Create fuzzy search function for entities
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
) AS $$
BEGIN
  RETURN QUERY
  -- Search leads
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
  
  -- Search projects
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
  
  -- Search partners
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to clean old conversation context
CREATE OR REPLACE FUNCTION public.cleanup_old_telegram_context()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.telegram_conversation_context
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_conversation_context TO service_role;
GRANT EXECUTE ON FUNCTION public.search_entities_fuzzy TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_telegram_context TO service_role;

-- 6. Add comment for documentation
COMMENT ON TABLE public.telegram_conversation_context IS 'Stores recent Telegram conversation history for context retention (30 min TTL)';
COMMENT ON FUNCTION public.search_entities_fuzzy IS 'Fuzzy search across leads, projects, and partners with similarity scoring';