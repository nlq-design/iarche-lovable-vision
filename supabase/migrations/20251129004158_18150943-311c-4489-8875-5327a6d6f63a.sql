-- Create comments table for article comments
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved comments
CREATE POLICY "Anyone can view approved comments"
ON public.comments
FOR SELECT
USING (approved = true);

-- Anyone can insert comments (but they need approval)
CREATE POLICY "Anyone can submit comments"
ON public.comments
FOR INSERT
WITH CHECK (true);

-- Admins can view all comments
CREATE POLICY "Admins can view all comments"
ON public.comments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all comments
CREATE POLICY "Admins can manage comments"
ON public.comments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();