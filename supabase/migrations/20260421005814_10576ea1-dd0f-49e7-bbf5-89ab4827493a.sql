-- QW#8b : drop policies legacy redondantes sur ai_usage_metrics
-- Conserve :
--   ai_usage_metrics_select_workspace (QW#8a, workspace-scoped + branche admin workspace_id IS NULL)
--   Only service_role can insert AI usage metrics (restriction INSERT réservée service_role)
-- Table append-only : pas de UPDATE/DELETE policies par design.

DROP POLICY IF EXISTS "Admins can view all AI usage metrics" ON public.ai_usage_metrics;
DROP POLICY IF EXISTS "Workspace members can view AI usage metrics" ON public.ai_usage_metrics;