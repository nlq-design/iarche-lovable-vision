-- Add text_pattern_ops index on city column for fast prefix searches
CREATE INDEX IF NOT EXISTS idx_viviers_city_pattern ON public.viviers (city text_pattern_ops);

-- Create optimized RPC for city search that bypasses RLS overhead
CREATE OR REPLACE FUNCTION public.search_viviers_cities(
  p_search TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(city TEXT)
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
  SELECT DISTINCT v.city
  FROM viviers v
  WHERE v.city IS NOT NULL
    AND v.city <> ''
    AND v.city LIKE (UPPER(p_search) || '%')
  ORDER BY v.city
  LIMIT p_limit;
END;
$$;