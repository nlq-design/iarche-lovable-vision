# Plan Scalabilité — Phase Instrumentation + Mode Partagé

Approche P0/P1/P2. P0 = mesurer avant d'optimiser. P1 = activer mode partagé pour Partner/multi-siège. P2 = optimisations conditionnées aux métriques observées.

## P0 — Instrumentation (mesure d'abord, coût quasi nul)

### 1. Vue `ai_cache_metrics` (lecture)
Vue SQL agrégée sur `ai_context_traces` :
- hit_rate par `cache_mode` × workspace × jour
- coût LLM évité (hits × tokens moyens)
- top entités MISS (candidats à warm-up)
- latence p50/p95 (ajouter colonne `latency_ms` sur `ai_context_traces`)

### 2. Métriques edge functions
- Ajouter `latency_ms`, `llm_provider_used`, `llm_cost_estimate_usd` sur `ai_context_traces`
- Wrapper `withMetrics()` dans `_shared/semantic-cache.ts` qui timestamp avant/après LLM
- Compteur `voice_transcription_seconds` par user/jour (table `voice_usage_daily`)

### 3. Dashboard Admin `/admin/observability/ai`
Widgets DB-first lisant `ai_cache_metrics` :
- Hit rate global + par mode (objectif >60% sur intelligence, >40% sur next_step)
- Coût LLM jour/mois par workspace
- Top 10 entités MISS répétés (candidats invalidation excessive)
- Volume vocal (minutes/user/jour, coût AssemblyAI estimé)
- Latence p95 par mode

### 4. Index DB manquants (P0 critique)
```sql
CREATE INDEX CONCURRENTLY idx_user_notes_entity_created 
  ON user_notes(entity_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_ai_context_traces_workspace_mode_date 
  ON ai_context_traces(workspace_id, cache_mode, created_at DESC);
CREATE INDEX CONCURRENTLY idx_ai_response_cache_fingerprint 
  ON ai_response_cache(fingerprint_hash) WHERE expires_at > now();
```

### 5. TTL cleanup `ai_response_cache`
Job `pg_cron` quotidien 03:00 UTC : `DELETE FROM ai_response_cache WHERE expires_at < now() - interval '7 days'`.

## P1 — Mode partagé conditionnel (active la scalabilité Partner)

### 6. Politique `cacheScope` par mode
Nouvelle colonne `cache_scope` dans `FingerprintInput` : `'user' | 'workspace' | 'system'`.

| Mode | Scope actuel | Scope cible | Justification |
|---|---|---|---|
| `suggestNextStep` | user | **workspace** | Recommandation factuelle CRM, pas de personnalisation utile |
| `suggestTasks` | user | **workspace** | Idem |
| `intelligenceAggregator` | system | **system** (inchangé) | Déjà partagé |
| `chat copilot` | user | **user** (inchangé) | Personnalisé par historique conversationnel |

Impact attendu sur workspace 5 users : hit rate ×5 sur modes structurés, coût LLM ÷5.

### 7. Flag `workspace_settings.ai_cache_mode`
Colonne ENUM (`'shared' | 'isolated'`) sur table workspaces existante. Défaut `'shared'`. Permet override par workspace sensible (compliance).

### 8. Fingerprint conditionnel
Dans `_shared/semantic-cache.ts` :
```ts
const userIdForFingerprint = cacheScope === 'workspace' ? null : userId;
```
`canonicalStringify` ignore les clés null → fingerprint stable cross-users.

## P2 — Optimisations déclenchées par les métriques (différé)

À ne lancer QUE si métriques P0 montrent un seuil dépassé :

- **Compression Opus** vocal si `voice_usage_daily.bandwidth_mb > 50/user`
- **Index `hnsw`** sur embeddings si latence ANN p95 > 200ms
- **Rate-limit per user** sur copilot si `429` > 1% des appels
- **Warm-up cache** des top entités MISS au login si hit rate < 40%
- **Debounce React Query** (staleTime 30s) sur `AIActionDrawer` si invokes > 10/min/user

## Architecture des changements

```text
ai_context_traces (+latency_ms, +cost_usd, +provider)
       │
       └──► vue ai_cache_metrics ──► /admin/observability/ai
                                            (widgets DB-first)

FingerprintInput
   ├── cacheScope: 'user'|'workspace'|'system'  ◄── workspace_settings.ai_cache_mode
   └── userId: null si scope=workspace ──► fingerprint partagé
```

## Détails techniques

- **Migrations** : 1 seule migration P0 (colonnes + index + vue + cron) ; 1 migration P1 (cache_scope + workspace_settings).
- **Edge functions modifiées** : `_shared/semantic-cache.ts` (wrapper metrics + scope), `cockpit-ai-copilot/index.ts` (passage `cacheScope` par mode), `transcribe-audio-chunk` (compteur voice_usage_daily).
- **Front** : nouvelle page `/admin/observability/ai` (Admin-only via RLS `has_role admin`), composants `MetricCard`, `HitRateChart` (Recharts existant), `VoiceUsageWidget`.
- **Rétrocompat** : `cacheScope` défaut `'user'` si non passé → zéro régression sur autres modes.
- **Tests** : étendre `semantic-cache_test.ts` avec 3 tests : fingerprint stable cross-users en scope=workspace, fingerprint divergent en scope=user, vue `ai_cache_metrics` retourne >0 lignes après seed.

## Critères d'acceptation

1. Dashboard `/admin/observability/ai` affiche hit rate, coût €/jour, latence p95 par mode.
2. 2 users du même workspace ouvrant la même opportunité → 1 seul appel LLM (MISS puis HIT) en mode `suggestNextStep`.
3. Workspace avec `ai_cache_mode='isolated'` retombe sur comportement actuel (isolation user).
4. Job cron supprime entrées cache expirées >7j, mesurable via `pg_stat_user_tables`.
5. Aucune régression sur tests Deno existants.

## Hors scope (à proposer plus tard)

- Refactor pgvector vers `hnsw` (à valider via métriques P0)
- Migration AssemblyAI → ElevenLabs Scribe streaming
- Rate-limiter centralisé multi-fonction
- Sharding workspace si >500 workspaces actifs (sujet infra Lovable Cloud)
