-- Add text_pattern_ops indexes for fast prefix searches on filter columns
CREATE INDEX IF NOT EXISTS idx_viviers_company_name_pattern ON public.viviers (company_name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_viviers_industry_pattern ON public.viviers (industry text_pattern_ops);

-- Create optimized RPC for filter options that bypasses RLS overhead
CREATE OR REPLACE FUNCTION public.get_viviers_filter_options(
  p_department TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 200
)
RETURNS TABLE(
  option_type TEXT,
  option_value TEXT
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

  -- Return companies
  RETURN QUERY
  SELECT 'company'::TEXT, v.company_name
  FROM (
    SELECT DISTINCT company_name
    FROM viviers
    WHERE company_name IS NOT NULL
      AND company_name <> ''
      AND (p_department IS NULL OR 
           CASE 
             WHEN LENGTH(p_department) = 3 THEN LEFT(postal_code, 3) = p_department
             ELSE LEFT(postal_code, 2) = p_department
           END)
    ORDER BY company_name
    LIMIT p_limit
  ) v;

  -- Return cities
  RETURN QUERY
  SELECT 'city'::TEXT, v.city
  FROM (
    SELECT DISTINCT city
    FROM viviers
    WHERE city IS NOT NULL
      AND city <> ''
      AND (p_department IS NULL OR 
           CASE 
             WHEN LENGTH(p_department) = 3 THEN LEFT(postal_code, 3) = p_department
             ELSE LEFT(postal_code, 2) = p_department
           END)
    ORDER BY city
    LIMIT p_limit
  ) v;

  -- Return industries
  RETURN QUERY
  SELECT 'industry'::TEXT, v.industry
  FROM (
    SELECT DISTINCT industry
    FROM viviers
    WHERE industry IS NOT NULL
      AND industry <> ''
      AND (p_department IS NULL OR 
           CASE 
             WHEN LENGTH(p_department) = 3 THEN LEFT(postal_code, 3) = p_department
             ELSE LEFT(postal_code, 2) = p_department
           END)
    ORDER BY industry
    LIMIT p_limit
  ) v;
END;
$$;