-- =============================================
-- Module Transcriptions Vocales - Migration Complète
-- =============================================

-- 1) Table ai_prompts (profils de prompts ajustables)
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NULL,
  name text NOT NULL,
  slug text NOT NULL,
  category text NOT NULL,
  system_prompt text NOT NULL,
  user_prompt text NULL,
  output_schema jsonb NULL,
  model_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_prompts_slug_workspace
  ON public.ai_prompts (slug, COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_prompts_select" ON public.ai_prompts
FOR SELECT USING (
  workspace_id IS NULL
  OR public.can_access_entity_workspace(workspace_id, auth.uid())
);

CREATE POLICY "ai_prompts_insert" ON public.ai_prompts
FOR INSERT WITH CHECK (
  workspace_id IS NULL
  OR public.can_access_entity_workspace(workspace_id, auth.uid())
);

CREATE POLICY "ai_prompts_update" ON public.ai_prompts
FOR UPDATE USING (
  workspace_id IS NULL
  OR public.can_access_entity_workspace(workspace_id, auth.uid())
) WITH CHECK (
  workspace_id IS NULL
  OR public.can_access_entity_workspace(workspace_id, auth.uid())
);

CREATE POLICY "ai_prompts_delete" ON public.ai_prompts
FOR DELETE USING (
  public.has_role(auth.uid(), 'cockpit_admin'::app_role)
);

DROP TRIGGER IF EXISTS trg_ai_prompts_updated_at ON public.ai_prompts;
CREATE TRIGGER trg_ai_prompts_updated_at
BEFORE UPDATE ON public.ai_prompts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Table voice_transcriptions
CREATE TABLE IF NOT EXISTS public.voice_transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  storage_path text NOT NULL,
  source text NOT NULL CHECK (source IN ('upload', 'recording')),
  lead_id uuid NULL,
  project_id uuid NULL,
  solution_id uuid NULL,
  raw_transcript text NULL,
  segments jsonb NULL,
  summary jsonb NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','transcribing','analyzing','done','error')),
  auto_create_tasks boolean NOT NULL DEFAULT false,
  prompt_profile_id uuid NULL,
  ai_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_workspace_created
  ON public.voice_transcriptions (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_status
  ON public.voice_transcriptions (workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_lead
  ON public.voice_transcriptions (lead_id) WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_project
  ON public.voice_transcriptions (project_id) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_solution
  ON public.voice_transcriptions (solution_id) WHERE solution_id IS NOT NULL;

-- FKs
ALTER TABLE public.voice_transcriptions
  ADD CONSTRAINT fk_voice_lead FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;

ALTER TABLE public.voice_transcriptions
  ADD CONSTRAINT fk_voice_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.voice_transcriptions
  ADD CONSTRAINT fk_voice_solution FOREIGN KEY (solution_id) REFERENCES public.articles(id) ON DELETE SET NULL;

ALTER TABLE public.voice_transcriptions
  ADD CONSTRAINT fk_voice_prompt FOREIGN KEY (prompt_profile_id) REFERENCES public.ai_prompts(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS trg_voice_transcriptions_updated_at ON public.voice_transcriptions;
CREATE TRIGGER trg_voice_transcriptions_updated_at
BEFORE UPDATE ON public.voice_transcriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.voice_transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_transcriptions_select" ON public.voice_transcriptions
FOR SELECT USING (public.can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "voice_transcriptions_insert" ON public.voice_transcriptions
FOR INSERT WITH CHECK (
  public.can_access_entity_workspace(workspace_id, auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "voice_transcriptions_update" ON public.voice_transcriptions
FOR UPDATE USING (public.can_access_entity_workspace(workspace_id, auth.uid()))
WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "voice_transcriptions_delete" ON public.voice_transcriptions
FOR DELETE USING (public.has_role(auth.uid(), 'cockpit_admin'::app_role));

-- 3) Mise à jour du trigger validate_activity_log pour accepter voice_transcription
CREATE OR REPLACE FUNCTION public.validate_activity_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.entity_id IS NULL OR NEW.entity_type IS NULL THEN
    RAISE EXCEPTION 'activity_log requires both entity_id and entity_type';
  END IF;
  
  IF NEW.entity_type NOT IN ('lead', 'opportunity', 'project', 'task', 'meeting_note', 'booking', 'specification', 'voice_transcription') THEN
    RAISE EXCEPTION 'Invalid entity_type: %. Must be one of: lead, opportunity, project, task, meeting_note, booking, specification, voice_transcription', NEW.entity_type;
  END IF;
  
  IF NEW.related_entity_id IS NOT NULL AND NEW.related_entity_type IS NULL THEN
    RAISE EXCEPTION 'related_entity_id requires related_entity_type';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4) Bucket voice-transcriptions (privé)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-transcriptions',
  'voice-transcriptions',
  false,
  52428800, -- 50MB max
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/x-m4a']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "voice_storage_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'voice-transcriptions'
  AND public.can_access_entity_workspace((string_to_array(name, '/'))[1]::uuid, auth.uid())
);

CREATE POLICY "voice_storage_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'voice-transcriptions'
  AND public.can_access_entity_workspace((string_to_array(name, '/'))[1]::uuid, auth.uid())
);

CREATE POLICY "voice_storage_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'voice-transcriptions'
  AND public.can_access_entity_workspace((string_to_array(name, '/'))[1]::uuid, auth.uid())
);

CREATE POLICY "voice_storage_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'voice-transcriptions'
  AND public.has_role(auth.uid(), 'cockpit_admin'::app_role)
);

-- 5) Seed ai_prompts (3 profils par défaut)
INSERT INTO public.ai_prompts (name, slug, category, system_prompt, user_prompt, output_schema, model_config, version)
VALUES
(
  'RDV commercial',
  'transcription_rdv_commercial',
  'transcription',
  'Tu es un assistant CRM interne.
Tu reçois une transcription + contexte CRM.
Tu dois produire STRICTEMENT un JSON conforme au schéma fourni.

Règles de fiabilité:
- Ne jamais inventer. Si absent: null + ajouter une note dans extraction_quality.uncertainties.
- action_items uniquement si explicitement formulées.
- crm_enrichment = suggestions uniquement (N0).
- executive_summary: max 200 mots.
Sortie: JSON uniquement, aucun texte autour.',
  'Analyse la transcription et le contexte CRM. Produis le JSON final conforme au schéma.',
  '{
    "type":"object",
    "required":["title","context","executive_summary","key_points","decisions","action_items","risks_blockers","questions_open","next_steps","crm_enrichment","extraction_quality"],
    "properties":{
      "title":{"type":"string"},
      "context":{"type":"object","properties":{
        "date":{"type":["string","null"]},
        "participants":{"type":"array","items":{"type":"string"}},
        "company":{"type":["string","null"]},
        "lead_intent":{"type":["string","null"]}
      }},
      "executive_summary":{"type":"string"},
      "key_points":{"type":"array","items":{"type":"string"}},
      "decisions":{"type":"array","items":{"type":"string"}},
      "action_items":{"type":"array","items":{
        "type":"object",
        "required":["task","owner","due_date","priority"],
        "properties":{
          "task":{"type":"string"},
          "owner":{"type":["string","null"]},
          "due_date":{"type":["string","null"]},
          "priority":{"type":"string","enum":["low","medium","high"]}
        }
      }},
      "risks_blockers":{"type":"array","items":{"type":"string"}},
      "questions_open":{"type":"array","items":{"type":"string"}},
      "next_steps":{"type":"string"},
      "crm_enrichment":{"type":"object","properties":{
        "suggested_lead_score_delta":{"type":["integer","null"]},
        "suggested_stage_change":{"type":["string","null"]},
        "suggested_tags":{"type":"array","items":{"type":"string"}}
      }},
      "extraction_quality":{"type":"object","properties":{
        "confidence":{"type":"integer","minimum":0,"maximum":100},
        "uncertainties":{"type":"array","items":{"type":"string"}}
      }}
    }
  }'::jsonb,
  '{"model":"google/gemini-2.5-flash"}'::jsonb,
  1
),
(
  'Réunion projet',
  'transcription_reunion_projet',
  'transcription',
  'Tu es un assistant CRM interne.
Tu reçois une transcription de réunion projet + contexte.
Tu dois produire STRICTEMENT un JSON conforme au schéma fourni.

Focus: décisions, jalons, risques, actions, dépendances.

Règles de fiabilité:
- Ne jamais inventer. Si absent: null + ajouter une note dans extraction_quality.uncertainties.
- action_items uniquement si explicitement formulées.
- executive_summary: max 200 mots.
Sortie: JSON uniquement, aucun texte autour.',
  'Analyse transcription + contexte projet. Produis le JSON final.',
  '{
    "type":"object",
    "required":["title","context","executive_summary","key_points","decisions","action_items","risks_blockers","questions_open","next_steps","crm_enrichment","extraction_quality"],
    "properties":{
      "title":{"type":"string"},
      "context":{"type":"object","properties":{
        "date":{"type":["string","null"]},
        "participants":{"type":"array","items":{"type":"string"}},
        "company":{"type":["string","null"]},
        "lead_intent":{"type":["string","null"]}
      }},
      "executive_summary":{"type":"string"},
      "key_points":{"type":"array","items":{"type":"string"}},
      "decisions":{"type":"array","items":{"type":"string"}},
      "action_items":{"type":"array","items":{
        "type":"object",
        "required":["task","owner","due_date","priority"],
        "properties":{
          "task":{"type":"string"},
          "owner":{"type":["string","null"]},
          "due_date":{"type":["string","null"]},
          "priority":{"type":"string","enum":["low","medium","high"]}
        }
      }},
      "risks_blockers":{"type":"array","items":{"type":"string"}},
      "questions_open":{"type":"array","items":{"type":"string"}},
      "next_steps":{"type":"string"},
      "crm_enrichment":{"type":"object","properties":{
        "suggested_lead_score_delta":{"type":["integer","null"]},
        "suggested_stage_change":{"type":["string","null"]},
        "suggested_tags":{"type":"array","items":{"type":"string"}}
      }},
      "extraction_quality":{"type":"object","properties":{
        "confidence":{"type":"integer","minimum":0,"maximum":100},
        "uncertainties":{"type":"array","items":{"type":"string"}}
      }}
    }
  }'::jsonb,
  '{"model":"google/gemini-2.5-flash"}'::jsonb,
  1
),
(
  'Support client',
  'transcription_support_client',
  'transcription',
  'Tu es un assistant CRM interne.
Tu reçois une transcription de session support + contexte.
Tu dois produire STRICTEMENT un JSON conforme au schéma fourni.

Focus: symptômes, repro steps, résolution, next steps, blocages.

Règles de fiabilité:
- Ne jamais inventer. Si absent: null + ajouter une note dans extraction_quality.uncertainties.
- action_items uniquement si explicitement formulées.
- executive_summary: max 200 mots.
Sortie: JSON uniquement, aucun texte autour.',
  'Analyse transcription + contexte support. Produis le JSON final.',
  '{
    "type":"object",
    "required":["title","context","executive_summary","key_points","decisions","action_items","risks_blockers","questions_open","next_steps","crm_enrichment","extraction_quality"],
    "properties":{
      "title":{"type":"string"},
      "context":{"type":"object","properties":{
        "date":{"type":["string","null"]},
        "participants":{"type":"array","items":{"type":"string"}},
        "company":{"type":["string","null"]},
        "lead_intent":{"type":["string","null"]}
      }},
      "executive_summary":{"type":"string"},
      "key_points":{"type":"array","items":{"type":"string"}},
      "decisions":{"type":"array","items":{"type":"string"}},
      "action_items":{"type":"array","items":{
        "type":"object",
        "required":["task","owner","due_date","priority"],
        "properties":{
          "task":{"type":"string"},
          "owner":{"type":["string","null"]},
          "due_date":{"type":["string","null"]},
          "priority":{"type":"string","enum":["low","medium","high"]}
        }
      }},
      "risks_blockers":{"type":"array","items":{"type":"string"}},
      "questions_open":{"type":"array","items":{"type":"string"}},
      "next_steps":{"type":"string"},
      "crm_enrichment":{"type":"object","properties":{
        "suggested_lead_score_delta":{"type":["integer","null"]},
        "suggested_stage_change":{"type":["string","null"]},
        "suggested_tags":{"type":"array","items":{"type":"string"}}
      }},
      "extraction_quality":{"type":"object","properties":{
        "confidence":{"type":"integer","minimum":0,"maximum":100},
        "uncertainties":{"type":"array","items":{"type":"string"}}
      }}
    }
  }'::jsonb,
  '{"model":"google/gemini-2.5-flash"}'::jsonb,
  1
);