
-- =============================================
-- UTM tracking sur leads
-- =============================================
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS landing_page TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign ON public.leads(utm_campaign) WHERE utm_campaign IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON public.leads(utm_source) WHERE utm_source IS NOT NULL;

-- =============================================
-- PRODUCT FEATURES (Roadmap)
-- =============================================
CREATE TABLE IF NOT EXISTS public.product_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog','planned','in_progress','shipped','rejected')),
  impact INT DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  effort INT DEFAULT 3 CHECK (effort BETWEEN 1 AND 5),
  category TEXT,
  target_release DATE,
  shipped_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_features_solution_status ON public.product_features(solution_id, status);

ALTER TABLE public.product_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_features_select_auth" ON public.product_features FOR SELECT TO authenticated USING (true);
CREATE POLICY "product_features_insert_admin" ON public.product_features FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "product_features_update_admin" ON public.product_features FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "product_features_delete_admin" ON public.product_features FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_product_features_updated_at BEFORE UPDATE ON public.product_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-set shipped_at when status flips to shipped
CREATE OR REPLACE FUNCTION public.product_features_auto_shipped()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'shipped' AND COALESCE(OLD.status, '') <> 'shipped' THEN
    NEW.shipped_at := COALESCE(NEW.shipped_at, now());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER product_features_auto_shipped_trigger BEFORE INSERT OR UPDATE ON public.product_features
  FOR EACH ROW EXECUTE FUNCTION public.product_features_auto_shipped();

-- =============================================
-- FEATURE VOTES
-- =============================================
CREATE TABLE IF NOT EXISTS public.feature_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES public.product_features(id) ON DELETE CASCADE,
  user_id UUID,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  weight INT NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (feature_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feature_votes_feature ON public.feature_votes(feature_id);

ALTER TABLE public.feature_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_votes_select_auth" ON public.feature_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "feature_votes_insert_self" ON public.feature_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "feature_votes_delete_self_or_admin" ON public.feature_votes FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- RPC: ACQUISITION
-- =============================================
CREATE OR REPLACE FUNCTION public.get_solution_acquisition(p_solution_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'Access denied: super_admin required'; END IF;

  WITH sol_leads AS (
    SELECT l.*
    FROM public.solution_leads sl
    JOIN public.leads l ON l.id = sl.lead_id
    WHERE sl.solution_id = p_solution_id
  ),
  by_source AS (
    SELECT COALESCE(NULLIF(utm_source, ''), source, 'direct') AS source,
           COUNT(*) AS leads,
           COUNT(*) FILTER (WHERE qualification_status IN ('qualified','customer','won')) AS qualified
    FROM sol_leads GROUP BY 1 ORDER BY leads DESC LIMIT 20
  ),
  by_campaign AS (
    SELECT utm_campaign AS campaign, utm_medium AS medium,
           COUNT(*) AS leads,
           COUNT(*) FILTER (WHERE qualification_status IN ('qualified','customer','won')) AS qualified
    FROM sol_leads WHERE utm_campaign IS NOT NULL
    GROUP BY 1, 2 ORDER BY leads DESC LIMIT 20
  ),
  by_month AS (
    SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
           COUNT(*) AS leads
    FROM sol_leads
    WHERE created_at >= now() - INTERVAL '12 months'
    GROUP BY 1 ORDER BY 1
  ),
  totals AS (
    SELECT COUNT(*) AS total_leads,
      COUNT(*) FILTER (WHERE qualification_status IN ('qualified','customer','won')) AS converted,
      COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '30 days') AS leads_30d
    FROM sol_leads
  ),
  sub_count AS (
    SELECT COUNT(*) AS active_customers
    FROM public.subscriptions
    WHERE solution_id = p_solution_id AND status IN ('active','trialing')
  )
  SELECT jsonb_build_object(
    'total_leads', COALESCE((SELECT total_leads FROM totals), 0),
    'leads_30d', COALESCE((SELECT leads_30d FROM totals), 0),
    'converted', COALESCE((SELECT converted FROM totals), 0),
    'active_customers', COALESCE((SELECT active_customers FROM sub_count), 0),
    'conversion_rate', CASE WHEN (SELECT total_leads FROM totals) > 0
      THEN ROUND(((SELECT converted FROM totals)::numeric / (SELECT total_leads FROM totals)) * 100, 1) ELSE 0 END,
    'by_source', COALESCE((SELECT jsonb_agg(jsonb_build_object('source',source,'leads',leads,'qualified',qualified)) FROM by_source), '[]'::jsonb),
    'by_campaign', COALESCE((SELECT jsonb_agg(jsonb_build_object('campaign',campaign,'medium',medium,'leads',leads,'qualified',qualified)) FROM by_campaign), '[]'::jsonb),
    'monthly_trend', COALESCE((SELECT jsonb_agg(jsonb_build_object('month',month,'leads',leads)) FROM by_month), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =============================================
-- RPC: ROADMAP
-- =============================================
CREATE OR REPLACE FUNCTION public.get_solution_roadmap(p_solution_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'Access denied: super_admin required'; END IF;

  WITH features AS (
    SELECT f.*,
      COALESCE((SELECT SUM(weight) FROM public.feature_votes v WHERE v.feature_id = f.id), 0) AS vote_score,
      COALESCE((SELECT COUNT(*) FROM public.feature_votes v WHERE v.feature_id = f.id), 0) AS vote_count
    FROM public.product_features f
    WHERE f.solution_id = p_solution_id
  )
  SELECT jsonb_build_object(
    'features', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id, 'title', title, 'description', description, 'status', status,
        'impact', impact, 'effort', effort, 'category', category,
        'target_release', target_release, 'shipped_at', shipped_at,
        'vote_score', vote_score, 'vote_count', vote_count,
        'priority_score', ROUND((impact::numeric * vote_score) / GREATEST(effort, 1), 1),
        'created_at', created_at
      ) ORDER BY status, (impact::numeric * vote_score) / GREATEST(effort, 1) DESC
    ), '[]'::jsonb),
    'counts', jsonb_build_object(
      'backlog', COUNT(*) FILTER (WHERE status='backlog'),
      'planned', COUNT(*) FILTER (WHERE status='planned'),
      'in_progress', COUNT(*) FILTER (WHERE status='in_progress'),
      'shipped', COUNT(*) FILTER (WHERE status='shipped')
    ),
    'total_votes', COALESCE(SUM(vote_score), 0)
  ) INTO v_result FROM features;

  RETURN v_result;
END;
$$;
