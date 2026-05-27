
CREATE OR REPLACE FUNCTION public.get_viviers_stats()
RETURNS TABLE(total_leads bigint, pending_scoring bigint, qualified bigint, promoted bigint, scored bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean := public.has_role(auth.uid(), 'super_admin'::app_role);
BEGIN
  RETURN QUERY
  SELECT
    (SELECT count(*) FROM viviers v WHERE v_is_admin OR public.is_workspace_member(v.workspace_id, auth.uid()))::bigint,
    (SELECT count(*) FROM viviers v WHERE (v_is_admin OR public.is_workspace_member(v.workspace_id, auth.uid())) AND v.cold_score IS NULL AND (v.status IS NULL OR v.status != 'promoted'))::bigint,
    (SELECT count(*) FROM viviers v WHERE (v_is_admin OR public.is_workspace_member(v.workspace_id, auth.uid())) AND v.cold_score >= 60)::bigint,
    (SELECT count(*) FROM viviers v WHERE (v_is_admin OR public.is_workspace_member(v.workspace_id, auth.uid())) AND v.status = 'promoted')::bigint,
    (SELECT count(*) FROM viviers v WHERE (v_is_admin OR public.is_workspace_member(v.workspace_id, auth.uid())) AND v.cold_score IS NOT NULL)::bigint;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_viviers_cities(p_search text, p_limit integer DEFAULT 50)
RETURNS TABLE(city text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean := public.has_role(auth.uid(), 'super_admin'::app_role);
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
    AND (v_is_admin OR public.is_workspace_member(v.workspace_id, auth.uid()))
  ORDER BY v.city
  LIMIT p_limit;
END;
$function$;
