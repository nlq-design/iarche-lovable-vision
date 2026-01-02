-- Phase 2: Mémoire Persistante - Amélioration de la table ai_agent_memory

-- Ajouter un score de familiarité pour les leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS familiarity_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS familiarity_details jsonb DEFAULT '{"interactions": 0, "documents": 0, "bookings": 0, "last_interaction": null}'::jsonb;

-- Créer une table pour le cross-référencement des noms propres
CREATE TABLE IF NOT EXISTS public.entity_name_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_type text NOT NULL,
  source_entity_id uuid NOT NULL,
  target_entity_type text NOT NULL,
  target_entity_id uuid NOT NULL,
  reference_type text NOT NULL DEFAULT 'mention',
  context text,
  confidence_score numeric DEFAULT 0.8,
  detected_by text DEFAULT 'ai',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(source_entity_type, source_entity_id, target_entity_type, target_entity_id, reference_type)
);

-- Index pour recherche rapide par entité
CREATE INDEX IF NOT EXISTS idx_entity_name_refs_source ON public.entity_name_references(source_entity_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_name_refs_target ON public.entity_name_references(target_entity_type, target_entity_id);

-- RLS pour entity_name_references
ALTER TABLE public.entity_name_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entity_name_references_cockpit_read" ON public.entity_name_references
  FOR SELECT USING (
    has_role(auth.uid(), 'cockpit_user') OR 
    has_role(auth.uid(), 'cockpit_admin') OR
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "entity_name_references_cockpit_write" ON public.entity_name_references
  FOR ALL USING (
    has_role(auth.uid(), 'cockpit_user') OR 
    has_role(auth.uid(), 'cockpit_admin') OR
    has_role(auth.uid(), 'admin')
  );

-- Fonction pour mettre à jour le score de familiarité d'un lead
CREATE OR REPLACE FUNCTION public.update_lead_familiarity(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_interactions integer;
  v_documents integer;
  v_bookings integer;
  v_transcriptions integer;
  v_tasks integer;
  v_score integer;
  v_last_interaction timestamp with time zone;
BEGIN
  -- Compter les interactions
  SELECT COUNT(*) INTO v_interactions
  FROM activity_log WHERE lead_id = p_lead_id;
  
  -- Compter les documents uploadés
  SELECT COUNT(*) INTO v_documents
  FROM uploaded_files WHERE lead_ids @> ARRAY[p_lead_id]::uuid[];
  
  -- Compter les RDV
  SELECT COUNT(*) INTO v_bookings
  FROM bookings WHERE lead_id = p_lead_id;
  
  -- Compter les transcriptions
  SELECT COUNT(*) INTO v_transcriptions
  FROM voice_transcriptions WHERE lead_id = p_lead_id AND status = 'completed';
  
  -- Compter les tâches
  SELECT COUNT(*) INTO v_tasks
  FROM tasks WHERE lead_id = p_lead_id;
  
  -- Dernière interaction
  SELECT MAX(created_at) INTO v_last_interaction
  FROM activity_log WHERE lead_id = p_lead_id;
  
  -- Calculer le score (max 100)
  v_score := LEAST(100, 
    v_interactions * 2 + 
    v_documents * 5 + 
    v_bookings * 10 + 
    v_transcriptions * 8 + 
    v_tasks * 3
  );
  
  -- Mettre à jour le lead
  UPDATE leads
  SET 
    familiarity_score = v_score,
    familiarity_details = jsonb_build_object(
      'interactions', v_interactions,
      'documents', v_documents,
      'bookings', v_bookings,
      'transcriptions', v_transcriptions,
      'tasks', v_tasks,
      'last_interaction', v_last_interaction
    )
  WHERE id = p_lead_id;
END;
$$;

-- Trigger pour mettre à jour le score de familiarité automatiquement
CREATE OR REPLACE FUNCTION public.trigger_update_lead_familiarity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    PERFORM public.update_lead_familiarity(NEW.lead_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger sur activity_log
DROP TRIGGER IF EXISTS trg_activity_log_familiarity ON public.activity_log;
CREATE TRIGGER trg_activity_log_familiarity
  AFTER INSERT ON public.activity_log
  FOR EACH ROW
  WHEN (NEW.lead_id IS NOT NULL)
  EXECUTE FUNCTION public.trigger_update_lead_familiarity();

-- Trigger sur bookings
DROP TRIGGER IF EXISTS trg_bookings_familiarity ON public.bookings;
CREATE TRIGGER trg_bookings_familiarity
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  WHEN (NEW.lead_id IS NOT NULL)
  EXECUTE FUNCTION public.trigger_update_lead_familiarity();

-- Trigger sur tasks
DROP TRIGGER IF EXISTS trg_tasks_familiarity ON public.tasks;
CREATE TRIGGER trg_tasks_familiarity
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  WHEN (NEW.lead_id IS NOT NULL)
  EXECUTE FUNCTION public.trigger_update_lead_familiarity();

-- Fonction pour détecter et créer les références croisées
CREATE OR REPLACE FUNCTION public.create_entity_reference(
  p_source_type text,
  p_source_id uuid,
  p_target_type text,
  p_target_id uuid,
  p_reference_type text DEFAULT 'mention',
  p_context text DEFAULT NULL,
  p_confidence numeric DEFAULT 0.8
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ref_id uuid;
BEGIN
  INSERT INTO entity_name_references (
    source_entity_type,
    source_entity_id,
    target_entity_type,
    target_entity_id,
    reference_type,
    context,
    confidence_score
  ) VALUES (
    p_source_type,
    p_source_id,
    p_target_type,
    p_target_id,
    p_reference_type,
    p_context,
    p_confidence
  )
  ON CONFLICT (source_entity_type, source_entity_id, target_entity_type, target_entity_id, reference_type)
  DO UPDATE SET
    context = COALESCE(p_context, entity_name_references.context),
    confidence_score = GREATEST(entity_name_references.confidence_score, p_confidence),
    updated_at = now()
  RETURNING id INTO v_ref_id;
  
  RETURN v_ref_id;
END;
$$;

-- Fonction pour récupérer les références croisées d'une entité
CREATE OR REPLACE FUNCTION public.get_entity_references(
  p_entity_type text,
  p_entity_id uuid
)
RETURNS TABLE(
  id uuid,
  direction text,
  related_entity_type text,
  related_entity_id uuid,
  reference_type text,
  context text,
  confidence_score numeric,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    'outgoing'::text as direction,
    r.target_entity_type as related_entity_type,
    r.target_entity_id as related_entity_id,
    r.reference_type,
    r.context,
    r.confidence_score,
    r.created_at
  FROM entity_name_references r
  WHERE r.source_entity_type = p_entity_type AND r.source_entity_id = p_entity_id
  
  UNION ALL
  
  SELECT 
    r.id,
    'incoming'::text as direction,
    r.source_entity_type as related_entity_type,
    r.source_entity_id as related_entity_id,
    r.reference_type,
    r.context,
    r.confidence_score,
    r.created_at
  FROM entity_name_references r
  WHERE r.target_entity_type = p_entity_type AND r.target_entity_id = p_entity_id
  
  ORDER BY created_at DESC;
END;
$$;