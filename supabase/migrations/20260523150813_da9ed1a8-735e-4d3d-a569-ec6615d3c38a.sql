-- Phase IA-2J — Auto-Action Confiance
-- Étend action_proposals avec scoring de confiance + planification auto-exécution

ALTER TABLE public.action_proposals
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS confidence_reasons JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_execute_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_execute_status TEXT,
  ADD COLUMN IF NOT EXISTS auto_execute_cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_execute_cancelled_by TEXT;

ALTER TABLE public.action_proposals
  DROP CONSTRAINT IF EXISTS action_proposals_auto_exec_status_chk;
ALTER TABLE public.action_proposals
  ADD CONSTRAINT action_proposals_auto_exec_status_chk
  CHECK (auto_execute_status IS NULL
         OR auto_execute_status IN ('scheduled','cancelled','executed','failed'));

CREATE INDEX IF NOT EXISTS idx_action_proposals_auto_exec_due
  ON public.action_proposals (auto_execute_at)
  WHERE auto_execute_status = 'scheduled';

-- Heuristique de confiance (zéro LLM)
CREATE OR REPLACE FUNCTION public.compute_action_confidence(_proposal_id uuid)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  SELECT * INTO p FROM public.action_proposals WHERE id = _proposal_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Pour l'instant, seulement send_email auto-exécutable
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

  -- Critère 1 : destinataire valide (+0.25)
  IF v_recipient IS NOT NULL AND v_recipient ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    v_score := v_score + 0.25;
    v_reasons := v_reasons || jsonb_build_object('recipient_ok', true);
  ELSE
    v_reasons := v_reasons || jsonb_build_object('recipient_ok', false);
  END IF;

  -- Critère 2 : corps non vide (+0.15)
  IF v_body IS NOT NULL AND length(trim(v_body)) > 40 THEN
    v_score := v_score + 0.15;
    v_reasons := v_reasons || jsonb_build_object('body_ok', true);
  END IF;

  -- Critère 3 : raisonnement IA présent (+0.10)
  IF p.ai_reasoning IS NOT NULL AND length(trim(p.ai_reasoning)) > 20 THEN
    v_score := v_score + 0.10;
    v_reasons := v_reasons || jsonb_build_object('reasoning_ok', true);
  END IF;

  -- Critère 4 : lead identifié et faible scoring (nurturing, faible risque) (+0.25)
  IF v_lead_id IS NOT NULL THEN
    SELECT lead_score INTO v_lead_score FROM public.leads WHERE id = v_lead_id;
    IF v_lead_score IS NOT NULL AND v_lead_score < 50 THEN
      v_score := v_score + 0.25;
      v_reasons := v_reasons || jsonb_build_object('lead_low_risk', true, 'lead_score', v_lead_score);
    ELSIF v_lead_score IS NOT NULL THEN
      v_reasons := v_reasons || jsonb_build_object('lead_low_risk', false, 'lead_score', v_lead_score);
    END IF;
  END IF;

  -- Critère 5 : historique de validation (≥3 envois réussis sur l'espace) (+0.25)
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

  -- Persiste le score + planifie l'auto-exec si seuil atteint
  IF v_score >= 0.85 AND p.status = 'pending' AND p.auto_execute_status IS NULL THEN
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
$$;

-- Trigger : calcule la confiance à la création d'une proposition send_email
CREATE OR REPLACE FUNCTION public.trg_action_proposal_confidence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.action_type = 'send_email' AND NEW.status = 'pending' THEN
    PERFORM public.compute_action_confidence(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS action_proposal_compute_confidence ON public.action_proposals;
CREATE TRIGGER action_proposal_compute_confidence
AFTER INSERT ON public.action_proposals
FOR EACH ROW
EXECUTE FUNCTION public.trg_action_proposal_confidence();

-- Vue : propositions à exécuter par le cron
CREATE OR REPLACE VIEW public.scheduled_auto_actions
WITH (security_invoker = true) AS
SELECT id, workspace_id, action_type, action_label, confidence_score, auto_execute_at
  FROM public.action_proposals
 WHERE auto_execute_status = 'scheduled'
   AND status = 'pending'
   AND auto_execute_at <= now();

-- RPC d'annulation utilisateur
CREATE OR REPLACE FUNCTION public.cancel_auto_action(_proposal_id uuid, _reason text DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.action_proposals
     SET auto_execute_status = 'cancelled',
         auto_execute_cancelled_at = now(),
         auto_execute_cancelled_by = COALESCE(auth.uid()::text, 'system'),
         validation_notes = COALESCE(validation_notes,'') ||
                            CASE WHEN _reason IS NOT NULL THEN E'\n[Annulé] '||_reason ELSE E'\n[Annulé]' END,
         updated_at = now()
   WHERE id = _proposal_id
     AND auto_execute_status = 'scheduled';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_auto_action(uuid, text) TO authenticated;