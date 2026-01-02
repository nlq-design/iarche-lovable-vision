-- Ajouter champ deleted_at pour soft delete des partenaires
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index pour filtrer les partenaires non supprimés
CREATE INDEX IF NOT EXISTS idx_partners_not_deleted 
ON public.partners (deleted_at) 
WHERE deleted_at IS NULL;