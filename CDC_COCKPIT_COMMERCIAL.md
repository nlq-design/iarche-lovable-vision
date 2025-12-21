# Cahier des Charges - Cockpit Commercial IArche

## 📋 Vue d'ensemble

**Projet :** Module Cockpit Commercial intégré au back-office IArche  
**Version :** 1.0  
**Date :** Décembre 2025  
**Statut :** Spécification  

---

## 🎯 1. Objectifs

### 1.1 Objectif principal

Créer un **Cockpit Commercial** dédié à la gestion de l'activité commerciale et projets IA, accessible depuis le module admin existant, avec une **authentification renforcée (2FA obligatoire)** pour sécuriser l'accès aux données sensibles.

### 1.2 Objectifs secondaires

- Centraliser la gestion des leads qualifiés et opportunités
- Gérer le pipeline commercial de bout en bout
- Suivre les projets IA en cours et leur avancement
- Lier chaque projet à des contacts et réunions
- Automatiser la génération de rapports via IA
- Fournir un tableau de bord analytique global

---

## 🏗️ 2. Architecture existante

### 2.1 Module Admin actuel

Le module admin IArche est organisé en **6 pôles** fonctionnels :

| Pôle | Fonctionnalités |
|------|-----------------|
| **Vue d'ensemble** | Dashboard KPIs, Stats avancées, Performance, Analytics CTAs |
| **Contenu** | Articles, Actualités, Cas clients, Livres blancs, Ateliers, Solutions, FAQs, Brochures, Redacia (IA) |
| **Organisation** | Catégories, Tags |
| **Engagement** | Leads, Rendez-vous, Contacts, Inscriptions, Commentaires, Formulaires |
| **Communication** | Newsletter, RedacNews, Emails, Médias |
| **Sécurité** | Dashboard sécurité, Logs d'audit, Backups, Paramètres |

### 2.2 Tables de base de données existantes

```
├── leads                    # Prospects consolidés (newsletter, ateliers, livres blancs, contacts)
├── bookings                 # Rendez-vous avec types et disponibilités
├── booking_types            # Types de RDV (découverte, suivi, etc.)
├── booking_availability     # Créneaux disponibles
├── contacts                 # Messages formulaire contact
├── articles                 # Contenus multi-types (resource_type)
├── atelier_inscriptions     # Inscriptions aux ateliers
├── newsletter_subscribers   # Abonnés newsletter
├── admin_audit_logs         # Traçabilité des actions
├── login_attempts           # Protection anti-brute force
├── account_locks            # Comptes verrouillés
├── user_roles               # Rôles utilisateurs (admin, user)
└── email_logs               # Historique des emails envoyés
```

### 2.3 Fonctionnalités de sécurité implémentées

- ✅ Protection anti-brute force (5 tentatives → verrouillage 30 min)
- ✅ 2FA/MFA via Supabase Auth (TOTP)
- ✅ Gestion des sessions actives
- ✅ Backups automatiques (pg_cron)
- ✅ Logs d'audit complets
- ✅ Détection d'anomalies IA

---

## 🚀 3. Spécifications fonctionnelles du Cockpit

### 3.1 Principes directeurs

| Principe | Description |
|----------|-------------|
| **Pas de duplication** | Le Cockpit réutilise les tables existantes (`leads`, `bookings`) sans créer de doublons |
| **Séparation claire** | Admin = gestion contenu/technique, Cockpit = activité commerciale/projets |
| **Sécurité renforcée** | Accès uniquement avec 2FA activé et rôle spécifique |
| **Intelligence IA** | Automatisation des rapports, analyses, suggestions |

### 3.2 Matrice de délimitation Admin vs Cockpit

| Fonctionnalité | Admin | Cockpit |
|----------------|-------|---------|
| Voir les leads (liste) | ✅ | ✅ |
| Qualifier un lead (statut) | ❌ | ✅ |
| Créer une opportunité | ❌ | ✅ |
| Pipeline commercial | ❌ | ✅ |
| Voir les RDV (liste) | ✅ | ✅ |
| Préparer un RDV (notes, docs) | ❌ | ✅ |
| Compte-rendu de réunion | ❌ | ✅ |
| Créer un projet IA | ❌ | ✅ |
| Suivi multi-étapes projet | ❌ | ✅ |
| Cahier des charges | ❌ | ✅ |
| Rapports automatisés IA | ❌ | ✅ |
| Analytics commerciales | ❌ | ✅ |
| Gestion contenu (articles) | ✅ | ❌ |
| SEO et performance | ✅ | ❌ |
| Sécurité et backups | ✅ | ❌ |

---

## 📊 4. Modules du Cockpit

### 4.1 Module Dashboard Cockpit

**Route :** `/cockpit`

**Fonctionnalités :**
- Vue 360° de l'activité commerciale
- KPIs temps réel :
  - Leads qualifiés cette semaine
  - Opportunités en cours
  - RDV à venir (7 jours)
  - Projets actifs
  - Chiffre d'affaires prévisionnel
- Graphiques :
  - Pipeline par étape
  - Conversion leads → opportunités
  - Activité par source
- Actions rapides :
  - Ajouter une note
  - Planifier un RDV
  - Qualifier un lead

### 4.2 Module Pipeline Commercial

**Route :** `/cockpit/pipeline`

**Fonctionnalités :**
- Vue Kanban du pipeline :
  - **Lead** (nouveau contact)
  - **Qualifié** (besoin identifié)
  - **Opportunité** (proposition en cours)
  - **Négociation** (devis envoyé)
  - **Gagné** / **Perdu**
- Drag & drop entre étapes
- Valeur par opportunité
- Probabilité de conversion
- Date de clôture estimée
- Historique des interactions

**Nouvelle table : `opportunities`**
```sql
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  title TEXT NOT NULL,
  description TEXT,
  value_amount DECIMAL(12,2),
  probability INTEGER DEFAULT 50, -- 0-100%
  stage TEXT DEFAULT 'lead', -- lead, qualified, proposal, negotiation, won, lost
  expected_close_date DATE,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  close_reason TEXT
);
```

### 4.3 Module Gestion des Leads Qualifiés

**Route :** `/cockpit/leads`

**Fonctionnalités :**
- Vue enrichie des leads (réutilise table `leads`)
- Scoring automatique IA basé sur :
  - Source d'acquisition
  - Taille entreprise
  - Secteur d'activité
  - Interactions précédentes
- Statut de qualification :
  - Nouveau
  - Contacté
  - Qualifié
  - Disqualifié
- Notes et historique des échanges
- Actions :
  - Créer opportunité
  - Planifier RDV
  - Envoyer email

**Extension table `leads` (nouvelle colonne) :**
```sql
ALTER TABLE leads ADD COLUMN qualification_status TEXT DEFAULT 'new';
ALTER TABLE leads ADD COLUMN lead_score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN last_contacted_at TIMESTAMPTZ;
```

### 4.4 Module Agenda Commercial

**Route :** `/cockpit/agenda`

**Fonctionnalités :**
- Calendrier hebdomadaire/mensuel (réutilise `bookings`)
- Vue par type de RDV
- Préparation réunion :
  - Fiche contact associée
  - Historique des échanges
  - Documents partagés
  - Objectifs de la réunion
- Post-réunion :
  - Compte-rendu assisté IA
  - Actions à suivre
  - Prochaine étape pipeline
- Rappels automatiques

**Nouvelle table : `meeting_notes`**
```sql
CREATE TABLE meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  opportunity_id UUID REFERENCES opportunities(id),
  objectives TEXT,
  notes TEXT,
  ai_summary TEXT, -- Résumé généré par IA
  action_items JSONB DEFAULT '[]'::jsonb,
  next_steps TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.5 Module Projets IA

**Route :** `/cockpit/projets`

**Fonctionnalités :**
- Création et suivi de projets IA
- Étapes du projet :
  - **Cadrage** (CDC, périmètre)
  - **Conception** (architecture, spécifications)
  - **Développement** (implémentation)
  - **Tests** (validation, recettage)
  - **Déploiement** (mise en production)
  - **Suivi** (maintenance, évolutions)
- Liaison avec :
  - Opportunité d'origine
  - Contacts impliqués
  - Réunions associées
  - Documents projet
- Timeline et jalons
- Budget et consommé

**Nouvelle table : `projects`**
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'scoping', -- scoping, design, development, testing, deployment, maintenance
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,
  budget_amount DECIMAL(12,2),
  consumed_amount DECIMAL(12,2) DEFAULT 0,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Table de liaison projets/contacts : `project_contacts`**
```sql
CREATE TABLE project_contacts (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'stakeholder', -- stakeholder, decision_maker, technical, sponsor
  PRIMARY KEY (project_id, lead_id)
);
```

### 4.6 Module Cahiers des Charges

**Route :** `/cockpit/cahiers-des-charges`

**Fonctionnalités :**
- Création de CDC structurés
- Templates par type de projet IA
- Sections :
  - Contexte et objectifs
  - Périmètre fonctionnel
  - Exigences techniques
  - Planning prévisionnel
  - Budget estimé
  - Critères de validation
- Génération assistée IA
- Export PDF/Word
- Historique des versions

**Nouvelle table : `specifications`**
```sql
CREATE TABLE specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'draft', -- draft, review, approved, archived
  content JSONB DEFAULT '{}'::jsonb, -- Structure du CDC
  ai_generated BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.7 Module Rapports & Analytics

**Route :** `/cockpit/analytics`

**Fonctionnalités :**
- Tableau de bord analytique
- Rapports automatisés IA :
  - Rapport hebdomadaire commercial
  - Analyse du pipeline
  - Prévisions de CA
  - Performance par source
- Graphiques interactifs :
  - Funnel de conversion
  - Évolution du pipeline
  - Activité par commercial
  - Temps moyen par étape
- Export PDF/Excel

**Nouvelle table : `cockpit_reports`**
```sql
CREATE TABLE cockpit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL, -- weekly, monthly, pipeline, forecast
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL,
  ai_insights TEXT,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔐 5. Sécurité et accès

### 5.1 Authentification renforcée

**Prérequis obligatoires pour accéder au Cockpit :**
1. Être connecté avec un compte admin
2. Avoir le 2FA activé et vérifié
3. Avoir le rôle `cockpit_user` ou `cockpit_admin`

**Nouveau rôle utilisateur :**
```sql
-- Ajout des rôles Cockpit à l'enum existant
ALTER TYPE app_role ADD VALUE 'cockpit_user';
ALTER TYPE app_role ADD VALUE 'cockpit_admin';
```

### 5.2 Bouton d'accès dans l'Admin

- Bouton visible uniquement pour les utilisateurs avec rôle Cockpit
- Vérification 2FA avant accès
- Redirection vers `/cockpit` si autorisé
- Message d'erreur explicite si 2FA non activé

### 5.3 Politiques RLS

```sql
-- Exemple pour opportunities
CREATE POLICY "Cockpit users can view opportunities"
ON opportunities FOR SELECT
USING (has_role(auth.uid(), 'cockpit_user') OR has_role(auth.uid(), 'cockpit_admin'));

CREATE POLICY "Cockpit admins can manage opportunities"
ON opportunities FOR ALL
USING (has_role(auth.uid(), 'cockpit_admin'));
```

---

## 🤖 6. Fonctionnalités IA

### 6.1 Scoring automatique des leads

- Analyse des données du lead
- Score basé sur critères pondérés
- Mise à jour en temps réel

### 6.2 Résumé de réunions

- Transcription des notes
- Extraction des points clés
- Suggestions d'actions

### 6.3 Génération de CDC

- Templates intelligents
- Suggestions contextuelles
- Complétion automatique

### 6.4 Rapports automatisés

- Synthèse hebdomadaire
- Analyse des tendances
- Recommandations commerciales

### 6.5 Edge Functions IA

```
├── supabase/functions/
│   ├── cockpit-lead-scoring/         # Calcul du score lead
│   ├── cockpit-meeting-summary/      # Résumé réunion IA
│   ├── cockpit-generate-spec/        # Génération CDC
│   ├── cockpit-weekly-report/        # Rapport hebdomadaire
│   └── cockpit-forecast/             # Prévisions commerciales
```

---

## 📁 7. Structure technique

### 7.1 Organisation des fichiers

```
src/
├── pages/
│   ├── cockpit/
│   │   ├── CockpitDashboard.tsx      # Dashboard principal
│   │   ├── CockpitPipeline.tsx       # Pipeline Kanban
│   │   ├── CockpitLeads.tsx          # Leads qualifiés
│   │   ├── CockpitAgenda.tsx         # Agenda commercial
│   │   ├── CockpitProjects.tsx       # Projets IA
│   │   ├── CockpitProjectDetail.tsx  # Détail projet
│   │   ├── CockpitSpecs.tsx          # Cahiers des charges
│   │   ├── CockpitSpecEditor.tsx     # Éditeur CDC
│   │   └── CockpitAnalytics.tsx      # Analytics & rapports
│   └── CockpitAuth.tsx               # Vérification 2FA
│
├── components/
│   └── cockpit/
│       ├── CockpitLayout.tsx         # Layout spécifique
│       ├── CockpitSidebar.tsx        # Navigation Cockpit
│       ├── CockpitHeader.tsx         # Header avec KPIs
│       ├── PipelineKanban.tsx        # Board Kanban
│       ├── OpportunityCard.tsx       # Carte opportunité
│       ├── LeadScoreCard.tsx         # Score lead
│       ├── MeetingPrep.tsx           # Préparation RDV
│       ├── MeetingNotes.tsx          # Notes de réunion
│       ├── ProjectTimeline.tsx       # Timeline projet
│       ├── SpecEditor.tsx            # Éditeur CDC
│       ├── AIInsightsCard.tsx        # Insights IA
│       └── CockpitCharts.tsx         # Graphiques
│
├── hooks/
│   └── cockpit/
│       ├── useOpportunities.ts
│       ├── useProjects.ts
│       ├── useMeetingNotes.ts
│       ├── useCockpitAnalytics.ts
│       └── useCockpitAuth.ts         # Vérification 2FA
│
└── types/
    └── cockpit.ts                    # Types TypeScript
```

### 7.2 Routes

```typescript
// Ajout au router
{
  path: '/cockpit',
  element: <ProtectedCockpitRoute />,
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

## 📐 8. Design & UX

### 8.1 Principes

- Design distinct du module Admin (différenciation couleur)
- Interface épurée orientée action
- Accès rapide aux informations clés
- Mobile-responsive pour usage terrain

### 8.2 Palette couleurs suggérée

| Élément | Couleur |
|---------|---------|
| Accent Cockpit | `#0EA5E9` (Sky blue) |
| Pipeline - Lead | `#94A3B8` (Slate) |
| Pipeline - Qualifié | `#3B82F6` (Blue) |
| Pipeline - Opportunité | `#8B5CF6` (Violet) |
| Pipeline - Négociation | `#F59E0B` (Amber) |
| Pipeline - Gagné | `#22C55E` (Green) |
| Pipeline - Perdu | `#EF4444` (Red) |

---

## 🔄 9. Intégrations

### 9.1 Intégrations existantes utilisées

- ✅ Google Calendar (via `bookings`)
- ✅ Emails automatiques (via `email_logs`)
- ✅ Lovable AI (via Edge Functions)

### 9.2 Intégrations futures (v2)

- 📋 CRM externe (HubSpot, Pipedrive)
- 📧 Séquences email automatisées
- 📊 BI tools (Metabase, Tableau)
- 📞 VoIP (Aircall, Ringover)

---

## 📅 10. Roadmap de développement

### Phase 1 : Fondations (Semaines 1-2)

- [ ] Création des nouvelles tables (opportunities, projects, etc.)
- [ ] Mise en place des politiques RLS
- [ ] Composant ProtectedCockpitRoute (vérification 2FA)
- [ ] Layout et navigation Cockpit
- [ ] Bouton d'accès dans l'Admin

### Phase 2 : Core Features (Semaines 3-4)

- [ ] Dashboard Cockpit avec KPIs
- [ ] Pipeline Kanban (drag & drop)
- [ ] Gestion des leads qualifiés
- [ ] Extension de la vue bookings (notes)

### Phase 3 : Projets & CDC (Semaines 5-6)

- [ ] Module Projets IA
- [ ] Liaison projets/contacts
- [ ] Éditeur de cahiers des charges
- [ ] Templates CDC

### Phase 4 : IA & Analytics (Semaines 7-8)

- [ ] Edge function lead scoring
- [ ] Edge function résumé réunion
- [ ] Edge function génération CDC
- [ ] Tableau de bord analytics
- [ ] Rapports automatisés

### Phase 5 : Polish & Tests (Semaines 9-10)

- [ ] Tests utilisateurs
- [ ] Optimisations performance
- [ ] Documentation utilisateur
- [ ] Formation équipe

---

## ✅ 11. Critères de validation

### 11.1 Fonctionnels

- [ ] Accès sécurisé avec 2FA obligatoire
- [ ] Pipeline commercial fonctionnel (CRUD + drag & drop)
- [ ] Leads qualifiables avec scoring
- [ ] Projets liés aux contacts et réunions
- [ ] CDC générables et exportables
- [ ] Rapports automatiques hebdomadaires

### 11.2 Techniques

- [ ] Temps de chargement < 2s
- [ ] Responsive mobile
- [ ] RLS correctement configurées
- [ ] Logs d'audit sur toutes les actions
- [ ] Zéro duplication de données avec l'Admin

### 11.3 Sécurité

- [ ] 2FA vérifié à chaque accès
- [ ] Rôles séparés (cockpit_user, cockpit_admin)
- [ ] Actions sensibles loggées
- [ ] Données chiffrées au repos

---

## 📚 12. Annexes

### A. Schéma relationnel

```
leads ─────────────────┐
  │                    │
  ├──> opportunities ──┼──> projects ──> specifications
  │         │          │       │
  │         │          │       └──> project_contacts
  │         │          │
  │         └──────────┼──> meeting_notes
  │                    │
bookings ──────────────┘
```

### B. Flux utilisateur principal

```
1. Lead capturé (Admin)
      ↓
2. Lead qualifié (Cockpit)
      ↓
3. Opportunité créée (Cockpit)
      ↓
4. RDV planifié (Admin/Cockpit)
      ↓
5. Compte-rendu RDV (Cockpit)
      ↓
6. Projet créé (Cockpit)
      ↓
7. CDC rédigé (Cockpit)
      ↓
8. Projet livré (Cockpit)
```

### C. Glossaire

| Terme | Définition |
|-------|------------|
| Lead | Contact entrant non qualifié |
| Opportunité | Lead qualifié avec potentiel commercial identifié |
| Pipeline | Ensemble des opportunités organisées par étape |
| CDC | Cahier des Charges, document de spécification projet |
| Scoring | Note automatique évaluant le potentiel d'un lead |

---

**Document rédigé le :** 21 décembre 2025  
**Auteur :** IArche Team  
**Version :** 1.0  
**Statut :** En attente de validation
