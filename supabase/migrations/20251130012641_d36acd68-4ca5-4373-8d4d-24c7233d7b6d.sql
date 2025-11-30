-- Add livre-blanc specific fields to articles table
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS nombre_pages INTEGER,
ADD COLUMN IF NOT EXISTS format_fichier TEXT DEFAULT 'pdf' 
  CHECK (format_fichier IN ('pdf', 'epub')),
ADD COLUMN IF NOT EXISTS taille_fichier_bytes BIGINT,
ADD COLUMN IF NOT EXISTS langues_disponibles TEXT[] DEFAULT ARRAY['fr'],
ADD COLUMN IF NOT EXISTS niveau TEXT 
  CHECK (niveau IN ('debutant', 'intermediaire', 'expert')),
ADD COLUMN IF NOT EXISTS thematiques TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS version_document TEXT DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS cta_personnalise TEXT,
ADD COLUMN IF NOT EXISTS compteur_telechargements INTEGER DEFAULT 0;

COMMENT ON COLUMN public.articles.nombre_pages IS 'Nombre de pages du livre blanc';
COMMENT ON COLUMN public.articles.format_fichier IS 'Format du fichier (pdf, epub)';
COMMENT ON COLUMN public.articles.taille_fichier_bytes IS 'Taille du fichier en octets (auto-calculée)';
COMMENT ON COLUMN public.articles.langues_disponibles IS 'Langues dans lesquelles le document est disponible';
COMMENT ON COLUMN public.articles.niveau IS 'Niveau de difficulté (debutant, intermediaire, expert)';
COMMENT ON COLUMN public.articles.thematiques IS 'Thématiques du livre blanc';
COMMENT ON COLUMN public.articles.version_document IS 'Version du document (ex: v1.0, v1.1)';
COMMENT ON COLUMN public.articles.cta_personnalise IS 'Texte personnalisé pour le bouton de téléchargement';
COMMENT ON COLUMN public.articles.compteur_telechargements IS 'Nombre de téléchargements (admin only)';