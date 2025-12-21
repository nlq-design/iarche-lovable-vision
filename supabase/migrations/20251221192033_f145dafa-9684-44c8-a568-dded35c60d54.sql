-- ============================================
-- PHASE 1B: COCKPIT FOUNDATION TABLES
-- ============================================

-- 1. Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'internal',
  description TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT workspaces_type_check CHECK (type IN ('internal', 'partner', 'client'))
);

CREATE INDEX IF NOT EXISTS idx_workspaces_type ON public.workspaces(type);

-- 2. Create workspace_members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id),
  CONSTRAINT workspace_members_role_check CHECK (role IN ('owner', 'editor', 'viewer'))
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);

-- 3. Insert default workspace
INSERT INTO public.workspaces (id, name, type, description)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'IArche Interne',
  'internal',
  'Espace de travail interne équipe IArche'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Auto-insert creator as owner on workspace creation
CREATE OR REPLACE FUNCTION public.auto_insert_workspace_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role, invited_by)
    VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_insert_workspace_owner_trigger ON public.workspaces;
CREATE TRIGGER auto_insert_workspace_owner_trigger
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.auto_insert_workspace_owner();

-- 5. Create cockpit_auth_sessions table (step-up MFA)
CREATE TABLE IF NOT EXISTS public.cockpit_auth_sessions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  mfa_method TEXT DEFAULT 'totp',
  stepup_reason TEXT DEFAULT 'cockpit_access',
  ip_hash TEXT,
  ua_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_cockpit_auth_expires ON public.cockpit_auth_sessions(expires_at);

-- 6. Create cockpit_mfa_attempts table (rate limiting)
CREATE TABLE IF NOT EXISTS public.cockpit_mfa_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  attempted_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN NOT NULL,
  ip_hash TEXT,
  failure_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_cockpit_mfa_attempts_ratelimit 
  ON public.cockpit_mfa_attempts(user_id, attempted_at DESC) 
  WHERE success = false;

-- 7. Helper function: has_cockpit_access
CREATE OR REPLACE FUNCTION public.has_cockpit_access(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.has_role(user_uuid, 'cockpit_user') OR public.has_role(user_uuid, 'cockpit_admin');
END;
$$;

-- 8. Helper function: is_workspace_member
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  );
END;
$$;

-- 9. Helper function: has_workspace_role
CREATE OR REPLACE FUNCTION public.has_workspace_role(p_workspace_id UUID, p_user_id UUID, p_min_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_role_order INTEGER;
  v_min_order INTEGER;
BEGIN
  SELECT role INTO v_role 
  FROM public.workspace_members 
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  IF v_role IS NULL THEN RETURN FALSE; END IF;
  
  v_role_order := CASE v_role WHEN 'owner' THEN 3 WHEN 'editor' THEN 2 WHEN 'viewer' THEN 1 ELSE 0 END;
  v_min_order := CASE p_min_role WHEN 'owner' THEN 3 WHEN 'editor' THEN 2 WHEN 'viewer' THEN 1 ELSE 0 END;
  
  RETURN v_role_order >= v_min_order;
END;
$$;

-- 10. Helper function: can_access_workspace
CREATE OR REPLACE FUNCTION public.can_access_workspace(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_type TEXT;
BEGIN
  IF public.has_role(p_user_id, 'cockpit_admin') THEN RETURN TRUE; END IF;
  IF public.is_workspace_member(p_workspace_id, p_user_id) THEN RETURN TRUE; END IF;
  
  SELECT type INTO v_workspace_type FROM public.workspaces WHERE id = p_workspace_id;
  IF v_workspace_type = 'internal' AND public.has_cockpit_access(p_user_id) THEN RETURN TRUE; END IF;
  
  RETURN FALSE;
END;
$$;

-- 11. Rate limit check function
CREATE OR REPLACE FUNCTION public.check_cockpit_mfa_rate_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM public.cockpit_mfa_attempts
  WHERE user_id = p_user_id 
    AND attempted_at > now() - INTERVAL '5 minutes'
    AND success = false;
  
  RETURN attempt_count < 3;
END;
$$;

-- 12. Cleanup function for expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_cockpit_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.cockpit_mfa_attempts WHERE attempted_at < now() - INTERVAL '24 hours';
  DELETE FROM public.cockpit_auth_sessions WHERE expires_at < now() - INTERVAL '7 days';
END;
$$;

-- 13. Enable RLS on all new tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cockpit_auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cockpit_mfa_attempts ENABLE ROW LEVEL SECURITY;

-- 14. RLS Policies for workspaces
CREATE POLICY "workspaces_select" ON public.workspaces FOR SELECT USING (
  public.has_role(auth.uid(), 'cockpit_admin')
  OR public.is_workspace_member(id, auth.uid())
  OR (type = 'internal' AND public.has_cockpit_access(auth.uid()))
);

CREATE POLICY "workspaces_insert" ON public.workspaces FOR INSERT 
  WITH CHECK (public.has_cockpit_access(auth.uid()));

CREATE POLICY "workspaces_update" ON public.workspaces FOR UPDATE 
  USING (public.has_workspace_role(id, auth.uid(), 'owner') OR public.has_role(auth.uid(), 'cockpit_admin'))
  WITH CHECK (public.has_workspace_role(id, auth.uid(), 'owner') OR public.has_role(auth.uid(), 'cockpit_admin'));

CREATE POLICY "workspaces_delete" ON public.workspaces FOR DELETE 
  USING (public.has_role(auth.uid(), 'cockpit_admin'));

-- 15. RLS Policies for workspace_members
CREATE POLICY "workspace_members_select" ON public.workspace_members FOR SELECT USING (
  public.has_role(auth.uid(), 'cockpit_admin') OR public.is_workspace_member(workspace_id, auth.uid())
);

CREATE POLICY "workspace_members_insert" ON public.workspace_members FOR INSERT 
  WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), 'owner') OR public.has_role(auth.uid(), 'cockpit_admin'));

CREATE POLICY "workspace_members_update" ON public.workspace_members FOR UPDATE 
  USING (public.has_workspace_role(workspace_id, auth.uid(), 'owner') OR public.has_role(auth.uid(), 'cockpit_admin'))
  WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), 'owner') OR public.has_role(auth.uid(), 'cockpit_admin'));

CREATE POLICY "workspace_members_delete" ON public.workspace_members FOR DELETE 
  USING (public.has_workspace_role(workspace_id, auth.uid(), 'owner') OR public.has_role(auth.uid(), 'cockpit_admin'));

-- 16. RLS Policies for cockpit_auth_sessions (user can only access own session)
CREATE POLICY "cockpit_auth_own_session" ON public.cockpit_auth_sessions 
  FOR ALL USING (auth.uid() = user_id);

-- 17. RLS Policies for cockpit_mfa_attempts (user can only access own attempts)
CREATE POLICY "cockpit_mfa_own_attempts" ON public.cockpit_mfa_attempts 
  FOR ALL USING (auth.uid() = user_id);