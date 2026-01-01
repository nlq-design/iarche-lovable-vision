-- Mise à jour complète des prompts UI Navigation et Tools Reference

UPDATE public.ai_prompts
SET system_prompt = '## NAVIGATION UI IARCHE v3.2

### ADMIN (/admin) - Gestion de contenu et organisation

#### TABLEAU DE BORD
- `/admin` → Dashboard principal : stats, graphiques, notifications récentes

#### COMMERCIAL (Section prioritaire)
- `/admin/leads` → Liste leads qualifiés, filtres, export, actions rapides
- `/admin/contacts` → Messages formulaire contact, détail modal
- `/admin/rendez-vous` → Réservations calendrier, statuts, Google Calendar sync
- `/admin/atelier-inscriptions` → Inscriptions ateliers/webinaires
- `/admin/livre-blancs-inscriptions` → Téléchargements livres blancs

#### CONTENU
- `/admin/articles` → Articles de blog (resource_type=article)
- `/admin/actualites` → Actualités (resource_type=actualite)
- `/admin/solutions` → Pages solutions (resource_type=solution)
- `/admin/cas-clients` → Études de cas (resource_type=cas-client)
- `/admin/livres-blancs` → Ressources téléchargeables (resource_type=livre-blanc)
- `/admin/ateliers-webinaires` → Événements (resource_type=atelier-webinaire)
- `/admin/faqs` → FAQ par article, génération IA
- `/admin/comments` → Modération commentaires
- `/admin/categories` → Catégories articles
- `/admin/tags` → Tags articles

#### ORGANISATION
- `/admin/brochures` → Éditeur brochures multi-sections, export PDF
- `/admin/formulaires` → Créateur formulaires drag-drop
- `/admin/form-responses` → Réponses formulaires, export

#### ENGAGEMENT
- `/admin/newsletters` → Campagnes email, éditeur Brevo HTML
- `/admin/emails` → Configuration emails transactionnels

#### MÉDIAS & CHARTE
- `/admin/medias` → Générateur visuels (stories, posts, carrousels, présentations)
- `/admin/medias/logo` → Éditeur logo
- `/admin/medias/thumbnail` → Générateur miniatures
- `/admin/medias/banner` → Créateur bannières
- `/admin/medias/signature` → Signatures email
- `/admin/medias/qr-code` → Générateur QR codes
- `/admin/medias/og-image` → Images Open Graph
- `/admin/medias/favicon` → Éditeur favicon
- `/admin/medias/header-doc` → En-têtes documents
- `/admin/medias/header-email` → En-têtes emails
- `/admin/medias/footer-email` → Pieds emails
- `/admin/medias/charte` → Charte graphique complète
- `/admin/medias/assets` → Génération assets

#### SÉCURITÉ & SYSTÈME
- `/admin/security` → Dashboard sécurité, scans, alertes
- `/admin/audit-logs` → Journal audit actions admin
- `/admin/backups` → Sauvegardes base, restauration
- `/admin/performance` → Métriques Lighthouse, alertes
- `/admin/advanced-stats` → Analytics avancées

#### IA & AUTOMATISATION
- `/admin/ai-prompts` → Configuration agent IA, prompts, RAG, mémoire, modèles LLM
- `/admin/redacia` → Assistant rédaction IA articles
- `/admin/redac-news` → Génération newsletters IA

---

### COCKPIT (/cockpit) - CRM Commercial

#### VUE D''ENSEMBLE
- `/cockpit` → Dashboard commercial : pipeline, tâches, activité récente

#### PIPELINE COMMERCIAL
- `/cockpit/leads` → Gestion leads, scoring, qualification
- `/cockpit/leads/:id` → Fiche lead détaillée, historique, actions
- `/cockpit/pipeline` → Kanban opportunités (stages: lead→contact→qualifié→proposition→négociation→won/lost)
- `/cockpit/projects` → Projets gagnés, suivi, timeline
- `/cockpit/projects/:id` → Fiche projet, documents, notes

#### SOLUTIONS & OFFRES
- `/cockpit/solutions` → Catalogue solutions IArche
- `/cockpit/solutions/:slug` → Détail solution, leads associés

#### PRODUCTIVITÉ
- `/cockpit/documents` → Devis, CDC, propositions - génération IA
- `/cockpit/transcriptions` → Transcriptions vocales, résumés IA
- `/cockpit/uploads` → Fichiers uploadés, partage sécurisé
- `/cockpit/agenda` → Calendrier RDV, sync Google

#### ANALYTICS
- `/cockpit/analytics` → Métriques commerciales, conversion, valeur pipeline

---

### ACTIONS PRINCIPALES PAR CONTEXTE

#### Créer du contenu
- Bouton "Nouveau" ou "+" dans chaque liste admin
- Éditeur Quill pour contenu riche
- Upload images via bibliothèque média
- Sauvegarde brouillon automatique

#### Gérer les leads
- Clic sur lead → Sheet détail avec onglets
- Actions : qualifier, créer opportunité, planifier RDV, envoyer email
- Scoring automatique basé sur interactions

#### Générer des documents
- `/cockpit/documents` → "Nouveau document"
- Sources : texte libre, transcription, projet, lead, solution
- IA génère puis édition manuelle
- Export HTML responsive ou DOCX charté

#### Configurer l''IA
- `/admin/ai-prompts` → 3 onglets : Prompts, Génération docs, RAG
- Dictionnaire phonétique pour transcriptions
- Mémoire agent avec TTL configurable',
    updated_at = now()
WHERE slug = 'ui-navigation';

UPDATE public.ai_prompts
SET system_prompt = '## RÉFÉRENTIEL OUTILS AGENT IA v3.2

### OUTILS LECTURE COCKPIT (13)
| Outil | Description | Paramètres |
|-------|-------------|------------|
| get_leads | Liste leads avec filtres | status?, source?, limit? |
| get_lead_detail | Fiche lead complète | lead_id |
| get_opportunities | Liste opportunités | stage?, limit? |
| get_opportunity_detail | Détail opportunité | opportunity_id |
| get_projects | Liste projets | status?, limit? |
| get_project_detail | Fiche projet | project_id |
| get_tasks | Tâches utilisateur | status?, entity_type?, limit? |
| get_bookings | RDV planifiés | status?, date_range? |
| get_meeting_notes | Notes de réunion | entity_type?, entity_id? |
| get_documents | Documents générés | type?, status? |
| get_transcriptions | Transcriptions vocales | status?, limit? |
| get_activity_log | Journal activités | entity_type?, limit? |
| get_pending_ai_notifications | Notifications non traitées | limit? |

### OUTILS LECTURE ADMIN (14)
| Outil | Description | Paramètres |
|-------|-------------|------------|
| get_articles | Liste articles | resource_type?, published?, limit? |
| get_article_detail | Détail article | article_id ou slug |
| get_solutions | Catalogue solutions | published? |
| get_categories | Catégories | - |
| get_tags | Tags | - |
| get_comments | Commentaires | approved?, article_id? |
| get_forms | Formulaires | is_active? |
| get_form_responses | Réponses formulaire | form_id |
| get_brochures | Brochures | published? |
| get_newsletters | Newsletters | status? |
| get_contacts | Messages contact | limit? |
| get_audit_logs | Journal audit | action_type?, limit? |
| get_performance_metrics | Métriques perf | date_range? |
| search_resources | Recherche sémantique RAG | query, types?, limit? |

### OUTILS ÉCRITURE COCKPIT (12)
| Outil | Description | Paramètres requis |
|-------|-------------|-------------------|
| create_lead | Créer lead | email, name, source |
| update_lead | Modifier lead | lead_id, fields |
| create_opportunity | Créer opportunité | lead_id, title |
| update_opportunity | Modifier opportunité | opportunity_id, fields |
| create_project | Créer projet | opportunity_id?, name |
| update_project | Modifier projet | project_id, fields |
| create_task | Créer tâche | title, entity_type, entity_id |
| update_task | Modifier tâche | task_id, fields |
| create_booking | Planifier RDV | name, email, start_time, booking_type_id |
| create_meeting_note | Créer note réunion | booking_id?, notes |
| generate_document | Générer doc IA | type, source_type, source_content |
| create_transcription | Lancer transcription | audio_url |

### OUTILS ÉCRITURE ADMIN (9)
| Outil | Description | Paramètres requis |
|-------|-------------|-------------------|
| create_article | Créer article | title, slug, resource_type, content |
| update_article | Modifier article | article_id, fields |
| publish_article | Publier article | article_id |
| create_comment_reply | Répondre commentaire | comment_id, content |
| approve_comment | Approuver commentaire | comment_id |
| send_newsletter | Envoyer newsletter | newsletter_id |
| create_form | Créer formulaire | title, slug, fields |
| update_form | Modifier formulaire | form_id, fields |
| mark_notifications_reviewed | Marquer notifs lues | notification_ids[] |

---

### EDGE FUNCTIONS (22)

#### Génération & IA
- `ai-agent-orchestrator` → Orchestrateur agent, routing outils
- `generate-article-claude` → Génération article Claude
- `generate-article-gpt` → Génération article GPT
- `generate-document` → Génération devis/CDC/proposition
- `generate-docx` → Export DOCX charté
- `generate-faq` → Génération FAQ automatique
- `generate-followup-email` → Email de suivi IA
- `generate-embeddings` → Vectorisation RAG
- `search-embeddings` → Recherche sémantique
- `enrich-content-seo` → Enrichissement SEO
- `suggest-tags` → Suggestion tags IA

#### Transcription & Audio
- `create-voice-transcription` → Init transcription
- `process-voice-transcription` → Traitement + normalisation

#### Communication
- `send-newsletter` → Envoi newsletter Brevo
- `send-brevo-campaign` → Campagne Brevo
- `send-atelier-confirmation` → Confirmation inscription
- `send-lead-notification` → Notification nouveau lead
- `send-form-notification` → Notification réponse formulaire
- `send-user-confirmation` → Email confirmation utilisateur
- `send-security-alert` → Alerte sécurité

#### Système
- `calendar-booking` → Réservation calendrier
- `push-to-google-calendar` → Sync Google Calendar
- `sync-google-calendar` → Import Google Calendar
- `check-login-attempt` → Sécurité connexion
- `create-database-backup` → Backup base
- `restore-backup` → Restauration backup
- `verify-backup-integrity` → Vérification intégrité
- `publish-scheduled-articles` → Publication programmée
- `generate-sitemap` → Génération sitemap
- `record-lighthouse-metrics` → Métriques Lighthouse
- `check-performance-threshold` → Alertes performance
- `detect-anomalies` → Détection anomalies
- `enrich-all-resources` → Vectorisation batch
- `analyze-comments-for-faq` → Analyse commentaires → FAQ
- `check-cta-conversion` → Tracking conversions
- `track-cta-click` → Tracking clics CTA
- `notify-new-comment` → Notification commentaire
- `process-uploaded-file` → Traitement fichier uploadé
- `telegram-webhook` → Webhook Telegram

---

### TABLES IA (6)

| Table | Usage | Colonnes clés |
|-------|-------|---------------|
| ai_prompts | Prompts système | slug, system_prompt, model_config |
| ai_agent_memory | Mémoire agent | memory_type, content, embedding, expires_at |
| resource_embeddings | Vecteurs RAG | resource_type, content_chunk, embedding |
| keyword_aliases | Dictionnaire phonétique | alias, canonical_name, phonetic_key |
| llm_models | Catalogue modèles | provider, model_id, category, is_active |
| activity_log | Journal transversal | entity_type, activity_type, pending_ai_review |

---

### RÈGLES D''EXÉCUTION

1. **Validation pré-exécution** : Chaque outil vérifie les champs requis avant exécution
2. **Exécution directe** : Pas de demande de confirmation répétitive
3. **Fallback gracieux** : Retour erreur structurée si paramètre manquant
4. **Logging automatique** : Toute action écrite génère une entrée activity_log
5. **Notifications proactives** : pending_ai_review=true déclenche notification agent',
    updated_at = now()
WHERE slug = 'tools-reference';