# Cahier des Charges V3 — Cockpit Commercial IArche

**Document de spécification finale pour Lovable**

| | |
|---|---|
| **Projet** | Module Cockpit Commercial intégré au back-office existant |
| **Version** | 3.0 |
| **Date** | 21 décembre 2025 |
| **Contexte** | Extension du site IArche existant (portail, solutions, services, ressources) + Module Admin privé opérationnel |

---

## 0. CONTEXTE EXISTANT (à respecter)

### Ce qui existe déjà

- **Site public** : portail, solutions, services, ressources
- **Module Admin privé** : authentification + 2FA déjà en place, back-office complet (contenu, engagement, sécurité, logs)
- **Tables existantes** : `leads`, `bookings`, `booking_types`, `booking_availability`, `contacts`, `articles`, `admin_audit_logs`, etc.

### Contraintes strictes

- ✅ **Zéro duplication** entre Admin et Cockpit
- ✅ **Réutilisation** des tables existantes (`leads`, `bookings`, etc.)
- ✅ **Cohérence UI** avec la charte graphique IArche
- ✅ Le Cockpit n'est **PAS** un produit autonome — accessible uniquement depuis Admin

---

## 1. SYNTHÈSE EXÉCUTIVE

### Objectif

Créer un **Cockpit Commercial** accessible uniquement depuis l'Admin via un bouton dédié, avec **step-up MFA** (re-vérification TOTP à l'entrée), pour piloter :

- Pipeline commercial / opportunités
- Qualification leads avec scoring IA
- Agenda & comptes-rendus assistés IA
- Projets IA + base documentaire projet (RAG)
- CDC + devis "brochure quality"
- Analytics & rapports automatisés

### Différenciation clé

L'IA du Cockpit est **actrice + assistante + conseillère** : elle produit, propose, synthétise et structure, avec exécution contrôlée selon **3 niveaux d'autonomie**.

---

## 2. SÉCURITÉ — STEP-UP MFA

### 2.1 Exigence

L'utilisateur doit faire :
1. **2FA à la connexion Admin** (existant)
2. **Nouvelle saisie TOTP** pour basculer vers Cockpit (step-up), même si session active

### 2.2 Implémentation Step-up MFA

**Logique d'accès `/cockpit` :**

```
1. Vérifier rôle (cockpit_user / cockpit_admin)
2. Vérifier MFA activé sur le compte
3. Vérifier "preuve de step-up" récente (timestamp)
4. Si preuve absente/expirée → écran "Re-vérifier TOTP"
5. Si valide → accès Cockpit
```

**Table preuve step-up :**

```sql
CREATE TABLE cockpit_auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  last_cockpit_mfa_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  ip_hash TEXT, -- SHA256 de l'IP (optionnel, pour détection changement)
  ua_hash TEXT, -- SHA256 du User-Agent (optionnel)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_cockpit_auth_user ON cockpit_auth_sessions(user_id);

-- Trigger nettoyage sessions expirées (optionnel, via pg_cron)
CREATE OR REPLACE FUNCTION cleanup_expired_cockpit_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM cockpit_auth_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;
```

**Configuration TTL (paramétrable) :**

| Mode | Durée |
|------|-------|
| Sécurité forte | 15 minutes |
| Confort utilisateur | 24 heures |
| **Recommandation** | **4 heures par défaut** |

**Composant ProtectedCockpitRoute :**

```typescript
const canAccessCockpit = async (userId: string): Promise<{
  allowed: boolean;
  reason?: 'NO_ROLE' | 'MFA_NOT_ENABLED' | 'STEPUP_REQUIRED' | 'SESSION_EXPIRED';
}> => {
  // 1. Vérifier rôle
  const hasRole = await checkCockpitRole(userId);
  if (!hasRole) return { allowed: false, reason: 'NO_ROLE' };
  
  // 2. Vérifier MFA activé
  const mfaEnabled = await checkMfaEnabled(userId);
  if (!mfaEnabled) return { allowed: false, reason: 'MFA_NOT_ENABLED' };
  
  // 3. Vérifier preuve step-up
  const { data: session } = await supabase
    .from('cockpit_auth_sessions')
    .select('expires_at')
    .eq('user_id', userId)
    .single();
  
  if (!session) return { allowed: false, reason: 'STEPUP_REQUIRED' };
  if (new Date(session.expires_at) < new Date()) return { allowed: false, reason: 'SESSION_EXPIRED' };
  
  return { allowed: true };
};
```

> ⚠️ **Interdiction absolue** : accès direct au Cockpit par URL sans step-up validé.

### 2.3 Rôles Cockpit (migration séparée)

```sql
-- Migration 001_cockpit_roles.sql
-- Exécuter HORS transaction si enum en cours d'utilisation

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

---

## 3. IA — ACTRICE + ASSISTANTE + CONSEILLÈRE

### 3.1 Capacités IA

L'IA du Cockpit doit :

| Capacité | Description |
|----------|-------------|
| **Produire** | comptes-rendus, résumés, actions, next steps |
| **Proposer** | recommandations (relances, priorités, risques, opportunités) |
| **Générer** | drafts (emails, devis, CDC, propositions commerciales "brochure quality") |
| **Exploiter** | base documentaire projet (Word/PDF/transcriptions/emails) via RAG |
| **Fonctionner** | mode proactif (suggestions auto) + mode à la demande (commande) |

### 3.2 Gouvernance par niveaux d'autonomie (obligatoire)

| Niveau | Type | Actions | Validation |
|--------|------|---------|------------|
| **N0** | Auto informatif | Scoring, insights, rapports, alertes | Aucune |
| **N1** | Auto proactif brouillon | Création drafts (CDC/devis/emails/tâches) | Éditables, non exécutés |
| **N2** | Exécution contrôlée | Envoi email, changement stage, PDF final, actions irréversibles | **Validation humaine obligatoire** (ou règle auto-approval explicite) |

### 3.3 Métadonnées IA (obligatoire sur toute sortie)

```json
{
  "ai_metadata": {
    "source": "cockpit-generate-spec",
    "model": "claude-3-sonnet",
    "autonomy_level": "N1",
    "confidence": 0.87,
    "generated_at": "2025-12-21T10:30:00Z",
    "validated_by_human": false,
    "validated_at": null,
    "validation_required": true
  }
}
```

### 3.4 Edge Functions IA

```
supabase/functions/
├── cockpit-lead-scoring/         # N0 - Score lead (0-100) + justification
├── cockpit-meeting-summary/      # N1 - Résumé réunion + actions extraites
├── cockpit-generate-spec/        # N1 - Génération CDC depuis docs projet
├── cockpit-generate-quote/       # N1 - Génération devis "brochure quality"
├── cockpit-draft-email/          # N1 - Draft email de relance/proposition
├── cockpit-weekly-report/        # N0 - Rapport hebdomadaire automatique
├── cockpit-forecast/             # N0 - Prévisions CA pipeline
├── cockpit-activity-summary/     # N0 - Résumé activité par entité
├── cockpit-project-rag/          # N0/N1 - RAG sur docs projet
└── cockpit-send-email/           # N2 - Envoi email (validation requise)
```

---

## 4. MODÈLE DE DONNÉES

### 4.1 Table référentiel `statuses` (enrichie)

```sql
CREATE TABLE statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'lead', 'opportunity', 'project', 'specification'
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_terminal BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false, -- Statut par défaut à la création
  ui_variant TEXT DEFAULT 'default', -- 'default', 'info', 'warning', 'success', 'error'
  allowed_transitions JSONB DEFAULT '[]'::jsonb, -- ["qualified", "disqualified"]
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, code)
);

-- Données initiales
INSERT INTO statuses (entity_type, code, label, display_order, is_terminal, is_default, ui_variant, allowed_transitions) VALUES
  ('lead', 'new', 'Nouveau', 1, false, true, 'default', '["contacted"]'),
  ('lead', 'contacted', 'Contacté', 2, false, false, 'info', '["qualified", "disqualified"]'),
  ('lead', 'qualified', 'Qualifié', 3, false, false, 'success', '["disqualified"]'),
  ('lead', 'disqualified', 'Disqualifié', 4, true, false, 'error', '[]'),
  ('opportunity', 'lead', 'Lead', 1, false, true, 'default', '["qualified"]'),
  ('opportunity', 'qualified', 'Qualifié', 2, false, false, 'info', '["proposal", "lost"]'),
  ('opportunity', 'proposal', 'Proposition', 3, false, false, 'info', '["negotiation", "lost"]'),
  ('opportunity', 'negotiation', 'Négociation', 4, false, false, 'warning', '["won", "lost"]'),
  ('opportunity', 'won', 'Gagné', 5, true, false, 'success', '[]'),
  ('opportunity', 'lost', 'Perdu', 6, true, false, 'error', '[]'),
  ('project', 'scoping', 'Cadrage', 1, false, true, 'default', '["design", "cancelled"]'),
  ('project', 'design', 'Conception', 2, false, false, 'info', '["development", "cancelled"]'),
  ('project', 'development', 'Développement', 3, false, false, 'info', '["testing", "cancelled"]'),
  ('project', 'testing', 'Tests', 4, false, false, 'warning', '["deployment", "development"]'),
  ('project', 'deployment', 'Déploiement', 5, false, false, 'warning', '["maintenance", "completed"]'),
  ('project', 'maintenance', 'Suivi', 6, false, false, 'info', '["completed"]'),
  ('project', 'completed', 'Terminé', 7, true, false, 'success', '[]'),
  ('project', 'cancelled', 'Annulé', 8, true, false, 'error', '[]'),
  ('specification', 'draft', 'Brouillon', 1, false, true, 'default', '["review"]'),
  ('specification', 'review', 'En revue', 2, false, false, 'warning', '["approved", "draft"]'),
  ('specification', 'approved', 'Validé', 3, true, false, 'success', '[]');
```

### 4.2 Extensions table `leads`

```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualification_status TEXT DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}'::jsonb;

-- Trigger validation
CREATE OR REPLACE FUNCTION validate_lead_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM statuses WHERE entity_type = 'lead' AND code = NEW.qualification_status) THEN
    RAISE EXCEPTION 'qualification_status invalide: %', NEW.qualification_status;
  END IF;
  
  IF NEW.lead_score < 0 OR NEW.lead_score > 100 THEN
    RAISE EXCEPTION 'lead_score doit être entre 0 et 100: %', NEW.lead_score;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_lead_fields_trigger
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION validate_lead_fields();
```

### 4.3 Table `opportunities`

```sql
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  title TEXT NOT NULL,
  description TEXT,
  value_amount DECIMAL(12,2),
  probability INTEGER DEFAULT 50,
  stage TEXT DEFAULT 'lead',
  expected_close_date DATE,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  close_reason TEXT,
  ai_metadata JSONB DEFAULT '{}'::jsonb
);

-- Trigger validation + updated_at
CREATE OR REPLACE FUNCTION validate_opportunity_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.probability < 0 OR NEW.probability > 100 THEN
    RAISE EXCEPTION 'probability doit être entre 0 et 100: %', NEW.probability;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM statuses WHERE entity_type = 'opportunity' AND code = NEW.stage) THEN
    RAISE EXCEPTION 'stage invalide: %', NEW.stage;
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_opportunity_fields_trigger
  BEFORE INSERT OR UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION validate_opportunity_fields();

CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_lead ON opportunities(lead_id);
CREATE INDEX idx_opportunities_assigned ON opportunities(assigned_to);
```

### 4.4 Table `projects`

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'scoping',
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

-- Trigger validation + updated_at
CREATE OR REPLACE FUNCTION validate_project_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM statuses WHERE entity_type = 'project' AND code = NEW.status) THEN
    RAISE EXCEPTION 'status invalide: %', NEW.status;
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_project_fields_trigger
  BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION validate_project_fields();

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_opportunity ON projects(opportunity_id);
```

### 4.5 Table `project_contacts`

```sql
CREATE TABLE project_contacts (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'stakeholder',
  PRIMARY KEY (project_id, lead_id)
);

CREATE OR REPLACE FUNCTION validate_project_contact_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role NOT IN ('stakeholder', 'decision_maker', 'technical', 'sponsor') THEN
    RAISE EXCEPTION 'role invalide: %', NEW.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_project_contact_role_trigger
  BEFORE INSERT OR UPDATE ON project_contacts
  FOR EACH ROW EXECUTE FUNCTION validate_project_contact_role();
```

### 4.6 Table `meeting_notes`

```sql
CREATE TABLE meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id),
  project_id UUID REFERENCES projects(id),
  objectives TEXT,
  notes TEXT,
  ai_summary TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  next_steps TEXT,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meeting_notes_booking ON meeting_notes(booking_id);
CREATE INDEX idx_meeting_notes_opportunity ON meeting_notes(opportunity_id);
CREATE INDEX idx_meeting_notes_project ON meeting_notes(project_id);
```

### 4.7 Table `specifications`

```sql
CREATE TABLE specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'draft',
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
CREATE INDEX idx_specifications_status ON specifications(status);
```

### 4.8 Table `project_documents` (RAG-ready)

```sql
CREATE TABLE project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'xlsx', 'pptx', 'email', 'transcript', 'image', 'other'
  storage_path TEXT NOT NULL, -- Chemin dans bucket cockpit-documents
  file_size INTEGER,
  description TEXT,
  
  -- Champs IA / RAG
  content_text TEXT, -- Texte extrait du document
  ai_summary TEXT, -- Résumé IA du document
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  embedding_ref TEXT, -- Référence vers vecteur (si vectorisation)
  
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_project_documents_project ON project_documents(project_id);
CREATE INDEX idx_project_documents_type ON project_documents(file_type);

-- Trigger validation file_type
CREATE OR REPLACE FUNCTION validate_project_document_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.file_type NOT IN ('pdf', 'docx', 'xlsx', 'pptx', 'email', 'transcript', 'image', 'other') THEN
    RAISE EXCEPTION 'file_type invalide: %', NEW.file_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_project_document_type_trigger
  BEFORE INSERT OR UPDATE ON project_documents
  FOR EACH ROW EXECUTE FUNCTION validate_project_document_type();
```

**Important** : Ne pas exposer d'URL publique. Générer des URLs signées côté application :

```typescript
const getSignedUrl = async (storagePath: string) => {
  const { data } = await supabase.storage
    .from('cockpit-documents')
    .createSignedUrl(storagePath, 3600); // 1h
  return data?.signedUrl;
};
```

### 4.9 Table `activity_log` (enrichie)

```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'lead', 'opportunity', 'project', 'meeting', 'specification'
  entity_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'note', 'email', 'call', 'meeting', 'status_change', 'ai_action', 'document', 'task'
  
  -- Champs enrichis UI
  title TEXT, -- Titre court pour affichage timeline
  content TEXT, -- Contenu détaillé
  visibility TEXT DEFAULT 'internal', -- 'internal', 'team', 'client'
  
  -- Liaison optionnelle vers autre entité
  related_entity_type TEXT,
  related_entity_id UUID,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_type ON activity_log(activity_type);

-- Trigger validation activity_type
CREATE OR REPLACE FUNCTION validate_activity_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activity_type NOT IN ('note', 'email', 'call', 'meeting', 'status_change', 'ai_action', 'document', 'task', 'comment') THEN
    RAISE EXCEPTION 'activity_type invalide: %', NEW.activity_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_activity_type_trigger
  BEFORE INSERT OR UPDATE ON activity_log
  FOR EACH ROW EXECUTE FUNCTION validate_activity_type();
```

### 4.10 Table `cockpit_reports`

```sql
CREATE TABLE cockpit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL, -- 'weekly', 'monthly', 'pipeline', 'forecast'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL,
  ai_insights TEXT,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cockpit_reports_type ON cockpit_reports(report_type);
CREATE INDEX idx_cockpit_reports_period ON cockpit_reports(period_start, period_end);
```

### 4.11 Schéma relationnel complet

```
leads ─────────────────────┐
  │                        │
  ├──► opportunities ──────┼──► projects ──► specifications
  │         │              │       │
  │         │              │       ├──► project_contacts
  │         │              │       │
  │         │              │       └──► project_documents (RAG)
  │         │              │
  │         └──────────────┼──► meeting_notes
  │                        │
bookings ──────────────────┘

activity_log ◄───── (transversal, toutes entités)
statuses ◄───── (référentiel unifié)
cockpit_auth_sessions ◄───── (step-up MFA)
cockpit_reports ◄───── (rapports générés)
```

---

## 5. STORAGE

### 5.1 Bucket `cockpit-documents`

```sql
-- Créer via Supabase Dashboard ou API
INSERT INTO storage.buckets (id, name, public)
VALUES ('cockpit-documents', 'cockpit-documents', false);
```

### 5.2 Policies Storage (corrigées)

```sql
-- Upload : cockpit users
CREATE POLICY "cockpit_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'cockpit-documents' AND
    (has_role(auth.uid(), 'cockpit_user') OR has_role(auth.uid(), 'cockpit_admin'))
  );

-- Read : cockpit users
CREATE POLICY "cockpit_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'cockpit-documents' AND
    (has_role(auth.uid(), 'cockpit_user') OR has_role(auth.uid(), 'cockpit_admin'))
  );

-- Delete : cockpit admin only
CREATE POLICY "cockpit_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'cockpit-documents' AND
    has_role(auth.uid(), 'cockpit_admin')
  );

-- Update : cockpit admin only
CREATE POLICY "cockpit_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'cockpit-documents' AND
    has_role(auth.uid(), 'cockpit_admin')
  );
```

---

## 6. RLS (Row Level Security)

### 6.1 Activer RLS sur toutes les tables Cockpit

```sql
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_auth_sessions ENABLE ROW LEVEL SECURITY;
```

### 6.2 Policies complètes

```sql
-- Helper function (si pas déjà existante)
CREATE OR REPLACE FUNCTION has_cockpit_access(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_role(user_uuid, 'cockpit_user') OR has_role(user_uuid, 'cockpit_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- OPPORTUNITIES
CREATE POLICY "cockpit_opportunities_select" ON opportunities
  FOR SELECT USING (has_cockpit_access(auth.uid()));

CREATE POLICY "cockpit_opportunities_insert" ON opportunities
  FOR INSERT WITH CHECK (has_cockpit_access(auth.uid()));

CREATE POLICY "cockpit_opportunities_update" ON opportunities
  FOR UPDATE USING (has_cockpit_access(auth.uid()));

CREATE POLICY "cockpit_opportunities_delete" ON opportunities
  FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'));

-- PROJECTS (même pattern)
CREATE POLICY "cockpit_projects_select" ON projects
  FOR SELECT USING (has_cockpit_access(auth.uid()));

CREATE POLICY "cockpit_projects_insert" ON projects
  FOR INSERT WITH CHECK (has_cockpit_access(auth.uid()));

CREATE POLICY "cockpit_projects_update" ON projects
  FOR UPDATE USING (has_cockpit_access(auth.uid()));

CREATE POLICY "cockpit_projects_delete" ON projects
  FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'));

-- PROJECT_CONTACTS
CREATE POLICY "cockpit_project_contacts_all" ON project_contacts
  FOR ALL USING (has_cockpit_access(auth.uid()));

-- MEETING_NOTES
CREATE POLICY "cockpit_meeting_notes_all" ON meeting_notes
  FOR ALL USING (has_cockpit_access(auth.uid()));

-- SPECIFICATIONS
CREATE POLICY "cockpit_specifications_all" ON specifications
  FOR ALL USING (has_cockpit_access(auth.uid()));

-- PROJECT_DOCUMENTS
CREATE POLICY "cockpit_project_documents_all" ON project_documents
  FOR ALL USING (has_cockpit_access(auth.uid()));

-- ACTIVITY_LOG (insert = tous, select = cockpit, delete = admin)
CREATE POLICY "cockpit_activity_log_select" ON activity_log
  FOR SELECT USING (has_cockpit_access(auth.uid()));

CREATE POLICY "cockpit_activity_log_insert" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "cockpit_activity_log_delete" ON activity_log
  FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'));

-- COCKPIT_REPORTS
CREATE POLICY "cockpit_reports_all" ON cockpit_reports
  FOR ALL USING (has_cockpit_access(auth.uid()));

-- STATUSES (lecture seule pour tous, écriture admin)
CREATE POLICY "statuses_select" ON statuses
  FOR SELECT USING (true);

CREATE POLICY "statuses_admin" ON statuses
  FOR ALL USING (has_role(auth.uid(), 'cockpit_admin'));

-- COCKPIT_AUTH_SESSIONS (user propre session uniquement)
CREATE POLICY "cockpit_auth_own_session" ON cockpit_auth_sessions
  FOR ALL USING (auth.uid() = user_id);
```

---

## 7. MODULES FONCTIONNELS

### 7.1 Dashboard Cockpit

**Route** : `/cockpit`

**Vue par défaut "Aujourd'hui" :**
- RDV du jour
- Relances à faire
- Actions en retard
- Projets bloqués
- Alertes IA (insights N0)

**KPIs temps réel :**
- Leads qualifiés cette semaine
- Opportunités en cours (valeur totale)
- RDV 7 jours
- Projets actifs
- CA prévisionnel pipeline

**Command Palette (⌘K)** — utiliser `cmdk` :
- Créer opportunité
- Résumer projet [nom]
- Générer CDC
- Générer devis
- Préparer RDV [contact]
- Rédiger relance [lead/opportunité]
- Recherche globale

### 7.2 Pipeline Commercial

**Route** : `/cockpit/pipeline`

- Vue Kanban avec drag & drop
- Colonnes dynamiques depuis `statuses` (entity_type = 'opportunity')
- Respect des `allowed_transitions`
- Carte : titre, valeur, probabilité, date, insights IA
- Filtres : source, valeur, date, assigné

### 7.3 Leads Qualifiés

**Route** : `/cockpit/leads`

- Vue enrichie (réutilise table existante)
- Scoring IA (N0) avec détail justification
- Timeline `activity_log`
- Zone "IA insights" (recommandations, risques)
- Actions : créer opportunité, planifier RDV, rédiger email (N1)

### 7.4 Agenda Commercial

**Route** : `/cockpit/agenda`

- Calendrier (réutilise `bookings`)
- Pré-réunion : fiche contact, historique, docs, objectifs
- Post-réunion : compte-rendu IA (N1), extraction actions, next steps
- Génération automatique d'activités dans `activity_log`

### 7.5 Projets IA

**Route** : `/cockpit/projets`

- Liste + Kanban par statut
- Fiche projet :
  - Infos générales + liaison opportunité
  - Contacts impliqués (rôles)
  - Réunions associées
  - Documents projet (upload → extraction texte → RAG)
  - Timeline jalons
  - Budget vs consommé
  - Zone "IA insights" (risques, suggestions)
- Génération : devis (N1), CDC (N1), proposition commerciale (N1)

### 7.6 Cahiers des Charges

**Route** : `/cockpit/cahiers-des-charges`

- Création CDC structuré
- Templates par type projet
- Génération IA depuis docs projet (RAG)
- Versioning
- Export PDF/Word "brochure quality"

### 7.7 Analytics & Rapports

**Route** : `/cockpit/analytics`

- Dashboard analytique
- Rapports automatisés (N0) : hebdo, mensuel, pipeline, forecast
- Graphiques : funnel, évolution, performance source
- Export PDF/Excel

---

## 8. NON-DUPLICATION ADMIN vs COCKPIT (règle stricte)

| Fonctionnalité | Admin | Cockpit | Note |
|----------------|-------|---------|------|
| Gestion contenu SEO | ✅ | ❌ | |
| Pages, médias marketing | ✅ | ❌ | |
| Brochures, templates | ✅ (création) | ✅ (utilisation) | Cockpit réutilise pour devis/CDC |
| Leads (liste) | ✅ | ✅ | Même table |
| Leads (qualification) | ❌ | ✅ | |
| Bookings (liste) | ✅ | ✅ | Même table |
| Bookings (comptes-rendus) | ❌ | ✅ | |
| Opportunités | ❌ | ✅ | |
| Projets IA | ❌ | ✅ | |
| CDC / Devis | ❌ | ✅ | |
| Analytics commerciales | ❌ | ✅ | |
| Sécurité, backups | ✅ | ❌ | |

---

## 9. STRUCTURE TECHNIQUE

### 9.1 Organisation fichiers

```
src/
├── pages/
│   └── cockpit/
│       ├── CockpitDashboard.tsx
│       ├── CockpitPipeline.tsx
│       ├── CockpitLeads.tsx
│       ├── CockpitAgenda.tsx
│       ├── CockpitProjects.tsx
│       ├── CockpitProjectDetail.tsx
│       ├── CockpitSpecs.tsx
│       ├── CockpitSpecEditor.tsx
│       ├── CockpitAnalytics.tsx
│       └── CockpitStepUpMfa.tsx      # Écran re-vérification TOTP
│
├── components/
│   └── cockpit/
│       ├── CockpitLayout.tsx
│       ├── CockpitSidebar.tsx
│       ├── CockpitHeader.tsx
│       ├── CockpitCommandPalette.tsx  # cmdk
│       ├── PipelineKanban.tsx
│       ├── OpportunityCard.tsx
│       ├── LeadScoreCard.tsx
│       ├── MeetingPrep.tsx
│       ├── MeetingNotes.tsx
│       ├── ProjectTimeline.tsx
│       ├── ProjectDocuments.tsx
│       ├── ActivityTimeline.tsx
│       ├── SpecEditor.tsx
│       ├── AIInsightsCard.tsx
│       ├── TodayView.tsx
│       └── StepUpMfaDialog.tsx
│
├── hooks/
│   └── cockpit/
│       ├── useOpportunities.ts
│       ├── useProjects.ts
│       ├── useProjectDocuments.ts
│       ├── useMeetingNotes.ts
│       ├── useActivityLog.ts
│       ├── useCockpitAnalytics.ts
│       ├── useCockpitAuth.ts         # Step-up MFA logic
│       └── useCockpitAI.ts           # Appels Edge Functions IA
│
└── types/
    └── cockpit.ts
```

### 9.2 Routes

```typescript
{
  path: '/cockpit',
  element: <ProtectedCockpitRoute />, // Vérifie rôle + MFA + step-up
  children: [
    { index: true, element: <CockpitDashboard /> },
    { path: 'pipeline', element: <CockpitPipeline /> },
    { path: 'leads', element: <CockpitLeads /> },
    { path: 'agenda', element: <CockpitAgenda /> },
    { path: 'projets', element: <CockpitProjects /> },
    { path: 'projets/:id', element: <CockpitProjectDetail /> },
    { path: 'cahiers-des-charges', element: <CockpitSpecs /> },
    { path: 'cahiers-des-charges/:id', element: <CockpitSpecEditor /> },
    { path: 'analytics', element: <CockpitAnalytics /> },
    { path: 'stepup', element: <CockpitStepUpMfa /> }, // Écran re-vérification
  ]
}
```

---

## 10. ORDRE D'IMPLÉMENTATION

### Phase 1 — Fondations (Semaines 1-2)

```
├── 1. Migration rôles cockpit_user/cockpit_admin
├── 2. Table cockpit_auth_sessions + step-up MFA flow
├── 3. ProtectedCockpitRoute + StepUpMfaDialog
├── 4. Bucket cockpit-documents + policies Storage
├── 5. Tables : statuses, opportunities, projects, activity_log
├── 6. RLS complètes sur toutes les tables
├── 7. Layout Cockpit + navigation + bouton Admin
└── 8. Command Palette (cmdk) — structure de base
```

### Phase 2 — Core Features (Semaines 3-4)

```
├── 9. Dashboard + vue "Aujourd'hui"
├── 10. Pipeline Kanban (drag & drop, transitions)
├── 11. Gestion leads qualifiés
├── 12. Activity Timeline transversale
└── 13. Intégration activity_log sur CRUD
```

### Phase 3 — Projets & Documents (Semaines 5-6)

```
├── 14. Module Projets + fiche détail
├── 15. Upload documents (Storage + extraction texte)
├── 16. Liaison contacts/réunions
├── 17. Éditeur CDC + templates
└── 18. Export PDF "brochure quality"
```

### Phase 4 — IA (Semaines 7-8)

```
├── 19. Edge function lead-scoring (N0)
├── 20. Edge function meeting-summary (N1)
├── 21. Edge function generate-spec (N1)
├── 22. Edge function generate-quote (N1)
├── 23. Edge function draft-email (N1)
├── 24. RAG projet (N0/N1)
└── 25. Analytics + rapports automatisés (N0)
```

### Phase 5 — Polish (Semaines 9-10)

```
├── 26. Command Palette — actions complètes
├── 27. Zones "IA insights" sur fiches
├── 28. Optimisations performance
├── 29. Tests accès (URL directe, session expirée, MFA absent, rôle absent)
└── 30. Documentation
```

---

## 11. TESTS D'ACCÈS (checklist obligatoire)

| Scénario | Comportement attendu |
|----------|---------------------|
| Accès URL `/cockpit` directe sans connexion | Redirect → login |
| Accès après login Admin sans rôle Cockpit | Message erreur "Accès non autorisé" |
| Accès avec rôle mais MFA non activé | Message "Activez 2FA pour accéder au Cockpit" |
| Accès avec rôle + MFA mais sans step-up | Écran "Re-vérifier TOTP" |
| Step-up expiré (TTL dépassé) | Écran "Re-vérifier TOTP" |
| Step-up valide | Accès Cockpit OK |
| Changement IP/UA (si détection active) | Invalidation session step-up |

---

## 12. CRITÈRES DE VALIDATION

### Fonctionnels

- [ ] Step-up MFA fonctionnel à l'entrée Cockpit
- [ ] Pipeline commercial (CRUD + drag & drop + transitions)
- [ ] Leads qualifiables avec scoring IA (N0)
- [ ] Projets liés aux contacts, réunions, documents
- [ ] Documents uploadés avec extraction texte
- [ ] CDC générables (N1) et exportables PDF
- [ ] Devis "brochure quality" générables (N1)
- [ ] Rapports automatiques (N0)
- [ ] Activity log alimenté sur toutes les actions

### Techniques

- [ ] RLS actives sur toutes les tables Cockpit
- [ ] Storage policies fonctionnelles (URLs signées)
- [ ] Triggers validation sur toutes les tables
- [ ] Temps de chargement < 2s
- [ ] Responsive mobile
- [ ] Zéro duplication données avec Admin

### Sécurité

- [ ] Step-up MFA vérifié à chaque accès Cockpit
- [ ] TTL session configurable
- [ ] Rôles séparés (cockpit_user, cockpit_admin)
- [ ] Actions sensibles loggées
- [ ] Données IA marquées (ai_metadata)

### IA

- [ ] Niveaux autonomie respectés (N0/N1/N2)
- [ ] ai_metadata sur toutes les sorties IA
- [ ] Validation humaine obligatoire pour N2
- [ ] RAG fonctionnel sur documents projet

---

**Document prêt pour Lovable**  
**Version** : 3.0  
**Statut** : Spécification finale consolidée
