-- ============================================================================
-- AI Provider Configuration Tables
-- Phase 2: Database-driven provider switching (corrected)
-- ============================================================================

-- Table: ai_provider_config
-- Stores active provider configurations with priority for fallback chain
CREATE TABLE IF NOT EXISTS public.ai_provider_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL CHECK (provider_name IN ('lovable_ai', 'openai', 'anthropic', 'openrouter')),
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 1, -- Lower = higher priority
  api_key_env_var TEXT NOT NULL,
  base_url TEXT NOT NULL,
  rate_limit_rpm INTEGER DEFAULT 60,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure unique provider per workspace (or global if workspace_id is null)
  UNIQUE(provider_name, workspace_id)
);

-- Table: ai_models
-- Available models per provider with capabilities
CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL CHECK (provider_name IN ('lovable_ai', 'openai', 'anthropic', 'openrouter')),
  model_id TEXT NOT NULL, -- e.g., 'gpt-4o', 'claude-3-5-sonnet', 'google/gemini-2.5-flash'
  display_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('chat', 'embedding', 'vision', 'reasoning')),
  context_window INTEGER DEFAULT 128000,
  max_output_tokens INTEGER,
  cost_per_1k_input NUMERIC(10, 6),
  cost_per_1k_output NUMERIC(10, 6),
  is_active BOOLEAN DEFAULT true,
  is_default_for_category BOOLEAN DEFAULT false,
  capabilities TEXT[] DEFAULT '{}', -- ['vision', 'function_calling', 'streaming']
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(provider_name, model_id)
);

-- Enable RLS
ALTER TABLE public.ai_provider_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_provider_config
-- Global configs (workspace_id IS NULL) are readable by all authenticated users
CREATE POLICY "Read global provider configs" ON public.ai_provider_config
  FOR SELECT USING (workspace_id IS NULL);

-- Workspace-specific configs readable by workspace members
CREATE POLICY "Read workspace provider configs" ON public.ai_provider_config
  FOR SELECT USING (
    workspace_id IS NOT NULL 
    AND public.can_access_workspace(workspace_id, auth.uid())
  );

-- Admin modification via service role only (no user-facing policy needed for writes)

-- RLS Policies for ai_models (read-only for all authenticated)
CREATE POLICY "Read all models" ON public.ai_models
  FOR SELECT USING (true);

-- Insert default global configurations
INSERT INTO public.ai_provider_config (provider_name, display_name, is_active, is_default, priority, api_key_env_var, base_url, workspace_id)
VALUES 
  ('lovable_ai', 'Lovable AI (Gemini/GPT)', true, true, 1, 'LOVABLE_API_KEY', 'https://ai.gateway.lovable.dev/v1', NULL),
  ('openai', 'OpenAI Direct', true, false, 2, 'OPENAI_API_KEY', 'https://api.openai.com/v1', NULL),
  ('anthropic', 'Anthropic Claude', true, false, 3, 'ANTHROPIC_API_KEY', 'https://api.anthropic.com/v1', NULL),
  ('openrouter', 'OpenRouter (Multi-Model)', true, false, 4, 'OPENROUTER_API_KEY', 'https://openrouter.ai/api/v1', NULL)
ON CONFLICT (provider_name, workspace_id) DO NOTHING;

-- Insert default models
INSERT INTO public.ai_models (provider_name, model_id, display_name, category, context_window, is_default_for_category, capabilities)
VALUES 
  -- Lovable AI (Gateway)
  ('lovable_ai', 'google/gemini-2.5-flash', 'Gemini 2.5 Flash', 'chat', 1000000, true, ARRAY['streaming', 'function_calling']),
  ('lovable_ai', 'google/gemini-2.5-pro', 'Gemini 2.5 Pro', 'reasoning', 1000000, true, ARRAY['streaming', 'function_calling', 'vision']),
  ('lovable_ai', 'google/gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite', 'chat', 1000000, false, ARRAY['streaming']),
  
  -- OpenAI
  ('openai', 'gpt-4o', 'GPT-4o', 'chat', 128000, false, ARRAY['streaming', 'function_calling', 'vision']),
  ('openai', 'gpt-4o-mini', 'GPT-4o Mini', 'chat', 128000, false, ARRAY['streaming', 'function_calling']),
  ('openai', 'text-embedding-3-small', 'Embedding 3 Small', 'embedding', 8191, true, ARRAY[]::TEXT[]),
  ('openai', 'text-embedding-3-large', 'Embedding 3 Large', 'embedding', 8191, false, ARRAY[]::TEXT[]),
  
  -- Anthropic
  ('anthropic', 'claude-sonnet-4-20250514', 'Claude Sonnet 4', 'chat', 200000, false, ARRAY['streaming', 'function_calling', 'vision']),
  ('anthropic', 'claude-3-5-haiku-20241022', 'Claude 3.5 Haiku', 'chat', 200000, false, ARRAY['streaming', 'function_calling']),
  
  -- OpenRouter
  ('openrouter', 'google/gemini-2.5-flash-preview', 'Gemini 2.5 Flash (OR)', 'chat', 1000000, false, ARRAY['streaming', 'function_calling']),
  ('openrouter', 'anthropic/claude-sonnet-4', 'Claude Sonnet 4 (OR)', 'reasoning', 200000, false, ARRAY['streaming', 'function_calling'])
ON CONFLICT (provider_name, model_id) DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_ai_provider_config_updated_at
  BEFORE UPDATE ON public.ai_provider_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_provider_config_active ON public.ai_provider_config(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_ai_models_provider_category ON public.ai_models(provider_name, category, is_active);