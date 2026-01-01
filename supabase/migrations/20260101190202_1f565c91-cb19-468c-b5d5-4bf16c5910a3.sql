-- Cascade-safe deletion helpers for Cockpit/Admin

CREATE OR REPLACE FUNCTION public.delete_project_cascade(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  SELECT workspace_id
  INTO v_workspace_id
  FROM public.projects
  WHERE id = p_project_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF NOT public.can_access_entity_workspace(v_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- meeting_notes.project_id has a NO ACTION FK, so it must be deleted first
  DELETE FROM public.meeting_notes WHERE project_id = p_project_id;

  -- other dependent tables are already ON DELETE CASCADE / SET NULL
  DELETE FROM public.projects WHERE id = p_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_project_cascade(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_project_cascade(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.delete_lead_cascade(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_opportunity_ids uuid[];
  v_project_ids uuid[];
  v_project_id uuid;
BEGIN
  -- Leads contain PII: restrict to Admin or Cockpit access users
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_cockpit_access(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Collect opportunities for this lead
  SELECT array_agg(id)
  INTO v_opportunity_ids
  FROM public.opportunities
  WHERE lead_id = p_lead_id;

  IF v_opportunity_ids IS NOT NULL THEN
    -- Projects reference opportunities with NO ACTION FK, so delete projects first
    SELECT array_agg(id)
    INTO v_project_ids
    FROM public.projects
    WHERE opportunity_id = ANY(v_opportunity_ids);

    IF v_project_ids IS NOT NULL THEN
      FOREACH v_project_id IN ARRAY v_project_ids
      LOOP
        PERFORM public.delete_project_cascade(v_project_id);
      END LOOP;
    END IF;

    -- meeting_notes.opportunity_id is NO ACTION FK, so delete them before opportunities
    DELETE FROM public.meeting_notes WHERE opportunity_id = ANY(v_opportunity_ids);

    -- Now delete opportunities (tasks/activity_log cascade, generated_documents set null)
    DELETE FROM public.opportunities WHERE id = ANY(v_opportunity_ids);
  END IF;

  -- Finally delete the lead (tasks/activity_log cascade, projects lead_id set null, bookings/docs/transcriptions set null)
  DELETE FROM public.leads WHERE id = p_lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_lead_cascade(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_lead_cascade(uuid) TO authenticated;
