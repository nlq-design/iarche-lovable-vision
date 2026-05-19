-- Étape 2.3 — Pré-génération d'artefacts (drafts mail/note)
-- Ajoute support pour stocker un brouillon généré par l'IA sur chaque ai_action.

ALTER TABLE public.ai_actions
  ADD COLUMN IF NOT EXISTS artifact_type text,
  ADD COLUMN IF NOT EXISTS artifact_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS artifact jsonb,
  ADD COLUMN IF NOT EXISTS artifact_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS artifact_model text;

-- Contrainte de statut
ALTER TABLE public.ai_actions
  DROP CONSTRAINT IF EXISTS ai_actions_artifact_status_check;
ALTER TABLE public.ai_actions
  ADD CONSTRAINT ai_actions_artifact_status_check
  CHECK (artifact_status IN ('none', 'generating', 'ready', 'edited', 'sent', 'failed'));

-- Contrainte de type
ALTER TABLE public.ai_actions
  DROP CONSTRAINT IF EXISTS ai_actions_artifact_type_check;
ALTER TABLE public.ai_actions
  ADD CONSTRAINT ai_actions_artifact_type_check
  CHECK (artifact_type IS NULL OR artifact_type IN ('email', 'note', 'proposal', 'task_brief'));

-- Index pour requêtes "actions avec draft prêt"
CREATE INDEX IF NOT EXISTS idx_ai_actions_artifact_status
  ON public.ai_actions(workspace_id, artifact_status)
  WHERE artifact_status IN ('ready', 'edited');

COMMENT ON COLUMN public.ai_actions.artifact IS 'Brouillon généré par IA (email: {subject,body,recipient}, note: {title,content}, proposal: {sections}). Étape 2.3 Vague 2.';
COMMENT ON COLUMN public.ai_actions.artifact_status IS 'none|generating|ready|edited|sent|failed';