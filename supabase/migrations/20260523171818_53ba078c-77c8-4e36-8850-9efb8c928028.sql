-- Ajoute une policy SELECT directe : un utilisateur voit toujours ses propres lignes de workspace_members
-- (évite tout edge-case sur le helper is_workspace_member en contexte PostgREST)
CREATE POLICY "workspace_members_select_self"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());