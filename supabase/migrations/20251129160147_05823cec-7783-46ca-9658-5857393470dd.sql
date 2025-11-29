-- Create faqs table (simplified, no slug/title)
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id)
);

-- Enable RLS
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view FAQs"
  ON public.faqs
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage FAQs"
  ON public.faqs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_faqs_article_id ON public.faqs(article_id);