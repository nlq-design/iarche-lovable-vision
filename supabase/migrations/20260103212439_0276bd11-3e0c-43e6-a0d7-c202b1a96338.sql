-- Trigger pour calculer le score initial d'un lead à sa création (basé sur source)
CREATE OR REPLACE FUNCTION public.auto_score_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_initial_score integer := 0;
BEGIN
  -- Score initial basé sur la source
  CASE NEW.source
    WHEN 'contact' THEN v_initial_score := 15;  -- Contact direct = intérêt fort
    WHEN 'formulaire' THEN v_initial_score := 10;  -- Formulaire personnalisé
    WHEN 'livre-blanc' THEN v_initial_score := 12;  -- Téléchargement = intérêt qualifié
    WHEN 'atelier' THEN v_initial_score := 20;  -- Inscription atelier = très engagé
    WHEN 'newsletter' THEN v_initial_score := 5;  -- Inscription newsletter = intérêt basique
    ELSE v_initial_score := 8;  -- Autres sources
  END CASE;
  
  -- Bonus si entreprise renseignée
  IF NEW.company IS NOT NULL AND NEW.company != '' THEN
    v_initial_score := v_initial_score + 5;
  END IF;
  
  -- Bonus si téléphone renseigné
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    v_initial_score := v_initial_score + 3;
  END IF;
  
  -- Bonus si consentement marketing
  IF NEW.consent_marketing = TRUE THEN
    v_initial_score := v_initial_score + 2;
  END IF;
  
  -- Mettre à jour le lead_score
  NEW.lead_score := v_initial_score;
  NEW.lead_score_details := jsonb_build_object(
    'source_score', v_initial_score,
    'source', NEW.source,
    'auto_scored_at', now(),
    'scoring_version', '1.0'
  );
  
  RETURN NEW;
END;
$$;

-- Créer le trigger sur INSERT
DROP TRIGGER IF EXISTS trg_auto_score_new_lead ON public.leads;
CREATE TRIGGER trg_auto_score_new_lead
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_score_new_lead();