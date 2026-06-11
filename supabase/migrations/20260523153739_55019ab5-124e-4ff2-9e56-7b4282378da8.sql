
-- Consolider rôles : super_admin = super-set (implique admin + cockpit_admin + cockpit_user)
-- Nettoyer mon compte : garder uniquement super_admin
DELETE FROM public.user_roles 
WHERE user_id = '89e12505-357d-4a7d-89da-42aec73206f4'
  AND role IN ('admin','cockpit_admin','cockpit_user');

-- S'assurer que super_admin existe (uniquement si le compte existe déjà —
-- migration autonome : auth.users est vide au moment du push, le rôle sera
-- (re)posé via l'import des données ou au 1er signup de l'owner).
INSERT INTO public.user_roles (user_id, role)
SELECT '89e12505-357d-4a7d-89da-42aec73206f4', 'super_admin'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = '89e12505-357d-4a7d-89da-42aec73206f4')
ON CONFLICT (user_id, role) DO NOTHING;

-- Mettre à jour has_role pour que super_admin implique tous les rôles cockpit/admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (role = 'super_admin' AND _role IN ('admin','cockpit_admin','cockpit_user'))
      )
  )
$$;
