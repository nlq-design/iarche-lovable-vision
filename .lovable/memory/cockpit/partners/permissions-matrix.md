# Memory: cockpit/partners/permissions-matrix
Updated: now

Capacités d'interaction par entité pour les partenaires (v14.0 - Implémenté) : 
- Leads : Création, lecture, modification et suppression autorisées pour leurs propres entrées (via CreatePartnerLeadDialog).
- Projets : Création, lecture, modification et suppression autorisées pour leurs propres entrées (via CreatePartnerProjectDialog).
- Transcriptions : Création autorisée sur les entités liées (leads/projets/solutions). Gestion complète de leurs propres transcriptions. Page dédiée /espace-partenaire/transcriptions.
- Solutions : Lecture seule (création/modification interdite).
- Commentaires & Temps : Ajout et gestion de leurs propres saisies (tables partner_comments et partner_time_entries) - DB ready, UI pending.
- Documents, RDV, Annonces, Factures : Lecture seule.

Infrastructure technique :
- Colonne 'created_by_partner_id' sur leads, projects, voice_transcriptions
- Triggers auto-link (trigger_auto_link_partner_lead, trigger_auto_link_partner_project)
- Fonctions SECURITY DEFINER : is_lead_partner, is_lead_creator_partner, is_project_partner, is_project_creator_partner, is_transcription_creator_partner, is_solution_partner
- Hook usePartnerMutations pour CRUD partenaire
