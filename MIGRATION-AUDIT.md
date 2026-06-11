# Audit pré-migration — Lovable Cloud → Supabase autonome

> **Projet** : iarche-lovable-vision (Cockpit IArche + site public + viviers + portail partenaires)
> **Projet Supabase actuel** : `mgjyhlyrwnnioctkbdkk`
> **Projet Lovable** : `a5f779c9-f157-4e6c-bb3b-1043b687082d`
> **Date audit** : 2026-06-11 · Lecture seule, aucune modification effectuée.

---

## TL;DR

| Indicateur | Valeur |
|---|---|
| Migrations SQL | **364** (du 2025-11-28 au 2026-06-05) |
| Tables | **~146** |
| Edge functions | **103** (+ `_shared/`) |
| Policies RLS | **~656** sur **~150** tables |
| Fonctions SQL/plpgsql | **~178** |
| Triggers | **~134** · Vues : **9** |
| Cron jobs (pg_cron) | **8** |
| Storage buckets | **9** |
| Extensions Postgres | **5** (vector, pg_cron, pg_net, pgcrypto, pg_trgm) |
| Secrets / clés env edge | **~22 externes** + Supabase |
| Services tiers intégrés | **14** |
| Build front | **1 seul SPA** (Vite) |

**Verdict global** : migration **lourde mais faisable**. Le gros du risque ≠ le schéma (363 migrations bien ordonnées) — c'est **(1)** les ~22 secrets à re-saisir côté nouveau projet, **(2)** les 8 cron jobs pg_cron avec URL + JWT **hardcodés** vers l'ancien projet, **(3)** la dépendance `LOVABLE_API_KEY` (AI Gateway Lovable) dans 8 functions, **(4)** quelques URL Supabase en dur dans le front. Estimation : **2 à 4 jours** pour un praticien Supabase, hors recette fonctionnelle.

---

## 1. STRUCTURE

### Arborescence `supabase/`

```
supabase/
├── config.toml          # project_id + verify_jwt par function (PAS de [auth], PAS de schedules)
├── functions/
│   ├── _shared/         # 30 modules utilitaires (auth, ai-client, rateLimit, workspace, …)
│   └── <103 functions>/ # chacune un index.ts (+ parfois *_test.ts)
└── migrations/          # 364 fichiers .sql horodatés
```

**Points notables `config.toml`** :
- Ne contient **que** `project_id` + un bloc `[functions.X] verify_jwt` par function.
- **Aucune section `[auth]`** → la config Auth (providers, redirect URLs, templates, hooks) vit **dans le dashboard Lovable/Supabase**, pas dans le repo → **à reconstituer manuellement**.
- **Aucun `schedule` déclaré** dans config.toml → les tâches planifiées passent **toutes par pg_cron** (voir §2/§3), pas par les scheduled functions Supabase.

### Migrations SQL

- **364 migrations**, nommage Lovable `<timestamp>_<uuid>.sql`, ordre chronologique strict (le timestamp = ordre d'application).
- Première : `20251128234644…` · Dernière : `20260605100032…`.
- ⚠️ Nommage UUID = **non descriptif** : impossible de savoir ce que fait une migration sans l'ouvrir. Pour la cible, on rejoue **l'intégralité dans l'ordre** (ne pas cherry-pick).

### Modules front — **un seul build**

SPA Vite unique (`vite.config.ts` sans `rollupOptions.input` multiples). Routing React Router unique, 6 univers sous le même bundle :

| Univers | Préfixe routes | `src/pages/` | `src/components/` |
|---|---|---|---|
| Site public | `/` | ~40 fichiers | `sections/` (18) |
| Admin / CMS | `/admin` | 54 | 36 |
| Cockpit (CRM) | `/cockpit` | 29 | 56 |
| Viviers (lead mining) | `/viviers` | 10 | 21 |
| Portail partenaires | `/espace-partenaire` | 12 | 15 |
| Auth / onboarding | `/auth`, `/onboarding` | 7 | — |

→ **Un seul artefact de build** à déployer (Cloudflare Pages/Vercel/Netlify). Pas de monorepo à scinder.

---

## 2. EDGE FUNCTIONS (103)

### Secrets référencés (`Deno.env.get`)

**Standard Supabase** (auto-injectés côté plateforme — à NE PAS recréer manuellement sauf `SERVICE_ROLE_KEY` custom) :
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

**Config interne** (à redéfinir) : `DEFAULT_WORKSPACE_ID`, `OWNER_WORKSPACE_ID`, `SITE_URL`, `SEND_EMAIL_HOOK_SECRET`.

**Clés externes à reprovisionner (22)** :

| Clé | Service | Functions exemples |
|---|---|---|
| `LOVABLE_API_KEY` | **AI Gateway Lovable** ⚠️ | ai-agent-orchestrator, cache-prewarm, public-rag-chat, generate-document (8 fn) |
| `OPENAI_API_KEY` | OpenAI (LLM + embeddings) | ai-agent-orchestrator, generate-embeddings |
| `ANTHROPIC_API_KEY` | Anthropic | generate-document, process-uploaded-file |
| `OPENROUTER_API_KEY` | OpenRouter | generate-document |
| `RESEND_API_KEY` | Resend (email transac) | 15 functions (invitations, notifications…) |
| `BREVO_API_KEY` | Brevo (campagnes) | send-brevo-campaign |
| `INSTANTLY_API_KEY` | Instantly (cold email) | send-instantly-campaign, instantly-webhook |
| `STRIPE_SECRET_KEY` | Stripe | stripe-cancel, stripe-customer-portal, stripe-checkout-session |
| `STRIPE_WEBHOOK_SECRET` | Stripe | stripe-webhook |
| `ASSEMBLYAI_API_KEY` | AssemblyAI (transcription) | transcribe-audio-chunk, transcription-worker |
| `PAPPERS_API_KEY` | Pappers (data entreprises FR) | pappers-lookup |
| `ILOVEPDF_PUBLIC_KEY` / `ILOVEPDF_SECRET_KEY` | ILovePDF | convert-to-pdf |
| `GOOGLE_SERVICE_ACCOUNT_KEY` / `GOOGLE_CALENDAR_ID` | Google Calendar | calendar-booking, push-to-google-calendar |
| `ZOOM_ACCOUNT_ID` / `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET` / `ZOOM_WEBHOOK_SECRET_TOKEN` | Zoom | calendar-booking, zoom-import-recordings, zoom-recording-webhook |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ADMIN_CHAT_ID` / `ALLOWED_TELEGRAM_USERS` | Telegram | telegram-webhook, telegram-proactive-notifications, ai-agent-orchestrator |

> ⚠️ **`LOVABLE_API_KEY` = blocage potentiel** : c'est l'AI Gateway de Lovable. En quittant Lovable Cloud, cette clé peut être révoquée → **8 functions IA HS**. À remplacer par appel direct OpenAI/Anthropic/OpenRouter (les clients existent déjà dans `_shared/ai-providers.ts`, `ai-client.ts`).

### Rôle des 103 functions (résumé par familles)

| Famille | # | Functions |
|---|---|---|
| **IA / RAG / embeddings** | ~18 | ai-agent-orchestrator, ai-sentinel, generate-embeddings, search-embeddings, crm-rag-indexer, public-rag-chat, rag-content-gap-detector, cockpit-ai-copilot, cockpit-cross-signal-engine, extract-entities, suggest-tags, seed/auto-seed-intent-anchors, cache-prewarm, synthesize-entity-documents, score-viviers-batch, vivier-ai-search, vivier-insights |
| **Génération contenu/docs** | ~9 | generate-article-claude, generate-article-gpt, generate-document, generate-docx, generate-faq, analyze-comments-for-faq, enrich-content-seo, enrich-all-resources, convert-to-pdf |
| **Email / notifications** | ~16 | send-* (lead, newsletter, brevo-campaign, instantly-campaign, atelier-confirmation, form-notification, security-alert, user-confirmation, campaign-test), notify-new-comment, generate-followup-email, campaign-unsubscribe, auth-email-hook, instantly-webhook |
| **Auth / membres / partenaires** | ~20 | invite/accept/lookup/revoke-(team\|partner)-invitation, change-member-role, suspend/reactivate/remove-member, suspend/reactivate-partner, update-partner-scope, validate-invite-code, admin-list-users, create-cockpit-workspace, generate-partner-digest |
| **Stripe / billing** | 4 | stripe-checkout-session, stripe-customer-portal, stripe-cancel, stripe-webhook |
| **Viviers (prospection)** | ~6 | promote-vivier-to-lead, export-viviers-csv, vivier-cleanup, vivier-ai-search, vivier-insights, score-viviers-batch |
| **Transcription / voix** | ~6 | create/process-voice-transcription, transcribe-audio-chunk, transcription-worker, serve-transcription-audio, process-uploaded-file |
| **Calendar / Zoom** | ~5 | calendar-booking, push-to-google-calendar, sync-google-calendar, zoom-import-recordings, zoom-recording-webhook |
| **Telegram** | 2 | telegram-webhook, telegram-proactive-notifications |
| **Cron / automation** | ~9 | auto-consulte-stale, auto-daily-intelligence, auto-harvest-daily, publish-scheduled-articles, process-auto-actions, execute-action-proposal, ai-action-artifact-generator, detect-anomalies, check-* (cta, login, performance, api-quota) |
| **Ops / sécu / SEO** | ~8 | create-database-backup, restore-backup, verify-backup-integrity, generate-sitemap, record-lighthouse-metrics, check-cta-conversion, track-cta-click, send-security-alert |
| **MCP / data** | ~4 | mcp-server (48 outils Cockpit), mcp-api-keys, pappers-lookup, fetch-openrouter-models |

### Cron jobs

⚠️ **Aucun `schedule` dans config.toml** : la planification est **100 % pg_cron** (voir §3). Les functions « auto-* » et « check-* » sont déclenchées soit par pg_cron via `net.http_post`, soit par triggers DB.

---

## 3. BASE DE DONNÉES

### Tables & ordre d'import (FK)

**~146 tables**. Ordre d'import en couches (respecter pour un dump/restore sélectif ; un `supabase db push` des migrations dans l'ordre règle ça automatiquement) :

- **Couche 0 (Supabase)** : `auth.users` (référencée par ~39 tables) — fournie par la plateforme.
- **Couche 1 (racines, sans FK applicative)** : `workspaces` (réf. par ~35 tables), `profiles`, `partners` (~20), `articles` (~19), `leads` (~16), `projects` (~11), `opportunities` (~6), `billing_entities`, `plans`, `subscriptions`, tags/categories/statuses, ai_models/llm_models, email_configurations, booking_types.
- **Couche 2** : `lead_contacts`, `lead_partners`, `project_documents/notes/partners`, `opportunity_partners`, `partner_documents/invoices`, `article_categories/tags/versions/views`, `bookings`, `specifications`, `tasks`, `comments`, `voice_transcriptions`, `forms`, `ai_*` (prompts, semantic_cache, context_traces).
- **Couche 3** : `generated_documents`, `uploaded_files`, `viviers`/`vivier_campaigns`/`vivier_imports`, `action_proposals`, `workspace_members`/`workspace_ai_quotas`/`workspace_ai_thresholds`, tables Telegram.

### RLS

- **~656 policies** sur **~150 tables** (RLS quasi-systématique = modèle multi-tenant strict).
- Rôles applicatifs : `admin`, `cockpit_user`, `cockpit_admin`, `partner`. Helpers : `can_access_workspace()`, `is_workspace_member()`, `has_role()`.
- Top tables : voice_transcriptions (8), lead_contacts (7), generated_documents (7), storage.objects (6), partners (6), document_partners (6).
- ✅ Rejoué automatiquement par les migrations — **aucune action manuelle** tant qu'on applique tout le dossier `migrations/`.

### Triggers / vues / fonctions

- **~134 triggers** : `updated_at` (~50), audit (articles/categories/comments/tags), notifications IA (`trg_notify_ai_*`), sync (contact→lead, form→lead, won→project), sentinel, staleness, familiarity scoring, notifications Telegram/partenaires.
- **9 vues** : api_usage_summary, ai_cache_metrics, ai_dashboard_metrics, comments_public, forms_public, partner_activity_feed, scheduled_auto_actions, top_predictive_alerts.
- **~178 fonctions** plpgsql/SQL : autorisation workspace, semantic cache (`match_semantic_cache`, `purge_semantic_cache`), predictions (`compute_lead_predictions`), cleanup, scoring, Telegram, analytics viviers.

### Extensions Postgres requises

`vector` (embeddings 1536d, index HNSW cosine), **`pg_cron`**, **`pg_net`** (HTTP sortant DB→edge), `pgcrypto`, `pg_trgm`. → **toutes activables sur Supabase autonome** (incluses dans le plan Pro).

### Cron jobs pg_cron (8) — **POINT CRITIQUE**

| Job | Fréquence (UTC) | Action |
|---|---|---|
| compute-lead-predictions-daily | `30 6 * * *` | `compute_lead_predictions(NULL)` |
| auto-resolve-content-gaps | `*/30 * * * *` | `auto_resolve_content_gaps(0.80)` |
| recompute-workspace-ai-thresholds | `0 3 * * 1` | `recompute_workspace_thresholds()` |
| purge-semantic-cache-daily | `15 3 * * *` | DELETE ai_semantic_cache expiré |
| cleanup-ai-semantic-cache | `0 3 * * *` | `cleanup_ai_semantic_cache()` |
| ai-context-traces-purge | `30 7 * * *` | DELETE ai_context_traces > 7j |
| telegram-task-reminders | `*/15 * * * *` | `net.http_post` → `/telegram-proactive-notifications` |
| telegram-morning-briefing | `*/5 7-9 * * *` | `net.http_post` → `/telegram-proactive-notifications` |

> ⚠️ Les 2 jobs Telegram font un `net.http_post` vers **`https://mgjyhlyrwnnioctkbdkk.supabase.co/functions/v1/…`** avec un **Bearer JWT (anon key) hardcodé** dans la migration. Sur le nouveau projet : l'URL **et** le token seront faux → **jobs en échec silencieux**. À patcher manuellement post-migration.

---

## 4. AUTH

- **Providers** : email/password + **Google OAuth** (`signInWithOAuth({ provider: 'google' })` dans `src/hooks/useAuth.tsx`). Aucun autre OAuth.
- **Hook email custom** : `auth-email-hook` (verify_jwt=false) intercepte signup/recovery/email_change et rend du HTML brandé via **Resend** → nécessite `SEND_EMAIL_HOOK_SECRET` + configuration du **Auth Hook** côté dashboard (non versionné).
- **Tables liées à `auth.users`** : `profiles`, `workspace_members`, `partners`, + ~36 autres via FK `user_id`. `profiles` est probablement peuplée par un trigger `on_auth_user_created` (à vérifier dans migrations).
- **Redirect URLs** — toutes en **`window.location.origin`** (✅ pas d'URL hardcodée) :
  - `/auth/callback` (signup + OAuth Google), `/reset-password?mode=update`
  - Stripe : `/cockpit/settings/billing?checkout=success`, `/cockpit/pricing?checkout=cancel`, `/onboarding/payment-success|payment-cancelled`
  - → ⚠️ Mais ces URLs doivent être **déclarées dans la allowlist Auth** du nouveau projet (Redirect URLs), sinon redirections rejetées.

---

## 5. STORAGE

### Buckets

**9 buckets** créés en SQL (tous **privés**, `public=false`) :
`partner-documents`, `generated-documents`, `workspace-branding`, `specifications`, `brochure-images`, `email-assets`, `billing-logos`, `qr-codes`, `livres-blancs`, + `voice-transcriptions` (limite **500 Mo**/fichier).

⚠️ **Incohérence** : le front référence aussi `storage.from('cockpit-uploads')` — bucket **non trouvé dans les migrations**. À vérifier (créé à la main dans le dashboard ? → ne sera pas recréé par les migrations).

> Note : `email-assets` est servi en **URL publique** (`/storage/v1/object/public/email-assets`) depuis `src/lib/email/assets.ts` malgré `public=false` au niveau bucket → vérifier la policy publique associée, sinon images email cassées.

### Policies storage

**6 policies** sur `storage.objects` : `voice_storage_select/insert/update/delete` (isolation par `storage.foldername()` / user_id) + `telegram_service_uploads`, `telegram_service_read` (service role). Rejouées par migrations.

---

## 6. VARIABLES D'ENVIRONNEMENT

### Front (`import.meta.env`)

```
VITE_SUPABASE_URL              # client.ts
VITE_SUPABASE_PUBLISHABLE_KEY  # client.ts (anon key)
VITE_SUPABASE_PROJECT_ID       # MCPKeysManager, ViviersLeads
import.meta.env.DEV            # flag Vite natif
```

Utilisées dans : `src/integrations/supabase/client.ts`, `components/admin/OrchestratorConfig.tsx`, `components/cockpit/settings/MCPKeysManager.tsx`, `hooks/partner/usePartnerConsulte.ts`, `pages/viviers/ViviersLeads.tsx`.

### `.env` (présent, valeurs masquées)

```
VITE_SUPABASE_PROJECT_ID=***
VITE_SUPABASE_PUBLISHABLE_KEY=***
VITE_SUPABASE_URL=***
```

→ ⚠️ Pas de `.env.example`. Le `.env` est **committé** (présent dans le repo, pas dans `.gitignore` qui ne couvre que `*.local`). 3 variables à mettre à jour vers le nouveau projet.

---

## 7. POINTS DE FRICTION

### Hardcodage URL Supabase actuelle (`mgjyhlyrwnnioctkbdkk`)

| Fichier | Ligne | Détail |
|---|---|---|
| `src/components/ui/ChatbotDialog.tsx` | 50 | `fetch('https://mgjyhlyrwnnioctkbdkk.supabase.co/functions/v1/chat')` ⚠️ **+ function `chat` introuvable** dans `supabase/functions/` (probablement `public-rag-chat` ?) |
| `src/lib/email/assets.ts` | 15-16 | `PROJECT_REF = 'mgjyhlyrwnnioctkbdkk'` |
| `index.html` | 121-122 | `dns-prefetch` + `preconnect` vers l'URL |
| migrations pg_cron (Telegram) | — | URL + Bearer JWT en dur (cf §3) |

`ViviersLeads.tsx` et `MCPKeysManager.tsx` construisent l'URL via `VITE_SUPABASE_PROJECT_ID` (✅ paramétré, OK).

### Dépendances Lovable-spécifiques

- `lovable-tagger` (^1.1.11) en devDependency + plugin dans `vite.config.ts` (dev only — sans impact prod, mais à retirer si on quitte l'écosystème).
- Dossier `.lovable/` (`plan.md` + `memory/`) — métadonnées Lovable.
- **`LOVABLE_API_KEY`** dans 8 edge functions (cf §2 — le vrai point dur).
- README pointe le projet Lovable.

### Realtime (channels à reconfigurer)

6 zones de subscriptions `postgres_changes` (nécessitent **Realtime activé** sur les tables concernées dans le nouveau projet) :

| Fichier | Channel / tables |
|---|---|
| `components/admin/ArticleStatsInline.tsx` | `article-views-*`, `article-comments-*` |
| `hooks/useAdminNotifications.tsx` | comments, newsletter |
| `hooks/cockpit/useEntityLinks.ts` | entity-links dynamiques |
| `hooks/cockpit/useDashboardRealtime.ts` | leads, projects, partners, opportunities… |
| `hooks/partner/usePartnerNotifications.ts` | notifications |
| `pages/admin/BackupManagement.tsx` | backups |

→ ⚠️ Sur Supabase, Realtime doit être **activé table par table** (publication `supabase_realtime`). Vérifier que les migrations le font, sinon subscriptions muettes.

---

## 8. VERDICT

### Récapitulatif complexité / temps

| Brique | Complexité | Temps estimé | Risque |
|---|---|---|---|
| Schéma DB (rejouer 364 migrations) | 🟢 Faible | 1-2 h | Faible (ordonné) |
| Extensions (vector/pg_cron/pg_net/pgcrypto/pg_trgm) | 🟢 Faible | 15 min | Faible |
| RLS / triggers / fonctions / vues | 🟢 Auto | inclus migrations | Faible |
| Données prod (dump/restore) | 🟡 Moyen | 1-4 h | Volume inconnu (Q1) |
| Storage (9 buckets + objets) | 🟡 Moyen | 1-3 h | Volume inconnu (Q2) + bucket `cockpit-uploads` fantôme |
| **22 secrets edge à re-saisir** | 🟡 Moyen | 1-2 h | **Secrets actuels non lisibles (Q3)** |
| **Remplacer `LOVABLE_API_KEY`** (8 fn) | 🔴 Élevé | 2-4 h | IA HS si non traité |
| Déployer 103 edge functions | 🟡 Moyen | 1-2 h | `supabase functions deploy` en masse |
| **Patcher 8 cron pg_cron** (URL+JWT) | 🔴 Élevé | 1-2 h | Échecs silencieux |
| Config Auth (Google OAuth + email hook + redirect allowlist) | 🟡 Moyen | 1-2 h | Non versionné |
| Hardcodages front + `.env` | 🟢 Faible | 30 min | Faible |
| Realtime (activation tables) | 🟡 Moyen | 1 h | Subscriptions muettes |
| **Recette fonctionnelle complète** | 🔴 Élevé | 1-2 j | 4 univers à tester |

**Total technique** : ~2 jours. **Avec recette** : 3-4 jours.

### Checklist ordonnée de migration

1. [ ] **Créer le nouveau projet Supabase** (plan Pro pour pg_cron/pg_net). Noter `project_ref`, URL, anon key, service_role key.
2. [ ] **Activer les 5 extensions** (vector, pg_cron, pg_net, pgcrypto, pg_trgm).
3. [ ] **Lier le CLI** : `supabase link --project-ref <new>` puis **`supabase db push`** (rejoue les 364 migrations → schéma + RLS + triggers + fonctions + buckets).
4. [ ] **Vérifier le bucket fantôme `cockpit-uploads`** (créé manuellement ?) → le recréer si absent des migrations.
5. [ ] **Re-saisir les ~22 secrets** edge (`supabase secrets set …`) — récupérer les valeurs depuis le dashboard Lovable actuel (**Q3**).
6. [ ] **Remplacer `LOVABLE_API_KEY`** : router les 8 functions vers OpenAI/Anthropic/OpenRouter directs (clients déjà présents dans `_shared/`).
7. [ ] **Déployer les 103 functions** : `supabase functions deploy` (script en boucle sur les dossiers).
8. [ ] **Migrer les données** : `pg_dump`/restore (respecter l'ordre couches §3) — **après Q1 sur le volume**.
9. [ ] **Migrer le Storage** : copier les objets des 9 buckets (rclone/script) — **après Q2 sur le volume**.
10. [ ] **Patcher les 8 cron pg_cron** : remplacer l'URL `mgjyhlyrwnnioctkbdkk.supabase.co` + le Bearer JWT par ceux du nouveau projet (2 jobs Telegram concernés).
11. [ ] **Config Auth** : activer Google OAuth (client ID/secret), déclarer la **allowlist Redirect URLs** (callback, reset, Stripe success/cancel, onboarding), reconfigurer le **Send Email Hook** (`auth-email-hook` + secret).
12. [ ] **Activer Realtime** sur les tables écoutées (publication `supabase_realtime`).
13. [ ] **Mettre à jour le front** : `.env` (3 vars), `src/lib/email/assets.ts` (PROJECT_REF), `ChatbotDialog.tsx` (URL + function cible), `index.html` (preconnect). Retirer `lovable-tagger` si souhaité.
14. [ ] **Reconfigurer les webhooks externes** vers les nouvelles URL : Stripe (`stripe-webhook`), Instantly, Zoom, Telegram (`setWebhook`).
15. [ ] **Recette** des 4 univers (public / admin / cockpit / viviers / partenaires) : auth, paiement Stripe, IA/RAG, transcription, emails, cron.

---

## Les 3 questions non résolubles depuis le code

1. **Volume de données prod** — combien de lignes dans les grosses tables (`leads`, `voice_transcriptions`, `ai_semantic_cache`, `ai_context_traces`, embeddings) et combien d'**users `auth.users`** ? Détermine la stratégie de dump (en ligne vs gros transfert) et la durée d'indexation HNSW.
2. **Volume Storage réel** — taille cumulée des 9 buckets (surtout `voice-transcriptions` à 500 Mo/fichier et `generated-documents`) ? Et le bucket `cockpit-uploads` existe-t-il réellement en prod ? Détermine le temps/coût de migration des objets.
3. **Valeurs actuelles des ~22 secrets** côté Lovable Cloud — les clés API (Stripe, Resend, OpenAI, Zoom, Google service account, Telegram, etc.) ne sont **pas dans le repo**. Sont-elles toutes récupérables depuis le dashboard Lovable, ou certaines (`LOVABLE_API_KEY`, JWT anon hardcodés) devront-elles être **régénérées** ? Sans elles, edge functions + cron HS.
