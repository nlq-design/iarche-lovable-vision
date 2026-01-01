-- =============================================================
-- CDC 1 : Synthèse IA Multi-Documents
-- Ajout des champs ai_documents_summary sur les entités cibles
-- =============================================================

-- 1. Leads : synthèse des documents liés (directs et transverses)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS ai_documents_summary TEXT;

-- 2. Generated Documents : synthèse des sources d'un CDC/devis
ALTER TABLE public.generated_documents 
ADD COLUMN IF NOT EXISTS ai_documents_summary TEXT;

-- 3. Articles (Solutions) : synthèse des documents commerciaux
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS ai_documents_summary TEXT;

-- Index pour recherche rapide des entités avec synthèse
CREATE INDEX IF NOT EXISTS idx_leads_has_summary 
ON public.leads ((ai_documents_summary IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_articles_has_summary 
ON public.articles ((ai_documents_summary IS NOT NULL)) 
WHERE resource_type = 'solution';

-- Commentaires pour documentation
COMMENT ON COLUMN public.leads.ai_documents_summary IS 'Synthèse IA consolidée de tous les documents liés au lead';
COMMENT ON COLUMN public.generated_documents.ai_documents_summary IS 'Synthèse IA des fichiers sources utilisés pour générer ce document';
COMMENT ON COLUMN public.articles.ai_documents_summary IS 'Synthèse IA des documents commerciaux liés à cette solution';