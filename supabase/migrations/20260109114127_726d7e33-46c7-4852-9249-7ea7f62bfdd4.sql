-- 1. Extend keyword_aliases context_type check constraint to include all existing + new types
ALTER TABLE public.keyword_aliases DROP CONSTRAINT IF EXISTS keyword_aliases_context_type_check;
ALTER TABLE public.keyword_aliases ADD CONSTRAINT keyword_aliases_context_type_check 
  CHECK (context_type IN ('lead', 'project', 'solution', 'partner', 'client', 'person', 'company', 'product', 'concurrent', 'autre', 'service', 'outil'));

-- 2. Add unique constraint for entity_name_references upsert
ALTER TABLE public.entity_name_references DROP CONSTRAINT IF EXISTS entity_name_references_unique_link;
ALTER TABLE public.entity_name_references ADD CONSTRAINT entity_name_references_unique_link 
  UNIQUE (source_entity_id, source_entity_type, target_entity_id, target_entity_type);