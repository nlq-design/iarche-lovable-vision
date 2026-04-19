CREATE OR REPLACE FUNCTION public.sync_won_to_project()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Détecter le passage à "closed_won" (et n'était pas déjà "closed_won")
  IF NEW.stage = 'closed_won' AND (OLD.stage IS NULL OR OLD.stage != 'closed_won') THEN
    -- Idempotence : ne créer le projet que s'il n'existe pas déjà pour cette opportunité
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE opportunity_id = NEW.id) THEN
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
    END IF;
    
    NEW.closed_at := NOW();
    NEW.close_reason := 'closed_won';
  END IF;
  
  RETURN NEW;
END;
$function$;