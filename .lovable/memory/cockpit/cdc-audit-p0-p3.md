# CDC Complet & Audit BDD — P0 à P3
Updated: 2026-03-14 / Audit BDD : 2026-04-16

---

## 🔍 STATUT RÉEL BDD (audit 16/04/2026)

**P0-A implémenté à ~9%.** Audit croisé `pg_trigger` + `information_schema.columns` + grep `src/` + `supabase/functions/`.

### ✅ En BDD + opérationnel
- `opportunities.stage_entered_at` + trigger `set_stage_entered_at`
- `opportunities.probability` (existant — pas d'auto-calc par stage)

### 🔴 Specs dormantes (0 BDD, 0 référence code)
- BANT : `bant_score`, `bant_budget`, `bant_authority`, `bant_need`, `bant_timeline` (opportunities)
- Loss : `loss_reason` (opportunities)
- Lead Temperature : `temperature`, `last_contact_date` (leads)
- Project Health : `health_score`, `budget_sold` (projects) — note : `health_status` CHECK existe et couvre ~80%

### Règle de closure
Aucune de ces 10 colonnes ne doit être créée en batch. Création UNIQUEMENT au moment où la feature consommatrice (UI + logique) est codée. Détail + priorisation métier : voir `mem://cockpit/cdc-p0a-statut-reel-fr.md`.

---

## 📊 ÉTAT ACTUEL DE LA BASE (Audit)

### Volumétrie
| Table | Rows | Observation |
|-------|------|-------------|
| leads | 24 | Faible, OK pour MVP |
| opportunities | 26 | 22 en "lead", 2 en "r1", 2 en "r2" — aucun won/lost |
| projects | 14 | Tous en planning/scoping, budget_amount NULL sauf 1 |
| tasks | 2754 | 2256 pending (dont 144 overdue), 296 AI completed |
| bookings | 120 | OK |
| voice_transcriptions | 91 | Bonne base |
| partners | 11 | OK |
| viviers | 166814 | Volume significatif |
| activity_log | 3405 | Bon historique |
| daily_intelligence | 24 | ~1/jour |
| ai_sentinel_alerts | 8 | Très peu |

### Colonnes Manquantes Identifiées
| Table | Colonne manquante | Impact |
|-------|-------------------|--------|
| opportunities | `stage_entered_at` | Impossible de calculer Pipeline Velocity |
| opportunities | `stage_history` (jsonb) | Pas de traçabilité des transitions |
| opportunities | `weighted_value` | Pas de forecast pondéré |
| opportunities | `next_action` / `next_action_date` | Pas de relance structurée |
| leads | `temperature` (hot/warm/cold) | Pas de priorisation visuelle |
| leads | `bant_budget/authority/need/timeline` | BANT non structuré |
| leads | `last_activity_at` | Différent de last_contacted_at |
| leads | `days_since_last_activity` (computed) | Stagnation invisible |
| projects | `margin_percent` | Pas de suivi marge |
| projects | `health_score` (int) | health_status est manuel, pas calculé |
| projects | `tasks_total/tasks_done` (denormalized) | Pas de % avancement |
| tasks | `source_transcription_id` | Pas de lien tâche↔transcription |
| partners | `total_commission_earned` | Pas de suivi commission |
| partners | `deals_referred` / `deals_won` | Pas de performance tracking |
| voice_transcriptions | `action_items_extracted` (jsonb) | Items d'action non structurés |
| voice_transcriptions | `auto_tasks_created` (bool) | Pas de flag si tâches créées |

### Index OK
- activity_log : 7 index ✅
- leads : 12 index ✅  
- viviers : 30+ index ✅ (potentiellement over-indexed)
- opportunities : 4 index (manque idx_opportunities_created_at)
- tasks : 7 index ✅

### Problèmes Structurels
1. **Pipeline gelé** : 22/26 opportunités en "lead", aucune closed_won/lost → sync_won_to_project jamais déclenché
2. **Budget projets NULL** : 13/14 projets sans budget → consumed_amount inutile
3. **Tasks AI overdue** : 296 tâches "completed" mais flaggées overdue → incohérence statut/date
4. **health_status manuel** : Aucun trigger de calcul automatique

---

## 🔴 P0 — CRITIQUE (Effort: Moyen, Impact: Immédiat)

### P0.1 — Pipeline Velocity & Stage Tracking
**Objectif** : Mesurer le temps moyen par étape du pipeline et identifier les bottlenecks.

**Migration BDD** :
```sql
-- Ajouter stage_entered_at et stage_history aux opportunités
ALTER TABLE opportunities 
  ADD COLUMN stage_entered_at timestamptz DEFAULT now(),
  ADD COLUMN stage_history jsonb DEFAULT '[]'::jsonb;

-- Trigger pour tracker les transitions
CREATE OR REPLACE FUNCTION track_stage_transition() ...
  -- OLD.stage != NEW.stage → append to stage_history, reset stage_entered_at
```

**Colonnes** :
- `stage_entered_at` (timestamptz) : Date d'entrée dans le stage actuel
- `stage_history` (jsonb) : `[{stage, entered_at, exited_at, duration_days}]`

**UI** :
- Widget "Pipeline Velocity" sur Dashboard : temps moyen par stage (bar chart)
- Badge "X jours dans ce stage" sur chaque carte pipeline
- Alerte Sentinel si durée > seuil configurable

**KPIs calculés** :
- Cycle moyen lead→won
- Taux de conversion par stage
- Bottleneck stage (le plus lent)

---

### P0.2 — Lead Temperature & Visual Timeline
**Objectif** : Priorisation visuelle instantanée des leads.

**Migration BDD** :
```sql
ALTER TABLE leads
  ADD COLUMN temperature text DEFAULT 'warm' 
    CHECK (temperature IN ('hot','warm','cold','dead')),
  ADD COLUMN last_activity_at timestamptz;

-- Trigger auto-update last_activity_at depuis activity_log
```

**Règles de calcul température** :
- 🔴 HOT : activité < 3 jours + score > 50 + opportunité active
- 🟡 WARM : activité < 14 jours
- 🔵 COLD : activité > 14 jours < 60 jours
- ⚫ DEAD : activité > 60 jours + aucun RDV prévu

**UI** :
- Badge coloré sur liste leads et pipeline
- Filtre par température
- Timeline visuelle des interactions (vertical, derniers 30 jours)

---

### P0.3 — Auto-création Tâches Post-Transcription
**Objectif** : Extraire automatiquement les action items d'une transcription et les convertir en tâches.

**Migration BDD** :
```sql
ALTER TABLE voice_transcriptions
  ADD COLUMN action_items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN tasks_auto_created boolean DEFAULT false;

ALTER TABLE tasks
  ADD COLUMN source_transcription_id uuid REFERENCES voice_transcriptions(id);
```

**Logique** :
- Edge function `process-voice-transcription` enrichie : extraction des action items via LLM
- Chaque item → tâche liée au lead/projet de la transcription
- Flag `tasks_auto_created = true` après création
- UI : Section "Actions détectées" avec toggle create/ignore par item

---

## 🟠 P1 — IMPORTANT (Effort: Moyen-Élevé, Impact: Opérationnel)

### P1.1 — Dashboard KPIs Temps Réel
**Objectif** : Panneau de KPIs business sur le dashboard cockpit.

**Nouveaux KPIs** :
| KPI | Source | Calcul |
|-----|--------|--------|
| Pipeline Value | opportunities | SUM(value_amount * probability/100) WHERE stage NOT IN ('closed_won','closed_lost') |
| Win Rate | opportunities | COUNT(won) / COUNT(won+lost) * 100 |
| Avg Deal Size | opportunities | AVG(value_amount) WHERE closed_won |
| Monthly Revenue | opportunities | SUM(value_amount) WHERE closed_won AND closed_at > month_start |
| Lead Response Time | leads + activity_log | AVG(first_activity - created_at) |
| Tasks Completion Rate | tasks | done / total * 100 sur 7j glissants |

**UI** :
- Row de 4-6 cards KPI en haut du dashboard
- Comparaison période précédente (↑↓ %)
- Sparkline 30 jours par KPI

**Pas de migration nécessaire** — calcul côté client depuis données existantes.

---

### P1.2 — Project Health Score Automatique
**Objectif** : Remplacer le health_status manuel par un score calculé.

**Migration BDD** :
```sql
ALTER TABLE projects
  ADD COLUMN health_score integer DEFAULT 100,
  ADD COLUMN health_factors jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN tasks_total integer DEFAULT 0,
  ADD COLUMN tasks_done integer DEFAULT 0;
```

**Règles de scoring** (score /100) :
- -20 si > 3 tâches overdue
- -15 si aucune activité depuis 7 jours
- -10 si budget consumed > 80% et avancement < 60%
- -25 si target_end_date dépassée
- -10 par alerte sentinel non résolue
- Mapping : ≥70 = on_track, 40-69 = at_risk, <40 = blocked

**Trigger** : Recalcul à chaque modification tâche/activity_log liée.

---

### P1.3 — BANT Scoring Structuré
**Objectif** : Qualifier les leads avec le framework BANT persisté.

**Migration BDD** :
```sql
ALTER TABLE leads
  ADD COLUMN bant_budget text CHECK (bant_budget IN ('identified','unknown','no_budget')),
  ADD COLUMN bant_authority text CHECK (bant_authority IN ('decision_maker','influencer','unknown')),
  ADD COLUMN bant_need text CHECK (bant_need IN ('critical','nice_to_have','no_need','unknown')),
  ADD COLUMN bant_timeline text CHECK (bant_timeline IN ('immediate','quarter','year','no_timeline','unknown')),
  ADD COLUMN bant_score integer GENERATED ALWAYS AS (
    (CASE bant_budget WHEN 'identified' THEN 25 WHEN 'unknown' THEN 10 ELSE 0 END) +
    (CASE bant_authority WHEN 'decision_maker' THEN 25 WHEN 'influencer' THEN 15 ELSE 0 END) +
    (CASE bant_need WHEN 'critical' THEN 25 WHEN 'nice_to_have' THEN 15 ELSE 0 END) +
    (CASE bant_timeline WHEN 'immediate' THEN 25 WHEN 'quarter' THEN 15 WHEN 'year' THEN 5 ELSE 0 END)
  ) STORED;
```

**UI** :
- 4 dropdowns sur fiche lead (section "Qualification BANT")
- Jauge BANT score /100
- Filtre leads par score BANT minimum
- Sentinel : alerte si lead score > 50 mais BANT < 30

---

### P1.4 — Pre-Meeting Brief Automatique
**Objectif** : Avant un RDV, générer un brief IA avec l'historique du lead.

**Logique** :
- Trigger sur bookings WHERE start_time BETWEEN now() AND now() + 2h
- Edge function `generate-pre-meeting-brief` :
  - Récupère : lead, opportunités, transcriptions précédentes, documents, tâches ouvertes
  - Génère : résumé contexte, points clés à aborder, risques identifiés, prochaines étapes suggérées
- Stockage dans `ai_agent_memory` (memory_type = 'pre_meeting_brief')
- Notification Telegram avec résumé

**Pas de migration** — utilise tables existantes.

---

## 🟡 P2 — AMÉLIORATION (Effort: Élevé, Impact: Stratégique)

### P2.1 — Commission Engine Partenaires
**Migration BDD** :
```sql
CREATE TABLE partner_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  partner_id uuid NOT NULL REFERENCES partners(id),
  opportunity_id uuid REFERENCES opportunities(id),
  project_id uuid REFERENCES projects(id),
  commission_type text NOT NULL CHECK (commission_type IN ('referral','collaboration','milestone')),
  amount numeric NOT NULL,
  rate numeric, -- taux appliqué
  base_amount numeric, -- montant de base
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','cancelled')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE partner_commissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE partners
  ADD COLUMN total_commission_earned numeric DEFAULT 0,
  ADD COLUMN deals_referred integer DEFAULT 0,
  ADD COLUMN deals_won integer DEFAULT 0;
```

**Fonctionnalités** :
- Calcul automatique commission quand opportunité → won
- Dashboard partenaire avec revenus, deals, performance
- Export comptable CSV

---

### P2.2 — Lookalike Scoring Viviers
**Objectif** : Scorer les 166K viviers par similarité avec les leads won.

**Logique** :
- Profiler les closed_won : industry, company_size, region, source
- Scoring viviers par matching multi-critères pondéré
- Edge function `score-viviers-batch` enrichie avec profil ICP

**Migration BDD** :
```sql
ALTER TABLE viviers
  ADD COLUMN lookalike_score integer DEFAULT 0,
  ADD COLUMN icp_match_details jsonb DEFAULT '{}'::jsonb;
```

---

### P2.3 — Forecast vs Target
**Migration BDD** :
```sql
CREATE TABLE sales_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  period_type text NOT NULL CHECK (period_type IN ('monthly','quarterly','yearly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  target_revenue numeric NOT NULL,
  target_deals integer,
  target_leads integer,
  actual_revenue numeric DEFAULT 0,
  actual_deals integer DEFAULT 0,
  actual_leads integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
```

**UI** :
- Jauge circulaire forecast/target sur dashboard
- Comparaison mensuelle (chart)
- Alerte si < 60% du target à mi-période

---

## 🟢 P3 — OPTIMISATION (Effort: Variable, Impact: Différenciant)

### P3.1 — Win Pattern Analysis
- Analyser les transcriptions des deals won vs lost
- Identifier les patterns gagnants (mots-clés, durée RDV, nb interactions)
- Edge function IA dédiée, résultats dans `ai_agent_memory`

### P3.2 — Agent Nicolas Proactif (Push Briefing)
- Notification Telegram avant chaque RDV (2h avant)
- Résumé quotidien personnalisé à 8h
- Suggestions d'actions basées sur stagnation pipeline

### P3.3 — Activity Timeline Unifiée
- Composant `<EntityTimeline>` réutilisable
- Agrège : activity_log + bookings + tasks + transcriptions + documents
- Vue chronologique inversée avec filtres par type
- Utilisable sur fiche Lead, Projet, Partenaire

### P3.4 — Smart Email Sequences
- Séquences de relance automatisées post-R1/R2
- Templates personnalisés par stage pipeline
- Tracking ouverture/clic intégré au CRM

### P3.5 — Nettoyage Index Viviers
- 30+ index sur viviers (166K rows) → audit de redondance
- Supprimer les index dupliqués (ex: idx_viviers_company vs idx_viviers_company_name vs idx_viviers_company_trgm)
- Économie stockage et performance INSERT

---

## 📋 RÉSUMÉ PRIORISATION

| Priorité | Items | Effort Total | Impact |
|----------|-------|-------------|--------|
| **P0** | 3 items | ~3-4 jours | Déblocage pipeline + productivité immédiate |
| **P1** | 4 items | ~5-7 jours | KPIs business + qualification structurée |
| **P2** | 3 items | ~5-8 jours | Monétisation partenaires + prospection intelligente |
| **P3** | 5 items | ~8-12 jours | Différenciation marché + automatisation avancée |

### Dépendances
- P0.1 (Pipeline Velocity) → P1.1 (Dashboard KPIs) → P2.3 (Forecast)
- P0.2 (Lead Temperature) → P1.3 (BANT) → P2.2 (Lookalike)
- P0.3 (Auto-tâches transcription) → P1.4 (Pre-meeting Brief)
- P1.2 (Health Score) est indépendant
- P2.1 (Commissions) est indépendant
