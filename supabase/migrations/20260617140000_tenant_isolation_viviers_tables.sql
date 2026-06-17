-- ════════════════════════════════════════════════════════════════════════
-- P0 / Étape 3a — Isolation des tables viviers (accès direct / MCP / edge)
--
-- AVANT : policies FOR ALL basées sur has_cockpit_access(uid) → tout user
-- cockpit gère TOUS les viviers, tous locataires confondus.
-- APRÈS : accès si rôle HQ IArche (admin/cockpit_admin) OU membre du workspace
-- du vivier. (L'équipe IArche est membre de …001 → accès inchangé pour Nick.)
--
-- NB : le module vivier de l'UI passe surtout par des RPC SECURITY DEFINER
-- (get_viviers_*, count_viviers_*, search_viviers_*) qui contournent la RLS.
-- Leur isolation est traitée dans un lot dédié (#3b). Cette migration sécurise
-- l'accès DIRECT à la table (front direct, MCP, edge functions).
-- ════════════════════════════════════════════════════════════════════════

-- ── viviers ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Cockpit users can manage viviers" ON public.viviers;
CREATE POLICY "Workspace members manage viviers"
ON public.viviers
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'cockpit_admin')
  OR public.is_workspace_member(workspace_id, auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'cockpit_admin')
  OR public.is_workspace_member(workspace_id, auth.uid())
);

-- ── vivier_imports ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Cockpit users can manage vivier_imports" ON public.vivier_imports;
CREATE POLICY "Workspace members manage vivier_imports"
ON public.vivier_imports
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'cockpit_admin')
  OR public.is_workspace_member(workspace_id, auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'cockpit_admin')
  OR public.is_workspace_member(workspace_id, auth.uid())
);
