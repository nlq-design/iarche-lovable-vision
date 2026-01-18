
-- Fix can_access_workspace to recognize 'admin' role as having full access
CREATE OR REPLACE FUNCTION public.can_access_workspace(p_workspace_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_type TEXT;
BEGIN
  -- Admin or cockpit_admin has full access
  IF public.has_role(p_user_id, 'admin') THEN RETURN TRUE; END IF;
  IF public.has_role(p_user_id, 'cockpit_admin') THEN RETURN TRUE; END IF;
  
  -- Check workspace membership
  IF public.is_workspace_member(p_workspace_id, p_user_id) THEN RETURN TRUE; END IF;
  
  -- Cockpit users can access internal workspaces
  SELECT type INTO v_workspace_type FROM public.workspaces WHERE id = p_workspace_id;
  IF v_workspace_type = 'internal' AND public.has_cockpit_access(p_user_id) THEN RETURN TRUE; END IF;
  
  RETURN FALSE;
END;
$$;

-- Also fix has_cockpit_access to recognize 'admin' role
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
  -- Check if we have a cached result for this user in this transaction
  BEGIN
    cached_value := current_setting('app.cockpit_access_result', true);
    cached_user_id := current_setting('app.cockpit_access_user', true);
    
    -- Return cached value if it's for the same user
    IF cached_user_id = user_uuid::text AND cached_value IS NOT NULL THEN
      RETURN cached_value = 'true';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Check cockpit access: admin, cockpit_admin, or cockpit_user with active session
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = user_uuid
    AND role IN ('admin', 'cockpit_admin', 'cockpit_user')
  ) AND EXISTS (
    SELECT 1 FROM public.cockpit_auth_sessions
    WHERE cockpit_auth_sessions.user_id = user_uuid
    AND expires_at > now()
  ) INTO has_access;

  -- Cache the result
  PERFORM set_config('app.cockpit_access_result', has_access::text, true);
  PERFORM set_config('app.cockpit_access_user', user_uuid::text, true);

  RETURN has_access;
END;
$$;
