# Cahier des Charges V3.1.4 — Cockpit Commercial IArche

## Document de spécification

**Projet :** Module Cockpit Commercial intégré au back-office existant  
**Version :** 3.1.4  
**Date :** 21 décembre 2025  

**Changelog V3.1.3 → V3.1.4 :**
- Fix: Ordre migrations corrigé (meeting_notes AVANT tasks)
- Fix: entity_type standardisé ('meeting_note' pas 'meeting')
- Fix: activity_log_insert durcie (can_access_entity_workspace)
- Fix: validate_status_transition APRÈS statuses
- Fix: Auto-insert owner sur CREATE workspace
- Fix: cockpit_reports = append-only (explicite)
- Fix: Whitelist entity_type dans triggers
- Add: Index sur FK tasks/activity_log
- Add: Note Edge Functions = service_role
- Add: Clarification generated_documents.status ≠ statuses table

---

## 0. CONTEXTE EXISTANT

### Ce qui existe déjà
- **Site public** : portail, solutions, services, ressources
- **Module Admin privé** : authentification + 2FA en place, back-office complet
- **Tables existantes** : leads, bookings, booking_types, booking_availability, contacts, articles, admin_audit_logs

### Contraintes strictes
1. **Zéro duplication** entre Admin et Cockpit
2. **Réutilisation** des tables existantes
3. **Cohérence UI** avec la charte graphique IArche
4. **Cockpit accessible uniquement depuis Admin**

---

## 1. ORDRE D'EXÉCUTION DES MIGRATIONS

**CRITIQUE : Respecter cet ordre exact. Dépendances vérifiées.**

```
PHASE 0 — Prérequis (hors transaction si enum existe)
├── 001_cockpit_roles.sql

PHASE 1 — Tables fondation
├── 002_workspaces.sql              # CREATE TABLE + trigger type
├── 003_workspace_members.sql       # CREATE TABLE + trigger role
├── 004_workspace_default.sql       # INSERT workspace par défaut
├── 005_workspace_auto_owner.sql    # Trigger auto-insert owner sur create
├── 006_cockpit_auth.sql            # sessions + attempts

PHASE 2 — Helper functions (ORDRE CRITIQUE)
├── 007_func_has_cockpit_access.sql     # PREMIER
├── 008_func_is_workspace_member.sql
├── 009_func_has_workspace_role.sql
├── 010_func_can_access_workspace.sql   # Appelle has_cockpit_access
├── 011_func_can_access_entity.sql
├── 012_func_check_mfa_rate_limit.sql
├── 013_func_cleanup_expired.sql

PHASE 3 — Triggers génériques
├── 014_trigger_set_updated_at.sql

PHASE 4 — Tables métier (ORDRE DÉPENDANCES)
├── 015_statuses.sql                    # AVANT trigger validate_status
├── 016_trigger_validate_status.sql     # APRÈS statuses
├── 017_leads_extensions.sql
├── 018_opportunities.sql
├── 019_projects.sql
├── 020_meeting_notes.sql               # AVANT tasks (FK)
├── 021_tasks.sql                       # APRÈS meeting_notes
├── 022_specifications.sql
├── 023_project_contacts.sql
├── 024_project_documents.sql
├── 025_generated_documents.sql
├── 026_activity_log.sql
├── 027_cockpit_reports.sql
├── 028_cockpit_settings.sql
├── 029_ai_prompts.sql
├── 030_ai_usage_log.sql

PHASE 5 — Index performance
├── 031_indexes_fk.sql

PHASE 6 — Storage & RLS
├── 032_storage_bucket.sql
├── 033_rls_enable.sql
├── 034_rls_policies.sql

PHASE 7 — Maintenance
├── 035_pg_cron_setup.sql
```

---

## 2. SÉCURITÉ — STEP-UP MFA

### 2.1 Rôles Cockpit

```sql
-- 001_cockpit_roles.sql (HORS transaction)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cockpit_user' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'cockpit_user';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cockpit_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'cockpit_admin';
  END IF;
END $$;
```

### 2.2 Tables auth

```sql
-- 006_cockpit_auth.sql
CREATE TABLE cockpit_auth_sessions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  mfa_method TEXT DEFAULT 'totp',
  stepup_reason TEXT DEFAULT 'cockpit_access',
  ip_hash TEXT,
  ua_hash TEXT
);

CREATE INDEX idx_cockpit_auth_expires ON cockpit_auth_sessions(expires_at);

CREATE TABLE cockpit_mfa_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  attempted_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN NOT NULL,
  ip_hash TEXT,
  failure_reason TEXT
);

-- Index optimisé pour rate limit (partial index)
CREATE INDEX idx_cockpit_mfa_attempts_ratelimit 
  ON cockpit_mfa_attempts(user_id, attempted_at DESC) 
  WHERE success = false;
```

### 2.3 Rate limiting & cleanup

```sql
-- 012_func_check_mfa_rate_limit.sql
CREATE OR REPLACE FUNCTION check_cockpit_mfa_rate_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM cockpit_mfa_attempts
  WHERE user_id = p_user_id 
    AND attempted_at > now() - INTERVAL '5 minutes'
    AND success = false;
  
  RETURN attempt_count < 3;
END;
$$;

-- 013_func_cleanup_expired.sql
CREATE OR REPLACE FUNCTION cleanup_expired_cockpit_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM cockpit_mfa_attempts WHERE attempted_at < now() - INTERVAL '24 hours';
  DELETE FROM cockpit_auth_sessions WHERE expires_at < now() - INTERVAL '7 days';
END;
$$;

-- 035_pg_cron_setup.sql
-- Via Supabase Dashboard > Database > Extensions > pg_cron:
-- SELECT cron.schedule('cleanup-cockpit-data', '0 * * * *', 'SELECT cleanup_expired_cockpit_data()');
```

### 2.4 StepUpMfaDialog (flow challenge → verify)

```typescript
const StepUpMfaDialog = ({ onSuccess, onCancel }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const { user } = useAuth();

  const getTotpFactor = () => {
    return user?.factors?.find(f => f.factor_type === 'totp' && f.status === 'verified');
  };

  useEffect(() => {
    const initChallenge = async () => {
      const factor = getTotpFactor();
      if (!factor) { setError('Aucun facteur TOTP configuré'); return; }
      
      const { data, error } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (error) { setError('Erreur initialisation MFA'); return; }
      setChallengeId(data.id);
    };
    initChallenge();
  }, []);

  const handleSubmit = async () => {
    const factor = getTotpFactor();
    if (!factor || !challengeId) { setError('Session MFA invalide'); return; }

    const { data: canAttempt } = await supabase.rpc('check_cockpit_mfa_rate_limit', { p_user_id: user.id });
    if (!canAttempt) { setError('Trop de tentatives. Réessayez dans 5 minutes.'); return; }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challengeId,
      code: code,
    });

    await supabase.from('cockpit_mfa_attempts').insert({
      user_id: user.id,
      success: !verifyError,
      failure_reason: verifyError?.message || null,
    });

    if (verifyError) {
      setError('Code invalide.');
      const { data: newChallenge } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (newChallenge) setChallengeId(newChallenge.id);
      return;
    }

    await supabase.from('cockpit_auth_sessions').upsert(
      {
        user_id: user.id,
        verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 4 * 3600000).toISOString(),
        mfa_method: 'totp',
        stepup_reason: 'cockpit_access',
      },
      { onConflict: 'user_id' }
    );

    onSuccess();
  };
};
```

---

## 3. WORKSPACES

### 3.1 Tables

```sql
-- 002_workspaces.sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'internal',
  description TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT workspaces_type_check CHECK (type IN ('internal', 'partner', 'client'))
);

CREATE INDEX idx_workspaces_type ON workspaces(type);

-- 003_workspace_members.sql
CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id),
  CONSTRAINT workspace_members_role_check CHECK (role IN ('owner', 'editor', 'viewer'))
);

CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
```

### 3.2 Workspace par défaut + Auto-owner

```sql
-- 004_workspace_default.sql
INSERT INTO workspaces (id, name, type, description)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'IArche Interne',
  'internal',
  'Espace de travail interne équipe IArche'
)
ON CONFLICT (id) DO NOTHING;

-- 005_workspace_auto_owner.sql
CREATE OR REPLACE FUNCTION auto_insert_workspace_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO workspace_members (workspace_id, user_id, role, invited_by)
    VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_insert_workspace_owner_trigger
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION auto_insert_workspace_owner();
```

### 3.3 Helper functions (ORDRE CRITIQUE)

```sql
-- 007_func_has_cockpit_access.sql (PREMIER)
CREATE OR REPLACE FUNCTION has_cockpit_access(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN has_role(user_uuid, 'cockpit_user') OR has_role(user_uuid, 'cockpit_admin');
END;
$$;

-- 008_func_is_workspace_member.sql
CREATE OR REPLACE FUNCTION is_workspace_member(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  );
END;
$$;

-- 009_func_has_workspace_role.sql
CREATE OR REPLACE FUNCTION has_workspace_role(p_workspace_id UUID, p_user_id UUID, p_min_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role TEXT;
  v_role_order INTEGER;
  v_min_order INTEGER;
BEGIN
  SELECT role INTO v_role 
  FROM workspace_members 
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  IF v_role IS NULL THEN RETURN FALSE; END IF;
  
  v_role_order := CASE v_role WHEN 'owner' THEN 3 WHEN 'editor' THEN 2 WHEN 'viewer' THEN 1 ELSE 0 END;
  v_min_order := CASE p_min_role WHEN 'owner' THEN 3 WHEN 'editor' THEN 2 WHEN 'viewer' THEN 1 ELSE 0 END;
  
  RETURN v_role_order >= v_min_order;
END;
$$;

-- 010_func_can_access_workspace.sql (APRÈS has_cockpit_access)
CREATE OR REPLACE FUNCTION can_access_workspace(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_workspace_type TEXT;
BEGIN
  IF has_role(p_user_id, 'cockpit_admin') THEN RETURN TRUE; END IF;
  IF is_workspace_member(p_workspace_id, p_user_id) THEN RETURN TRUE; END IF;
  
  SELECT type INTO v_workspace_type FROM workspaces WHERE id = p_workspace_id;
  IF v_workspace_type = 'internal' AND has_cockpit_access(p_user_id) THEN RETURN TRUE; END IF;
  
  RETURN FALSE;
END;
$$;

-- 011_func_can_access_entity.sql
CREATE OR REPLACE FUNCTION can_access_entity_workspace(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN can_access_workspace(p_workspace_id, p_user_id);
END;
$$;
```

---

## 4. IA — 3 NIVEAUX D'AUTONOMIE

| Niveau | Type | Actions | Validation |
|--------|------|---------|------------|
| **N0** | Auto informatif | Scoring, insights, rapports | Aucune |
| **N1** | Auto brouillon | Drafts CDC/devis/emails/tasks | Éditables |
| **N2** | Exécution contrôlée | Envoi email, stage terminal | Re-validation N2 |

### 4.1 Tables IA

```sql
-- 028_cockpit_settings.sql
CREATE TABLE cockpit_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_autopilot_enabled BOOLEAN DEFAULT false,
  ai_autopilot_scope TEXT[] DEFAULT '{}',
  ai_autopilot_max_actions_per_day INTEGER DEFAULT 10,
  default_pipeline_view TEXT DEFAULT 'kanban',
  default_workspace_id UUID REFERENCES workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  stepup_ttl_hours INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 029_ai_prompts.sql
CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, version)
);

-- 030_ai_usage_log.sql
-- NOTE: INSERT uniquement via Edge Functions (service_role)
CREATE TABLE ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  function_name TEXT NOT NULL,
  prompt_name TEXT,
  prompt_version TEXT,
  entity_type TEXT,
  entity_id UUID,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  tokens_input INTEGER,
  tokens_output INTEGER,
  model TEXT,
  duration_ms INTEGER,
  autonomy_level TEXT,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_usage_user ON ai_usage_log(user_id, created_at DESC);
CREATE INDEX idx_ai_usage_workspace ON ai_usage_log(workspace_id);
```

---

## 5. MODÈLE DE DONNÉES

### 5.1 Constantes entity_type (WHITELIST)

```sql
-- Valeurs autorisées pour entity_type (standardisées)
-- lead, opportunity, project, meeting_note, task, generated_document, specification
-- NOTE: 'meeting_note' (pas 'meeting') pour cohérence avec table meeting_notes
```

### 5.2 Triggers génériques

```sql
-- 014_trigger_set_updated_at.sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

### 5.3 Table statuses (AVANT trigger validate)

```sql
-- 015_statuses.sql
CREATE TABLE statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_terminal BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  ui_variant TEXT DEFAULT 'default',
  allowed_transitions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, code)
);

CREATE INDEX idx_statuses_entity ON statuses(entity_type);

INSERT INTO statuses (entity_type, code, label, display_order, is_terminal, is_default, ui_variant, allowed_transitions) VALUES
  ('lead', 'new', 'Nouveau', 1, false, true, 'default', '["contacted"]'::jsonb),
  ('lead', 'contacted', 'Contacté', 2, false, false, 'info', '["qualified", "disqualified"]'::jsonb),
  ('lead', 'qualified', 'Qualifié', 3, false, false, 'success', '["disqualified"]'::jsonb),
  ('lead', 'disqualified', 'Disqualifié', 4, true, false, 'error', '[]'::jsonb),
  ('opportunity', 'lead', 'Lead', 1, false, true, 'default', '["qualified"]'::jsonb),
  ('opportunity', 'qualified', 'Qualifié', 2, false, false, 'info', '["proposal", "lost"]'::jsonb),
  ('opportunity', 'proposal', 'Proposition', 3, false, false, 'info', '["negotiation", "lost"]'::jsonb),
  ('opportunity', 'negotiation', 'Négociation', 4, false, false, 'warning', '["won", "lost"]'::jsonb),
  ('opportunity', 'won', 'Gagné', 5, true, false, 'success', '[]'::jsonb),
  ('opportunity', 'lost', 'Perdu', 6, true, false, 'error', '[]'::jsonb),
  ('project', 'scoping', 'Cadrage', 1, false, true, 'default', '["design", "cancelled"]'::jsonb),
  ('project', 'design', 'Conception', 2, false, false, 'info', '["development", "cancelled"]'::jsonb),
  ('project', 'development', 'Développement', 3, false, false, 'info', '["testing", "cancelled"]'::jsonb),
  ('project', 'testing', 'Tests', 4, false, false, 'warning', '["deployment", "development"]'::jsonb),
  ('project', 'deployment', 'Déploiement', 5, false, false, 'warning', '["maintenance", "completed"]'::jsonb),
  ('project', 'maintenance', 'Suivi', 6, false, false, 'info', '["completed"]'::jsonb),
  ('project', 'completed', 'Terminé', 7, true, false, 'success', '[]'::jsonb),
  ('project', 'cancelled', 'Annulé', 8, true, false, 'error', '[]'::jsonb),
  ('specification', 'draft', 'Brouillon', 1, false, true, 'default', '["review"]'::jsonb),
  ('specification', 'review', 'En revue', 2, false, false, 'warning', '["approved", "draft"]'::jsonb),
  ('specification', 'approved', 'Validé', 3, true, false, 'success', '[]'::jsonb);
```

### 5.4 Trigger validate_status_transition (APRÈS statuses)

```sql
-- 016_trigger_validate_status.sql
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_entity_type TEXT;
  v_old_status TEXT;
  v_new_status TEXT;
  v_allowed JSONB;
  v_transition_valid BOOLEAN;
BEGIN
  v_entity_type := CASE TG_TABLE_NAME
    WHEN 'leads' THEN 'lead'
    WHEN 'opportunities' THEN 'opportunity'
    WHEN 'projects' THEN 'project'
    WHEN 'specifications' THEN 'specification'
    ELSE TG_TABLE_NAME
  END;
  
  IF TG_TABLE_NAME = 'opportunities' THEN
    v_old_status := OLD.stage; v_new_status := NEW.stage;
  ELSIF TG_TABLE_NAME = 'leads' THEN
    v_old_status := OLD.qualification_status; v_new_status := NEW.qualification_status;
  ELSE
    v_old_status := OLD.status; v_new_status := NEW.status;
  END IF;
  
  IF v_old_status IS NULL OR v_old_status = v_new_status THEN RETURN NEW; END IF;
  
  SELECT allowed_transitions INTO v_allowed
  FROM statuses WHERE entity_type = v_entity_type AND code = v_old_status;
  
  IF v_allowed IS NULL OR jsonb_array_length(v_allowed) = 0 THEN RETURN NEW; END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(v_allowed) AS t(val) WHERE t.val = v_new_status
  ) INTO v_transition_valid;
  
  IF NOT v_transition_valid THEN
    RAISE EXCEPTION 'Transition non autorisée: % → %', v_old_status, v_new_status;
  END IF;
  
  RETURN NEW;
END;
$$;
```

### 5.5 Tables métier principales

```sql
-- 017_leads_extensions.sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualification_status TEXT DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}'::jsonb;

-- 018_opportunities.sql
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  lead_id UUID REFERENCES leads(id),
  title TEXT NOT NULL,
  description TEXT,
  value_amount DECIMAL(12,2),
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  stage TEXT NOT NULL DEFAULT 'lead',
  expected_close_date DATE,
  source TEXT,
  lost_to TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  close_reason TEXT
);

CREATE INDEX idx_opportunities_workspace ON opportunities(workspace_id);
CREATE INDEX idx_opportunities_stage ON opportunities(stage);

CREATE TRIGGER set_updated_at_opportunities BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER validate_opportunity_transition BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION validate_status_transition();

-- 019_projects.sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  opportunity_id UUID REFERENCES opportunities(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'scoping',
  health_status TEXT NOT NULL DEFAULT 'on_track' CHECK (health_status IN ('on_track', 'at_risk', 'blocked')),
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,
  budget_amount DECIMAL(12,2),
  consumed_amount DECIMAL(12,2) DEFAULT 0,
  assigned_to UUID REFERENCES auth.users(id),
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_workspace ON projects(workspace_id);
CREATE INDEX idx_projects_status ON projects(status);

CREATE OR REPLACE FUNCTION propagate_workspace_from_opportunity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.opportunity_id IS NOT NULL THEN
    SELECT workspace_id INTO NEW.workspace_id FROM opportunities WHERE id = NEW.opportunity_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_project_health()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.target_end_date IS NOT NULL AND NEW.target_end_date < CURRENT_DATE AND NEW.status NOT IN ('completed', 'cancelled') THEN
    NEW.health_status = 'at_risk';
  END IF;
  IF NEW.budget_amount IS NOT NULL AND NEW.budget_amount > 0 AND NEW.consumed_amount > NEW.budget_amount * 0.8 THEN
    NEW.health_status = 'at_risk';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER propagate_workspace_project BEFORE INSERT ON projects FOR EACH ROW EXECUTE FUNCTION propagate_workspace_from_opportunity();
CREATE TRIGGER update_project_health_trigger BEFORE INSERT OR UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_project_health();
CREATE TRIGGER set_updated_at_projects BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER validate_project_transition BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION validate_status_transition();
```

### 5.6 Table meeting_notes (AVANT tasks)

```sql
-- 020_meeting_notes.sql (DOIT être AVANT tasks car tasks référence meeting_notes)
CREATE TABLE meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id),
  project_id UUID REFERENCES projects(id),
  objectives TEXT,
  notes TEXT,
  duration_minutes INTEGER,
  ai_summary TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  next_steps TEXT,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meeting_notes_workspace ON meeting_notes(workspace_id);
CREATE INDEX idx_meeting_notes_project ON meeting_notes(project_id);
CREATE INDEX idx_meeting_notes_opportunity ON meeting_notes(opportunity_id);

CREATE OR REPLACE FUNCTION propagate_workspace_meeting_notes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT workspace_id INTO NEW.workspace_id FROM projects WHERE id = NEW.project_id;
  ELSIF NEW.opportunity_id IS NOT NULL THEN
    SELECT workspace_id INTO NEW.workspace_id FROM opportunities WHERE id = NEW.opportunity_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER propagate_workspace_meeting_notes_trigger BEFORE INSERT ON meeting_notes FOR EACH ROW EXECUTE FUNCTION propagate_workspace_meeting_notes();
CREATE TRIGGER set_updated_at_meeting_notes BEFORE UPDATE ON meeting_notes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 5.7 Table tasks (APRÈS meeting_notes)

```sql
-- 021_tasks.sql (APRÈS meeting_notes car FK meeting_note_id)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'follow_up' CHECK (task_type IN ('follow_up', 'call', 'email', 'meeting', 'document', 'review', 'other')),
  
  -- Entité polymorphique
  entity_type TEXT,
  entity_id UUID,
  
  -- FK optionnelles (intégrité)
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  meeting_note_id UUID REFERENCES meeting_notes(id) ON DELETE CASCADE,
  
  due_date DATE,
  due_time TIME,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'snoozed')),
  completed_at TIMESTAMPTZ,
  snoozed_until DATE,
  assigned_to UUID REFERENCES auth.users(id),
  ai_generated BOOLEAN DEFAULT false,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  ai_suggested_action TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_date, status);

-- Trigger validation COMPLET
CREATE OR REPLACE FUNCTION validate_task()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_fk_count INTEGER := 0;
  v_valid_entity_types TEXT[] := ARRAY['lead', 'opportunity', 'project', 'meeting_note'];
BEGIN
  -- Compter FK non-null
  IF NEW.lead_id IS NOT NULL THEN v_fk_count := v_fk_count + 1; END IF;
  IF NEW.opportunity_id IS NOT NULL THEN v_fk_count := v_fk_count + 1; END IF;
  IF NEW.project_id IS NOT NULL THEN v_fk_count := v_fk_count + 1; END IF;
  IF NEW.meeting_note_id IS NOT NULL THEN v_fk_count := v_fk_count + 1; END IF;
  
  -- RÈGLE 1: Maximum 1 FK (toujours)
  IF v_fk_count > 1 THEN
    RAISE EXCEPTION 'task: une seule FK peut être définie (trouvé: %)', v_fk_count;
  END IF;
  
  -- RÈGLE 2: Si entity_type défini, valider whitelist
  IF NEW.entity_type IS NOT NULL THEN
    IF NOT (NEW.entity_type = ANY(v_valid_entity_types)) THEN
      RAISE EXCEPTION 'task: entity_type invalide: % (autorisés: %)', NEW.entity_type, v_valid_entity_types;
    END IF;
    
    IF v_fk_count = 0 THEN
      RAISE EXCEPTION 'task: si entity_type défini, une FK doit être définie';
    END IF;
    
    -- Cohérence entity_type ↔ FK (CORRIGÉ: meeting_note pas meeting)
    IF NEW.entity_type = 'lead' AND NEW.lead_id IS NULL THEN
      RAISE EXCEPTION 'task: lead_id requis pour entity_type=lead';
    END IF;
    IF NEW.entity_type = 'opportunity' AND NEW.opportunity_id IS NULL THEN
      RAISE EXCEPTION 'task: opportunity_id requis pour entity_type=opportunity';
    END IF;
    IF NEW.entity_type = 'project' AND NEW.project_id IS NULL THEN
      RAISE EXCEPTION 'task: project_id requis pour entity_type=project';
    END IF;
    IF NEW.entity_type = 'meeting_note' AND NEW.meeting_note_id IS NULL THEN
      RAISE EXCEPTION 'task: meeting_note_id requis pour entity_type=meeting_note';
    END IF;
    
    -- Cohérence entity_id = FK
    IF NEW.entity_type = 'lead' AND NEW.entity_id != NEW.lead_id THEN
      RAISE EXCEPTION 'task: entity_id doit correspondre à lead_id';
    END IF;
    IF NEW.entity_type = 'opportunity' AND NEW.entity_id != NEW.opportunity_id THEN
      RAISE EXCEPTION 'task: entity_id doit correspondre à opportunity_id';
    END IF;
    IF NEW.entity_type = 'project' AND NEW.entity_id != NEW.project_id THEN
      RAISE EXCEPTION 'task: entity_id doit correspondre à project_id';
    END IF;
    IF NEW.entity_type = 'meeting_note' AND NEW.entity_id != NEW.meeting_note_id THEN
      RAISE EXCEPTION 'task: entity_id doit correspondre à meeting_note_id';
    END IF;
  END IF;
  
  -- Propagation workspace
  IF NEW.project_id IS NOT NULL THEN
    SELECT workspace_id INTO NEW.workspace_id FROM projects WHERE id = NEW.project_id;
  ELSIF NEW.opportunity_id IS NOT NULL THEN
    SELECT workspace_id INTO NEW.workspace_id FROM opportunities WHERE id = NEW.opportunity_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_task_trigger BEFORE INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION validate_task();
CREATE TRIGGER set_updated_at_tasks BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 5.8 Autres tables métier

```sql
-- 022_specifications.sql
CREATE TABLE specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'draft',
  content JSONB DEFAULT '{}'::jsonb,
  ai_generated BOOLEAN DEFAULT false,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_specifications_project ON specifications(project_id);

CREATE TRIGGER set_updated_at_specifications BEFORE UPDATE ON specifications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER validate_specification_transition BEFORE UPDATE ON specifications FOR EACH ROW EXECUTE FUNCTION validate_status_transition();

-- 023_project_contacts.sql
CREATE TABLE project_contacts (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'stakeholder' CHECK (role IN ('stakeholder', 'decision_maker', 'technical', 'sponsor')),
  PRIMARY KEY (project_id, lead_id)
);

-- 024_project_documents.sql
CREATE TABLE project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'xlsx', 'pptx', 'email', 'transcript', 'image', 'other')),
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  source_type TEXT NOT NULL DEFAULT 'upload' CHECK (source_type IN ('upload', 'email', 'transcript', 'generated', 'import')),
  source_ref UUID,
  version TEXT DEFAULT '1.0',
  supersedes_document_id UUID REFERENCES project_documents(id),
  content_text TEXT,
  ai_summary TEXT,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  embedding_ref TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_project_documents_workspace ON project_documents(workspace_id);
CREATE INDEX idx_project_documents_project ON project_documents(project_id);

CREATE OR REPLACE FUNCTION propagate_workspace_project_doc()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT workspace_id INTO NEW.workspace_id FROM projects WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER propagate_workspace_project_doc_trigger BEFORE INSERT ON project_documents FOR EACH ROW EXECUTE FUNCTION propagate_workspace_project_doc();

-- 025_generated_documents.sql
-- NOTE: status ici est indépendant de la table statuses (workflow spécifique documents)
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  document_type TEXT NOT NULL CHECK (document_type IN ('quote', 'proposal', 'spec', 'report', 'email', 'contract')),
  title TEXT NOT NULL,
  project_id UUID REFERENCES projects(id),
  opportunity_id UUID REFERENCES opportunities(id),
  specification_id UUID REFERENCES specifications(id),
  content_json JSONB NOT NULL,
  version TEXT DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'final', 'sent', 'cancelled')),
  supersedes_document_id UUID REFERENCES generated_documents(id),
  output_format TEXT,
  output_storage_path TEXT,
  ai_generated BOOLEAN DEFAULT true,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_generated_documents_workspace ON generated_documents(workspace_id);

CREATE OR REPLACE FUNCTION propagate_workspace_generated_doc()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT workspace_id INTO NEW.workspace_id FROM projects WHERE id = NEW.project_id;
  ELSIF NEW.opportunity_id IS NOT NULL THEN
    SELECT workspace_id INTO NEW.workspace_id FROM opportunities WHERE id = NEW.opportunity_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER propagate_workspace_generated_doc_trigger BEFORE INSERT ON generated_documents FOR EACH ROW EXECUTE FUNCTION propagate_workspace_generated_doc();
CREATE TRIGGER set_updated_at_generated_documents BEFORE UPDATE ON generated_documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 5.9 Table activity_log (CORRIGÉ: entity_type standardisé + policy durcie)

```sql
-- 026_activity_log.sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  
  -- FK optionnelles
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  meeting_note_id UUID REFERENCES meeting_notes(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  generated_document_id UUID REFERENCES generated_documents(id) ON DELETE CASCADE,
  
  activity_type TEXT NOT NULL CHECK (activity_type IN ('note', 'email', 'call', 'meeting', 'status_change', 'ai_action', 'document', 'task', 'comment')),
  title TEXT,
  content TEXT,
  visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'team', 'partner', 'client')),
  related_entity_type TEXT,
  related_entity_id UUID,
  is_ai_generated BOOLEAN DEFAULT false,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_log_workspace ON activity_log(workspace_id, created_at DESC);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- Trigger validation COMPLET (CORRIGÉ: meeting_note pas meeting)
CREATE OR REPLACE FUNCTION validate_activity_log()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_fk_count INTEGER := 0;
  v_valid_entity_types TEXT[] := ARRAY['lead', 'opportunity', 'project', 'meeting_note', 'task', 'generated_document'];
BEGIN
  -- Valider entity_type whitelist
  IF NOT (NEW.entity_type = ANY(v_valid_entity_types)) THEN
    RAISE EXCEPTION 'activity_log: entity_type invalide: % (autorisés: %)', NEW.entity_type, v_valid_entity_types;
  END IF;
  
  -- Compter FK
  IF NEW.lead_id IS NOT NULL THEN v_fk_count := v_fk_count + 1; END IF;
  IF NEW.opportunity_id IS NOT NULL THEN v_fk_count := v_fk_count + 1; END IF;
  IF NEW.project_id IS NOT NULL THEN v_fk_count := v_fk_count + 1; END IF;
  IF NEW.meeting_note_id IS NOT NULL THEN v_fk_count := v_fk_count + 1; END IF;
  IF NEW.task_id IS NOT NULL THEN v_fk_count := v_fk_count + 1; END IF;
  IF NEW.generated_document_id IS NOT NULL THEN v_fk_count := v_fk_count + 1; END IF;
  
  IF v_fk_count != 1 THEN
    RAISE EXCEPTION 'activity_log: exactement 1 FK doit être définie (trouvé: %)', v_fk_count;
  END IF;
  
  -- Cohérence entity_type ↔ FK (CORRIGÉ: meeting_note)
  IF NEW.entity_type = 'lead' AND NEW.lead_id IS NULL THEN
    RAISE EXCEPTION 'activity_log: lead_id requis pour entity_type=lead';
  END IF;
  IF NEW.entity_type = 'opportunity' AND NEW.opportunity_id IS NULL THEN
    RAISE EXCEPTION 'activity_log: opportunity_id requis pour entity_type=opportunity';
  END IF;
  IF NEW.entity_type = 'project' AND NEW.project_id IS NULL THEN
    RAISE EXCEPTION 'activity_log: project_id requis pour entity_type=project';
  END IF;
  IF NEW.entity_type = 'meeting_note' AND NEW.meeting_note_id IS NULL THEN
    RAISE EXCEPTION 'activity_log: meeting_note_id requis pour entity_type=meeting_note';
  END IF;
  IF NEW.entity_type = 'task' AND NEW.task_id IS NULL THEN
    RAISE EXCEPTION 'activity_log: task_id requis pour entity_type=task';
  END IF;
  IF NEW.entity_type = 'generated_document' AND NEW.generated_document_id IS NULL THEN
    RAISE EXCEPTION 'activity_log: generated_document_id requis pour entity_type=generated_document';
  END IF;
  
  -- Cohérence entity_id = FK
  IF NEW.entity_type = 'lead' AND NEW.entity_id != NEW.lead_id THEN
    RAISE EXCEPTION 'activity_log: entity_id doit correspondre à lead_id';
  END IF;
  IF NEW.entity_type = 'opportunity' AND NEW.entity_id != NEW.opportunity_id THEN
    RAISE EXCEPTION 'activity_log: entity_id doit correspondre à opportunity_id';
  END IF;
  IF NEW.entity_type = 'project' AND NEW.entity_id != NEW.project_id THEN
    RAISE EXCEPTION 'activity_log: entity_id doit correspondre à project_id';
  END IF;
  IF NEW.entity_type = 'meeting_note' AND NEW.entity_id != NEW.meeting_note_id THEN
    RAISE EXCEPTION 'activity_log: entity_id doit correspondre à meeting_note_id';
  END IF;
  IF NEW.entity_type = 'task' AND NEW.entity_id != NEW.task_id THEN
    RAISE EXCEPTION 'activity_log: entity_id doit correspondre à task_id';
  END IF;
  IF NEW.entity_type = 'generated_document' AND NEW.entity_id != NEW.generated_document_id THEN
    RAISE EXCEPTION 'activity_log: entity_id doit correspondre à generated_document_id';
  END IF;
  
  -- Propagation workspace
  IF NEW.project_id IS NOT NULL THEN
    SELECT workspace_id INTO NEW.workspace_id FROM projects WHERE id = NEW.project_id;
  ELSIF NEW.opportunity_id IS NOT NULL THEN
    SELECT workspace_id INTO NEW.workspace_id FROM opportunities WHERE id = NEW.opportunity_id;
  ELSIF NEW.task_id IS NOT NULL THEN
    SELECT workspace_id INTO NEW.workspace_id FROM tasks WHERE id = NEW.task_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_activity_log_trigger BEFORE INSERT OR UPDATE ON activity_log FOR EACH ROW EXECUTE FUNCTION validate_activity_log();
```

### 5.10 Table cockpit_reports (APPEND-ONLY)

```sql
-- 027_cockpit_reports.sql
-- NOTE: Table APPEND-ONLY (pas d'UPDATE, uniquement INSERT/SELECT/DELETE)
CREATE TABLE cockpit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly', 'quarterly', 'pipeline', 'forecast', 'activity')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL,
  ai_insights TEXT,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
  -- PAS de updated_at car append-only
);

CREATE INDEX idx_cockpit_reports_workspace ON cockpit_reports(workspace_id);
CREATE INDEX idx_cockpit_reports_period ON cockpit_reports(period_start, period_end);
```

### 5.11 Index FK pour performance

```sql
-- 031_indexes_fk.sql
-- Index sur FK pour performance (dashboard, timeline, jointures)
CREATE INDEX idx_tasks_lead ON tasks(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_tasks_opportunity ON tasks(opportunity_id) WHERE opportunity_id IS NOT NULL;
CREATE INDEX idx_tasks_project ON tasks(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_tasks_meeting_note ON tasks(meeting_note_id) WHERE meeting_note_id IS NOT NULL;

CREATE INDEX idx_activity_log_lead ON activity_log(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_activity_log_opportunity ON activity_log(opportunity_id) WHERE opportunity_id IS NOT NULL;
CREATE INDEX idx_activity_log_project ON activity_log(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_activity_log_meeting_note ON activity_log(meeting_note_id) WHERE meeting_note_id IS NOT NULL;
CREATE INDEX idx_activity_log_task ON activity_log(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_activity_log_generated_doc ON activity_log(generated_document_id) WHERE generated_document_id IS NOT NULL;
```

---

## 6. STORAGE

```sql
-- 032_storage_bucket.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('cockpit-documents', 'cockpit-documents', false)
ON CONFLICT (id) DO NOTHING;

-- NOTE: RLS activée par défaut sur storage.objects dans Supabase

CREATE POLICY "cockpit_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'cockpit-documents' AND
    (has_role(auth.uid(), 'cockpit_user') OR has_role(auth.uid(), 'cockpit_admin'))
  );

CREATE POLICY "cockpit_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'cockpit-documents' AND
    (has_role(auth.uid(), 'cockpit_user') OR has_role(auth.uid(), 'cockpit_admin'))
  );

CREATE POLICY "cockpit_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'cockpit-documents' AND
    has_role(auth.uid(), 'cockpit_admin')
  );
```

---

## 7. RLS POLICIES

### 7.1 Activer RLS

```sql
-- 033_rls_enable.sql
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_mfa_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
```

### 7.2 Policies détaillées

```sql
-- 034_rls_policies.sql

-- WORKSPACES
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT USING (
  has_role(auth.uid(), 'cockpit_admin')
  OR is_workspace_member(id, auth.uid())
  OR (type = 'internal' AND has_cockpit_access(auth.uid()))
);
CREATE POLICY "workspaces_insert" ON workspaces FOR INSERT WITH CHECK (has_cockpit_access(auth.uid()));
CREATE POLICY "workspaces_update" ON workspaces FOR UPDATE 
  USING (has_workspace_role(id, auth.uid(), 'owner') OR has_role(auth.uid(), 'cockpit_admin'))
  WITH CHECK (has_workspace_role(id, auth.uid(), 'owner') OR has_role(auth.uid(), 'cockpit_admin'));
CREATE POLICY "workspaces_delete" ON workspaces FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'));

-- WORKSPACE_MEMBERS
CREATE POLICY "workspace_members_select" ON workspace_members FOR SELECT USING (
  has_role(auth.uid(), 'cockpit_admin') OR is_workspace_member(workspace_id, auth.uid())
);
CREATE POLICY "workspace_members_insert" ON workspace_members FOR INSERT 
  WITH CHECK (has_workspace_role(workspace_id, auth.uid(), 'owner') OR has_role(auth.uid(), 'cockpit_admin'));
CREATE POLICY "workspace_members_update" ON workspace_members FOR UPDATE 
  USING (has_workspace_role(workspace_id, auth.uid(), 'owner') OR has_role(auth.uid(), 'cockpit_admin'))
  WITH CHECK (has_workspace_role(workspace_id, auth.uid(), 'owner') OR has_role(auth.uid(), 'cockpit_admin'));
CREATE POLICY "workspace_members_delete" ON workspace_members FOR DELETE 
  USING (has_workspace_role(workspace_id, auth.uid(), 'owner') OR has_role(auth.uid(), 'cockpit_admin'));

-- OPPORTUNITIES
CREATE POLICY "opportunities_select" ON opportunities FOR SELECT USING (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "opportunities_insert" ON opportunities FOR INSERT WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "opportunities_update" ON opportunities FOR UPDATE 
  USING (can_access_entity_workspace(workspace_id, auth.uid()))
  WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "opportunities_delete" ON opportunities FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'));

-- PROJECTS
CREATE POLICY "projects_select" ON projects FOR SELECT USING (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "projects_update" ON projects FOR UPDATE 
  USING (can_access_entity_workspace(workspace_id, auth.uid()))
  WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'));

-- PROJECT_CONTACTS
CREATE POLICY "project_contacts_select" ON project_contacts FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_contacts.project_id AND can_access_entity_workspace(p.workspace_id, auth.uid()))
);
CREATE POLICY "project_contacts_insert" ON project_contacts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_contacts.project_id AND can_access_entity_workspace(p.workspace_id, auth.uid()))
);
CREATE POLICY "project_contacts_update" ON project_contacts FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_contacts.project_id AND can_access_entity_workspace(p.workspace_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_contacts.project_id AND can_access_entity_workspace(p.workspace_id, auth.uid())));
CREATE POLICY "project_contacts_delete" ON project_contacts FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'));

-- MEETING_NOTES
CREATE POLICY "meeting_notes_select" ON meeting_notes FOR SELECT USING (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "meeting_notes_insert" ON meeting_notes FOR INSERT WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "meeting_notes_update" ON meeting_notes FOR UPDATE 
  USING (can_access_entity_workspace(workspace_id, auth.uid()))
  WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "meeting_notes_delete" ON meeting_notes FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'));

-- SPECIFICATIONS
CREATE POLICY "specifications_select" ON specifications FOR SELECT USING (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "specifications_insert" ON specifications FOR INSERT WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "specifications_update" ON specifications FOR UPDATE 
  USING (can_access_entity_workspace(workspace_id, auth.uid()))
  WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "specifications_delete" ON specifications FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'));

-- PROJECT_DOCUMENTS (à créer)
-- GENERATED_DOCUMENTS (à créer)

-- TASKS
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "tasks_update" ON tasks FOR UPDATE 
  USING (can_access_entity_workspace(workspace_id, auth.uid()))
  WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'));

-- ACTIVITY_LOG (INSERT durcie)
CREATE POLICY "activity_log_select" ON activity_log FOR SELECT USING (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "activity_log_insert" ON activity_log FOR INSERT WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));
-- Pas d'UPDATE sur activity_log (append-only)
CREATE POLICY "activity_log_delete" ON activity_log FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'));

-- COCKPIT_REPORTS (append-only)
CREATE POLICY "cockpit_reports_select" ON cockpit_reports FOR SELECT USING (can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "cockpit_reports_insert" ON cockpit_reports FOR INSERT WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));
-- Pas d'UPDATE (append-only)
CREATE POLICY "cockpit_reports_delete" ON cockpit_reports FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'));

-- STATUSES (lecture pour tous cockpit, admin seul modifie)
CREATE POLICY "statuses_select" ON statuses FOR SELECT USING (true);
CREATE POLICY "statuses_admin" ON statuses FOR ALL USING (has_role(auth.uid(), 'cockpit_admin'));

-- COCKPIT_AUTH_SESSIONS (propre session uniquement)
CREATE POLICY "cockpit_auth_own_session" ON cockpit_auth_sessions FOR ALL USING (auth.uid() = user_id);

-- COCKPIT_MFA_ATTEMPTS (propre tentatives uniquement)
CREATE POLICY "cockpit_mfa_own_attempts" ON cockpit_mfa_attempts FOR ALL USING (auth.uid() = user_id);

-- COCKPIT_SETTINGS (propres settings uniquement)
CREATE POLICY "cockpit_settings_own" ON cockpit_settings FOR ALL USING (auth.uid() = user_id);

-- AI_PROMPTS (lecture cockpit, écriture admin)
CREATE POLICY "ai_prompts_select" ON ai_prompts FOR SELECT USING (has_cockpit_access(auth.uid()));
CREATE POLICY "ai_prompts_admin" ON ai_prompts FOR ALL USING (has_role(auth.uid(), 'cockpit_admin'));

-- AI_USAGE_LOG (lecture propre, insert via service_role)
CREATE POLICY "ai_usage_log_own" ON ai_usage_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_usage_log_admin" ON ai_usage_log FOR SELECT USING (has_role(auth.uid(), 'cockpit_admin'));
-- INSERT via Edge Functions avec service_role uniquement
```

---

## 8. LIENS ADMIN ↔ COCKPIT

### 8.1 Pattern de synchronisation

| Source Admin | → | Cible Cockpit | Trigger |
|--------------|---|---------------|---------|
| `contacts` | → | `leads` | `sync_contact_to_lead()` |
| `newsletter_subscribers` | → | `leads` | `sync_newsletter_to_lead()` |
| `form_responses` | → | `leads` | `sync_form_response_to_lead()` |
| `atelier_inscriptions` | → | `leads` | `sync_atelier_to_lead()` |
| `leads` (new) | → | `opportunities` (stage=lead) | `sync_lead_to_pipeline()` |
| `opportunities` (won) | → | `projects` (auto-create) | `sync_won_to_project()` |
| `bookings` | → | `meeting_notes` (pré-rempli) | Via UI uniquement |

### 8.2 Triggers existants (déjà implémentés)

```sql
-- sync_lead_to_pipeline (déjà en place)
CREATE OR REPLACE FUNCTION sync_lead_to_pipeline()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO opportunities (lead_id, title, stage, source, description, workspace_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.company, NEW.name),
    'lead',
    NEW.source,
    'Lead: ' || NEW.name || COALESCE(' - ' || NEW.company, '') || COALESCE(E'\nSource: ' || NEW.source_context, ''),
    '00000000-0000-0000-0000-000000000001'::uuid
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_lead_to_pipeline_trigger
  AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION sync_lead_to_pipeline();
```

### 8.3 Trigger à implémenter : Opportunity won → Project

```sql
-- sync_won_to_project (à implémenter)
CREATE OR REPLACE FUNCTION sync_won_to_project()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.stage = 'won' AND (OLD.stage IS NULL OR OLD.stage != 'won') THEN
    INSERT INTO projects (
      opportunity_id,
      name,
      description,
      status,
      workspace_id,
      budget_amount
    ) VALUES (
      NEW.id,
      NEW.title,
      NEW.description,
      'scoping',
      NEW.workspace_id,
      NEW.value_amount
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_won_to_project_trigger
  AFTER UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION sync_won_to_project();
```

---

## 9. SUIVI D'IMPLÉMENTATION

> **Dernière mise à jour :** 21 décembre 2025

### 9.1 Tables — État d'implémentation

| Table | Statut | Notes |
|-------|--------|-------|
| `workspaces` | ✅ Créée | Workspace par défaut `00000000-0000-0000-0000-000000000001` |
| `workspace_members` | ✅ Créée | Trigger auto-owner actif |
| `cockpit_auth_sessions` | ✅ Créée | Step-up MFA fonctionnel |
| `cockpit_mfa_attempts` | ✅ Créée | Rate limit 3 tentatives / 5 min |
| `statuses` | ✅ Créée | 21 statuts (lead, opportunity, project, specification) |
| `leads` (extensions) | ✅ Extensions OK | `qualification_status`, `lead_score`, `ai_metadata` |
| `opportunities` | ✅ Créée | Lié à leads + workspace |
| `projects` | ✅ Créée | Lié à opportunities + workspace |
| `meeting_notes` | ✅ Créée | Lié à bookings + workspace |
| `tasks` | ✅ Créée | Polymorphe (lead/opp/project/meeting_note) |
| `specifications` | ✅ Créée | Lié à projects |
| `activity_log` | ✅ Créée | Append-only, polymorphe |
| `project_contacts` | ✅ Créée | Liaison projects ↔ leads |
| `project_documents` | ❌ À créer | Storage documents projet |
| `generated_documents` | ❌ À créer | Devis/CDC générés IA |
| `cockpit_settings` | ❌ À créer | Préférences utilisateur + IA |
| `ai_prompts` | ❌ À créer | Templates prompts IA |
| `ai_usage_log` | ❌ À créer | Tracking tokens IA |
| `cockpit_reports` | ❌ À créer | Rapports périodiques |

### 9.2 Fonctions SQL — État d'implémentation

| Fonction | Statut | Usage |
|----------|--------|-------|
| `has_cockpit_access()` | ✅ Active | Vérification rôle cockpit |
| `is_workspace_member()` | ✅ Active | Membership workspace |
| `has_workspace_role()` | ✅ Active | Niveau rôle (owner/editor/viewer) |
| `can_access_workspace()` | ✅ Active | Accès workspace complet |
| `can_access_entity_workspace()` | ✅ Active | Accès entités métier |
| `check_cockpit_mfa_rate_limit()` | ✅ Active | Rate limit MFA |
| `cleanup_expired_cockpit_data()` | ✅ Active | Nettoyage sessions expirées |
| `set_updated_at()` | ✅ Active | Trigger updated_at |
| `auto_insert_workspace_owner()` | ✅ Active | Auto-ajout owner sur workspace |
| `sync_form_response_to_lead()` | ✅ Active | Formulaires → Leads |
| `sync_lead_to_pipeline()` | ✅ Active | Leads → Opportunities |
| `sync_won_to_project()` | ✅ Active | Opportunities won → Projects |
| `validate_status_transition()` | ❌ À créer | Validation transitions statuts |
| `validate_task()` | ❌ À créer | Validation cohérence FK tasks |
| `validate_activity_log()` | ❌ À créer | Validation cohérence FK activity |

### 9.3 Triggers SQL — État d'implémentation

| Trigger | Table | Statut |
|---------|-------|--------|
| `trigger_sync_form_response_to_lead` | `form_responses` | ✅ Actif |
| `trigger_sync_lead_to_pipeline` | `leads` | ✅ Actif |
| `auto_insert_workspace_owner_trigger` | `workspaces` | ✅ Actif |
| `trigger_sync_won_to_project` | `opportunities` | ✅ Actif |
| `validate_task_trigger` | `tasks` | ❌ À créer |
| `validate_activity_log_trigger` | `activity_log` | ❌ À créer |
| `set_updated_at_*` | Multiples | ⚠️ Partiel |

---

## 10. FLUX DE DONNÉES ADMIN ↔ COCKPIT

### 10.1 Diagramme des flux entrants

```
┌─────────────────────────────────────────────────────────────────────┐
│                          MODULE ADMIN                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐    │
│  │   contacts   │   │ form_responses│   │ atelier_inscriptions │    │
│  └──────┬───────┘   └──────┬───────┘   └──────────┬───────────┘    │
│         │                   │                       │                │
│         │ sync_contact      │ sync_form_response    │ sync_atelier   │
│         │ _to_lead()        │ _to_lead() ✅         │ _to_lead()     │
│         │                   │                       │                │
│         ▼                   ▼                       ▼                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                        leads                                  │   │
│  │  (qualification_status, lead_score, ai_metadata)             │   │
│  └──────────────────────────────┬───────────────────────────────┘   │
│                                  │                                   │
│                                  │ sync_lead_to_pipeline() ✅        │
│                                  ▼                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     opportunities                             │   │
│  │  (stage: lead → qualified → proposal → negotiation → won/lost)│   │
│  └──────────────────────────────┬───────────────────────────────┘   │
│                                  │                                   │
│                                  │ sync_won_to_project() ✅         │
│                                  ▼                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                       projects                                │   │
│  │  (status: scoping → design → development → testing → ...)    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         MODULE COCKPIT                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐    │
│  │    tasks     │←──│meeting_notes │←──│      bookings        │    │
│  │  (polymorphe)│   │(pré-rempli)  │   │  (sync calendar)     │    │
│  └──────────────┘   └──────────────┘   └──────────────────────┘    │
│         │                   │                                       │
│         ▼                   ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     activity_log                              │   │
│  │  (timeline unifiée, append-only)                             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 Sources de données par entité

| Entité Cockpit | Sources Admin | Trigger/Méthode |
|----------------|---------------|-----------------|
| `leads` | `contacts`, `form_responses`, `newsletter_subscribers`, `atelier_inscriptions` | Triggers SQL |
| `opportunities` | `leads` (auto-création) | `sync_lead_to_pipeline()` |
| `projects` | `opportunities` (stage=won) | `sync_won_to_project()` ❌ |
| `meeting_notes` | `bookings` (pré-remplissage) | UI uniquement |
| `tasks` | Création manuelle ou IA | - |
| `activity_log` | Toutes entités | Auto-logging |

### 10.3 Règles de propagation workspace

```sql
-- Règle 1: Les entités héritent du workspace de leur parent
opportunities.workspace_id ← leads.workspace_id (via trigger)
projects.workspace_id     ← opportunities.workspace_id (via trigger)
meeting_notes.workspace_id ← projects.workspace_id OR opportunities.workspace_id
tasks.workspace_id        ← parent entity workspace (via trigger)
activity_log.workspace_id ← entity workspace (via trigger)

-- Règle 2: Défaut = workspace interne
DEFAULT '00000000-0000-0000-0000-000000000001'
```

---

## 11. PAGES UI COCKPIT

| Route | Composant | Tables sources | État |
|-------|-----------|----------------|------|
| `/cockpit` | `CockpitDashboard` | Agrégation toutes tables | ✅ Implémenté |
| `/cockpit/leads` | `CockpitLeads` | `leads` | ✅ Implémenté |
| `/cockpit/pipeline` | `CockpitPipeline` | `opportunities` + `leads` | ✅ Implémenté |
| `/cockpit/agenda` | `CockpitAgenda` | `bookings` + `meeting_notes` | ✅ Implémenté |
| `/cockpit/projects` | `CockpitProjects` | `projects` + `specifications` | 🔶 À enrichir |
| `/cockpit/specs` | `CockpitSpecifications` | `specifications` | 🔶 À enrichir |
| `/cockpit/analytics` | `CockpitAnalytics` | `cockpit_reports` + agrégations | 🔶 À enrichir |

---

## 12. COMPOSANTS PARTAGÉS

| Composant | Utilisé par | Description |
|-----------|-------------|-------------|
| `LeadDetailSheet` | Leads, Pipeline | Fiche lead éditable |
| `MeetingNoteSheet` | Agenda, Pipeline | CR pré-rempli depuis booking |
| `CreateLeadDialog` | Dashboard, Leads | Création rapide lead |
| `CreateOpportunityDialog` | Pipeline | Création opportunité |
| `CreateProjectDialog` | Projects, Pipeline (won) | Création projet |
| `CreateTaskDialog` | Tous | Création tâche liée |

---

## 13. HOOKS COCKPIT

| Hook | Tables | Fonctionnalités |
|------|--------|-----------------|
| `useCockpitAuth` | `cockpit_auth_sessions`, `cockpit_mfa_attempts` | Step-up MFA, rate limit |
| `useCockpitLeads` | `leads` | CRUD + qualification + scoring |
| `useCockpitOpportunities` | `opportunities` | CRUD + pipeline stages |
| `useCockpitProjects` | `projects` | CRUD + health status |
| `useCockpitTasks` | `tasks` | CRUD + filtres entité |
| `useCockpitMeetingNotes` | `meeting_notes` | CRUD + lien booking |
| `useCockpitActivityLog` | `activity_log` | Timeline + logging |
| `useCockpitBookings` | `bookings` (shared) | Lecture RDV |
| `useCockpitSpecifications` | `specifications` | CRUD + versions |

---

## 14. PROCHAINES ÉTAPES

### Phase 1 (Actuelle) ✅
- [x] Structure de base (pages, navigation)
- [x] Leads + Pipeline fonctionnels
- [x] Agenda avec création CR
- [x] Dashboard enrichi avec KPIs
- [x] Activity log affiché
- [x] Triggers sync_form_response_to_lead + sync_lead_to_pipeline
- [x] Trigger sync_won_to_project (Opportunity won → Project auto)

### Phase 2 (En cours)
- [x] Trigger `sync_won_to_project` — Création projet automatique ✅
- [ ] Triggers de validation (`validate_task`, `validate_activity_log`)
- [ ] Triggers `set_updated_at_*` sur toutes les tables
- [ ] Page Projects enrichie avec timeline
- [ ] Page Specifications fonctionnelle
- [ ] Dialogs création (Lead, Opportunity, Project, Task) ✅ Partiellement

### Phase 3 (Future)
- [ ] Tables IA : `cockpit_settings`, `ai_prompts`, `ai_usage_log`
- [ ] Tables documents : `project_documents`, `generated_documents`
- [ ] IA N0 : Scoring leads automatique
- [ ] IA N1 : Génération CDC draft
- [ ] Analytics avancés + rapports périodiques
- [ ] Storage bucket `cockpit-documents`

---

## 15. CONVENTIONS DE DÉVELOPPEMENT

### 15.1 Référence obligatoire

> **Ce document est la source de vérité.** Toute modification du module Cockpit doit :
> 1. Consulter ce CDC avant implémentation
> 2. Respecter les patterns définis (hooks shared → cockpit)
> 3. Mettre à jour la section 9 (Suivi d'implémentation) après changement

### 15.2 Fichiers de référence associés

| Document | Usage |
|----------|-------|
| `docs/CDC_COCKPIT_COMMERCIAL.md` | Spécifications techniques (CE DOCUMENT) |
| `docs/COCKPIT_DEV_CHARTER.md` | Règles de développement et patterns |
| `BrandBook_IArche_V1.md` | Charte graphique et design system |
| `docs/CHARTE_GRAPHIQUE_V4.md` | Tokens couleurs et typographie |

### 15.3 Commandes de vérification

```bash
# Vérifier les tables existantes
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

# Vérifier les triggers actifs
SELECT trigger_name, event_object_table FROM information_schema.triggers;

# Vérifier les statuts configurés
SELECT entity_type, code, label FROM statuses ORDER BY entity_type, display_order;
```
