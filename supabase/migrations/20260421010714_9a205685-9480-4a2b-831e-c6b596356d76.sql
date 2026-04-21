-- QW#8b : drop policies legacy redondantes sur api_usage_metrics + create SELECT moderne
-- Conserve :
--   Only service_role can insert API usage metrics (restriction INSERT)
--   api_usage_metrics_insert_workspace (QW#8a, INSERT workspace-scoped authenticated)
-- + ajoute api_usage_metrics_select_workspace (SELECT workspace-scoped authenticated)
--   pour combler le trou SELECT laissé par le drop des 2 legacy.
-- Particularité : workspace_id NOT NULL → pas de branche IS NULL nécessaire.

DROP POLICY IF EXISTS "Admins can view all API usage metrics" ON public.api_usage_metrics;
DROP POLICY IF EXISTS "Users can view their workspace usage" ON public.api_usage_metrics;

CREATE POLICY "api_usage_metrics_select_workspace"
  ON public.api_usage_metrics
  FOR SELECT
  TO authenticated
  USING (public.can_access_entity_workspace(workspace_id, auth.uid()));