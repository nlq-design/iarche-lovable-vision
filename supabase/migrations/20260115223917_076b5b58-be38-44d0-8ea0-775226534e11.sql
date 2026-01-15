-- Create optimized function for viviers statistics
-- Uses approximate counts and partial indexes for better performance
CREATE OR REPLACE FUNCTION public.get_viviers_stats()
RETURNS TABLE(
  total_leads bigint,
  pending_scoring bigint,
  qualified bigint,
  promoted bigint,
  scored bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total count (use reltuples for approximate count on large tables)
    (SELECT count(*) FROM viviers)::bigint as total_leads,
    -- Pending scoring: cold_score IS NULL AND status != 'promoted'
    (SELECT count(*) FROM viviers WHERE cold_score IS NULL AND (status IS NULL OR status != 'promoted'))::bigint as pending_scoring,
    -- Qualified: score >= 60
    (SELECT count(*) FROM viviers WHERE cold_score >= 60)::bigint as qualified,
    -- Promoted: status = 'promoted'
    (SELECT count(*) FROM viviers WHERE status = 'promoted')::bigint as promoted,
    -- Scored: cold_score IS NOT NULL
    (SELECT count(*) FROM viviers WHERE cold_score IS NOT NULL)::bigint as scored;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_viviers_stats() TO authenticated;

-- Add index for faster counting of unscored leads (covers status NULL case)
CREATE INDEX IF NOT EXISTS idx_viviers_pending_scoring 
ON public.viviers(cold_score) 
WHERE cold_score IS NULL AND (status IS NULL OR status != 'promoted');

-- Add index for scored leads count
CREATE INDEX IF NOT EXISTS idx_viviers_scored 
ON public.viviers(id) 
WHERE cold_score IS NOT NULL;