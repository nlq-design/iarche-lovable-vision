-- Add cas-client specific fields to articles table
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS secteur_activite TEXT 
CHECK (secteur_activite IN ('industrie', 'services', 'sante', 'finance', 'btp', 'transport', 'commerce', 'autre'));

ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS taille_entreprise TEXT 
CHECK (taille_entreprise IN ('tpe', 'pme', 'eti', 'grande-entreprise'));

ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS problematique TEXT;

COMMENT ON COLUMN public.articles.secteur_activite IS 'Secteur d''activité du cas client';
COMMENT ON COLUMN public.articles.taille_entreprise IS 'Taille de l''entreprise cliente';
COMMENT ON COLUMN public.articles.problematique IS 'Problématique principale du cas client';