-- QW#9b P1 - Phase 2 hardening : SET NOT NULL + DEFAULT sur workspace_id
-- Tables: leads, lead_contacts

-- ==========================================
-- FORWARD MIGRATION
-- ==========================================

-- Table leads
ALTER TABLE public.leads ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.leads ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- Table lead_contacts
ALTER TABLE public.lead_contacts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.lead_contacts ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- ==========================================
-- ROLLBACK (commenté, gardé pour référence)
-- ==========================================
-- ALTER TABLE public.leads ALTER COLUMN workspace_id DROP NOT NULL;
-- ALTER TABLE public.leads ALTER COLUMN workspace_id DROP DEFAULT;
-- ALTER TABLE public.lead_contacts ALTER COLUMN workspace_id DROP NOT NULL;
-- ALTER TABLE public.lead_contacts ALTER COLUMN workspace_id DROP DEFAULT;