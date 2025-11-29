-- Fix RLS policy for cta_clicks to allow public inserts
DROP POLICY IF EXISTS "Anyone can insert cta clicks" ON public.cta_clicks;

CREATE POLICY "Anyone can insert cta clicks" 
ON public.cta_clicks 
AS PERMISSIVE
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);