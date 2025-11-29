-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read categories
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create tags table
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Everyone can read tags
CREATE POLICY "Anyone can view tags"
  ON public.tags FOR SELECT
  USING (true);

-- Only admins can manage tags
CREATE POLICY "Admins can manage tags"
  ON public.tags FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create articles table
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Everyone can read published articles
CREATE POLICY "Anyone can view published articles"
  ON public.articles FOR SELECT
  USING (published = true);

-- Admins can view all articles
CREATE POLICY "Admins can view all articles"
  ON public.articles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can create/update/delete articles
CREATE POLICY "Admins can manage articles"
  ON public.articles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create article_categories junction table
CREATE TABLE public.article_categories (
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, category_id)
);

ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read article categories
CREATE POLICY "Anyone can view article categories"
  ON public.article_categories FOR SELECT
  USING (true);

-- Only admins can manage article categories
CREATE POLICY "Admins can manage article categories"
  ON public.article_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create article_tags junction table
CREATE TABLE public.article_tags (
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;

-- Everyone can read article tags
CREATE POLICY "Anyone can view article tags"
  ON public.article_tags FOR SELECT
  USING (true);

-- Only admins can manage article tags
CREATE POLICY "Admins can manage article tags"
  ON public.article_tags FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for articles
CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, slug) VALUES
  ('Intelligence Artificielle', 'intelligence-artificielle'),
  ('PME & Transformation', 'pme-transformation'),
  ('Cas d''usage', 'cas-usage'),
  ('Réglementation', 'reglementation'),
  ('Tutoriels', 'tutoriels');

-- Insert default tags
INSERT INTO public.tags (name, slug) VALUES
  ('RAG', 'rag'),
  ('ChatGPT', 'chatgpt'),
  ('Automatisation', 'automatisation'),
  ('AI Act', 'ai-act'),
  ('RGPD', 'rgpd'),
  ('OpenAI', 'openai'),
  ('LLM', 'llm'),
  ('Data', 'data');