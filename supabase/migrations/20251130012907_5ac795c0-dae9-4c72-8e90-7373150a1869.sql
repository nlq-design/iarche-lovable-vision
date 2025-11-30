-- Add atelier-webinaire specific fields to articles table
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS duree_heures NUMERIC,
ADD COLUMN IF NOT EXISTS heure_debut TIME,
ADD COLUMN IF NOT EXISTS type_evenement TEXT 
  CHECK (type_evenement IN ('presentiel', 'webinaire', 'hybride')),
ADD COLUMN IF NOT EXISTS prerequis TEXT,
ADD COLUMN IF NOT EXISTS programme_detaille JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS intervenants JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS outils_requis TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS certificat_delivre BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sondage_post_evenement_url TEXT,
ADD COLUMN IF NOT EXISTS documents_telechargeables JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rappels_automatiques BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cta_evenement_personnalise TEXT;

COMMENT ON COLUMN public.articles.duree_heures IS 'Durée de l''événement en heures';
COMMENT ON COLUMN public.articles.heure_debut IS 'Heure de début de l''événement';
COMMENT ON COLUMN public.articles.type_evenement IS 'Type d''événement (présentiel, webinaire, hybride)';
COMMENT ON COLUMN public.articles.prerequis IS 'Prérequis pour participer';
COMMENT ON COLUMN public.articles.programme_detaille IS 'Programme détaillé [{heure, sujet}]';
COMMENT ON COLUMN public.articles.intervenants IS 'Liste des intervenants [{nom, fonction, photo_url}]';
COMMENT ON COLUMN public.articles.outils_requis IS 'Outils requis (Laptop, Connexion internet, etc.)';
COMMENT ON COLUMN public.articles.certificat_delivre IS 'Certificat délivré à la fin';
COMMENT ON COLUMN public.articles.sondage_post_evenement_url IS 'URL du sondage post-événement';
COMMENT ON COLUMN public.articles.documents_telechargeables IS 'Documents à télécharger [{nom, file_url}]';
COMMENT ON COLUMN public.articles.rappels_automatiques IS 'Activer rappels automatiques (J-3, J-1, H-2)';
COMMENT ON COLUMN public.articles.cta_evenement_personnalise IS 'Texte personnalisé pour le bouton d''inscription';