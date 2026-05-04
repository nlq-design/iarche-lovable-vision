-- M-sec : fonction is_super_admin + backfill

-- 2. Fonction PG is_super_admin (SECURITY DEFINER, STABLE)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'super_admin'::public.app_role)
$$;

-- 3. Backfill idempotent : tous les admins actuels deviennent aussi super_admin
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'super_admin'::public.app_role
FROM public.user_roles
WHERE role = 'admin'::public.app_role
ON CONFLICT (user_id, role) DO NOTHING;