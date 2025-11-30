-- Allow admins to view newsletter subscribers
CREATE POLICY "Admins can view newsletter subscribers"
ON public.newsletter_subscribers
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view contacts
CREATE POLICY "Admins can view contacts"
ON public.contacts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));