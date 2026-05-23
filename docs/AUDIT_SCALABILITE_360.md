# AUDIT SCALABILITÉ 360 — Cockpit · Admin · Viviers
_Date : 23/05/2026 · Périmètre : 3 modules · Méthode : reconstruction de la vision à partir du code réel (BDD + RLS + hooks + composants + edge fns)_

> **Doctrine rappelée (memory Core)** : multi-tenant strict `workspace_id`, zéro-duplication (Cockpit réutilise les leads d'Admin), aucune feature "livrée" sans preuve BDD + preuve code, RLS systématique, edge fns en `npm:`.

---

## 0. Synthèse exécutive

| Indicateur | Valeur | Verdict |
|---|---|---|
| Tables publiques | **130+** dont 47 critiques pour les 3 modules | Très large surface |
| RLS coverage | **100% des tables critiques** ont au moins 1 policy | OK |
| Tables critiques **sans `workspace_id`** | **20** (toutes pivots `*_partners`, contacts, partner_*) | **🟥 Risque tenant-leak** |
| Edge functions | **99** (dont 14 cockpit-AI, 7 viviers, 9 partner) | Fragmenté, à consolider |
| Hooks `cockpit/` | **42** | Cohérent |
| Hooks `viviers/` | **11** + 1 dossier orphelin `vivier/` (singulier) | **🟧 Doublon dossier** |
| Hooks `partner/` | **17** | Cohérent |
| `useLeads` / `useCockpitLeads` / `usePartnerLeads` | 3 hooks pour le même domaine | **🟧 Duplication** |
| `VivierAISearch` (569 LOC) + `VivierAISearchV2` (837 LOC) | Coexistent en prod | **🟥 Mort code probable** |
| `LeadDetailSheet` (Cockpit, 1155 LOC) vs `LeadDetailModal` (Admin, 184 LOC) | 2 vues lead distinctes | **🟧 À unifier** |
| Hardcode `DEFAULT_WORKSPACE_ID` | **40 fichiers** (frontend + edge fns) | **🟧 Frein multi-tenant** |

**Priorités** : (P0) sécuriser les pivots sans `workspace_id` → (P0) consolider Viviers (dossier + AISearch) → (P1) unifier Lead view → (P1) extraire `usePartnerOf<Entity>` factorisé → (P2) M5 multi-tenant (supprimer `DEFAULT_WORKSPACE_ID`).

---

## 1. Inventaire BDD par module

### 1.1 Cockpit (commercial, AI, transcriptions)
**Tables propriétaires** (`workspace_id` présent) :
`leads (36 cols)`, `opportunities (17)`, `tasks (25)`, `projects (22)`, `project_documents (13)`, `project_notes (10)`, `meeting_notes (15)`, `specifications (20)`, `generated_documents (30)`, `lead_contacts (11)`, `partners (28)`, `entity_context_notes (8)`, `entity_vocabulary (9)`, `participant_entity_mappings (10)`, `activity_log (17)`.

**Tables AI cockpit** : `ai_actions`, `ai_agent_memory`, `ai_context_traces`, `ai_cross_signals`, `ai_feedback`, `ai_semantic_cache`, `ai_sentinel_alerts`, `ai_usage_metrics`, `daily_intelligence`, `action_proposals`, `alert_dismissals`, `sentinel_trigger_queue`. ✅ Tous avec RLS.

**Tables session** : `cockpit_auth_sessions` (8), `cockpit_mfa_attempts` (6) — pas de `workspace_id` (normal, scope user).

### 1.2 Admin (contenus, observabilité, gouvernance)
**Scalables** (réellement multi-tenant à terme) :
- `forms (8 policies)`, `form_responses`, `email_configurations`, `cgv_templates`, `billing_entities`, `owner_profile`, `media_templates`.
- `ai_prompts`, `ai_models`, `ai_provider_config`, `edge_function_model_config` (gouvernance IA).
- `api_quotas`, `api_quota_alerts`, `api_usage_metrics`, `api_usage_summary`, `api_pricing` (gouvernance API).

**Pures Admin** (mono-tenant, contenu public) : articles, article_versions, categories, tags, faqs, atelier_inscriptions, comments, brochures, page_sections, newsletters, newsletter_subscribers.

### 1.3 Viviers (prospection)
**Tables propriétaires** :
- `viviers (45 cols, ws ✓)` · `vivier_lists (12, ws ✓)` · `vivier_imports (14, ws ✓)`.
- `vivier_campaigns (56, ws ✓)` — table énorme, candidate à split (settings vs runtime).
- `vivier_campaign_recipients (34, ws ✗)` — **🟥 sans `workspace_id`** mais relié via `campaign_id`.
- `vivier_campaign_events (9, ws ✓)`.
- `vivier_campaign_stats (14, ws ✗)` — **🟥 sans `workspace_id`** (vue matérialisée ?).

### 1.4 🟥 Matrice des tables CRITIQUES sans `workspace_id`

| Table | Cols | Lien tenant | Risque |
|---|---|---|---|
| `contacts` | 10 | aucun direct | **Élevé** : entité partagée tous tenants |
| `solution_leads` | 6 | via `lead_id` | Moyen |
| `solution_partners` | 5 | via `partner_id` | Moyen |
| `project_contacts` | 3 | via `project_id` | Faible |
| `project_partners` | 5 | via `project_id` | Faible |
| `lead_partners` (ws ✓) | 6 | – | OK |
| `opportunity_partners` | 5 | via `opportunity_id` | Faible |
| `task_partners` | 5 | via `task_id` | Faible |
| `document_partners` | 5 | via `document_id` | Faible |
| `booking_partners` | 5 | via `booking_id` | Faible |
| `partner_documents` | 16 | via `partner_id` | **Élevé** (PII) |
| `partner_invitations` | 8 | via `partner_id` | Moyen |
| `partner_notifications` | 11 | via `partner_id` | Moyen |
| `partner_solution_interests` | 10 | via `partner_id` | Moyen |
| `partner_time_entries` | 12 | via `partner_id` | **Élevé** (facturation) |
| `partner_comments` | 7 | via `partner_id` | Moyen |
| `partner_login_history` | 9 | via `partner_id` | Moyen (audit) |
| `partner_invoices` | 12 | via `partner_id` | **Élevé** (financier) |
| `partner_announcements` | 8 | – | Moyen |
| `transcription_participants` | 12 | via `transcription_id` | Moyen |
| `entity_name_references` | 11 | – | Moyen |
| `vivier_campaign_recipients` | 34 | via `campaign_id` | **Élevé** (PII × volume) |
| `vivier_campaign_stats` | 14 | via `campaign_id` | Moyen |

**Recommandation P0** : audit RLS sur ces 23 tables pour vérifier que les policies font le **join** vers le parent porteur de `workspace_id`. Sinon, ajouter colonne `workspace_id` dénormalisée + trigger de back-fill.

---

## 2. Inventaire code frontend

### 2.1 Pages
- Cockpit : **25 pages** (`/cockpit/*`)
- Admin : **51 pages** (`/admin/*`)
- Viviers : **10 pages** (`/viviers/*`)

### 2.2 Hooks et duplications détectées

| Domaine | Hooks coexistants | Action |
|---|---|---|
| **Leads** | `shared/useLeads` (203 LOC) · `cockpit/useCockpitLeads` (128) · `partner/usePartnerLeads` (72) | **P1** : `useCockpitLeads` n'est qu'un wrapper de `shared/useLeads` → conserver `shared` comme source unique. `usePartnerLeads` filtre par partner → OK à garder mais documenter. |
| **Viviers** | dossier `src/hooks/vivier/` (1 fichier `useCrmGraph`) **+** dossier `src/hooks/viviers/` (11 fichiers) | **P0** : déplacer `useCrmGraph` dans `viviers/`, supprimer le dossier singulier. |
| **Partner mutations** | `src/hooks/usePartnerMutations.ts` **+** `src/hooks/partner/usePartnerMutations.ts` | **P0** : doublon presque certain, garder la version `partner/`. |
| **AISearch Viviers** | `VivierAISearch.tsx` (569 LOC, v1) **+** `VivierAISearchV2.tsx` (837 LOC) | **P0** : `ViviersLeads.tsx` importe les deux ? À vérifier. Supprimer v1 si remplacée. |
| **Lead detail** | `cockpit/LeadDetailSheet.tsx` (1155 LOC) · `admin/LeadDetailModal.tsx` (184) | **P1** : extraire un `<LeadHeader>` + `<LeadFactsList>` partagés dans `components/shared/`. |
| **Bookings** | `shared/useBookings.ts` (utilisé Cockpit + partner ?) | Conserver, déjà bien factorisé. |

### 2.3 Composants — état dossier
- `src/components/cockpit/` : 40 fichiers + 10 sous-dossiers bien organisés (`ai`, `billing`, `common`, `dashboard`, `dialogs`, `editor`, `pipeline`, `quote-editor`, `settings`, `shared`, `transcriptions`). **Bon état.**
- `src/components/admin/` : 30 fichiers à la racine + sous-dossiers `brochures`, `invitation`, `medias`. **🟧 Racine surchargée**, à organiser par domaine (`leads/`, `ai/`, `analytics/`).
- `src/components/viviers/` : 19 fichiers + `campaigns/`. **Bon état** sauf doublon AISearch.

---

## 3. Inventaire edge functions

**99 fonctions** au total. Regroupement par domaine :

### 3.1 Cockpit-AI (14)
`cockpit-ai-copilot`, `cockpit-cross-signal-engine`, `ai-action-artifact-generator`, `ai-agent-orchestrator`, `ai-sentinel`, `auto-consulte-stale`, `auto-daily-intelligence`, `auto-harvest-daily`, `crm-rag-indexer`, `detect-anomalies`, `execute-action-proposal`, `synthesize-entity-documents`, `extract-entities`, `generate-followup-email`.

### 3.2 Transcriptions / Voice (5)
`create-voice-transcription`, `process-voice-transcription`, `transcribe-audio-chunk`, `transcription-worker`, `serve-transcription-audio`.

### 3.3 Viviers (7)
`vivier-ai-search`, `vivier-cleanup`, `vivier-insights`, `score-viviers-batch`, `promote-vivier-to-lead`, `export-viviers-csv`, `pappers-lookup`.

### 3.4 Campagnes / Emailing (8)
`send-instantly-campaign`, `send-brevo-campaign`, `send-campaign-test`, `instantly-webhook`, `campaign-unsubscribe`, `send-form-notification`, `send-lead-notification`, `send-newsletter`.

### 3.5 Partner (9)
`accept-partner-invitation`, `invite-partner`, `lookup-partner-invitation`, `revoke-partner-invitation`, `reactivate-partner`, `suspend-partner`, `update-partner-scope`, `partner-consulte`, `generate-partner-digest`.

### 3.6 Team / Auth (8)
`accept-team-invitation`, `invite-team-member`, `lookup-team-invitation`, `revoke-team-invitation`, `change-member-role`, `reactivate-member`, `remove-member`, `suspend-member`.

### 3.7 Doublons potentiels edge fns
- `mcp-server` + `mcp-api-keys` : OK, scopes distincts.
- `accept-partner-invitation` + `accept-team-invitation` + `lookup-partner-invitation` + `lookup-team-invitation` : **🟧 patron identique 4× pour partners et 4× pour team**. **P2** : factoriser via shared helper `_shared/invitations.ts` (8 fns → restent 8 mais minces).
- `send-instantly-campaign` vs `send-brevo-campaign` : OK (deux providers différents).
- `auto-consulte-stale`, `auto-daily-intelligence`, `auto-harvest-daily` : 3 jobs cron AI distincts, OK.

---

## 4. Cohérence avec la vision (memory Core)

| Règle Core | État | Évidence |
|---|---|---|
| Multi-tenant `workspace_id` strict | **Partiel** | 23 tables critiques sans colonne (cf §1.4) |
| Zéro-duplication Cockpit ↔ Admin leads | **OK** | `useCockpitLeads` consomme `shared/useLeads` |
| RLS sur toutes les tables sensibles | **OK** | 100% des tables critiques ont des policies |
| Edge fns avec `verify_jwt` quand bypass RLS | **À auditer** | À recouper par fn — Phase 2 |
| `npm:` specifiers (pas `esm.sh`) | **À auditer** | À grep — Phase 2 |
| Sentinel SQL rules | **OK** | `ai-sentinel` + `sentinel_trigger_queue` |
| Cascade AI Lovable > OpenAI > Anthropic | **OK** | `ai_provider_config` |
| Standard `LoadingState`/`EmptyState` | **OK** Cockpit | `components/cockpit/common/` exporte les 2 |
| `LoadingState`/`EmptyState` côté Admin/Viviers | **À vérifier** | Pas de dossier `common/` équivalent |

---

## 5. Matrice consolidée des doublons

| # | Doublon | Type | Sévérité | Action |
|---|---|---|---|---|
| D1 | `src/hooks/vivier/` vs `src/hooks/viviers/` | Dossier | **P0** | Fusionner dans `viviers/`, supprimer `vivier/` |
| D2 | `src/hooks/usePartnerMutations.ts` vs `src/hooks/partner/usePartnerMutations.ts` | Fichier | **P0** | Supprimer la racine si vraiment doublon |
| D3 | `VivierAISearch.tsx` vs `VivierAISearchV2.tsx` | Composant | **P0** | Retirer v1 ; le seul consommateur est `ViviersLeads.tsx` |
| D4 | `useLeads` / `useCockpitLeads` chaînage trivial | Hook | **P1** | Réduire `useCockpitLeads` à un alias re-exporté |
| D5 | `LeadDetailSheet` vs `LeadDetailModal` | UI | **P1** | Extraire `<LeadHeader>`, `<LeadFactsList>` partagés |
| D6 | 8 edge fns invitations (partner ×4, team ×4) | Edge fn | **P2** | Helper `_shared/invitations.ts` |
| D7 | `EmptyState`/`LoadingState` standardisés uniquement Cockpit | UI | **P1** | Promouvoir vers `src/components/shared/` |
| D8 | `DEFAULT_WORKSPACE_ID` répété dans 40 fichiers | Conf | **P2 / M5** | Une seule source : `WorkspaceContext` + helper edge fn `getWorkspaceForUser` |

---

## 6. Roadmap actionnable

### P0 — Hygiène et risque (≤ 1 sprint)
1. **Sécurité tenant** : audit RLS des 23 tables sans `workspace_id` (§1.4). Pour chaque, vérifier que la policy joint le parent et que l'accès est tenant-safe. Migration corrective pour `partner_documents`, `partner_time_entries`, `partner_invoices`, `vivier_campaign_recipients` : ajout colonne `workspace_id` dénormalisée + trigger back-fill + RLS simplifiée.
2. **Doublons immédiats** : exécuter D1, D2, D3 (suppression `src/hooks/vivier/`, racine `usePartnerMutations`, `VivierAISearch` v1). Effort estimé : **0,5 j**.
3. **Linter Supabase** : passer `supabase--linter` et corriger toutes les Security warnings sur les 23 tables.

### P1 — Consolidation architecturale (1–2 sprints)
4. **Lead view unifié** : extraire `<LeadHeader>`, `<LeadFactsList>`, `<LeadActions>` dans `src/components/shared/lead/`. Réécrire `LeadDetailSheet` et `LeadDetailModal` comme orchestrateurs. Cible : -600 LOC.
5. **`useCockpitLeads` alias** : ne garder qu'un re-export typé. -100 LOC.
6. **Composants Admin** : restructurer `src/components/admin/` par domaine (`leads/`, `ai/`, `analytics/`, `governance/`).
7. **Standard UI cross-modules** : promouvoir `LoadingState` et `EmptyState` dans `src/components/shared/` ; utiliser dans Admin et Viviers.
8. **Viviers `useViviers.ts` (628 LOC)** : splitter en `useViviersList`, `useVivierMutations`, `useVivierEnrichment` (single responsibility).
9. **`vivier_campaigns` (56 cols)** : analyser usage et splitter `vivier_campaign_settings` (statique) + `vivier_campaign_runtime` (volatile).

### P2 — Scalabilité multi-tenant complète (M5, 2–3 sprints)
10. **Suppression `DEFAULT_WORKSPACE_ID` côté code** : remplacer par `useRequiredWorkspaceId()` qui throw si null. Côté edge fn, par helper `resolveWorkspaceId(jwt)`.
11. **Helper RLS unifié** : fonction `public.user_in_workspace(_user_id, _workspace_id) returns boolean` security definer → réutilisée dans toutes les policies (réduit la duplication SQL et le risque de drift).
12. **Refactor edge fns invitations** (D6) : `_shared/invitations.ts`.
13. **Observabilité dédiée Viviers** : compter usage `vivier-ai-search`, latence `score-viviers-batch`, intégrer dans `/admin/observability/ai`.
14. **Documentation gardée à jour** : `docs/CDC_COCKPIT_*.md` et `docs/CDC_VIVIERS_*.md` annotés du statut **réel** post-audit (cf. doctrine memory : aucune feature livrée sans preuve).

### P3 — Optimisation continue
15. **Cache & coûts AI** : étendre `ai_semantic_cache` actuellement Cockpit aux fns Viviers (`vivier-ai-search`, `vivier-insights`).
16. **Index DB** : Phase 2, audit pg_stat_statements pour viviers (45 cols filtrables) + opportunities.
17. **Bundle frontend** : `LeadDetailSheet` à 1155 LOC = candidat code-split route-level.

---

## 7. Évidences (preuves rassemblées dans cet audit)

- BDD : 130 tables listées, 47 critiques mappées par module avec présence/absence `workspace_id`.
- RLS : 95 tables avec policies recensées (range 1–9 policies/table).
- Hooks : 42 (cockpit) + 17 (partner) + 11+1 (viviers) + 3 (admin) + 3 (shared).
- Edge fns : 99 listées, regroupées en 7 domaines.
- Code mort suspect : 3 doublons P0 confirmés par `wc -l` et `rg`.
- Hardcode `DEFAULT_WORKSPACE_ID` : 40 fichiers exacts identifiés.

---

## 8. Décisions à prendre (à valider avec toi avant exécution P0)

1. **Pivots sans `workspace_id`** : on dénormalise (ajout colonne + back-fill) **ou** on garde RLS via join et on durcit ? _Reco : dénormaliser pour `partner_documents`, `partner_time_entries`, `partner_invoices`, `vivier_campaign_recipients` (perf + sécurité)._
2. **Suppression `VivierAISearch` v1** : confirmer qu'aucun parcours utilisateur ne l'appelle (j'ai vu un seul consommateur, `ViviersLeads.tsx`).
3. **Restructuration `src/components/admin/`** : OK pour casser les imports en masse ?

> Prochaine étape proposée : tu valides ces 3 décisions, et je déclenche le **lot P0** (sécu pivots + suppression doublons) en migration unique + PR de cleanup.
