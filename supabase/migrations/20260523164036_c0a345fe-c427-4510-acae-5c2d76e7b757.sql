-- RPC: KPIs globaux Cockpit SaaS
CREATE OR REPLACE FUNCTION public.get_cockpit_saas_kpis()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_mrr numeric := 0;
  v_active int := 0;
  v_trialing int := 0;
  v_canceled_30d int := 0;
  v_trial_to_active_rate numeric := 0;
  v_trials_30d int := 0;
  v_converted_30d int := 0;
BEGIN
  SELECT has_role(auth.uid(), 'super_admin') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- MRR + actifs
  SELECT 
    COALESCE(SUM(p.price_monthly_eur), 0),
    COUNT(*)
  INTO v_mrr, v_active
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.status = 'active';

  SELECT COUNT(*) INTO v_trialing
  FROM subscriptions WHERE status = 'trialing';

  SELECT COUNT(*) INTO v_canceled_30d
  FROM subscriptions
  WHERE canceled_at IS NOT NULL AND canceled_at > now() - interval '30 days';

  SELECT COUNT(*) INTO v_trials_30d
  FROM subscriptions
  WHERE created_at > now() - interval '30 days' AND trial_end IS NOT NULL;

  SELECT COUNT(*) INTO v_converted_30d
  FROM subscriptions
  WHERE created_at > now() - interval '30 days' 
    AND trial_end IS NOT NULL
    AND status = 'active';

  IF v_trials_30d > 0 THEN
    v_trial_to_active_rate := ROUND((v_converted_30d::numeric / v_trials_30d::numeric) * 100, 1);
  END IF;

  RETURN jsonb_build_object(
    'mrr_eur', v_mrr,
    'arr_eur', v_mrr * 12,
    'active_count', v_active,
    'trialing_count', v_trialing,
    'churned_30d', v_canceled_30d,
    'trial_conversion_rate', v_trial_to_active_rate
  );
END;
$$;

-- RPC: Liste enrichie des abonnements Cockpit SaaS
CREATE OR REPLACE FUNCTION public.get_cockpit_saas_subscriptions()
RETURNS TABLE (
  subscription_id uuid,
  workspace_id uuid,
  workspace_name text,
  plan_slug text,
  plan_name text,
  plan_price_monthly numeric,
  status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  canceled_at timestamptz,
  cancel_at_period_end boolean,
  created_at timestamptz,
  owner_email text,
  members_count int,
  last_activity_at timestamptz,
  ai_tokens_30d bigint,
  leads_created_30d int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT has_role(auth.uid(), 'super_admin') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.workspace_id,
    w.name,
    p.slug,
    p.name,
    p.price_monthly_eur,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.trial_end,
    s.canceled_at,
    s.cancel_at_period_end,
    s.created_at,
    (SELECT u.email::text FROM auth.users u WHERE u.id = s.user_id),
    (SELECT COUNT(*)::int FROM workspace_members wm WHERE wm.workspace_id = s.workspace_id),
    (SELECT MAX(al.created_at) FROM activity_log al WHERE al.workspace_id = s.workspace_id),
    COALESCE((
      SELECT SUM(wau.total_tokens)::bigint 
      FROM workspace_ai_usage wau 
      WHERE wau.workspace_id = s.workspace_id 
        AND wau.period_start > (now() - interval '30 days')::date
    ), 0),
    COALESCE((
      SELECT COUNT(*)::int 
      FROM leads l 
      WHERE l.workspace_id = s.workspace_id 
        AND l.created_at > now() - interval '30 days'
    ), 0)
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  JOIN workspaces w ON w.id = s.workspace_id
  ORDER BY 
    CASE s.status WHEN 'active' THEN 1 WHEN 'trialing' THEN 2 WHEN 'past_due' THEN 3 ELSE 4 END,
    s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cockpit_saas_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cockpit_saas_subscriptions() TO authenticated;