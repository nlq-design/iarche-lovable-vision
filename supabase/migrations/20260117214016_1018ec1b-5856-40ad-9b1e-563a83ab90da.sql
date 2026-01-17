
-- RPC functions for efficient data cleanup filtering
-- These use regex patterns directly in SQL for better performance

-- Get viviers with SIRET-like values in company_size
CREATE OR REPLACE FUNCTION public.get_viviers_with_siret_in_size(p_limit INTEGER DEFAULT 1000)
RETURNS TABLE (id UUID, company_size TEXT, siret TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT v.id, v.company_size, v.siret
  FROM public.viviers v
  WHERE v.company_size IS NOT NULL
    AND v.siret IS NULL
    AND v.company_size ~ '^[0-9]{9}$|^[0-9]{14}$'
  LIMIT p_limit;
$$;

-- Get viviers with city prefix pattern (e.g., "0-DAX")
CREATE OR REPLACE FUNCTION public.get_viviers_with_city_prefix_in_size(p_limit INTEGER DEFAULT 1000)
RETURNS TABLE (id UUID, company_size TEXT, city TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT v.id, v.company_size, v.city
  FROM public.viviers v
  WHERE v.company_size IS NOT NULL
    AND (v.city IS NULL OR v.city = '')
    AND v.company_size ~ '^[0-9]+-[A-Z][A-Z\s]+$'
  LIMIT p_limit;
$$;

-- Get viviers with city+SIREN pattern (e.g., "MONT DE MARSAN-645581212")
CREATE OR REPLACE FUNCTION public.get_viviers_with_city_siren_in_size(p_limit INTEGER DEFAULT 1000)
RETURNS TABLE (id UUID, company_size TEXT, city TEXT, siret TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT v.id, v.company_size, v.city, v.siret
  FROM public.viviers v
  WHERE v.company_size IS NOT NULL
    AND v.company_size ~ '^[A-Z][A-Z\s]+-[0-9]{9}$'
  LIMIT p_limit;
$$;

-- Get viviers with NAF in company_size
CREATE OR REPLACE FUNCTION public.get_viviers_with_naf_in_size(p_limit INTEGER DEFAULT 1000)
RETURNS TABLE (id UUID, company_size TEXT, naf_code TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT v.id, v.company_size, v.naf_code
  FROM public.viviers v
  WHERE v.company_size IS NOT NULL
    AND (v.naf_code IS NULL OR v.naf_code = '')
    AND v.company_size ~ '^[0-9]{2,4}[A-Z]$'
  LIMIT p_limit;
$$;

-- Get viviers with year in company_size
CREATE OR REPLACE FUNCTION public.get_viviers_with_year_in_size(p_limit INTEGER DEFAULT 1000)
RETURNS TABLE (id UUID, company_size TEXT, creation_date TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT v.id, v.company_size, v.creation_date::TEXT
  FROM public.viviers v
  WHERE v.company_size IS NOT NULL
    AND v.creation_date IS NULL
    AND v.company_size ~ '^(19|20)[0-9]{2}$'
  LIMIT p_limit;
$$;

-- Get viviers with email in contact_name
CREATE OR REPLACE FUNCTION public.get_viviers_with_email_in_contact(p_limit INTEGER DEFAULT 1000)
RETURNS TABLE (id UUID, contact_name TEXT, email TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT v.id, v.contact_name, v.email
  FROM public.viviers v
  WHERE v.contact_name IS NOT NULL
    AND v.contact_name LIKE '%@%'
  LIMIT p_limit;
$$;

NOTIFY pgrst, 'reload schema';
