
-- Fix has_cockpit_access to use fixed config parameter name
CREATE OR REPLACE FUNCTION public.has_cockpit_access(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cached_value text;
  has_access boolean;
  cached_user_id text;
BEGIN
  -- Check if we have a cached result for this user in this transaction
  BEGIN
    cached_value := current_setting('app.cockpit_access_result', true);
    cached_user_id := current_setting('app.cockpit_access_user', true);
    
    -- Return cached value if it's for the same user
    IF cached_user_id = user_uuid::text AND cached_value IS NOT NULL THEN
      RETURN cached_value = 'true';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Parameter doesn't exist yet, continue to check
    NULL;
  END;

  -- Check cockpit access
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = user_uuid
    AND role IN ('admin', 'cockpit_user')
  ) AND EXISTS (
    SELECT 1 FROM public.cockpit_auth_sessions
    WHERE cockpit_auth_sessions.user_id = user_uuid
    AND expires_at > now()
  ) INTO has_access;

  -- Cache the result for this transaction using fixed parameter names
  PERFORM set_config('app.cockpit_access_result', has_access::text, true);
  PERFORM set_config('app.cockpit_access_user', user_uuid::text, true);

  RETURN has_access;
END;
$$;
