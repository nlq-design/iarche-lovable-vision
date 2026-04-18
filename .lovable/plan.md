

# État actuel & décision à prendre

## Contexte (audit 360° clôturé sur D8)

L'audit a révélé que la spec P0-A est implémentée à ~9% en BDD :
- ✅ En BDD : `stage_entered_at` + trigger + `probability`
- 🔴 Spec dormante (0 BDD, 0 code) : BANT (5 col), `loss_reason`, `temperature`+`last_contact_date`, `health_score`+`budget_sold`

Tu avais validé l'**Option A** : pas de migration des 10 colonnes fantômes, juste reconsolidation mémoire stratégique.

## Plan en attente — Reconsolidation mémoire (3 fichiers)

1. **`mem://cockpit/cdc-audit-p0-p3.md`** — Ajouter en tête bloc "Statut réel BDD (audit 16/04/2026)" séparant implémenté vs spec dormante
2. **`mem://index.md`** — Section Core : règle de closure permanente "Aucune feature 'livrée' sans preuve BDD + preuve code (grep). Spec ≠ implémentation." + Section Memories : référence vers nouveau fichier
3. **`mem://cockpit/cdc-p0a-statut-reel-fr.md`** (nouveau) — Snapshot état P0-A post-audit + recommandations métier prioritaires (BANT critique, Loss à 5 perdues, Temperature à ≥50 leads, Health report)

Aucune migration BDD, aucun code projet touché.

## Options de bascule

- **A** — J'exécute la reconsolidation mémoire maintenant (option déjà validée hier, je confirme avant action)
- **B** — On attaque BANT en vrai (la feature à plus haute valeur stratégique selon matrice §3 du dernier verdict) : migration 5 colonnes + composant scoring + intégration Consulte (~2 sessions)
- **C** — On creuse les 2 dernières specs ambiguës restantes : auto-task post-transcription + pre-meeting brief (audit BDD + grep, lecture seule)
- **D** — Autre sujet (tu précises)

