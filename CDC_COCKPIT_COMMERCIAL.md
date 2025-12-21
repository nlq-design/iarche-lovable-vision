# Cahier des Charges V2 — Cockpit Commercial IArche

**Document de spécification pour Lovable**

- **Projet** : Module Cockpit Commercial intégré au back-office existant
- **Version** : 2.0
- **Date** : 21 décembre 2025
- **Contexte** : Extension du site IArche (portail, solutions, services, ressources) et module Admin existant

---

## 1. SYNTHÈSE EXÉCUTIVE

### Objectif

Créer un Cockpit Commercial accessible depuis le module Admin via un bouton dédié, avec 2FA obligatoire, pour piloter l'activité commerciale et les projets IA sans dupliquer les fonctionnalités Admin existantes.

### Différences clés V1 → V2

| Aspect | V1 | V2 (améliorations) |
|--------|----|--------------------|
| Statuts | Colonnes dispersées | Table de référentiels unifiée `statuses` |
| Activité | Notes/emails répartis | Journal d'activité transversal `activity_log` |
| IA | Assistée simple | Gouvernance IA traçable (confidence, validation) |
| Documents | Non prévu | Stockage documentaire par projet |
| Collaboration | Mono-utilisateur | Espaces partenaires/apporteurs d'affaires (v2+) |
| Navigation | Standard | Command Palette (⌘K) + vue "Aujourd'hui" |

---

## 2. PRINCIPES DIRECTEURS

### 2.1 Règles strictes

- **Zéro duplication** — Réutiliser leads, bookings, contacts existants
- **Séparation claire** — Admin = contenu/SEO/sécurité, Cockpit = business/projets
- **Accès sécurisé** — Bouton Cockpit visible uniquement si rôle + 2FA activé
- **IA assistée, jamais autonome** — Toute génération IA nécessite validation humaine

### 2.2 Architecture cible

```
┌─────────────────────────────────────────────────────────────┐
│                     MODULE ADMIN (existant)                  │
│  Contenu │ Organisation │ Engagement │ Communication │ Sécu │
└────────────────────────────┬────────────────────────────────┘
                             │ Bouton "Cockpit" (2FA requis)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      COCKPIT COMMERCIAL                      │
│  Dashboard │ Pipeline │ Leads │ Agenda │ Projets │ CDC │ Analytics │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (tables partagées)               │
│  leads │ bookings │ opportunities │ projects │ activity_log │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. MODÈLE DE DONNÉES

### 3.1 Extensions des tables existantes

```sql
-- Extension table leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualification_status TEXT DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS industry TEXT;
```

### 3.2 Nouvelles tables

#### Table de référentiels unifiée (amélioration V2)

```sql
CREATE TABLE statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'lead', 'opportunity', 'project', 'specification'
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_terminal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, code)
);

-- Données initiales
INSERT INTO statuses (entity_type, code, label, display_order, is_terminal) VALUES
  ('lead', 'new', 'Nouveau', 1, false),
  ('lead', 'contacted', 'Contacté', 2, false),
  ('lead', 'qualified', 'Qualifié', 3, false),
  ('lead', 'disqualified', 'Disqualifié', 4, true),
  ('opportunity', 'lead', 'Lead', 1, false),
  ('opportunity', 'qualified', 'Qualifié', 2, false),
  ('opportunity', 'proposal', 'Proposition', 3, false),
  ('opportunity', 'negotiation', 'Négociation', 4, false),
  ('opportunity', 'won', 'Gagné', 5, true),
  ('opportunity', 'lost', 'Perdu', 6, true),
  ('project', 'scoping', 'Cadrage', 1, false),
  ('project', 'design', 'Conception', 2, false),
  ('project', 'development', 'Développement', 3, false),
  ('project', 'testing', 'Tests', 4, false),
  ('project', 'deployment', 'Déploiement', 5, false),
  ('project', 'maintenance', 'Suivi', 6, false),
  ('project', 'completed', 'Terminé', 7, true),
  ('specification', 'draft', 'Brouillon', 1, false),
  ('specification', 'review', 'En revue', 2, false),
  ('specification', 'approved', 'Validé', 3, true);
```

#### Opportunités

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
  close_reason TEXT
);

CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_lead ON opportunities(lead_id);
CREATE INDEX idx_opportunities_assigned ON opportunities(assigned_to);
```

#### Projets

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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_opportunity ON projects(opportunity_id);
```

#### Contacts projet

```sql
CREATE TABLE project_contacts (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'stakeholder',
  PRIMARY KEY (project_id, lead_id)
);
```

#### Notes de réunion

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
```

#### Cahiers des charges

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
```

#### Documents projet

```sql
CREATE TABLE project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'xlsx', 'email', 'transcript'
  file_url TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_project_documents_project ON project_documents(project_id);
```

#### Journal d'activité transversal (amélioration V2)

```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'lead', 'opportunity', 'project', 'meeting'
  entity_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'note', 'email', 'call', 'meeting', 'status_change', 'ai_action'
  content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
```

#### Rapports Cockpit

```sql
CREATE TABLE cockpit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL, -- 'weekly', 'monthly', 'pipeline', 'forecast'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL,
  ai_insights TEXT,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Configuration 2FA

```sql
CREATE TABLE user_2fa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  totp_secret TEXT, -- Encrypted TOTP secret
  is_enabled BOOLEAN DEFAULT false,
  backup_codes JSONB DEFAULT '[]'::jsonb,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.3 Schéma relationnel

```
leads ─────────────────────┐
  │                        │
  ├──► opportunities ──────┼──► projects ──► specifications
  │         │              │       │
  │         │              │       ├──► project_contacts
  │         │              │       │
  │         │              │       └──► project_documents
  │         │              │
  │         └──────────────┼──► meeting_notes
  │                        │
bookings ──────────────────┘
  
activity_log ◄───── (transversal, référence entity_type + entity_id)

statuses ◄───── (référentiel unifié pour tous les statuts)
```

---

## 4. MODULES FONCTIONNELS

### 4.1 Dashboard Cockpit

**Route** : `/cockpit`

**Fonctionnalités** :
- Vue "Aujourd'hui" (par défaut) : RDV du jour, actions en retard, projets bloqués, alertes IA
- KPIs temps réel : leads qualifiés, opportunités en cours, RDV 7j, projets actifs, CA prévisionnel
- Graphiques : pipeline par étape (funnel), conversion, activité par source
- Actions rapides : ajouter note, planifier RDV, qualifier lead, créer opportunité
- Command Palette (⌘K) : recherche rapide + actions contextuelles

### 4.2 Pipeline Commercial

**Route** : `/cockpit/pipeline`

**Fonctionnalités** :
- Vue Kanban avec drag & drop entre étapes
- Colonnes : Lead → Qualifié → Proposition → Négociation → Gagné/Perdu
- Carte opportunité : titre, valeur, probabilité, date clôture estimée
- Filtres : par source, par valeur, par date, par assigné
- Historique des interactions sur chaque opportunité

### 4.3 Leads Qualifiés

**Route** : `/cockpit/leads`

**Fonctionnalités** :
- Vue enrichie des leads (réutilise table existante)
- Scoring automatique IA (0-100) basé sur : source, taille entreprise, secteur, interactions
- Statuts : Nouveau → Contacté → Qualifié / Disqualifié
- Timeline d'activité par lead (via activity_log)
- Actions : créer opportunité, planifier RDV, envoyer email, ajouter note

### 4.4 Agenda Commercial

**Route** : `/cockpit/agenda`

**Fonctionnalités** :
- Calendrier hebdo/mensuel (réutilise bookings)
- Pré-réunion : fiche contact, historique échanges, documents, objectifs (checklist)
- Post-réunion : compte-rendu assisté IA, extraction actions, prochaine étape
- Rappels automatiques

### 4.5 Projets IA

**Route** : `/cockpit/projets`

**Fonctionnalités** :
- Liste projets avec vue Kanban par statut
- Étapes : Cadrage → Conception → Développement → Tests → Déploiement → Suivi
- Fiche projet :
  - Liaison opportunité d'origine
  - Contacts impliqués (avec rôles)
  - Réunions associées
  - Documents projet (upload/stockage)
  - Timeline jalons
  - Budget vs consommé
- Génération automatisée : devis, propositions, CDC (via IA)

### 4.6 Cahiers des Charges

**Route** : `/cockpit/cahiers-des-charges`

**Fonctionnalités** :
- Création CDC structuré
- Templates par type projet : Chatbot RAG, ERP, Intégration, Accompagnement
- Sections standard : contexte, périmètre, exigences, planning, budget, critères validation
- Génération assistée IA (pré-remplissage depuis documents projet)
- Export PDF/Word
- Versioning avec historique

### 4.7 Analytics & Rapports

**Route** : `/cockpit/analytics`

**Fonctionnalités** :
- Tableau de bord analytique
- Rapports automatisés IA : hebdo, mensuel, pipeline, prévisions CA
- Graphiques : funnel conversion, évolution pipeline, performance par source, temps moyen par étape
- Export PDF/Excel

### 4.8 Journal d'Activité (amélioration V2)

**Fonctionnalité transversale** :
- Timeline unifiée visible sur chaque fiche (lead, opportunité, projet)
- Types : note, email, appel, réunion, changement statut, action IA
- Base idéale pour résumé IA ("résume-moi ce projet/lead")

---

## 5. SÉCURITÉ ET ACCÈS

### 5.1 Authentification renforcée

**Prérequis accès Cockpit** :
1. Être connecté avec compte admin
2. Avoir 2FA activé et vérifié
3. Avoir rôle `cockpit_user` ou `cockpit_admin`

**Nouveaux rôles** :
```sql
-- Ajout via migration séparée
INSERT INTO user_roles (user_id, role) VALUES (..., 'cockpit_user');
INSERT INTO user_roles (user_id, role) VALUES (..., 'cockpit_admin');
```

> **Note** : Les rôles `cockpit_user` et `cockpit_admin` seront ajoutés à l'enum `app_role` via une migration dédiée.

### 5.2 Bouton d'accès Admin

- Visible uniquement si rôle Cockpit
- Clic → vérification 2FA → redirection `/cockpit`
- Message erreur explicite si 2FA non activé

### 5.3 Politiques RLS

```sql
-- Exemple pour opportunities
CREATE POLICY "cockpit_view_opportunities" ON opportunities
  FOR SELECT USING (
    has_role(auth.uid(), 'cockpit_user') OR 
    has_role(auth.uid(), 'cockpit_admin')
  );

CREATE POLICY "cockpit_manage_opportunities" ON opportunities
  FOR ALL USING (has_role(auth.uid(), 'cockpit_admin'));

-- Logs d'audit sur actions sensibles
CREATE POLICY "log_cockpit_actions" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

---

## 6. FONCTIONNALITÉS IA

### 6.1 Gouvernance IA (amélioration V2)

Toute donnée générée par IA doit inclure :

```json
{
  "ai_metadata": {
    "source": "cockpit-lead-scoring",
    "model": "google/gemini-2.5-flash",
    "confidence": 0.87,
    "generated_at": "2025-12-21T10:30:00Z",
    "validated_by_human": false,
    "validated_at": null
  }
}
```

**Règle** : Aucune écriture automatique en base métier sans `validated_by_human: true`

### 6.2 Edge Functions IA

```
supabase/functions/
├── cockpit-lead-scoring/         # Calcul score lead (0-100)
├── cockpit-meeting-summary/      # Résumé réunion depuis notes
├── cockpit-generate-spec/        # Génération CDC depuis contexte projet
├── cockpit-weekly-report/        # Rapport hebdomadaire automatique
├── cockpit-forecast/             # Prévisions CA pipeline
└── cockpit-activity-summary/     # Résumé activité par entité
```

### 6.3 Cas d'usage IA

| Fonction | Input | Output | Validation |
|----------|-------|--------|------------|
| Scoring lead | Données lead + historique | Score 0-100 + justification | Auto (informatif) |
| Résumé réunion | Notes brutes | Synthèse + actions | Humaine requise |
| Génération CDC | Docs projet + contexte | CDC structuré | Humaine requise |
| Rapport hebdo | Données semaine | Synthèse + insights | Auto (informatif) |
| Suggestions actions | Timeline lead/projet | Liste actions prioritaires | Humaine requise |

---

## 7. STRUCTURE TECHNIQUE

### 7.1 Organisation fichiers

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
│       └── CockpitAnalytics.tsx
│
├── components/
│   └── cockpit/
│       ├── CockpitLayout.tsx
│       ├── CockpitSidebar.tsx
│       ├── CockpitHeader.tsx
│       ├── CommandPalette.tsx
│       ├── PipelineKanban.tsx
│       ├── OpportunityCard.tsx
│       ├── LeadScoreCard.tsx
│       ├── MeetingPrep.tsx
│       ├── MeetingNotes.tsx
│       ├── ProjectTimeline.tsx
│       ├── ActivityTimeline.tsx
│       ├── SpecEditor.tsx
│       ├── AIInsightsCard.tsx
│       └── TodayView.tsx
│
├── hooks/
│   └── cockpit/
│       ├── useOpportunities.ts
│       ├── useProjects.ts
│       ├── useMeetingNotes.ts
│       ├── useActivityLog.ts
│       ├── useCockpitAnalytics.ts
│       └── useCockpitAuth.ts
│
└── types/
    └── cockpit.ts
```

### 7.2 Routes

```typescript
{
  path: '/cockpit',
  element: <ProtectedCockpitRoute />, // Vérifie 2FA + rôle
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
  ]
}
```

---

## 8. FLUX UTILISATEUR PRINCIPAL

```
1. Lead capturé (Admin - existant)
      ↓
2. Lead qualifié + scoré (Cockpit)
      ↓
3. Opportunité créée (Cockpit)
      ↓
4. RDV planifié (Admin/Cockpit)
      ↓
5. Préparation RDV (Cockpit)
      ↓
6. Compte-rendu RDV + actions (Cockpit + IA)
      ↓
7. Projet créé (Cockpit)
      ↓
8. Documents uploadés (Cockpit)
      ↓
9. CDC généré (Cockpit + IA)
      ↓
10. Projet suivi → livré (Cockpit)
```

---

## 9. ROADMAP DÉVELOPPEMENT

### Phase 1 : Fondations (Semaines 1-2)

- [ ] Création tables (statuses, opportunities, projects, activity_log)
- [ ] Politiques RLS
- [ ] Table user_2fa_settings + flow TOTP
- [ ] ProtectedCockpitRoute (vérification 2FA + rôle)
- [ ] Layout et navigation Cockpit
- [ ] Bouton accès dans Admin

### Phase 2 : Core Features (Semaines 3-4)

- [ ] Dashboard Cockpit avec KPIs + vue "Aujourd'hui"
- [ ] Pipeline Kanban (drag & drop)
- [ ] Gestion leads qualifiés
- [ ] Activity Timeline transversale

### Phase 3 : Projets & CDC (Semaines 5-6)

- [ ] Module Projets IA
- [ ] Liaison projets/contacts
- [ ] Stockage documentaire (bucket cockpit-documents)
- [ ] Éditeur CDC + templates

### Phase 4 : IA & Analytics (Semaines 7-8)

- [ ] Edge function lead scoring
- [ ] Edge function résumé réunion
- [ ] Edge function génération CDC
- [ ] Tableau de bord analytics
- [ ] Rapports automatisés

### Phase 5 : Polish (Semaines 9-10)

- [ ] Command Palette (⌘K) avec cmdk
- [ ] Tests utilisateurs
- [ ] Optimisations performance
- [ ] Documentation

---

## 10. CRITÈRES DE VALIDATION

### Fonctionnels

- [ ] Accès sécurisé avec 2FA obligatoire
- [ ] Pipeline commercial fonctionnel (CRUD + drag & drop)
- [ ] Leads qualifiables avec scoring IA
- [ ] Projets liés aux contacts et réunions
- [ ] CDC générables et exportables
- [ ] Rapports automatiques hebdomadaires
- [ ] Activity log fonctionnel sur toutes les entités

### Techniques

- [ ] Temps de chargement < 2s
- [ ] Responsive mobile
- [ ] RLS correctement configurées
- [ ] Logs d'audit sur toutes les actions
- [ ] Zéro duplication de données avec Admin
- [ ] Gouvernance IA traçable (ai_metadata)

### Sécurité

- [ ] 2FA vérifié à chaque accès Cockpit
- [ ] Rôles séparés (cockpit_user, cockpit_admin)
- [ ] Actions sensibles loggées
- [ ] Données IA marquées et validables

---

## 11. POINTS D'ATTENTION LOVABLE

1. **Réutiliser les tables existantes** — Ne pas recréer leads, bookings, contacts
2. **Respecter la charte graphique existante** — Couleurs et typographie déjà définies dans le projet
3. **Table statuses** — Utiliser comme référentiel unique pour éviter les enums dispersés
4. **Activity_log** — Alimenter systématiquement à chaque action CRUD
5. **AI_metadata** — Inclure sur tout champ généré par IA
6. **ProtectedCockpitRoute** — Vérifier 2FA avant tout accès, pas juste le rôle
7. **Command Palette** — Prévoir dès le début avec cmdk (déjà installé), pas en phase polish
8. **Triggers de validation** — Utiliser des triggers au lieu de contraintes CHECK pour les validations
9. **Bucket Storage** — Créer `cockpit-documents` pour les fichiers projet

---

**Document prêt pour Lovable**
- **Version** : 2.0
- **Statut** : Spécification finale
- **Dernière mise à jour** : 21 décembre 2025
