---
name: Semantic Cache M6
description: Cache hybride fingerprint+ANN 1536d sur cockpit-ai-copilot (suggestNextStep, suggestTasks entity-scoped, intelligenceAggregator). Bouton UI "Prochaine étape IA" sur cartes Pipeline avec badge HIT/MISS. Bandeau cache dans RagDiagnosticsDrawer.
type: feature
---
- Modes câblés : next-step, suggest-tasks (entity-scoped), intelligence (daily brief)
- Fingerprint intelligence : counts (leads/opps/proj/tasks/bookings) + sentinelDigest + crossSignals count + promptVersion + pipeline_value + win_rate. TTL 12h.
- Bypass : `{ no_cache: true }` dans le body
- UI consommateurs : `OpportunityNextStepButton` (pipeline cards), `RagDiagnosticsDrawer` (banner), `useCockpitIntelligence.refresh()` (manual brief)
- Télémétrie : `semantic_cache_stats(workspace_id, hours)` RPC ready pour widget Admin
- Preuve : MISS→HIT sim 1.0 confirmé en prod sur opportunity T-Kare et intelligence daily
