
-- Scoper RLS leads par workspace_id pour les cockpit_user/cockpit_admin
-- (super_admin / admin / partner gardent leurs policies existantes)

DROP POLICY IF EXISTS "Cockpit users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Cockpit users can update leads" ON public.leads;

CREATE POLICY "Cockpit users can view leads in their workspace"
ON public.leads
FOR SELECT
USING (
  (
    has_role(auth.uid(), 'cockpit_user'::app_role)
    OR has_role(auth.uid(), 'cockpit_admin'::app_role)
  )
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR is_workspace_member(workspace_id, auth.uid())
  )
);

CREATE POLICY "Cockpit users can update leads in their workspace"
ON public.leads
FOR UPDATE
USING (
  (
    has_role(auth.uid(), 'cockpit_user'::app_role)
    OR has_role(auth.uid(), 'cockpit_admin'::app_role)
  )
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR is_workspace_member(workspace_id, auth.uid())
  )
);
