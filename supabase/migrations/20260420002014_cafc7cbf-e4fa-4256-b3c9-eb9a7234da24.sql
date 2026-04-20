-- QW#8b - Add workspace_id on resource_embeddings + 4 RLS policies (bypass is_admin)
-- Forward migration

-- ÉTAPE 2 : ajout colonne workspace_id (nullable = entrée RAG globale)
ALTER TABLE public.resource_embeddings
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_resource_embeddings_workspace_id
  ON public.resource_embeddings (workspace_id);

-- ÉTAPE 3 : DROP des 2 anciennes policies
-- Ancienne 1 (rollback ref) : ALL "Admins can manage embeddings" qual=has_role(auth.uid(),'admin'::app_role) with_check=idem
-- Ancienne 2 (rollback ref) : SELECT "Cockpit users can read embeddings" qual=(has_role(auth.uid(),'cockpit_user') OR has_role(auth.uid(),'cockpit_admin'))
DROP POLICY IF EXISTS "Admins can manage embeddings" ON public.resource_embeddings;
DROP POLICY IF EXISTS "Cockpit users can read embeddings" ON public.resource_embeddings;

-- ÉTAPE 4 : 4 nouvelles policies (bypass is_admin partout)
CREATE POLICY "Users can view embeddings (global or workspace)"
ON public.resource_embeddings
FOR SELECT
TO authenticated
USING (
  workspace_id IS NULL
  OR public.is_admin()
  OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can insert embeddings"
ON public.resource_embeddings
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR (
    workspace_id IS NOT NULL
    AND workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Workspace members can update embeddings"
ON public.resource_embeddings
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR (
    workspace_id IS NOT NULL
    AND workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Only admins can delete embeddings"
ON public.resource_embeddings
FOR DELETE
TO authenticated
USING (public.is_admin());

-- =============================================================
-- ROLLBACK (à exécuter manuellement si besoin) :
-- =============================================================
-- ATTENTION: DROP COLUMN supprimera définitivement les liens workspace
-- créés après cette migration. Acceptable uniquement en rollback d'urgence.
--
-- DROP POLICY "Users can view embeddings (global or workspace)" ON public.resource_embeddings;
-- DROP POLICY "Workspace members can insert embeddings" ON public.resource_embeddings;
-- DROP POLICY "Workspace members can update embeddings" ON public.resource_embeddings;
-- DROP POLICY "Only admins can delete embeddings" ON public.resource_embeddings;
-- DROP INDEX IF EXISTS public.idx_resource_embeddings_workspace_id;
-- ALTER TABLE public.resource_embeddings DROP COLUMN IF EXISTS workspace_id;
-- CREATE POLICY "Admins can manage embeddings" ON public.resource_embeddings FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
-- CREATE POLICY "Cockpit users can read embeddings" ON public.resource_embeddings FOR SELECT TO authenticated USING (has_role(auth.uid(),'cockpit_user'::app_role) OR has_role(auth.uid(),'cockpit_admin'::app_role));