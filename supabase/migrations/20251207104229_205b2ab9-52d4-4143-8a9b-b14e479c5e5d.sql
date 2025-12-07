-- Drop all existing SELECT policies on newsletter_subscribers
DROP POLICY IF EXISTS "Admins can view newsletter subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Allow public insert on newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Public can view newsletter subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can view newsletter subscribers" ON public.newsletter_subscribers;

-- Recreate admin-only SELECT policy
CREATE POLICY "Admins can view newsletter subscribers" 
ON public.newsletter_subscribers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Recreate public INSERT policy (needed for newsletter signup)
CREATE POLICY "Public can subscribe to newsletter" 
ON public.newsletter_subscribers 
FOR INSERT 
WITH CHECK (true);

-- Add admin DELETE policy for subscriber management
CREATE POLICY "Admins can delete newsletter subscribers" 
ON public.newsletter_subscribers 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));