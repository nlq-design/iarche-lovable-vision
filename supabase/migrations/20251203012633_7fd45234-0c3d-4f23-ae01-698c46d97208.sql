-- Drop existing INSERT policy for form_responses
DROP POLICY IF EXISTS "Public peut soumettre responses" ON public.form_responses;

-- Recreate with correct configuration
CREATE POLICY "Public peut soumettre responses" 
ON public.form_responses 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Also ensure form_analytics INSERT policy is correct
DROP POLICY IF EXISTS "Allow public insert on form_analytics" ON public.form_analytics;

CREATE POLICY "Public peut soumettre analytics" 
ON public.form_analytics 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);