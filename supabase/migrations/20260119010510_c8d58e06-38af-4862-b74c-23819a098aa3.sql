-- Fix RLS policy for solution_partners to allow partners to see their own links
DROP POLICY IF EXISTS "solution_partners_select" ON public.solution_partners;

CREATE POLICY "solution_partners_select" ON public.solution_partners
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'cockpit_user'::app_role) OR 
    has_role(auth.uid(), 'cockpit_admin'::app_role) OR
    (is_partner_user() AND is_solution_partner(solution_id, auth.uid()))
  );