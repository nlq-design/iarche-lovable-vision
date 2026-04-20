-- QW#P0 - Bookings : backfill + DEFAULT + NOT NULL sur workspace_id
-- Audit: 17/122 NULL (14%), edge function calendar-booking patchée pour injection systématique

-- ÉTAPE 1 : Backfill des 17 lignes NULL avec le workspace par défaut (IArche Interne)
UPDATE public.bookings
SET workspace_id = '00000000-0000-0000-0000-000000000001'
WHERE workspace_id IS NULL;

-- ÉTAPE 2 : DEFAULT pour insertions futures (filet de sécurité)
ALTER TABLE public.bookings
  ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

-- ÉTAPE 3 : NOT NULL strict (cloisonnement multi-tenant garanti)
ALTER TABLE public.bookings
  ALTER COLUMN workspace_id SET NOT NULL;

-- ============================================================
-- ROLLBACK manuel si nécessaire :
-- ALTER TABLE public.bookings ALTER COLUMN workspace_id DROP NOT NULL;
-- ALTER TABLE public.bookings ALTER COLUMN workspace_id DROP DEFAULT;
-- (le backfill n'est pas réversible : aucune trace des anciens NULL)
-- ============================================================