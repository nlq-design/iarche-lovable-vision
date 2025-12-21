-- Fonction pour créer automatiquement une opportunité quand un lead est créé
CREATE OR REPLACE FUNCTION public.sync_lead_to_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Créer une opportunité liée au lead dans le stage "lead"
  INSERT INTO public.opportunities (
    lead_id,
    title,
    stage,
    source,
    description,
    workspace_id
  ) VALUES (
    NEW.id,
    COALESCE(NEW.company, NEW.name),
    'lead',
    NEW.source,
    'Lead: ' || NEW.name || COALESCE(' - ' || NEW.company, '') || COALESCE(E'\nSource: ' || NEW.source_context, ''),
    '00000000-0000-0000-0000-000000000001'::uuid
  );

  RETURN NEW;
END;
$$;

-- Créer le trigger sur la table leads
DROP TRIGGER IF EXISTS trigger_sync_lead_to_pipeline ON public.leads;
CREATE TRIGGER trigger_sync_lead_to_pipeline
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_lead_to_pipeline();