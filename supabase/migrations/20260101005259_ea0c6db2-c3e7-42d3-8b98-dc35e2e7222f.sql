-- 1) Ajouter colonne pending_ai_review à activity_log
ALTER TABLE public.activity_log 
ADD COLUMN IF NOT EXISTS pending_ai_review boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS ai_reviewed_at timestamp with time zone DEFAULT NULL;

-- 2) Index pour récupérer rapidement les notifications non lues
CREATE INDEX IF NOT EXISTS idx_activity_log_pending_ai 
ON public.activity_log(pending_ai_review, created_at DESC) 
WHERE pending_ai_review = true;

-- 3) Fonction générique pour créer une entrée activity_log
CREATE OR REPLACE FUNCTION public.notify_ai_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entity_type TEXT;
  v_activity_type TEXT;
  v_content TEXT;
  v_title TEXT;
  v_workspace_id UUID;
BEGIN
  -- Déterminer le type d'entité et le contenu selon la table source
  v_entity_type := TG_ARGV[0];
  v_activity_type := 'new_' || v_entity_type;
  
  -- Construire le contenu selon la table
  CASE TG_TABLE_NAME
    WHEN 'leads' THEN
      v_title := 'Nouveau lead : ' || NEW.name;
      v_content := 'Lead ' || NEW.name || ' (' || NEW.email || ') via ' || NEW.source;
      v_workspace_id := '00000000-0000-0000-0000-000000000001'::uuid;
    WHEN 'opportunities' THEN
      v_title := 'Nouvelle opportunité : ' || NEW.title;
      v_content := 'Opportunité ' || NEW.title || ' - Stage: ' || NEW.stage;
      v_workspace_id := NEW.workspace_id;
    WHEN 'projects' THEN
      v_title := 'Nouveau projet : ' || NEW.name;
      v_content := 'Projet ' || NEW.name || ' créé - Statut: ' || NEW.status;
      v_workspace_id := NEW.workspace_id;
    WHEN 'tasks' THEN
      v_title := 'Nouvelle tâche : ' || NEW.title;
      v_content := 'Tâche ' || NEW.title || ' - Priorité: ' || NEW.priority;
      v_workspace_id := NEW.workspace_id;
    WHEN 'bookings' THEN
      v_title := 'Nouveau RDV : ' || NEW.name;
      v_content := 'RDV avec ' || NEW.name || ' le ' || NEW.start_time::date;
      v_workspace_id := '00000000-0000-0000-0000-000000000001'::uuid;
    WHEN 'generated_documents' THEN
      v_title := 'Nouveau document : ' || NEW.title;
      v_content := 'Document ' || NEW.document_type || ' : ' || NEW.title;
      v_workspace_id := NEW.workspace_id;
    WHEN 'specifications' THEN
      v_title := 'Nouveau CDC : ' || NEW.title;
      v_content := 'Spécification ' || NEW.title || ' v' || COALESCE(NEW.version, '1.0');
      v_workspace_id := NEW.workspace_id;
    WHEN 'voice_transcriptions' THEN
      v_title := 'Nouvelle transcription';
      v_content := 'Transcription audio - Statut: ' || NEW.status;
      v_workspace_id := NEW.workspace_id;
    WHEN 'articles' THEN
      v_title := 'Nouveau contenu : ' || NEW.title;
      v_content := 'Article ' || NEW.resource_type || ' : ' || NEW.title;
      v_workspace_id := '00000000-0000-0000-0000-000000000001'::uuid;
    WHEN 'contacts' THEN
      v_title := 'Nouveau contact : ' || NEW.name;
      v_content := 'Message de ' || NEW.name || ' : ' || NEW.subject;
      v_workspace_id := '00000000-0000-0000-0000-000000000001'::uuid;
    ELSE
      v_title := 'Nouvel élément';
      v_content := 'Élément créé dans ' || TG_TABLE_NAME;
      v_workspace_id := '00000000-0000-0000-0000-000000000001'::uuid;
  END CASE;

  -- Insérer dans activity_log avec pending_ai_review = true
  INSERT INTO public.activity_log (
    workspace_id,
    entity_type,
    entity_id,
    activity_type,
    title,
    content,
    pending_ai_review,
    metadata
  ) VALUES (
    v_workspace_id,
    v_entity_type,
    NEW.id,
    v_activity_type,
    v_title,
    v_content,
    true,
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'trigger_time', now(),
      'notification_type', 'auto_created'
    )
  );

  RETURN NEW;
END;
$$;

-- 4) Créer les triggers sur chaque table clé

-- Leads
DROP TRIGGER IF EXISTS trg_notify_ai_leads ON public.leads;
CREATE TRIGGER trg_notify_ai_leads
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_ai_on_insert('lead');

-- Opportunities
DROP TRIGGER IF EXISTS trg_notify_ai_opportunities ON public.opportunities;
CREATE TRIGGER trg_notify_ai_opportunities
AFTER INSERT ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.notify_ai_on_insert('opportunity');

-- Projects
DROP TRIGGER IF EXISTS trg_notify_ai_projects ON public.projects;
CREATE TRIGGER trg_notify_ai_projects
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.notify_ai_on_insert('project');

-- Tasks
DROP TRIGGER IF EXISTS trg_notify_ai_tasks ON public.tasks;
CREATE TRIGGER trg_notify_ai_tasks
AFTER INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_ai_on_insert('task');

-- Bookings
DROP TRIGGER IF EXISTS trg_notify_ai_bookings ON public.bookings;
CREATE TRIGGER trg_notify_ai_bookings
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_ai_on_insert('booking');

-- Generated Documents
DROP TRIGGER IF EXISTS trg_notify_ai_documents ON public.generated_documents;
CREATE TRIGGER trg_notify_ai_documents
AFTER INSERT ON public.generated_documents
FOR EACH ROW
EXECUTE FUNCTION public.notify_ai_on_insert('generated_document');

-- Specifications
DROP TRIGGER IF EXISTS trg_notify_ai_specs ON public.specifications;
CREATE TRIGGER trg_notify_ai_specs
AFTER INSERT ON public.specifications
FOR EACH ROW
EXECUTE FUNCTION public.notify_ai_on_insert('specification');

-- Voice Transcriptions
DROP TRIGGER IF EXISTS trg_notify_ai_transcriptions ON public.voice_transcriptions;
CREATE TRIGGER trg_notify_ai_transcriptions
AFTER INSERT ON public.voice_transcriptions
FOR EACH ROW
EXECUTE FUNCTION public.notify_ai_on_insert('voice_transcription');

-- Articles (contenus)
DROP TRIGGER IF EXISTS trg_notify_ai_articles ON public.articles;
CREATE TRIGGER trg_notify_ai_articles
AFTER INSERT ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.notify_ai_on_insert('article');

-- Contacts
DROP TRIGGER IF EXISTS trg_notify_ai_contacts ON public.contacts;
CREATE TRIGGER trg_notify_ai_contacts
AFTER INSERT ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.notify_ai_on_insert('contact');

-- 5) Fonction pour marquer les notifications comme lues par l'IA
CREATE OR REPLACE FUNCTION public.mark_ai_notifications_reviewed(p_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.activity_log
  SET pending_ai_review = false,
      ai_reviewed_at = now()
  WHERE id = ANY(p_ids)
    AND pending_ai_review = true;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;