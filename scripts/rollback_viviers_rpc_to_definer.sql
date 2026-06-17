-- ROLLBACK de la migration 20260617150000 (viviers RPC INVOKER → DEFINER).
-- À exécuter dans Supabase Studio › SQL UNIQUEMENT si le module vivier casse
-- après le passage en INVOKER. Restaure le comportement précédent.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = false           -- celles passées en INVOKER
      AND (
        p.proname LIKE 'get_viviers%'
        OR p.proname LIKE 'count_viviers%'
        OR p.proname LIKE 'search_viviers%'
        OR p.proname LIKE 'get_vivier\_%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER', r.sig);
    RAISE NOTICE 'viviers RPC → DEFINER (rollback) : %', r.sig;
  END LOOP;
END $$;
