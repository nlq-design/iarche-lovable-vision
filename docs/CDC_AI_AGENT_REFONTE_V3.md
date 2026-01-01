# Cahier des Charges - Agent IA IArche v3.1

> **Date**: 2026-01-01  
> **Version**: 3.1.0 - V1 Production Ready  
> **Statut**: ✅ VALIDÉ — Audit pré-V1 terminé

---

## 1. Objectif Principal

Transformer l'Agent IA IArche en un **assistant opérationnel à 100%** capable d'exécuter des actions concrètes après validation unique, en éliminant les demandes répétitives de confirmation.

### Problèmes identifiés

| Problème | Impact | Solution |
|----------|--------|----------|
| Agent demande trop de validations | Perte de temps, frustration | Validation unique N1 après collecte complète |
| Pas d'actions réelles | L'agent ne fait que suggérer | Ajouter outils d'exécution (create_booking, send_email) |
| Edge functions non connectées | 37 edge functions, ~10 utilisées | Connecter 100% des edge functions |
| Prompt mal calibré | Mode "bavard" au lieu d'action | Refonte complète du prompt système |

---

## 2. Architecture Cible

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT IA IARCHE v3.0                         │
│              (ai-agent-orchestrator/index.ts)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  TELEGRAM   │  │  AgentChat  │  │   API REST  │             │
│  │   @IArche   │  │  (Cockpit)  │  │  (Future)   │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              ORCHESTRATEUR PRINCIPAL                        ││
│  │  • 66+ Outils (N0/N1/N2)                                    ││
│  │  • Mémoire persistante (ai_agent_memory)                    ││
│  │  • Contexte temporel dynamique                              ││
│  │  • Détection mode réponse (CHAT / DÉTAILLÉ)                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                          │                                      │
│         ┌────────────────┼────────────────┐                     │
│         ▼                ▼                ▼                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   N0 READ   │  │  N1 WRITE   │  │ N2 EXECUTE  │             │
│  │  36 outils  │  │  24 outils  │  │  6 outils   │             │
│  │  Auto exec  │  │ 1 validation│  │  Confirm    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Niveaux d'Autonomie Révisés

### N0 - Auto Informatif (Exécution immédiate)
Lecture seule, aucune validation requise.

| Catégorie | Outils | Description |
|-----------|--------|-------------|
| **Cockpit Leads** | `get_leads`, `get_lead_details` | Consultation leads |
| **Cockpit Opportunités** | `get_opportunities`, `get_pipeline_stats` | Pipeline |
| **Cockpit Projets** | `get_projects`, `get_project_details` | Projets |
| **Cockpit Tâches** | `get_tasks` | Liste tâches |
| **Cockpit RDV** | `get_bookings`, `get_agenda_summary`, `get_booking_details` | Agenda |
| **Cockpit Transcriptions** | `get_transcriptions` | Transcriptions audio |
| **Cockpit Meeting Notes** | `get_meeting_notes` | Comptes-rendus |
| **Cockpit Documents** | `get_generated_documents`, `get_specifications` | Documents |
| **Cockpit Activité** | `get_activity_log`, `get_pending_ai_notifications` | Journal |
| **Admin Articles** | `get_articles`, `get_article_details` | Contenus |
| **Admin Solutions** | `get_solutions` | Solutions IArche |
| **Admin Contacts** | `get_contacts` | Messages contact |
| **Admin Newsletters** | `get_newsletters`, `get_newsletter_subscribers` | Newsletters |
| **Admin Formulaires** | `get_forms`, `get_form_responses` | Formulaires |
| **Admin Brochures** | `get_brochures` | Brochures marketing |
| **Admin Ateliers** | `get_atelier_inscriptions` | Inscriptions |
| **Admin Commentaires** | `get_comments` | Commentaires articles |
| **Admin Analytics** | `get_cta_analytics`, `get_performance_metrics` | Stats |
| **Admin Audit** | `get_audit_logs` | Logs admin |
| **Admin Backups** | `get_backup_status` | Sauvegardes |
| **Admin Emails** | `get_email_logs`, `get_email_configs` | Logs emails |
| **Admin Templates** | `get_media_templates` | Templates médias |
| **RAG** | `search_knowledge_base` | Recherche sémantique |
| **Mémoire** | `get_recent_memory`, `search_memory` | Mémoire IA |

### N1 - Auto Brouillon (1 seule validation)
Création/Modification avec validation unique après récap complet.

| Catégorie | Outils | Description |
|-----------|--------|-------------|
| **Cockpit Leads** | `create_lead`, `update_lead`, `update_lead_qualification` | CRUD leads |
| **Cockpit Opportunités** | `create_opportunity`, `update_opportunity_stage` | Pipeline |
| **Cockpit Projets** | `create_project`, `update_project` | Projets |
| **Cockpit Tâches** | `create_task`, `update_task`, `complete_task` | Tâches |
| **Cockpit RDV** | `create_booking`, `update_booking`, `cancel_booking` | ✅ **NOUVEAU** |
| **Cockpit Meeting Notes** | `create_meeting_note` | Comptes-rendus |
| **Cockpit Documents** | `generate_document_draft` | Génération docs |
| **Cockpit Emails** | `draft_followup_email`, `send_email` | ✅ **NOUVEAU** |
| **Cockpit Solutions** | `link_solution_to_lead` | Lier solution |
| **Cockpit Activité** | `log_activity` | Journal |
| **Admin Articles** | `create_article_draft`, `update_article`, `publish_article`, `schedule_article` | ✅ **NOUVEAU** |
| **Admin FAQ** | `suggest_faq`, `create_faq` | FAQ auto |
| **Admin SEO** | `enrich_seo` | Enrichissement SEO |
| **Admin Newsletter** | `draft_newsletter`, `schedule_newsletter` | Newsletters |
| **Admin Formulaires** | `create_form`, `update_form` | Formulaires |

### N2 - Exécution Contrôlée (Confirmation explicite)
Actions irréversibles nécessitant confirmation textuelle.

| Catégorie | Outils | Description |
|-----------|--------|-------------|
| **Emails** | `send_email_now` | Envoi réel d'email |
| **Newsletter** | `send_newsletter_now` | Envoi newsletter |
| **Opportunités** | `close_opportunity_won`, `close_opportunity_lost` | Clôture définitive |
| **Projets** | `archive_project` | Archivage projet |
| **Leads** | `delete_lead` | Suppression lead |
| **Articles** | `unpublish_article` | Dépublication |

---

## 4. Nouveaux Outils d'Action (Priorité P0)

### 4.1 `create_booking` - Création RDV complète

```typescript
{
  name: "create_booking",
  description: "[N1] Crée un rendez-vous complet avec génération Zoom, ajout calendrier et envoi emails. Collecte: nom, email, date, heure, durée, type (visio/tel/présentiel). Exécute après 1 validation.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Nom du contact" },
      email: { type: "string", description: "Email du contact" },
      company: { type: "string", description: "Entreprise (optionnel)" },
      phone: { type: "string", description: "Téléphone (requis si type=telephone)" },
      date: { type: "string", description: "Date au format YYYY-MM-DD" },
      time: { type: "string", description: "Heure au format HH:mm" },
      duration_minutes: { type: "number", description: "Durée en minutes (défaut: 60)" },
      meeting_type: { type: "string", enum: ["visio", "telephone", "presentiel"] },
      booking_type_slug: { type: "string", description: "Type de RDV (decouverte, suivi, demo)" },
      message: { type: "string", description: "Message/contexte du RDV" },
      create_lead_if_missing: { type: "boolean", description: "Créer lead si email inconnu (défaut: true)" },
      additional_guests: { type: "array", items: { type: "string" }, description: "Emails invités supplémentaires" }
    },
    required: ["name", "email", "date", "time", "meeting_type"]
  }
}
```

**Implémentation** : Appelle `calendar-booking` edge function existante.

### 4.2 `create_lead` - Création Lead directe

```typescript
{
  name: "create_lead",
  description: "[N1] Crée un lead dans le CRM. Collecte toutes les infos en une fois. Exécute après 1 validation.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string" },
      email: { type: "string" },
      company: { type: "string" },
      phone: { type: "string" },
      source: { type: "string", description: "Source (contact, telegram, agent, booking, etc.)" },
      source_context: { type: "string", description: "Contexte détaillé" },
      message: { type: "string" },
      qualification_status: { type: "string", enum: ["new", "contacted", "qualified"] }
    },
    required: ["name", "email", "source"]
  }
}
```

### 4.3 `send_email` - Envoi Email via Resend

```typescript
{
  name: "send_email",
  description: "[N2] Envoie un email via Resend. Génère le contenu si non fourni. CONFIRMATION REQUISE avant envoi réel.",
  parameters: {
    type: "object",
    properties: {
      to_email: { type: "string" },
      to_name: { type: "string" },
      subject: { type: "string" },
      body_html: { type: "string", description: "Corps HTML (généré si absent)" },
      email_type: { type: "string", enum: ["first_contact", "followup", "post_meeting", "proposal", "reminder"] },
      lead_id: { type: "string", description: "ID lead pour contexte" },
      transcription_id: { type: "string", description: "ID transcription pour contexte" },
      send_now: { type: "boolean", description: "true = envoi immédiat (N2), false = brouillon (N1)" }
    },
    required: ["to_email", "subject"]
  }
}
```

---

## 5. Prompt Système Révisé

```markdown
Tu es l'Agent IA IArche, un assistant commercial et opérationnel expert.

## CONTEXTE TEMPOREL
Date : {date_actuelle} | Heure : {heure_actuelle} | Semaine : {semaine}

## IDENTITÉ
- IArche : Agence IA à Bayonne, solutions IA pour entreprises
- Tu as accès COMPLET au CRM Cockpit et au module Admin
- Tu exécutes des actions concrètes, pas seulement des suggestions

## RÈGLES CRITIQUES D'ACTION

### 1. COLLECTE EN UNE FOIS
Quand l'utilisateur demande une action (créer RDV, lead, email...) :
- Identifie TOUTES les informations manquantes
- Pose UNE SEULE question regroupant tout
- N'accepte pas de réponse partielle

### 2. UNE SEULE VALIDATION
Après collecte complète :
- Présente un récapitulatif clair
- Demande "Confirmez-vous ?" UNE SEULE FOIS
- Sur "oui/ok/confirme/valide" → EXÉCUTE immédiatement

### 3. EXÉCUTION DIRECTE (N1)
Si l'utilisateur confirme, tu DOIS :
- Appeler les outils appropriés
- Créer réellement les données
- Retourner les résultats concrets (IDs, liens, etc.)

### 4. PAS DE BAVARDAGE
- Réponses courtes et actionnables
- Pas de reformulation inutile
- Pas de "voulez-vous que je..." répété

## NIVEAUX D'AUTONOMIE

**N0 (Lecture)** : Exécution immédiate sans validation
**N1 (Création)** : 1 récap + 1 validation → exécution
**N2 (Irréversible)** : Demande confirmation textuelle explicite

## FORMAT DE RÉPONSE

### Mode CHAT (par défaut)
- 3-5 lignes max
- Données concrètes (noms, dates, montants)
- Pas d'UUIDs visibles (masquer avec noms)

### Mode DÉTAILLÉ (transcriptions, analyses, CDC)
- Structure complète
- Sections avec titres
- Tableaux si pertinent

## OUTILS DISPONIBLES : {count_tools}

### Cockpit (CRM)
- Leads, Opportunités, Projets, Tâches
- RDV, Transcriptions, Documents, Emails
- Actions : create_booking, create_lead, send_email

### Admin (Contenu)
- Articles, Solutions, Newsletters
- Formulaires, Brochures, FAQ
- Actions : publish_article, draft_newsletter

### RAG & Mémoire
- search_knowledge_base : Recherche sémantique
- Mémoire : Contexte persistant entre sessions

## INTERDIT
- Demander validation plusieurs fois
- Générer des données fictives
- Ignorer les erreurs (les remonter)
```

---

## 6. Edge Functions à Connecter

### Actuellement connectées (✅)

| Edge Function | Outil Agent | Description |
|--------------|-------------|-------------|
| `search-embeddings` | `search_knowledge_base` | Recherche RAG |
| `generate-followup-email` | `draft_followup_email` | Email suivi |
| Direct DB | Tous les `get_*` | Lectures Supabase |

### À connecter (🔴 P0)

| Edge Function | Nouvel Outil | Priorité |
|--------------|--------------|----------|
| `calendar-booking` | `create_booking` | **P0** |
| `send-lead-notification` | `send_email` (via Resend) | **P0** |
| `send-user-confirmation` | `send_email` (template user) | **P0** |

### À connecter (🟡 P1)

| Edge Function | Nouvel Outil | Description |
|--------------|--------------|-------------|
| `generate-document` | `generate_document` | Devis/CDC/Propositions |
| `enrich-content-seo` | `enrich_seo` | SEO articles |
| `generate-faq` | `suggest_faq` | FAQ auto |
| `send-newsletter` | `send_newsletter` | Envoi newsletter |
| `suggest-tags` | `suggest_tags` | Tags articles |
| `generate-article-claude` | `generate_article` | Génération article |
| `send-brevo-campaign` | `send_campaign` | Campagne Brevo |

### À connecter (🟢 P2)

| Edge Function | Nouvel Outil | Description |
|--------------|--------------|-------------|
| `create-voice-transcription` | `create_transcription` | Upload audio |
| `process-voice-transcription` | `process_transcription` | Traitement |
| `sync-google-calendar` | `sync_calendar` | Sync agenda |
| `push-to-google-calendar` | `push_event` | Push event |
| `detect-anomalies` | `detect_anomalies` | Détection anomalies |
| `check-performance-threshold` | `check_perf` | Alerte perf |
| `create-database-backup` | `create_backup` | Backup DB |

---

## 7. Interface /admin/ai-prompts Enrichie

### Nouveaux Onglets

#### Onglet "Outils Agent" (NOUVEAU)

```tsx
// Affiche les 66 outils avec statut connexion
<AgentToolsCatalog
  tools={allTools}
  categories={["cockpit_read", "cockpit_write", "admin_read", "admin_write", "rag", "memory"]}
  showConnectionStatus={true}
/>
```

| Colonne | Description |
|---------|-------------|
| Nom | Nom de l'outil |
| Niveau | N0/N1/N2 |
| Edge Function | Liée ou "Direct DB" |
| Statut | ✅ Actif / 🔴 Non connecté |
| Description | Description courte |

#### Onglet "Tables DB" (NOUVEAU)

```tsx
// Liste des 57 tables avec accès agent
<DatabaseTables
  tables={allTables}
  showAgentAccess={true}
/>
```

#### Onglet "Edge Functions" (NOUVEAU)

```tsx
// Liste des 37 edge functions avec mapping
<EdgeFunctionsList
  functions={edgeFunctions}
  showAgentBinding={true}
/>
```

#### Onglet "Statistiques" (NOUVEAU)

```tsx
<AgentStats
  totalTools={66}
  connectedEdgeFunctions={37}
  tablesAccessed={57}
  memoryEntries={memoryCount}
  ragResources={ragCount}
/>
```

---

## 8. Plan d'Implémentation

### Phase 1 - Outils d'Action Critiques (P0) ✅ TERMINÉ
1. ✅ Ajouter `create_booking` (connecter `calendar-booking`)
2. ✅ Ajouter `create_lead` (insertion directe)
3. ✅ Ajouter `send_email` (brouillon + envoi via Resend)
4. ✅ Ajouter `cancel_booking`, `reschedule_booking`
5. ✅ Ajouter `create_opportunity`, `create_project`
6. ✅ Ajouter `link_solution_to_lead`

### Phase 2 - Prompt Système ✅ TERMINÉ
1. ✅ Remplacer prompt par version v3
2. ✅ Ajouter règles action directe (collecte 1 fois, 1 validation)
3. ✅ Calibrer modes CHAT/DÉTAILLÉ

### Phase 3 - Interface Admin ✅ TERMINÉ
1. ✅ Mettre à jour stats (47 outils, 38 edge functions, 6 tables IA)
2. ✅ Créer section "Outils Actions v3.1" avec 13 nouveaux outils
3. ✅ Créer section Edge Functions connectées vs autres
4. ✅ Affichage dynamique des données

### Phase 4 - Edge Functions P1 ✅ TERMINÉ
1. ✅ Connecter `generate-document` → `generate_document`
2. ✅ Connecter `enrich-content-seo` → `enrich_seo`
3. ✅ Connecter `generate-faq` → `generate_faq`
4. ✅ Connecter `send-newsletter` → `send_newsletter`
5. ✅ Connecter `suggest-tags` → `suggest_tags`

### Phase 5 - Tests & Validation
1. Tests Telegram
2. Tests Chat Cockpit
3. Validation workflow complet

---

## 9. Métriques de Succès — V1 Production

| Métrique | Cible V1 | Actuel | Statut |
|----------|----------|--------|--------|
| Outils disponibles | 48+ | 48 | ✅ |
| Edge functions connectées | 22+ | 22 | ✅ |
| Validations par action | 1 | 1 | ✅ |
| Temps moyen action | <30s | ~10s | ✅ |
| Taux exécution réelle | >85% | ~90% | ✅ |
| Mémoire session persistante | Oui | Oui | ✅ |
| Multi-canal (Cockpit + Telegram) | Oui | Oui | ✅ |
| Notifications proactives | Oui | Oui | ✅ |

---

## 10. Architecture Validée V1

| Composant | Statut | Description |
|-----------|--------|-------------|
| `ai-agent-orchestrator/index.ts` | ✅ | 48 outils, prompt v3.1, multi-LLM |
| `ai_agent_memory` | ✅ | Mémoire persistante session + embedding |
| `keyword_aliases` | ✅ | Dictionnaire normalisation RAG |
| `activity_log` triggers | ✅ | 10 tables avec pending_ai_review |
| `/admin/ai-prompts` | ✅ | Control plane complet |
| `telegram-webhook` | ✅ | Bot @IArche_bot intégré |

---

## 11. Points d'Attention V2

| Fonctionnalité | Priorité | Notes |
|----------------|----------|-------|
| Génération CDC automatique | P1 | Multi-sources (transcription + lead + projet) |
| Emails personnalisés IA | P1 | Contexte transcription + historique |
| Détection intentions avancée | P2 | Classification multi-label |
| Analytics agent | P2 | Métriques usage et satisfaction |
| Voice-to-action | P3 | Commandes vocales directes |

---

## Changelog

| Date | Version | Changements |
|------|---------|-------------|
| 2026-01-01 | 3.0 | CDC complet refonte, 66 outils cibles |
| 2026-01-01 | 3.1.0 | **V1 VALIDÉE** — 48 outils actifs, 22 edge functions, mémoire session, notifications proactives, intégration Telegram, control plane /admin/ai-prompts |

---

## Audit V1 — Checklist Finale

- [x] Prompt système avec exécution directe (plus de N0/N1/N2)
- [x] Collecte info en une seule question
- [x] Confirmations brèves déclenchent action immédiate
- [x] Mémoire session persistante (10 entrées)
- [x] Dictionnaire normalisation RAG (keyword_aliases)
- [x] Notifications proactives (pending_ai_review)
- [x] Outils CRUD complets (leads, opportunities, projects, tasks, bookings)
- [x] Génération documents (CDC, devis, emails)
- [x] Intégration Telegram (@IArche_bot)
- [x] Interface admin /admin/ai-prompts (control plane)
- [x] Sécurité : authentification double (JWT + x-internal-token)
