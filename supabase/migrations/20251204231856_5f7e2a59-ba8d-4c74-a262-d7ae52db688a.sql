-- Table brochures pour le module de présentation
CREATE TABLE public.brochures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  cover_title TEXT NOT NULL,
  cover_subtitle TEXT,
  cover_image_url TEXT,
  sections JSONB NOT NULL DEFAULT '{
    "introduction": {"enabled": true, "content": ""},
    "keyPoints": {"enabled": true, "points": []},
    "details": {"enabled": false, "content": "", "features": []},
    "pricing": {"enabled": false, "title": "Nos formules", "plans": []},
    "testimonial": {"enabled": false, "quote": "", "author": "", "company": ""},
    "contact": {"enabled": true, "cta_text": "Nous contacter", "show_coordinates": true}
  }'::jsonb,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour les requêtes
CREATE INDEX idx_brochures_slug ON public.brochures(slug);
CREATE INDEX idx_brochures_published ON public.brochures(published);

-- RLS
ALTER TABLE public.brochures ENABLE ROW LEVEL SECURITY;

-- Admins peuvent tout faire
CREATE POLICY "Admins can manage brochures"
  ON public.brochures
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Public peut voir les brochures publiées
CREATE POLICY "Public can view published brochures"
  ON public.brochures
  FOR SELECT
  USING (published = true);

-- Trigger pour updated_at
CREATE TRIGGER update_brochures_updated_at
  BEFORE UPDATE ON public.brochures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();