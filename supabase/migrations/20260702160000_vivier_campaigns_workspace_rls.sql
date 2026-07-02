-- Isolation multi-tenant : vivier_campaigns
-- AVANT : policy unique `has_cockpit_access(auth.uid())` (ALL, authenticated) → tout
-- utilisateur avec accès cockpit lisait/écrivait TOUTES les campagnes, tous workspaces
-- (fuite frontend dès le 2e tenant). APRÈS : scopé par workspace comme les autres
-- tables tenant (admins HQ IArche transverse + membres du workspace uniquement).
drop policy if exists "Cockpit users can manage vivier_campaigns" on public.vivier_campaigns;
create policy "Workspace members manage vivier_campaigns" on public.vivier_campaigns
  for all to authenticated
  using (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'cockpit_admin'::app_role)
    OR is_workspace_member(workspace_id, auth.uid())
  )
  with check (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'cockpit_admin'::app_role)
    OR is_workspace_member(workspace_id, auth.uid())
  );
