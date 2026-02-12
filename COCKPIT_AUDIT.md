# COCKPIT AUDIT — Inventaire Backend Complet

> Audit réalisé avant la refonte UI du Cockpit.  
> Objectif : documenter **tout** ce que le backend expose pour ne rien sous-exploiter.

---

## 1. AI Agent Orchestrator (`ai-agent-orchestrator`)

**Fichier** : `supabase/functions/ai-agent-orchestrator/index.ts` (9656 lignes)  
**Format de réponse** : `{ content: string, usage: { input_tokens, output_tokens, total_tokens }, tool_calls: [...], action_proposals: [...] }`

### 1.1 Mémoire Persistante

| Composant | Description |
|-----------|-------------|
| `saveMemory()` | Sauvegarde en `ai_agent_memory` avec embedding vectoriel (text-embedding-3-small) |
| `getRecentMemory()` | RPC `get_recent_ai_memory` — récupère par workspace/user/session |
| `searchMemory()` | RPC `search_ai_memory` — recherche sémantique (seuil 0.65) |
| `logDecision()` | Post-processing automatique : enregistre chaque write tool exécuté |

**Types de mémoire** : `conversation`, `action`, `rag_query`, `tool_call`, `insight`, `preference`, `context`

### 1.2 Liste complète des 80+ Tools

#### COCKPIT — Lecture (READ)

| # | Tool | Description | Paramètres clés |
|---|------|-------------|-----------------|
| 1 | `get_leads` | Liste leads avec filtrage | query, status, source, limit |
| 2 | `search_leads` | Recherche lead spécifique | query (requis) |
| 3 | `search_fuzzy` | Recherche floue multi-entités | query, entity_types[] |
| 4 | `get_opportunities` | Pipeline commercial | stage, min_value, limit |
| 5 | `get_projects` | Projets en cours | query, status, health_status, limit |
| 6 | `search_projects` | Recherche projet spécifique | query (requis) |
| 7 | `get_tasks` | Tâches avec filtres | status, priority, overdue_only, limit |
| 8 | `get_transcriptions` | Transcriptions vocales + analyses | lead_id, project_id, limit |
| 9 | `get_meeting_notes` | Comptes-rendus de réunion | booking_id, project_id, opportunity_id, limit |
| 10 | `get_specifications` | Cahiers des charges | project_id, status, limit |
| 11 | `get_generated_documents` | Devis, CDC, propositions | document_type, status, lead_id, project_id |
| 12 | `get_solution_leads` | Leads × solutions | solution_id, lead_id, interest_level |
| 13 | `get_activity_log` | Journal d'activités | entity_type, entity_id, activity_type, limit |
| 14 | `get_pipeline_stats` | Stats pipeline agrégées | (aucun) |
| 15 | `get_pending_ai_notifications` | Entrées non revues par l'IA | limit, entity_type |
| 16 | `get_bookings` | RDV planifiés | status, meeting_type, upcoming_only, dates |
| 17 | `get_booking_details` | Détails complet d'un RDV | booking_id (requis) |
| 18 | `get_agenda_summary` | Résumé agenda par période | period (today/week/month) |
| 19 | `get_partners` | Liste partenaires | partner_type, is_active, limit |
| 20 | `search_partners` | Recherche partenaire | query (requis) |
| 21 | `search_solutions` | Recherche solution IArche | query (requis) |
| 22 | `search_documents` | Recherche documents | query, document_type |
| 23 | `search_transcriptions` | Recherche transcriptions | query (requis) |
| 24 | `search_specifications` | Recherche CDC | query (requis) |
| 25 | `get_lead_familiarity` | Score familiarité lead | lead_id (requis) |
| 26 | `get_entity_references` | Références croisées | entity_type, entity_id (requis) |
| 27 | `get_stale_syntheses` | Entités synthèse obsolète | max_items |
| 28 | `get_ai_dashboard_metrics` | Métriques système IA | (aucun) |
| 29 | `get_viviers` | Prospects froids | query, source, min/max_score, promoted |
| 30 | `search_viviers` | Recherche vivier | query (requis) |
| 31 | `get_vivier_campaigns` | Campagnes email cold | status, limit |
| 32 | `get_email_domains` | Domaines email configurés | provider, domain_type |
| 33 | `get_email_logs` | Logs envoi emails | email_type, status, recipient_email |
| 34 | `get_audit_logs` | Logs audit admin | action_type, resource_type, user_email |
| 35 | `get_rag_status` | Statut indexation RAG | resource_type, stale_only |
| 36 | `get_email_drafts` | Brouillons email IA | lead_id, status, limit |
| 37 | `get_stale_entities` | Entités synthèse obsolète | entity_type, limit |
| 38 | `get_calendar_availability` | Créneaux disponibles | start_date, end_date, duration_minutes |
| 39 | `get_telegram_stats` | Stats bot Telegram | period |
| 40 | `get_security_logs` | Logs connexion | email, success/failed_only |
| 41 | `get_performance_metrics` | Lighthouse/CWV | environment, limit |
| 42 | `detect_security_anomalies` | Anomalies sécurité | period_hours |
| 43 | `detect_missing_fields` | Champs critiques manquants | entity_type, entity_id (requis) |

#### ADMIN — Lecture (READ)

| # | Tool | Description |
|---|------|-------------|
| 44 | `get_articles` | Articles/contenus publiés |
| 45 | `get_article_details` | Contenu complet d'un article |
| 46 | `get_solutions` | Solutions IArche |
| 47 | `get_categories_tags` | Catégories et tags |
| 48 | `get_contacts` | Messages de contact |
| 49 | `get_newsletters` | Newsletters + stats abonnés |
| 50 | `get_forms` | Formulaires + stats |
| 51 | `get_form_responses` | Réponses formulaire |
| 52 | `get_brochures` | Brochures marketing |
| 53 | `get_atelier_inscriptions` | Inscriptions ateliers |
| 54 | `get_comments` | Commentaires articles |
| 55 | `get_cta_analytics` | Stats CTA |
| 56 | `search_knowledge_base` | Recherche sémantique RAG |

#### COCKPIT — Écriture (WRITE)

| # | Tool | Description |
|---|------|-------------|
| 57 | `create_task` | Crée tâche de suivi |
| 58 | `update_task` | Met à jour tâche |
| 59 | `complete_task` | Marque tâche terminée |
| 60 | `snooze_task` | Reporte tâche |
| 61 | `delete_task` | Supprime tâche |
| 62 | `create_meeting_note` | Crée compte-rendu |
| 63 | `update_meeting_note` | Met à jour CR |
| 64 | `delete_meeting_note` | Supprime CR |
| 65 | `update_lead_qualification` | Change qualification lead |
| 66 | `update_opportunity_stage` | Change stage opportunité |
| 67 | `draft_followup_email` | Génère email de suivi |
| 68 | `suggest_solutions_for_lead` | Analyse besoins → solutions |
| 69 | `suggest_booking_action` | Suggère action RDV |
| 70 | `log_activity` | Enregistre activité journal |
| 71 | `create_booking` | Crée RDV complet (Zoom + Google Cal + emails) |
| 72 | `create_lead` | Crée lead CRM |
| 73 | `update_lead` | Met à jour lead |
| 74 | `update_lead_score` | Score lead manuel |
| 75 | `update_lead_familiarity` | Recalcule familiarité |
| 76 | `delete_lead` | Supprime lead (cascade) |
| 77 | `send_email` | Envoie email via Resend |
| 78 | `cancel_booking` | Annule RDV |
| 79 | `reschedule_booking` | Replanifie RDV |
| 80 | `create_opportunity` | Crée opportunité pipeline |
| 81 | `update_opportunity` | Met à jour opportunité |
| 82 | `delete_opportunity` | Supprime opportunité |
| 83 | `create_project` | Crée projet |
| 84 | `update_project` | Met à jour projet |
| 85 | `delete_project` | Supprime projet (cascade) |
| 86 | `create_partner` | Crée partenaire |
| 87 | `update_partner` | Met à jour partenaire |
| 88 | `delete_partner` | Supprime partenaire |
| 89 | `link_solution_to_lead` | Associe solution ↔ lead |
| 90 | `create_specification` | Crée CDC |
| 91 | `update_specification` | Met à jour CDC |
| 92 | `approve_specification` | Approuve CDC |
| 93 | `create_document` | Crée document manuellement |
| 94 | `update_document` | Met à jour document |
| 95 | `approve_document` | Approuve document |
| 96 | `generate_document` | Génère document via IA |
| 97 | `create_transcription` | Crée transcription manuelle |
| 98 | `update_transcription` | Met à jour transcription |
| 99 | `create_entity_reference` | Crée référence croisée |
| 100 | `mark_notifications_reviewed` | Marque notifs lues |
| 101 | `trigger_proactive_notification` | Notification Telegram |
| 102 | `create_lead_contact` | Contact secondaire lead |
| 103 | `update_lead_contact` | Met à jour contact |
| 104 | `delete_lead_contact` | Supprime contact |
| 105 | `set_primary_lead_contact` | Contact principal |
| 106 | `create_project_note` | Note projet |
| 107 | `update_project_note` | Met à jour note projet |
| 108 | `delete_project_note` | Supprime note projet |
| 109 | `create_context_note` | Note de contexte (enrichit Consulte) |
| 110 | `update_context_note` | Met à jour note contexte |
| 111 | `delete_context_note` | Supprime note contexte |
| 112 | `convert_lead_to_partner` | Lead → partenaire |
| 113 | `refresh_entity_synthesis` | Régénère synthèse Consulte 360° |
| 114 | `bulk_refresh_syntheses` | Batch régénération synthèses |
| 115 | `trigger_embedding_refresh` | Réindexation RAG |

#### ADMIN — Écriture (WRITE)

| # | Tool | Description |
|---|------|-------------|
| 116 | `draft_article_content` | Brouillon article IA |
| 117 | `suggest_article_improvements` | Améliorations SEO/structure |
| 118 | `draft_newsletter` | Brouillon newsletter |
| 119 | `create_article` | Crée article |
| 120 | `update_article` | Met à jour article |
| 121 | `delete_article` | Supprime article |
| 122 | `generate_article_ai` | Génère article complet IA |
| 123 | `enrich_seo` / `enrich_content_seo` | Enrichissement SEO |
| 124 | `generate_faq` / `generate_article_faq` | Génère FAQ |
| 125 | `suggest_tags` / `suggest_article_tags` | Suggère tags |
| 126 | `send_newsletter` | Envoie newsletter |
| 127 | `create_brochure` | Crée brochure |
| 128 | `update_brochure` | Met à jour brochure |
| 129 | `delete_brochure` | Supprime brochure |
| 130 | `create_form` | Crée formulaire |
| 131 | `update_form` | Met à jour formulaire |
| 132 | `delete_form` | Supprime formulaire |
| 133 | `approve_comment` | Approuve commentaire |
| 134 | `reject_comment` | Rejette commentaire |
| 135 | `create_solution` | Crée solution IArche |

#### VIVIERS (Cold Leads)

| # | Tool | Description |
|---|------|-------------|
| 136 | `score_viviers` | Scoring IA des viviers |
| 137 | `promote_viviers_to_leads` | Promeut vivier → lead |
| 138 | `create_vivier_campaign` | Crée campagne cold email |
| 139 | `preview_campaign_email` | Prévisualise email campagne |
| 140 | `launch_vivier_campaign` | Lance campagne (irréversible) |
| 141 | `clean_viviers` | Nettoie doublons/invalides |

#### OUTILS SYSTÈME

| # | Tool | Description |
|---|------|-------------|
| 142 | `sync_google_calendar` | Sync Google Calendar |
| 143 | `create_backup` | Backup BDD |
| 144 | `send_followup_email` | Email relance (preview/send) |
| 145 | `send_email_draft` | Envoie brouillon email |
| 146 | `cleanup_old_drafts` | Nettoie brouillons expirés |
| 147 | `lookup_company` | Recherche Pappers (SIRET/nom) |

#### PHASE 1 — Mémoire Enrichissement

| # | Tool | Description |
|---|------|-------------|
| 148 | `save_user_preference` | Sauvegarde préférence utilisateur (importance 0.8) |
| 149 | `save_context_insight` | Sauvegarde insight contextuel (expire 30j) |

#### PHASE 2 — Interview Mode

| # | Tool | Description |
|---|------|-------------|
| 150 | `detect_missing_fields` | Détecte champs critiques manquants |

---

## 2. Cockpit AI Copilot (`cockpit-ai-copilot`)

**Fichier** : `supabase/functions/cockpit-ai-copilot/index.ts` (1844 lignes)  
**Endpoint** : `supabase.functions.invoke('cockpit-ai-copilot', { body: { mode, workspaceId, entityType, entityId } })`

### 2.1 Les 12 Modes

| # | Mode | Retour | Données CRM consultées |
|---|------|--------|------------------------|
| 1 | `suggest-tasks` | `{ suggestions: TaskSuggestion[] }` | Entité spécifique ou contexte global (leads, opps, tasks, transcriptions) |
| 2 | `detect-inactivity` | `{ alerts: InactivityAlert[], total }` | leads, opportunities, projects (seuils: 7j/5j/10j) |
| 3 | `health-check` | `{ projects: ProjectHealthCheck[], summary: { on_track, at_risk, off_track } }` | projects, tasks (auto-update health_status) |
| 4 | `morning-brief` | `{ brief: string (Markdown), data: MorningBriefData }` | tasks, bookings, leads, opportunities, partners, activity_log + modes 2,3,7 intégrés |
| 5 | `next-step` | `{ suggestion: NextStepSuggestion, opportunity }` | opportunity + lead + tasks + activity_log + context-maximizer (40K tokens) |
| 6 | `meeting-prep` | `{ briefing: MeetingBriefing, booking }` | booking + lead + previous bookings + specifications + context-maximizer (50K tokens) |
| 7 | `opportunity-score` | `{ scores: OpportunityScoreItem[], summary }` | opportunities + leads + tasks + activity_log (scoring algorithmique) |
| 8 | `win-loss-analysis` | `{ analysis, stats: { won, lost, win_rate } }` | opportunities (closed, 6 mois) + activity_log + tasks + meeting_notes |
| 9 | `deadline-cascade` | `{ cascade, project, stats }` | project + tasks + specifications + opportunities liées |
| 10 | `harvest` | `{ groups: HarvestGroup[], current_interview, total }` | tasks (ai_generated, overdue) groupées par entité |
| 11 | `harvest-respond` | `{ processed, action, new_tasks, message }` | tasks + entity_context_notes + cascade staleness |
| 12 | `intelligence` | `{ intelligence: IntelligencePayload, raw: IntelligenceRawData }` | **TOUT** : leads, opps, projects, tasks, bookings, activity, transcriptions, partners + modes 2,3,7 + LLM narratif |

### 2.2 Format IntelligencePayload (mode `intelligence`)

```typescript
{
  top_actions: IntelligenceAction[];     // Actions prioritaires avec urgency
  cross_signals: CrossSignal[];          // Corrélations multi-entités
  predictions: Prediction[];             // Prédictions confidence + timeframe
  health_overview: HealthOverview;       // Score global + momentum pipeline
  narrative_brief: string;               // Brief Markdown narratif
  stale_synthesis_impact: string;        // Impact synthèses obsolètes
  generated_at: string;
}
```

---

## 3. AI Sentinel (`ai-sentinel`)

**Fichier** : `supabase/functions/ai-sentinel/index.ts`

### 3.1 Fonctionnement

- **Invocation** : `supabase.functions.invoke('ai-sentinel')` (pas de table dédiée — résultats calculés à la volée)
- **Polling** : toutes les 5 minutes via `useAISentinel` hook
- **Trigger événementiel** : table `sentinel_trigger_queue` avec debounce 30s (triggers PostgreSQL via `pg_net`)

### 3.2 Structure des alertes

```typescript
interface SentinelAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'incomplete' | 'inconsistency' | 'inactivity';
  entity_type: string;
  entity_id: string;
  entity_name: string;
  question: string;   // Question à poser à l'utilisateur
  detail: string;     // Détail du problème
}
```

### 3.3 Catégories d'alertes

| Catégorie | Description | Exemples |
|-----------|-------------|----------|
| `incomplete` | Données critiques manquantes | Lead sans email, projet sans budget |
| `inconsistency` | Incohérence détectée | Opportunité "won" sans projet, lead qualifié score < 20 |
| `inactivity` | Stagnation détectée | Lead inactif 14j+, opportunité stagné 10j+ |

---

## 4. Action Proposals (`action_proposals`)

### 4.1 Table Schema

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | PK |
| `workspace_id` | UUID | FK workspaces |
| `user_id` | UUID | Créateur (nullable) |
| `status` | string | `pending` → `validated` → `executed` / `rejected` |
| `action_type` | string | Type d'action (voir ci-dessous) |
| `action_label` | string | Libellé humain |
| `action_payload` | JSONB | Données de l'action |
| `ai_reasoning` | string | Raisonnement de l'IA |
| `validation_notes` | string | Notes de validation |
| `executed_at` | timestamp | Date d'exécution |
| `executed_result` | JSONB | Résultat d'exécution |
| `telegram_notified` | boolean | Boutons Telegram envoyés |

### 4.2 Flow complet

```
Orchestrator propose action
        ↓
INSERT action_proposals (status: 'pending')
        ↓
    ┌─────────────────┐
    │   VALIDATION     │
    │  Web (Dashboard) │───→ execute-action-proposal
    │  Telegram (Bot)  │───→ execute-action-proposal
    └─────────────────┘
        ↓
status: 'executed' + executed_at + executed_result
        ↓
activity_log INSERT (traçabilité)
```

### 4.3 Action Types supportés

| action_type | Description | Payload clés |
|-------------|-------------|--------------|
| `create_task` | Crée une tâche | title, description, priority, lead_id, project_id |
| `update_lead` | Met à jour un lead | lead_id, champs safe (email, phone, company, etc.) |
| `create_note` | Crée une note dans activity_log | entity_type, entity_id, title, content |
| `schedule_meeting` | Crée un booking | name, email, start_time, duration_minutes, meeting_type |
| `send_email` | Envoie un email via Resend | to, subject, body, from |

### 4.4 Edge function `execute-action-proposal`

- **Auth** : supporte user token ET service_role (Telegram)
- **Statuts acceptés** : `pending` (web) et `validated` (Telegram pré-validé)
- **Post-exécution** : update status → `executed`, log activity_log

---

## 5. Tables de données consultées par le Cockpit

### 5.1 Tables CRM principales

| Table | Colonnes clés cockpit | Relations |
|-------|----------------------|-----------|
| `leads` | id, name, email, company, phone, source, lead_score, qualification_status, ai_documents_summary, synthesis_stale | → opportunities, tasks, bookings, activity_log |
| `opportunities` | id, title, stage, value_amount, probability, expected_close_date, lead_id, project_id | → leads, projects |
| `projects` | id, name, status, health_status, budget_amount, consumed_amount, planned_end_date, lead_id | → leads, tasks, specifications |
| `tasks` | id, title, status, priority, due_date, due_time, task_type, entity_type, entity_id, ai_generated, lead_id, project_id, opportunity_id | → leads, projects, opportunities |
| `bookings` | id, name, email, company, start_time, end_time, status, meeting_type, lead_id, booking_type_id, google_event_id, zoom_join_url | → leads, booking_types |
| `meeting_notes` | id, booking_id, project_id, opportunity_id, notes, objectives, next_steps, action_items, ai_summary | → bookings, projects, opportunities |
| `voice_transcriptions` | id, title, transcript_text, transcript_summary, detected_needs, action_items, lead_id, project_id, status, ai_summary | → leads, projects |
| `activity_log` | id, entity_type, entity_id, activity_type, title, content, is_ai_generated, created_at, workspace_id | → leads, projects, opportunities, tasks |
| `partners` | id, name, email, company, partner_type, expertise, ai_documents_summary, is_active | → booking_partners, document_partners |

### 5.2 Tables IA

| Table | Description | Entrées |
|-------|-------------|---------|
| `ai_agent_memory` | Mémoire persistante IA | 619+ |
| `action_proposals` | Propositions d'actions IA | Variable |
| `entity_context_notes` | Notes de contexte (enrichissent Consulte) | Variable |
| `entity_name_references` | Références croisées entre entités | Variable |
| `ai_feedback` | Feedback utilisateur sur l'IA | Variable |

### 5.3 Tables système

| Table | Description |
|-------|-------------|
| `ai_usage_metrics` | Tokens consommés par opération |
| `api_usage_metrics` | Usage APIs externes |
| `api_quotas` | Limites et alertes quotas |
| `email_logs` | Historique envois email |
| `admin_audit_logs` | Audit admin |

---

## 6. Hooks Frontend existants

| Hook | Source | Usage actuel |
|------|--------|-------------|
| `useCockpitIntelligence` | cockpit-ai-copilot mode `intelligence` | Dashboard principal (score, brief, actions) |
| `useCockpitAICopilot` | cockpit-ai-copilot (12 modes) | Boutons d'action IA dans le dashboard |
| `useAISentinel` | ai-sentinel | Notifications bell dans le header |
| `useActionProposals` | Table action_proposals | Liste proposals dans le dashboard |
| `useDashboardRealtime` | Supabase realtime | Auto-invalidation caches (tasks, opps, bookings, leads, activity, meeting_notes) |
| `useCockpitLeads` | Table leads | Stats + liste leads |
| `useCockpitOpportunities` | Table opportunities | Stats + pipeline |
| `useCockpitTasks` | Table tasks | Stats + liste tâches |
| `useCockpitBookings` | Table bookings | Today + upcoming |
| `useCockpitActivityLog` | Table activity_log | Timeline activité |
| `useCockpitProjects` | Table projects | Liste projets |
| `useCockpitMeetingNotes` | Table meeting_notes | Stats + liste |
| `useCockpitPartners` | Table partners | Liste partenaires |
| `useAutoConsulte` | auto-consulte-stale | Batch re-synthèse |
| `useEntityCompleteness` | Calcul local | Score complétion entité |
| `useEntityContextNotes` | Table entity_context_notes | Notes contexte par entité |

---

## 7. Pages Cockpit existantes

| Page | Route | Contenu |
|------|-------|---------|
| CockpitDashboard | `/cockpit` | Dashboard principal (1189 lignes) |
| CockpitLeads | `/cockpit/leads` | Liste leads |
| CockpitLeadDetail | `/cockpit/leads/:id` | Détail lead |
| CockpitPipeline | `/cockpit/pipeline` | Pipeline opportunités |
| CockpitProjects | `/cockpit/projects` | Liste projets |
| CockpitProjectDetail | `/cockpit/projects/:id` | Détail projet |
| CockpitAgenda | `/cockpit/agenda` | Calendrier RDV |
| CockpitDocuments | `/cockpit/documents` | Documents générés |
| CockpitTranscriptions | `/cockpit/transcriptions` | Transcriptions vocales |
| CockpitPartenaires | `/cockpit/partenaires` | Liste partenaires |
| CockpitUploads | `/cockpit/uploads` | Fichiers uploadés |
| CockpitImports | `/cockpit/imports` | Imports Telegram |
| CockpitAnalytics | `/cockpit/analytics` | Analytics IA |
| CockpitChatbot | `/cockpit/chatbot` | Chatbot IA |
| CockpitSettings | `/cockpit/settings` | Paramètres |
| CockpitSolutions | `/cockpit/solutions` | Solutions IArche |

---

## 8. Capacités sous-exploitées (Gap Analysis)

### 8.1 Backend puissant → UI absente

| Capacité backend | État UI actuel | Potentiel |
|-----------------|----------------|-----------|
| `morning-brief` mode (récit IA enrichi) | Brief condensé dans une bande | Bloc premier-plan au début de journée |
| `meeting-prep` mode | Non accessible depuis le dashboard | Card proactive 30min avant RDV |
| `next-step` suggestions | Non visible dans le feed | Suggestions actionnables par opportunité |
| `win-loss-analysis` | Pas exposé | Insights dans analytics/sidebar |
| `deadline-cascade` | Pas exposé | Alerte projet avec actions de reschedule |
| `detect-inactivity` alerts | Intégré dans intelligence mais pas actionnable | Cards avec actions directes |
| `opportunity-score` scoring | Chiffre dans le header | Badges visuels sur chaque opportunité |
| `action_proposals` validation | Liste basique | Feed central avec ✅/❌ et animations |
| AI Sentinel alerts | Bell notification uniquement | Feed prioritaire avec navigation |
| `detect_missing_fields` | Non exposé | Sidebar contextuelle "compléter les infos" |
| `save_user_preference` | Automatique (invisible) | Pourrait afficher "préférences mémorisées" |
| `get_calendar_availability` | Non exposé | Intégrable dans proposals de RDV |
| Realtime subscriptions | 6 tables | Manque action_proposals + ai_sentinel_alerts |

### 8.2 Données accessibles non affichées

- **Partners** : jamais dans le dashboard (seulement page dédiée)
- **Transcriptions récentes** : card petite, pas de lien avec actions
- **Scoring prédictif** : pas de visualisation par opportunité
- **Stale syntheses** : bouton technique, pas intégré naturellement
- **Email drafts** : sheet séparé, pas dans le feed

---

## 9. Recommandations pour la refonte

1. **Feed IA central** : Agréger action_proposals + sentinel alerts + copilot suggestions + activity_log dans un flux unique trié par priorité
2. **Sidebar contextuelle** : Au clic sur un élément du feed → détail entité + missing fields + actions rapides
3. **Header enrichi** : Score santé (health-check) + Pipeline (stats) + Tokens (usage) en sticky
4. **Morning brief** : Bloc proéminent 1x/jour au premier accès
5. **Meeting prep cards** : Event-driven 30min avant un booking
6. **Realtime** : Ajouter subscriptions sur `action_proposals` et alertes sentinel
7. **Tout actionnable** : Chaque card doit avoir au minimum un bouton d'action
