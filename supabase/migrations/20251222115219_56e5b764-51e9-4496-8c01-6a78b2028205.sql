-- Ajouter le champ pour le maillage interne des solutions liées
-- Valeurs possibles: NULL (auto/services), 'services' (lien vers /services), ou un slug de solution
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS related_solution_slug TEXT DEFAULT NULL;

-- Ajouter un commentaire pour documenter le champ
COMMENT ON COLUMN public.articles.related_solution_slug IS 'Slug de la solution liée pour le maillage interne. NULL = automatique, "services" = lien vers /services, autre = slug de la solution';