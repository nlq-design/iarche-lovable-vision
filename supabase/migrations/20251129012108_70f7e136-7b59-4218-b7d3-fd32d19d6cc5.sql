-- Ajouter colonnes pour système Redacia
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
ADD COLUMN IF NOT EXISTS ai_source TEXT CHECK (ai_source IN ('claude', 'gpt', 'manual')),
ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'IArche',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Migrer les articles existants : si published = true, alors status = 'published'
UPDATE public.articles 
SET status = CASE 
  WHEN published = true THEN 'published' 
  ELSE 'draft' 
END
WHERE status IS NULL;

-- Index pour recherche par status
CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles(status);