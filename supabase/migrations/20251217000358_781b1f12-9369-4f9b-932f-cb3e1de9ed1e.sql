-- Fix contacts table public data exposure vulnerability
-- Drop existing policy and recreate as explicitly RESTRICTIVE

DROP POLICY IF EXISTS "Admins can view contacts" ON public.contacts;

CREATE POLICY "Admins can view contacts"
  ON public.contacts
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));