
CREATE OR REPLACE FUNCTION public.get_crm_graph(
  p_entity_type text,
  p_entity_id uuid,
  p_depth int DEFAULT 2,
  p_workspace_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nodes jsonb := '[]'::jsonb;
  v_edges jsonb := '[]'::jsonb;
  v_seed_key text;
  v_visited text[] := ARRAY[]::text[];
  v_frontier text[];
  v_next_frontier text[];
  v_current text;
  v_parts text[];
  v_t text;
  v_id uuid;
  v_depth int;
BEGIN
  -- Validation
  IF p_entity_type IS NULL OR p_entity_id IS NULL THEN
    RETURN jsonb_build_object('nodes', '[]'::jsonb, 'edges', '[]'::jsonb);
  END IF;

  IF p_depth IS NULL OR p_depth < 1 THEN p_depth := 1; END IF;
  IF p_depth > 3 THEN p_depth := 3; END IF;

  v_seed_key := p_entity_type || ':' || p_entity_id::text;
  v_frontier := ARRAY[v_seed_key];
  v_depth := 0;

  -- BFS jusqu'à p_depth
  WHILE v_depth < p_depth AND array_length(v_frontier, 1) > 0 LOOP
    v_next_frontier := ARRAY[]::text[];

    FOREACH v_current IN ARRAY v_frontier LOOP
      IF v_current = ANY(v_visited) THEN CONTINUE; END IF;
      v_visited := array_append(v_visited, v_current);

      v_parts := string_to_array(v_current, ':');
      v_t := v_parts[1];
      v_id := v_parts[2]::uuid;

      -- ============ FKs DIRECTES + M2M par type source ============

      -- LEAD
      IF v_t = 'lead' THEN
        -- lead.created_by_partner_id -> partner
        FOR v_id IN
          SELECT l.created_by_partner_id FROM leads l
          JOIN partners p ON p.id = l.created_by_partner_id AND p.workspace_id = p_workspace_id
          WHERE l.id = (string_to_array(v_current,':'))[2]::uuid
            AND l.workspace_id = p_workspace_id
            AND l.created_by_partner_id IS NOT NULL
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current, 'target', 'partner:'||v_id, 'kind','fk','label','créé par');
          v_next_frontier := array_append(v_next_frontier, 'partner:'||v_id);
        END LOOP;

        -- lead_contacts (M2M lead<->contact)
        FOR v_id IN
          SELECT lc.id FROM lead_contacts lc
          WHERE lc.lead_id = (string_to_array(v_current,':'))[2]::uuid
            AND lc.workspace_id = p_workspace_id
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','lead_contact:'||v_id,'kind','m2m','label','contact');
          v_next_frontier := array_append(v_next_frontier, 'lead_contact:'||v_id);
        END LOOP;

        -- lead_partners
        FOR v_id IN
          SELECT lp.partner_id FROM lead_partners lp
          JOIN partners p ON p.id = lp.partner_id AND p.workspace_id = p_workspace_id
          WHERE lp.lead_id = (string_to_array(v_current,':'))[2]::uuid
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','partner:'||v_id,'kind','m2m','label','partenaire');
          v_next_frontier := array_append(v_next_frontier, 'partner:'||v_id);
        END LOOP;

        -- projects via projects.lead_id
        FOR v_id IN
          SELECT pr.id FROM projects pr
          WHERE pr.lead_id = (string_to_array(v_current,':'))[2]::uuid
            AND pr.workspace_id = p_workspace_id
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','project:'||v_id,'kind','fk','label','projet');
          v_next_frontier := array_append(v_next_frontier, 'project:'||v_id);
        END LOOP;

        -- solution_leads
        FOR v_id IN
          SELECT sl.solution_id FROM solution_leads sl
          JOIN articles a ON a.id = sl.solution_id
          WHERE sl.lead_id = (string_to_array(v_current,':'))[2]::uuid
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','solution:'||v_id,'kind','m2m','label','solution');
          v_next_frontier := array_append(v_next_frontier, 'solution:'||v_id);
        END LOOP;

        -- documents via lead_id
        FOR v_id IN
          SELECT gd.id FROM generated_documents gd
          WHERE gd.lead_id = (string_to_array(v_current,':'))[2]::uuid
            AND gd.workspace_id = p_workspace_id
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','document:'||v_id,'kind','fk','label','document');
          v_next_frontier := array_append(v_next_frontier, 'document:'||v_id);
        END LOOP;

        -- transcriptions via lead_id
        FOR v_id IN
          SELECT vt.id FROM voice_transcriptions vt
          WHERE vt.lead_id = (string_to_array(v_current,':'))[2]::uuid
            AND vt.workspace_id = p_workspace_id
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','transcription:'||v_id,'kind','fk','label','transcription');
          v_next_frontier := array_append(v_next_frontier, 'transcription:'||v_id);
        END LOOP;
      END IF;

      -- LEAD_CONTACT
      IF v_t = 'lead_contact' THEN
        FOR v_id IN
          SELECT lc.lead_id FROM lead_contacts lc
          WHERE lc.id = (string_to_array(v_current,':'))[2]::uuid
            AND lc.workspace_id = p_workspace_id
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','lead:'||v_id,'kind','m2m','label','lead');
          v_next_frontier := array_append(v_next_frontier, 'lead:'||v_id);
        END LOOP;

        -- transcription_participants (lead_contact <-> transcription)
        FOR v_id IN
          SELECT tp.transcription_id FROM transcription_participants tp
          JOIN voice_transcriptions vt ON vt.id = tp.transcription_id AND vt.workspace_id = p_workspace_id
          WHERE tp.lead_contact_id = (string_to_array(v_current,':'))[2]::uuid
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','transcription:'||v_id,'kind','m2m','label','participant');
          v_next_frontier := array_append(v_next_frontier, 'transcription:'||v_id);
        END LOOP;
      END IF;

      -- PARTNER
      IF v_t = 'partner' THEN
        FOR v_id IN
          SELECT lp.lead_id FROM lead_partners lp
          JOIN leads l ON l.id = lp.lead_id AND l.workspace_id = p_workspace_id
          WHERE lp.partner_id = (string_to_array(v_current,':'))[2]::uuid
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','lead:'||v_id,'kind','m2m','label','lead');
          v_next_frontier := array_append(v_next_frontier, 'lead:'||v_id);
        END LOOP;

        FOR v_id IN
          SELECT pp.project_id FROM project_partners pp
          JOIN projects pr ON pr.id = pp.project_id AND pr.workspace_id = p_workspace_id
          WHERE pp.partner_id = (string_to_array(v_current,':'))[2]::uuid
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','project:'||v_id,'kind','m2m','label','projet');
          v_next_frontier := array_append(v_next_frontier, 'project:'||v_id);
        END LOOP;

        FOR v_id IN
          SELECT sp.solution_id FROM solution_partners sp
          WHERE sp.partner_id = (string_to_array(v_current,':'))[2]::uuid
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','solution:'||v_id,'kind','m2m','label','solution');
          v_next_frontier := array_append(v_next_frontier, 'solution:'||v_id);
        END LOOP;

        FOR v_id IN
          SELECT dp.document_id FROM document_partners dp
          JOIN generated_documents gd ON gd.id = dp.document_id AND gd.workspace_id = p_workspace_id
          WHERE dp.partner_id = (string_to_array(v_current,':'))[2]::uuid
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','document:'||v_id,'kind','m2m','label','document');
          v_next_frontier := array_append(v_next_frontier, 'document:'||v_id);
        END LOOP;

        FOR v_id IN
          SELECT tp.transcription_id FROM transcription_partners tp
          JOIN voice_transcriptions vt ON vt.id = tp.transcription_id AND vt.workspace_id = p_workspace_id
          WHERE tp.partner_id = (string_to_array(v_current,':'))[2]::uuid
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','transcription:'||v_id,'kind','m2m','label','transcription');
          v_next_frontier := array_append(v_next_frontier, 'transcription:'||v_id);
        END LOOP;
      END IF;

      -- PROJECT
      IF v_t = 'project' THEN
        -- lead_id
        FOR v_id IN
          SELECT pr.lead_id FROM projects pr
          WHERE pr.id = (string_to_array(v_current,':'))[2]::uuid
            AND pr.workspace_id = p_workspace_id
            AND pr.lead_id IS NOT NULL
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','lead:'||v_id,'kind','fk','label','lead');
          v_next_frontier := array_append(v_next_frontier, 'lead:'||v_id);
        END LOOP;

        -- created_by_partner_id
        FOR v_id IN
          SELECT pr.created_by_partner_id FROM projects pr
          WHERE pr.id = (string_to_array(v_current,':'))[2]::uuid
            AND pr.workspace_id = p_workspace_id
            AND pr.created_by_partner_id IS NOT NULL
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','partner:'||v_id,'kind','fk','label','créé par');
          v_next_frontier := array_append(v_next_frontier, 'partner:'||v_id);
        END LOOP;

        -- project_partners
        FOR v_id IN
          SELECT pp.partner_id FROM project_partners pp
          JOIN partners p ON p.id = pp.partner_id AND p.workspace_id = p_workspace_id
          WHERE pp.project_id = (string_to_array(v_current,':'))[2]::uuid
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','partner:'||v_id,'kind','m2m','label','partenaire');
          v_next_frontier := array_append(v_next_frontier, 'partner:'||v_id);
        END LOOP;

        -- documents
        FOR v_id IN
          SELECT gd.id FROM generated_documents gd
          WHERE gd.project_id = (string_to_array(v_current,':'))[2]::uuid
            AND gd.workspace_id = p_workspace_id
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','document:'||v_id,'kind','fk','label','document');
          v_next_frontier := array_append(v_next_frontier, 'document:'||v_id);
        END LOOP;

        -- transcriptions
        FOR v_id IN
          SELECT vt.id FROM voice_transcriptions vt
          WHERE vt.project_id = (string_to_array(v_current,':'))[2]::uuid
            AND vt.workspace_id = p_workspace_id
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','transcription:'||v_id,'kind','fk','label','transcription');
          v_next_frontier := array_append(v_next_frontier, 'transcription:'||v_id);
        END LOOP;
      END IF;

      -- SOLUTION (article)
      IF v_t = 'solution' THEN
        FOR v_id IN
          SELECT sp.partner_id FROM solution_partners sp
          JOIN partners p ON p.id = sp.partner_id AND p.workspace_id = p_workspace_id
          WHERE sp.solution_id = (string_to_array(v_current,':'))[2]::uuid
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','partner:'||v_id,'kind','m2m','label','partenaire');
          v_next_frontier := array_append(v_next_frontier, 'partner:'||v_id);
        END LOOP;

        FOR v_id IN
          SELECT sl.lead_id FROM solution_leads sl
          JOIN leads l ON l.id = sl.lead_id AND l.workspace_id = p_workspace_id
          WHERE sl.solution_id = (string_to_array(v_current,':'))[2]::uuid
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','lead:'||v_id,'kind','m2m','label','lead');
          v_next_frontier := array_append(v_next_frontier, 'lead:'||v_id);
        END LOOP;

        FOR v_id IN
          SELECT vt.id FROM voice_transcriptions vt
          WHERE vt.solution_id = (string_to_array(v_current,':'))[2]::uuid
            AND vt.workspace_id = p_workspace_id
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','transcription:'||v_id,'kind','fk','label','transcription');
          v_next_frontier := array_append(v_next_frontier, 'transcription:'||v_id);
        END LOOP;
      END IF;

      -- DOCUMENT
      IF v_t = 'document' THEN
        FOR v_id IN
          SELECT gd.lead_id FROM generated_documents gd
          WHERE gd.id = (string_to_array(v_current,':'))[2]::uuid
            AND gd.workspace_id = p_workspace_id AND gd.lead_id IS NOT NULL
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','lead:'||v_id,'kind','fk','label','lead');
          v_next_frontier := array_append(v_next_frontier, 'lead:'||v_id);
        END LOOP;

        FOR v_id IN
          SELECT gd.project_id FROM generated_documents gd
          WHERE gd.id = (string_to_array(v_current,':'))[2]::uuid
            AND gd.workspace_id = p_workspace_id AND gd.project_id IS NOT NULL
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','project:'||v_id,'kind','fk','label','projet');
          v_next_frontier := array_append(v_next_frontier, 'project:'||v_id);
        END LOOP;

        FOR v_id IN
          SELECT dp.partner_id FROM document_partners dp
          JOIN partners p ON p.id = dp.partner_id AND p.workspace_id = p_workspace_id
          WHERE dp.document_id = (string_to_array(v_current,':'))[2]::uuid
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','partner:'||v_id,'kind','m2m','label','partenaire');
          v_next_frontier := array_append(v_next_frontier, 'partner:'||v_id);
        END LOOP;
      END IF;

      -- TRANSCRIPTION
      IF v_t = 'transcription' THEN
        FOR v_id IN
          SELECT vt.lead_id FROM voice_transcriptions vt
          WHERE vt.id = (string_to_array(v_current,':'))[2]::uuid
            AND vt.workspace_id = p_workspace_id AND vt.lead_id IS NOT NULL
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','lead:'||v_id,'kind','fk','label','lead');
          v_next_frontier := array_append(v_next_frontier, 'lead:'||v_id);
        END LOOP;

        FOR v_id IN
          SELECT vt.project_id FROM voice_transcriptions vt
          WHERE vt.id = (string_to_array(v_current,':'))[2]::uuid
            AND vt.workspace_id = p_workspace_id AND vt.project_id IS NOT NULL
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','project:'||v_id,'kind','fk','label','projet');
          v_next_frontier := array_append(v_next_frontier, 'project:'||v_id);
        END LOOP;

        FOR v_id IN
          SELECT vt.solution_id FROM voice_transcriptions vt
          WHERE vt.id = (string_to_array(v_current,':'))[2]::uuid
            AND vt.workspace_id = p_workspace_id AND vt.solution_id IS NOT NULL
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','solution:'||v_id,'kind','fk','label','solution');
          v_next_frontier := array_append(v_next_frontier, 'solution:'||v_id);
        END LOOP;

        FOR v_id IN
          SELECT tp.partner_id FROM transcription_partners tp
          JOIN partners p ON p.id = tp.partner_id AND p.workspace_id = p_workspace_id
          WHERE tp.transcription_id = (string_to_array(v_current,':'))[2]::uuid
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','partner:'||v_id,'kind','m2m','label','partenaire');
          v_next_frontier := array_append(v_next_frontier, 'partner:'||v_id);
        END LOOP;

        FOR v_id IN
          SELECT tp.lead_contact_id FROM transcription_participants tp
          WHERE tp.transcription_id = (string_to_array(v_current,':'))[2]::uuid
            AND tp.lead_contact_id IS NOT NULL
        LOOP
          v_edges := v_edges || jsonb_build_object('source', v_current,'target','lead_contact:'||v_id,'kind','m2m','label','participant');
          v_next_frontier := array_append(v_next_frontier, 'lead_contact:'||v_id);
        END LOOP;
      END IF;

    END LOOP;

    v_frontier := v_next_frontier;
    v_depth := v_depth + 1;
  END LOOP;

  -- Hydrater nodes : un node par clé visitée OU dans les edges
  WITH all_keys AS (
    SELECT DISTINCT k FROM unnest(v_visited) k
    UNION
    SELECT DISTINCT (e->>'source')::text FROM jsonb_array_elements(v_edges) e
    UNION
    SELECT DISTINCT (e->>'target')::text FROM jsonb_array_elements(v_edges) e
  ),
  parsed AS (
    SELECT k, split_part(k,':',1) AS t, split_part(k,':',2)::uuid AS id FROM all_keys
  ),
  hydrated AS (
    SELECT k, t, id,
      CASE t
        WHEN 'lead' THEN (SELECT COALESCE(NULLIF(l.company,''), l.name, l.email) FROM leads l WHERE l.id = parsed.id AND l.workspace_id = p_workspace_id)
        WHEN 'lead_contact' THEN (SELECT COALESCE(NULLIF(lc.full_name,''), lc.email, 'Contact') FROM lead_contacts lc WHERE lc.id = parsed.id AND lc.workspace_id = p_workspace_id)
        WHEN 'partner' THEN (SELECT COALESCE(NULLIF(p.company_name,''), p.full_name, p.email) FROM partners p WHERE p.id = parsed.id AND p.workspace_id = p_workspace_id)
        WHEN 'project' THEN (SELECT pr.name FROM projects pr WHERE pr.id = parsed.id AND pr.workspace_id = p_workspace_id)
        WHEN 'solution' THEN (SELECT a.title FROM articles a WHERE a.id = parsed.id)
        WHEN 'document' THEN (SELECT gd.title FROM generated_documents gd WHERE gd.id = parsed.id AND gd.workspace_id = p_workspace_id)
        WHEN 'transcription' THEN (SELECT COALESCE(vt.title, 'Transcription ' || to_char(vt.created_at,'DD/MM/YYYY')) FROM voice_transcriptions vt WHERE vt.id = parsed.id AND vt.workspace_id = p_workspace_id)
        ELSE NULL
      END AS label
    FROM parsed
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', k,
    'type', t,
    'label', COALESCE(label, t || ' inconnu'),
    'meta', jsonb_build_object('entity_id', id, 'is_seed', (k = v_seed_key))
  )), '[]'::jsonb)
  INTO v_nodes
  FROM hydrated;

  RETURN jsonb_build_object('nodes', v_nodes, 'edges', v_edges);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_crm_graph(text, uuid, int, uuid) TO authenticated;
