-- =============================================================================
-- QW#8 — RLS Hardening: action_proposals, ai_usage_metrics, api_usage_metrics,
--                       workspace_ai_usage
-- Forward migration
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (1) action_proposals — remove tautological policies, enforce workspace access
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all to view action_proposals" ON public.action_proposals;
DROP POLICY IF EXISTS "Allow all to insert action_proposals" ON public.action_proposals;
DROP POLICY IF EXISTS "Allow all to update action_proposals" ON public.action_proposals;
DROP POLICY IF EXISTS "Public can view action_proposals" ON public.action_proposals;
DROP POLICY IF EXISTS "Public can insert action_proposals" ON public.action_proposals;
DROP POLICY IF EXISTS "Public can update action_proposals" ON public.action_proposals;
DROP POLICY IF EXISTS "action_proposals_select_all" ON public.action_proposals;
DROP POLICY IF EXISTS "action_proposals_insert_all" ON public.action_proposals;
DROP POLICY IF EXISTS "action_proposals_update_all" ON public.action_proposals;

ALTER TABLE public.action_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "action_proposals_select_workspace"
  ON public.action_proposals
  FOR SELECT
  TO authenticated
  USING (public.can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "action_proposals_insert_workspace"
  ON public.action_proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "action_proposals_update_workspace"
  ON public.action_proposals
  FOR UPDATE
  TO authenticated
  USING (public.can_access_entity_workspace(workspace_id, auth.uid()))
  WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));

-- Service role retains full access via existing bypass; admin via has_role
CREATE POLICY "action_proposals_admin_all"
  ON public.action_proposals
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- -----------------------------------------------------------------------------
-- (2) ai_usage_metrics — restrict SELECT to workspace members (was qual=true)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all to view ai_usage_metrics" ON public.ai_usage_metrics;
DROP POLICY IF EXISTS "Public can view ai_usage_metrics" ON public.ai_usage_metrics;
DROP POLICY IF EXISTS "ai_usage_metrics_select_all" ON public.ai_usage_metrics;
DROP POLICY IF EXISTS "Anyone can view ai_usage_metrics" ON public.ai_usage_metrics;

CREATE POLICY "ai_usage_metrics_select_workspace"
  ON public.ai_usage_metrics
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IS NULL  -- global metrics readable by admins only (covered below)
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (workspace_id IS NOT NULL AND public.can_access_entity_workspace(workspace_id, auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- (3) api_usage_metrics — remove duplicate public INSERT, enforce workspace
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all to insert api_usage_metrics" ON public.api_usage_metrics;
DROP POLICY IF EXISTS "Public can insert api_usage_metrics" ON public.api_usage_metrics;
DROP POLICY IF EXISTS "api_usage_metrics_insert_all" ON public.api_usage_metrics;
DROP POLICY IF EXISTS "Anyone can insert api_usage_metrics" ON public.api_usage_metrics;
DROP POLICY IF EXISTS "api_usage_metrics_insert_public" ON public.api_usage_metrics;

CREATE POLICY "api_usage_metrics_insert_workspace"
  ON public.api_usage_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- (4) workspace_ai_usage — add INSERT/UPDATE policies (workspace-scoped)
-- -----------------------------------------------------------------------------
ALTER TABLE public.workspace_ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_ai_usage_insert_workspace" ON public.workspace_ai_usage;
DROP POLICY IF EXISTS "workspace_ai_usage_update_workspace" ON public.workspace_ai_usage;

CREATE POLICY "workspace_ai_usage_insert_workspace"
  ON public.workspace_ai_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "workspace_ai_usage_update_workspace"
  ON public.workspace_ai_usage
  FOR UPDATE
  TO authenticated
  USING (public.can_access_entity_workspace(workspace_id, auth.uid()))
  WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));

-- =============================================================================
-- Rollback (run manually if needed):
-- =============================================================================
-- DROP POLICY IF EXISTS "action_proposals_select_workspace" ON public.action_proposals;
-- DROP POLICY IF EXISTS "action_proposals_insert_workspace" ON public.action_proposals;
-- DROP POLICY IF EXISTS "action_proposals_update_workspace" ON public.action_proposals;
-- DROP POLICY IF EXISTS "action_proposals_admin_all" ON public.action_proposals;
-- DROP POLICY IF EXISTS "ai_usage_metrics_select_workspace" ON public.ai_usage_metrics;
-- DROP POLICY IF EXISTS "api_usage_metrics_insert_workspace" ON public.api_usage_metrics;
-- DROP POLICY IF EXISTS "workspace_ai_usage_insert_workspace" ON public.workspace_ai_usage;
-- DROP POLICY IF EXISTS "workspace_ai_usage_update_workspace" ON public.workspace_ai_usage;
-- (Restaurer ensuite les anciennes policies permissives si vraiment requis.)
