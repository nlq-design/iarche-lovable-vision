-- Rattache tous les viviers (re)importés depuis l'ancien projet au workspace
-- IArche …001, pour qu'ils soient visibles dans le cockpit (RLS membership).
update public.viviers
set workspace_id = '00000000-0000-0000-0000-000000000001'
where workspace_id is distinct from '00000000-0000-0000-0000-000000000001';
