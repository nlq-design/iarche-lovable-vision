-- Repasse les RPC viviers en SECURITY DEFINER.
-- Le passage INVOKER (#3b) faisait évaluer la RLS de viviers ligne par ligne
-- sur 166k lignes × plusieurs comptages → statement timeout (57014) sur
-- get_viviers_stats. Ces fonctions s'isolent DÉJÀ via leur filtre interne
-- (super_admin OR is_workspace_member) → DEFINER = isolation conservée + rapide.
-- (L'isolation par RLS des RPC sera reprise, performante, à l'industrialisation
--  multi-tenant — pas de 2e locataire aujourd'hui.)
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
    RAISE NOTICE 'viviers RPC → DEFINER : %', r.sig;
  END LOOP;
END $$;
