/**
 * M6 Semantic Cache — Contract v1 tests
 *
 * Verifies fingerprint determinism, canonical extras ordering invariance,
 * and sensitivity to material context bumps (promptVersion, userId, etc.).
 */
import { assertEquals, assertNotEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { buildCacheKey, buildContextFingerprint, type FingerprintInput } from "./semantic-cache.ts";

const baseInput: FingerprintInput = {
  entityType: "opportunity",
  entityId: "11111111-1111-1111-1111-111111111111",
  workspaceId: "ws-1",
  userId: "user-A",
  entityUpdatedAt: "2026-05-20T10:00:00Z",
  ragChunksCount: 7,
  lastActivityId: "2026-05-20T09:00:00Z",
  sentinelDigest: "s2|cs1",
  promptVersion: "v3",
  extra: { stage: "qualified", tasks: 4 },
};

Deno.test("fingerprint is deterministic on identical input", async () => {
  const a = await buildContextFingerprint(baseInput);
  const b = await buildContextFingerprint({ ...baseInput });
  assertEquals(a, b);
  assertEquals(a.length, 64); // sha256 hex
});

Deno.test("fingerprint is invariant to extras key ordering", async () => {
  const a = await buildContextFingerprint(baseInput);
  const b = await buildContextFingerprint({
    ...baseInput,
    extra: { tasks: 4, stage: "qualified" }, // reordered
  });
  assertEquals(a, b);
});

Deno.test("fingerprint changes when promptVersion bumps", async () => {
  const a = await buildContextFingerprint(baseInput);
  const b = await buildContextFingerprint({ ...baseInput, promptVersion: "v4" });
  assertNotEquals(a, b);
});

Deno.test("fingerprint changes when userId differs (per-user isolation)", async () => {
  const a = await buildContextFingerprint(baseInput);
  const b = await buildContextFingerprint({ ...baseInput, userId: "user-B" });
  assertNotEquals(a, b);
});

Deno.test("fingerprint changes when ragChunksCount bumps", async () => {
  const a = await buildContextFingerprint(baseInput);
  const b = await buildContextFingerprint({ ...baseInput, ragChunksCount: 8 });
  assertNotEquals(a, b);
});

Deno.test("fingerprint changes when entityUpdatedAt bumps", async () => {
  const a = await buildContextFingerprint(baseInput);
  const b = await buildContextFingerprint({ ...baseInput, entityUpdatedAt: "2026-05-20T11:00:00Z" });
  assertNotEquals(a, b);
});

Deno.test("buildCacheKey produces expected canonical format", () => {
  const k = buildCacheKey({
    workspaceId: "ws-1",
    mode: "next_step",
    entityType: "opportunity",
    entityId: "abc",
  });
  assertEquals(k, "ws-1:next_step:opportunity:abc");
});

Deno.test("buildCacheKey for intelligence uses composite entityId", () => {
  const k = buildCacheKey({
    workspaceId: "ws-1",
    mode: "intelligence",
    entityType: "intelligence",
    entityId: "ws-1:2026-05-20",
  });
  assertEquals(k, "ws-1:intelligence:intelligence:ws-1:2026-05-20");
});

Deno.test("cacheScope=workspace mutualise le fingerprint entre utilisateurs", async () => {
  const a = await buildContextFingerprint({ ...baseInput, cacheScope: "workspace" });
  const b = await buildContextFingerprint({ ...baseInput, userId: "user-B", cacheScope: "workspace" });
  assertEquals(a, b);
});

Deno.test("cacheScope=workspace diffère de scope=user (isolation préservée par défaut)", async () => {
  const a = await buildContextFingerprint({ ...baseInput, cacheScope: "workspace" });
  const b = await buildContextFingerprint({ ...baseInput, cacheScope: "user" });
  assertNotEquals(a, b);
});

Deno.test("cacheScope=workspace reste sensible aux signaux matériels (promptVersion)", async () => {
  const a = await buildContextFingerprint({ ...baseInput, cacheScope: "workspace" });
  const b = await buildContextFingerprint({ ...baseInput, cacheScope: "workspace", promptVersion: "v4" });
  assertNotEquals(a, b);
});
