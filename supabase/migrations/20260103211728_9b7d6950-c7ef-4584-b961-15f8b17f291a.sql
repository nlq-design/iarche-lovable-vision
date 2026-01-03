-- Corriger la vue SECURITY DEFINER en la recréant sans SECURITY DEFINER
-- (les vues par défaut utilisent les permissions de l'appelant)
DROP VIEW IF EXISTS public.ai_dashboard_metrics;

CREATE VIEW public.ai_dashboard_metrics 
WITH (security_invoker = true)
AS
SELECT
  (SELECT COUNT(*) FROM leads WHERE synthesis_stale = TRUE) as leads_stale,
  (SELECT COUNT(*) FROM projects WHERE synthesis_stale = TRUE) as projects_stale,
  (SELECT COUNT(*) FROM partners WHERE synthesis_stale = TRUE) as partners_stale,
  (SELECT COUNT(*) FROM activity_log WHERE pending_ai_review = TRUE) as pending_notifications,
  (SELECT COUNT(*) FROM ai_agent_memory WHERE created_at > now() - interval '24 hours') as memory_24h,
  (SELECT COUNT(*) FROM resource_embeddings) as total_embeddings,
  (SELECT COUNT(DISTINCT resource_type) FROM resource_embeddings) as indexed_types;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.ai_dashboard_metrics TO authenticated;