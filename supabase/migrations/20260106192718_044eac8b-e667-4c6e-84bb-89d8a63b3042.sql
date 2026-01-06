-- ============================================================================
-- BILLING ENTITIES & QUOTE CONFIGURATION MODULE
-- ============================================================================

-- 1. Table des sociétés émettrices (factruratrices)
CREATE TABLE public.billing_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,                          -- "SAVOIRIA 64", "IArche"
  legal_form TEXT,                             -- "SAS", "SARL", "EURL"
  capital_amount NUMERIC(12,2),                -- 500.00
  siren TEXT,                                  -- "935 282 855"
  tva_number TEXT,                             -- "FR96935282855"
  rcs_city TEXT,                               -- "PAU"
  
  -- Coordonnées
  address TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'France',
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e40af',        -- Couleur principale pour les docs
  
  -- Numérotation des devis
  quote_prefix TEXT DEFAULT '',                -- Ex: "64" pour SAVOIRIA 64
  quote_format TEXT DEFAULT '{prefix}{year}{month}{sequence}', -- Format configurable
  quote_sequence_start INTEGER DEFAULT 1,      -- Numéro de départ
  current_quote_sequence INTEGER DEFAULT 0,    -- Séquence actuelle
  
  -- Conditions par défaut
  default_validity_days INTEGER DEFAULT 30,
  default_payment_terms JSONB DEFAULT '{"deposits": [{"percent": 50, "trigger": "commande"}, {"percent": 50, "trigger": "livraison"}], "method": "virement"}',
  default_tva_rate NUMERIC(5,2) DEFAULT 20.00,
  
  -- CGV
  cgv_template_id UUID,                        -- Référence au template CGV
  
  -- Métadonnées
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  workspace_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Table des templates CGV
CREATE TABLE public.cgv_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,                          -- "CGV Développement Sur-Mesure"
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Contenu
  content_html TEXT NOT NULL,                  -- Contenu HTML des CGV
  version TEXT DEFAULT '1.0',
  
  -- Métadonnées
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  workspace_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 3. FK pour CGV dans billing_entities
ALTER TABLE public.billing_entities 
ADD CONSTRAINT billing_entities_cgv_template_fkey 
FOREIGN KEY (cgv_template_id) REFERENCES public.cgv_templates(id) ON DELETE SET NULL;

-- 4. Table de suivi des numéros de devis (pour éviter les doublons)
CREATE TABLE public.quote_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  billing_entity_id UUID NOT NULL REFERENCES public.billing_entities(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER,
  sequence INTEGER NOT NULL,
  document_id UUID REFERENCES public.generated_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(billing_entity_id, quote_number)
);

-- 5. Ajouter colonnes à generated_documents pour le lien billing
ALTER TABLE public.generated_documents 
ADD COLUMN IF NOT EXISTS billing_entity_id UUID REFERENCES public.billing_entities(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS quote_number TEXT,
ADD COLUMN IF NOT EXISTS quote_metadata JSONB DEFAULT '{}';

-- 6. Enable RLS
ALTER TABLE public.billing_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cgv_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_numbers ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies - Billing Entities
CREATE POLICY "billing_entities_select_cockpit" ON public.billing_entities
FOR SELECT USING (public.has_cockpit_access(auth.uid()));

CREATE POLICY "billing_entities_insert_cockpit" ON public.billing_entities
FOR INSERT WITH CHECK (public.has_cockpit_access(auth.uid()));

CREATE POLICY "billing_entities_update_cockpit" ON public.billing_entities
FOR UPDATE USING (public.has_cockpit_access(auth.uid()));

CREATE POLICY "billing_entities_delete_admin" ON public.billing_entities
FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 8. RLS Policies - CGV Templates
CREATE POLICY "cgv_templates_select_cockpit" ON public.cgv_templates
FOR SELECT USING (public.has_cockpit_access(auth.uid()));

CREATE POLICY "cgv_templates_insert_cockpit" ON public.cgv_templates
FOR INSERT WITH CHECK (public.has_cockpit_access(auth.uid()));

CREATE POLICY "cgv_templates_update_cockpit" ON public.cgv_templates
FOR UPDATE USING (public.has_cockpit_access(auth.uid()));

CREATE POLICY "cgv_templates_delete_admin" ON public.cgv_templates
FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 9. RLS Policies - Quote Numbers
CREATE POLICY "quote_numbers_select_cockpit" ON public.quote_numbers
FOR SELECT USING (public.has_cockpit_access(auth.uid()));

CREATE POLICY "quote_numbers_insert_cockpit" ON public.quote_numbers
FOR INSERT WITH CHECK (public.has_cockpit_access(auth.uid()));

-- 10. Function pour générer le prochain numéro de devis
CREATE OR REPLACE FUNCTION public.generate_next_quote_number(p_billing_entity_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entity RECORD;
  v_year TEXT;
  v_month TEXT;
  v_sequence INTEGER;
  v_quote_number TEXT;
BEGIN
  -- Récupérer l'entité de facturation
  SELECT * INTO v_entity FROM billing_entities WHERE id = p_billing_entity_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Billing entity not found';
  END IF;
  
  -- Incrémenter la séquence
  v_sequence := COALESCE(v_entity.current_quote_sequence, 0) + 1;
  
  -- Mettre à jour la séquence
  UPDATE billing_entities 
  SET current_quote_sequence = v_sequence,
      updated_at = now()
  WHERE id = p_billing_entity_id;
  
  -- Construire le numéro selon le format
  v_year := to_char(now(), 'YYYY');
  v_month := to_char(now(), 'MM');
  
  v_quote_number := v_entity.quote_format;
  v_quote_number := replace(v_quote_number, '{prefix}', COALESCE(v_entity.quote_prefix, ''));
  v_quote_number := replace(v_quote_number, '{year}', v_year);
  v_quote_number := replace(v_quote_number, '{month}', v_month);
  v_quote_number := replace(v_quote_number, '{sequence}', lpad(v_sequence::text, 4, '0'));
  v_quote_number := replace(v_quote_number, '{seq}', v_sequence::text);
  
  -- Enregistrer le numéro
  INSERT INTO quote_numbers (billing_entity_id, quote_number, year, month, sequence)
  VALUES (p_billing_entity_id, v_quote_number, EXTRACT(YEAR FROM now())::integer, EXTRACT(MONTH FROM now())::integer, v_sequence);
  
  RETURN v_quote_number;
END;
$$;

-- 11. Triggers pour updated_at
CREATE TRIGGER set_billing_entities_updated_at
BEFORE UPDATE ON public.billing_entities
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_cgv_templates_updated_at
BEFORE UPDATE ON public.cgv_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 12. Index pour performance
CREATE INDEX idx_billing_entities_active ON public.billing_entities(is_active) WHERE is_active = true;
CREATE INDEX idx_billing_entities_default ON public.billing_entities(is_default) WHERE is_default = true;
CREATE INDEX idx_cgv_templates_active ON public.cgv_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_quote_numbers_entity ON public.quote_numbers(billing_entity_id, year);
CREATE INDEX idx_generated_documents_billing ON public.generated_documents(billing_entity_id) WHERE billing_entity_id IS NOT NULL;