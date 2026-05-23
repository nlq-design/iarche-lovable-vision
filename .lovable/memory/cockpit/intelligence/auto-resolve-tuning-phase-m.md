---
name: Phase IA-2M Auto-resolve & Workspace Auto-tuning
description: Auto-résolution sémantique des alertes content_gap (cosine ≥0.80, zéro LLM) + seuils auto-action adaptatifs par workspace via recompute_workspace_thresholds (plage 0.75-0.95, recalc hebdo lundi 03:00 UTC). compute_action_confidence lit désormais workspace_ai_thresholds. Dashboard /admin/observability/ai ajoute les sections « Lacunes auto-résolues » et « Seuils IA adaptatifs ». Crons : auto-resolve */30, recompute lundi 03h.
type: feature
---

## Phase IA-2M — Self-Healing & Adaptive Tuning

### M1 — Auto-resolve content_gap
- `auto_resolve_content_gaps(_threshold float DEFAULT 0.80)` : pour chaque alerte `content_gap` non résolue, récupère l'embedding existant dans `public_rag_unanswered` (clé `normalized_query`), cherche le meilleur match dans `resource_embeddings is_public=true`, ferme l'alerte si cosine ≥ seuil avec `ai_metadata.auto_resolved=true` + `resolution_match`.
- Cron `auto-resolve-content-gaps` toutes les 30 min.
- Zéro coût LLM (réutilise embeddings existants).

### M2 — Workspace auto-tuning
- Table `workspace_ai_thresholds(workspace_id PK, auto_action_confidence_threshold 0.50-0.99, rag_similarity_threshold 0.20-0.90, last_metrics jsonb)`.
- `recompute_workspace_thresholds()` : sur 30j d'`action_proposals` send_email, calcule cancel_rate sur auto_execute_status. Ajustement ±0.02 :
  - cancel_rate > 20 % → seuil +0.02 (cap 0.95).
  - cancel_rate < 5 % et N ≥ 10 → seuil -0.02 (floor 0.75).
  - Minimum 5 auto-exec pour déclencher recalcul.
- `compute_action_confidence` lit `workspace_ai_thresholds.auto_action_confidence_threshold` (fallback 0.85) et l'inscrit dans `confidence_reasons.threshold_applied`.
- Cron `recompute-workspace-ai-thresholds` lundi 03:00 UTC.

### Dashboard `/admin/observability/ai`
- Section « Lacunes auto-résolues (30j) » : titre + similarité + article couvrant.
- Section « Seuils IA adaptatifs par espace » : seuils courants, taux d'annulation, taille d'échantillon.

### Sécurité
- RLS : `workspace_ai_thresholds` lecture admin OU membre du workspace ; écriture via SECURITY DEFINER uniquement.
