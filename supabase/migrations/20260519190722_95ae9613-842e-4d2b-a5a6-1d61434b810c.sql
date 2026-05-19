-- Sprint 1 — M13 : étendre resource_embeddings pour ingestion CRM riche
-- Référence : CDC v2 CRM-as-RAG, .lovable/plan.md

-- 1) Drop des CHECK existants pour les recréer avec les nouveaux types
ALTER TABLE public.resource_embeddings
  DROP CONSTRAINT IF EXISTS resource_embeddings_resource_type_check,
  DROP CONSTRAINT IF EXISTS embeddings_workspace_scope_chk;

-- 2) Ajout des nouvelles colonnes
ALTER TABLE public.resource_embeddings
  ADD COLUMN IF NOT EXISTS entity_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS temporal_weight numeric(4,3) NOT NULL DEFAULT 1.000,
  ADD COLUMN IF NOT EXISTS speaker text,
  ADD COLUMN IF NOT EXISTS source_date timestamptz,
  ADD COLUMN IF NOT EXISTS parent_resource_id uuid;

-- 3) Recréer CHECK constraint sur resource_type avec les 8 nouveaux types
ALTER TABLE public.resource_embeddings
  ADD CONSTRAINT resource_embeddings_resource_type_check
  CHECK (resource_type = ANY (ARRAY[
    -- Existants
    'service','article','actualite','livre-blanc','atelier-webinaire',
    'solution','cas-client','lead','project','partner',
    'uploaded_file','specification','voice_transcription','generated_document',
    -- Nouveaux (CDC v2 CRM-as-RAG)
    'transcription_chunk','transcription_summary','lead_summary',
    'opportunity','activity_log_agg','entity_note',
    'uploaded_file_chunk','agent_memory'
  ]));

-- 4) Recréer le CHECK workspace_scope avec les nouveaux types CRM (tous workspace-scoped)
ALTER TABLE public.resource_embeddings
  ADD CONSTRAINT embeddings_workspace_scope_chk
  CHECK (
    (resource_type = ANY (ARRAY['article','actualite','cas-client','livre-blanc','atelier-webinaire','solution','service']) AND workspace_id IS NULL)
    OR
    (resource_type = ANY (ARRAY[
      'lead','project','partner','generated_document','uploaded_file','specification','voice_transcription',
      'transcription_chunk','transcription_summary','lead_summary','opportunity',
      'activity_log_agg','entity_note','uploaded_file_chunk','agent_memory'
    ]) AND workspace_id IS NOT NULL)
  );

-- 5) Index pour les nouveaux champs (entity_links GIN, source_date DESC, parent btree)
CREATE INDEX IF NOT EXISTS idx_resource_embeddings_entity_links
  ON public.resource_embeddings USING GIN (entity_links);

CREATE INDEX IF NOT EXISTS idx_resource_embeddings_source_date
  ON public.resource_embeddings (source_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_resource_embeddings_parent
  ON public.resource_embeddings (parent_resource_id)
  WHERE parent_resource_id IS NOT NULL;

-- 6) Commentaires colonnes (documentation in-DB)
COMMENT ON COLUMN public.resource_embeddings.entity_links IS
  'Multi-rattachement: jsonb array de {type, id} pour qu''un chunk remonte sur plusieurs fiches CRM. Ex: [{"type":"lead","id":"..."},{"type":"opportunity","id":"..."}]';
COMMENT ON COLUMN public.resource_embeddings.temporal_weight IS
  'Poids temporel 0.300-1.000. Recalculé en cron nocturne via decay sur source_date (1.0 < 7j, 0.3 > 90j)';
COMMENT ON COLUMN public.resource_embeddings.speaker IS
  'Locuteur identifié (transcriptions). NULL pour les autres types.';
COMMENT ON COLUMN public.resource_embeddings.source_date IS
  'Date sémantique de la source (date de réunion, date d''interaction). Distincte de created_at qui est la date d''indexation.';
COMMENT ON COLUMN public.resource_embeddings.parent_resource_id IS
  'Lien vers la ressource parente pour les chunks multiples (ex: tous les chunks d''une même transcription partagent le même parent_resource_id = voice_transcriptions.id).';