-- ════════════════════════════════════════════════════════════════════════
-- P0 / Étape 3b — Isolation des RPC viviers (SECURITY DEFINER → INVOKER)
--
-- Les fonctions get_viviers_* / count_viviers_* / search_viviers_* /
-- get_vivier_* étaient SECURITY DEFINER et requêtaient `viviers` SANS filtre
-- de locataire → elles renvoyaient les viviers de TOUS les workspaces.
--
-- En les passant SECURITY INVOKER, elles s'exécutent avec les droits de
-- l'appelant → la policy membership de `viviers` (#3a) s'applique
-- automatiquement. Aucun corps de fonction n'est réécrit.
--
-- ⚠️ À TESTER : smoke-test du module vivier après application (recherche,
-- filtres département/code postal, comptes, stats, listes, campagnes).
-- Rollback symétrique disponible : ..._viviers_rpc_ROLLBACK.sql
-- ════════════════════════════════════════════════════════════════════════

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true            -- uniquement les SECURITY DEFINER
      AND (
        p.proname LIKE 'get_viviers%'
        OR p.proname LIKE 'count_viviers%'
        OR p.proname LIKE 'search_viviers%'
        OR p.proname LIKE 'get_vivier\_%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER', r.sig);
    RAISE NOTICE 'viviers RPC → INVOKER : %', r.sig;
  END LOOP;
END $$;
