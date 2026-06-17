-- DIAGNOSTIC (lecture seule) — aucune modification. Affiche l'état réel via NOTICE.
-- (Seul canal d'exécution SQL disponible côté agent = le push de migration.)
DO $$
DECLARE
  v_total bigint; v_001 bigint; v_members_001 bigint; v_super bigint; r record;
BEGIN
  SELECT count(*) INTO v_total          FROM public.viviers;
  SELECT count(*) INTO v_001            FROM public.viviers WHERE workspace_id = '00000000-0000-0000-0000-000000000001';
  SELECT count(*) INTO v_members_001    FROM public.workspace_members WHERE workspace_id = '00000000-0000-0000-0000-000000000001';
  SELECT count(*) INTO v_super          FROM public.user_roles WHERE role::text = 'super_admin';
  RAISE NOTICE 'DIAG: viviers_total=% viviers_ws001=% membres_001=% super_admins=%', v_total, v_001, v_members_001, v_super;

  FOR r IN
    SELECT workspace_id, count(*) AS c FROM public.viviers
    GROUP BY workspace_id ORDER BY c DESC LIMIT 5
  LOOP
    RAISE NOTICE 'DIAG viviers_par_ws: % = %', r.workspace_id, r.c;
  END LOOP;

  FOR r IN
    SELECT w.id, w.name, w.is_owner, count(m.user_id) AS membres
    FROM public.workspaces w
    LEFT JOIN public.workspace_members m ON m.workspace_id = w.id
    GROUP BY w.id, w.name, w.is_owner
  LOOP
    RAISE NOTICE 'DIAG workspace: % "%" owner=% membres=%', r.id, r.name, r.is_owner, r.membres;
  END LOOP;
END $$;
