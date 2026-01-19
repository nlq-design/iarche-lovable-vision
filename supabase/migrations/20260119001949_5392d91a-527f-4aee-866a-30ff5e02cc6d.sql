-- Fix RLS policy for lead_partners to allow partners to see their links
DROP POLICY IF EXISTS "lead_partners_select" ON public.lead_partners;

CREATE POLICY "lead_partners_select" ON public.lead_partners
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'cockpit_user'::app_role) OR
  has_role(auth.uid(), 'cockpit_admin'::app_role) OR
  (is_partner_user() AND is_lead_partner(lead_id, auth.uid()))
);