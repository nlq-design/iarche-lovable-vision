-- Supprimer les politiques restrictives existantes pour contacts INSERT
DROP POLICY IF EXISTS "Allow public insert on contacts" ON public.contacts;
DROP POLICY IF EXISTS "Public peut soumettre contacts" ON public.contacts;

-- Créer une politique PERMISSIVE pour les insertions publiques
CREATE POLICY "Public insert contacts permissive" 
ON public.contacts 
AS PERMISSIVE
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);