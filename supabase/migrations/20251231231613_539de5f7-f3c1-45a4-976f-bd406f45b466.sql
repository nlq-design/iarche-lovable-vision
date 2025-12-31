-- Supprimer la policy restrictive et la recréer en mode permissive
DROP POLICY IF EXISTS "Admins can view contacts" ON public.contacts;

CREATE POLICY "Admins can view contacts" 
ON public.contacts 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));