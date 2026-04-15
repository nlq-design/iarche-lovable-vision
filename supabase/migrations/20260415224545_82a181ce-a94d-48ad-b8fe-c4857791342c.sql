CREATE OR REPLACE FUNCTION public.restrict_forms_counter_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_data jsonb;
  old_data jsonb;
BEGIN
  -- Admins can update any fields
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- service_role bypasses (MCP, edge functions)
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  new_data := to_jsonb(NEW);
  old_data := to_jsonb(OLD);

  -- Allow changes ONLY to: views_count, submissions_count, updated_at
  IF (new_data - 'views_count' - 'submissions_count' - 'updated_at') <>
     (old_data - 'views_count' - 'submissions_count' - 'updated_at') THEN
    RAISE EXCEPTION 'Only counter updates are allowed';
  END IF;

  -- Enforce monotonic +1 increments (or unchanged)
  IF NEW.views_count IS DISTINCT FROM OLD.views_count AND NEW.views_count <> OLD.views_count + 1 THEN
    RAISE EXCEPTION 'Invalid views_count increment';
  END IF;

  IF NEW.submissions_count IS DISTINCT FROM OLD.submissions_count AND NEW.submissions_count <> OLD.submissions_count + 1 THEN
    RAISE EXCEPTION 'Invalid submissions_count increment';
  END IF;

  RETURN NEW;
END;
$$;