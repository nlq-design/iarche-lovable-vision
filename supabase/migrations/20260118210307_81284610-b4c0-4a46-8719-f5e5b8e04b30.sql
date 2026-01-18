-- =====================================================
-- MIGRATION: 5 MODULES ESPACE PARTENAIRE (CDC COMPLET)
-- Version finale corrigée
-- =====================================================

-- ===========================================
-- 1. TABLE: partner_notifications
-- ===========================================
CREATE TABLE IF NOT EXISTS public.partner_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('assignment', 'comment', 'time_validation', 'announcement', 'document', 'mention')),
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT CHECK (entity_type IN ('project', 'lead', 'solution', 'document', 'time_entry', 'announcement')),
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_partner_notifications_partner_id ON public.partner_notifications(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_notifications_is_read ON public.partner_notifications(partner_id, is_read);
CREATE INDEX IF NOT EXISTS idx_partner_notifications_created_at ON public.partner_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.partner_notifications ENABLE ROW LEVEL SECURITY;

-- Politique: partenaires voient leurs propres notifications
CREATE POLICY "Partners can view own notifications"
ON public.partner_notifications FOR SELECT
USING (
  partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
);

-- Politique: partenaires peuvent marquer comme lues
CREATE POLICY "Partners can update own notifications"
ON public.partner_notifications FOR UPDATE
USING (
  partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
);

-- Politique: admins peuvent tout voir/gérer
CREATE POLICY "Admins full access to notifications"
ON public.partner_notifications FOR ALL
USING (public.has_cockpit_access(auth.uid()));

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_notifications;

-- ===========================================
-- 2. TABLE: partner_solution_interests
-- ===========================================
CREATE TABLE IF NOT EXISTS public.partner_solution_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  solution_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  client_name TEXT,
  client_email TEXT,
  client_company TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(partner_id, solution_id, client_email)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_partner_solution_interests_partner ON public.partner_solution_interests(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_solution_interests_solution ON public.partner_solution_interests(solution_id);

-- Enable RLS
ALTER TABLE public.partner_solution_interests ENABLE ROW LEVEL SECURITY;

-- Politique: partenaires gèrent leurs propres intérêts
CREATE POLICY "Partners manage own solution interests"
ON public.partner_solution_interests FOR ALL
USING (
  partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
);

-- Politique: admins full access
CREATE POLICY "Admins full access to solution interests"
ON public.partner_solution_interests FOR ALL
USING (public.has_cockpit_access(auth.uid()));

-- ===========================================
-- 3. VUE: partner_activity_feed
-- ===========================================
CREATE OR REPLACE VIEW public.partner_activity_feed AS
-- Transcriptions créées par le partenaire
SELECT 
  vt.id,
  vt.created_by_partner_id AS partner_id,
  'transcription' AS activity_type,
  'Transcription créée' AS title,
  COALESCE(vt.title, 'Sans titre') AS description,
  COALESCE(vt.project_id::text, vt.lead_id::text, vt.solution_id::text) AS entity_id,
  CASE 
    WHEN vt.project_id IS NOT NULL THEN 'project'
    WHEN vt.lead_id IS NOT NULL THEN 'lead'
    WHEN vt.solution_id IS NOT NULL THEN 'solution'
    ELSE NULL
  END AS entity_type,
  vt.created_at
FROM public.voice_transcriptions vt
WHERE vt.created_by_partner_id IS NOT NULL

UNION ALL

-- Commentaires du partenaire
SELECT 
  pc.id,
  pc.partner_id,
  'comment' AS activity_type,
  'Commentaire ajouté' AS title,
  LEFT(pc.content, 100) AS description,
  pc.entity_id::text AS entity_id,
  pc.entity_type AS entity_type,
  pc.created_at
FROM public.partner_comments pc

UNION ALL

-- Saisies de temps
SELECT 
  pte.id,
  pte.partner_id,
  'time_entry' AS activity_type,
  'Temps déclaré' AS title,
  CONCAT(pte.hours, 'h - ', LEFT(COALESCE(pte.description, ''), 50)) AS description,
  COALESCE(pte.project_id::text, pte.lead_id::text) AS entity_id,
  CASE 
    WHEN pte.project_id IS NOT NULL THEN 'project'
    WHEN pte.lead_id IS NOT NULL THEN 'lead'
    ELSE NULL
  END AS entity_type,
  pte.created_at
FROM public.partner_time_entries pte

UNION ALL

-- Leads créés par le partenaire
SELECT 
  l.id,
  l.created_by_partner_id AS partner_id,
  'lead_created' AS activity_type,
  'Lead créé' AS title,
  CONCAT(l.name, ' - ', COALESCE(l.company, 'Sans entreprise')) AS description,
  l.id::text AS entity_id,
  'lead' AS entity_type,
  l.created_at
FROM public.leads l
WHERE l.created_by_partner_id IS NOT NULL

UNION ALL

-- Projets créés par le partenaire
SELECT 
  p.id,
  p.created_by_partner_id AS partner_id,
  'project_created' AS activity_type,
  'Projet créé' AS title,
  p.name AS description,
  p.id::text AS entity_id,
  'project' AS entity_type,
  p.created_at
FROM public.projects p
WHERE p.created_by_partner_id IS NOT NULL;

-- ===========================================
-- 4. TRIGGERS: Notifications automatiques
-- ===========================================

-- Fonction: Notification assignation projet
CREATE OR REPLACE FUNCTION public.notify_partner_project_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_name TEXT;
BEGIN
  SELECT name INTO project_name FROM public.projects WHERE id = NEW.project_id;
  
  INSERT INTO public.partner_notifications (partner_id, type, title, message, entity_type, entity_id)
  VALUES (
    NEW.partner_id,
    'assignment',
    'Nouvelle mission assignée',
    CONCAT('Vous avez été assigné au projet: ', COALESCE(project_name, 'Sans nom')),
    'project',
    NEW.project_id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_partner_project_assignment ON public.project_partners;
CREATE TRIGGER trigger_notify_partner_project_assignment
AFTER INSERT ON public.project_partners
FOR EACH ROW
EXECUTE FUNCTION public.notify_partner_project_assignment();

-- Fonction: Notification assignation lead
CREATE OR REPLACE FUNCTION public.notify_partner_lead_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_name TEXT;
BEGIN
  SELECT name INTO lead_name FROM public.leads WHERE id = NEW.lead_id;
  
  INSERT INTO public.partner_notifications (partner_id, type, title, message, entity_type, entity_id)
  VALUES (
    NEW.partner_id,
    'assignment',
    'Nouveau lead assigné',
    CONCAT('Vous avez été assigné au lead: ', COALESCE(lead_name, 'Sans nom')),
    'lead',
    NEW.lead_id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_partner_lead_assignment ON public.lead_partners;
CREATE TRIGGER trigger_notify_partner_lead_assignment
AFTER INSERT ON public.lead_partners
FOR EACH ROW
EXECUTE FUNCTION public.notify_partner_lead_assignment();

-- Fonction: Notification validation temps
CREATE OR REPLACE FUNCTION public.notify_partner_time_validation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.partner_notifications (partner_id, type, title, message, entity_type, entity_id)
    VALUES (
      NEW.partner_id,
      'time_validation',
      CASE WHEN NEW.status = 'approved' THEN 'Temps validé' ELSE 'Temps refusé' END,
      CONCAT('Votre saisie de ', NEW.hours, 'h a été ', 
        CASE WHEN NEW.status = 'approved' THEN 'approuvée' ELSE 'refusée' END),
      'time_entry',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_partner_time_validation ON public.partner_time_entries;
CREATE TRIGGER trigger_notify_partner_time_validation
AFTER UPDATE ON public.partner_time_entries
FOR EACH ROW
EXECUTE FUNCTION public.notify_partner_time_validation();

-- Fonction: Notification nouvelle annonce (utilise published_at)
CREATE OR REPLACE FUNCTION public.notify_partners_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  partner_record RECORD;
BEGIN
  -- Notifier tous les partenaires actifs quand une annonce est publiée
  FOR partner_record IN 
    SELECT id FROM public.partners WHERE is_active = TRUE
  LOOP
    INSERT INTO public.partner_notifications (partner_id, type, title, message, entity_type, entity_id)
    VALUES (
      partner_record.id,
      'announcement',
      NEW.title,
      LEFT(NEW.content, 200),
      'announcement',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_partners_announcement ON public.partner_announcements;
CREATE TRIGGER trigger_notify_partners_announcement
AFTER INSERT ON public.partner_announcements
FOR EACH ROW
WHEN (NEW.published_at IS NOT NULL)
EXECUTE FUNCTION public.notify_partners_announcement();

-- Fonction: Notification nouveau commentaire
CREATE OR REPLACE FUNCTION public.notify_partner_new_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  other_partner RECORD;
  entity_name TEXT;
BEGIN
  IF NEW.entity_type = 'project' THEN
    SELECT name INTO entity_name FROM public.projects WHERE id = NEW.entity_id;
    FOR other_partner IN 
      SELECT DISTINCT pp.partner_id 
      FROM public.project_partners pp 
      WHERE pp.project_id = NEW.entity_id AND pp.partner_id != NEW.partner_id
    LOOP
      INSERT INTO public.partner_notifications (partner_id, type, title, message, entity_type, entity_id)
      VALUES (other_partner.partner_id, 'comment', 'Nouveau commentaire',
        CONCAT('Nouveau commentaire sur le projet: ', COALESCE(entity_name, 'Sans nom')),
        'project', NEW.entity_id);
    END LOOP;
  ELSIF NEW.entity_type = 'lead' THEN
    SELECT name INTO entity_name FROM public.leads WHERE id = NEW.entity_id;
    FOR other_partner IN 
      SELECT DISTINCT lp.partner_id 
      FROM public.lead_partners lp 
      WHERE lp.lead_id = NEW.entity_id AND lp.partner_id != NEW.partner_id
    LOOP
      INSERT INTO public.partner_notifications (partner_id, type, title, message, entity_type, entity_id)
      VALUES (other_partner.partner_id, 'comment', 'Nouveau commentaire',
        CONCAT('Nouveau commentaire sur le lead: ', COALESCE(entity_name, 'Sans nom')),
        'lead', NEW.entity_id);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_partner_new_comment ON public.partner_comments;
CREATE TRIGGER trigger_notify_partner_new_comment
AFTER INSERT ON public.partner_comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_partner_new_comment();