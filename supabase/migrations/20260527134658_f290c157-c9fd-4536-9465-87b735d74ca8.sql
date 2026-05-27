
-- 1) get_viviers_stats : ajout gardes auth + cockpit access (filtre workspace déjà en place)
CREATE OR REPLACE FUNCTION public.get_viviers_stats()
 RETURNS TABLE(total_leads bigint, pending_scoring bigint, qualified bigint, promoted bigint, scored bigint)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.has_cockpit_access(v_uid) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  v_is_admin := public.has_role(v_uid, 'super_admin'::app_role);

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM viviers v WHERE v_is_admin OR public.is_workspace_member(v.workspace_id, v_uid))::bigint,
    (SELECT count(*) FROM viviers v WHERE (v_is_admin OR public.is_workspace_member(v.workspace_id, v_uid)) AND v.cold_score IS NULL AND (v.status IS NULL OR v.status != 'promoted'))::bigint,
    (SELECT count(*) FROM viviers v WHERE (v_is_admin OR public.is_workspace_member(v.workspace_id, v_uid)) AND v.cold_score >= 60)::bigint,
    (SELECT count(*) FROM viviers v WHERE (v_is_admin OR public.is_workspace_member(v.workspace_id, v_uid)) AND v.status = 'promoted')::bigint,
    (SELECT count(*) FROM viviers v WHERE (v_is_admin OR public.is_workspace_member(v.workspace_id, v_uid)) AND v.cold_score IS NOT NULL)::bigint;
END;
$function$;

-- 2) get_viviers_filter_options(p_department, p_limit) : ajout filtre workspace
CREATE OR REPLACE FUNCTION public.get_viviers_filter_options(p_department text DEFAULT NULL::text, p_limit integer DEFAULT 200)
 RETURNS TABLE(option_type text, option_value text)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT has_cockpit_access(v_uid) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  v_is_admin := public.has_role(v_uid, 'super_admin'::app_role);

  RETURN QUERY
  SELECT 'company'::TEXT, sub.company_name
  FROM (
    SELECT DISTINCT company_name
    FROM viviers v
    WHERE company_name IS NOT NULL AND company_name <> ''
      AND (v_is_admin OR public.is_workspace_member(v.workspace_id, v_uid))
      AND (p_department IS NULL OR 
           CASE WHEN LENGTH(p_department) = 3 THEN LEFT(postal_code, 3) = p_department
                ELSE LEFT(postal_code, 2) = p_department END)
    ORDER BY company_name
    LIMIT p_limit
  ) sub;

  RETURN QUERY
  SELECT 'city'::TEXT, sub.city
  FROM (
    SELECT DISTINCT city
    FROM viviers v
    WHERE city IS NOT NULL AND city <> ''
      AND (v_is_admin OR public.is_workspace_member(v.workspace_id, v_uid))
      AND (p_department IS NULL OR 
           CASE WHEN LENGTH(p_department) = 3 THEN LEFT(postal_code, 3) = p_department
                ELSE LEFT(postal_code, 2) = p_department END)
    ORDER BY city
    LIMIT p_limit
  ) sub;

  RETURN QUERY
  SELECT 'industry'::TEXT, sub.industry
  FROM (
    SELECT DISTINCT industry
    FROM viviers v
    WHERE industry IS NOT NULL AND industry <> ''
      AND (v_is_admin OR public.is_workspace_member(v.workspace_id, v_uid))
      AND (p_department IS NULL OR 
           CASE WHEN LENGTH(p_department) = 3 THEN LEFT(postal_code, 3) = p_department
                ELSE LEFT(postal_code, 2) = p_department END)
    ORDER BY industry
    LIMIT p_limit
  ) sub;
END;
$function$;

-- 3) get_viviers_filter_options() (sans args, retourne json) : ajout filtre workspace
CREATE OR REPLACE FUNCTION public.get_viviers_filter_options()
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  result json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.has_cockpit_access(v_uid) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  v_is_admin := public.has_role(v_uid, 'super_admin'::app_role);

  SELECT json_build_object(
    'industries', COALESCE((
      SELECT json_agg(DISTINCT industry ORDER BY industry)
      FROM (
        SELECT DISTINCT industry FROM public.viviers v
        WHERE industry IS NOT NULL
          AND (v_is_admin OR public.is_workspace_member(v.workspace_id, v_uid))
        LIMIT 100
      ) sub
    ), '[]'::json),
    'cities', COALESCE((
      SELECT json_agg(DISTINCT city ORDER BY city)
      FROM (
        SELECT DISTINCT city FROM public.viviers v
        WHERE city IS NOT NULL
          AND (v_is_admin OR public.is_workspace_member(v.workspace_id, v_uid))
        LIMIT 100
      ) sub
    ), '[]'::json),
    'statuses', COALESCE((
      SELECT json_agg(DISTINCT status ORDER BY status)
      FROM (
        SELECT DISTINCT status FROM public.viviers v
        WHERE status IS NOT NULL
          AND (v_is_admin OR public.is_workspace_member(v.workspace_id, v_uid))
      ) sub
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$function$;

-- 4) get_viviers_departments : ajout garde + filtre workspace
CREATE OR REPLACE FUNCTION public.get_viviers_departments()
 RETURNS TABLE(department_code text)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.has_cockpit_access(v_uid) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  v_is_admin := public.has_role(v_uid, 'super_admin'::app_role);

  RETURN QUERY
  SELECT DISTINCT
    CASE
      WHEN LEFT(v.postal_code, 3) IN ('971','972','973','974','976') THEN LEFT(v.postal_code, 3)
      WHEN LEFT(v.postal_code, 2) = '20' THEN
        CASE WHEN CAST(v.postal_code AS INTEGER) BETWEEN 20000 AND 20190 THEN '2A' ELSE '2B' END
      ELSE LEFT(v.postal_code, 2)
    END AS department_code
  FROM viviers v
  WHERE v.postal_code IS NOT NULL
    AND v.postal_code <> ''
    AND LENGTH(v.postal_code) >= 2
    AND (v_is_admin OR public.is_workspace_member(v.workspace_id, v_uid))
  ORDER BY department_code;
END;
$function$;

-- Commentaire de scellement (norme anti-régression future)
COMMENT ON FUNCTION public.get_viviers_stats() IS
  'Multi-tenant safe: requires auth + cockpit access. Counters filtered by is_workspace_member OR super_admin. DO NOT remove these guards.';
COMMENT ON FUNCTION public.get_viviers_filter_options(text, integer) IS
  'Multi-tenant safe: requires auth + cockpit access. Options filtered by is_workspace_member OR super_admin.';
COMMENT ON FUNCTION public.get_viviers_filter_options() IS
  'Multi-tenant safe: requires auth + cockpit access. Options filtered by is_workspace_member OR super_admin.';
COMMENT ON FUNCTION public.get_viviers_departments() IS
  'Multi-tenant safe: requires auth + cockpit access. Departments filtered by is_workspace_member OR super_admin.';
