-- Create optimized RPC for postal code filtering that bypasses RLS overhead
CREATE OR REPLACE FUNCTION public.get_viviers_by_postal_code(
  p_postal_code TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_order_by TEXT DEFAULT 'created_at',
  p_order_dir TEXT DEFAULT 'desc'
)
RETURNS TABLE(
  id UUID,
  company_name TEXT,
  contact_name TEXT,
  contact_first_name TEXT,
  contact_last_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  postal_code TEXT,
  industry TEXT,
  cold_score NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ,
  siret TEXT,
  legal_form TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_cockpit_access(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    v.id,
    v.company_name,
    v.contact_name,
    v.contact_first_name,
    v.contact_last_name,
    v.email,
    v.phone,
    v.city,
    v.postal_code,
    v.industry,
    v.cold_score::numeric,
    v.status,
    v.created_at,
    v.siret,
    v.legal_form
  FROM viviers v
  WHERE v.postal_code LIKE (p_postal_code || '%')
  ORDER BY 
    CASE WHEN p_order_dir = 'asc' THEN v.created_at END ASC,
    CASE WHEN p_order_dir = 'desc' THEN v.created_at END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Create count RPC for postal code
CREATE OR REPLACE FUNCTION public.count_viviers_by_postal_code(p_postal_code TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result BIGINT;
BEGIN
  IF NOT has_cockpit_access(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COUNT(*) INTO result
  FROM viviers
  WHERE postal_code LIKE (p_postal_code || '%');
  
  RETURN result;
END;
$$;