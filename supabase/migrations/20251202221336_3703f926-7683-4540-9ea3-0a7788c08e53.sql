-- Supprimer les policies existantes qui pourraient bloquer
DROP POLICY IF EXISTS "Insertion publique responses" ON form_responses;
DROP POLICY IF EXISTS "Admin full access responses" ON form_responses;
DROP POLICY IF EXISTS "Public peut soumettre responses" ON form_responses;
DROP POLICY IF EXISTS "Admin peut voir responses" ON form_responses;
DROP POLICY IF EXISTS "Admin peut supprimer responses" ON form_responses;

-- Créer la policy pour permettre l'insertion publique (anon + authenticated)
CREATE POLICY "Allow public insert on form_responses" 
ON form_responses 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Créer la policy pour permettre la lecture admin
CREATE POLICY "Allow authenticated read on form_responses" 
ON form_responses 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Créer la policy pour permettre la suppression admin
CREATE POLICY "Allow authenticated delete on form_responses" 
ON form_responses 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- S'assurer que RLS est bien activé
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;