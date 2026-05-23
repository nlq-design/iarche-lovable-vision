-- 1. CONTACTS
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS workspace_id uuid;
UPDATE public.contacts SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
ALTER TABLE public.contacts ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX IF NOT EXISTS idx_contacts_workspace ON public.contacts(workspace_id);
DROP POLICY IF EXISTS "Admins can view contacts" ON public.contacts;
CREATE POLICY "Workspace members can view contacts" ON public.contacts FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_admin());

-- 2. FORMS (trigger bypass via session_replication_role)
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS workspace_id uuid;
SET LOCAL session_replication_role = 'replica';
UPDATE public.forms SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
SET LOCAL session_replication_role = 'origin';
ALTER TABLE public.forms ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX IF NOT EXISTS idx_forms_workspace ON public.forms(workspace_id);
DROP POLICY IF EXISTS "Admin lecture forms" ON public.forms;
DROP POLICY IF EXISTS "Admin insert forms" ON public.forms;
DROP POLICY IF EXISTS "Admin update forms" ON public.forms;
DROP POLICY IF EXISTS "Admin delete forms" ON public.forms;
CREATE POLICY "Workspace admins read forms" ON public.forms FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_admin());
CREATE POLICY "Workspace admins insert forms" ON public.forms FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_admin());
CREATE POLICY "Workspace admins update forms" ON public.forms FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_admin());
CREATE POLICY "Workspace admins delete forms" ON public.forms FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_admin());

-- 3. VIVIERS NOT NULL
UPDATE public.viviers SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
ALTER TABLE public.viviers ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

-- 4. BOOKING_TYPES
ALTER TABLE public.booking_types ADD COLUMN IF NOT EXISTS workspace_id uuid;
UPDATE public.booking_types SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
ALTER TABLE public.booking_types ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX IF NOT EXISTS idx_booking_types_workspace ON public.booking_types(workspace_id);
DROP POLICY IF EXISTS "Admins can manage booking types" ON public.booking_types;
CREATE POLICY "Workspace admins manage booking types" ON public.booking_types FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_admin())
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_admin());

-- 5. BOOKING_AVAILABILITY
ALTER TABLE public.booking_availability ADD COLUMN IF NOT EXISTS workspace_id uuid;
UPDATE public.booking_availability SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
ALTER TABLE public.booking_availability ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX IF NOT EXISTS idx_booking_availability_workspace ON public.booking_availability(workspace_id);
DROP POLICY IF EXISTS "Admins can manage availability" ON public.booking_availability;
CREATE POLICY "Workspace admins manage availability" ON public.booking_availability FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_admin())
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_admin());

-- 6. PARTNER_ANNOUNCEMENTS
ALTER TABLE public.partner_announcements ADD COLUMN IF NOT EXISTS workspace_id uuid;
UPDATE public.partner_announcements SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
ALTER TABLE public.partner_announcements ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX IF NOT EXISTS idx_partner_announcements_workspace ON public.partner_announcements(workspace_id);
DROP POLICY IF EXISTS "Admin manages announcements" ON public.partner_announcements;
DROP POLICY IF EXISTS "Partners read published announcements" ON public.partner_announcements;
CREATE POLICY "Workspace admins manage announcements" ON public.partner_announcements FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_admin())
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_admin());
CREATE POLICY "Partners read workspace announcements" ON public.partner_announcements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.partners p WHERE p.workspace_id = partner_announcements.workspace_id AND p.user_id = auth.uid()));

-- 7. EMAIL_LOGS
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS workspace_id uuid;
UPDATE public.email_logs SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
ALTER TABLE public.email_logs ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX IF NOT EXISTS idx_email_logs_workspace ON public.email_logs(workspace_id);
DROP POLICY IF EXISTS "Admins can view email logs" ON public.email_logs;
CREATE POLICY "Workspace admins view email logs" ON public.email_logs FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_admin());
