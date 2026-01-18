
-- =====================================================
-- ESPACE PARTENAIRES - PHASE 1 : SCHEMA & RLS
-- =====================================================

-- 1. Ajouter 'partner' à l'enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';

-- 2. Ajouter user_id à partners (liaison compte Supabase Auth)
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partners_user_id ON public.partners(user_id);

-- 3. Table partner_invitations
CREATE TABLE IF NOT EXISTS public.partner_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_invitations_token ON public.partner_invitations(token);
CREATE INDEX idx_partner_invitations_partner ON public.partner_invitations(partner_id);

-- 4. Table partner_time_entries
CREATE TABLE IF NOT EXISTS public.partner_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected')),
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_time_entries_partner ON public.partner_time_entries(partner_id);
CREATE INDEX idx_partner_time_entries_date ON public.partner_time_entries(date);
CREATE INDEX idx_partner_time_entries_status ON public.partner_time_entries(status);

-- 5. Table partner_invoices
CREATE TABLE IF NOT EXISTS public.partner_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  invoice_number TEXT,
  amount NUMERIC(10,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_invoices_partner ON public.partner_invoices(partner_id);
CREATE INDEX idx_partner_invoices_status ON public.partner_invoices(status);

-- 6. Table partner_announcements
CREATE TABLE IF NOT EXISTS public.partner_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_announcements_published ON public.partner_announcements(published_at);

-- 7. Table partner_comments
CREATE TABLE IF NOT EXISTS public.partner_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'lead', 'document', 'transcription')),
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_comments_partner ON public.partner_comments(partner_id);
CREATE INDEX idx_partner_comments_entity ON public.partner_comments(entity_type, entity_id);

-- =====================================================
-- FONCTIONS HELPER
-- =====================================================

-- Fonction pour récupérer le partner_id du user courant
CREATE OR REPLACE FUNCTION public.get_current_partner_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.partners WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Fonction pour vérifier l'accès partenaire (rôle + MFA)
CREATE OR REPLACE FUNCTION public.has_partner_access(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_partner BOOLEAN;
  has_mfa_session BOOLEAN;
BEGIN
  -- Vérifier le rôle partner
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid AND role = 'partner'
  ) INTO is_partner;
  
  IF NOT is_partner THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier session MFA active
  SELECT EXISTS (
    SELECT 1 FROM public.cockpit_auth_sessions
    WHERE user_id = user_uuid AND expires_at > now()
  ) INTO has_mfa_session;
  
  RETURN has_mfa_session;
END;
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS sur toutes les nouvelles tables
ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_comments ENABLE ROW LEVEL SECURITY;

-- partner_invitations: Admin only
CREATE POLICY "Admins manage invitations" ON public.partner_invitations
  FOR ALL USING (public.is_admin());

-- partner_time_entries: Partner sees/manages own, Admin sees all
CREATE POLICY "Partner manages own time entries" ON public.partner_time_entries
  FOR ALL USING (
    partner_id = public.get_current_partner_id() 
    AND public.has_partner_access(auth.uid())
  );

CREATE POLICY "Admin manages all time entries" ON public.partner_time_entries
  FOR ALL USING (public.is_admin());

-- partner_invoices: Partner sees own, Admin manages all
CREATE POLICY "Partner sees own invoices" ON public.partner_invoices
  FOR SELECT USING (
    partner_id = public.get_current_partner_id() 
    AND public.has_partner_access(auth.uid())
  );

CREATE POLICY "Admin manages all invoices" ON public.partner_invoices
  FOR ALL USING (public.is_admin());

-- partner_announcements: Partners read published, Admin manages all
CREATE POLICY "Partners read published announcements" ON public.partner_announcements
  FOR SELECT USING (
    published_at IS NOT NULL 
    AND published_at <= now()
    AND public.has_partner_access(auth.uid())
  );

CREATE POLICY "Admin manages announcements" ON public.partner_announcements
  FOR ALL USING (public.is_admin());

-- partner_comments: Partner manages own, Admin sees all
CREATE POLICY "Partner manages own comments" ON public.partner_comments
  FOR ALL USING (
    partner_id = public.get_current_partner_id() 
    AND public.has_partner_access(auth.uid())
  );

CREATE POLICY "Admin sees all comments" ON public.partner_comments
  FOR SELECT USING (public.is_admin());

-- =====================================================
-- POLICIES POUR ACCÈS PARTENAIRE AUX DONNÉES EXISTANTES
-- =====================================================

-- Partners: partenaire voit son propre profil
CREATE POLICY "Partner sees own profile" ON public.partners
  FOR SELECT USING (
    user_id = auth.uid() 
    AND public.has_partner_access(auth.uid())
  );

-- Leads: partenaire voit ses leads liés
CREATE POLICY "Partner sees linked leads" ON public.leads
  FOR SELECT USING (
    id IN (
      SELECT lead_id FROM public.lead_partners 
      WHERE partner_id = public.get_current_partner_id()
    )
    AND public.has_partner_access(auth.uid())
  );

-- Projects: partenaire voit ses projets liés
CREATE POLICY "Partner sees linked projects" ON public.projects
  FOR SELECT USING (
    id IN (
      SELECT project_id FROM public.project_partners 
      WHERE partner_id = public.get_current_partner_id()
    )
    AND public.has_partner_access(auth.uid())
  );

-- Generated documents: partenaire voit docs liés
CREATE POLICY "Partner sees linked documents" ON public.generated_documents
  FOR SELECT USING (
    id IN (
      SELECT document_id FROM public.document_partners 
      WHERE partner_id = public.get_current_partner_id()
    )
    AND public.has_partner_access(auth.uid())
  );

-- Voice transcriptions: partenaire voit transcriptions via projets/leads liés
CREATE POLICY "Partner sees linked transcriptions" ON public.voice_transcriptions
  FOR SELECT USING (
    (
      lead_id IN (
        SELECT lead_id FROM public.lead_partners 
        WHERE partner_id = public.get_current_partner_id()
      )
      OR project_id IN (
        SELECT project_id FROM public.project_partners 
        WHERE partner_id = public.get_current_partner_id()
      )
    )
    AND public.has_partner_access(auth.uid())
  );

-- Bookings: partenaire voit ses RDV liés
CREATE POLICY "Partner sees linked bookings" ON public.bookings
  FOR SELECT USING (
    id IN (
      SELECT booking_id FROM public.booking_partners 
      WHERE partner_id = public.get_current_partner_id()
    )
    AND public.has_partner_access(auth.uid())
  );

-- Triggers updated_at
CREATE TRIGGER set_partner_time_entries_updated_at
  BEFORE UPDATE ON public.partner_time_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_partner_invoices_updated_at
  BEFORE UPDATE ON public.partner_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_partner_announcements_updated_at
  BEFORE UPDATE ON public.partner_announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_partner_comments_updated_at
  BEFORE UPDATE ON public.partner_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
