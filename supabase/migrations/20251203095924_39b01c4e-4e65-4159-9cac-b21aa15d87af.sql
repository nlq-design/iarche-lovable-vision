-- Ajouter une politique RLS pour permettre les insertions publiques sur contacts
CREATE POLICY "Public peut soumettre contacts" 
ON public.contacts 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);