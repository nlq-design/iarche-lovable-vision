-- =============================================================================
-- AMÉLIORATION IA v5.3 - Extension RAG + Auto-scoring + Notifications proactives
-- =============================================================================

-- 4. FONCTION DE RECALCUL AUTO-SYNTHÈSE (corrigée - sans UNION avec LIMIT)
CREATE OR REPLACE FUNCTION public.refresh_stale_syntheses(max_items INTEGER DEFAULT 5)
RETURNS TABLE(entity_type TEXT, entity_id UUID, entity_name TEXT, refreshed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Leads stale prioritaires
  RETURN QUERY
  SELECT 'lead'::TEXT, l.id, l.name, FALSE 
  FROM leads l WHERE l.synthesis_stale = TRUE 
  ORDER BY l.familiarity_score DESC NULLS LAST
  LIMIT max_items;
  
  -- Projets stale prioritaires
  RETURN QUERY
  SELECT 'project'::TEXT, p.id, p.name, FALSE 
  FROM projects p WHERE p.synthesis_stale = TRUE 
  ORDER BY p.budget_amount DESC NULLS LAST
  LIMIT max_items;
  
  -- Partenaires stale prioritaires
  RETURN QUERY
  SELECT 'partner'::TEXT, pa.id, pa.name, FALSE 
  FROM partners pa WHERE pa.synthesis_stale = TRUE 
  ORDER BY pa.created_at DESC
  LIMIT max_items;
  
  RETURN;
END;
$$;

-- 5. VUE POUR DASHBOARD IA TEMPS RÉEL
DROP VIEW IF EXISTS public.ai_dashboard_metrics;
CREATE VIEW public.ai_dashboard_metrics AS
SELECT
  (SELECT COUNT(*) FROM leads WHERE synthesis_stale = TRUE) as leads_stale,
  (SELECT COUNT(*) FROM projects WHERE synthesis_stale = TRUE) as projects_stale,
  (SELECT COUNT(*) FROM partners WHERE synthesis_stale = TRUE) as partners_stale,
  (SELECT COUNT(*) FROM activity_log WHERE pending_ai_review = TRUE) as pending_notifications,
  (SELECT COUNT(*) FROM ai_agent_memory WHERE created_at > now() - interval '24 hours') as memory_24h,
  (SELECT COUNT(*) FROM resource_embeddings) as total_embeddings,
  (SELECT COUNT(DISTINCT resource_type) FROM resource_embeddings) as indexed_types;

-- Grant access to the view
GRANT SELECT ON public.ai_dashboard_metrics TO authenticated;