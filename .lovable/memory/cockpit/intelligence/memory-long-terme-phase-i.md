---
name: Phase I Conversational Memory Long-Terme
description: Branchement memory-enricher dormant dans orchestrator (injection prefs + auto-capture regex post-réponse, zéro LLM)
type: feature
---
# Phase I — Conversational Memory Long-Terme

## Constat audit
- Infrastructure `ai_agent_memory` (table + embeddings 1536d + RLS) déjà en place.
- Module `_shared/memory-enricher.ts` complet (store/retrieve/extract/build/prune).
- Tool MCP `save_preference` opérationnel.
- **GAP** : aucun call de `retrieveMemories`/`extractMemoriesFromConversation` dans `ai-agent-orchestrator` ni `cockpit-ai-copilot` — module 100% dormant.

## Branchement Phase I (orchestrator)
1. **Injection prefs long-terme** (début) :
   - `retrieveMemories({memoryTypes:['preference','decision'], minImportance:0.7, limit:8})`
   - `buildMemoryBlock(...)` → préfixé en haut de `memoryContext` (avant le bloc legacy).
   - Coût : 1 SELECT indexé sur `(workspace_id, importance_score)` < 10ms.
2. **Auto-capture implicite** (fin, fire-and-forget) :
   - `extractMemoriesFromConversation(lastUserMsg, finalContent)` → regex prefs/decisions/facts.
   - Tag `metadata.source = 'auto-extract-orchestrator'` + `session_id`.
   - `storeMemories(...)` non-await, ne bloque pas la réponse.
   - Déduplication via `storeMemory` (ilike content match).

## Principes
- **Zéro coût LLM** : tout en SQL + regex.
- **Zero Friction** : pas de prompt utilisateur, capture transparente.
- **Inflation contrôlée** : déduplicateur intégré + `pruneMemories` budget 10k tokens.

## Évolutions v2 possibles
- Extension cockpit-ai-copilot (mode `chat`).
- Détection LLM async post-conversation (micro-call gemini-flash-lite) pour signaux subtils.
- Helper UI `/admin/observability/memory` pour audit transparent.
