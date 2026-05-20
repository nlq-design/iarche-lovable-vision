
# M6 Semantic Cache — Contrat de contexte unifié

## 1. Objectif

Garantir des **hits déterministes et cohérents** sur les 3 flux qui consomment `cockpit-ai-copilot` (`suggestTasks`, `suggestNextStep`, `intelligenceAggregator`) en figeant un contrat strict pour le `fingerprint`, le `cacheKey`, le `TTL` et le scope utilisateur.

État actuel (audit) :
- `ragChunksCount` incohérent : `0` (suggest-tasks), valeur réelle (next-step), `enrichedLlmContext.length` (intelligence).
- `cacheKey` sans `workspaceId` explicite — dépend uniquement de la colonne + RLS.
- TTL unique 24h pour tous (sauf intelligence 12h).
- `userId` non injecté → 2 users du même workspace partagent la réponse (faux positifs).

## 2. Contrat de fingerprint (v1)

Tous les flux DOIVENT produire le fingerprint via `buildContextFingerprint()` avec **exactement** ces champs :

| Champ | Source | Obligatoire | Notes |
|---|---|---|---|
| `entityType` | `'lead' \| 'opportunity' \| 'project' \| 'intelligence'` | oui | `'intelligence'` pour le Daily Brief (pas d'entité unique) |
| `entityId` | UUID entité ou `workspaceId+date` pour intelligence | oui | déterministe |
| `workspaceId` | resolved workspace | oui | scope tenant |
| `userId` | `traceCtx.userId` (auth.uid) | oui | **isolation par user** (choix produit) |
| `entityUpdatedAt` | `entity.updated_at` ISO | oui | invalide au moindre changement |
| `ragChunksCount` | **nombre réel** de chunks injectés au prompt | oui | normalisé sur les 3 flux |
| `lastActivityId` | dernière `activity_log.id` rattachée | si applicable | next-step uniquement |
| `sentinelDigest` | `s{n}\|cs{n}` (counts) | si applicable | intelligence + next-step |
| `promptVersion` | `loadPrompt().version` | oui | bump prompt → invalidation auto |
| `extra` | objet stable trié par clé | optionnel | jamais de timestamp brut |

**Règle d'or** : zéro champ volatile (pas de `Date.now()`, pas d'index aléatoire, pas de `Math.random`). Toute clé `extra` est sérialisée en JSON canonique (clés triées).

## 3. Convention `cacheKey`

Format figé :
```
{workspaceId}:{mode}:{entityType}:{entityId}
```

- `mode` ∈ `suggest_tasks | next_step | intelligence`
- `intelligence` : `entityType=intelligence`, `entityId={workspaceId}:{YYYY-MM-DD}`
- `workspaceId` explicite dans la clé → défense en profondeur si la colonne `workspace_id` est compromise par un changement RLS

## 4. TTL par mode

| Mode | TTL | Justification |
|---|---|---|
| `suggest_tasks` | 24h | contexte entité stable, peu de tâches/jour |
| `next_step` | 1h | recommandation hautement volatile (nouvelle activité = invalidation immédiate via `lastActivityId`) |
| `intelligence` | 12h | Daily Brief recalculé matin + après-midi |

TTL passé en argument explicite à `storeCache({ ttlHours })`.

## 5. Scope utilisateur (RGPD/personnalisation)

`userId` (auth.uid de l'appelant) entre dans le fingerprint. Conséquences :
- Deux users du même workspace ne se partagent **plus** le cache.
- Pour `intelligence` (cron, pas de user), `userId = 'system'` (constante).
- Hit rate attendu : -20-30% vs partage workspace, mais sécurité des recommandations garantie.

## 6. Plan d'implémentation (surgical)

### 6.1 `supabase/functions/_shared/semantic-cache.ts`
- Étendre `FingerprintInput` avec champs obligatoires typés : `entityType`, `entityId`, `workspaceId`, `userId`.
- Sérialisation canonique de `extra` (clés triées) pour éviter qu'un ordre d'insertion casse le hash.
- `storeCache` accepte `ttlHours?: number` (default 24).
- Helper `buildCacheKey({ workspaceId, mode, entityType, entityId }): string` exporté.

### 6.2 `supabase/functions/cockpit-ai-copilot/index.ts`
- `suggestTasks` : passer le **vrai** `ragChunksCount` (longueur de `enrichedLlmContext` / chunks RAG) + `userId` + TTL 24h.
- `suggestNextStep` : ajouter `userId` + TTL 1h + `entityType: 'opportunity'`.
- `intelligenceAggregator` : `userId='system'` + TTL 12h + `entityType: 'intelligence'`, `entityId='{workspaceId}:{date}'`.
- Remplacer toutes les constructions manuelles de `cacheKey` par `buildCacheKey()`.
- Propager `userId` via `traceCtx` (déjà disponible côté caller via JWT).

### 6.3 Documentation
- Créer `mem://cockpit/intelligence/semantic-cache-contract-v1` (contrat figé, table champs, exemples).
- Mettre à jour la mémoire existante `mem://cockpit/intelligence/semantic-cache-m6` pour pointer vers le contrat.
- Ajouter `.lovable/memory/cockpit/intelligence/semantic-cache-contract-v1.md` (version dev).

### 6.4 Observabilité
- `ai_context_traces.cache_status` reste `hit|miss|skip`.
- Ajouter colonne `cache_mode` (text) sur `ai_context_traces` pour filtrer hit rate par mode dans `SemanticCacheStatsWidget`.
- Migration SQL : `ALTER TABLE ai_context_traces ADD COLUMN cache_mode text;` + backfill `null`.

### 6.5 Tests (Deno)
- `semantic-cache_test.ts` : 
  - même input → même fingerprint (déterminisme),
  - ordre des clés `extra` différent → même fingerprint (sérialisation canonique),
  - bump `promptVersion` → fingerprint différent,
  - bump `userId` → fingerprint différent.

## 7. Détails techniques

```ts
// _shared/semantic-cache.ts (extrait cible)
export interface FingerprintInput {
  entityType: 'lead' | 'opportunity' | 'project' | 'intelligence';
  entityId: string;
  workspaceId: string;
  userId: string;                 // 'system' pour cron
  entityUpdatedAt: string | null;
  ragChunksCount: number;
  lastActivityId?: string | null;
  sentinelDigest?: string | null;
  promptVersion: string | null;
  extra?: Record<string, unknown>;
}

export function buildCacheKey(p: {
  workspaceId: string; mode: 'suggest_tasks'|'next_step'|'intelligence';
  entityType: string; entityId: string;
}): string {
  return `${p.workspaceId}:${p.mode}:${p.entityType}:${p.entityId}`;
}

// sérialisation canonique
function canonical(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  return JSON.stringify(keys.reduce((acc, k) => ({ ...acc, [k]: obj[k] }), {}));
}
```

## 8. Critères d'acceptation

- 3 flux passent par `buildCacheKey()` et `buildContextFingerprint()` avec **tous** les champs obligatoires renseignés (lint TS interdit l'oubli grâce au type).
- Test Deno `semantic-cache_test.ts` vert (déterminisme + invariance d'ordre + sensibilité aux bumps).
- `ai_context_traces.cache_mode` rempli sur les 3 modes après un appel manuel de chaque flux.
- Mémoire projet `semantic-cache-contract-v1` créée + index `mem://index.md` mis à jour.
- Aucune régression : Daily Brief existant continue de produire HIT au 2ᵉ appel dans la même fenêtre 12h.

## 9. Out of scope (non-objectifs)

- Pas de changement de seuil ANN (reste 0.93).
- Pas de migration de `ai_semantic_cache` (schéma inchangé).
- Pas d'instrumentation des widgets DB-first (`daily_intelligence`) — ils restent hors copilot.
