
-- =====================================================
-- FIX: Supprimer les policies causant la récursion
-- =====================================================

-- Supprimer les policies partenaire sur les tables existantes
DROP POLICY IF EXISTS "Partner sees own profile" ON public.partners;
DROP POLICY IF EXISTS "Partner sees linked leads" ON public.leads;
DROP POLICY IF EXISTS "Partner sees linked projects" ON public.projects;
DROP POLICY IF EXISTS "Partner sees linked documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Partner sees linked transcriptions" ON public.voice_transcriptions;
DROP POLICY IF EXISTS "Partner sees linked bookings" ON public.bookings;

-- Recréer get_current_partner_id avec SECURITY INVOKER pour éviter récursion
CREATE OR REPLACE FUNCTION public.get_current_partner_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT id FROM public.partners WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Recréer les policies partenaire SANS appeler has_partner_access dans les subqueries
-- On utilise directement auth.uid() et vérifie le rôle via une fonction simple

-- Fonction helper légère sans récursion
CREATE OR REPLACE FUNCTION public.is_partner_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'partner'
  );
$$;

-- Partners: partenaire voit son propre profil (direct sans subquery récursive)
CREATE POLICY "Partner sees own profile" ON public.partners
  FOR SELECT USING (
    user_id = auth.uid() 
    AND public.is_partner_user()
  );

-- Leads: partenaire voit ses leads liés (via join direct)
CREATE POLICY "Partner sees linked leads" ON public.leads
  FOR SELECT USING (
    public.is_partner_user()
    AND EXISTS (
      SELECT 1 FROM public.lead_partners lp
      JOIN public.partners p ON p.id = lp.partner_id
      WHERE lp.lead_id = leads.id
      AND p.user_id = auth.uid()
    )
  );

-- Projects: partenaire voit ses projets liés
CREATE POLICY "Partner sees linked projects" ON public.projects
  FOR SELECT USING (
    public.is_partner_user()
    AND EXISTS (
      SELECT 1 FROM public.project_partners pp
      JOIN public.partners p ON p.id = pp.partner_id
      WHERE pp.project_id = projects.id
      AND p.user_id = auth.uid()
    )
  );

-- Generated documents: partenaire voit docs liés
CREATE POLICY "Partner sees linked documents" ON public.generated_documents
  FOR SELECT USING (
    public.is_partner_user()
    AND EXISTS (
      SELECT 1 FROM public.document_partners dp
      JOIN public.partners p ON p.id = dp.partner_id
      WHERE dp.document_id = generated_documents.id
      AND p.user_id = auth.uid()
    )
  );

-- Voice transcriptions: partenaire voit transcriptions via projets/leads liés
CREATE POLICY "Partner sees linked transcriptions" ON public.voice_transcriptions
  FOR SELECT USING (
    public.is_partner_user()
    AND (
      EXISTS (
        SELECT 1 FROM public.lead_partners lp
        JOIN public.partners p ON p.id = lp.partner_id
        WHERE lp.lead_id = voice_transcriptions.lead_id
        AND p.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.project_partners pp
        JOIN public.partners p ON p.id = pp.partner_id
        WHERE pp.project_id = voice_transcriptions.project_id
        AND p.user_id = auth.uid()
      )
    )
  );

-- Bookings: partenaire voit ses RDV liés
CREATE POLICY "Partner sees linked bookings" ON public.bookings
  FOR SELECT USING (
    public.is_partner_user()
    AND EXISTS (
      SELECT 1 FROM public.booking_partners bp
      JOIN public.partners p ON p.id = bp.partner_id
      WHERE bp.booking_id = bookings.id
      AND p.user_id = auth.uid()
    )
  );

-- Mettre à jour les policies des nouvelles tables pour utiliser is_partner_user()
DROP POLICY IF EXISTS "Partner manages own time entries" ON public.partner_time_entries;
DROP POLICY IF EXISTS "Partner sees own invoices" ON public.partner_invoices;
DROP POLICY IF EXISTS "Partners read published announcements" ON public.partner_announcements;
DROP POLICY IF EXISTS "Partner manages own comments" ON public.partner_comments;

CREATE POLICY "Partner manages own time entries" ON public.partner_time_entries
  FOR ALL USING (
    public.is_partner_user()
    AND EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = partner_time_entries.partner_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Partner sees own invoices" ON public.partner_invoices
  FOR SELECT USING (
    public.is_partner_user()
    AND EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = partner_invoices.partner_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Partners read published announcements" ON public.partner_announcements
  FOR SELECT USING (
    published_at IS NOT NULL 
    AND published_at <= now()
    AND public.is_partner_user()
  );

CREATE POLICY "Partner manages own comments" ON public.partner_comments
  FOR ALL USING (
    public.is_partner_user()
    AND EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = partner_comments.partner_id
      AND p.user_id = auth.uid()
    )
  );
