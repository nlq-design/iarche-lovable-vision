-- Fonction pour synchroniser form_responses vers leads
CREATE OR REPLACE FUNCTION public.sync_form_response_to_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email TEXT;
  v_name TEXT;
  v_phone TEXT;
  v_company TEXT;
  v_form_title TEXT;
  v_key TEXT;
  v_value TEXT;
BEGIN
  -- Parcourir les données du formulaire pour extraire les champs
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(NEW.data)
  LOOP
    -- Détecter l'email (contient @)
    IF v_value ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      v_email := v_value;
    -- Détecter le téléphone (commence par 0 ou +, contient des chiffres)
    ELSIF v_value ~ '^[+0][0-9\s.-]{8,}$' THEN
      v_phone := v_value;
    END IF;
  END LOOP;

  -- Si pas d'email trouvé, ne pas créer de lead
  IF v_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Récupérer le titre du formulaire
  SELECT title INTO v_form_title FROM public.forms WHERE id = NEW.form_id;

  -- Essayer de trouver un nom (premier champ texte non-email, non-téléphone)
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(NEW.data)
  LOOP
    IF v_value IS NOT NULL 
       AND v_value != v_email 
       AND v_value != COALESCE(v_phone, '')
       AND v_value !~ '^[+0][0-9\s.-]{8,}$'
       AND v_value !~ '@'
       AND v_value !~ '^(true|false)$'
       AND length(v_value) > 2
       AND length(v_value) < 100
    THEN
      IF v_name IS NULL THEN
        v_name := v_value;
      ELSIF v_company IS NULL AND v_name IS NOT NULL THEN
        v_company := v_value;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  -- Créer le lead (ou mettre à jour si email existe déjà)
  INSERT INTO public.leads (
    email,
    name,
    phone,
    company,
    source,
    source_context,
    source_id,
    qualification_status,
    consent_marketing
  ) VALUES (
    v_email,
    COALESCE(v_name, 'Formulaire'),
    v_phone,
    v_company,
    'formulaire',
    COALESCE(v_form_title, 'Formulaire'),
    NEW.id,
    'new',
    true
  )
  ON CONFLICT (email) DO UPDATE SET
    last_contacted_at = NOW(),
    source_context = COALESCE(leads.source_context || ' | ', '') || COALESCE(v_form_title, 'Formulaire');

  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_sync_form_response_to_lead ON public.form_responses;
CREATE TRIGGER trigger_sync_form_response_to_lead
  AFTER INSERT ON public.form_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_form_response_to_lead();

-- Ajouter un index unique sur email pour le ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS leads_email_unique ON public.leads (email);