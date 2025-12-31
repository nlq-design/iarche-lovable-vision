-- Trigger pour synchroniser les contacts vers leads
CREATE OR REPLACE FUNCTION public.sync_contact_to_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.leads (
    email,
    name,
    phone,
    company,
    source,
    source_context,
    source_id,
    message,
    qualification_status,
    consent_marketing
  ) VALUES (
    NEW.email,
    NEW.name,
    NULL, -- contacts n'a pas de champ phone
    NEW.company,
    'contact',
    NEW.subject,
    NEW.id,
    NEW.message,
    'new',
    false
  )
  ON CONFLICT (email) DO UPDATE SET
    last_contacted_at = NOW(),
    message = COALESCE(leads.message || E'\n---\n', '') || NEW.message;

  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_sync_contact_to_lead ON public.contacts;
CREATE TRIGGER trigger_sync_contact_to_lead
  AFTER INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_contact_to_lead();

-- Synchroniser les 46 contacts existants vers leads
INSERT INTO public.leads (email, name, company, source, source_context, source_id, message, qualification_status, consent_marketing)
SELECT 
  c.email,
  c.name,
  c.company,
  'contact',
  c.subject,
  c.id,
  c.message,
  'new',
  false
FROM public.contacts c
ON CONFLICT (email) DO NOTHING;