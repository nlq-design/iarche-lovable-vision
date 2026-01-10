-- RPC helper to look up existing viviers by email without URL-length limits
-- Uses SECURITY INVOKER so existing RLS policies still apply.

CREATE OR REPLACE FUNCTION public.viviers_lookup_existing_by_email(emails text[])
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH normalized AS (
    SELECT array_agg(lower(e)) AS emails
    FROM unnest(emails) AS e
    WHERE e IS NOT NULL AND btrim(e) <> ''
  )
  SELECT v.id, v.email
  FROM public.viviers v, normalized n
  WHERE v.email IS NOT NULL
    AND lower(v.email) = ANY (n.emails);
$$;

COMMENT ON FUNCTION public.viviers_lookup_existing_by_email(text[]) IS 'Lookup viviers by email in bulk (case-insensitive) for import duplicate detection.';