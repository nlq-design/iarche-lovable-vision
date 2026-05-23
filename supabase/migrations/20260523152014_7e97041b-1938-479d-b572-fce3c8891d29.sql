
-- =====================================================================
-- Phase IA-2M : Auto-resolve content gaps + Workspace auto-tuning
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Table workspace_ai_thresholds
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_ai_thresholds (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  auto_action_confidence_threshold numeric(3,2) NOT NULL DEFAULT 0.85,
  rag_similarity_threshold numeric(3,2) NOT NULL DEFAULT 0.50,
  last_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT confidence_range CHECK (auto_action_confidence_threshold BETWEEN 0.50 AND 0.99),
  CONSTRAINT rag_sim_range CHECK (rag_similarity_threshold BETWEEN 0.20 AND 0.90)
);

ALTER TABLE public.workspace_ai_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_ai_thresholds_admin_select"
  ON public.workspace_ai_thresholds FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "workspace_ai_thresholds_member_select"
  ON public.workspace_ai_thresholds FOR SELECT TO authenticated
  USING (can_access_workspace(workspace_id, auth.uid()));

-- ---------------------------------------------------------------------
-- 2. compute_action_confidence : seuil dynamique par workspace
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_action_confidence(_proposal_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p RECORD;
  v_score NUMERIC := 0;
  v_reasons JSONB := '{}'::jsonb;
  v_lead_id uuid;
  v_lead_score INT;
  v_recipient TEXT;
  v_body TEXT;
  v_past_success INT;
  v_grace_hours INT := 2;
  v_threshold NUMERIC := 0.85;
BEGIN
  SELECT * INTO p FROM public.action_proposals WHERE id = _proposal_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF p.action_type <> 'send_email' THEN
    UPDATE public.action_proposals
       SET confidence_score = 0,
           confidence_reasons = jsonb_build_object('reason','action_type_not_eligible')
     WHERE id = _proposal_id;
    RETURN 0;
  END IF;

  v_recipient := COALESCE(p.action_payload->>'to', p.action_payload->>'email');
  v_body      := COALESCE(p.action_payload->>'body', p.action_payload->>'content');
  v_lead_id   := NULLIF(p.action_payload->>'lead_id','')::uuid;

  IF v_recipient IS NOT NULL AND v_recipient ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    v_score := v_score + 0.25;
    v_reasons := v_reasons || jsonb_build_object('recipient_ok', true);
  ELSE
    v_reasons := v_reasons || jsonb_build_object('recipient_ok', false);
  END IF;

  IF v_body IS NOT NULL AND length(trim(v_body)) > 40 THEN
    v_score := v_score + 0.15;
    v_reasons := v_reasons || jsonb_build_object('body_ok', true);
  END IF;

  IF p.ai_reasoning IS NOT NULL AND length(trim(p.ai_reasoning)) > 20 THEN
    v_score := v_score + 0.10;
    v_reasons := v_reasons || jsonb_build_object('reasoning_ok', true);
  END IF;

  IF v_lead_id IS NOT NULL THEN
    SELECT lead_score INTO v_lead_score FROM public.leads WHERE id = v_lead_id;
    IF v_lead_score IS NOT NULL AND v_lead_score < 50 THEN
      v_score := v_score + 0.25;
      v_reasons := v_reasons || jsonb_build_object('lead_low_risk', true, 'lead_score', v_lead_score);
    ELSIF v_lead_score IS NOT NULL THEN
      v_reasons := v_reasons || jsonb_build_object('lead_low_risk', false, 'lead_score', v_lead_score);
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_past_success
    FROM public.action_proposals
   WHERE workspace_id = p.workspace_id
     AND action_type = 'send_email'
     AND status = 'executed'
     AND executed_at IS NOT NULL;

  IF v_past_success >= 3 THEN
    v_score := v_score + 0.25;
    v_reasons := v_reasons || jsonb_build_object('template_validated', true, 'past_success', v_past_success);
  ELSE
    v_reasons := v_reasons || jsonb_build_object('template_validated', false, 'past_success', v_past_success);
  END IF;

  -- Phase M2 : seuil dynamique par workspace
  SELECT auto_action_confidence_threshold INTO v_threshold
    FROM public.workspace_ai_thresholds
   WHERE workspace_id = p.workspace_id;
  v_threshold := COALESCE(v_threshold, 0.85);
  v_reasons := v_reasons || jsonb_build_object('threshold_applied', v_threshold);

  IF v_score >= v_threshold AND p.status = 'pending' AND p.auto_execute_status IS NULL THEN
    UPDATE public.action_proposals
       SET confidence_score = v_score,
           confidence_reasons = v_reasons,
           auto_execute = true,
           auto_execute_at = now() + (v_grace_hours || ' hours')::interval,
           auto_execute_status = 'scheduled'
     WHERE id = _proposal_id;
  ELSE
    UPDATE public.action_proposals
       SET confidence_score = v_score,
           confidence_reasons = v_reasons
     WHERE id = _proposal_id;
  END IF;

  RETURN v_score;
END;
$function$;

-- ---------------------------------------------------------------------
-- 3. recompute_workspace_thresholds : auto-tuning hebdomadaire
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_workspace_thresholds()
RETURNS TABLE(workspace_id uuid, old_threshold numeric, new_threshold numeric, cancel_rate numeric, sample_size int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_old NUMERIC;
  v_new NUMERIC;
  v_cancel_rate NUMERIC;
  v_total INT;
  v_cancelled INT;
BEGIN
  FOR r IN
    SELECT ap.workspace_id,
           COUNT(*) FILTER (WHERE ap.auto_execute_status IN ('scheduled','executed','cancelled','failed')) AS total,
           COUNT(*) FILTER (WHERE ap.auto_execute_status = 'cancelled') AS cancelled
      FROM public.action_proposals ap
     WHERE ap.action_type = 'send_email'
       AND ap.created_at >= now() - interval '30 days'
     GROUP BY ap.workspace_id
     HAVING COUNT(*) FILTER (WHERE ap.auto_execute_status IS NOT NULL) >= 5
  LOOP
    v_total := r.total;
    v_cancelled := r.cancelled;
    v_cancel_rate := CASE WHEN v_total > 0 THEN v_cancelled::numeric / v_total ELSE 0 END;

    SELECT auto_action_confidence_threshold INTO v_old
      FROM public.workspace_ai_thresholds WHERE workspace_id = r.workspace_id;
    v_old := COALESCE(v_old, 0.85);

    -- Ajustement adaptatif
    IF v_cancel_rate > 0.20 THEN
      v_new := LEAST(0.95, v_old + 0.02);
    ELSIF v_cancel_rate < 0.05 AND v_total >= 10 THEN
      v_new := GREATEST(0.75, v_old - 0.02);
    ELSE
      v_new := v_old;
    END IF;

    INSERT INTO public.workspace_ai_thresholds (workspace_id, auto_action_confidence_threshold, last_metrics, updated_at)
    VALUES (r.workspace_id, v_new,
            jsonb_build_object('cancel_rate', v_cancel_rate, 'sample_size', v_total, 'cancelled', v_cancelled, 'window_days', 30),
            now())
    ON CONFLICT (workspace_id) DO UPDATE
      SET auto_action_confidence_threshold = EXCLUDED.auto_action_confidence_threshold,
          last_metrics = EXCLUDED.last_metrics,
          updated_at = now();

    workspace_id := r.workspace_id;
    old_threshold := v_old;
    new_threshold := v_new;
    cancel_rate := v_cancel_rate;
    sample_size := v_total;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- 4. auto_resolve_content_gaps : ferme les alertes content_gap couvertes
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_resolve_content_gaps(_threshold double precision DEFAULT 0.80)
RETURNS TABLE(alert_id uuid, representative_query text, matched_title text, similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  a RECORD;
  v_embedding extensions.vector(1536);
  m RECORD;
BEGIN
  FOR a IN
    SELECT id, ai_metadata->>'representative_query' AS rq
      FROM public.ai_sentinel_alerts
     WHERE category = 'content_gap'
       AND resolved_at IS NULL
       AND ai_metadata ? 'representative_query'
  LOOP
    -- Récupère un embedding existant pour cette question
    SELECT query_embedding INTO v_embedding
      FROM public.public_rag_unanswered
     WHERE normalized_query = lower(trim(a.rq))
       AND query_embedding IS NOT NULL
     ORDER BY asked_at DESC
     LIMIT 1;

    IF v_embedding IS NULL THEN
      CONTINUE;
    END IF;

    -- Cherche le meilleur match dans les contenus publics
    SELECT re.id, re.resource_title,
           (1 - (re.embedding OPERATOR(extensions.<=>) v_embedding))::float AS sim
      INTO m
      FROM public.resource_embeddings re
     WHERE re.is_public = true
     ORDER BY re.embedding OPERATOR(extensions.<=>) v_embedding
     LIMIT 1;

    IF m.sim IS NOT NULL AND m.sim >= _threshold THEN
      UPDATE public.ai_sentinel_alerts
         SET resolved_at = now(),
             ai_metadata = ai_metadata || jsonb_build_object(
               'auto_resolved', true,
               'resolution_match', jsonb_build_object(
                 'embedding_id', m.id,
                 'title', m.resource_title,
                 'similarity', m.sim,
                 'resolved_at', now()
               ))
       WHERE id = a.id;

      alert_id := a.id;
      representative_query := a.rq;
      matched_title := m.resource_title;
      similarity := m.sim;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- 5. Cron schedules
-- ---------------------------------------------------------------------
DO $$
BEGIN
  -- Auto-résolution toutes les 30 minutes
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-resolve-content-gaps') THEN
    PERFORM cron.schedule(
      'auto-resolve-content-gaps',
      '*/30 * * * *',
      $cron$ SELECT public.auto_resolve_content_gaps(0.80); $cron$
    );
  END IF;

  -- Recompute workspace thresholds : lundi 03:00 UTC
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recompute-workspace-ai-thresholds') THEN
    PERFORM cron.schedule(
      'recompute-workspace-ai-thresholds',
      '0 3 * * 1',
      $cron$ SELECT public.recompute_workspace_thresholds(); $cron$
    );
  END IF;
END $$;
