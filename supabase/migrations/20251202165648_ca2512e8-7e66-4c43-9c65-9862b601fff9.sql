-- =============================================
-- TABLE DES FORMULAIRES
-- =============================================
CREATE TABLE public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  fields JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{
    "design": {
      "colors": {
        "primary": "#1A2B4A",
        "secondary": "#D15A3E",
        "background": "#FAF9F7",
        "text": "#4A5568"
      },
      "logo": null,
      "showGradientBar": true,
      "barSize": "lg",
      "showCanalisations": false
    },
    "thankYou": {
      "message": "Merci pour votre réponse !",
      "redirectUrl": null
    },
    "notifications": {
      "adminEmail": null,
      "sendToRespondent": false,
      "respondentEmailField": null,
      "customSubject": null
    },
    "integrations": {
      "webhookUrl": null
    },
    "rgpd": {
      "retentionDays": 365,
      "autoPurge": false
    }
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  qr_code_url TEXT,
  views_count INTEGER DEFAULT 0,
  submissions_count INTEGER DEFAULT 0
);

-- =============================================
-- TABLE DES RÉPONSES
-- =============================================
CREATE TABLE public.form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE NOT NULL,
  data JSONB NOT NULL,
  metadata JSONB DEFAULT '{
    "ip": null,
    "userAgent": null,
    "source": null,
    "referrer": null,
    "device": null
  }'::jsonb,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_complete BOOLEAN DEFAULT true,
  partial_data JSONB DEFAULT '{}'::jsonb
);

-- =============================================
-- TABLE ANALYTICS
-- =============================================
CREATE TABLE public.form_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  field_id TEXT,
  step INTEGER DEFAULT 0,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEX POUR PERFORMANCE
-- =============================================
CREATE INDEX idx_form_responses_form_id ON public.form_responses(form_id);
CREATE INDEX idx_form_responses_submitted_at ON public.form_responses(submitted_at);
CREATE INDEX idx_form_analytics_form_id ON public.form_analytics(form_id);
CREATE INDEX idx_form_analytics_event_type ON public.form_analytics(event_type);
CREATE INDEX idx_form_analytics_session ON public.form_analytics(session_id);
CREATE INDEX idx_forms_slug ON public.forms(slug);
CREATE INDEX idx_forms_is_active ON public.forms(is_active);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_analytics ENABLE ROW LEVEL SECURITY;

-- Forms: lecture publique pour forms actifs
CREATE POLICY "Forms actifs lisibles publiquement" ON public.forms
  FOR SELECT USING (is_active = true);

-- Forms: admin full access
CREATE POLICY "Admin full access forms" ON public.forms
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Responses: insertion publique
CREATE POLICY "Insertion publique responses" ON public.form_responses
  FOR INSERT WITH CHECK (true);

-- Responses: lecture admin
CREATE POLICY "Admin peut voir responses" ON public.form_responses
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Responses: suppression admin
CREATE POLICY "Admin peut supprimer responses" ON public.form_responses
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Analytics: insertion publique
CREATE POLICY "Insertion publique analytics" ON public.form_analytics
  FOR INSERT WITH CHECK (true);

-- Analytics: lecture admin
CREATE POLICY "Admin peut voir analytics" ON public.form_analytics
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- FONCTIONS UTILITAIRES
-- =============================================

-- Fonction pour incrémenter les vues
CREATE OR REPLACE FUNCTION public.increment_form_views(form_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.forms SET views_count = views_count + 1 WHERE slug = form_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour incrémenter les soumissions
CREATE OR REPLACE FUNCTION public.increment_form_submissions(form_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.forms SET submissions_count = submissions_count + 1 WHERE slug = form_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour updated_at sur forms
CREATE TRIGGER forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();