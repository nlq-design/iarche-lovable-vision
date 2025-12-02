-- Supprimer la policy défectueuse
DROP POLICY IF EXISTS "Public peut soumettre responses" ON form_responses;

-- Recréer avec les bons rôles Supabase (anon = visiteurs, authenticated = connectés)
CREATE POLICY "Public peut soumettre responses" 
ON form_responses 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);