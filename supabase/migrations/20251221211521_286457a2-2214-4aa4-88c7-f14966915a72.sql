-- Trigger: sync_won_to_project
-- Crée automatiquement un projet quand une opportunité passe en stage "won"

CREATE OR REPLACE FUNCTION public.sync_won_to_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier si le stage passe à "won" (et n'était pas déjà "won")
  IF NEW.stage = 'won' AND (OLD.stage IS NULL OR OLD.stage != 'won') THEN
    -- Créer le projet automatiquement
    INSERT INTO public.projects (
      opportunity_id,
      name,
      description,
      status,
      workspace_id,
      budget_amount,
      health_status
    ) VALUES (
      NEW.id,
      NEW.title,
      COALESCE(NEW.description, 'Projet créé depuis opportunité gagnée'),
      'scoping',
      NEW.workspace_id,
      NEW.value_amount,
      'on_track'
    );
    
    -- Mettre à jour la date de clôture de l'opportunité
    NEW.closed_at := NOW();
    NEW.close_reason := 'won';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger sur opportunities
DROP TRIGGER IF EXISTS trigger_sync_won_to_project ON public.opportunities;
CREATE TRIGGER trigger_sync_won_to_project
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_won_to_project();