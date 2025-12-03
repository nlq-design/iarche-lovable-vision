-- Supprimer l'ancienne politique INSERT incorrecte sur atelier_inscriptions
DROP POLICY IF EXISTS "Anyone can insert inscriptions" ON public.atelier_inscriptions;

-- Créer la nouvelle politique INSERT avec les bons rôles
CREATE POLICY "Public peut créer inscriptions" 
ON public.atelier_inscriptions 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);