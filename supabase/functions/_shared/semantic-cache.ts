/**
 * M6 — Semantic Cache helper (Contract v1)
 *
 * Stratégie hybride :
 *  1. fingerprint exact (hash matériel du contexte) -> hit déterministe
 *  2. ANN cosine sur embedding 1536d (openai/text-embedding-3-small) -> hit sémantique
 *
 * Contrat de contexte v1 (cf. mem://cockpit/intelligence/semantic-cache-contract-v1) :
 *  - Tous les champs typés ci-dessous sont OBLIGATOIRES pour les 3 flux
 *    (suggestTasks, suggestNextStep, intelligenceAggregator).
 *  - `extra` est sérialisé en JSON canonique (clés triées) pour garantir
 *    que l'ordre d'insertion n'affecte pas le hash.
 *  - Aucun champ volatile (Date.now, random, etc.) ne doit entrer dans le fingerprint.
 *
 * cacheKey format figé : `{workspaceId}:{mode}:{entityType}:{entityId}`
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMBED_MODEL = "openai/text-embedding-3-small";
const EMBED_DIMS = 1536;
const DEFAULT_THRESHOLD = 0.93;
const DEFAULT_TTL_HOURS = 24;
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/embeddings";

// Contract v1.1 (2026-05-23) : ajout `public_rag` + `orchestrator_general`
// pour cache cross-pipeline (public-rag-chat + ai-agent-orchestrator).
// Non-breaking : extension du type union, schéma DB inchangé.
export type CacheMode =
  | "suggest_tasks"
  | "next_step"
  | "intelligence"
  | "public_rag"
  | "orchestrator_general";
export type CacheEntityType =
  | "lead"
  | "opportunity"
  | "project"
  | "intelligence"
  | "public"
  | "general";

export type CacheScope = "user" | "workspace" | "system";

export interface FingerprintInput {
  // Identité (obligatoire)
  entityType: CacheEntityType;
  entityId: string;
  workspaceId: string;
  userId: string;                 // auth.uid() ou 'system' pour les cron
  // Signaux matériels (obligatoire)
  entityUpdatedAt: string | null;
  ragChunksCount: number;
  promptVersion: string | null;
  // Signaux optionnels
  lastActivityId?: string | null;
  sentinelDigest?: string | null;
  extra?: Record<string, unknown>;
  /**
   * Périmètre de mutualisation du fingerprint :
   *  - 'user'      : isole le cache par utilisateur (défaut, rétrocompat)
   *  - 'workspace' : mutualise entre tous les utilisateurs d'un workspace (scalabilité multi-siège)
   *  - 'system'    : crons/jobs partagés (déjà sans userId pertinent)
   */
  cacheScope?: CacheScope;
}

/** Canonicalise un objet (clés triées récursivement) pour un hash stable. */
function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`).join(",")}}`;
}

/** SHA-256 hex deterministic fingerprint of all material context signals. */
export async function buildContextFingerprint(input: FingerprintInput): Promise<string> {
  const scope: CacheScope = input.cacheScope ?? "user";
  // En scope 'workspace' ou 'system', on retire l'identifiant utilisateur du fingerprint
  // -> 1 seul appel LLM partagé pour N utilisateurs du même workspace.
  const uidForFingerprint = scope === "user" ? input.userId : null;
  const payload = canonicalStringify({
    et: input.entityType,
    ei: input.entityId,
    ws: input.workspaceId,
    uid: uidForFingerprint,
    sc: scope,
    u: input.entityUpdatedAt ?? null,
    c: input.ragChunksCount ?? 0,
    a: input.lastActivityId ?? null,
    s: input.sentinelDigest ?? null,
    p: input.promptVersion ?? null,
    x: input.extra ?? null,
  });
  const buf = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Construit la clé de cache normalisée. */
export function buildCacheKey(p: {
  workspaceId: string;
  mode: CacheMode;
  entityType: CacheEntityType;
  entityId: string;
}): string {
  return `${p.workspaceId}:${p.mode}:${p.entityType}:${p.entityId}`;
}

/** Embed cache query via Lovable AI Gateway. Returns null on failure (cache becomes pass-through). */
export async function embedCacheQuery(text: string): Promise<number[] | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.warn("[semantic-cache] LOVABLE_API_KEY missing, skipping cache");
    return null;
  }
  // Truncate to 8000 chars to stay well below 32KB gateway limit
  const input = text.length > 8000 ? text.slice(0, 8000) : text;
  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: EMBED_MODEL, input, dimensions: EMBED_DIMS }),
    });
    if (!res.ok) {
      console.warn(`[semantic-cache] embed error ${res.status}`);
      return null;
    }
    const json = await res.json();
    return json?.data?.[0]?.embedding ?? null;
  } catch (e) {
    console.warn("[semantic-cache] embed exception:", (e as Error).message);
    return null;
  }
}

export interface CacheLookupArgs {
  supabase: SupabaseClient;
  workspaceId: string;
  cacheKey: string;
  queryText: string;
  fingerprint: string;
  threshold?: number;
}

export type CacheLookupResult =
  | {
      hit: true;
      id: string;
      response: unknown;
      model: string | null;
      similarity: number;
      ageSeconds: number;
      hitCount: number;
      fingerprintMatch: boolean;
    }
  | { hit: false };

/**
 * Lookup cache. Tries fingerprint shortcut first, then ANN.
 * Auto-bumps hit_count on hit. Never throws — returns {hit:false} on any error.
 */
export async function lookupCache(args: CacheLookupArgs): Promise<CacheLookupResult> {
  try {
    const embedding = await embedCacheQuery(args.queryText);
    if (!embedding) return { hit: false };

    const { data, error } = await args.supabase.rpc("match_semantic_cache", {
      p_workspace_id: args.workspaceId,
      p_cache_key: args.cacheKey,
      p_embedding: embedding,
      p_fingerprint: args.fingerprint,
      p_threshold: args.threshold ?? DEFAULT_THRESHOLD,
    });

    if (error) {
      console.warn("[semantic-cache] match RPC error:", error.message);
      return { hit: false };
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return { hit: false };

    // Fire and forget bump
    args.supabase.rpc("bump_semantic_cache_hit", { p_id: row.id }).then(() => {});

    return {
      hit: true,
      id: row.id,
      response: row.response,
      model: row.model ?? null,
      similarity: Number(row.similarity ?? 0),
      ageSeconds: Number(row.age_seconds ?? 0),
      hitCount: Number(row.hit_count ?? 0),
      fingerprintMatch: Boolean(row.fingerprint_match),
    };
  } catch (e) {
    console.warn("[semantic-cache] lookup exception:", (e as Error).message);
    return { hit: false };
  }
}

export interface CacheStoreArgs {
  supabase: SupabaseClient;
  workspaceId: string;
  cacheKey: string;
  queryText: string;
  fingerprint: string;
  response: unknown;
  model?: string | null;
  promptVersion?: string | null;
  ttlHours?: number;
}

/** Persist a fresh LLM response in cache. Never throws. */
export async function storeCache(args: CacheStoreArgs): Promise<void> {
  try {
    const embedding = await embedCacheQuery(args.queryText);
    if (!embedding) return;

    const expiresAt = new Date(
      Date.now() + (args.ttlHours ?? DEFAULT_TTL_HOURS) * 3600 * 1000,
    ).toISOString();

    const { error } = await args.supabase.from("ai_semantic_cache").insert({
      workspace_id: args.workspaceId,
      cache_key: args.cacheKey,
      query_embedding: embedding as unknown as string,
      context_fingerprint: args.fingerprint,
      response: args.response,
      model: args.model ?? null,
      prompt_version: args.promptVersion ?? null,
      expires_at: expiresAt,
    });
    if (error) {
      console.warn("[semantic-cache] store error:", error.message);
    }
  } catch (e) {
    console.warn("[semantic-cache] store exception:", (e as Error).message);
  }
}

// ============================================================================
// Observability — trackCacheTrace (IA-2)
// Insert one row in ai_context_traces per pipeline call so the existing
// /admin/observability/ai dashboard (vue ai_cache_metrics) aggregates all
// pipelines uniformly. Fire-and-forget, never throws.
// ============================================================================
export interface TraceArgs {
  supabase: SupabaseClient;
  workspaceId: string;
  userId?: string | null;
  mode: CacheMode;
  cacheStatus: "hit" | "miss";
  cacheScope: CacheScope;
  cacheSimilarity?: number | null;
  cacheAgeSeconds?: number | null;
  latencyMs?: number | null;
  llmProvider?: string | null;
  llmCostEstimateUsd?: number | null;
  estimatedTokens?: number;
  entityType?: CacheEntityType | null;
  entityId?: string | null;
}

export function trackCacheTrace(args: TraceArgs): void {
  try {
    args.supabase.from("ai_context_traces").insert({
      workspace_id: args.workspaceId,
      user_id: args.userId ?? null,
      mode: args.mode,
      entity_type: args.entityType ?? null,
      entity_id: args.entityId ?? null,
      estimated_tokens: args.estimatedTokens ?? 0,
      cache_status: args.cacheStatus,
      cache_mode: args.mode,
      cache_scope: args.cacheScope,
      cache_similarity: args.cacheSimilarity ?? null,
      cache_age_seconds: args.cacheAgeSeconds ?? null,
      latency_ms: args.latencyMs ?? null,
      llm_provider: args.llmProvider ?? null,
      llm_cost_estimate_usd: args.llmCostEstimateUsd ?? null,
    }).then(({ error }) => {
      if (error) console.warn("[semantic-cache] trace error:", error.message);
    });
  } catch (e) {
    console.warn("[semantic-cache] trace exception:", (e as Error).message);
  }
}
