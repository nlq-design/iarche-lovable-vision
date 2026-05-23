
-- ============================================================
-- P0.1 — Colonne solution_id sur opportunities
-- ============================================================
ALTER TABLE public.opportunities 
  ADD COLUMN IF NOT EXISTS solution_id uuid REFERENCES public.articles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_solution ON public.opportunities(solution_id) WHERE solution_id IS NOT NULL;

-- ============================================================
-- P0.2 — Trigger auto-tag solution_id depuis solution_leads
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_tag_opportunity_solution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_solution_id uuid;
BEGIN
  IF NEW.solution_id IS NOT NULL OR NEW.lead_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT solution_id INTO v_solution_id
  FROM public.solution_leads
  WHERE lead_id = NEW.lead_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_solution_id IS NOT NULL THEN
    NEW.solution_id := v_solution_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_tag_opportunity_solution ON public.opportunities;
CREATE TRIGGER trg_auto_tag_opportunity_solution
  BEFORE INSERT ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_tag_opportunity_solution();

-- ============================================================
-- P0.3 — RPC get_solution_pipeline
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_solution_pipeline(p_solution_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_kpis jsonb;
  v_opportunities jsonb;
  v_stages jsonb;
BEGIN
  SELECT has_role(auth.uid(), 'super_admin') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- KPIs
  SELECT jsonb_build_object(
    'total_count', COUNT(*),
    'open_count', COUNT(*) FILTER (WHERE stage NOT IN ('closed_won','closed_lost')),
    'pipeline_value_eur', COALESCE(SUM(value_amount) FILTER (WHERE stage NOT IN ('closed_won','closed_lost')), 0),
    'weighted_pipeline_eur', COALESCE(SUM(value_amount * COALESCE(probability,50) / 100.0) FILTER (WHERE stage NOT IN ('closed_won','closed_lost')), 0),
    'won_value_eur', COALESCE(SUM(value_amount) FILTER (WHERE stage = 'closed_won'), 0),
    'lost_count', COUNT(*) FILTER (WHERE stage = 'closed_lost'),
    'won_count', COUNT(*) FILTER (WHERE stage = 'closed_won'),
    'win_rate', CASE WHEN COUNT(*) FILTER (WHERE stage IN ('closed_won','closed_lost')) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE stage='closed_won')::numeric / COUNT(*) FILTER (WHERE stage IN ('closed_won','closed_lost'))::numeric) * 100, 1)
      ELSE 0 END
  ) INTO v_kpis
  FROM public.opportunities
  WHERE solution_id = p_solution_id;

  -- Répartition par stage
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'stage', stage,
    'count', cnt,
    'value_eur', val
  ) ORDER BY stage), '[]'::jsonb) INTO v_stages
  FROM (
    SELECT stage, COUNT(*) AS cnt, COALESCE(SUM(value_amount),0) AS val
    FROM public.opportunities
    WHERE solution_id = p_solution_id
    GROUP BY stage
  ) s;

  -- Liste opportunités
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', o.id,
    'title', o.title,
    'stage', o.stage,
    'value_amount', o.value_amount,
    'probability', o.probability,
    'expected_close_date', o.expected_close_date,
    'lead_name', l.name,
    'lead_company', l.company,
    'lead_id', o.lead_id,
    'workspace_id', o.workspace_id,
    'created_at', o.created_at,
    'stage_entered_at', o.stage_entered_at
  ) ORDER BY o.created_at DESC), '[]'::jsonb) INTO v_opportunities
  FROM public.opportunities o
  LEFT JOIN public.leads l ON l.id = o.lead_id
  WHERE o.solution_id = p_solution_id;

  RETURN jsonb_build_object(
    'kpis', v_kpis,
    'stages', v_stages,
    'opportunities', v_opportunities
  );
END;
$$;

-- ============================================================
-- P0.4 — RPC get_solution_user_activity
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_solution_user_activity(p_solution_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_workspaces jsonb;
  v_solution_slug text;
BEGIN
  SELECT has_role(auth.uid(), 'super_admin') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT slug INTO v_solution_slug FROM public.articles WHERE id = p_solution_id;

  -- Pour l'instant le seul SaaS opéré est cockpit-by-iarche: on prend tous les workspaces avec subscription active
  -- Quand de nouveaux SaaS arriveront, on filtrera par plan rattaché à la solution
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'workspace_id', wsd.workspace_id,
    'workspace_name', wsd.workspace_name,
    'plan_name', wsd.plan_name,
    'subscription_status', wsd.sub_status,
    'dau_count', wsd.dau_count,
    'wau_count', wsd.wau_count,
    'mau_count', wsd.mau_count,
    'last_activity_at', wsd.last_activity_at,
    'top_features', wsd.top_features,
    'ai_tokens_30d', wsd.ai_tokens_30d,
    'engagement_score', wsd.engagement_score,
    'inactive_alert', wsd.last_activity_at IS NULL OR wsd.last_activity_at < now() - interval '14 days'
  ) ORDER BY wsd.engagement_score DESC NULLS LAST), '[]'::jsonb) INTO v_workspaces
  FROM (
    SELECT
      w.id AS workspace_id,
      w.name AS workspace_name,
      p.name AS plan_name,
      s.status AS sub_status,
      (SELECT COUNT(DISTINCT created_by) FROM activity_log WHERE workspace_id = w.id AND created_at > now() - interval '1 day') AS dau_count,
      (SELECT COUNT(DISTINCT created_by) FROM activity_log WHERE workspace_id = w.id AND created_at > now() - interval '7 days') AS wau_count,
      (SELECT COUNT(DISTINCT created_by) FROM activity_log WHERE workspace_id = w.id AND created_at > now() - interval '30 days') AS mau_count,
      (SELECT MAX(created_at) FROM activity_log WHERE workspace_id = w.id) AS last_activity_at,
      (SELECT jsonb_agg(jsonb_build_object('feature', activity_type, 'count', cnt) ORDER BY cnt DESC)
         FROM (SELECT activity_type, COUNT(*) AS cnt FROM activity_log
               WHERE workspace_id = w.id AND created_at > now() - interval '30 days'
               GROUP BY activity_type ORDER BY cnt DESC LIMIT 5) tf
      ) AS top_features,
      COALESCE((SELECT SUM(total_tokens)::bigint FROM workspace_ai_usage 
                WHERE workspace_id = w.id AND period_start > (now() - interval '30 days')::date), 0) AS ai_tokens_30d,
      LEAST(100, GREATEST(0,
        COALESCE((SELECT COUNT(DISTINCT created_by) FROM activity_log WHERE workspace_id = w.id AND created_at > now() - interval '7 days'),0) * 10
        + LEAST(50, COALESCE((SELECT COUNT(*) FROM activity_log WHERE workspace_id = w.id AND created_at > now() - interval '30 days'),0) / 5)
        + CASE WHEN (SELECT MAX(created_at) FROM activity_log WHERE workspace_id = w.id) > now() - interval '3 days' THEN 20 ELSE 0 END
      )) AS engagement_score
    FROM public.subscriptions s
    JOIN public.workspaces w ON w.id = s.workspace_id
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.status IN ('active','trialing','past_due')
  ) wsd;

  RETURN jsonb_build_object(
    'solution_slug', v_solution_slug,
    'workspaces', v_workspaces,
    'workspace_count', jsonb_array_length(v_workspaces)
  );
END;
$$;

-- ============================================================
-- P0.5 — RPC get_solution_timeline
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_solution_timeline(p_solution_id uuid, p_limit int DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_events jsonb;
BEGIN
  SELECT has_role(auth.uid(), 'super_admin') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(ev ORDER BY (ev->>'occurred_at')::timestamptz DESC), '[]'::jsonb) INTO v_events
  FROM (
    -- Leads liés
    SELECT jsonb_build_object(
      'type', 'lead_linked',
      'occurred_at', sl.created_at,
      'label', 'Prospect ' || COALESCE(l.name,'sans nom') || ' rattaché',
      'entity_id', l.id,
      'entity_label', COALESCE(l.company, l.email),
      'meta', jsonb_build_object('interest_level', sl.interest_level)
    ) AS ev
    FROM public.solution_leads sl
    LEFT JOIN public.leads l ON l.id = sl.lead_id
    WHERE sl.solution_id = p_solution_id

    UNION ALL
    -- Opportunités
    SELECT jsonb_build_object(
      'type', 'opportunity_created',
      'occurred_at', o.created_at,
      'label', 'Opportunité créée : ' || o.title,
      'entity_id', o.id,
      'entity_label', COALESCE(o.value_amount::text || ' EUR', '—'),
      'meta', jsonb_build_object('stage', o.stage, 'value', o.value_amount)
    )
    FROM public.opportunities o
    WHERE o.solution_id = p_solution_id

    UNION ALL
    -- Abonnements (cockpit-by-iarche uniquement pour l'instant: tous)
    SELECT jsonb_build_object(
      'type', CASE 
        WHEN s.canceled_at IS NOT NULL AND s.canceled_at >= s.created_at THEN 'subscription_canceled'
        WHEN s.status = 'trialing' THEN 'trial_started'
        ELSE 'subscription_started' END,
      'occurred_at', COALESCE(s.canceled_at, s.created_at),
      'label', w.name || ' — ' || p.name || ' (' || s.status || ')',
      'entity_id', s.workspace_id,
      'entity_label', w.name,
      'meta', jsonb_build_object('plan', p.name, 'status', s.status, 'mrr', p.price_monthly_eur)
    )
    FROM public.subscriptions s
    JOIN public.workspaces w ON w.id = s.workspace_id
    JOIN public.plans p ON p.id = s.plan_id

    UNION ALL
    -- Activité IA significative (synthèses, actions IA) sur les workspaces abonnés
    SELECT jsonb_build_object(
      'type', 'activity',
      'occurred_at', al.created_at,
      'label', COALESCE(al.title, al.activity_type),
      'entity_id', al.workspace_id,
      'entity_label', w2.name,
      'meta', jsonb_build_object('activity_type', al.activity_type, 'is_ai', al.is_ai_generated)
    )
    FROM public.activity_log al
    JOIN public.workspaces w2 ON w2.id = al.workspace_id
    JOIN public.subscriptions s2 ON s2.workspace_id = al.workspace_id
    WHERE al.created_at > now() - interval '60 days'
      AND al.is_ai_generated = true
    LIMIT p_limit
  ) timeline;

  RETURN jsonb_build_object('events', v_events);
END;
$$;

-- ============================================================
-- P0.6 — Permissions
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.get_solution_pipeline(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_solution_user_activity(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_solution_timeline(uuid, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_solution_pipeline(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_solution_user_activity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_solution_timeline(uuid, int) TO authenticated;

-- ============================================================
-- P0.7 — Policy super_admin SELECT sur opportunities (catalogue cross-workspace)
-- ============================================================
DROP POLICY IF EXISTS "opportunities_select_super_admin" ON public.opportunities;
CREATE POLICY "opportunities_select_super_admin"
  ON public.opportunities
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
