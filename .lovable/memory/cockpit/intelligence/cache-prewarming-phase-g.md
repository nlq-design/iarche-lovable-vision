---
name: Cache Prewarming Intelligent (Phase G)
description: Cache persistant DB des intents classés + prewarm dashboard à l'entrée du Cockpit, throttle 6h/workspace
type: feature
---

# Phase G — Cache Prewarming Intelligent

## Tables
- `ai_query_intent_cache(query_normalized PK, intent, embedding vector(1536), similarity_best, source, hit_count, updated_at, expires_at)` — cache persistant 30j des intents déjà classifiés. RLS admin-only SELECT.
- `ai_prewarm_runs(workspace_id PK, last_run_at, queries_count, cache_hits, llm_calls)` — throttle 6h. RLS admin + workspace_member SELECT.

## RPC
- `increment_intent_cache_hit(q text)` SECURITY DEFINER — incrémente atomiquement hit_count pour télémétrie.

## Intent Router (_shared/intent-router.ts)
Cascade enrichie pour `classifyIntent` :
1. In-memory cache 60s (existant)
2. **Cache persistant DB** `ai_query_intent_cache` ← NOUVEAU : zéro embedding, zéro LLM si déjà vu
3. Embedding + match_intent_anchor (semantic, seuil 0.75) → upsert dans cache DB
4. LLM fallback → upsert dans cache DB + log dans `ai_intent_router_fallbacks`

## Edge function `cache-prewarm`
- Verify JWT, résout workspace via RPC `resolve_workspace_for_user` (fallback: `workspace_members`).
- Throttle 6h via `ai_prewarm_runs.last_run_at`.
- Boucle sur 20 requêtes dashboard curées (CRM/analysis/docs/vivier/general).
- Pour chaque : skip si déjà en cache → sinon embed + semantic match (seuil 0.75) → sinon LLM `gemini-2.5-flash-lite`.
- Upsert tout dans `ai_query_intent_cache` avec source='prewarm', TTL 30j.

## Frontend
- Hook `useCockpitPrewarm(enabled)` (`src/hooks/cockpit/useCockpitPrewarm.ts`).
- Monté dans `ProtectedCockpitRoute` avec enabled = (auth + cockpit + MFA + step-up tous OK).
- Guard sessionStorage `iarche:cockpit-prewarm-done` (1 invoke par session navigateur).
- Fire-and-forget, jamais bloquant pour le rendu Cockpit.

## ROI
- Run #1 nouveau workspace : ~20 LLM calls (gemini-flash-lite, coût négligeable ~$0.001).
- Run #2+ même session : skip total (sessionStorage).
- Run #2+ session suivante <6h : skip (throttle DB).
- Run #2+ session suivante >6h : 20 cache hits → 0 LLM, juste 20 lookups SQL (~50ms total).
- Pour requêtes utilisateur **identiques** aux prewarm : latence intent ≈ 50ms vs ~2-4s (gain 95%+).
- Pour requêtes **proches** (paraphrases) : router sémantique v2 prend le relais (gain ~80%).

## Bilan triptyque IA-2 (C+D+E+F+G)
- C : Router sémantique embeddings → 4s LLM par défaut évité.
- D : 4 nouvelles règles Sentinel risk (17 actives).
- E : Widget 7 catégories + 4 PROPOSAL_TEMPLATES.
- F : Auto-learning fallbacks → hit rate 70→90% en 2 semaines.
- G : Cache persistant + prewarm → requêtes connues à coût zéro.
