-- QW#8a - Fix 3 RLS failles (bypass is_admin)
-- Forward migration
-- Mapping super_admin NLQ = is_admin() (rôle 'admin' enum, Nick = unique admin)

-- =============================================================
-- FAILLE 1 : ai_usage_metrics
-- =============================================================
-- Anciennes policies (rollback ref) :
--   SELECT "Authenticated users can view metrics" qual=true (FAILLE)
--   INSERT "Authenticated users can insert AI metrics" with_check=true (FAILLE)
--   SELECT "Admins can view all AI usage metrics" qual=has_role(auth.uid(),'admin') [GARDÉE]
--   INSERT "Only service_role can insert AI usage metrics" [GARDÉE]

DROP POLICY IF EXISTS "Authenticated users can view metrics" ON public.ai_usage_metrics;
DROP POLICY IF EXISTS "Authenticated users can insert AI metrics" ON public.ai_usage_metrics;

CREATE POLICY "Workspace members can view AI usage metrics"
ON public.ai_usage_metrics
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR auth.uid() IN (
    SELECT user_id FROM public.workspace_members
    WHERE workspace_id = ai_usage_metrics.workspace_id
  )
);

-- =============================================================
-- FAILLE 2 : api_usage_metrics
-- =============================================================
-- Anciennes policies (rollback ref) :
--   SELECT "Admins can view all usage metrics" qual=EXISTS(...user_roles...) (DOUBLON, DROP)
--   SELECT "Admins can view all API usage metrics" qual=has_role(...) [GARDÉE, durcie avec is_admin()]
--   SELECT "Users can view their workspace usage" qual=workspace_members [GARDÉE, durcie]
--   INSERT "System can insert usage metrics" with_check=true (FAILLE, DROP)
--   INSERT "Only service_role can insert API usage metrics" [GARDÉE]

DROP POLICY IF EXISTS "Admins can view all usage metrics" ON public.api_usage_metrics;
DROP POLICY IF EXISTS "System can insert usage metrics" ON public.api_usage_metrics;
DROP POLICY IF EXISTS "Admins can view all API usage metrics" ON public.api_usage_metrics;
DROP POLICY IF EXISTS "Users can view their workspace usage" ON public.api_usage_metrics;

CREATE POLICY "Admins can view all API usage metrics"
ON public.api_usage_metrics
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Users can view their workspace usage"
ON public.api_usage_metrics
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

-- =============================================================
-- FAILLE 3 : action_proposals
-- =============================================================
-- Anciennes policies (rollback ref) :
--   SELECT "Users can view their workspace action proposals" qual=(uid=user_id OR workspace_id IN (SELECT id FROM workspaces WHERE id=action_proposals.workspace_id)) (TAUTOLOGIQUE)
--   INSERT "Users can create action proposals in their workspace" with_check=(workspace_id IN (SELECT id FROM workspaces WHERE id=action_proposals.workspace_id)) (TAUTOLOGIQUE)
--   UPDATE "Users can update action proposals in their workspace" qual=(workspace_id IN (SELECT id FROM workspaces WHERE id=action_proposals.workspace_id)) (TAUTOLOGIQUE)

DROP POLICY IF EXISTS "Users can view their workspace action proposals" ON public.action_proposals;
DROP POLICY IF EXISTS "Users can create action proposals in their workspace" ON public.action_proposals;
DROP POLICY IF EXISTS "Users can update action proposals in their workspace" ON public.action_proposals;

CREATE POLICY "Users can view action proposals"
ON public.action_proposals
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR auth.uid() = user_id
  OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create action proposals"
ON public.action_proposals
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_admin()
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update action proposals"
ON public.action_proposals
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR auth.uid() = user_id
  OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete action proposals"
ON public.action_proposals
FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR auth.uid() = user_id
);

-- =============================================================
-- ROLLBACK (à exécuter manuellement si besoin) :
-- =============================================================
-- ai_usage_metrics
--   DROP POLICY "Workspace members can view AI usage metrics" ON public.ai_usage_metrics;
--   CREATE POLICY "Authenticated users can view metrics" ON public.ai_usage_metrics FOR SELECT TO authenticated USING (true);
--   CREATE POLICY "Authenticated users can insert AI metrics" ON public.ai_usage_metrics FOR INSERT TO authenticated WITH CHECK (true);
-- api_usage_metrics
--   DROP POLICY "Admins can view all API usage metrics" ON public.api_usage_metrics;
--   DROP POLICY "Users can view their workspace usage" ON public.api_usage_metrics;
--   CREATE POLICY "Admins can view all usage metrics" ON public.api_usage_metrics FOR SELECT TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role));
--   CREATE POLICY "Admins can view all API usage metrics" ON public.api_usage_metrics FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
--   CREATE POLICY "Users can view their workspace usage" ON public.api_usage_metrics FOR SELECT TO public USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE workspace_members.user_id = auth.uid()));
--   CREATE POLICY "System can insert usage metrics" ON public.api_usage_metrics FOR INSERT TO public WITH CHECK (true);
-- action_proposals
--   DROP POLICY "Users can view action proposals" ON public.action_proposals;
--   DROP POLICY "Users can create action proposals" ON public.action_proposals;
--   DROP POLICY "Users can update action proposals" ON public.action_proposals;
--   DROP POLICY "Users can delete action proposals" ON public.action_proposals;
--   CREATE POLICY "Users can view their workspace action proposals" ON public.action_proposals FOR SELECT TO public USING ((auth.uid() = user_id) OR (workspace_id IN (SELECT workspaces.id FROM workspaces WHERE workspaces.id = action_proposals.workspace_id)));
--   CREATE POLICY "Users can create action proposals in their workspace" ON public.action_proposals FOR INSERT TO public WITH CHECK (workspace_id IN (SELECT workspaces.id FROM workspaces WHERE workspaces.id = action_proposals.workspace_id));
--   CREATE POLICY "Users can update action proposals in their workspace" ON public.action_proposals FOR UPDATE TO public USING (workspace_id IN (SELECT workspaces.id FROM workspaces WHERE workspaces.id = action_proposals.workspace_id));