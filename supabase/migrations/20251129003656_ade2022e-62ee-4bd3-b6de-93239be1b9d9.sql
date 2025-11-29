-- Create article_versions table for version history
CREATE TABLE public.article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(article_id, version_number)
);

-- Enable RLS
ALTER TABLE public.article_versions ENABLE ROW LEVEL SECURITY;

-- Admins can view all article versions
CREATE POLICY "Admins can view all article versions"
  ON public.article_versions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert article versions
CREATE POLICY "Admins can insert article versions"
  ON public.article_versions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_article_versions_article_id ON public.article_versions(article_id);
CREATE INDEX idx_article_versions_created_at ON public.article_versions(created_at DESC);