-- QW#8bis : drop policies legacy redondantes sur action_proposals
-- Conserve les 4 policies modernes workspace-scoped créées par QW#8a (migration 20260420194136) :
--   action_proposals_select_workspace, action_proposals_insert_workspace,
--   action_proposals_update_workspace, action_proposals_admin_all
-- + ajoute action_proposals_delete_workspace pour préserver le DELETE par créateur workspace-scoped.

DROP POLICY IF EXISTS "Users can view action proposals" ON public.action_proposals;
DROP POLICY IF EXISTS "Users can create action proposals" ON public.action_proposals;
DROP POLICY IF EXISTS "Users can update action proposals" ON public.action_proposals;
DROP POLICY IF EXISTS "Users can delete action proposals" ON public.action_proposals;

CREATE POLICY "action_proposals_delete_workspace"
  ON public.action_proposals
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_entity_workspace(workspace_id, auth.uid())
    AND auth.uid() = user_id
  );