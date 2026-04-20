-- QW#5a - Drop 4 safe orphan columns (100% NULL confirmed)
-- Forward migration

-- (1) leads.revenue_range - TEXT, 100% NULL (38/38)
ALTER TABLE public.leads 
  DROP COLUMN IF EXISTS revenue_range;

-- (2) opportunities.lost_to - TEXT, 100% NULL (41/41)
ALTER TABLE public.opportunities 
  DROP COLUMN IF EXISTS lost_to;

-- (3) opportunities.close_reason - TEXT, 100% NULL (41/41)
ALTER TABLE public.opportunities 
  DROP COLUMN IF EXISTS close_reason;

-- (4) contacts.user_session - TEXT, 100% NULL (53/53, legacy anti-spam)
ALTER TABLE public.contacts 
  DROP COLUMN IF EXISTS user_session;

-- =============================================================
-- ROLLBACK (à exécuter manuellement si besoin) :
-- =============================================================
-- 
-- -- (1) leads.revenue_range
-- ALTER TABLE public.leads ADD COLUMN revenue_range TEXT;
-- 
-- -- (2) opportunities.lost_to
-- ALTER TABLE public.opportunities ADD COLUMN lost_to TEXT;
-- 
-- -- (3) opportunities.close_reason
-- ALTER TABLE public.opportunities ADD COLUMN close_reason TEXT;
-- 
-- -- (4) contacts.user_session
-- ALTER TABLE public.contacts ADD COLUMN user_session TEXT;
-- 
-- =============================================================