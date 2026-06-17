-- ════════════════════════════════════════════════════════════════════════
-- P0 / Étape 3b (RE-APPLIQUÉE) — RPC viviers en SECURITY INVOKER.
--
-- Le revert (20260617160000) était une fausse alerte : le « 0 viviers »
-- venait d'une table VIDE dans ce Supabase autonome (données pas encore
-- migrées), pas du passage INVOKER. On rétablit l'isolation correcte :
-- les RPC viviers respectent la policy membership de #3a.
--
-- Quand les viviers seront migrés (avec workspace_id = …001), l'équipe IArche
-- (membre de 001) les verra, et un locataire client ne verra que les siens.
-- ════════════════════════════════════════════════════════════════════════

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
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
