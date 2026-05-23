---
name: Sentinel v3 Widget + Router Auto-Learning (E+F)
description: Phase E (UI Sentinel v3 + 4 PROPOSAL_TEMPLATES) et Phase F (auto-apprentissage des ancres router via fallbacks LLM)
type: feature
---

# Phase E — UI Sentinel v3 + Action Artifacts

## Widget AISentinelNotification
- `categoryLabels` étendu pour exposer les 7 catégories réellement émises par `ai-sentinel` : incomplete, inconsistency, inactivity, risk, duplicate, overdue, imbalance.
- Type `SentinelAlert.category` dans `useAISentinel.ts` aligné sur la même union.

## PROPOSAL_TEMPLATES ajoutés (ai-sentinel/index.ts)
4 templates auto-générant des drafts éditables (`ai_actions` / `action_proposals`) pour les 4 règles Sentinel v3 :
- `risk_churn_hot_lead` → `send_email` (email de réengagement).
- `risk_opportunity_dormant` → `create_note` (script de re-qualification 3 questions).
- `risk_pipeline_stage_regression` → `create_task` (diagnostic d'objection, priorité high, due 1j).
- `risk_over_solicitation` → `create_task` (pause 14j + change de canal, due 0j).

Anti-dedup standard 48h sur `action_label` (logique existante v2.1).

# Phase F — Auto-apprentissage du Router Sémantique

## Logging des fallbacks
- Nouvelle table `ai_intent_router_fallbacks` (query_text, query_normalized, intent_classified, similarity_best).
- `_shared/intent-router.ts` :
  - `classifyIntentSemantic` retourne désormais TOUJOURS le top match (seuil 0 côté RPC), le filtrage 0.75 reste côté caller.
  - Après fallback LLM, `logFallback()` insère fire-and-forget la requête (la similarité best mesurée par l'embedding) dans la table.
- RLS : admin SELECT only, service_role insère sans contrainte.

## Seeder automatique
- Edge function `auto-seed-intent-anchors/index.ts`.
- RPC `get_recurring_intent_fallbacks(min_count=3, since_days=7)` agrège les requêtes récurrentes.
- Filtres : intent ∈ {crm_query, doc_generation, analysis, vivier, general}, avg_similarity ≤ 0.70 (sinon trop proche d'une ancre existante → bruit), max 25 nouvelles ancres / run.
- Embed via `openai/text-embedding-3-small` (1536d), insert dans `ai_intent_anchors`.
- Nettoyage : purge des fallbacks >30j à chaque run.

## Cron
- pg_cron `auto-seed-intent-anchors-daily` planifié `17 3 * * *` (UTC).

## ROI attendu
- Hit rate sémantique mesuré ~70% → ~90% en 2 semaines (estimation basée sur la fréquence empirique des requêtes Cockpit).
- Réduction supplémentaire latence intent : -3.8s sur les requêtes apprises (économie LLM classifier 4s timeout).
- Économie tokens : -10 input tokens / requête apprise (CLASSIFIER_SYSTEM non envoyé).

## Tables / Fonctions touchées
- DB : `ai_intent_router_fallbacks` (nouvelle), RPC `get_recurring_intent_fallbacks`, cron job id=13.
- Edge : `_shared/intent-router.ts`, `ai-sentinel/index.ts`, `auto-seed-intent-anchors` (nouvelle).
- UI : `useAISentinel.ts`, `AISentinelNotification.tsx`.
