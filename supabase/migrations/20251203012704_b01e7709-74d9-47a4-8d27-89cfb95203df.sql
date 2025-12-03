-- Drop and recreate form_responses INSERT policy as PERMISSIVE
DROP POLICY IF EXISTS "Public peut soumettre responses" ON public.form_responses;

CREATE POLICY "Public peut soumettre responses" 
ON public.form_responses 
AS PERMISSIVE
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Drop and recreate form_analytics INSERT policy as PERMISSIVE
DROP POLICY IF EXISTS "Public peut soumettre analytics" ON public.form_analytics;
DROP POLICY IF EXISTS "Allow public insert on form_analytics" ON public.form_analytics;

CREATE POLICY "Public peut soumettre analytics" 
ON public.form_analytics 
AS PERMISSIVE
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);