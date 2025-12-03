-- Table de configuration des emails par source/formulaire
CREATE TABLE public.email_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL, -- 'contact', 'newsletter', 'livre-blanc', 'atelier-webinaire', 'form', 'solution-contact'
  source_id UUID, -- Pour les formulaires dynamiques (forms.id)
  
  -- Configuration email utilisateur
  send_user_confirmation BOOLEAN NOT NULL DEFAULT false,
  user_email_subject TEXT,
  user_email_template TEXT,
  
  -- Configuration email admin
  send_admin_notification BOOLEAN NOT NULL DEFAULT true,
  admin_email_subject TEXT,
  admin_emails TEXT[] DEFAULT ARRAY['nlq@nlq.fr'],
  
  -- Métadonnées
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table d'historique des envois
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id UUID,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'user_confirmation', 'admin_notification'
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_email_configurations_source ON public.email_configurations(source_type, source_id);
CREATE INDEX idx_email_logs_source ON public.email_logs(source_type, source_id);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_created ON public.email_logs(created_at DESC);

-- RLS
ALTER TABLE public.email_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Policies admin only
CREATE POLICY "Admins can manage email configurations"
ON public.email_configurations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view email logs"
ON public.email_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert email logs"
ON public.email_logs FOR INSERT
WITH CHECK (true);

-- Trigger update
CREATE TRIGGER update_email_configurations_updated_at
BEFORE UPDATE ON public.email_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Données par défaut pour chaque source
INSERT INTO public.email_configurations (source_type, send_user_confirmation, user_email_subject, send_admin_notification, admin_email_subject) VALUES
('contact', false, 'Merci pour votre message - IArche', true, 'Nouveau message de contact'),
('newsletter', false, 'Bienvenue dans la newsletter IArche', true, 'Nouvel abonné newsletter'),
('livre-blanc', false, 'Votre livre blanc IArche', true, 'Nouveau téléchargement livre blanc'),
('atelier-webinaire', true, 'Confirmation d''inscription - IArche', true, 'Nouvelle inscription atelier'),
('solution-contact', false, 'Merci pour votre demande - IArche', true, 'Nouvelle demande solution');