
-- Migration V7.0 : Ajout colonnes ressources + table leads + bucket storage

-- 1. Ajouter colonnes à la table articles
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS event_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS event_location TEXT,
ADD COLUMN IF NOT EXISTS registration_open BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS replay_url TEXT,
ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 30;

-- 2. Créer table leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  consent_marketing BOOLEAN DEFAULT false,
  source TEXT NOT NULL, -- 'livre-blanc', 'atelier-webinaire'
  source_id UUID, -- ID de l'article d'origine
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Contrainte unique pour éviter doublons
  CONSTRAINT unique_lead_per_source UNIQUE (email, source, source_id)
);

-- 3. Enable RLS sur table leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies pour leads
CREATE POLICY "Admins can view all leads"
ON leads FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage leads"
ON leads FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert leads"
ON leads FOR INSERT
WITH CHECK (true);

-- 5. Créer bucket storage pour livres blancs
INSERT INTO storage.buckets (id, name, public)
VALUES ('livres-blancs', 'livres-blancs', true)
ON CONFLICT (id) DO NOTHING;

-- 6. RLS policies pour storage bucket livres-blancs
CREATE POLICY "Public can view livres blancs files"
ON storage.objects FOR SELECT
USING (bucket_id = 'livres-blancs');

CREATE POLICY "Admins can upload livres blancs files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'livres-blancs' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update livres blancs files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'livres-blancs' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete livres blancs files"
ON storage.objects FOR DELETE
USING (bucket_id = 'livres-blancs' AND has_role(auth.uid(), 'admin'::app_role));

-- 7. Créer table inscriptions ateliers (pour gérer compteur places)
CREATE TABLE IF NOT EXISTS atelier_inscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atelier_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_inscription UNIQUE (atelier_id, lead_id)
);

-- 8. Enable RLS sur table atelier_inscriptions
ALTER TABLE atelier_inscriptions ENABLE ROW LEVEL SECURITY;

-- 9. RLS policies pour atelier_inscriptions
CREATE POLICY "Admins can view all inscriptions"
ON atelier_inscriptions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert inscriptions"
ON atelier_inscriptions FOR INSERT
WITH CHECK (true);

-- 10. Index pour performances
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source, source_id);
CREATE INDEX IF NOT EXISTS idx_atelier_inscriptions_atelier ON atelier_inscriptions(atelier_id);

-- 11. Fonction pour compter inscriptions par atelier
CREATE OR REPLACE FUNCTION count_atelier_inscriptions(atelier_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO count_result
  FROM atelier_inscriptions
  WHERE atelier_id = atelier_uuid;
  
  RETURN count_result;
END;
$$;
