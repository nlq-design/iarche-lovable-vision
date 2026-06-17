-- Diagnostic isolation multi-tenant — LECTURE SEULE (à lancer dans Supabase Studio › SQL).
-- À exécuter APRÈS la migration 20260617120000 pour confirmer la sanctuarisation.

-- 1) Les workspaces et leur flag propriétaire
SELECT id, name, type, is_owner FROM public.workspaces ORDER BY is_owner DESC, name;

-- 2) Membres du workspace IArche …001 (doit contenir toute l'équipe cockpit)
SELECT role, status, count(*)
FROM public.workspace_members
WHERE workspace_id = '00000000-0000-0000-0000-000000000001'
GROUP BY role, status ORDER BY role;

-- 3) Répartition des données par workspace (tables CRM clés)
--    Tout doit être sur …001 aujourd'hui (mono-locataire).
SELECT 'leads' AS tbl, workspace_id, count(*) FROM public.leads GROUP BY workspace_id
UNION ALL SELECT 'opportunities', workspace_id, count(*) FROM public.opportunities GROUP BY workspace_id
UNION ALL SELECT 'projects', workspace_id, count(*) FROM public.projects GROUP BY workspace_id
UNION ALL SELECT 'tasks', workspace_id, count(*) FROM public.tasks GROUP BY workspace_id
UNION ALL SELECT 'partners', workspace_id, count(*) FROM public.partners GROUP BY workspace_id
UNION ALL SELECT 'viviers', workspace_id, count(*) FROM public.viviers GROUP BY workspace_id
ORDER BY tbl, count DESC;

-- 4) Restes éventuels de workspace_id NULL (doit être 0 partout après backfill)
SELECT 'leads' AS tbl, count(*) AS null_ws FROM public.leads WHERE workspace_id IS NULL
UNION ALL SELECT 'opportunities', count(*) FROM public.opportunities WHERE workspace_id IS NULL
UNION ALL SELECT 'projects', count(*) FROM public.projects WHERE workspace_id IS NULL
UNION ALL SELECT 'tasks', count(*) FROM public.tasks WHERE workspace_id IS NULL
UNION ALL SELECT 'viviers', count(*) FROM public.viviers WHERE workspace_id IS NULL;
