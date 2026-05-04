-- Idempotent RPC pour agréger quotas + usage du mois courant pour un workspace
CREATE OR REPLACE FUNCTION public.get_workspace_quotas(p_workspace_id uuid)
RETURNS TABLE (
  api_name text,
  current_count integer,
  limit_count integer,
  period_end timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_end timestamptz := (date_trunc('month', now()) + interval '1 month');
BEGIN
  IF NOT public.can_access_workspace(p_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied to workspace %', p_workspace_id USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    q.api_name,
    COALESCE((
      SELECT COUNT(*)::int
      FROM public.ai_usage_metrics m
      WHERE m.workspace_id = p_workspace_id
        AND m.created_at >= date_trunc('month', now())
        AND m.created_at < v_period_end
        AND (q.provider_name IS NULL OR m.model_provider = q.provider_name)
    ), 0) AS current_count,
    COALESCE(q.monthly_requests_limit, 0) AS limit_count,
    v_period_end AS period_end
  FROM public.api_quotas q
  WHERE q.workspace_id = p_workspace_id
    AND q.api_name IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_workspace_quotas(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workspace_quotas(uuid) TO authenticated;