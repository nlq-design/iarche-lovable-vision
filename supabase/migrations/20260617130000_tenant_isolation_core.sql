-- ════════════════════════════════════════════════════════════════════════
-- P0 / Étape 2 — Isolation du cœur CRM (can_access_workspace)
--
-- ⚠️ CHANGE LE CONTRÔLE D'ACCÈS. À tester (test d'isolation) avant tout client.
-- Prérequis : migration 20260617120000 appliquée (équipe IArche membre de …001),
-- sinon risque de lock-out.
--
-- `can_access_workspace` garde les tables cœur du CRM : opportunities, projects,
-- tasks, meeting_notes, specifications, activity_log, project_contacts…
-- (via can_access_entity_workspace qui l'appelle).
--
-- AVANT : une clause accordait l'accès à TOUT workspace de type 'internal' à
-- TOUT utilisateur cockpit. Comme toutes les données vivent dans l'unique
-- workspace interne …001, cela signifiait : tout user cockpit voit tout.
-- C'est LE trou existentiel pour la revente. On le supprime.
--
-- APRÈS : accès uniquement si (a) rôle HQ IArche (admin/cockpit_admin — JAMAIS
-- attribué à un client), ou (b) membre du workspace. Les partenaires gardent
-- l'accès au workspace IArche …001 (contenu IArche, non cross-tenant).
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.can_access_workspace(p_workspace_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Rôles HQ IArche (holding / support multi-clients). NE JAMAIS attribuer à un locataire.
  IF public.has_role(p_user_id, 'admin') THEN RETURN TRUE; END IF;
  IF public.has_role(p_user_id, 'cockpit_admin') THEN RETURN TRUE; END IF;

  -- Accès standard : UNIQUEMENT si membre du workspace.
  IF public.is_workspace_member(p_workspace_id, p_user_id) THEN RETURN TRUE; END IF;

  -- ⛔ SUPPRIMÉ (trou d'isolation existentiel) :
  --   « workspace de type 'internal' accessible à tout user cockpit ».

  -- Partenaires : accès au workspace IArche …001 pour leurs leads/projets.
  -- (Contenu IArche, non cross-tenant. À généraliser quand les clients auront
  --  leurs propres partenaires.)
  IF p_workspace_id = '00000000-0000-0000-0000-000000000001'
     AND public.has_role(p_user_id, 'partner') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;
