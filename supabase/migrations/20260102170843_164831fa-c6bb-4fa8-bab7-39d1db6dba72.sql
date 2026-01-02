
-- ============================================================
-- MIGRATION: Système de Synthèse Transversale v1.0
-- Ajoute les colonnes ai_documents_summary et synthesis_stale
-- à toutes les entités du graphe commercial
-- ============================================================

-- 1. PROJECTS: Ajouter colonnes synthèse
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS ai_documents_summary TEXT,
ADD COLUMN IF NOT EXISTS synthesis_stale BOOLEAN DEFAULT TRUE;

-- 2. PARTNERS: Ajouter colonnes synthèse
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS ai_documents_summary TEXT,
ADD COLUMN IF NOT EXISTS synthesis_stale BOOLEAN DEFAULT TRUE;

-- 3. VOICE_TRANSCRIPTIONS: Ajouter colonnes synthèse (pour traçabilité)
ALTER TABLE public.voice_transcriptions 
ADD COLUMN IF NOT EXISTS ai_documents_summary TEXT,
ADD COLUMN IF NOT EXISTS synthesis_stale BOOLEAN DEFAULT TRUE;

-- 4. LEADS: Ajouter flag stale (ai_documents_summary existe déjà)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS synthesis_stale BOOLEAN DEFAULT TRUE;

-- 5. ARTICLES (solutions): Ajouter flag stale (ai_documents_summary existe déjà)
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS synthesis_stale BOOLEAN DEFAULT TRUE;

-- 6. GENERATED_DOCUMENTS: Ajouter flag stale (ai_documents_summary existe déjà)
ALTER TABLE public.generated_documents 
ADD COLUMN IF NOT EXISTS synthesis_stale BOOLEAN DEFAULT TRUE;

-- ============================================================
-- TRIGGERS: Marquer les entités comme "stale" lors de changements
-- ============================================================

-- Fonction générique pour marquer comme stale
CREATE OR REPLACE FUNCTION public.mark_entity_synthesis_stale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_lead_id UUID;
  v_project_id UUID;
  v_partner_id UUID;
BEGIN
  -- Marquer les leads liés comme stale
  IF TG_TABLE_NAME = 'uploaded_files' THEN
    IF NEW.lead_ids IS NOT NULL THEN
      UPDATE leads SET synthesis_stale = TRUE WHERE id = ANY(NEW.lead_ids);
    END IF;
    IF NEW.project_ids IS NOT NULL THEN
      UPDATE projects SET synthesis_stale = TRUE WHERE id = ANY(NEW.project_ids);
    END IF;
    IF NEW.solution_ids IS NOT NULL THEN
      UPDATE articles SET synthesis_stale = TRUE WHERE id = ANY(NEW.solution_ids);
    END IF;
  END IF;
  
  IF TG_TABLE_NAME = 'voice_transcriptions' THEN
    IF NEW.lead_id IS NOT NULL THEN
      UPDATE leads SET synthesis_stale = TRUE WHERE id = NEW.lead_id;
    END IF;
    IF NEW.project_id IS NOT NULL THEN
      UPDATE projects SET synthesis_stale = TRUE WHERE id = NEW.project_id;
    END IF;
  END IF;
  
  IF TG_TABLE_NAME = 'lead_partners' THEN
    UPDATE leads SET synthesis_stale = TRUE WHERE id = NEW.lead_id;
    UPDATE partners SET synthesis_stale = TRUE WHERE id = NEW.partner_id;
  END IF;
  
  IF TG_TABLE_NAME = 'project_partners' THEN
    UPDATE projects SET synthesis_stale = TRUE WHERE id = NEW.project_id;
    UPDATE partners SET synthesis_stale = TRUE WHERE id = NEW.partner_id;
  END IF;
  
  IF TG_TABLE_NAME = 'solution_partners' THEN
    UPDATE articles SET synthesis_stale = TRUE WHERE id = NEW.solution_id;
    UPDATE partners SET synthesis_stale = TRUE WHERE id = NEW.partner_id;
  END IF;
  
  IF TG_TABLE_NAME = 'solution_leads' THEN
    UPDATE articles SET synthesis_stale = TRUE WHERE id = NEW.solution_id;
    UPDATE leads SET synthesis_stale = TRUE WHERE id = NEW.lead_id;
  END IF;
  
  IF TG_TABLE_NAME = 'tasks' THEN
    IF NEW.lead_id IS NOT NULL THEN
      UPDATE leads SET synthesis_stale = TRUE WHERE id = NEW.lead_id;
    END IF;
    IF NEW.project_id IS NOT NULL THEN
      UPDATE projects SET synthesis_stale = TRUE WHERE id = NEW.project_id;
    END IF;
  END IF;
  
  IF TG_TABLE_NAME = 'bookings' THEN
    IF NEW.lead_id IS NOT NULL THEN
      UPDATE leads SET synthesis_stale = TRUE WHERE id = NEW.lead_id;
    END IF;
  END IF;
  
  IF TG_TABLE_NAME = 'generated_documents' THEN
    IF NEW.lead_id IS NOT NULL THEN
      UPDATE leads SET synthesis_stale = TRUE WHERE id = NEW.lead_id;
    END IF;
    IF NEW.project_id IS NOT NULL THEN
      UPDATE projects SET synthesis_stale = TRUE WHERE id = NEW.project_id;
    END IF;
  END IF;
  
  IF TG_TABLE_NAME = 'opportunities' THEN
    IF NEW.lead_id IS NOT NULL THEN
      UPDATE leads SET synthesis_stale = TRUE WHERE id = NEW.lead_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer les triggers sur les tables de liaison
DROP TRIGGER IF EXISTS trg_stale_uploaded_files ON uploaded_files;
CREATE TRIGGER trg_stale_uploaded_files
  AFTER INSERT OR UPDATE ON uploaded_files
  FOR EACH ROW EXECUTE FUNCTION mark_entity_synthesis_stale();

DROP TRIGGER IF EXISTS trg_stale_voice_transcriptions ON voice_transcriptions;
CREATE TRIGGER trg_stale_voice_transcriptions
  AFTER INSERT OR UPDATE ON voice_transcriptions
  FOR EACH ROW EXECUTE FUNCTION mark_entity_synthesis_stale();

DROP TRIGGER IF EXISTS trg_stale_lead_partners ON lead_partners;
CREATE TRIGGER trg_stale_lead_partners
  AFTER INSERT ON lead_partners
  FOR EACH ROW EXECUTE FUNCTION mark_entity_synthesis_stale();

DROP TRIGGER IF EXISTS trg_stale_project_partners ON project_partners;
CREATE TRIGGER trg_stale_project_partners
  AFTER INSERT ON project_partners
  FOR EACH ROW EXECUTE FUNCTION mark_entity_synthesis_stale();

DROP TRIGGER IF EXISTS trg_stale_solution_partners ON solution_partners;
CREATE TRIGGER trg_stale_solution_partners
  AFTER INSERT ON solution_partners
  FOR EACH ROW EXECUTE FUNCTION mark_entity_synthesis_stale();

DROP TRIGGER IF EXISTS trg_stale_solution_leads ON solution_leads;
CREATE TRIGGER trg_stale_solution_leads
  AFTER INSERT ON solution_leads
  FOR EACH ROW EXECUTE FUNCTION mark_entity_synthesis_stale();

DROP TRIGGER IF EXISTS trg_stale_tasks ON tasks;
CREATE TRIGGER trg_stale_tasks
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION mark_entity_synthesis_stale();

DROP TRIGGER IF EXISTS trg_stale_bookings ON bookings;
CREATE TRIGGER trg_stale_bookings
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION mark_entity_synthesis_stale();

DROP TRIGGER IF EXISTS trg_stale_generated_documents ON generated_documents;
CREATE TRIGGER trg_stale_generated_documents
  AFTER INSERT OR UPDATE ON generated_documents
  FOR EACH ROW EXECUTE FUNCTION mark_entity_synthesis_stale();

DROP TRIGGER IF EXISTS trg_stale_opportunities ON opportunities;
CREATE TRIGGER trg_stale_opportunities
  AFTER INSERT OR UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION mark_entity_synthesis_stale();

-- ============================================================
-- INDEX pour performance des requêtes de resynthèse
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_synthesis_stale ON leads(synthesis_stale) WHERE synthesis_stale = TRUE;
CREATE INDEX IF NOT EXISTS idx_projects_synthesis_stale ON projects(synthesis_stale) WHERE synthesis_stale = TRUE;
CREATE INDEX IF NOT EXISTS idx_partners_synthesis_stale ON partners(synthesis_stale) WHERE synthesis_stale = TRUE;
CREATE INDEX IF NOT EXISTS idx_articles_synthesis_stale ON articles(synthesis_stale) WHERE synthesis_stale = TRUE;
