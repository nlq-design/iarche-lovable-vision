-- QW#8b étape 3/3 : drop legacy SELECT + create moderne workspace-scoped sur workspace_ai_usage
-- Conserve :
--   workspace_ai_usage_insert_workspace (QW#8a, INSERT workspace-scoped)
--   workspace_ai_usage_update_workspace (QW#8a, UPDATE workspace-scoped)
-- + ajoute workspace_ai_usage_select_workspace (comble le trou SELECT pour AdminAPIQuotasManager)
-- Particularité : workspace_id NOT NULL → pas de branche IS NULL.

DROP POLICY IF EXISTS "Members can view usage" ON public.workspace_ai_usage;

CREATE POLICY "workspace_ai_usage_select_workspace"
  ON public.workspace_ai_usage
  FOR SELECT
  TO authenticated
  USING (public.can_access_entity_workspace(workspace_id, auth.uid()));