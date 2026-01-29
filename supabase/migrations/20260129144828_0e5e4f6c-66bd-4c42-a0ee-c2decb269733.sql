-- Table pour stocker la configuration de modèle par Edge Function
CREATE TABLE public.edge_function_model_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL UNIQUE,
  provider_name TEXT NOT NULL DEFAULT 'lovable_ai',
  model_id TEXT, -- null = utiliser le modèle par défaut du provider
  is_custom_model BOOLEAN DEFAULT false, -- true si modèle OpenRouter custom
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edge_function_model_config ENABLE ROW LEVEL SECURITY;

-- Policies - accessible uniquement par les admins authentifiés
CREATE POLICY "Admins can view edge function configs"
  ON public.edge_function_model_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert edge function configs"
  ON public.edge_function_model_config
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update edge function configs"
  ON public.edge_function_model_config
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete edge function configs"
  ON public.edge_function_model_config
  FOR DELETE
  TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_edge_function_model_config_updated_at
  BEFORE UPDATE ON public.edge_function_model_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configurations for existing functions
INSERT INTO public.edge_function_model_config (function_name, provider_name, model_id) VALUES
  ('partner-consulte', 'lovable_ai', NULL),
  ('suggest-tags', 'lovable_ai', NULL),
  ('search-embeddings', 'openai', 'text-embedding-3-small'),
  ('generate-embeddings', 'openai', 'text-embedding-3-small'),
  ('process-voice-transcription', 'lovable_ai', NULL),
  ('ai-agent-orchestrator', 'lovable_ai', NULL),
  ('generate-article-claude', 'anthropic', 'claude-sonnet-4-20250514'),
  ('generate-article-gpt', 'openai', 'gpt-4o'),
  ('generate-document', 'lovable_ai', NULL),
  ('generate-faq', 'lovable_ai', NULL),
  ('generate-followup-email', 'lovable_ai', NULL),
  ('enrich-content-seo', 'lovable_ai', NULL),
  ('analyze-comments-for-faq', 'lovable_ai', NULL),
  ('vivier-ai-search', 'lovable_ai', NULL),
  ('vivier-insights', 'lovable_ai', NULL),
  ('score-viviers-batch', 'lovable_ai', NULL),
  ('synthesize-entity-documents', 'lovable_ai', NULL),
  ('extract-entities', 'lovable_ai', NULL)
ON CONFLICT (function_name) DO NOTHING;