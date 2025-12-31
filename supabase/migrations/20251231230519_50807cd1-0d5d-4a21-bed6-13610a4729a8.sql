-- Ajouter politique UPDATE pour permettre upsert par anon/authenticated
CREATE POLICY "Public peut mettre à jour leads via upsert" 
ON public.leads 
FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (true);