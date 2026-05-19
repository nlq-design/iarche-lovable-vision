# M6 — Semantic Cache pour cockpit-ai-copilot

## Objectif business
Réduire **30-60% des appels LLM** sur les widgets IA (Next Step, Tasks, Daily Brief) en réutilisant les réponses passées sémantiquement équivalentes, tant que le contexte CRM n'a pas matériellement changé. Économies directes sur quota Lovable AI Gateway, latence widgets divisée par ~10 sur cache hit (50-200ms vs 2-5s).

## Position dans le flux RAG

```text
User trigger (widget refresh, sentinel, brief)
        │
        ▼
┌──────────────────────────────────────────────┐
│ cockpit-ai-copilot                           │
│  1. collectEntityContext (RAG + temporal)    │
│  2. buildContextFingerprint(entity, sections)│ ← NOUVEAU
│  3. embedQuery(promptKey + entity_id)        │ ← NOUVEAU
│  4. lookupSemanticCache(embed, fingerprint)  │ ← NOUVEAU
│     │                                        │
│     ├─ HIT  ──► return cached_response       │
│     │           + trace(cache:hit, sim, age) │
│     │                                        │
│     └─ MISS ──► callLLM(prompt + context)    │
│                 storeSemanticCache(...)      │ ← NOUVEAU
│                 + trace(cache:miss)          │
└──────────────────────────────────────────────┘
```

Le cache se branche **après** l'assembly de contexte (pour avoir un fingerprint stable) et **avant** l'appel LLM. Il ne remplace pas le RAG — il évite de re-prompter Gemini quand rien de matériel n'a bougé.

## Architecture

### 1. Table `ai_semantic_cache`
- `id uuid PK`
- `workspace_id uuid` (RLS strict)
- `cache_key text` — discriminant logique : `{prompt_key}:{entity_type}:{entity_id}` (ex: `next_step:lead:9af8...`)
- `query_embedding vector(1536)` — embed du prompt+contexte synthétique (modèle `openai/text-embedding-3-small`, choix coût-perf)
- `context_fingerprint text` — SHA-256 sur (updated_at entité + count RAG chunks + last activity_log id + sentinel_signals digest)
- `response jsonb` — payload LLM brut (tasks[], next_step, draft, etc.)
- `model text` — provider utilisé (gemini-2.5-flash, etc.) pour invalidation par modèle
- `prompt_version text` — version du prompt (table `ai_prompts`) pour invalidation prompt
- `hit_count int default 0`
- `last_hit_at timestamptz`
- `expires_at timestamptz` — TTL 24h par défaut (configurable par prompt_key)
- `created_at timestamptz`

**Index** : HNSW sur `query_embedding (vector_cosine_ops)`, btree sur `(workspace_id, cache_key, expires_at)`.

### 2. Fonction SQL `match_semantic_cache(workspace, key, embed, fingerprint, threshold)`
- SECURITY DEFINER, search_path = public
- Filtre `workspace_id = $1 AND cache_key = $2 AND expires_at > now() AND context_fingerprint = $4`
- Si fingerprint matche exactement → retour direct (court-circuit ANN)
- Sinon : ANN cosine sur embeddings avec `similarity >= threshold` (défaut 0.93), tri par similarité desc
- Retourne `id, response, model, similarity, age_seconds, hit_count`

### 3. Module partagé `_shared/semantic-cache.ts`
- `buildContextFingerprint(ctx)` — hash déterministe sur signaux matériels (entity.updated_at, ragChunks.length, lastActivityId, sentinelDigest)
- `embedCacheQuery(text)` — call Lovable AI `/embeddings` avec model `openai/text-embedding-3-small` (1536d, 7× moins cher que gemini)
- `lookupCache({ supabase, workspace_id, cache_key, query_text, fingerprint, threshold? })` → `{ hit: true, response, similarity, age, source } | { hit: false }`
- `storeCache({ supabase, ... response, ttl_hours? })`
- Threshold par défaut **0.93** (calibrable). Sur fingerprint exact match → bypass embedding lookup, sim=1.0.

### 4. Intégration `cockpit-ai-copilot`
- Wrap `suggestNextStep` et `suggestTasks` :
  ```ts
  const fp = buildContextFingerprint(ctx);
  const cacheKey = `${promptKey}:${entityType}:${entityId}`;
  const hit = await lookupCache({ ..., cache_key: cacheKey, fingerprint: fp });
  if (hit.hit) {
    await recordContextTrace({ ..., cache_status: 'hit', cache_similarity: hit.similarity });
    return { ...hit.response, trace_id, cache: { hit: true, similarity: hit.similarity, age_seconds: hit.age } };
  }
  // ... appel LLM normal
  await storeCache({ ..., response: llmResponse, ttl_hours: 24 });
  await recordContextTrace({ ..., cache_status: 'miss' });
  ```
- Ajout colonnes `cache_status text`, `cache_similarity numeric`, `cache_age_seconds int` sur `ai_context_traces`.

### 5. Invalidation
- **Passive (TTL)** : `expires_at` 24h + purge `pg_cron` quotidienne (`delete where expires_at < now()`).
- **Active (fingerprint)** : tout changement d'updated_at sur lead/opportunity/note → fingerprint diffère → cache miss automatique (pas besoin de DELETE).
- **Manuelle** : RPC `purge_semantic_cache(workspace_id, cache_key?)` pour bouton "force refresh" UI.

### 6. UI — RagDiagnosticsDrawer
Ajout d'un bandeau en tête :
```text
[ Cache HIT · sim 0.97 · âge 4 min · économie ~1.2k tokens ]
[ Cache MISS · nouvelle synthèse ]
```
Plus un toggle "Désactiver cache pour ce refresh" qui ajoute `?no_cache=1` à l'invocation.

## Sécurité
- RLS : `SELECT/INSERT/UPDATE` réservé `service_role` (les edge fns appellent en service_role). Pas d'accès client direct.
- `purge_semantic_cache` : RLS via `has_role(auth.uid(), 'admin')` ou ownership workspace.
- Pas de PII brute dans `cache_key` (IDs UUID uniquement). `response` jsonb = même contenu que ce que l'utilisateur voit déjà.

## Métriques (Sentinel + Dashboard)
Nouveau widget `SemanticCacheStatsWidget` :
- Hit rate 24h / 7j (objectif > 35%)
- Tokens économisés (estimés)
- Top cache_keys par hit_count
- Age moyen des hits

## Plan d'exécution (3 étapes)

1. **DB + helper** : migration `ai_semantic_cache` + index HNSW + fonction `match_semantic_cache` + cron purge + colonnes trace.
2. **Edge fn** : `_shared/semantic-cache.ts` + branchement `cockpit-ai-copilot` (Next Step + Tasks).
3. **UI** : bandeau cache dans `RagDiagnosticsDrawer` + widget stats.

## Points techniques

- **Modèle embedding** : `openai/text-embedding-3-small` (1536d). Pourquoi pas gemini-embedding-001 (3072d) utilisé pour le RAG ? Le cache lookup est haute-fréquence → coût/perf prioritaires. Les vecteurs cache et RAG vivent dans des tables distinctes, pas de comparaison croisée.
- **Threshold 0.93** : empiriquement bon trade-off precision/recall pour prompts CRM. À calibrer après 1 semaine de données sur `cache_similarity`.
- **Fingerprint vs Embedding** : fingerprint match = court-circuit (réponse identique garantie, sim=1). Embedding match = approximation sémantique (couvre les cas où la query varie légèrement mais le contexte est équivalent).
- **Coût ajouté** : 1 embedding/lookup (~1500 tokens → ~0.00002€ via gateway). Largement compensé dès le 1er hit (économie ~1-3k tokens LLM).

## Critères de succès
- Hit rate > 35% sur 7 jours d'usage normal cockpit
- Latence widget IA cache-hit < 300ms p95
- Zéro régression fonctionnelle (réponses cachées identiques à live pour fingerprint match)
- Trace cache visible et lisible dans RagDiagnosticsDrawer
