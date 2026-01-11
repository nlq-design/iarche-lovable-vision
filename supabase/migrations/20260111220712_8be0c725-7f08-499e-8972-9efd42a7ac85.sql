-- =============================================
-- VIVIERS CAMPAIGNS - Phase 8.1 Migration (ADAPT)
-- Ajouter les colonnes manquantes aux tables existantes
-- =============================================

-- 1. Ajouter les colonnes manquantes à vivier_campaigns
ALTER TABLE vivier_campaigns 
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS html_content TEXT,
  ADD COLUMN IF NOT EXISTS text_content TEXT,
  ADD COLUMN IF NOT EXISTS template_theme TEXT DEFAULT 'bleu-nuit',
  ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS test_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS test_recipients TEXT[],
  ADD COLUMN IF NOT EXISTS sender_name TEXT DEFAULT 'IArche',
  ADD COLUMN IF NOT EXISTS sender_email TEXT,
  ADD COLUMN IF NOT EXISTS reply_to TEXT,
  ADD COLUMN IF NOT EXISTS import_source TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Index pour slug
CREATE INDEX IF NOT EXISTS idx_vivier_campaigns_slug ON vivier_campaigns(slug);

-- 2. Ajouter les colonnes manquantes à vivier_campaign_recipients
ALTER TABLE vivier_campaign_recipients 
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS variables_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_urls JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS import_batch_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'list',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Index pour lead_id
CREATE INDEX IF NOT EXISTS idx_vcr_lead ON vivier_campaign_recipients(lead_id);

-- Contrainte unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vivier_campaign_recipients_campaign_id_email_key'
  ) THEN
    ALTER TABLE vivier_campaign_recipients 
    ADD CONSTRAINT vivier_campaign_recipients_campaign_id_email_key UNIQUE (campaign_id, email);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Table vivier_campaign_events (nouvelle)
CREATE TABLE IF NOT EXISTS public.vivier_campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES vivier_campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES vivier_campaign_recipients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vce_campaign ON vivier_campaign_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_vce_type ON vivier_campaign_events(event_type);
CREATE INDEX IF NOT EXISTS idx_vce_created ON vivier_campaign_events(created_at);

ALTER TABLE vivier_campaign_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view campaign events" ON vivier_campaign_events;
CREATE POLICY "Authenticated users can view campaign events"
  ON vivier_campaign_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert campaign events" ON vivier_campaign_events;
CREATE POLICY "Authenticated users can insert campaign events"
  ON vivier_campaign_events FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Fonction pour générer un slug unique
CREATE OR REPLACE FUNCTION generate_campaign_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := substr(gen_random_uuid()::text, 1, 8);
  END IF;
  
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM vivier_campaigns WHERE slug = final_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_campaign_slug ON vivier_campaigns;
CREATE TRIGGER trigger_generate_campaign_slug
  BEFORE INSERT OR UPDATE OF name ON vivier_campaigns
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE FUNCTION generate_campaign_slug();

-- 5. Fonction updated_at pour recipients
CREATE OR REPLACE FUNCTION update_vivier_campaign_recipients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vcr_updated_at ON vivier_campaign_recipients;
CREATE TRIGGER trigger_vcr_updated_at
  BEFORE UPDATE ON vivier_campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_vivier_campaign_recipients_updated_at();

-- 6. Générer les slugs pour les campagnes existantes
UPDATE vivier_campaigns 
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';