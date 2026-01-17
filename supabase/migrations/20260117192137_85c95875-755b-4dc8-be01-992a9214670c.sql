-- Fix RPC return type mismatch (cold_score is integer in table)
-- We keep the public API the same (cold_score NUMERIC) and cast in the RETURN QUERY.

CREATE OR REPLACE FUNCTION public.get_viviers_by_department(
  p_department TEXT,
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
  WHERE 
    CASE 
      WHEN LENGTH(p_department) = 3 THEN LEFT(v.postal_code, 3) = p_department
      ELSE LEFT(v.postal_code, 2) = p_department
    END
  ORDER BY 
    CASE WHEN p_order_dir = 'asc' THEN v.created_at END ASC,
    CASE WHEN p_order_dir = 'desc' THEN v.created_at END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;