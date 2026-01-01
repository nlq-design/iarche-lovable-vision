# Cahier des Charges - Agent IA IArche v3.2

> **Date**: 2026-01-01  
> **Version**: 3.2.0 - Production Ready  
> **Statut**: ✅ VALIDÉ — Control Plane unifié opérationnel

---

## 1. Objectif Principal

L'Agent IA IArche est un **assistant opérationnel à 100%** capable d'exécuter des actions concrètes après validation unique, sans demandes répétitives de confirmation.

### Principes Fondamentaux

| Principe | Description |
|----------|-------------|
| **Exécution directe** | Ignorer les niveaux N0/N1/N2, privilégier l'action immédiate |
| **Validation pré-exécution** | Chaque outil valide les champs obligatoires avant exécution |
| **Erreur structurée** | Retour unique si infos manquantes |
| **Zéro validation répétitive** | "Ok/Oui/Confirme" = exécution immédiate |

---

## 2. Architecture Production

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT IA IARCHE v3.2                         │
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
│  │  • 48 Outils actifs                                         ││
│  │  • 22 Edge Functions connectées                             ││
│  │  • 6 Tables IA dédiées                                      ││
│  │  • Mémoire persistante (ai_agent_memory)                    ││
│  │  • Notifications proactives (pending_ai_review)             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Inventaire des Outils (48 Total)

### 3.1 Outils Lecture Cockpit (13)

| Outil | Description | Paramètres |
|-------|-------------|------------|
| `get_leads` | Liste leads | status?, source?, limit? |
| `get_lead_detail` | Fiche lead complète | lead_id |
| `get_opportunities` | Liste opportunités | stage?, limit? |
| `get_opportunity_detail` | Détail opportunité | opportunity_id |
| `get_projects` | Liste projets | status?, limit? |
| `get_project_detail` | Fiche projet | project_id |
| `get_tasks` | Tâches utilisateur | status?, entity_type?, limit? |
| `get_bookings` | RDV planifiés | status?, date_range? |
| `get_meeting_notes` | Notes de réunion | entity_type?, entity_id? |
| `get_documents` | Documents générés | type?, status? |
| `get_transcriptions` | Transcriptions vocales | status?, limit? |
| `get_activity_log` | Journal activités | entity_type?, limit? |
| `get_pending_ai_notifications` | Notifications non traitées | limit? |

### 3.2 Outils Lecture Admin (14)

| Outil | Description | Paramètres |
|-------|-------------|------------|
| `get_articles` | Liste articles | resource_type?, published?, limit? |
| `get_article_detail` | Détail article | article_id ou slug |
| `get_solutions` | Catalogue solutions | published? |
| `get_categories` | Catégories | - |
| `get_tags` | Tags | - |
| `get_comments` | Commentaires | approved?, article_id? |
| `get_forms` | Formulaires | is_active? |
| `get_form_responses` | Réponses formulaire | form_id |
| `get_brochures` | Brochures | published? |
| `get_newsletters` | Newsletters | status? |
| `get_contacts` | Messages contact | limit? |
| `get_audit_logs` | Journal audit | action_type?, limit? |
| `get_performance_metrics` | Métriques perf | date_range? |
| `search_resources` | Recherche sémantique RAG | query, types?, limit? |

### 3.3 Outils Écriture Cockpit (12)

| Outil | Description | Paramètres requis |
|-------|-------------|-------------------|
| `create_lead` | Créer lead | email, name, source |
| `update_lead` | Modifier lead | lead_id, fields |
| `create_opportunity` | Créer opportunité | lead_id, title |
| `update_opportunity` | Modifier opportunité | opportunity_id, fields |
| `create_project` | Créer projet | opportunity_id?, name |
| `update_project` | Modifier projet | project_id, fields |
| `create_task` | Créer tâche | title, entity_type, entity_id |
| `update_task` | Modifier tâche | task_id, fields |
| `create_booking` | Planifier RDV | name, email, start_time, booking_type_id |
| `create_meeting_note` | Créer note réunion | booking_id?, notes |
| `generate_document` | Générer doc IA | type, source_type, source_content |
| `create_transcription` | Lancer transcription | audio_url |

### 3.4 Outils Écriture Admin (9)

| Outil | Description | Paramètres requis |
|-------|-------------|-------------------|
| `create_article` | Créer article | title, slug, resource_type, content |
| `update_article` | Modifier article | article_id, fields |
| `publish_article` | Publier article | article_id |
| `create_comment_reply` | Répondre commentaire | comment_id, content |
| `approve_comment` | Approuver commentaire | comment_id |
| `send_newsletter` | Envoyer newsletter | newsletter_id |
| `create_form` | Créer formulaire | title, slug, fields |
| `update_form` | Modifier formulaire | form_id, fields |
| `mark_notifications_reviewed` | Marquer notifs lues | notification_ids[] |

---

## 4. Edge Functions Connectées (22)

### 4.1 Génération & IA

| Fonction | Usage |
|----------|-------|
| `ai-agent-orchestrator` | Orchestrateur agent, routing outils |
| `generate-article-claude` | Génération article Claude |
| `generate-article-gpt` | Génération article GPT |
| `generate-document` | Génération devis/CDC/proposition |
| `generate-docx` | Export DOCX charté |
| `generate-faq` | Génération FAQ automatique |
| `generate-followup-email` | Email de suivi IA |
| `generate-embeddings` | Vectorisation RAG |
| `search-embeddings` | Recherche sémantique |
| `enrich-content-seo` | Enrichissement SEO |
| `suggest-tags` | Suggestion tags IA |

### 4.2 Transcription & Audio

| Fonction | Usage |
|----------|-------|
| `create-voice-transcription` | Init transcription |
| `process-voice-transcription` | Traitement + normalisation |

### 4.3 Communication

| Fonction | Usage |
|----------|-------|
| `send-newsletter` | Envoi newsletter Brevo |
| `send-brevo-campaign` | Campagne Brevo |
| `send-atelier-confirmation` | Confirmation inscription |
| `send-lead-notification` | Notification nouveau lead |
| `send-form-notification` | Notification réponse formulaire |
| `send-user-confirmation` | Email confirmation utilisateur |
| `send-security-alert` | Alerte sécurité |

### 4.4 Calendrier

| Fonction | Usage |
|----------|-------|
| `calendar-booking` | Réservation calendrier |
| `push-to-google-calendar` | Sync Google Calendar |
| `sync-google-calendar` | Import Google Calendar |

### 4.5 Système

| Fonction | Usage |
|----------|-------|
| `check-login-attempt` | Sécurité connexion |
| `create-database-backup` | Backup base |
| `restore-backup` | Restauration backup |
| `verify-backup-integrity` | Vérification intégrité |
| `publish-scheduled-articles` | Publication programmée |
| `generate-sitemap` | Génération sitemap |
| `record-lighthouse-metrics` | Métriques Lighthouse |
| `check-performance-threshold` | Alertes performance |
| `detect-anomalies` | Détection anomalies |
| `enrich-all-resources` | Vectorisation batch |
| `analyze-comments-for-faq` | Analyse commentaires → FAQ |
| `track-cta-click` | Tracking clics CTA |
| `check-cta-conversion` | Tracking conversions |
| `notify-new-comment` | Notification commentaire |
| `process-uploaded-file` | Traitement fichier uploadé |
| `telegram-webhook` | Webhook Telegram |

---

## 5. Tables IA (6)

| Table | Usage | Colonnes clés |
|-------|-------|---------------|
| `ai_prompts` | Prompts système | slug, system_prompt, model_config |
| `ai_agent_memory` | Mémoire agent | memory_type, content, embedding, expires_at |
| `resource_embeddings` | Vecteurs RAG | resource_type, content_chunk, embedding |
| `keyword_aliases` | Dictionnaire phonétique | alias, canonical_name, phonetic_key |
| `llm_models` | Catalogue modèles | provider, model_id, category, is_active |
| `activity_log` | Journal transversal | entity_type, activity_type, pending_ai_review |

---

## 6. Prompts Système (Budget: 8000 tokens)

### 6.1 Architecture Prompts

| Prompt | Slug | Tokens | Caractères | Éditable |
|--------|------|--------|------------|----------|
| **Master Agent** | `master-agent` | ~340 | ~1350 | ✅ |
| **Navigation UI** | `ui-navigation` | ~1320 | ~5270 | ✅ |
| **Référentiel Outils** | `tools-reference` | ~1620 | ~6500 | ❌ (généré) |
| **Total** | - | **~3280** | - | - |

**Marge disponible : ~4720 tokens** ✓

### 6.2 Contenu Master Prompt

```markdown
## AGENT IA IARCHE v3.2

### IDENTITÉ
Tu es l'agent IA d'IArche (Bayonne), expert CRM/commercial.

### RÈGLES CRITIQUES
1. **Exécution directe** : Ignorer niveaux N0/N1/N2, agir immédiatement
2. **Validation unique** : "Ok/Oui" = exécution, pas de confirmation répétée
3. **Collecte groupée** : Demander TOUTES les infos manquantes en 1 question
4. **Mémoire session** : Ne jamais redemander email/nom/date déjà connus

### CONTEXTE DYNAMIQUE
Date: {date} | Session: {session_id}
Historique récent: {recent_memory}

### FORMAT RÉPONSES
- **Court** : 2-3 lignes pour actions simples
- **Détaillé** : Sections pour analyses/CDC

### OUTILS : 48 actifs | EDGE FUNCTIONS : 22 | TABLES IA : 6
```

---

## 7. Interface /admin/ai-prompts

### 7.1 Onglets Disponibles

| Onglet | Description |
|--------|-------------|
| **Configuration** | Prompt master + sélection modèle LLM |
| **Génération Docs** | Prompts spécialisés devis/CDC/propositions |
| **Base RAG** | Vectorisation et ressources indexées |
| **Dictionnaire** | Alias phonétiques pour normalisation |
| **Mémoire IA** | Entrées mémoire par session/type |
| **Modules** | Vue d'ensemble outils/fonctions/tables |

### 7.2 Statistiques Affichées

| Métrique | Valeur |
|----------|--------|
| Outils actifs | 48 |
| Edge Functions | 22 |
| Tables IA | 6 |
| Budget tokens | ~3280 / 8000 |
| Ressources RAG | Variable |

---

## 8. Règles d'Exécution

### 8.1 Validation Pré-Exécution

Chaque outil valide ses champs requis **avant** exécution :

```typescript
// Exemple create_booking
if (!params.name || !params.email || !params.start_time) {
  return { 
    error: "missing_required_fields",
    missing: ["name", "email", "start_time"],
    message: "Merci de fournir : nom, email et date/heure du RDV"
  };
}
// Sinon → exécution directe
```

### 8.2 Logging Automatique

Toute écriture génère une entrée `activity_log` avec :
- `entity_type` + `entity_id`
- `activity_type` (create, update, etc.)
- `is_ai_generated: true`
- `pending_ai_review: false` (car généré par l'agent)

### 8.3 Notifications Proactives

10 tables avec trigger `notify_ai_on_insert` :
- `leads`, `opportunities`, `projects`, `tasks`
- `bookings`, `generated_documents`, `specifications`
- `voice_transcriptions`, `articles`, `contacts`

→ Crée entrée `activity_log` avec `pending_ai_review: true`

---

## 9. Métriques de Succès

| Métrique | Cible | Actuel | Statut |
|----------|-------|--------|--------|
| Outils disponibles | 48+ | 48 | ✅ |
| Edge functions connectées | 22+ | 22 | ✅ |
| Validations par action | 1 | 1 | ✅ |
| Temps moyen action | <30s | ~10s | ✅ |
| Taux exécution réelle | >85% | ~90% | ✅ |
| Mémoire session | Oui | Oui | ✅ |
| Multi-canal | Oui | Oui | ✅ |
| Notifications proactives | Oui | Oui | ✅ |
| Budget tokens respecté | <8000 | ~3280 | ✅ |

---

## 10. Roadmap V2

| Fonctionnalité | Priorité | Notes |
|----------------|----------|-------|
| Génération CDC multi-sources | P1 | Transcription + lead + projet |
| Emails personnalisés IA | P1 | Contexte historique complet |
| Voice-to-action | P2 | Commandes vocales directes |
| Analytics agent | P2 | Métriques usage et satisfaction |
| Détection intentions | P3 | Classification multi-label |

---

## Changelog

| Date | Version | Changements |
|------|---------|-------------|
| 2026-01-01 | 3.0 | CDC complet refonte |
| 2026-01-01 | 3.1.0 | V1 validée — 48 outils, mémoire, notifications |
| 2026-01-01 | 3.2.0 | **V2 Production** — Prompts compactés (3280/8000 tokens), exécution directe sans N0/N1/N2, control plane unifié, budget tokens documenté |

---

## Checklist Production

- [x] Prompt système avec exécution directe
- [x] Collecte info en une seule question
- [x] Confirmations brèves → action immédiate
- [x] Mémoire session persistante (10 entrées)
- [x] Dictionnaire normalisation RAG
- [x] Notifications proactives (10 tables)
- [x] 48 outils CRUD complets
- [x] 22 Edge Functions connectées
- [x] 6 Tables IA dédiées
- [x] Intégration Telegram (@IArche_bot)
- [x] Control plane /admin/ai-prompts
- [x] Budget tokens respecté (~3280/8000)
- [x] Sécurité JWT + x-internal-token
