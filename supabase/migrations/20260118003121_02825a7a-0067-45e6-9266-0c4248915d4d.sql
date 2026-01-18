-- Fix RLS infinite recursion between projects <-> project_partners

-- Helper: get a project's workspace_id without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_project_workspace_id(p_project_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id
  FROM public.projects
  WHERE id = p_project_id;
$$;

-- Helper: check if a user is linked as partner to a project (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_project_partner(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_partners pp
    JOIN public.partners p ON p.id = pp.partner_id
    WHERE pp.project_id = p_project_id
      AND p.user_id = p_user_id
  );
$$;

-- Rework project_partners policies to avoid querying projects (which can recurse)
DROP POLICY IF EXISTS project_partners_select ON public.project_partners;
DROP POLICY IF EXISTS project_partners_insert ON public.project_partners;
DROP POLICY IF EXISTS project_partners_delete ON public.project_partners;

CREATE POLICY project_partners_select
ON public.project_partners
FOR SELECT
USING (
  public.can_access_entity_workspace(public.get_project_workspace_id(project_id), auth.uid())
  OR public.is_project_partner(project_id, auth.uid())
);

CREATE POLICY project_partners_insert
ON public.project_partners
FOR INSERT
WITH CHECK (
  public.can_access_entity_workspace(public.get_project_workspace_id(project_id), auth.uid())
);

CREATE POLICY project_partners_delete
ON public.project_partners
FOR DELETE
USING (
  public.can_access_entity_workspace(public.get_project_workspace_id(project_id), auth.uid())
);

-- Rework projects partner policy to avoid joining project_partners (which now also references projects)
DROP POLICY IF EXISTS "Partner sees linked projects" ON public.projects;

CREATE POLICY "Partner sees linked projects"
ON public.projects
FOR SELECT
USING (
  public.is_partner_user()
  AND public.is_project_partner(id, auth.uid())
);
