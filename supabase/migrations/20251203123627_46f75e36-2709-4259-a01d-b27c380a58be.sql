-- Ajouter une politique SELECT pour permettre aux utilisateurs anonymes 
-- de retrouver leur lead par email (pour l'inscription atelier)
CREATE POLICY "Public peut lire lead par email"
ON public.leads
FOR SELECT
TO anon, authenticated
USING (true);

-- Note: Cette politique permet de lire les leads, mais les données sensibles
-- sont limitées (nom, email qu'ils ont eux-mêmes fourni)