-- Mise à jour des prompts tools-reference et ui-navigation vers v6.22

-- 1. Mise à jour tools-reference
UPDATE public.ai_prompts
SET system_prompt = '# Référentiel Outils Agent IA IArche v6.22

Mis à jour : 04/01/2026

## Architecture Centralisée
Centre de contrôle: /admin/ai-prompts
Canaux de commande: Telegram Bot, Cockpit Chat, API

---

## OUTILS DISPONIBLES (100+ total)

### LECTURE COCKPIT (18 outils)
| Outil | Description | Tables/Sources |
|-------|-------------|----------------|
| read_leads | Liste/détail leads | leads |
| read_lead_contacts | Contacts d''un lead | lead_contacts |
| read_lead_partners | Partenaires liés lead | lead_partners |
| read_opportunities | Pipeline commercial | opportunities |
| read_projects | Projets actifs | projects |
| read_project_notes | Notes projet | project_notes |
| read_partners | Réseau partenaires | partners |
| read_tasks | Tâches à faire | tasks |
| read_bookings | RDV agenda | bookings |
| read_documents | Documents générés | generated_documents |
| read_specifications | Cahiers des charges | specifications |
| read_transcriptions | Transcriptions audio | voice_transcriptions |
| read_uploads | Fichiers uploadés | cockpit_uploads |
| read_meeting_notes | Notes de réunion | meeting_notes |
| read_activity | Journal activités | activity_log |
| read_memory | Mémoire IA | ai_agent_memory |
| read_solutions | Solutions/produits | articles (solution) |
| read_entity_links | Liaisons entre entités | entity_name_references |

### LECTURE ADMIN (14 outils)
| Outil | Description | Tables/Sources |
|-------|-------------|----------------|
| read_articles | Contenus publiés | articles |
| read_contacts | Messages contact | contacts |
| read_forms | Formulaires | forms |
| read_form_responses | Réponses formulaires | form_responses |
| read_newsletters | Newsletters | articles (newsletter) |
| read_brochures | Brochures | brochures |
| read_comments | Commentaires | comments |
| read_categories | Catégories | categories |
| read_tags | Tags | tags |
| read_faqs | FAQs | faqs |
| read_email_logs | Logs emails | email_logs |
| read_cta_clicks | Clics CTA | cta_clicks |
| read_atelier_inscriptions | Inscriptions ateliers | atelier_inscriptions |
| read_livreblanc_inscriptions | Téléchargements LB | leads (source=livre-blanc) |

### ÉCRITURE COCKPIT (24 outils)
| Outil | Description | Tables/Sources |
|-------|-------------|----------------|
| create_lead | Création lead | leads |
| update_lead | Mise à jour lead | leads |
| delete_lead | Suppression lead | leads |
| create_lead_contact | Ajout contact lead | lead_contacts |
| update_lead_contact | MAJ contact | lead_contacts |
| create_opportunity | Nouvelle opportunité | opportunities |
| update_opportunity | MAJ opportunité/stage | opportunities |
| create_project | Nouveau projet | projects |
| update_project | MAJ projet | projects |
| create_project_note | Note sur projet | project_notes |
| create_partner | Nouveau partenaire | partners |
| update_partner | MAJ partenaire | partners |
| delete_partner | Suppression partenaire | partners |
| create_task | Nouvelle tâche | tasks |
| update_task | MAJ/complétion tâche | tasks |
| create_booking | Nouveau RDV | bookings |
| create_document | Génération document | generated_documents |
| update_document | MAJ document | generated_documents |
| create_specification | Nouveau CDC | specifications |
| update_specification | MAJ CDC | specifications |
| create_meeting_note | Note de réunion | meeting_notes |
| link_entities | Liaison entités | entity_name_references |
| save_memory | Sauvegarde mémoire | ai_agent_memory |
| log_activity | Log activité | activity_log |

### ÉCRITURE ADMIN (12 outils)
| Outil | Description | Tables/Sources |
|-------|-------------|----------------|
| create_article | Création article | articles |
| update_article | MAJ article | articles |
| delete_article | Suppression article | articles |
| create_newsletter | Création newsletter | articles (newsletter) |
| approve_comment | Validation commentaire | comments |
| delete_comment | Suppression commentaire | comments |
| create_faq | Création FAQ | faqs |
| update_faq | MAJ FAQ | faqs |
| schedule_publish | Publication programmée | articles |
| update_synthesis | MAJ synthèse IA | leads/projects/partners |
| create_brochure | Création brochure | brochures |
| update_brochure | MAJ brochure | brochures |

### PARTENAIRES (6 outils)
| Outil | Description | Tables/Sources |
|-------|-------------|----------------|
| create_partner | Nouveau partenaire | partners |
| update_partner | MAJ partenaire | partners |
| delete_partner | Suppression partenaire | partners |
| link_partner_to_lead | Liaison lead-partenaire | lead_partners |
| link_partner_to_project | Liaison projet-partenaire | project_partners |
| link_partner_to_document | Liaison document-partenaire | document_partners |

### TELEGRAM v3 (6 outils)
| Outil | Description | Tables/Sources |
|-------|-------------|----------------|
| telegram_inline_buttons | Boutons réponse rapide | API Telegram |
| telegram_stats | Tracking messages/erreurs | telegram_stats |
| telegram_image_upload | Import images | cockpit_uploads |
| telegram_document_upload | Import PDF/docs | cockpit_uploads |
| telegram_contextual_linking | Liaison auto via caption | entity_name_references |
| telegram_reminder | Commande /rappel | telegram_reminders |

### EMAIL (6 outils)
| Outil | Description | Edge Function |
|-------|-------------|---------------|
| send_lead_notification | Notif nouveau lead | send-lead-notification |
| send_user_confirmation | Confirmation utilisateur | send-user-confirmation |
| send_atelier_confirmation | Confirmation atelier | send-atelier-confirmation |
| send_form_notification | Notif formulaire | send-form-notification |
| send_followup_email | Email de relance | generate-followup-email |
| send_newsletter | Envoi newsletter | send-newsletter |

### IA/RAG (14 outils)
| Outil | Description | Edge Function |
|-------|-------------|---------------|
| generate_document | Génération IA document | generate-document |
| generate_docx | Export Word | generate-docx |
| generate_embeddings | Vectorisation contenu | generate-embeddings |
| search_embeddings | Recherche sémantique RAG | search-embeddings |
| synthesize_entity | Synthèse IA 360° | synthesize-entity-documents |
| extract_entities | Extraction entités texte | extract-entities |
| transcribe_audio | Transcription Whisper | process-voice-transcription |
| generate_faq | Génération FAQ | generate-faq |
| suggest_tags | Suggestion tags IA | suggest-tags |
| enrich_seo | Enrichissement SEO | enrich-content-seo |
| analyze_comments | Analyse commentaires | analyze-comments-for-faq |
| generate_article_gpt | Génération article GPT | generate-article-gpt |
| generate_article_claude | Génération article Claude | generate-article-claude |
| enrich_all_resources | Enrichissement batch | enrich-all-resources |

### ANALYTICS (6 outils)
| Outil | Description | Source |
|-------|-------------|--------|
| read_cta_analytics | Stats CTA | cta_clicks |
| read_form_analytics | Stats formulaires | form_analytics |
| read_performance | Métriques perf | performance_metrics |
| read_article_views | Vues articles | article_views |
| check_conversion | Taux conversion | check-cta-conversion |
| detect_anomalies | Détection anomalies | detect-anomalies |

### SYSTÈME (12 outils)
| Outil | Description | Edge Function |
|-------|-------------|---------------|
| pappers_lookup | Enrichissement entreprise | pappers-lookup |
| calendar_sync | Sync Google Calendar | sync-google-calendar |
| push_calendar | Push vers GCal | push-to-google-calendar |
| create_backup | Backup BDD | create-database-backup |
| restore_backup | Restauration backup | restore-backup |
| verify_backup | Vérification intégrité | verify-backup-integrity |
| generate_sitemap | Génération sitemap | generate-sitemap |
| publish_scheduled | Publication programmée | publish-scheduled-articles |
| telegram_webhook | Commandes Telegram | telegram-webhook |
| security_alert | Alerte sécurité | send-security-alert |
| get_stale_syntheses | Synthèses obsolètes | views |
| get_ai_dashboard_metrics | Métriques IA temps réel | views |

---

## EDGE FUNCTIONS (46 déployées)

### Connectées à l''Agent IA (24)
- ai-agent-orchestrator ⭐ Orchestrateur principal
- synthesize-entity-documents
- extract-entities
- generate-document
- generate-docx
- generate-embeddings
- search-embeddings
- process-voice-transcription
- transcribe-audio-chunk
- create-voice-transcription
- serve-transcription-audio
- generate-faq
- suggest-tags
- enrich-content-seo
- enrich-all-resources
- analyze-comments-for-faq
- generate-followup-email
- pappers-lookup
- calendar-booking
- sync-google-calendar
- push-to-google-calendar
- telegram-webhook ⭐ Telegram v3
- detect-anomalies
- check-performance-threshold

### Emails (7)
- send-lead-notification
- send-user-confirmation
- send-atelier-confirmation
- send-form-notification
- send-newsletter
- send-brevo-campaign
- send-security-alert

### Génération Contenu (3)
- generate-article-gpt
- generate-article-claude
- notify-new-comment

### Système (12)
- generate-sitemap
- publish-scheduled-articles
- create-database-backup
- restore-backup
- verify-backup-integrity
- record-lighthouse-metrics
- process-uploaded-file
- convert-to-pdf
- check-login-attempt
- check-cta-conversion

---

## TABLES IA (8)

| Table | Rôle | Champs Clés |
|-------|------|-------------|
| ai_prompts | Prompts système | slug, system_prompt, model_config |
| ai_agent_memory | Mémoire persistante 14j | memory_type, content, embedding |
| keyword_aliases | Dictionnaire phonétique | canonical_name, alias, phonetic_key |
| resource_embeddings | Base RAG vectorielle | embedding, content_chunk, resource_type |
| vectorization_status | État indexation | resource_type, indexed_resources |
| activity_log | Journal IA | is_ai_generated, ai_metadata |
| telegram_stats | Stats Telegram | message_count, error_count, avg_response_time |
| telegram_reminders | Rappels programmés | reminder_text, due_at, status |

---

## TABLES COCKPIT PRINCIPALES (18)

| Table | Rôle |
|-------|------|
| leads | Prospects/clients |
| lead_contacts | Contacts lead |
| lead_partners | Liaisons lead-partenaire |
| opportunities | Pipeline commercial |
| projects | Projets en cours |
| project_notes | Notes projets |
| project_partners | Liaisons projet-partenaire |
| partners | Partenaires/prestataires |
| generated_documents | Devis, CDC, propositions |
| document_partners | Liaisons document-partenaire |
| specifications | Cahiers des charges |
| voice_transcriptions | Transcriptions audio |
| tasks | Tâches |
| meeting_notes | Notes de réunion |
| bookings | Rendez-vous |
| cockpit_uploads | Fichiers uploadés |
| entity_context_notes | Notes contextuelles |
| entity_name_references | Liaisons entités |

---

## RÈGLES D''ÉVOLUTIVITÉ

1. Nouvelle page admin → Ajouter mapping dans ui-navigation
2. Nouvelle page cockpit → Ajouter dans cockpit-master-assistant
3. Nouvel outil → Documenter ici + ui-navigation
4. Nouvelle Edge Function → Ajouter dans liste + mapping prompts
5. Nouveau canal (ex: WhatsApp) → Dupliquer pattern Telegram',
    version = version + 1,
    updated_at = now()
WHERE slug = 'tools-reference';

-- 2. Mise à jour ui-navigation
UPDATE public.ai_prompts
SET system_prompt = '# Navigation UI Admin/Cockpit - Référentiel Complet v6.22

Mis à jour : 04/01/2026

## ARCHITECTURE CENTRALE
/admin/ai-prompts est le CENTRE DE CONTRÔLE IA unique.
Tous les modules Admin et Cockpit sont pilotables via cet agent.

## CANAUX DE CONTRÔLE
1. **Telegram** : @IArche_bot (webhook telegram-webhook v3)
   - Boutons inline après actions
   - Upload images/documents
   - Commande /rappel
2. **Chat Cockpit** : /cockpit/chatbot (cockpit-master-assistant)
3. **API directe** : ai-agent-orchestrator

---

# MODULE ADMIN (Gestion de contenu & CRM publique)

## Dashboard & Analytics
| Route | Table(s) | Actions IA | Outils |
|-------|----------|------------|--------|
| /admin | - | Vue d''ensemble | - |
| /admin/advanced-stats | article_views, cta_clicks, leads | Lecture stats | read_article_views, read_cta_stats |
| /admin/performance-monitoring | performance_metrics | Lecture métriques Lighthouse | read_performance |
| /admin/cta-analytics | cta_clicks | Analyse conversions | read_cta_clicks |

## Contenu Éditorial
| Route | Table(s) | Actions IA | Outils |
|-------|----------|------------|--------|
| /admin/articles | articles (resource_type=article) | CRUD, SEO, FAQ auto | create_article, update_article, enrich_seo, generate_faq |
| /admin/actualites | articles (resource_type=actualite) | CRUD, scheduling | create_article, schedule_publish |
| /admin/cas-clients | articles (resource_type=cas-client) | CRUD | create_article |
| /admin/livres-blancs | articles (resource_type=livre-blanc) | CRUD, upload PDF | create_article, upload_file |
| /admin/ateliers-webinaires | articles (resource_type=atelier-webinaire) | CRUD, inscriptions | create_article, manage_event |
| /admin/solutions | articles (resource_type=solution) | CRUD, matching | create_article, solution_matching |

## Métadonnées Contenu
| Route | Table(s) | Actions IA | Outils |
|-------|----------|------------|--------|
| /admin/faqs | faqs, articles | Génération auto | generate_faq, analyze_comments |
| /admin/categories | categories, article_categories | CRUD | - |
| /admin/tags | tags, article_tags | Suggestion auto | suggest_tags |
| /admin/brochures | brochures | CRUD, export PDF | - |

## CRM Admin (Sources publiques)
| Route | Table(s) | Actions IA | Outils |
|-------|----------|------------|--------|
| /admin/leads | leads | CRUD, scoring, qualification | create_lead, score_lead, qualify_lead |
| /admin/rendez-vous | bookings, booking_types | CRUD, sync Google Calendar | create_booking, sync_calendar |
| /admin/contacts | contacts | Lecture | - |
| /admin/livre-blanc-inscriptions | leads (source=livre-blanc) | Lecture | - |
| /admin/atelier-inscriptions | atelier_inscriptions, leads | Lecture, export | - |
| /admin/comments | comments | Modération, analyse FAQ | approve_comment, analyze_for_faq |

## Formulaires
| Route | Table(s) | Actions IA | Outils |
|-------|----------|------------|--------|
| /admin/formulaires | forms | CRUD builder | - |
| /admin/form-responses | form_responses, form_analytics | Lecture, export | - |

## Communication
| Route | Table(s) | Actions IA | Outils |
|-------|----------|------------|--------|
| /admin/newsletters | articles (resource_type=newsletter) | Génération, envoi | send_newsletter, send_brevo_campaign |
| /admin/redacnews | ai_prompts | Assistant rédaction | generate_article_claude, generate_article_gpt |
| /admin/emails | email_logs, email_configurations | Lecture logs, config | - |

## Médias & Design
| Route | Table(s) | Actions IA | Outils |
|-------|----------|------------|--------|
| /admin/medias | media_templates | Génération visuels | - |

## Centre de Contrôle IA
| Route | Table(s) | Actions IA | Outils |
|-------|----------|------------|--------|
| /admin/ai-prompts | ai_prompts, llm_models, keyword_aliases, ai_agent_memory, resource_embeddings, telegram_stats | CONTRÔLE TOTAL | Tous les 100+ outils IA |

---

# MODULE COCKPIT (CRM Commercial Privé)

## Dashboard & Pipeline
| Route | Table(s) | Actions IA | Outils |
|-------|----------|------------|--------|
| /cockpit | workspaces, activity_log | Vue dashboard | - |
| /cockpit/pipeline | opportunities | Kanban, mouvements | update_opportunity, move_stage |
| /cockpit/analytics | opportunities, projects, bookings | Insights IA | analytics_insights |

## Entités CRM (100% CRUD)
| Route | Table(s) | Actions IA | Outils |
|-------|----------|------------|--------|
| /cockpit/leads | leads, lead_contacts, lead_partners | CRUD complet, scoring, enrichissement Pappers | create_lead, update_lead, delete_lead, enrich_lead, pappers_lookup |
| /cockpit/leads/:id | leads + all linked | Synthèse IA 360° | synthesize_entity |
| /cockpit/projects | projects, project_partners, project_notes | CRUD complet, suivi | create_project, update_project |
| /cockpit/projects/:id | projects + all linked | Synthèse IA 360° | synthesize_entity |
| /cockpit/solutions | articles (solutions) | Matching, pipeline | solution_matching |
| /cockpit/solutions/:id | articles + solution_leads | Synthèse IA 360° | synthesize_entity |
| /cockpit/partenaires | partners | CRUD complet, collaboration | create_partner, update_partner, delete_partner |
| /cockpit/partenaires/:id | partners + all linked | Synthèse IA 360° | synthesize_entity |

## Documents & Fichiers
| Route | Table(s) | Actions IA | Outils |
|-------|----------|------------|--------|
| /cockpit/upload | cockpit_uploads | Upload, OCR, analyse | upload_file, process_file, extract_entities |
| /cockpit/documents | generated_documents, specifications | Génération Devis/CDC/Propositions | generate_document, generate_docx |
| /cockpit/documents/:id | generated_documents + all linked | Synthèse IA 360° | synthesize_entity |

## Audio & Transcriptions
| Route | Table(s) | Actions IA | Outils |
|-------|----------|------------|--------|
| /cockpit/transcriptions | voice_transcriptions | Upload, transcription Whisper, synthèse | create_transcription, transcribe_audio, process_transcription |
| /cockpit/transcriptions/:id | voice_transcriptions + all linked | Synthèse IA 360° + extraction entités | synthesize_entity, extract_entities |

## Agenda
| Route | Table(s) | Actions IA | Outils |
|-------|----------|------------|--------|
| /cockpit/agenda | bookings, tasks, telegram_reminders | CRUD RDV, sync Google, rappels | create_booking, create_task, sync_calendar |

---

# TELEGRAM v3 - FONCTIONNALITÉS

## Commandes Disponibles
| Commande | Action | Exemple |
|----------|--------|---------|
| /rappel | Créer rappel | /rappel demain 14h appeler client |
| Message texte | Traitement IA | "Crée un lead pour Acme Corp" |
| Photo | Upload image → cockpit_uploads | + Caption optionnel |
| Document | Upload PDF → cockpit_uploads | + Caption optionnel |
| Audio/Voix | Transcription → voice_transcriptions | + Liaison auto si caption |

## Boutons Inline
Après chaque action réussie, des boutons de réponse rapide :
- ✅ Confirmer
- 📝 Modifier
- 🔗 Voir dans Cockpit
- ❌ Annuler

---

# RÈGLES D''ÉVOLUTIVITÉ

## Ajout nouvelle page
1. Ajouter entrée dans ce référentiel (ui-navigation)
2. Créer prompt secondaire si logique IA spécifique
3. Déclarer outils dans tools-reference
4. L''agent s''adapte automatiquement

## Modification page existante
1. Mettre à jour ce référentiel
2. Les prompts secondaires suivent dynamiquement

## Canaux de contrôle
Tous les canaux utilisent ce référentiel comme source de vérité :
- Telegram : Lit ui-navigation pour routing commandes + boutons inline
- Chat Cockpit : Utilise ui-navigation pour navigation contextuelle
- API : Valide actions contre ui-navigation',
    version = version + 1,
    updated_at = now()
WHERE slug = 'ui-navigation';