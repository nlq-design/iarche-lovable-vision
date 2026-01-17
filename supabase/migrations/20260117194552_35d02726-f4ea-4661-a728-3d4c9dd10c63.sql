-- Create optimized RPC for single-filter queries on viviers
-- Supports: source, status, company_size, score ranges

CREATE OR REPLACE FUNCTION public.get_viviers_by_filter(
  p_filter_type TEXT,
  p_filter_value TEXT DEFAULT NULL,
  p_min_score INTEGER DEFAULT NULL,
  p_max_score INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_order_by TEXT DEFAULT 'created_at',
  p_order_dir TEXT DEFAULT 'desc'
)
RETURNS TABLE (
  id UUID,
  external_id TEXT,
  source TEXT,
  source_file TEXT,
  batch_id TEXT,
  company_name TEXT,
  siret TEXT,
  siren TEXT,
  naf_code TEXT,
  legal_form TEXT,
  contact_name TEXT,
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_position TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  linkedin_url TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  industry TEXT,
  company_size TEXT,
  revenue_range TEXT,
  employee_count INTEGER,
  creation_date TEXT,
  cold_score INTEGER,
  scoring_criteria JSONB,
  tags TEXT[],
  status TEXT,
  promoted_to_lead_id UUID,
  promoted_at TIMESTAMPTZ,
  consent_marketing BOOLEAN,
  unsubscribed_at TIMESTAMPTZ,
  raw_data JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  workspace_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check
  IF NOT has_cockpit_access() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT v.*
  FROM viviers v
  WHERE 
    CASE p_filter_type
      WHEN 'source' THEN v.source = p_filter_value
      WHEN 'status' THEN v.status = p_filter_value
      WHEN 'company_size' THEN v.company_size = p_filter_value
      WHEN 'score_range' THEN 
        (p_min_score IS NULL OR v.cold_score >= p_min_score) AND
        (p_max_score IS NULL OR v.cold_score <= p_max_score)
      WHEN 'has_email' THEN v.email IS NOT NULL AND v.email <> ''
      WHEN 'has_phone' THEN v.phone IS NOT NULL AND v.phone <> ''
      WHEN 'has_score' THEN v.cold_score IS NOT NULL
      WHEN 'no_score' THEN v.cold_score IS NULL
      ELSE TRUE
    END
  ORDER BY
    CASE WHEN p_order_dir = 'desc' THEN
      CASE p_order_by
        WHEN 'created_at' THEN v.created_at
        WHEN 'cold_score' THEN v.cold_score::TEXT::TIMESTAMPTZ
      END
    END DESC NULLS LAST,
    CASE WHEN p_order_dir = 'asc' THEN
      CASE p_order_by
        WHEN 'created_at' THEN v.created_at
        WHEN 'cold_score' THEN v.cold_score::TEXT::TIMESTAMPTZ
      END
    END ASC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Count function for single-filter queries
CREATE OR REPLACE FUNCTION public.count_viviers_by_filter(
  p_filter_type TEXT,
  p_filter_value TEXT DEFAULT NULL,
  p_min_score INTEGER DEFAULT NULL,
  p_max_score INTEGER DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result BIGINT;
BEGIN
  -- Security check
  IF NOT has_cockpit_access() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COUNT(*)
  INTO result
  FROM viviers v
  WHERE 
    CASE p_filter_type
      WHEN 'source' THEN v.source = p_filter_value
      WHEN 'status' THEN v.status = p_filter_value
      WHEN 'company_size' THEN v.company_size = p_filter_value
      WHEN 'score_range' THEN 
        (p_min_score IS NULL OR v.cold_score >= p_min_score) AND
        (p_max_score IS NULL OR v.cold_score <= p_max_score)
      WHEN 'has_email' THEN v.email IS NOT NULL AND v.email <> ''
      WHEN 'has_phone' THEN v.phone IS NOT NULL AND v.phone <> ''
      WHEN 'has_score' THEN v.cold_score IS NOT NULL
      WHEN 'no_score' THEN v.cold_score IS NULL
      ELSE TRUE
    END;

  RETURN result;
END;
$$;

-- Create indexes for these filter columns if not already present
CREATE INDEX IF NOT EXISTS idx_viviers_source ON public.viviers(source);
CREATE INDEX IF NOT EXISTS idx_viviers_status ON public.viviers(status);
CREATE INDEX IF NOT EXISTS idx_viviers_company_size ON public.viviers(company_size);
CREATE INDEX IF NOT EXISTS idx_viviers_cold_score ON public.viviers(cold_score);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_viviers_by_filter TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_viviers_by_filter TO authenticated;