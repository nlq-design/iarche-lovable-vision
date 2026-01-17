-- RPC pour trouver les NAF qui sont des années (1900-2029)
CREATE OR REPLACE FUNCTION public.get_viviers_with_year_in_naf(p_limit INT DEFAULT 1000)
RETURNS TABLE(id UUID, naf_code TEXT, creation_date DATE)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT v.id, v.naf_code, v.creation_date
  FROM viviers v
  WHERE v.naf_code ~ '^(19[0-9]{2}|20[0-2][0-9])$'
    AND (v.creation_date IS NULL)
  LIMIT p_limit;
$$;

-- RPC pour SIRET invalides (pas 9 ou 14 chiffres)
CREATE OR REPLACE FUNCTION public.get_viviers_with_invalid_siret(p_limit INT DEFAULT 1000)
RETURNS TABLE(id UUID, siret TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT v.id, v.siret
  FROM viviers v
  WHERE v.siret IS NOT NULL 
    AND v.siret != ''
    AND LENGTH(v.siret) NOT IN (9, 14)
  LIMIT p_limit;
$$;

-- RPC pour codes NAF tronqués (2 chiffres au lieu de 4+lettre)
CREATE OR REPLACE FUNCTION public.get_viviers_with_truncated_naf(p_limit INT DEFAULT 1000)
RETURNS TABLE(id UUID, naf_code TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT v.id, v.naf_code
  FROM viviers v
  WHERE v.naf_code IS NOT NULL 
    AND v.naf_code != ''
    AND v.naf_code ~ '^[0-9]{1,2}$'
    AND v.naf_code !~ '^(19|20)[0-9]{2}$'
  LIMIT p_limit;
$$;