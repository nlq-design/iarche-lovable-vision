-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Insertion publique responses" ON public.form_responses;

-- Create a PERMISSIVE INSERT policy (default behavior)
CREATE POLICY "Public peut soumettre responses" 
ON public.form_responses 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);