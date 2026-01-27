-- =====================================================
-- PHASE 2.1: Hardening NOT NULL on workspace_id
-- Ensures no orphan data can be created
-- =====================================================

-- 1. vivier_lists: Add NOT NULL constraint
ALTER TABLE public.vivier_lists 
  ALTER COLUMN workspace_id SET NOT NULL;

-- 2. vivier_campaign_events: Add NOT NULL constraint
ALTER TABLE public.vivier_campaign_events 
  ALTER COLUMN workspace_id SET NOT NULL;

-- 3. keyword_alias_suggestions: Add NOT NULL constraint
ALTER TABLE public.keyword_alias_suggestions 
  ALTER COLUMN workspace_id SET NOT NULL;

-- 4. keyword_synonyms: Add NOT NULL constraint
ALTER TABLE public.keyword_synonyms 
  ALTER COLUMN workspace_id SET NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.vivier_lists.workspace_id IS 'Required: Multi-tenant workspace isolation';
COMMENT ON COLUMN public.vivier_campaign_events.workspace_id IS 'Required: Multi-tenant workspace isolation';
COMMENT ON COLUMN public.keyword_alias_suggestions.workspace_id IS 'Required: Multi-tenant workspace isolation';
COMMENT ON COLUMN public.keyword_synonyms.workspace_id IS 'Required: Multi-tenant workspace isolation';