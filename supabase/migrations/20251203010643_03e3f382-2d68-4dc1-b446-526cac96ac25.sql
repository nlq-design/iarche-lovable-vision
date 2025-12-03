-- ========================================
-- FIX: Rendre les politiques INSERT PERMISSIVE
-- ========================================

-- form_responses: supprimer et recréer en PERMISSIVE
DROP POLICY IF EXISTS "Public peut soumettre responses" ON public.form_responses;

CREATE POLICY "Public peut soumettre responses"
ON public.form_responses
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- form_analytics: supprimer et recréer en PERMISSIVE
DROP POLICY IF EXISTS "Allow public insert on form_analytics" ON public.form_analytics;

CREATE POLICY "Allow public insert on form_analytics"
ON public.form_analytics
FOR INSERT
TO anon, authenticated
WITH CHECK (true);