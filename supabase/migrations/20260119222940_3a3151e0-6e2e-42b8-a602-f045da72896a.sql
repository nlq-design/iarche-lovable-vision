-- =====================================================
-- FIX: Ajouter search_path aux 3 fonctions SECURITY DEFINER
-- =====================================================

-- 1. get_viviers_with_invalid_siret
DROP FUNCTION IF EXISTS public.get_viviers_with_invalid_siret(integer);
CREATE FUNCTION public.get_viviers_with_invalid_siret(p_limit integer DEFAULT 1000)
RETURNS TABLE(id uuid, siret text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.siret
  FROM viviers v
  WHERE v.siret IS NOT NULL 
    AND v.siret != ''
    AND LENGTH(v.siret) NOT IN (9, 14)
  LIMIT p_limit;
$$;

-- 2. get_viviers_with_truncated_naf
DROP FUNCTION IF EXISTS public.get_viviers_with_truncated_naf(integer);
CREATE FUNCTION public.get_viviers_with_truncated_naf(p_limit integer DEFAULT 1000)
RETURNS TABLE(id uuid, naf_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.naf_code
  FROM viviers v
  WHERE v.naf_code IS NOT NULL 
    AND v.naf_code != ''
    AND v.naf_code ~ '^[0-9]{1,2}$'
    AND v.naf_code !~ '^(19|20)[0-9]{2}$'
  LIMIT p_limit;
$$;

-- 3. get_viviers_with_year_in_naf
DROP FUNCTION IF EXISTS public.get_viviers_with_year_in_naf(integer);
CREATE FUNCTION public.get_viviers_with_year_in_naf(p_limit integer DEFAULT 1000)
RETURNS TABLE(id uuid, naf_code text, creation_date date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.naf_code, v.creation_date
  FROM viviers v
  WHERE v.naf_code ~ '^(19[0-9]{2}|20[0-2][0-9])$'
    AND (v.creation_date IS NULL)
  LIMIT p_limit;
$$;