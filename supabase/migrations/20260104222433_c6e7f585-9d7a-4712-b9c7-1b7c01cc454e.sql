-- ============================================
-- CDC VIVIERS v2.2 - Phase 1: Tables principales
-- ============================================

-- TABLE 1: VIVIERS (leads froids)
CREATE TABLE public.viviers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifiants externes
  external_id TEXT,
  source TEXT NOT NULL,
  source_file TEXT,
  batch_id UUID,
  
  -- Données entreprise
  company_name TEXT,
  siret TEXT,
  siren TEXT,
  naf_code TEXT,
  legal_form TEXT,
  
  -- Contact principal
  contact_name TEXT,
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_position TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  linkedin_url TEXT,
  
  -- Adresse
  address TEXT,
  postal_code TEXT,
  city TEXT,
  region TEXT,
  country TEXT DEFAULT 'France',
  
  -- Données business
  industry TEXT,
  company_size TEXT,
  revenue_range TEXT,
  employee_count INTEGER,
  creation_date DATE,
  
  -- Scoring & qualification
  cold_score INTEGER DEFAULT 0,
  scoring_criteria JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  
  -- Statut
  status TEXT DEFAULT 'new',
  promoted_to_lead_id UUID,
  promoted_at TIMESTAMPTZ,
  
  -- RGPD
  consent_marketing BOOLEAN DEFAULT false,
  unsubscribed_at TIMESTAMPTZ,
  
  -- Métadonnées
  raw_data JSONB DEFAULT '{}',
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Workspace
  workspace_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- Index pour recherche performante sur 100k+ lignes
CREATE INDEX idx_viviers_email ON public.viviers(email);
CREATE INDEX idx_viviers_siret ON public.viviers(siret);
CREATE INDEX idx_viviers_company ON public.viviers(company_name);
CREATE INDEX idx_viviers_city ON public.viviers(city);
CREATE INDEX idx_viviers_status ON public.viviers(status);
CREATE INDEX idx_viviers_source ON public.viviers(source);
CREATE INDEX idx_viviers_score ON public.viviers(cold_score DESC);
CREATE INDEX idx_viviers_batch ON public.viviers(batch_id);
CREATE INDEX idx_viviers_consent ON public.viviers(consent_marketing);

-- TABLE 2: VIVIER_IMPORTS (lots d'import)
CREATE TABLE public.vivier_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  source TEXT NOT NULL,
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  duplicate_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  error_log JSONB DEFAULT '[]',
  column_mapping JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  workspace_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- TABLE 3: EMAIL_DOMAINS (domaines configurables multi-provider)
CREATE TABLE public.email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  
  -- Type
  domain_type VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  
  -- Identité
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to TEXT,
  
  -- Warm-up tracking (satellites only)
  warmup_started_at DATE,
  warmup_day INTEGER DEFAULT 0,
  warmup_daily_limit INTEGER DEFAULT 30,
  warmup_status VARCHAR(50) DEFAULT 'warming',
  
  -- DNS status
  spf_valid BOOLEAN DEFAULT FALSE,
  dkim_valid BOOLEAN DEFAULT FALSE,
  dmarc_valid BOOLEAN DEFAULT FALSE,
  last_dns_check TIMESTAMPTZ,
  
  -- Usage
  is_active BOOLEAN DEFAULT TRUE,
  daily_sent_count INTEGER DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  last_reset_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 4: VIVIER_CAMPAIGNS (campagnes cold Instantly)
CREATE TABLE public.vivier_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  
  -- Instantly sync
  instantly_campaign_id TEXT,
  instantly_status VARCHAR(50),
  instantly_account_id TEXT,
  
  -- Contenu
  subject VARCHAR(255),
  body_html TEXT,
  body_text TEXT,
  preview_text VARCHAR(150),
  
  -- Séquence multi-steps
  sequence_steps JSONB DEFAULT '[]',
  
  -- Ciblage
  segment_criteria JSONB,
  vivier_ids UUID[],
  total_recipients INTEGER DEFAULT 0,
  
  -- Config envoi
  domain_id UUID REFERENCES email_domains(id),
  send_schedule JSONB,
  daily_limit INTEGER DEFAULT 30,
  
  -- AI metadata
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_prompt_slug TEXT,
  ai_metadata JSONB,
  
  -- Stats (sync webhook)
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  open_rate NUMERIC(5,2) DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  reply_rate NUMERIC(5,2) DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  bounce_rate NUMERIC(5,2) DEFAULT 0,
  unsubscribe_count INTEGER DEFAULT 0,
  
  -- Timestamps
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  workspace_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- TABLE 5: VIVIER_CAMPAIGN_RECIPIENTS (logs envoi)
CREATE TABLE public.vivier_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES vivier_campaigns(id) ON DELETE CASCADE,
  vivier_id UUID REFERENCES viviers(id) ON DELETE SET NULL,
  
  -- Données envoi (snapshot)
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company_name VARCHAR(255),
  custom_variables JSONB,
  
  -- Instantly sync
  instantly_lead_id TEXT,
  
  -- Statut par step
  current_step INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'pending',
  
  -- Timestamps events
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_type VARCHAR(20),
  bounce_reason TEXT,
  unsubscribed_at TIMESTAMPTZ,
  
  -- Promotion vers leads
  promoted_to_lead_id UUID REFERENCES leads(id),
  promoted_at TIMESTAMPTZ,
  promotion_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index performance
CREATE INDEX idx_vcr_campaign ON vivier_campaign_recipients(campaign_id);
CREATE INDEX idx_vcr_vivier ON vivier_campaign_recipients(vivier_id);
CREATE INDEX idx_vcr_status ON vivier_campaign_recipients(status);
CREATE INDEX idx_vcr_email ON vivier_campaign_recipients(email);
CREATE INDEX idx_campaigns_status ON vivier_campaigns(status);
CREATE INDEX idx_domains_provider ON email_domains(provider);
CREATE INDEX idx_domains_type ON email_domains(domain_type);

-- Trigger updated_at
CREATE TRIGGER set_viviers_updated_at
  BEFORE UPDATE ON public.viviers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_email_domains_updated_at
  BEFORE UPDATE ON public.email_domains
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_vivier_campaigns_updated_at
  BEFORE UPDATE ON public.vivier_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.viviers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vivier_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vivier_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vivier_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Viviers: cockpit access only
CREATE POLICY "Cockpit users can manage viviers"
  ON public.viviers FOR ALL
  TO authenticated
  USING (public.has_cockpit_access(auth.uid()))
  WITH CHECK (public.has_cockpit_access(auth.uid()));

CREATE POLICY "Cockpit users can manage vivier_imports"
  ON public.vivier_imports FOR ALL
  TO authenticated
  USING (public.has_cockpit_access(auth.uid()))
  WITH CHECK (public.has_cockpit_access(auth.uid()));

CREATE POLICY "Cockpit users can manage email_domains"
  ON public.email_domains FOR ALL
  TO authenticated
  USING (public.has_cockpit_access(auth.uid()))
  WITH CHECK (public.has_cockpit_access(auth.uid()));

CREATE POLICY "Cockpit users can manage vivier_campaigns"
  ON public.vivier_campaigns FOR ALL
  TO authenticated
  USING (public.has_cockpit_access(auth.uid()))
  WITH CHECK (public.has_cockpit_access(auth.uid()));

CREATE POLICY "Cockpit users can manage vivier_campaign_recipients"
  ON public.vivier_campaign_recipients FOR ALL
  TO authenticated
  USING (public.has_cockpit_access(auth.uid()))
  WITH CHECK (public.has_cockpit_access(auth.uid()));