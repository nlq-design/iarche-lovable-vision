-- M-sec : ajout du rôle super_admin (idempotent)

-- 1. Ajouter la valeur 'super_admin' à l'enum app_role si absente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'super_admin'
      AND enumtypid = 'public.app_role'::regtype
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'super_admin';
  END IF;
END $$;