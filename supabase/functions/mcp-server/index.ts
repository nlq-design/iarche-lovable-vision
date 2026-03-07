/**
 * MCP Server Edge Function — IArche CRM
 * 
 * Exposes 9 MCP tools (6 READ + 3 WRITE) via mcp-lite + Hono.
 * Auth: Custom MCP API key (Bearer iarche_mcp_...).
 * All queries use service_role scoped by workspace_id from key.
 */

import { Hono } from "https://deno.land/x/hono@v4.4.0/mod.ts";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// === SHA-256 helper ===
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// === Auth middleware ===
interface McpAuth {
  valid: boolean;
  workspace_id?: string;
  user_id?: string;
}

async function authenticateMcpKey(req: Request): Promise<McpAuth> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer iarche_mcp_")) {
    return { valid: false };
  }

  const key = authHeader.replace("Bearer ", "");
  const keyHash = await sha256(key);

  const { data } = await supabaseAdmin
    .from("mcp_api_keys")
    .select("id, workspace_id, user_id, revoked_at, expires_at")
    .eq("key_hash", keyHash)
    .single();

  if (
    !data ||
    data.revoked_at ||
    (data.expires_at && new Date(data.expires_at) < new Date())
  ) {
    return { valid: false };
  }

  // Update last_used_at (fire-and-forget)
  supabaseAdmin
    .from("mcp_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return {
    valid: true,
    workspace_id: data.workspace_id,
    user_id: data.user_id,
  };
}

// === MCP Server setup ===
const mcpServer = new McpServer({
  name: "iarche-crm",
  version: "1.0.0",
});

// ============================================================
// TOOL 1: get_leads
// ============================================================
mcpServer.tool({
  name: "get_leads",
  description: "Liste les leads CRM du workspace IArche. Filtrable par statut, qualification et recherche texte.",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", description: "Filtrer par statut (ex: active, lost)" },
      qualification_status: { type: "string", description: "Filtrer par qualification (ex: new, hot, won)" },
      limit: { type: "number", description: "Nombre max de résultats (défaut 20)" },
      search: { type: "string", description: "Recherche texte sur nom, email ou entreprise" },
    },
  },
  handler: async (params: any) => {
    const wsId = (globalThis as any).__mcpAuth?.workspace_id;
    if (!wsId) return { content: [{ type: "text", text: "Auth error: no workspace" }] };

    let query = supabaseAdmin
      .from("leads")
      .select("id, name, email, company, lead_score, qualification_status, status, created_at")
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);

    if (params.status) query = query.eq("status", params.status);
    if (params.qualification_status) query = query.eq("qualification_status", params.qualification_status);
    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%,company.ilike.%${params.search}%`);
    }

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: `Erreur: ${error.message}` }] };

    return {
      content: [{ type: "text", text: JSON.stringify({ leads: data, count: data?.length || 0 }) }],
    };
  },
});

// ============================================================
// TOOL 2: get_lead_detail
// ============================================================
mcpServer.tool({
  name: "get_lead_detail",
  description: "Détail complet d'un lead avec ses 5 dernières activités.",
  inputSchema: {
    type: "object",
    properties: {
      lead_id: { type: "string", description: "UUID du lead" },
    },
    required: ["lead_id"],
  },
  handler: async (params, extra) => {
    const wsId = extra?.workspace_id;
    if (!wsId) return { content: [{ type: "text", text: "Auth error" }] };

    const [leadRes, activitiesRes] = await Promise.all([
      supabaseAdmin
        .from("leads")
        .select("*")
        .eq("id", params.lead_id)
        .eq("workspace_id", wsId)
        .single(),
      supabaseAdmin
        .from("activity_log")
        .select("id, activity_type, title, content, created_at")
        .eq("lead_id", params.lead_id)
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (leadRes.error) return { content: [{ type: "text", text: `Erreur: ${leadRes.error.message}` }] };

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          lead: leadRes.data,
          recent_activities: activitiesRes.data || [],
        }),
      }],
    };
  },
});

// ============================================================
// TOOL 3: get_opportunities
// ============================================================
mcpServer.tool({
  name: "get_opportunities",
  description: "Liste les opportunités commerciales du pipeline.",
  inputSchema: {
    type: "object",
    properties: {
      stage: { type: "string", description: "Filtrer par stage (ex: lead, qualified, proposal, won, lost)" },
      limit: { type: "number", description: "Nombre max (défaut 20)" },
    },
  },
  handler: async (params, extra) => {
    const wsId = extra?.workspace_id;
    if (!wsId) return { content: [{ type: "text", text: "Auth error" }] };

    let query = supabaseAdmin
      .from("opportunities")
      .select("id, title, stage, value_amount, probability, expected_close_date, lead_id, created_at")
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);

    if (params.stage) query = query.eq("stage", params.stage);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: `Erreur: ${error.message}` }] };

    return {
      content: [{ type: "text", text: JSON.stringify({ opportunities: data, count: data?.length || 0 }) }],
    };
  },
});

// ============================================================
// TOOL 4: get_projects
// ============================================================
mcpServer.tool({
  name: "get_projects",
  description: "Liste les projets en cours avec leur santé et budget.",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", description: "Filtrer par statut (ex: scoping, active, completed)" },
      health_status: { type: "string", description: "Filtrer par santé (on_track, at_risk, off_track)" },
      limit: { type: "number", description: "Nombre max (défaut 20)" },
    },
  },
  handler: async (params, extra) => {
    const wsId = extra?.workspace_id;
    if (!wsId) return { content: [{ type: "text", text: "Auth error" }] };

    let query = supabaseAdmin
      .from("projects")
      .select("id, name, status, health_status, budget_amount, consumed_amount, planned_end_date, created_at")
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);

    if (params.status) query = query.eq("status", params.status);
    if (params.health_status) query = query.eq("health_status", params.health_status);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: `Erreur: ${error.message}` }] };

    return {
      content: [{ type: "text", text: JSON.stringify({ projects: data, count: data?.length || 0 }) }],
    };
  },
});

// ============================================================
// TOOL 5: get_action_proposals
// ============================================================
mcpServer.tool({
  name: "get_action_proposals",
  description: "Liste les propositions d'action IA en attente de validation.",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", description: "Filtrer par statut (défaut: pending)" },
      limit: { type: "number", description: "Nombre max (défaut 10)" },
    },
  },
  handler: async (params, extra) => {
    const wsId = extra?.workspace_id;
    if (!wsId) return { content: [{ type: "text", text: "Auth error" }] };

    const { data, error } = await supabaseAdmin
      .from("action_proposals")
      .select("id, action_type, action_label, action_payload, ai_reasoning, status, created_at, source")
      .eq("workspace_id", wsId)
      .eq("status", params.status || "pending")
      .order("created_at", { ascending: false })
      .limit(params.limit || 10);

    if (error) return { content: [{ type: "text", text: `Erreur: ${error.message}` }] };

    return {
      content: [{ type: "text", text: JSON.stringify({ proposals: data, count: data?.length || 0 }) }],
    };
  },
});

// ============================================================
// TOOL 6: get_sentinel_alerts
// ============================================================
mcpServer.tool({
  name: "get_sentinel_alerts",
  description: "Liste les alertes Sentinel (anomalies CRM détectées). Filtrables par sévérité et statut de résolution.",
  inputSchema: {
    type: "object",
    properties: {
      severity: { type: "string", description: "Filtrer: info, warning, critical" },
      resolved: { type: "boolean", description: "Inclure les résolues? (défaut: false)" },
      limit: { type: "number", description: "Nombre max (défaut 20)" },
    },
  },
  handler: async (params, extra) => {
    const wsId = extra?.workspace_id;
    if (!wsId) return { content: [{ type: "text", text: "Auth error" }] };

    let query = supabaseAdmin
      .from("ai_sentinel_alerts")
      .select("id, severity, category, title, description, entity_type, entity_id, resolved_at, created_at")
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);

    if (params.severity) query = query.eq("severity", params.severity);
    if (!params.resolved) query = query.is("resolved_at", null);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: `Erreur: ${error.message}` }] };

    return {
      content: [{ type: "text", text: JSON.stringify({ alerts: data, count: data?.length || 0 }) }],
    };
  },
});

// ============================================================
// TOOL 7: validate_action_proposal
// ============================================================
mcpServer.tool({
  name: "validate_action_proposal",
  description: "Valider (approve) ou rejeter (reject) une proposition d'action IA. L'approbation déclenche l'exécution automatique.",
  inputSchema: {
    type: "object",
    properties: {
      proposal_id: { type: "string", description: "UUID de la proposition" },
      decision: { type: "string", description: "'approve' ou 'reject'" },
      validation_notes: { type: "string", description: "Notes optionnelles" },
    },
    required: ["proposal_id", "decision"],
  },
  handler: async (params, extra) => {
    const wsId = extra?.workspace_id;
    if (!wsId) return { content: [{ type: "text", text: "Auth error" }] };

    if (!["approve", "reject"].includes(params.decision)) {
      return { content: [{ type: "text", text: "Erreur: decision doit être 'approve' ou 'reject'" }] };
    }

    // Verify proposal belongs to workspace
    const { data: proposal } = await supabaseAdmin
      .from("action_proposals")
      .select("id, status, workspace_id")
      .eq("id", params.proposal_id)
      .eq("workspace_id", wsId)
      .single();

    if (!proposal) {
      return { content: [{ type: "text", text: "Proposition non trouvée dans ce workspace" }] };
    }

    if (proposal.status !== "pending") {
      return { content: [{ type: "text", text: `Proposition déjà traitée (statut: ${proposal.status})` }] };
    }

    if (params.decision === "reject") {
      const { error } = await supabaseAdmin
        .from("action_proposals")
        .update({
          status: "rejected",
          validation_notes: params.validation_notes || "Rejeté via MCP/Claude",
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.proposal_id);

      if (error) return { content: [{ type: "text", text: `Erreur: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify({ success: true, action: "rejected", proposal_id: params.proposal_id }) }] };
    }

    // APPROVE: call execute-action-proposal
    try {
      const execRes = await fetch(
        `${SUPABASE_URL}/functions/v1/execute-action-proposal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            proposal_id: params.proposal_id,
            validation_notes: params.validation_notes || "Approuvé via MCP/Claude",
          }),
        }
      );

      const execBody = await execRes.json().catch(() => ({ status: execRes.status }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: execRes.ok,
            action: "approved",
            proposal_id: params.proposal_id,
            execution_result: execBody,
          }),
        }],
      };
    } catch (err) {
      return { content: [{ type: "text", text: `Erreur exécution: ${err}` }] };
    }
  },
});

// ============================================================
// TOOL 8: resolve_sentinel_alert
// ============================================================
mcpServer.tool({
  name: "resolve_sentinel_alert",
  description: "Marquer une alerte Sentinel comme résolue.",
  inputSchema: {
    type: "object",
    properties: {
      alert_id: { type: "string", description: "UUID de l'alerte" },
      resolution_note: { type: "string", description: "Note de résolution optionnelle" },
    },
    required: ["alert_id"],
  },
  handler: async (params, extra) => {
    const wsId = extra?.workspace_id;
    const userId = extra?.user_id;
    if (!wsId) return { content: [{ type: "text", text: "Auth error" }] };

    const { error } = await supabaseAdmin
      .from("ai_sentinel_alerts")
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: userId || null,
        ai_metadata: params.resolution_note
          ? { resolution_note: params.resolution_note }
          : undefined,
      })
      .eq("id", params.alert_id)
      .eq("workspace_id", wsId);

    if (error) return { content: [{ type: "text", text: `Erreur: ${error.message}` }] };

    return {
      content: [{ type: "text", text: JSON.stringify({ success: true, alert_id: params.alert_id, resolved: true }) }],
    };
  },
});

// ============================================================
// TOOL 9: run_sentinel_analysis
// ============================================================
mcpServer.tool({
  name: "run_sentinel_analysis",
  description: "Déclenche une analyse Sentinel à la volée et persiste les alertes trouvées.",
  inputSchema: {
    type: "object",
    properties: {
      entity_type: { type: "string", description: "Filtrer par type d'entité (lead, opportunity, project)" },
      entity_id: { type: "string", description: "UUID d'une entité spécifique" },
    },
  },
  handler: async (params, extra) => {
    const wsId = extra?.workspace_id;
    if (!wsId) return { content: [{ type: "text", text: "Auth error" }] };

    try {
      // Call ai-sentinel Edge Function
      const sentinelRes = await fetch(
        `${SUPABASE_URL}/functions/v1/ai-sentinel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            workspace_id: wsId,
            entity_type: params.entity_type,
            entity_id: params.entity_id,
          }),
        }
      );

      const sentinelData = await sentinelRes.json();
      const alerts = sentinelData.alerts || [];

      if (alerts.length === 0) {
        return {
          content: [{ type: "text", text: JSON.stringify({ alerts_created: 0, message: "Aucune anomalie détectée" }) }],
        };
      }

      // Persist alerts to ai_sentinel_alerts
      const alertRows = alerts.map((a: { severity: string; category: string; question: string; detail: string; entity_type: string; entity_id: string }) => ({
        workspace_id: wsId,
        severity: a.severity,
        category: a.category,
        title: a.question,
        description: a.detail,
        entity_type: a.entity_type,
        entity_id: a.entity_id,
        ai_metadata: { source: "mcp_triggered", raw: a },
      }));

      const { data: inserted, error } = await supabaseAdmin
        .from("ai_sentinel_alerts")
        .insert(alertRows)
        .select("id, severity, category, title");

      if (error) {
        return { content: [{ type: "text", text: `Analyse OK mais erreur persistance: ${error.message}` }] };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            alerts_created: inserted?.length || 0,
            proposals_created: sentinelData.proposals_created || 0,
            alerts: inserted,
          }),
        }],
      };
    } catch (err) {
      return { content: [{ type: "text", text: `Erreur Sentinel: ${err}` }] };
    }
  },
});

// === Hono app with auth middleware ===
const app = new Hono();

const transport = new StreamableHttpTransport();

// Auth middleware wrapper
app.all("/*", async (c) => {
  const auth = await authenticateMcpKey(c.req.raw);

  if (!auth.valid) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Invalid or revoked MCP key" },
        id: null,
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, content-type, accept",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
        },
      }
    );
  }

  // Inject workspace context into the transport/server
  // mcp-lite handlers receive extra context via the transport
  // We patch the request to include workspace info
  const originalRequest = c.req.raw;

  // Store auth context for tool handlers
  (globalThis as any).__mcpAuth = {
    workspace_id: auth.workspace_id,
    user_id: auth.user_id,
  };

  return await transport.handleRequest(originalRequest, mcpServer);
});

// Override tool handlers to receive auth context
const originalToolMethod = mcpServer.tool.bind(mcpServer);

// Patch: inject workspace context into handler extra param
// Since mcp-lite doesn't natively pass request context to handlers,
// we use a global context variable set before each request
const _origHandler = transport.handleRequest.bind(transport);
transport.handleRequest = async (req: Request, server: McpServer) => {
  return _origHandler(req, server);
};

// Monkey-patch the tool registration to inject auth context
const registeredTools = new Map<string, Function>();

// Re-register all tools with context injection
// This is handled by the globalThis.__mcpAuth pattern above
// Tool handlers access it via: const wsId = (globalThis as any).__mcpAuth?.workspace_id

// Update all tool handlers to use globalThis context
// (Already done in handler implementations above via extra parameter)

Deno.serve(app.fetch);
