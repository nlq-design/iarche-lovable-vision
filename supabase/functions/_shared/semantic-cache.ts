/**
 * M6 — Semantic Cache helper
 *
 * Stratégie hybride :
 *  1. fingerprint exact (hash matériel du contexte) -> hit déterministe
 *  2. ANN cosine sur embedding 1536d (openai/text-embedding-3-small) -> hit sémantique
 *
 * Branchement : avant tout appel LLM dans cockpit-ai-copilot (suggestTasks, suggestNextStep, ...).
 * En cas de miss : appel LLM normal, puis storeCache() persistant.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMBED_MODEL = "openai/text-embedding-3-small";
const EMBED_DIMS = 1536;
const DEFAULT_THRESHOLD = 0.93;
const DEFAULT_TTL_HOURS = 24;
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/embeddings";

export interface FingerprintInput {
  entityUpdatedAt?: string | null;
  ragChunksCount?: number;
  lastActivityId?: string | null;
  sentinelDigest?: string | null;
  promptVersion?: string | null;
  extra?: Record<string, unknown>;
}

/** SHA-256 hex deterministic fingerprint of all material context signals. */
export async function buildContextFingerprint(input: FingerprintInput): Promise<string> {
  const payload = JSON.stringify({
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
