-- Ajouter la colonne phone2 (téléphone secondaire) à la table viviers
ALTER TABLE public.viviers 
ADD COLUMN IF NOT EXISTS phone2 TEXT;

-- Ajouter un commentaire pour documenter
COMMENT ON COLUMN public.viviers.phone2 IS 'Numéro de téléphone secondaire';

-- Index pour recherche sur phone2
CREATE INDEX IF NOT EXISTS idx_viviers_phone2 ON public.viviers(phone2) WHERE phone2 IS NOT NULL;