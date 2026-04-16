-- Étape 1 : Migration partner_type + ajout partner_subtype
ALTER TABLE public.partners DROP CONSTRAINT IF EXISTS partners_partner_type_check;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS partner_subtype TEXT;

UPDATE public.partners SET partner_subtype = 'expert_ia' WHERE partner_type = 'expert_ia';
UPDATE public.partners SET partner_subtype = 'independant' WHERE partner_type = 'independant';
UPDATE public.partners SET partner_type = 'apporteur_affaires' WHERE partner_type = 'apport_affaires';
UPDATE public.partners SET partner_type = 'partenaire' WHERE partner_type IN ('expert_ia', 'independant');

ALTER TABLE public.partners ADD CONSTRAINT partners_partner_type_check 
  CHECK (partner_type IN ('client', 'partenaire', 'affilie', 'apporteur_affaires'));
ALTER TABLE public.partners ADD CONSTRAINT partners_partner_subtype_check 
  CHECK (partner_subtype IS NULL OR partner_subtype IN ('expert_ia', 'independant', 'apport_affaires'));

-- Étape 2 : Fix validate_partner_invitation (DROP puis CREATE car changement de signature)
DROP FUNCTION IF EXISTS public.validate_partner_invitation(text);

CREATE FUNCTION public.validate_partner_invitation(p_token text)
RETURNS TABLE(id uuid, email text, expires_at timestamptz, is_valid boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT pi.id, pi.email, pi.expires_at,
    (pi.accepted_at IS NULL AND pi.expires_at > now()) as is_valid
  FROM partner_invitations pi
  WHERE pi.token = p_token
  LIMIT 1;
END;
$$;