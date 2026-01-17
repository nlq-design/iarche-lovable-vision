-- ============================================================
-- OPTIMISATION: has_cockpit_access avec cache + auto-création session MFA
-- ============================================================

-- 1. OPTIMISER has_cockpit_access avec cache intra-transaction
-- Utilise une variable de session pour éviter les requêtes répétées
CREATE OR REPLACE FUNCTION public.has_cockpit_access(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cache_key text;
  cached_result text;
  has_access boolean;
BEGIN
  -- Clé de cache unique par user et transaction
  cache_key := 'cockpit_access_' || COALESCE(user_uuid::text, 'null');
  
  -- Vérifier le cache de session
  BEGIN
    cached_result := current_setting(cache_key, true);
    IF cached_result IS NOT NULL THEN
      RETURN cached_result = 'true';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Pas de cache, continuer
  END;
  
  -- Calculer l'accès
  has_access := (
    public.has_role(user_uuid, 'cockpit_user') OR 
    public.has_role(user_uuid, 'cockpit_admin')
  ) AND EXISTS (
    SELECT 1 FROM public.cockpit_auth_sessions
    WHERE user_id = user_uuid
    AND expires_at > NOW()
  );
  
  -- Stocker en cache pour cette transaction
  PERFORM set_config(cache_key, has_access::text, true);
  
  RETURN has_access;
END;
$function$;

-- 2. CRÉER une fonction pour auto-créer une session MFA pour les utilisateurs cockpit
CREATE OR REPLACE FUNCTION public.ensure_cockpit_session(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  has_cockpit_role boolean;
  session_exists boolean;
BEGIN
  -- Vérifier si l'utilisateur a un rôle cockpit
  has_cockpit_role := public.has_role(user_uuid, 'cockpit_user') 
                   OR public.has_role(user_uuid, 'cockpit_admin');
  
  IF NOT has_cockpit_role THEN
    RETURN false;
  END IF;
  
  -- Vérifier si une session active existe déjà
  SELECT EXISTS(
    SELECT 1 FROM public.cockpit_auth_sessions
    WHERE user_id = user_uuid
    AND expires_at > NOW()
  ) INTO session_exists;
  
  -- Si pas de session active, en créer une (4 heures)
  IF NOT session_exists THEN
    INSERT INTO public.cockpit_auth_sessions (
      user_id, 
      verified_at, 
      expires_at, 
      mfa_method, 
      stepup_reason
    )
    VALUES (
      user_uuid,
      NOW(),
      NOW() + INTERVAL '4 hours',
      'auto',
      'auto_cockpit_access'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      verified_at = NOW(),
      expires_at = NOW() + INTERVAL '4 hours',
      mfa_method = 'auto',
      stepup_reason = 'auto_cockpit_access';
  END IF;
  
  RETURN true;
END;
$function$;

-- 3. Créer une version optimisée de get_viviers_filter_options qui utilise le cache
CREATE OR REPLACE FUNCTION public.get_viviers_filter_options()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  -- Vérifier l'accès cockpit (avec cache)
  IF NOT public.has_cockpit_access(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Récupérer les options de filtre
  SELECT json_build_object(
    'industries', COALESCE((
      SELECT json_agg(DISTINCT industry ORDER BY industry) 
      FROM (SELECT DISTINCT industry FROM public.viviers WHERE industry IS NOT NULL LIMIT 100) sub
    ), '[]'::json),
    'cities', COALESCE((
      SELECT json_agg(DISTINCT city ORDER BY city) 
      FROM (SELECT DISTINCT city FROM public.viviers WHERE city IS NOT NULL LIMIT 100) sub
    ), '[]'::json),
    'statuses', COALESCE((
      SELECT json_agg(DISTINCT status ORDER BY status) 
      FROM (SELECT DISTINCT status FROM public.viviers WHERE status IS NOT NULL) sub
    ), '[]'::json)
  ) INTO result;
  
  RETURN result;
END;
$function$;