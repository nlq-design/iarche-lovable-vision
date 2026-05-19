---
name: Cross-Signals Engine v2.4
description: Découverte de connexions non-triviales entre entités CRM via embeddings (cosine similarity) — pré-calcul nocturne dans ai_cross_signals
type: feature
---
# Cross-Signal Engine (Vague 2 — Étape 2.4)

## Objectif
Remplacer les agrégations SQL triviales par des découvertes croisées sémantiques entre entités CRM (lead/partner/solution/opportunity) via embeddings vector(1536).

## Architecture
- **Edge fn**: `cockpit-cross-signal-engine` — cron quotidien 06:00 UTC (jobname `daily-cross-signal-engine`).
- **Table**: `ai_cross_signals` (workspace_id, signal_type, title, narrative, score, entities JSONB, severity, status, evidence, expires_at TTL 7j).
- **RPC**:
  - `match_partners_for_lead(lead_id, workspace_id, limit)` — top-N partners par cosine similarity sur embedding du lead.
  - `match_solutions_for_lead(lead_id, limit)` — top-N solutions globales.
  - Both SECURITY DEFINER avec `search_path = public, extensions` (sinon opérateur `<=>` introuvable).

## Règles détectées
1. **opportunity_acceleration**: opp stagnante >7j + partner pertinent (similarity ≥0.55). Score = sim × log10(value/100) × min(days/7, 3).
2. **solution_match**: lead avec solution recommandée (similarity ≥0.60).
3. **lead_partner_competence**: lead chaud sans opp + partner match.

## Intégration LLM
- `cockpit-ai-copilot` lit top-10 `ai_cross_signals` actifs non expirés, injecte bloc `--- CONNEXIONS CROISÉES ---` dans le contexte.
- Prompt mandate citation explicite ≥2 entités sources avec leur rôle.
- Expose `raw.cross_signals_db` au front pour affichage direct.

## UI
- `CrossSignalsWidget` refactor: fusionne signaux LLM (`intelligence.cross_signals`) + signaux DB embeddings (`raw.cross_signals_db`), avec icône Network pour distinguer les sources. Affichage du rôle de chaque entité.

## Limitations
- Voice_transcription embeddings = 0 (à activer via `useVectorization` pour enrichir le matching).
- Seuil similarité 0.55 conservateur — ajustable selon volume embeddings.
