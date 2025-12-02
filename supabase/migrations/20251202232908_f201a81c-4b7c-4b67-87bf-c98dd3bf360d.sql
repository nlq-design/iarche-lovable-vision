-- Corriger la policy SELECT pour les formulaires publics
DROP POLICY IF EXISTS "Forms actifs lisibles publiquement" ON forms;

CREATE POLICY "Forms actifs lisibles publiquement" 
ON forms 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);