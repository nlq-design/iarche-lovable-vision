-- Update notify_ai_on_insert to map voice_transcription to new_transcription
CREATE OR REPLACE FUNCTION public.notify_ai_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_entity_type TEXT;
  v_activity_type TEXT;
  v_content TEXT;
  v_title TEXT;
  v_workspace_id UUID;
BEGIN
  -- Déterminer le type d'entité et le contenu selon la table source
  v_entity_type := TG_ARGV[0];
  
  -- Map activity types to match the check constraint
  CASE v_entity_type
    WHEN 'voice_transcription' THEN v_activity_type := 'new_transcription';
    ELSE v_activity_type := 'new_' || v_entity_type;
  END CASE;
  
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
$function$;