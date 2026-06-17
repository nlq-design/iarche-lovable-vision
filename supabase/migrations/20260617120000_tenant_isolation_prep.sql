-- ════════════════════════════════════════════════════════════════════════
-- P0 / Étape 1 — Préparation à l'isolation multi-tenant (ADDITIVE & SÛRE)
--
-- Sanctuarise le cockpit IArche (workspace …001) et NEUTRALISE tout risque de
-- lock-out AVANT la réécriture des policies (migration suivante).
-- ⚠️ Cette migration N'ENLÈVE AUCUN ACCÈS et ne change AUCUNE policy RLS.
-- Réversible (DROP COLUMN is_owner; les memberships ajoutés sont identifiables).
-- ════════════════════════════════════════════════════════════════════════

-- 1) Flag « locataire propriétaire » (IArche/NLQ).
--    Servira à n'activer les modules IArche-only (Solutions) que pour ce workspace.
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS is_owner boolean NOT NULL DEFAULT false;
UPDATE public.workspaces SET is_owner = true
  WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2) ANTI-LOCK-OUT : tout utilisateur ayant accès au cockpit AUJOURD'HUI devient
--    membre explicite du workspace IArche …001. (Mono-locataire actuel : ces
--    users SONT l'équipe IArche.) Sans ça, retirer la clause « internal » de
--    can_access_workspace couperait l'accès à leurs propres données.
INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
SELECT '00000000-0000-0000-0000-000000000001',
       ur.user_id,
       CASE WHEN ur.role::text IN ('admin','super_admin','cockpit_admin') THEN 'owner' ELSE 'editor' END,
       'active'
FROM public.user_roles ur
WHERE ur.role::text IN ('admin','super_admin','cockpit_admin','cockpit_user')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 3) BACKFILL : toute donnée CRM sans workspace_id → …001 (sinon elle deviendrait
--    invisible après durcissement des policies). Boucle sur toutes les tables
--    ayant une colonne workspace_id, hors tables de config par-workspace (workspace_*).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'workspace_id'
      AND t.table_type = 'BASE TABLE'           -- exclut les vues (api_usage_summary…)
      AND c.table_name NOT LIKE 'workspace\_%'
      -- contenu public/corporate : workspace_id volontairement NULL (RAG du site)
      AND c.table_name NOT IN ('resource_embeddings')
  LOOP
    -- Défensif : si une table impose un scope public (CHECK), on saute proprement.
    BEGIN
      EXECUTE format(
        'UPDATE public.%I SET workspace_id = %L WHERE workspace_id IS NULL',
        r.table_name, '00000000-0000-0000-0000-000000000001'
      );
    EXCEPTION WHEN check_violation OR not_null_violation THEN
      RAISE NOTICE 'Backfill ignoré pour % (contenu public/non-tenant).', r.table_name;
    END;
  END LOOP;
END $$;
