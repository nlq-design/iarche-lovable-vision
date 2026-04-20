---
name: MCP Transcription Tools Deprecation 30j
description: get_transcription + get_transcriptions deprecated, removal 2026-05-20, use list_transcriptions / get_transcription_detail
type: feature
---
# MCP Transcription Tools — Deprecation 30j

**Date deprecation** : 2026-04-20
**Date suppression dure** : 2026-05-20

## Tools deprecated (thin wrappers, log warning)
- `get_transcription` → utiliser `list_transcriptions` ou `get_transcription_detail`
- `get_transcriptions` → utiliser `list_transcriptions`

## Tools primaires (descriptions distinctes EN)
- `list_transcriptions` : metadata légère, filtres consolidés (lead_id, project_id, entity_id, status, date_from, date_to, limit max 50, default 20). Champs lourds exclus.
- `get_transcription_detail` : contenu complet (raw_transcript, segments, synthesis, participants).

## Raison
Ranker Anthropic dédoublonnait les 4 tools (noms quasi identiques + descriptions FR vagues + mention "Alias"). Refonte EN intent-oriented + 2 wrappers deprecated pour compat ai-agent-orchestrator + UI admin (useAIAgentStats, OrchestratorConfig, AdminAIPrompts).

## Suppression dure (commit P2.3, J+30)
Conditionnée à 0 appel sur `get_transcription` + `get_transcriptions` dans logs des 7 derniers jours. Vérif via grep `[MCP-DEPRECATED]` dans function_edge_logs.

## Migration callers internes
- `ai-agent-orchestrator/index.ts` ligne 374, 3454 : remplacer `get_transcriptions` par `list_transcriptions` avant 2026-05-20.
- `src/hooks/admin/useAIAgentStats.ts:91` : update label.
- `src/pages/admin/AdminAIPrompts.tsx:985` : update icône mapping.
- `src/components/admin/OrchestratorConfig.tsx:26` : update label.
