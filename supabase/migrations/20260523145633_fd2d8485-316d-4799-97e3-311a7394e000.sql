
CREATE TABLE public.lead_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  churn_risk_14d INTEGER NOT NULL DEFAULT 0 CHECK (churn_risk_14d BETWEEN 0 AND 100),
  conversion_proba_14d INTEGER NOT NULL DEFAULT 0 CHECK (conversion_proba_14d BETWEEN 0 AND 100),
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_version TEXT NOT NULL DEFAULT 'heuristic-v1',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, lead_id)
);

CREATE INDEX idx_lead_predictions_workspace ON public.lead_predictions(workspace_id, computed_at DESC);
CREATE INDEX idx_lead_predictions_churn ON public.lead_predictions(workspace_id, churn_risk_14d DESC);
CREATE INDEX idx_lead_predictions_conversion ON public.lead_predictions(workspace_id, conversion_proba_14d DESC);
CREATE INDEX idx_lead_predictions_lead ON public.lead_predictions(lead_id);

ALTER TABLE public.lead_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_view_predictions" ON public.lead_predictions
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()) OR is_admin());

CREATE POLICY "service_role_manage_predictions" ON public.lead_predictions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_lead_predictions_updated_at
  BEFORE UPDATE ON public.lead_predictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.compute_lead_predictions(_workspace_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  WITH lead_signals AS (
    SELECT
      l.id AS lead_id,
      l.workspace_id,
      l.status,
      l.qualification_status,
      COALESCE(l.lead_score, 0) AS bant_score,
      COALESCE(l.familiarity_score, 0) AS familiarity_score,
      EXTRACT(EPOCH FROM (now() - COALESCE(l.last_contacted_at, l.created_at)))/86400 AS days_inactive,
      EXTRACT(EPOCH FROM (now() - l.created_at))/86400 AS days_age,
      (SELECT COUNT(*) FROM activity_log al WHERE al.lead_id = l.id AND al.created_at > now() - interval '30 days') AS activity_30d,
      (SELECT COUNT(*) FROM activity_log al WHERE al.lead_id = l.id AND al.created_at > now() - interval '7 days') AS activity_7d,
      (SELECT COUNT(*) FROM opportunities o WHERE o.lead_id = l.id AND o.stage NOT IN ('closed_won','closed_lost')) AS active_opps,
      (SELECT MAX(o.probability) FROM opportunities o WHERE o.lead_id = l.id AND o.stage NOT IN ('closed_won','closed_lost')) AS max_opp_proba,
      (SELECT EXTRACT(EPOCH FROM (now() - MAX(o.stage_entered_at)))/86400 FROM opportunities o WHERE o.lead_id = l.id AND o.stage NOT IN ('closed_won','closed_lost')) AS days_in_stage
    FROM leads l
    WHERE (_workspace_id IS NULL OR l.workspace_id = _workspace_id)
      AND COALESCE(l.status, '') NOT IN ('closed_lost','disqualified','archived')
  ),
  scored AS (
    SELECT
      lead_id,
      workspace_id,
      LEAST(100, GREATEST(0,
        CASE WHEN days_inactive > 60 THEN 40
             WHEN days_inactive > 30 THEN 28
             WHEN days_inactive > 14 THEN 15
             ELSE 0 END
        + CASE WHEN bant_score >= 70 AND active_opps = 0 THEN 25 ELSE 0 END
        + CASE WHEN days_in_stage > 21 THEN 20
               WHEN days_in_stage > 14 THEN 12 ELSE 0 END
        + CASE WHEN activity_7d = 0 AND activity_30d <= 1 THEN 15 ELSE 0 END
      ))::INTEGER AS churn_risk_14d,
      LEAST(100, GREATEST(0,
        (bant_score * 0.35)::INTEGER
        + COALESCE((max_opp_proba * 0.30)::INTEGER, 0)
        + CASE WHEN activity_7d >= 3 THEN 20
               WHEN activity_7d >= 1 THEN 12
               ELSE 0 END
        + (familiarity_score * 0.15)::INTEGER
      ))::INTEGER AS conversion_proba_14d,
      jsonb_build_object(
        'days_inactive', ROUND(days_inactive::numeric, 1),
        'days_age', ROUND(days_age::numeric, 1),
        'bant_score', bant_score,
        'familiarity_score', familiarity_score,
        'activity_7d', activity_7d,
        'activity_30d', activity_30d,
        'active_opps', active_opps,
        'max_opp_proba', max_opp_proba,
        'days_in_stage', ROUND(COALESCE(days_in_stage, 0)::numeric, 1),
        'status', status,
        'qualification_status', qualification_status
      ) AS signals
    FROM lead_signals
  )
  INSERT INTO lead_predictions (workspace_id, lead_id, churn_risk_14d, conversion_proba_14d, signals, model_version, computed_at)
  SELECT workspace_id, lead_id, churn_risk_14d, conversion_proba_14d, signals, 'heuristic-v1', now()
  FROM scored
  ON CONFLICT (workspace_id, lead_id) DO UPDATE
    SET churn_risk_14d = EXCLUDED.churn_risk_14d,
        conversion_proba_14d = EXCLUDED.conversion_proba_14d,
        signals = EXCLUDED.signals,
        model_version = EXCLUDED.model_version,
        computed_at = EXCLUDED.computed_at,
        updated_at = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE VIEW public.top_predictive_alerts AS
WITH churn AS (
  SELECT lp.id, lp.workspace_id, lp.lead_id, l.name, l.company,
         'churn'::text AS alert_type, lp.churn_risk_14d AS score, lp.signals, lp.computed_at,
         ROW_NUMBER() OVER (PARTITION BY lp.workspace_id ORDER BY lp.churn_risk_14d DESC) AS rn
  FROM lead_predictions lp
  JOIN leads l ON l.id = lp.lead_id
  WHERE lp.churn_risk_14d >= 50
),
conv AS (
  SELECT lp.id, lp.workspace_id, lp.lead_id, l.name, l.company,
         'conversion'::text AS alert_type, lp.conversion_proba_14d AS score, lp.signals, lp.computed_at,
         ROW_NUMBER() OVER (PARTITION BY lp.workspace_id ORDER BY lp.conversion_proba_14d DESC) AS rn
  FROM lead_predictions lp
  JOIN leads l ON l.id = lp.lead_id
  WHERE lp.conversion_proba_14d >= 60
)
SELECT id, workspace_id, lead_id, name, company, alert_type, score, signals, computed_at
FROM churn WHERE rn <= 5
UNION ALL
SELECT id, workspace_id, lead_id, name, company, alert_type, score, signals, computed_at
FROM conv WHERE rn <= 5;

GRANT SELECT ON public.top_predictive_alerts TO authenticated, service_role;

SELECT cron.schedule(
  'compute-lead-predictions-daily',
  '30 6 * * *',
  $$SELECT public.compute_lead_predictions(NULL);$$
);
