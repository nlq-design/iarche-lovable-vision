
-- Create trigger function for auto-linking partner to project
CREATE OR REPLACE FUNCTION public.auto_link_partner_to_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If project was created by a partner, auto-link them
  IF NEW.created_by_partner_id IS NOT NULL THEN
    INSERT INTO public.project_partners (project_id, partner_id, role)
    VALUES (NEW.id, NEW.created_by_partner_id, 'creator')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on projects table
DROP TRIGGER IF EXISTS auto_link_partner_to_project ON public.projects;
CREATE TRIGGER auto_link_partner_to_project
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_partner_to_project();

-- Also add partner access to can_access_workspace for the default workspace
-- Update can_access_workspace to recognize partners for the default workspace
CREATE OR REPLACE FUNCTION public.can_access_workspace(p_workspace_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
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
  
  -- Partners can access the default workspace for their projects/leads
  IF p_workspace_id = '00000000-0000-0000-0000-000000000001' AND public.has_role(p_user_id, 'partner') THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;
