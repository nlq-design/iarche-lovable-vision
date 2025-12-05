-- 1. Supprimer la politique qui expose form_responses au public
DROP POLICY IF EXISTS "Public peut voir sa réponse après insertion" ON public.form_responses;

-- 2. Assurer que bookings n'a que des politiques admin pour SELECT
-- Vérifier et créer une politique SELECT admin-only si absente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bookings' 
    AND policyname = 'Admins can view all bookings'
  ) THEN
    CREATE POLICY "Admins can view all bookings"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- 3. S'assurer qu'aucune politique SELECT publique n'existe sur bookings
DROP POLICY IF EXISTS "Public can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public peut voir bookings" ON public.bookings;