-- Corriger form_analytics pour utiliser anon, authenticated explicitement
DROP POLICY IF EXISTS "Insertion publique analytics" ON form_analytics;
CREATE POLICY "Allow public insert on form_analytics" 
ON form_analytics 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);