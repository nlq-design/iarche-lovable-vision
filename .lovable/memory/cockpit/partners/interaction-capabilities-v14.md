# Memory: cockpit/partners/interaction-capabilities-v14
Updated: now

Capacités d'interaction des partenaires (v14.0) : 
- Leads & Projets : Création autorisée par le partenaire, en plus de la lecture des entités assignées.
- Transcriptions : Création autorisée pour les leads, projets ou solutions auxquels le partenaire est lié. Lecture, modification et suppression de leurs propres transcriptions uniquement.
- Solutions : Lecture seule (création interdite).
- Commentaires : Ajout et gestion de leurs propres commentaires sur les projets, leads et transcriptions (table 'partner_comments').
- Saisie de temps : Déclaration et gestion de leurs propres heures par mission/lead (table 'partner_time_entries').
- Documents, RDV, Annonces, Factures : Lecture seule (factures créées par l'admin).
- RLS : Les partenaires peuvent modifier/supprimer uniquement les données qu'ils ont créées eux-mêmes.
