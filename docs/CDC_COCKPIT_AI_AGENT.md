# Cahier des Charges - Module IA Cockpit IArche

> **Version**: 2.0  
> **Date de mise à jour**: 1er janvier 2025  
> **Statut**: Documentation exhaustive

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [Base de données IA](#3-base-de-données-ia)
4. [Edge Functions IA](#4-edge-functions-ia)
5. [Orchestrateur Agent IA](#5-orchestrateur-agent-ia)
6. [Système de Prompts](#6-système-de-prompts)
7. [Système RAG](#7-système-rag)
8. [Mémoire Agent](#8-mémoire-agent)
9. [Module Transcription](#9-module-transcription)
10. [Génération de Documents](#10-génération-de-documents)
11. [Gouvernance et Autonomie](#11-gouvernance-et-autonomie)
12. [Interface Administration](#12-interface-administration)
13. [Roadmap fonctionnalités](#13-roadmap-fonctionnalités)
14. [Critères de succès](#14-critères-de-succès)
15. [Changelog](#15-changelog)

---

## 1. Vue d'ensemble

### 1.1 Objectif du module

Le module IA du Cockpit IArche est un assistant commercial et opérationnel intelligent qui :

- **Analyse** les transcriptions de réunions et appels
- **Recherche** dans la base de connaissances via RAG sémantique
- **Génère** des documents commerciaux (devis, CDC, propositions)
- **Suggère** des actions basées sur le contexte CRM
- **Mémorise** les interactions pour améliorer la pertinence

### 1.2 Périmètre validé

| # | Fonctionnalité | Description | Autonomie | Statut |
|---|----------------|-------------|-----------|--------|
| 1 | **Agent Chat IA** | Chat conversationnel avec 34 outils | N0/N1 | ✅ ACTIF |
| 2 | **Transcription audio** | Whisper + synthèse structurée | N0 | ✅ ACTIF |
| 3 | **RAG Knowledge Base** | Recherche sémantique articles/solutions | N0 | ✅ ACTIF |
| 4 | **Mémoire Agent** | Persistance contexte + recherche sémantique | N0 | ✅ ACTIF |
| 5 | **Génération CDC** | Cahier des charges depuis transcription | N1 | ✅ ACTIF |
| 6 | **Génération Devis** | Devis commercial multi-provider | N1 | ✅ ACTIF |
| 7 | **Génération Proposition** | Proposition commerciale persuasive | N1 | ✅ ACTIF |
| 8 | **Emails de suivi** | Brouillons d'emails personnalisés | N1 | ✅ ACTIF |
| 9 | **Dictionnaire alias** | Normalisation phonétique pour transcriptions | N0 | ✅ ACTIF |
| 10 | **Transcription Live** | Transcription temps réel WebSocket | N0 | ❌ TODO |
| 11 | **Agent Vocal Débrief** | Assistant vocal post-RDV | N1/N2 | ❌ TODO |
| 12 | **Alertes stagnation** | Détection opportunités inactives | N0 | ❌ TODO |
| 13 | **Lead Scoring contextuel** | Score basé transcriptions | N0 | ❌ TODO |

### 1.3 Hors périmètre

- ❌ Lead Scoring automatique (critères classiques taille/secteur)
- ❌ Matching automatique solutions sans transcription
- ❌ Widget RAG intégré public
- ❌ Enrichissement leads via sources externes
- ❌ Agent vocal public/client
- ❌ Chatbot IA généraliste public

---

## 2. Architecture technique

### 2.1 Schéma de flux global

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              COCKPIT UI                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│   AgentChat    │   TranscriptionPage   │   DocumentGenerator   │   LeadSheet │
│       ↓               ↓                        ↓                      ↓      │
└───────┬───────────────┬────────────────────────┬──────────────────────┬─────┘
        │               │                        │                      │
        ▼               ▼                        ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE FUNCTIONS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ai-agent-orchestrator  │  process-voice-transcription  │  generate-document │
│  search-embeddings      │  generate-embeddings          │  generate-followup-email│
│  create-voice-transcription                                                  │
└───────────────────────────────────────────────────────────────────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LLM PROVIDERS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│   Lovable AI Gateway      │   OpenAI API       │   Anthropic API            │
│   (gemini-2.5-flash)      │   (Whisper, GPT)   │   (Claude)                 │
│                           │                     │   OpenRouter (fallback)   │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│   ai_prompts        │   ai_agent_memory     │   resource_embeddings         │
│   llm_models        │   voice_transcriptions│   keyword_aliases             │
│   generated_documents│   activity_log       │   leads, projects, etc.       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Stack technique

| Composant | Technologie | Version/Notes |
|-----------|-------------|---------------|
| Frontend Chat | React + TypeScript | AgentChat.tsx |
| Edge Functions | Deno | Supabase Edge Functions |
| LLM Principal | Lovable AI Gateway | google/gemini-2.5-flash |
| Transcription | OpenAI Whisper | whisper-1 |
| Embeddings | OpenAI | text-embedding-3-small |
| Vector Store | pgvector | Extension Supabase |
| Base de données | PostgreSQL | Via Supabase |

### 2.3 Providers LLM supportés

| Provider | Modèles | Clé API | Usage |
|----------|---------|---------|-------|
| **Lovable** | gemini-2.5-flash, gemini-2.5-pro, gpt-5 | LOVABLE_API_KEY | Principal (gratuit) |
| **OpenAI** | gpt-4o, gpt-4o-mini, whisper-1 | OPENAI_API_KEY | Transcription + fallback |
| **Anthropic** | claude-3-5-sonnet, claude-3-haiku | ANTHROPIC_API_KEY | Documents premium |
| **OpenRouter** | Multiple | OPENROUTER_API_KEY | Fallback universel |

---

## 3. Base de données IA

### 3.1 Tables dédiées IA

#### `ai_prompts`
Stockage centralisé des prompts système.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| slug | TEXT | Identifiant technique (ex: `master-agent`) |
| name | TEXT | Nom affichable |
| category | TEXT | Catégorie (`agent`, `transcription`, `document_generation`) |
| system_prompt | TEXT | Prompt système complet |
| user_prompt | TEXT | Template prompt utilisateur (optionnel) |
| model_config | JSONB | `{model, provider, temperature}` |
| output_schema | JSONB | Schéma JSON pour extraction structurée |
| version | INT | Numéro de version |

**Prompts existants** :
- `master-agent` : Prompt principal de l'agent chat
- `cockpit-master-assistant` : Assistant Cockpit legacy
- `transcription_rdv_commercial` : Analyse RDV commercial
- `transcription_reunion_projet` : Analyse réunion projet
- `transcription_support_client` : Analyse support client
- `document_generation_quote` : Génération devis
- `document_generation_spec` : Génération CDC
- `document_generation_proposal` : Génération proposition

#### `ai_agent_memory`
Mémoire persistante de l'agent avec recherche sémantique.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| workspace_id | UUID | Workspace associé |
| user_id | UUID | Utilisateur concerné |
| session_id | TEXT | Session de chat |
| memory_type | TEXT | `conversation`, `action`, `tool_call`, `insight`, `preference` |
| category | TEXT | Sous-catégorie libre |
| entity_type | TEXT | Type d'entité liée |
| entity_id | UUID | ID entité liée |
| content | TEXT | Contenu mémorisé |
| embedding | vector(1536) | Vecteur pour recherche sémantique |
| metadata | JSONB | Métadonnées additionnelles |
| importance_score | FLOAT | Score importance (0-1) |
| expires_at | TIMESTAMPTZ | Date expiration (optionnel) |

#### `resource_embeddings`
Vectorisation des ressources pour RAG.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| resource_id | UUID | ID article source |
| resource_type | TEXT | `article`, `solution`, `cas-client`, etc. |
| resource_title | TEXT | Titre pour affichage |
| resource_slug | TEXT | Slug pour lien |
| content_chunk | TEXT | Morceau de contenu (800 chars) |
| embedding | vector(1536) | Vecteur embeddings |
| metadata | JSONB | FAQ, tags, etc. |

#### `voice_transcriptions`
Transcriptions audio et analyses.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| workspace_id | UUID | Workspace |
| storage_path | TEXT | Chemin fichier audio |
| source | TEXT | `upload` ou `recording` |
| status | TEXT | `pending`, `processing`, `completed`, `failed` |
| transcript_text | TEXT | Texte brut transcrit |
| transcript_segments | JSONB | Segments avec timestamps |
| structured_summary | JSONB | Analyse structurée (action_items, etc.) |
| lead_id | UUID | Lead associé |
| project_id | UUID | Projet associé |
| solution_id | UUID | Solution associée |
| prompt_profile_id | UUID | Profil de prompt utilisé |
| auto_create_tasks | BOOLEAN | Création auto de tâches |
| ai_metadata | JSONB | Infos modèle, confiance, etc. |
| transcription_date | DATE | Date saisie manuellement |

#### `keyword_aliases`
Dictionnaire d'alias pour normalisation.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| canonical_name | TEXT | Nom canonique (ex: "Datalia") |
| alias | TEXT | Variante connue (ex: "Atalia", "Data Lia") |
| phonetic_key | TEXT | Clé phonétique générée |
| context_type | TEXT | `solution`, `client`, `general` |
| is_active | BOOLEAN | Actif pour normalisation |

#### `llm_models`
Catalogue des modèles LLM disponibles.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| provider | TEXT | `lovable`, `openai`, `anthropic`, `openrouter` |
| model_id | TEXT | ID technique du modèle |
| display_name | TEXT | Nom affichable |
| category | TEXT | `fast`, `balanced`, `powerful`, `reasoning` |
| cost_tier | TEXT | `free`, `low`, `medium`, `high` |
| supports_tools | BOOLEAN | Support function calling |
| supports_vision | BOOLEAN | Support images |
| max_tokens | INT | Limite tokens |
| is_active | BOOLEAN | Disponible à la sélection |

### 3.2 Fonctions SQL IA

```sql
-- Recherche sémantique dans les ressources
search_similar_resources(
  query_embedding vector,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_types text[] DEFAULT NULL
) RETURNS TABLE(resource_id, resource_type, resource_title, ...)

-- Recherche dans la mémoire agent
search_ai_memory(
  p_query_embedding vector,
  p_workspace_id uuid,
  p_user_id uuid,
  p_match_threshold float DEFAULT 0.7,
  p_match_count int DEFAULT 10
) RETURNS TABLE(id, memory_type, content, similarity, ...)

-- Mémoire récente sans embedding
get_recent_ai_memory(
  p_workspace_id uuid,
  p_user_id uuid,
  p_limit int DEFAULT 20
) RETURNS TABLE(...)

-- Nettoyage mémoire expirée
cleanup_expired_ai_memory() RETURNS int

-- Génération clé phonétique
generate_phonetic_key(input_text text) RETURNS text
```

---

## 4. Edge Functions IA

### 4.1 Liste complète

| Fonction | Fichier | Description | Autonomie |
|----------|---------|-------------|-----------|
| **ai-agent-orchestrator** | `ai-agent-orchestrator/index.ts` | Orchestrateur principal avec 34 outils | N0/N1 |
| **process-voice-transcription** | `process-voice-transcription/index.ts` | Transcription Whisper + analyse LLM | N0/N1 |
| **create-voice-transcription** | `create-voice-transcription/index.ts` | Création job de transcription | N0 |
| **generate-document** | `generate-document/index.ts` | Génération devis/CDC/proposition | N1 |
| **generate-followup-email** | `generate-followup-email/index.ts` | Brouillons emails de suivi | N1 |
| **generate-embeddings** | `generate-embeddings/index.ts` | Vectorisation ressources (RAG) | N0 |
| **search-embeddings** | `search-embeddings/index.ts` | Recherche sémantique RAG | N0 |
| **enrich-all-resources** | `enrich-all-resources/index.ts` | Ré-indexation complète RAG | N0 |

### 4.2 Détail : ai-agent-orchestrator

**Fichier** : `supabase/functions/ai-agent-orchestrator/index.ts`  
**Taille** : ~2300 lignes  
**Rôle** : Hub central de l'agent IA chat

**Flux d'exécution** :
1. Authentification via header `Authorization`
2. Récupération du prompt système depuis `ai_prompts` (slug: `master-agent`)
3. Injection mémoire récente + recherche sémantique
4. Injection contexte temporel (date/heure/semaine)
5. Détection du mode de réponse (DÉTAILLÉ vs CHAT)
6. Appel LLM avec les 34 outils disponibles
7. Boucle d'exécution des tool_calls (max 5 itérations)
8. Sauvegarde mémoire de la réponse
9. Retour JSON avec `message`, `tool_calls`, `usage`

**Modes de réponse** :
- **MODE DÉTAILLÉ** : Déclenché par mots-clés (transcription, analyse, compte-rendu, etc.)
- **MODE CHAT** : Par défaut, réponses concises 3-5 lignes

### 4.3 Détail : process-voice-transcription

**Fichier** : `supabase/functions/process-voice-transcription/index.ts`  
**Taille** : ~1070 lignes

**Fonctionnalités** :
- Transcription via OpenAI Whisper (whisper-1)
- Support fichiers jusqu'à 25MB
- Multi-provider LLM pour analyse (Lovable, OpenAI, Anthropic, OpenRouter)
- Récupération profil de prompt personnalisé
- Chargement dictionnaire d'alias (keyword_aliases)
- Normalisation du transcript avant recherche RAG
- Recherche sémantique automatique de solutions
- Injection contexte CRM (lead, projet, activités, tâches)
- Génération analyse structurée :
  - `executive_summary`
  - `key_decisions`
  - `action_items` (avec extraction heures)
  - `risks_and_blockers`
  - `detected_needs`
  - `next_steps`
  - `detected_solutions` (via RAG)

### 4.4 Détail : generate-document

**Fichier** : `supabase/functions/generate-document/index.ts`  
**Taille** : ~493 lignes

**Types de documents** :
- `quote` : Devis commercial
- `spec` : Cahier des charges
- `proposal` : Proposition commerciale

**Fonctionnalités** :
- Multi-provider avec fallback automatique vers Lovable
- Récupération prompt depuis `ai_prompts` (slug: `document_generation_*`)
- Enrichissement contexte depuis CRM (projet, lead, opportunité, solution)
- Inclusion des spécifications existantes
- Sauvegarde dans `generated_documents` avec `ai_metadata`
- Log dans `activity_log`

---

## 5. Orchestrateur Agent IA

### 5.1 Outils disponibles (34 total)

#### COCKPIT - Lecture (N0) : 12 outils

| Outil | Description |
|-------|-------------|
| `get_leads` | Liste leads avec filtres (status, source, limit) |
| `get_opportunities` | Pipeline commercial (stage, min_value) |
| `get_projects` | Projets (status, health_status) |
| `get_tasks` | Tâches (status, priority, overdue_only) |
| `get_transcriptions` | Transcriptions vocales (lead_id, project_id) |
| `get_meeting_notes` | Comptes-rendus réunions |
| `get_specifications` | Cahiers des charges (project_id, status) |
| `get_generated_documents` | Documents générés (type, status) |
| `get_solution_leads` | Leads intéressés par solutions |
| `get_activity_log` | Historique activités |
| `get_pipeline_stats` | Statistiques pipeline |
| `get_agenda_summary` | Résumé agenda (today, this_week, etc.) |

#### ADMIN - Lecture (N0) : 11 outils

| Outil | Description |
|-------|-------------|
| `get_articles` | Articles publiés (resource_type) |
| `get_article_details` | Détail complet article |
| `get_solutions` | Solutions IArche |
| `get_categories_tags` | Catégories et tags |
| `get_contacts` | Messages de contact |
| `get_newsletters` | Newsletters (status) |
| `get_forms` | Formulaires (active_only) |
| `get_form_responses` | Réponses formulaire |
| `get_brochures` | Brochures marketing |
| `get_atelier_inscriptions` | Inscriptions ateliers |
| `get_bookings` | Rendez-vous (status, upcoming_only, dates) |
| `get_booking_details` | Détail RDV avec lead et notes |
| `get_comments` | Commentaires articles |
| `get_cta_analytics` | Stats clics CTA |
| `search_knowledge_base` | **Recherche RAG sémantique** |

#### COCKPIT - Écriture (N1) : 8 outils

| Outil | Description |
|-------|-------------|
| `create_task` | Créer tâche de suivi (avec extraction heure) |
| `create_meeting_note` | Créer compte-rendu réunion |
| `update_lead_qualification` | Suggérer changement statut lead |
| `update_opportunity_stage` | Suggérer changement stage opportunité |
| `draft_followup_email` | Générer brouillon email |
| `suggest_solutions_for_lead` | Suggérer solutions pertinentes |
| `suggest_booking_action` | Suggérer action sur RDV |
| `log_activity` | Enregistrer activité dans journal |

#### ADMIN - Écriture (N1) : 3 outils

| Outil | Description |
|-------|-------------|
| `draft_article_content` | Générer brouillon article |
| `suggest_article_improvements` | Suggérer améliorations SEO/contenu |
| `draft_newsletter` | Générer brouillon newsletter |

### 5.2 Injection dynamique du mode

```typescript
const DETAILED_MODE_KEYWORDS = [
  "transcription", "analyse", "compte-rendu", "réunion", "résumé", 
  "synthèse", "debrief", "meeting", "notes", "cr ", "c.r.", "pv ",
  "draft", "brouillon", "génère", "génerer", "créer un", "rédige",
  "plan d'action", "actions", "tâches à créer", "email de suivi"
];

const responseMode = needsDetailedMode ? "DÉTAILLÉ" : "CHAT";
const promptWithMode = systemPrompt.replace("{response_mode}", responseMode);
```

---

## 6. Système de Prompts

### 6.1 Prompt Master Agent (slug: master-agent)

**Structure** :

```
Tu es l'Agent IA IArche, un assistant commercial et opérationnel expert.

CONTEXTE :
- [Description IArche]
- [Accès CRM + Admin + RAG]
- [30+ outils disponibles]

RÔLE :
- [Responsabilités]

═══════════════════════════════════════════════════════════════════════
MODE DE RÉPONSE : {response_mode}
═══════════════════════════════════════════════════════════════════════

📝 MODE DÉTAILLÉ (transcriptions, analyses, comptes-rendus) :
- Réponse complète et structurée
- Plan d'action numéroté avec échéances
- Markdown riche autorisé

💬 MODE CHAT (questions, consultations, recherches) :
- Maximum 3-5 lignes
- Réponse directe
- Masquer UUIDs
- Markdown minimal

RÈGLES GÉNÉRALES :
- [Utilisation outils]
- [Validation N1]
- [Pas d'hallucination]
- [Français]

NIVEAUX D'AUTONOMIE :
- N0 : Lecture seule
- N1 : Suggestions/brouillons
- N2 : Actions irréversibles (non implémenté)
```

### 6.2 Prompts de transcription

3 profils disponibles dans `ai_prompts` :

| Slug | Usage | Focus |
|------|-------|-------|
| `transcription_rdv_commercial` | RDV prospect/client | Besoins, budget, décision |
| `transcription_reunion_projet` | Réunion d'équipe | Avancement, blocages, actions |
| `transcription_support_client` | Support/réclamation | Problème, solution, suivi |

### 6.3 Prompts de génération documents

| Slug | Document | Sections générées |
|------|----------|-------------------|
| `document_generation_quote` | Devis | Contexte, Périmètre, Phases, Planning, Investissement, Conditions |
| `document_generation_spec` | CDC | Vision, Objectifs, Périmètre fonctionnel, Exigences techniques, Contraintes, Recette, Planning, Risques |
| `document_generation_proposal` | Proposition | Accroche, Contexte client, Proposition, Approche, Pourquoi IArche, Investissement, Prochaines étapes |

---

## 7. Système RAG

### 7.1 Architecture

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   Articles       │     │  generate-embeddings │     │ resource_embeddings│
│   Solutions      │ --> │  (Edge Function)     │ --> │   (pgvector)      │
│   Cas-clients    │     │  text-embedding-3-small    │   1536 dimensions │
└──────────────────┘     └─────────────────────┘     └──────────────────┘
                                                              │
                                                              ▼
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   Agent Query    │ --> │  search-embeddings  │ --> │  Top-K Results   │
│   "solutions IA" │     │  (cosine similarity)│     │  similarity > 0.7│
└──────────────────┘     └─────────────────────┘     └──────────────────┘
```

### 7.2 Stratégie d'indexation

- **Découpage** : 800 caractères par chunk, overlap 150
- **Enrichissement** : Inclusion des FAQ associées
- **Types indexés** : `article`, `actualite`, `solution`, `service`, `livre-blanc`, `cas-client`
- **Filtres** : Uniquement ressources publiées

### 7.3 Normalisation phonétique

Le dictionnaire `keyword_aliases` permet de corriger les erreurs de transcription :

```
Alias: "Atalia" → Canonical: "Datalia"
Alias: "Data Lia" → Canonical: "Datalia"
Phonetic: "DTLY" → Match "Datalia"
```

**Fonction SQL** : `generate_phonetic_key(text)` - Algorithme type Soundex adapté français

---

## 8. Mémoire Agent

### 8.1 Types de mémoire

| Type | Usage | Expiration |
|------|-------|------------|
| `conversation` | Échanges chat | 14 jours |
| `tool_call` | Appels d'outils | 30 jours |
| `insight` | Insights importants | 90 jours |
| `preference` | Préférences utilisateur | Jamais |
| `context` | Contexte session | 7 jours |
| `action` | Actions exécutées | 30 jours |

### 8.2 Scoring d'importance

| Score | Cas |
|-------|-----|
| 0.3 | Query utilisateur simple |
| 0.4 | Réponse agent standard |
| 0.6 | Appel d'outil réussi |
| 0.8 | Insight ou recommandation |

### 8.3 Injection contexte

À chaque requête, l'orchestrateur injecte :
1. **5 dernières mémoires** (chronologique)
2. **3 mémoires pertinentes** (recherche sémantique sur la query)
3. **Contexte temporel** (date, heure, semaine)

---

## 9. Module Transcription

### 9.1 Flux complet

```
┌─────────────┐     ┌───────────────────────┐     ┌─────────────────┐
│  Audio File │ --> │ create-voice-         │ --> │ voice_          │
│  (Upload)   │     │ transcription         │     │ transcriptions  │
└─────────────┘     └───────────────────────┘     │ status=pending  │
                                                   └────────┬────────┘
                                                            │
     ┌──────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    process-voice-transcription                       │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Download audio from storage                                       │
│ 2. Call OpenAI Whisper (transcription)                              │
│ 3. Load keyword aliases                                              │
│ 4. Normalize transcript                                              │
│ 5. Search RAG for solutions (if no project/solution linked)        │
│ 6. Fetch CRM context (lead, project, activities, tasks)            │
│ 7. Load prompt profile                                               │
│ 8. Call LLM for structured analysis                                 │
│ 9. Update voice_transcriptions with results                        │
│ 10. Create tasks if auto_create_tasks=true                          │
│ 11. Log activity                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Output structuré

```json
{
  "executive_summary": "Résumé en 200 mots max",
  "participants": ["Nom 1", "Nom 2"],
  "key_decisions": ["Décision 1", "Décision 2"],
  "action_items": [
    {
      "task": "Envoyer le devis",
      "assignee": "Nicolas",
      "due_date": "2025-01-05",
      "due_time": "14:00",
      "priority": "high"
    }
  ],
  "risks_and_blockers": ["Budget non validé"],
  "detected_needs": ["Automatisation process", "Dashboard analytics"],
  "next_steps": "Planifier démo la semaine prochaine",
  "detected_solutions": [
    {
      "title": "IArche Analytics",
      "slug": "analytics",
      "similarity": 0.85,
      "source": "rag_auto_detection"
    }
  ]
}
```

### 9.3 Création automatique de tâches

Si `auto_create_tasks=true`, chaque `action_item` génère une tâche dans `tasks` avec :
- Lien vers `lead_id`, `project_id`, ou `transcription_id`
- Extraction automatique de `due_time` depuis le titre
- `ai_metadata` complet

---

## 10. Génération de Documents

### 10.1 Types supportés

| Type | Slug | Sections |
|------|------|----------|
| **Devis** | `quote` | Contexte, Périmètre, Phases, Planning, Investissement, Conditions |
| **CDC** | `spec` | Vision, Objectifs, Périmètre fonctionnel, Exigences techniques, Contraintes, Recette, Planning, Risques |
| **Proposition** | `proposal` | Accroche, Contexte, Proposition, Approche, Différenciateurs, Investissement, Prochaines étapes |

### 10.2 Sources de contexte

1. **Projet** : nom, description, budget, status
2. **Lead** : nom, entreprise, industrie, taille
3. **Opportunité** : titre, valeur, stage, description
4. **Solution** : titre, excerpt
5. **Spécifications** : CDC existants du projet
6. **Transcriptions** : Résumé, besoins détectés
7. **Instructions custom** : Directives additionnelles

### 10.3 Stockage

Table `generated_documents` :
- `document_type` : quote, spec, proposal
- `content_json` : { sections: [...], metadata: {...} }
- `status` : draft, pending_review, approved, sent
- `ai_metadata` : modèle, provider, confiance, horodatage

---

## 11. Gouvernance et Autonomie

### 11.1 Niveaux d'autonomie

| Niveau | Description | Validation | Exemples |
|--------|-------------|------------|----------|
| **N0** | Lecture/Informatif | Aucune | Stats, recherche, consultation |
| **N1** | Brouillons/Suggestions | Humain avant usage | Emails, tâches, documents, qualifications |
| **N2** | Exécution irréversible | Humain avant exécution | Envoi email, changement statut terminal |

### 11.2 ai_metadata obligatoire

Tout output IA doit inclure :

```json
{
  "ai_metadata": {
    "source": "ai-agent-orchestrator",
    "model": "google/gemini-2.5-flash",
    "provider": "lovable",
    "autonomy_level": "N1",
    "confidence": 0.85,
    "generated_at": "2025-01-01T10:30:00Z",
    "validated_by_human": false,
    "validated_at": null,
    "validation_required": true
  }
}
```

### 11.3 Logging

Toutes les actions IA sont tracées dans `activity_log` avec :
- `is_ai_generated: true`
- `ai_metadata` complet
- `visibility: "internal"`

---

## 12. Interface Administration

### 12.1 Page /admin/ai-prompts

**Fichier** : `src/pages/admin/AdminAIPrompts.tsx`

**Tabs** :

1. **Prompt Principal** : Édition du master-agent prompt + sélection modèle
2. **Base de connaissances** : 
   - Status vectorisation par type
   - Bouton ré-indexation complète
   - Test recherche sémantique
   - Liste ressources indexées
3. **Mémoire IA** :
   - Liste mémoires avec filtres (type)
   - Suppression individuelle
   - Nettoyage mémoires expirées
4. **Configuration Documents** :
   - Sélection modèle par type de document
   - Sauvegarde dans `ai_prompts`
5. **Dictionnaire** :
   - CRUD alias sémantiques
   - Import/Export CSV
   - Génération clé phonétique auto
6. **Modules** :
   - Liste des 34 outils de l'agent
   - Documentation par outil

### 12.2 Composants clés

| Composant | Fichier | Usage |
|-----------|---------|-------|
| `VectorizationCard` | AdminAIPrompts.tsx | Status RAG |
| `IndexedResourcesList` | AdminAIPrompts.tsx | Liste ressources |
| `AIMemoryManager` | AdminAIPrompts.tsx | Gestion mémoire |
| `DocumentGenerationConfig` | AdminAIPrompts.tsx | Config documents |
| `KeywordDictionary` | KeywordDictionary.tsx | Alias sémantiques |

---

## 13. Roadmap fonctionnalités

### Phase 1 : ✅ Complété
- Agent chat avec 34 outils
- Transcription + analyse structurée
- RAG sémantique
- Mémoire agent
- Génération documents (devis, CDC, proposition)
- Emails de suivi
- Dictionnaire alias

### Phase 2 : 🔄 En cours
- Multi-provider LLM avec fallback
- Modes de réponse dynamiques (Détaillé/Chat)
- Extraction heures des tâches

### Phase 3 : ❌ TODO
- **Transcription Live** : WebSocket OpenAI Realtime
- **Alertes stagnation** : Détection opportunités inactives
- **Lead Scoring contextuel** : Score basé transcriptions

### Phase 4 : ❌ TODO
- **Agent Vocal Débrief** : Assistant vocal WebRTC
- **Actions N2** : Envoi email automatique avec validation

---

## 14. Critères de succès

| Métrique | Cible | Mesure |
|----------|-------|--------|
| Utilisation agent chat | > 10 sessions/jour | Logs activity |
| Précision transcription | > 95% | Retours utilisateurs |
| Pertinence RAG | > 80% top-3 | Feedback implicite |
| Adoption génération docs | > 50% des projets | generated_documents |
| Temps réponse agent | < 5s | Logs edge function |

---

## 15. Changelog

| Date | Version | Modifications |
|------|---------|---------------|
| 31/12/2024 | 1.0 | Création initiale CDC |
| 01/01/2025 | 2.0 | **Audit complet** : <br>- Documentation 34 outils<br>- Détail 6 tables IA<br>- 8 edge functions documentées<br>- Système RAG + mémoire<br>- Modes réponse Détaillé/Chat<br>- Gouvernance N0/N1/N2<br>- Interface admin<br>- Dictionnaire alias phonétique |

---

## Annexes

### A. Secrets requis

| Secret | Usage | Obligatoire |
|--------|-------|-------------|
| `LOVABLE_API_KEY` | Lovable AI Gateway | ✅ Oui |
| `OPENAI_API_KEY` | Whisper + embeddings | ✅ Oui |
| `ANTHROPIC_API_KEY` | Claude (documents premium) | ❌ Non |
| `OPENROUTER_API_KEY` | Fallback multi-modèles | ❌ Non |

### B. Storage buckets

| Bucket | Usage | Public |
|--------|-------|--------|
| `voice-transcriptions` | Fichiers audio | ❌ Non |

### C. Liens fichiers sources

- Orchestrateur : `supabase/functions/ai-agent-orchestrator/index.ts`
- Transcription : `supabase/functions/process-voice-transcription/index.ts`
- Documents : `supabase/functions/generate-document/index.ts`
- Emails : `supabase/functions/generate-followup-email/index.ts`
- Embeddings : `supabase/functions/generate-embeddings/index.ts`
- Search RAG : `supabase/functions/search-embeddings/index.ts`
- Admin UI : `src/pages/admin/AdminAIPrompts.tsx`
- Agent Chat : `src/components/cockpit/AgentChat.tsx`
