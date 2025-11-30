-- Ajouter colonne message dans la table leads pour stocker les messages des formulaires de contact
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS message TEXT;