---
name: Auto-Action Confiance Phase J
description: Phase IA-2J — auto_execute calibré par compute_action_confidence + cron process-auto-actions, période de grâce 2h annulable depuis UI
type: feature
---

## Phase IA-2J — Auto-Action Confiance (mai 2026)

### Objectif
Faire passer les emails à très faible risque (nurturing, leads `lead_score < 50`) du flux **Propose → Valide → Envoie** au flux **Propose → Planifie → Annulable 2h → Envoie auto**. Gain ≈ 15-20 min/jour sans dégrader la qualité.

### Heuristique de confiance (zéro LLM)
Fonction `compute_action_confidence(_proposal_id)` — calculée par trigger `AFTER INSERT` sur `action_proposals` quand `action_type='send_email'`.

Score 0-1, somme pondérée :
- destinataire email valide → +0.25
- corps > 40 chars → +0.15
- raisonnement IA > 20 chars → +0.10
- lead identifié + `lead_score < 50` → +0.25
- ≥3 envois `send_email` `executed` historiques sur le workspace → +0.25

**Seuil auto** : ≥ **0.85** → bascule en `auto_execute=true`, `auto_execute_status='scheduled'`, `auto_execute_at = now() + 2h` (période de grâce annulable).

### Schéma (action_proposals)
| Champ | Type | Rôle |
|---|---|---|
| confidence_score | NUMERIC(3,2) | 0-1 |
| confidence_reasons | JSONB | détails de calcul |
| auto_execute_at | TIMESTAMPTZ | échéance |
| auto_execute_status | TEXT | scheduled / cancelled / executed / failed |
| auto_execute_cancelled_at / by | TIMESTAMPTZ / TEXT | trace annulation |

Vue `scheduled_auto_actions` (security_invoker) → propositions prêtes (échéance dépassée).
Index partiel `idx_action_proposals_auto_exec_due` pour scan cron.

### Exécution
- Edge `process-auto-actions` (verify_jwt=false, cron `*/5 * * * *`) lit la vue, délègue à `execute-action-proposal` (logique existante réutilisée), met à jour `auto_execute_status` à `executed`/`failed`.
- RPC `cancel_auto_action(_proposal_id, _reason)` (GRANT authenticated) → bascule en `cancelled` + append `validation_notes`.

### UI
- `ActionProposalsList` : bandeau ambre avec compte à rebours `Clock` + bouton `Ban` "Annuler l'envoi auto" (déclenche `cancelAutoAction`).
- État `cancelled` affiche note italique grise.

### Sécurité / garde-fous
- Ne s'applique **que** à `send_email` ; tout autre type retourne 0 + reason `action_type_not_eligible`.
- Pas de bascule auto sur status ≠ 'pending'.
- Annulation possible jusqu'à exécution réelle (cron lit la vue qui filtre `status='pending'` ET `auto_execute_status='scheduled'`).
- Échec d'exécution → `failed` + trace dans `validation_notes`, ne bloque pas les autres.

### Cron
```
process-auto-actions  */5 * * * *  → POST /functions/v1/process-auto-actions
```

### Évolutions v2 potentielles
- Étendre à `create_note` puis `update_lead` (faible risque).
- Apprendre les seuils par workspace (taux d'annulation > 30% → durcir).
- Bouton "Envoyer maintenant" pour court-circuiter la grâce.
- Notification Telegram à la planification (`auto_execute_status='scheduled'`).
