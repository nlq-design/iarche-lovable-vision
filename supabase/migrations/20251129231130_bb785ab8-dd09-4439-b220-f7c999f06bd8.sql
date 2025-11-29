-- Création table cta_clicks pour tracking des clics sur CTAs
CREATE TABLE IF NOT EXISTS public.cta_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cta_name TEXT NOT NULL,
  source_page TEXT NOT NULL,
  source_context TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_session TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX idx_cta_clicks_cta_name ON public.cta_clicks(cta_name);
CREATE INDEX idx_cta_clicks_source_page ON public.cta_clicks(source_page);
CREATE INDEX idx_cta_clicks_clicked_at ON public.cta_clicks(clicked_at DESC);

-- RLS policies
ALTER TABLE public.cta_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert cta clicks"
ON public.cta_clicks
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Admins can view all cta clicks"
ON public.cta_clicks
FOR SELECT
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Ajout colonnes tracking à la table contacts
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS user_session TEXT;

-- Commentaires pour documentation
COMMENT ON TABLE public.cta_clicks IS 'Tracking de tous les clics sur CTAs (Call-To-Action) du site';
COMMENT ON COLUMN public.cta_clicks.cta_name IS 'Nom du CTA cliqué (ex: nous_contacter, voir_projet, en_savoir_plus)';
COMMENT ON COLUMN public.cta_clicks.source_page IS 'Page/section source du clic (ex: header, exemples_section, author_card)';
COMMENT ON COLUMN public.cta_clicks.source_context IS 'Contexte additionnel (ex: slug article, nom solution)';
COMMENT ON COLUMN public.contacts.source IS 'Source du contact (header, contact_page, solution_detail, author_card, footer)';
COMMENT ON COLUMN public.contacts.source_context IS 'Contexte source (nom solution, slug article, etc.)';
COMMENT ON COLUMN public.contacts.user_session IS 'ID de session utilisateur pour tracking parcours';