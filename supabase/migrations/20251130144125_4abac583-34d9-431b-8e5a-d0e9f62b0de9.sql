-- Ajouter colonne source_context à la table leads pour stocker le contexte du lead
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS source_context TEXT;