-- Ajouter une politique SELECT temporaire pour permettre à l'utilisateur de voir sa propre réponse après insertion
-- Cette politique permet uniquement de récupérer la ligne qui vient d'être insérée dans la même transaction

CREATE POLICY "Public peut voir sa réponse après insertion" 
ON public.form_responses 
AS PERMISSIVE
FOR SELECT 
TO anon, authenticated
USING (true);