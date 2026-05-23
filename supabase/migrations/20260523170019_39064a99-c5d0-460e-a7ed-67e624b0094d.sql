
CREATE TABLE IF NOT EXISTS public.onboarding_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  milestone TEXT NOT NULL CHECK (milestone IN ('signup', 'first_login', 'first_action', 'first_value', 'activated')),
  reached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (solution_id, user_id, milestone)
);
CREATE INDEX IF NOT EXISTS idx_onboarding_solution ON public.onboarding_milestones(solution_id, reached_at DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON public.onboarding_milestones(user_id, solution_id);
ALTER TABLE public.onboarding_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_select_members_or_admin" ON public.onboarding_milestones FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "onboarding_insert_members_or_admin" ON public.onboarding_milestones FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  workspace_id UUID,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  reporter_user_id UUID,
  reporter_email TEXT,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting','resolved','closed')),
  category TEXT,
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tickets_solution_status ON public.tickets(solution_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON public.tickets(assigned_to) WHERE assigned_to IS NOT NULL;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_select_members_or_admin" ON public.tickets FOR SELECT TO authenticated
  USING ((workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid())) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "tickets_insert_auth" ON public.tickets FOR INSERT TO authenticated
  WITH CHECK ((workspace_id IS NULL OR public.is_workspace_member(workspace_id, auth.uid())) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "tickets_update_members_or_admin" ON public.tickets FOR UPDATE TO authenticated
  USING ((workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid())) OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.tickets_auto_resolve_ts()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('resolved','closed') AND OLD.status NOT IN ('resolved','closed') THEN
    NEW.resolved_at := COALESCE(NEW.resolved_at, now());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER tickets_auto_resolve_trigger BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tickets_auto_resolve_ts();

CREATE TABLE IF NOT EXISTS public.nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  workspace_id UUID,
  user_id UUID,
  respondent_email TEXT,
  score INT NOT NULL CHECK (score BETWEEN 0 AND 10),
  category TEXT GENERATED ALWAYS AS (
    CASE WHEN score >= 9 THEN 'promoter' WHEN score >= 7 THEN 'passive' ELSE 'detractor' END
  ) STORED,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nps_solution ON public.nps_responses(solution_id, created_at DESC);
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nps_select_members_or_admin" ON public.nps_responses FOR SELECT TO authenticated
  USING ((workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid())) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "nps_insert_auth" ON public.nps_responses FOR INSERT TO authenticated
  WITH CHECK ((workspace_id IS NULL OR public.is_workspace_member(workspace_id, auth.uid())) OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.get_solution_onboarding(p_solution_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'Access denied: super_admin required'; END IF;
  WITH per_user AS (
    SELECT user_id,
      MAX(CASE WHEN milestone='signup' THEN reached_at END) AS signup_at,
      MAX(CASE WHEN milestone='first_login' THEN reached_at END) AS first_login_at,
      MAX(CASE WHEN milestone='first_action' THEN reached_at END) AS first_action_at,
      MAX(CASE WHEN milestone='first_value' THEN reached_at END) AS first_value_at,
      MAX(CASE WHEN milestone='activated' THEN reached_at END) AS activated_at
    FROM public.onboarding_milestones WHERE solution_id = p_solution_id GROUP BY user_id
  ), funnel AS (
    SELECT
      COUNT(*) FILTER (WHERE signup_at IS NOT NULL) AS signups,
      COUNT(*) FILTER (WHERE first_login_at IS NOT NULL) AS first_logins,
      COUNT(*) FILTER (WHERE first_action_at IS NOT NULL) AS first_actions,
      COUNT(*) FILTER (WHERE first_value_at IS NOT NULL) AS first_values,
      COUNT(*) FILTER (WHERE activated_at IS NOT NULL) AS activated,
      AVG(EXTRACT(EPOCH FROM (activated_at - signup_at))/86400) FILTER (WHERE activated_at IS NOT NULL AND signup_at IS NOT NULL) AS avg_days_to_activation
    FROM per_user
  )
  SELECT jsonb_build_object(
    'funnel', jsonb_build_array(
      jsonb_build_object('step','signup','label','Inscription','count',signups),
      jsonb_build_object('step','first_login','label','Première connexion','count',first_logins),
      jsonb_build_object('step','first_action','label','Première action','count',first_actions),
      jsonb_build_object('step','first_value','label','Premier value moment','count',first_values),
      jsonb_build_object('step','activated','label','Activé','count',activated)
    ),
    'activation_rate', CASE WHEN signups>0 THEN ROUND((activated::numeric/signups)*100, 1) ELSE 0 END,
    'avg_days_to_activation', COALESCE(ROUND(avg_days_to_activation::numeric, 1), 0),
    'total_users', signups
  ) INTO v_result FROM funnel;
  RETURN COALESCE(v_result, '{"funnel":[],"activation_rate":0,"avg_days_to_activation":0,"total_users":0}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_solution_revenue_detailed(p_solution_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'Access denied: super_admin required'; END IF;
  WITH active_subs AS (
    SELECT s.*, p.name AS plan_name, p.price_cents, p.interval
    FROM public.subscriptions s LEFT JOIN public.plans p ON p.id = s.plan_id
    WHERE s.solution_id = p_solution_id AND s.status IN ('active','trialing')
  ), mrr_calc AS (
    SELECT
      SUM(CASE WHEN interval='month' THEN price_cents WHEN interval='year' THEN price_cents/12.0 ELSE 0 END)/100.0 AS mrr,
      COUNT(*) AS active_count FROM active_subs
  ), by_plan AS (
    SELECT plan_name, COUNT(*) AS subscribers,
      SUM(CASE WHEN interval='month' THEN price_cents WHEN interval='year' THEN price_cents/12.0 ELSE 0 END)/100.0 AS mrr
    FROM active_subs GROUP BY plan_name
  ), cohorts AS (
    SELECT to_char(date_trunc('month', s.created_at), 'YYYY-MM') AS cohort,
      COUNT(*) AS new_subs,
      COUNT(*) FILTER (WHERE s.status IN ('active','trialing')) AS still_active
    FROM public.subscriptions s
    WHERE s.solution_id = p_solution_id AND s.created_at >= now() - INTERVAL '12 months'
    GROUP BY 1 ORDER BY 1
  ), churn AS (
    SELECT
      COUNT(*) FILTER (WHERE status='canceled' AND updated_at >= now() - INTERVAL '30 days') AS churned_30d,
      COUNT(*) FILTER (WHERE created_at < now() - INTERVAL '30 days') AS base_30d
    FROM public.subscriptions WHERE solution_id = p_solution_id
  )
  SELECT jsonb_build_object(
    'mrr', COALESCE((SELECT mrr FROM mrr_calc), 0),
    'arr', COALESCE((SELECT mrr*12 FROM mrr_calc), 0),
    'active_count', COALESCE((SELECT active_count FROM mrr_calc), 0),
    'by_plan', COALESCE((SELECT jsonb_agg(jsonb_build_object('plan',plan_name,'subscribers',subscribers,'mrr',mrr)) FROM by_plan), '[]'::jsonb),
    'cohorts', COALESCE((SELECT jsonb_agg(jsonb_build_object('cohort',cohort,'new_subs',new_subs,'still_active',still_active)) FROM cohorts), '[]'::jsonb),
    'churn_rate_30d', CASE WHEN (SELECT base_30d FROM churn) > 0
      THEN ROUND(((SELECT churned_30d FROM churn)::numeric / (SELECT base_30d FROM churn))*100, 2) ELSE 0 END
  ) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_solution_support(p_solution_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'Access denied: super_admin required'; END IF;
  WITH ticket_stats AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status='open') AS open_count,
      COUNT(*) FILTER (WHERE status='in_progress') AS in_progress_count,
      COUNT(*) FILTER (WHERE status IN ('resolved','closed')) AS resolved_count,
      COUNT(*) FILTER (WHERE priority IN ('high','urgent') AND status NOT IN ('resolved','closed')) AS urgent_open,
      AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL) AS avg_resolution_hours
    FROM public.tickets WHERE solution_id = p_solution_id
  ), by_priority AS (
    SELECT priority, COUNT(*) AS count FROM public.tickets
    WHERE solution_id = p_solution_id AND status NOT IN ('resolved','closed') GROUP BY priority
  ), nps_stats AS (
    SELECT COUNT(*) AS responses,
      COUNT(*) FILTER (WHERE category='promoter') AS promoters,
      COUNT(*) FILTER (WHERE category='passive') AS passives,
      COUNT(*) FILTER (WHERE category='detractor') AS detractors,
      AVG(score) AS avg_score
    FROM public.nps_responses WHERE solution_id = p_solution_id AND created_at >= now() - INTERVAL '90 days'
  )
  SELECT jsonb_build_object(
    'tickets', jsonb_build_object(
      'total', COALESCE((SELECT total FROM ticket_stats), 0),
      'open', COALESCE((SELECT open_count FROM ticket_stats), 0),
      'in_progress', COALESCE((SELECT in_progress_count FROM ticket_stats), 0),
      'resolved', COALESCE((SELECT resolved_count FROM ticket_stats), 0),
      'urgent_open', COALESCE((SELECT urgent_open FROM ticket_stats), 0),
      'avg_resolution_hours', COALESCE(ROUND((SELECT avg_resolution_hours FROM ticket_stats)::numeric, 1), 0),
      'by_priority', COALESCE((SELECT jsonb_agg(jsonb_build_object('priority',priority,'count',count)) FROM by_priority), '[]'::jsonb)
    ),
    'nps', jsonb_build_object(
      'score', CASE WHEN (SELECT responses FROM nps_stats) > 0
        THEN ROUND((((SELECT promoters FROM nps_stats)-(SELECT detractors FROM nps_stats))::numeric / (SELECT responses FROM nps_stats))*100)
        ELSE NULL END,
      'responses', COALESCE((SELECT responses FROM nps_stats), 0),
      'promoters', COALESCE((SELECT promoters FROM nps_stats), 0),
      'passives', COALESCE((SELECT passives FROM nps_stats), 0),
      'detractors', COALESCE((SELECT detractors FROM nps_stats), 0),
      'avg_score', COALESCE(ROUND((SELECT avg_score FROM nps_stats)::numeric, 1), 0)
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;
