---
name: Phase H Predictive Scoring v1
description: Scoring quantitatif heuristique churn/conversion 14j sur lead_predictions, cron 06:30, injection brief Telegram + widget Cockpit
type: feature
---
# Phase H — Sentinel Predictive Scoring v1

## Architecture
- **Table** `lead_predictions(workspace_id, lead_id UNIQUE, churn_risk_14d 0-100, conversion_proba_14d 0-100, signals jsonb, model_version='heuristic-v1', computed_at)`
- **Fonction SQL** `compute_lead_predictions(_workspace_id uuid DEFAULT NULL)` SECURITY DEFINER — heuristique pondérée, zéro LLM, UPSERT batch.
- **Vue** `top_predictive_alerts` (SECURITY INVOKER) — top 5 churn (≥50) + top 5 conversion (≥60) par workspace.
- **Cron** `compute-lead-predictions-daily` 06:30 UTC (avant brief 07:00).

## Pondération heuristique (v1)
- Churn 14j : inactivité (40/28/15), BANT≥70 sans opp (+25), days_in_stage>21 (+20/12), activité 7j=0 (+15).
- Conversion 14j : BANT×0.35 + max_opp_proba×0.30 + activité_7j (20/12) + familiarity×0.15.

## Intégration UX
- `auto-daily-intelligence` fetch `top_predictive_alerts`, stocke dans `raw_data.predictive_alerts`, injecte top 2 churn + top 2 conversion dans le brief Telegram.
- Widget Cockpit `PredictiveScoringWidget` (DB direct, staleTime 30 min) — placé sous `PredictionsWidget` (LLM qualitatif).

## Run initial
43 leads scorés, 5 churn ≥75% détectés, 0 conversion ≥60% (normal sur dataset actuel).

## Évolutions v2 possibles
- Train ML léger (régression logistique) sur historique closed_won/closed_lost.
- Calibration des seuils par workspace.
- Feedback loop : marquer prédictions confirmées/infirmées.
