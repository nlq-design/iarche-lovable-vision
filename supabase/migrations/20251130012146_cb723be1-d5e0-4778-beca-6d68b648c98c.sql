-- Add actualite_type and source_externe to articles table
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS actualite_type TEXT 
CHECK (actualite_type IN ('annonce', 'partenariat', 'evenement', 'communique'));

ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS source_externe JSONB DEFAULT NULL;

COMMENT ON COLUMN public.articles.actualite_type IS 'Type d''actualité: annonce, partenariat, evenement, communique';
COMMENT ON COLUMN public.articles.source_externe IS 'Source externe avec structure {nom: string, url: string}';
COMMENT ON COLUMN public.articles.event_date IS 'Date de l''événement pour les actualités de type evenement';