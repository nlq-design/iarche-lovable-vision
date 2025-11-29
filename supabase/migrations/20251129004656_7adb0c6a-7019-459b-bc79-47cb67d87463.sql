-- Create article views tracking table
CREATE TABLE public.article_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.article_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert views (for tracking)
CREATE POLICY "Anyone can track article views"
ON public.article_views
FOR INSERT
WITH CHECK (true);

-- Admins can view all stats
CREATE POLICY "Admins can view article stats"
ON public.article_views
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for better performance
CREATE INDEX idx_article_views_article_id ON public.article_views(article_id);
CREATE INDEX idx_article_views_viewed_at ON public.article_views(viewed_at);