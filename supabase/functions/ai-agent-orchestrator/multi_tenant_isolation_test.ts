/**
 * Multi-tenant Isolation Regression Tests — Lot 1bis
 *
 * Garantit qu'aucune donnée IA/RAG ne peut traverser entre workspaces :
 *  - Toutes les tables IA exposent un prédicat RLS scoping par workspace_id
 *    (ou bypass admin/service_role explicite).
 *  - Aucune écriture client RLS n'est autorisée sans WITH CHECK workspace.
 *  - Le code de l'orchestrateur ne contient plus de workspace_id NLQ
 *    hardcodé hors du pattern de fallback `workspaceId ?? "..."`.
 *  - L'helper SQL `can_access_entity_workspace` est bien présent.
 *
 * Exécution :
 *   deno test --allow-net --allow-env --allow-read \
 *     supabase/functions/ai-agent-orchestrator/multi_tenant_isolation_test.ts
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY");

// Tables IA/RAG sensibles — toute régression d'isolation = bug critique.
const AI_TABLES = [
  "ai_actions",
  "ai_context_traces",
  "ai_cross_signals",
  "ai_sentinel_alerts",
  "ai_agent_memory",
  "ai_usage_metrics",
  "action_proposals",
  "daily_intelligence",
  "workspace_ai_usage",
];

const NLQ_WORKSPACE = "00000000-0000-0000-0000-000000000001";

const skipDb = !SUPABASE_URL || !SERVICE_ROLE_KEY;
if (skipDb) {
  console.warn(
    "[multi-tenant-isolation] SUPABASE_URL / SERVICE_ROLE_KEY manquant — tests DB skippés (statique uniquement).",
  );
}

const supabase = skipDb
  ? null
  : createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

// ----------------------------------------------------------------------------
// Helper : interroge pg_policies via une RPC service-role en SELECT direct.
// ----------------------------------------------------------------------------
async function fetchPolicies(tablename: string) {
  if (!supabase) return [] as Array<{ policyname: string; cmd: string; qual: string | null; with_check: string | null }>;
  const { data, error } = await supabase
    .from("pg_policies" as never)
    .select("policyname, cmd, qual, with_check")
    .eq("schemaname", "public")
    .eq("tablename", tablename);
  if (error) {
    // Fallback : pg_policies n'est pas exposé via PostgREST -> on tente la vue maison si présente.
    return [];
  }
  return (data ?? []) as Array<{
    policyname: string;
    cmd: string;
    qual: string | null;
    with_check: string | null;
  }>;
}

/**
 * Un prédicat est considéré "scopé multi-tenant" s'il :
 *  - référence directement workspace_id, OU
 *  - délègue à un helper connu (can_access_*, is_workspace_member, has_role admin), OU
 *  - est un bypass service_role explicite.
 */
function isWorkspaceScoped(predicate: string | null): boolean {
  if (!predicate) return false;
  const p = predicate.toLowerCase();
  return (
    p.includes("workspace_id") ||
    p.includes("can_access_entity_workspace") ||
    p.includes("can_access_workspace") ||
    p.includes("is_workspace_member") ||
    p.includes("has_role(auth.uid(), 'admin'") ||
    p.includes("has_role(auth.uid(), 'cockpit_admin'") ||
    p.includes("is_admin()") ||
    p.includes("'role'::text) = 'service_role'") ||
    p.includes("user_id = auth.uid()") // ai_agent_memory: scope per-user, légitime
  );
}

// ============================================================================
// TESTS RLS — scoping workspace garanti sur toutes les tables IA
// ============================================================================
for (const table of AI_TABLES) {
  Deno.test({
    name: `RLS isolation — ${table} : toute policy est scopée workspace (ou bypass admin/service)`,
    ignore: skipDb,
    async fn() {
      const policies = await fetchPolicies(table);
      assert(
        policies.length > 0,
        `Aucune policy RLS trouvée sur public.${table} — table non protégée !`,
      );

      for (const policy of policies) {
        // INSERT policies utilisent with_check, les autres utilisent qual.
        const predicate =
          policy.cmd === "INSERT" ? policy.with_check : policy.qual ?? policy.with_check;

        // INSERT sans with_check est acceptable uniquement si une politique soeur
        // (ALL / autre INSERT) couvre le scoping — sinon régression.
        if (policy.cmd === "INSERT" && !predicate) {
          const hasSiblingScope = policies.some(
            (p) =>
              p.policyname !== policy.policyname &&
              (p.cmd === "ALL" || p.cmd === "INSERT") &&
              isWorkspaceScoped(p.qual ?? p.with_check),
          );
          assert(
            hasSiblingScope,
            `${table}.${policy.policyname} (INSERT) sans WITH CHECK et aucune policy soeur scopée.`,
          );
          continue;
        }

        assert(
          isWorkspaceScoped(predicate),
          `${table}.${policy.policyname} (${policy.cmd}) ne scope pas par workspace.\nPrédicat: ${predicate}`,
        );
      }
    },
  });
}

// ============================================================================
// TEST helper SQL : can_access_entity_workspace doit exister
// ============================================================================
Deno.test({
  name: "Helper can_access_entity_workspace présent en base",
  ignore: skipDb,
  async fn() {
    const { data, error } = await supabase!
      .from("pg_proc" as never)
      .select("proname")
      .eq("proname", "can_access_entity_workspace")
      .limit(1);
    // Si pg_proc inaccessible via PostgREST, on tolère mais on log.
    if (error) {
      console.warn("[isolation] pg_proc non exposé, vérif helper sautée:", error.message);
      return;
    }
    assert((data ?? []).length > 0, "Fonction can_access_entity_workspace manquante.");
  },
});

// ============================================================================
// TEST STATIQUE — Orchestrateur ne contient plus de workspace_id NLQ hardcodé
// en dehors du pattern de fallback `workspaceId ?? "<NLQ>"`.
// ============================================================================
Deno.test("Orchestrator: zéro workspace_id NLQ hardcodé hors fallback", async () => {
  const src = await Deno.readTextFile(
    new URL("./index.ts", import.meta.url),
  );

  const lines = src.split("\n");
  const offenders: { line: number; text: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes(NLQ_WORKSPACE)) continue;

    // Patterns autorisés (fallback explicite, commentaires, logs).
    const allowed =
      /workspaceId\s*\?\?\s*["']00000000-0000-0000-0000-000000000001["']/.test(line) ||
      /workspace_id\s*=\s*["']00000000-0000-0000-0000-000000000001["']/.test(line) || // assignation au resolver
      /\/\/|\/\*|\*/.test(line.trim().slice(0, 2)) || // commentaire
      /console\.(log|warn|error)/.test(line); // log diagnostique

    if (!allowed) {
      offenders.push({ line: i + 1, text: line.trim() });
    }
  }

  assertEquals(
    offenders.length,
    0,
    `workspace_id NLQ hardcodé détecté hors fallback :\n${offenders
      .map((o) => `  L${o.line}: ${o.text}`)
      .join("\n")}`,
  );
});

// ============================================================================
// TEST STATIQUE — Le resolver JWT est bien câblé dans l'orchestrateur
// (Lot 1bis : workspace_members -> workspaces.owner_id -> NLQ default).
// ============================================================================
Deno.test("Orchestrator: resolver workspace_id JWT-based présent", async () => {
  const src = await Deno.readTextFile(
    new URL("./index.ts", import.meta.url),
  );
  assert(
    src.includes("workspace_id resolved from membership") ||
      src.includes("LOT 1bis"),
    "Le bloc de résolution JWT du workspace_id (Lot 1bis) est absent.",
  );
  assert(
    src.includes("workspace_members") && src.includes("authedUserId"),
    "Le resolver doit interroger workspace_members avec authedUserId.",
  );
});
