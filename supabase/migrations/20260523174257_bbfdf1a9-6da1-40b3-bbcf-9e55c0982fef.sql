-- Lot 1: Étanchéité RLS cockpit — purge des policies legacy non scopées workspace

-- 1. PROJECTS — drop policy legacy ouverte à tout cockpit_user
DROP POLICY IF EXISTS "Cockpit users can view projects" ON public.projects;

-- 2. LEAD_CONTACTS — scoper via le workspace du lead parent
DROP POLICY IF EXISTS lead_contacts_select ON public.lead_contacts;
DROP POLICY IF EXISTS lead_contacts_update ON public.lead_contacts;
DROP POLICY IF EXISTS lead_contacts_delete ON public.lead_contacts;

CREATE POLICY lead_contacts_select ON public.lead_contacts
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_contacts.lead_id
      AND can_access_entity_workspace(l.workspace_id, auth.uid())
  )
);

CREATE POLICY lead_contacts_update ON public.lead_contacts
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_contacts.lead_id
      AND can_access_entity_workspace(l.workspace_id, auth.uid())
  )
);

CREATE POLICY lead_contacts_delete ON public.lead_contacts
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    has_role(auth.uid(), 'cockpit_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_contacts.lead_id
        AND can_access_entity_workspace(l.workspace_id, auth.uid())
    )
  )
);

-- 3. DELETE policies — scoper aussi pour cockpit_admin (super_admin garde l'accès global)
DROP POLICY IF EXISTS projects_delete ON public.projects;
CREATE POLICY projects_delete ON public.projects
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'cockpit_admin'::app_role) AND can_access_entity_workspace(workspace_id, auth.uid()))
);

DROP POLICY IF EXISTS opportunities_delete ON public.opportunities;
CREATE POLICY opportunities_delete ON public.opportunities
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'cockpit_admin'::app_role) AND can_access_entity_workspace(workspace_id, auth.uid()))
);

DROP POLICY IF EXISTS tasks_delete ON public.tasks;
CREATE POLICY tasks_delete ON public.tasks
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'cockpit_admin'::app_role) AND can_access_entity_workspace(workspace_id, auth.uid()))
);

DROP POLICY IF EXISTS project_documents_delete ON public.project_documents;
CREATE POLICY project_documents_delete ON public.project_documents
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'cockpit_admin'::app_role) AND can_access_entity_workspace(workspace_id, auth.uid()))
);

DROP POLICY IF EXISTS project_notes_delete ON public.project_notes;
CREATE POLICY project_notes_delete ON public.project_notes
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'cockpit_admin'::app_role) AND can_access_entity_workspace(workspace_id, auth.uid()))
);

DROP POLICY IF EXISTS project_contacts_delete ON public.project_contacts;
CREATE POLICY project_contacts_delete ON public.project_contacts
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    has_role(auth.uid(), 'cockpit_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_contacts.project_id
        AND can_access_entity_workspace(p.workspace_id, auth.uid())
    )
  )
);

-- 4. Helper NLQ interne (préparation Lot 2 — sanctuarisation /cockpit/solutions)
CREATE OR REPLACE FUNCTION public.is_nlq_internal_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.user_id = _user_id
      AND wm.workspace_id = '00000000-0000-0000-0000-000000000001'::uuid
  ) OR has_role(_user_id, 'super_admin'::app_role);
$$;