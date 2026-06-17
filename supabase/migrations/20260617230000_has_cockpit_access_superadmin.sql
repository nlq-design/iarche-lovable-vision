-- Fix : super_admin doit avoir l'accès cockpit (il en était absent → has_cockpit_access=FALSE
-- pour un super_admin, ce qui cassait get_viviers_stats et toutes les fonctions gardées
-- par has_cockpit_access). On ajoute 'super_admin' à la liste des rôles. Reste inchangé :
-- l'exigence de session cockpit active.
CREATE OR REPLACE FUNCTION public.has_cockpit_access(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cached_value text;
  has_access boolean;
  cached_user_id text;
BEGIN
  BEGIN
    cached_value := current_setting('app.cockpit_access_result', true);
    cached_user_id := current_setting('app.cockpit_access_user', true);
    IF cached_user_id = user_uuid::text AND cached_value IS NOT NULL THEN
      RETURN cached_value = 'true';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = user_uuid
    AND role IN ('admin', 'cockpit_admin', 'cockpit_user', 'super_admin')
  ) AND EXISTS (
    SELECT 1 FROM public.cockpit_auth_sessions
    WHERE cockpit_auth_sessions.user_id = user_uuid
    AND expires_at > now()
  ) INTO has_access;

  PERFORM set_config('app.cockpit_access_result', has_access::text, true);
  PERFORM set_config('app.cockpit_access_user', user_uuid::text, true);

  RETURN has_access;
END;
$$;

-- Revérif
do $$
declare v_uid uuid; v_access boolean; v_sessions int;
begin
  select id into v_uid from auth.users where lower(email)='nlq@nlq.fr' limit 1;
  select count(*) into v_sessions from public.cockpit_auth_sessions
    where user_id=v_uid and expires_at > now();
  select public.has_cockpit_access(v_uid) into v_access;
  raise notice 'DIAG has_cockpit_access=% sessions_actives=%', v_access, v_sessions;
end $$;
