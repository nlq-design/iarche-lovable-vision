-- Supprimer TOUTES les policies existantes sur form_responses
DROP POLICY IF EXISTS "Allow public insert on form_responses" ON form_responses;
DROP POLICY IF EXISTS "Allow authenticated read on form_responses" ON form_responses;
DROP POLICY IF EXISTS "Allow authenticated delete on form_responses" ON form_responses;

-- Recréer avec une syntaxe simplifiée et explicite
-- Policy INSERT pour tout le monde (pas de restriction de rôle)
CREATE POLICY "Public peut soumettre responses" 
ON form_responses 
FOR INSERT 
WITH CHECK (true);

-- Policy SELECT pour admin
CREATE POLICY "Admin peut voir responses" 
ON form_responses 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy DELETE pour admin  
CREATE POLICY "Admin peut supprimer responses" 
ON form_responses 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));