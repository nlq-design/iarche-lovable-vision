-- ════════════════════════════════════════════════════════════════════════
-- REVERT de 20260617150000 — les RPC viviers repassent en SECURITY DEFINER.
--
-- Le passage en INVOKER coupait l'accès aux viviers (la RLS membership ne
-- matchait pas les lignes : workspace_id des viviers non aligné sur …001,
-- ou backfill ignoré). On restaure le comportement fonctionnel immédiatement.
-- L'isolation des RPC viviers sera reprise proprement APRÈS diagnostic du
-- workspace_id réel des viviers.
-- ════════════════════════════════════════════════════════════════════════

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = false
      AND (
        p.proname LIKE 'get_viviers%'
        OR p.proname LIKE 'count_viviers%'
        OR p.proname LIKE 'search_viviers%'
        OR p.proname LIKE 'get_vivier\_%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER', r.sig);
    RAISE NOTICE 'viviers RPC → DEFINER (revert) : %', r.sig;
  END LOOP;
END $$;
