-- Reduce SECURITY DEFINER exposure by moving public form counters to RLS-guarded SECURITY INVOKER functions

-- 1) Trigger to ensure non-admin updates on forms can ONLY increment counters
CREATE OR REPLACE FUNCTION public.restrict_forms_counter_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_data jsonb;
  old_data jsonb;
BEGIN
  -- Admins can update any fields as usual
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
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

DROP TRIGGER IF EXISTS trg_restrict_forms_counter_updates ON public.forms;
CREATE TRIGGER trg_restrict_forms_counter_updates
BEFORE UPDATE ON public.forms
FOR EACH ROW
EXECUTE FUNCTION public.restrict_forms_counter_updates();

-- 2) RLS policy to allow public UPDATE on active forms (guarded by trigger)
DROP POLICY IF EXISTS "Public can update form counters" ON public.forms;
CREATE POLICY "Public can update form counters"
ON public.forms
FOR UPDATE
TO anon, authenticated
USING (is_active = true)
WITH CHECK (is_active = true);

-- 3) Recreate RPC counter functions as SECURITY INVOKER (so RLS applies)
CREATE OR REPLACE FUNCTION public.increment_form_views(form_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.forms
  SET views_count = views_count + 1
  WHERE slug = form_slug
    AND is_active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_form_submissions(form_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.forms
  SET submissions_count = submissions_count + 1
  WHERE slug = form_slug
    AND is_active = true;
END;
$$;
