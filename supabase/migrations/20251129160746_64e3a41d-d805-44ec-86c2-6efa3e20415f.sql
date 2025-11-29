-- Table pour tracker les recherches utilisateurs
CREATE TABLE IF NOT EXISTS public.search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  page_context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_search_queries_created_at ON public.search_queries(created_at);
CREATE INDEX idx_search_queries_query ON public.search_queries(query);

-- RLS
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert search queries"
  ON public.search_queries
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view search queries"
  ON public.search_queries
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Ajouter colonne pour tracker les questions suggérées automatiquement
ALTER TABLE public.faqs 
ADD COLUMN IF NOT EXISTS auto_suggested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suggestion_source TEXT;

COMMENT ON COLUMN public.faqs.auto_suggested IS 'Indique si la FAQ a été générée automatiquement depuis les commentaires/recherches';
COMMENT ON COLUMN public.faqs.suggestion_source IS 'Source de la suggestion (comments, searches, manual)';