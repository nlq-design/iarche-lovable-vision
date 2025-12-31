-- Table des modèles LLM disponibles pour le Cockpit
CREATE TABLE public.llm_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL, -- 'lovable', 'openai', 'anthropic', 'openrouter'
  model_id text NOT NULL, -- ex: 'google/gemini-2.5-flash', 'gpt-4o', 'claude-sonnet-4-20250514'
  display_name text NOT NULL, -- Nom affiché dans l'UI
  description text, -- Description courte
  category text NOT NULL DEFAULT 'general', -- 'fast', 'balanced', 'premium', 'reasoning'
  is_active boolean NOT NULL DEFAULT true,
  cost_tier text NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'premium'
  max_tokens integer DEFAULT 4096,
  supports_vision boolean DEFAULT false,
  supports_tools boolean DEFAULT true,
  sort_order integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider, model_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_llm_models_active ON public.llm_models(is_active) WHERE is_active = true;
CREATE INDEX idx_llm_models_category ON public.llm_models(category);

-- Trigger pour updated_at
CREATE TRIGGER set_llm_models_updated_at
  BEFORE UPDATE ON public.llm_models
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.llm_models ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour les modèles actifs (besoin pour le modal de transcription)
CREATE POLICY "llm_models_public_read" ON public.llm_models
  FOR SELECT USING (is_active = true);

-- Admin peut tout faire
CREATE POLICY "llm_models_admin_all" ON public.llm_models
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Insérer les modèles par défaut
INSERT INTO public.llm_models (provider, model_id, display_name, description, category, cost_tier, sort_order, supports_vision) VALUES
-- Lovable AI (déjà configuré)
('lovable', 'google/gemini-2.5-flash', 'Gemini 2.5 Flash', 'Rapide et équilibré (défaut)', 'balanced', 'low', 10, true),
('lovable', 'google/gemini-2.5-pro', 'Gemini 2.5 Pro', 'Raisonnement avancé', 'premium', 'medium', 20, true),
('lovable', 'openai/gpt-5', 'GPT-5', 'Puissant et polyvalent', 'premium', 'high', 30, true),
('lovable', 'openai/gpt-5-mini', 'GPT-5 Mini', 'Rapide et économique', 'fast', 'low', 15, true),

-- OpenAI direct
('openai', 'gpt-4o', 'GPT-4o (OpenAI)', 'Modèle phare OpenAI', 'premium', 'high', 40, true),
('openai', 'gpt-4o-mini', 'GPT-4o Mini (OpenAI)', 'Rapide et économique', 'fast', 'low', 35, true),

-- Anthropic direct  
('anthropic', 'claude-sonnet-4-20250514', 'Claude Sonnet 4', 'Excellent pour l''analyse', 'premium', 'high', 50, false),

-- OpenRouter (choix étendu)
('openrouter', 'anthropic/claude-3.5-sonnet', 'Claude 3.5 Sonnet', 'Via OpenRouter', 'premium', 'high', 60, true),
('openrouter', 'meta-llama/llama-3.1-70b-instruct', 'Llama 3.1 70B', 'Open-source performant', 'balanced', 'medium', 70, false),
('openrouter', 'mistralai/mistral-large-latest', 'Mistral Large', 'Français natif', 'balanced', 'medium', 75, false),
('openrouter', 'google/gemini-pro-1.5', 'Gemini Pro 1.5', 'Long contexte', 'premium', 'medium', 80, true),
('openrouter', 'deepseek/deepseek-chat', 'DeepSeek Chat', 'Très économique', 'fast', 'low', 90, false);

-- Ajouter colonne model_id dans voice_transcriptions pour tracer le modèle utilisé
ALTER TABLE public.voice_transcriptions 
  ADD COLUMN IF NOT EXISTS llm_model_id uuid REFERENCES public.llm_models(id);