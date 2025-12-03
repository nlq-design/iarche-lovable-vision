-- Supprimer l'ancienne politique INSERT incorrecte
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;

-- Créer la nouvelle politique INSERT avec les bons rôles (anon et authenticated)
CREATE POLICY "Public peut créer leads" 
ON public.leads 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);