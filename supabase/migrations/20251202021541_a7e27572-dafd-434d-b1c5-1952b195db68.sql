-- Table pour stocker les templates média personnalisés
CREATE TABLE public.media_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  editor_type TEXT NOT NULL CHECK (editor_type IN ('banner', 'story', 'thumbnail', 'opengraph', 'header-email', 'post', 'carousel', 'presentation')),
  template_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes par éditeur
CREATE INDEX idx_media_templates_editor_type ON public.media_templates(editor_type);
CREATE INDEX idx_media_templates_user_id ON public.media_templates(user_id);

-- Enable RLS
ALTER TABLE public.media_templates ENABLE ROW LEVEL SECURITY;

-- Policies: seuls les admins peuvent gérer les templates
CREATE POLICY "Admins can manage media templates"
  ON public.media_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all media templates"
  ON public.media_templates
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_media_templates_updated_at
  BEFORE UPDATE ON public.media_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();