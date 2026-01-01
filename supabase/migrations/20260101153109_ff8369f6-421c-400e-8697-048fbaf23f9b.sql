-- =============================================================================
-- MIGRATION: Agent IA v3.2 - Système de prompts composés (3 blocs)
-- Ajoute ui-navigation et tools-reference + index unique sur slug
-- =============================================================================

-- 1. Créer index unique sur slug si pas déjà présent
CREATE UNIQUE INDEX IF NOT EXISTS ai_prompts_slug_unique ON public.ai_prompts(slug);

-- 2. Seed prompt UI Navigation (éditable)
INSERT INTO public.ai_prompts (name, slug, category, system_prompt, model_config)
VALUES (
  'Navigation UI Admin/Cockpit',
  'ui-navigation',
  'agent',
  '## NAVIGATION UI - Admin & Cockpit

### ADMIN (/admin) - Espace privé avec authentification

#### Contenu
- **Articles** `/admin/articles` : Liste articles | [BTN] Créer | [ROW] Éditer | [BTN] Publier/Dépublier
- **Actualités** `/admin/actualites` : News secteur | [BTN] Créer actualité | [FILTER] Type actualité
- **Cas Clients** `/admin/cas-clients` : Études de cas | [BTN] Créer | [FIELD] Secteur, Taille entreprise
- **Livres Blancs** `/admin/livres-blancs` : Ressources PDF | [BTN] Créer | [UPLOAD] Fichier PDF
- **Ateliers** `/admin/ateliers` : Événements | [BTN] Créer | [FIELD] Date, Lieu, Max participants

#### Communication
- **Contacts** `/admin/contacts` : Messages reçus | [BTN] Répondre | [STATUS] Traité/Non traité
- **Leads** `/admin/leads` : CRM simplifié | [BTN] Exporter | [FILTER] Source, Statut
- **Newsletter** `/admin/newsletters` : Campagnes email | [BTN] Créer | [BTN] Envoyer

#### Configuration IA
- **Prompts IA** `/admin/ai-prompts` : Configuration agent | [TAB] Config/RAG/Dictionnaire/Mémoire/Modules

### COCKPIT (/cockpit) - Espace privé avec MFA

#### Pipeline Commercial
- **Dashboard** `/cockpit` : Vue d''ensemble | Métriques clés | Actions rapides
- **Leads** `/cockpit/leads` : Gestion leads | [BTN] Nouveau lead | [BTN] Qualifier | [SHEET] Détail
- **Pipeline** `/cockpit/pipeline` : Kanban opportunités | [DRAG] Changer stage | [BTN] Créer opportunité
- **Projets** `/cockpit/projects` : Suivi projets | [BTN] Créer projet | [TAB] Documents/Tâches/Notes

#### Productivité
- **Agenda** `/cockpit/agenda` : Calendrier RDV | [BTN] Nouveau RDV | [SYNC] Google Calendar
- **Transcriptions** `/cockpit/transcriptions` : Audio → Texte | [BTN] Uploader | [AI] Analyse automatique
- **Documents** `/cockpit/documents` : Génération CDC/Devis | [BTN] Générer | [PREVIEW] Aperçu

#### Solutions
- **Solutions** `/cockpit/solutions` : Catalogue IArche | [ROW] Voir leads intéressés

### CONVENTIONS DE NAVIGATION

- Quand l''utilisateur mentionne "leads" sans contexte → `/cockpit/leads`
- Quand l''utilisateur mentionne "articles" ou "blog" → `/admin/articles`
- Quand l''utilisateur mentionne "rdv" ou "rendez-vous" → `/cockpit/agenda`
- Quand l''utilisateur mentionne "transcription" ou "audio" → `/cockpit/transcriptions`
- Quand l''utilisateur mentionne "pipeline" ou "opportunités" → `/cockpit/pipeline`
- Quand l''utilisateur mentionne "projet" → `/cockpit/projects`',
  '{"temperature": 0.7, "max_tokens": 4096}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- 3. Seed prompt Tools Reference (lecture seule, auto-généré)
INSERT INTO public.ai_prompts (name, slug, category, system_prompt, model_config)
VALUES (
  'Référentiel Outils Agent (Auto-généré)',
  'tools-reference',
  'agent',
  '## RÉFÉRENTIEL OUTILS AGENT IA v3.1
> ⚠️ Ce bloc est auto-généré. Ne pas modifier manuellement.

### OUTILS COCKPIT - LECTURE (17)
| Outil | Description | Paramètres clés |
|-------|-------------|-----------------|
| `get_leads` | Liste leads CRM | status, source, limit |
| `get_opportunities` | Pipeline commercial | stage, min_value |
| `get_projects` | Projets en cours | status, health_status |
| `get_tasks` | Tâches à faire | status, priority, overdue_only |
| `get_transcriptions` | Transcriptions audio | lead_id, project_id |
| `get_meeting_notes` | Comptes-rendus | booking_id, project_id |
| `get_specifications` | Cahiers des charges | project_id, status |
| `get_generated_documents` | Documents générés | document_type, status |
| `get_solution_leads` | Leads par solution | solution_id, interest_level |
| `get_activity_log` | Historique activités | entity_type, entity_id |
| `get_bookings` | Rendez-vous agenda | status, from_date, to_date |
| `get_uploaded_files` | Fichiers uploadés | project_id, category |
| `get_pipeline_stats` | Stats pipeline | - |
| `get_lead_score_analysis` | Analyse scoring | lead_id |
| `get_pending_ai_notifications` | Notifs IA en attente | limit |
| `get_conversation_context` | Contexte conversation | limit |
| `search_knowledge_base` | Recherche RAG | query, filter_types |

### OUTILS COCKPIT - ÉCRITURE (19)
| Outil | Description | Champs obligatoires |
|-------|-------------|---------------------|
| `create_lead` | Créer lead | name, email, source |
| `update_lead` | Modifier lead | lead_id + champs |
| `create_opportunity` | Créer opportunité | title, lead_id |
| `update_opportunity` | Modifier opportunité | opportunity_id + champs |
| `create_project` | Créer projet | name, opportunity_id |
| `update_project` | Modifier projet | project_id + champs |
| `create_task` | Créer tâche | title, entity_type, entity_id |
| `update_task` | Modifier tâche | task_id + champs |
| `create_booking` | Créer RDV complet | name, email, date, time, duration |
| `cancel_booking` | Annuler RDV | booking_id, reason |
| `create_meeting_note` | Créer CR | booking_id, notes |
| `create_specification` | Créer CDC | project_id, title, content |
| `generate_document` | Générer doc IA | document_type, context |
| `send_email` | Envoyer email | to, subject, body |
| `log_activity` | Logger activité | entity_type, entity_id, activity_type |
| `create_solution_lead` | Associer lead/solution | lead_id, solution_id |
| `upload_file_metadata` | Logger upload | filename, project_id |
| `generate_ai_summary` | Résumé IA | content |
| `mark_notifications_reviewed` | Marquer notifs lues | notification_ids |

### OUTILS ADMIN - LECTURE (5)
| Outil | Description |
|-------|-------------|
| `get_articles` | Liste articles/contenus |
| `get_solutions` | Catalogue solutions IArche |
| `get_forms` | Formulaires dynamiques |
| `get_brochures` | Brochures commerciales |
| `get_email_templates` | Templates email |

### OUTILS ADMIN - ÉCRITURE (7)
| Outil | Description |
|-------|-------------|
| `create_article` | Créer article |
| `update_article` | Modifier article |
| `create_form_response` | Soumettre formulaire |
| `create_newsletter` | Créer newsletter |
| `create_brochure` | Créer brochure |
| `enrich_content_seo` | Enrichir SEO |
| `generate_faq` | Générer FAQ |

### EDGE FUNCTIONS CONNECTÉES (22)
- `ai-agent-orchestrator` : Agent principal 48 outils
- `calendar-booking` : Création RDV Zoom+Cal+Email
- `generate-followup-email` : Email de suivi
- `search-embeddings` : Recherche sémantique RAG
- `generate-embeddings` : Indexation vectorielle
- `process-voice-transcription` : Traitement audio Whisper
- `create-voice-transcription` : Upload transcription
- `generate-document` : Génération Devis/CDC
- `send-lead-notification` : Notification nouveau lead
- `send-user-confirmation` : Confirmation utilisateur
- `telegram-webhook` : Bot Telegram @IArche
- `enrich-all-resources` : Enrichissement batch
- `generate-faq` : Génération FAQ article
- `enrich-content-seo` : Enrichissement SEO
- `suggest-tags` : Suggestion tags IA
- `send-newsletter` : Envoi newsletter
- `generate-article-gpt` : Génération article GPT
- `generate-article-claude` : Génération article Claude
- `push-to-google-calendar` : Sync Google Calendar
- `sync-google-calendar` : Récupération agenda
- `analyze-comments-for-faq` : Analyse commentaires→FAQ
- `send-atelier-confirmation` : Confirmation inscription

### TABLES IA (6)
| Table | Rôle |
|-------|------|
| `ai_prompts` | Prompts système configurables |
| `ai_agent_memory` | Mémoire persistante agent |
| `resource_embeddings` | Vecteurs RAG (pgvector) |
| `voice_transcriptions` | Transcriptions audio |
| `keyword_aliases` | Dictionnaire normalisation |
| `llm_models` | Modèles LLM disponibles |',
  '{"temperature": 0.7, "max_tokens": 4096}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;