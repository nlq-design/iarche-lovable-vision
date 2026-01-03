-- Fix the update_lead_familiarity function to use correct status 'done' instead of 'completed'
CREATE OR REPLACE FUNCTION public.update_lead_familiarity(p_lead_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Compter les transcriptions (fix: use 'done' instead of 'completed')
  SELECT COUNT(*) INTO v_transcriptions
  FROM voice_transcriptions WHERE lead_id = p_lead_id AND status = 'done';
  
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
$function$;