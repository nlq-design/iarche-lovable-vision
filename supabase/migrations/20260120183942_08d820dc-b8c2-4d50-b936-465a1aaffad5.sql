
-- ============================================
-- PHASE 1 - ULTRA SAFE (sans DEFAULT, sans FK)
-- Multi-tenant: ajout workspace_id sur tables CRM
-- ============================================

-- 1A: Ajout colonnes NULLABLE sans DEFAULT
ALTER TABLE leads ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE lead_contacts ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE lead_partners ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- 1B: Backfill explicite vers workspace IArche Interne
UPDATE leads SET workspace_id = '00000000-0000-0000-0000-000000000001' 
  WHERE workspace_id IS NULL;
UPDATE lead_contacts SET workspace_id = '00000000-0000-0000-0000-000000000001' 
  WHERE workspace_id IS NULL;
UPDATE lead_partners SET workspace_id = '00000000-0000-0000-0000-000000000001' 
  WHERE workspace_id IS NULL;
UPDATE bookings SET workspace_id = '00000000-0000-0000-0000-000000000001' 
  WHERE workspace_id IS NULL;
