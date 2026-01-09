-- =============================================
-- PHASE 4-6: Tables manquantes pour le système IA
-- =============================================

-- 1. Table ai_usage_metrics - Suivi des coûts et performances IA
CREATE TABLE IF NOT EXISTS public.ai_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Contexte
  workspace_id UUID REFERENCES public.workspaces(id),
  user_id UUID,
  
  -- Type d'opération
  operation_type TEXT NOT NULL, -- 'transcription', 'synthesis', 'chat', 'document_analysis'
  prompt_slug TEXT, -- Référence au prompt utilisé
  
  -- Modèle utilisé
  model_id TEXT NOT NULL,
  model_provider TEXT NOT NULL,
  
  -- Métriques tokens
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  
  -- Coûts estimés (en centimes)
  estimated_cost_cents NUMERIC(10,4) DEFAULT 0,
  
  -- Performance
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Contexte additionnel
  entity_type TEXT, -- 'lead', 'project', 'partner', 'transcription'
  entity_id UUID,
  metadata JSONB DEFAULT '{}'
);

-- Index pour analytics
CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_created_at ON public.ai_usage_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_operation ON public.ai_usage_metrics(operation_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_model ON public.ai_usage_metrics(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_workspace ON public.ai_usage_metrics(workspace_id);

-- RLS
ALTER TABLE public.ai_usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view metrics"
  ON public.ai_usage_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert metrics"
  ON public.ai_usage_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. Table keyword_synonyms - Synonymes phonétiques et variantes
CREATE TABLE IF NOT EXISTS public.keyword_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Terme canonique
  canonical_term TEXT NOT NULL,
  
  -- Variante/synonyme
  synonym TEXT NOT NULL,
  
  -- Type de relation
  relation_type TEXT NOT NULL DEFAULT 'synonym', -- 'synonym', 'phonetic', 'abbreviation', 'typo'
  
  -- Contexte d'application
  context_type TEXT DEFAULT 'global', -- 'global', 'company', 'person', 'solution', 'technical'
  
  -- Clé phonétique pour matching
  phonetic_key TEXT,
  
  -- Score de confiance
  confidence NUMERIC(3,2) DEFAULT 1.0,
  
  -- Statut
  is_active BOOLEAN DEFAULT true,
  
  -- Qui a créé/validé
  created_by UUID,
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  
  UNIQUE(canonical_term, synonym)
);

CREATE INDEX IF NOT EXISTS idx_keyword_synonyms_canonical ON public.keyword_synonyms(canonical_term);
CREATE INDEX IF NOT EXISTS idx_keyword_synonyms_synonym ON public.keyword_synonyms(synonym);
CREATE INDEX IF NOT EXISTS idx_keyword_synonyms_phonetic ON public.keyword_synonyms(phonetic_key);

-- RLS
ALTER TABLE public.keyword_synonyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view synonyms"
  ON public.keyword_synonyms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage synonyms"
  ON public.keyword_synonyms FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Table keyword_alias_suggestions - File d'attente de suggestions d'alias
CREATE TABLE IF NOT EXISTS public.keyword_alias_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Source de la suggestion
  source_type TEXT NOT NULL, -- 'transcription', 'document', 'manual'
  source_id UUID,
  
  -- Suggestion
  suggested_alias TEXT NOT NULL,
  suggested_canonical TEXT,
  
  -- Contexte
  context_type TEXT DEFAULT 'general',
  context_snippet TEXT, -- Extrait du texte source
  
  -- Confiance de la détection
  confidence_score NUMERIC(3,2) DEFAULT 0.5,
  
  -- Statut de review
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'merged'
  
  -- Review
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Si approuvé, l'alias créé
  created_alias_id UUID REFERENCES public.keyword_aliases(id)
);

CREATE INDEX IF NOT EXISTS idx_keyword_alias_suggestions_status ON public.keyword_alias_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_keyword_alias_suggestions_source ON public.keyword_alias_suggestions(source_type, source_id);

-- RLS
ALTER TABLE public.keyword_alias_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view suggestions"
  ON public.keyword_alias_suggestions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage suggestions"
  ON public.keyword_alias_suggestions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Ajouter colonne manquante à voice_transcriptions si nécessaire
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'voice_transcriptions' 
    AND column_name = 'ai_usage_id'
  ) THEN
    ALTER TABLE public.voice_transcriptions 
    ADD COLUMN ai_usage_id UUID REFERENCES public.ai_usage_metrics(id);
  END IF;
END $$;