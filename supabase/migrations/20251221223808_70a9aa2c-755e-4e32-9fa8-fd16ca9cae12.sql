-- Ajouter des champs enrichis à la table leads pour les infos société
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'France',
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS revenue_range TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS position TEXT;

-- Commenter les colonnes pour documentation
COMMENT ON COLUMN public.leads.website IS 'Site web de l entreprise';
COMMENT ON COLUMN public.leads.address IS 'Adresse postale';
COMMENT ON COLUMN public.leads.city IS 'Ville';
COMMENT ON COLUMN public.leads.postal_code IS 'Code postal';
COMMENT ON COLUMN public.leads.country IS 'Pays';
COMMENT ON COLUMN public.leads.siret IS 'Numéro SIRET de l entreprise';
COMMENT ON COLUMN public.leads.revenue_range IS 'Tranche de chiffre d affaires';
COMMENT ON COLUMN public.leads.linkedin_url IS 'URL LinkedIn du contact';
COMMENT ON COLUMN public.leads.position IS 'Fonction/poste du contact';