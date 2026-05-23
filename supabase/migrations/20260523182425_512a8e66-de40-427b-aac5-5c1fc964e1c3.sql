-- Lot Debug RAG: ajoute colonne filters jsonb pour tracer les paramètres
-- de récupération (workspace_id, entity scope, limit, types, threshold, model).
ALTER TABLE public.ai_context_traces
  ADD COLUMN IF NOT EXISTS filters jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.ai_context_traces.filters IS
  'Filtres RAG appliqués lors de la récupération : workspace_id, entity scope, limit, types autorisés, seuil de similarité, modèle d''embedding. Affichés dans RagDiagnosticsDrawer en mode debug.';