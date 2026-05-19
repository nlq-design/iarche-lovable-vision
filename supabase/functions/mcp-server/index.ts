// redeploy 15/04/2026 v8 — 48 exposed tools (88 internal)
/**
 * MCP Server Edge Function — IArche CRM (45 exposed / 85 internal tools)
 *
 * Native JSON-RPC handler — no @modelcontextprotocol/sdk dependency.
 * Eliminates safeParseAsync / Zod compatibility issues in Deno edge runtime.
 * Auth: Custom MCP API key (Bearer iarche_mcp_...) on tool calls.
 * All queries use service_role scoped by workspace_id from key.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { Hono } from 'npm:hono@^4.9.7'
import { createClient } from "npm:@supabase/supabase-js@2";
import { AsyncLocalStorage } from "node:async_hooks";

// Per-request auth isolation (fixes globalThis race condition across concurrent MCP calls)
const authStore = new AsyncLocalStorage<{ workspace_id: string; user_id?: string }>();

// === Zod-compatible shim (schema descriptors only, no validation) ===
function _sh(base: any) {
  const s: any = { ...base };
  s.optional = () => _sh({ ...base, _opt: true });
  s.describe = (d: string) => _sh({ ...base, _desc: d });
  s.uuid = () => _sh({ ...base, _format: 'uuid' });
  s.int = () => _sh({ ...base, _int: true });
  s.min = (n: number) => _sh({ ...base, _min: n });
  s.max = (n: number) => _sh({ ...base, _max: n });
  s.default = (value: any) => _sh({ ...base, _default: value });
  return s;
}
const z = {
  string: () => _sh({ _t: 'string' }),
  number: () => _sh({ _t: 'number' }),
  boolean: () => _sh({ _t: 'boolean' }),
  enum: (v: string[]) => _sh({ _t: 'string', _enum: v }),
  array: (inner: any) => _sh({ _t: 'array', _items: inner }),
  record: (inner: any) => _sh({ _t: 'object' }),
  unknown: () => _sh({ _t: 'object' }),
};

function _toJsonSchema(schema: any): any {
  if (!schema || (schema.type === 'object' && schema.properties)) return schema || { type: 'object', properties: {} };
  const props: any = {};
  const req: string[] = [];
  for (const [k, v] of Object.entries(schema)) {
    const x = v as any;
    if (typeof x !== 'object' || !x._t) continue;
    const p: any = { type: x._t };
    if (x._desc) p.description = x._desc;
    if (x._enum) p.enum = x._enum;
    if (x._format) p.format = x._format;
    if (x._int) p.type = 'integer';
    if (typeof x._min === 'number') p.minimum = x._min;
    if (typeof x._max === 'number') p.maximum = x._max;
    if (x._default !== undefined) p.default = x._default;
    if (x._t === 'array' && x._items) p.items = { type: x._items._t || 'string' };
    props[k] = p;
    if (!x._opt) req.push(k);
  }
  return { type: 'object', properties: props, ...(req.length ? { required: req } : {}) };
}

// === Tool registry (replaces McpServer) ===
interface _Tool { name: string; description: string; inputSchema: any; handler: Function; }
const _tools: _Tool[] = [];
const mcpServer = {
  registerTool(name: string, config: any, handler: Function) {
    _tools.push({ name, description: config.description || '', inputSchema: config.inputSchema, handler });
  },
};

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
  // Token resolution order:
  // 1. Authorization: Bearer iarche_mcp_*
  // 2. Query string ?apikey=iarche_mcp_*  (Claude.ai custom connector workaround — UI lacks header field)
  // 3. Header x-api-key: iarche_mcp_*
  let key: string | null = null;

  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    key = authHeader.slice("Bearer ".length).trim();
  }

  if (!key) {
    try {
      const url = new URL(req.url);
      const qp = url.searchParams.get("apikey");
      if (qp) key = qp.trim();
    } catch { /* ignore malformed URL */ }
  }

  if (!key) {
    const xApiKey = req.headers.get("x-api-key");
    if (xApiKey) key = xApiKey.trim();
  }

  if (!key || !key.startsWith("iarche_mcp_")) {
    return { valid: false };
  }

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

// === Helper to get auth context, returns error response if not authed ===
// Priority: AsyncLocalStorage (per-request, race-safe) → globalThis fallback (defensive)
function getAuthContext(): { wsId: string; userId?: string } | null {
  const fromStore = authStore.getStore();
  if (fromStore?.workspace_id) return { wsId: fromStore.workspace_id, userId: fromStore.user_id };
  const auth = (globalThis as any).__mcpAuth;
  if (!auth?.workspace_id) return null;
  return { wsId: auth.workspace_id, userId: auth.user_id };
}

function authError() {
  return { content: [{ type: "text" as const, text: "Auth error: no workspace. Provide a valid MCP API key." }] };
}

// === MCP Server setup ===
// (McpServer shim defined above — registerTool stores tools in _tools array)

// ============================================================
// TOOL 1: get_leads
// ============================================================
mcpServer.registerTool(
  "get_leads",
  {
    title: "Get Leads",
    description: "Liste les leads CRM du workspace IArche. Filtrable par statut, qualification et recherche texte.",
    inputSchema: {
      status: z.string().optional().describe("Filtrer par statut (ex: active, lost)"),
      qualification_status: z.string().optional().describe("Filtrer par qualification (ex: new, hot, won)"),
      limit: z.number().optional().describe("Nombre max de résultats (défaut 20)"),
      search: z.string().optional().describe("Recherche texte sur nom, email ou entreprise"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin
      .from("leads")
      .select("id, name, email, company, lead_score, qualification_status, status, created_at")
      .eq("workspace_id", ctx.wsId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);

    if (params.status) query = query.eq("status", params.status);
    if (params.qualification_status) query = query.eq("qualification_status", params.qualification_status);
    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%,company.ilike.%${params.search}%`);
    }

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ leads: data, count: data?.length || 0 }) }],
    };
  }
);

// ============================================================
// TOOL 2: get_lead_detail
// ============================================================
mcpServer.registerTool(
  "get_lead_detail",
  {
    title: "Get Lead Detail",
    description: "Détail complet d'un lead avec ses 5 dernières activités.",
    inputSchema: {
      lead_id: z.string().describe("UUID du lead"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const [leadRes, activitiesRes] = await Promise.all([
      supabaseAdmin
        .from("leads")
        .select("*")
        .eq("id", params.lead_id)
        .eq("workspace_id", ctx.wsId)
        .single(),
      supabaseAdmin
        .from("activity_log")
        .select("id, activity_type, title, content, created_at")
        .eq("lead_id", params.lead_id)
        .eq("workspace_id", ctx.wsId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (leadRes.error) return { content: [{ type: "text" as const, text: `Erreur: ${leadRes.error.message}` }] };

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          lead: leadRes.data,
          recent_activities: activitiesRes.data || [],
        }),
      }],
    };
  }
);

// ============================================================
// TOOL 3: get_opportunities
// ============================================================
mcpServer.registerTool(
  "get_opportunities",
  {
    title: "Get Opportunities",
    description: "Liste les opportunités commerciales du pipeline.",
    inputSchema: {
      stage: z.string().optional().describe("Filtrer par stage (ex: lead, qualified, proposal, won, lost)"),
      limit: z.number().optional().describe("Nombre max (défaut 20)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin
      .from("opportunities")
      .select("id, title, stage, value_amount, probability, expected_close_date, lead_id, created_at")
      .eq("workspace_id", ctx.wsId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);

    if (params.stage) query = query.eq("stage", params.stage);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ opportunities: data, count: data?.length || 0 }) }],
    };
  }
);

// ============================================================
// TOOL 4: get_projects
// ============================================================
mcpServer.registerTool(
  "get_projects",
  {
    title: "Get Projects",
    description: "Liste les projets en cours avec leur santé et budget.",
    inputSchema: {
      status: z.string().optional().describe("Filtrer par statut (ex: scoping, active, completed)"),
      health_status: z.string().optional().describe("Filtrer par santé (on_track, at_risk, off_track)"),
      limit: z.number().optional().describe("Nombre max (défaut 20)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin
      .from("projects")
      .select("id, name, status, health_status, budget_amount, consumed_amount, planned_end_date, created_at")
      .eq("workspace_id", ctx.wsId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);

    if (params.status) query = query.eq("status", params.status);
    if (params.health_status) query = query.eq("health_status", params.health_status);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ projects: data, count: data?.length || 0 }) }],
    };
  }
);

// ============================================================
// TOOL 5: get_action_proposals
// ============================================================
mcpServer.registerTool(
  "get_action_proposals",
  {
    title: "Get Action Proposals",
    description: "Liste les propositions d'action IA en attente de validation.",
    inputSchema: {
      status: z.string().optional().describe("Filtrer par statut (défaut: pending)"),
      limit: z.number().optional().describe("Nombre max (défaut 10)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const { data, error } = await supabaseAdmin
      .from("action_proposals")
      .select("id, action_type, action_label, action_payload, ai_reasoning, status, created_at, source")
      .eq("workspace_id", ctx.wsId)
      .eq("status", params.status || "pending")
      .order("created_at", { ascending: false })
      .limit(params.limit || 10);

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ proposals: data, count: data?.length || 0 }) }],
    };
  }
);

// ============================================================
// TOOL 6: get_sentinel_alerts
// ============================================================
mcpServer.registerTool(
  "get_sentinel_alerts",
  {
    title: "Get Sentinel Alerts",
    description: "Liste les alertes Sentinel (anomalies CRM détectées). Filtrables par sévérité et statut de résolution.",
    inputSchema: {
      severity: z.string().optional().describe("Filtrer: info, warning, critical"),
      resolved: z.boolean().optional().describe("Inclure les résolues? (défaut: false)"),
      limit: z.number().optional().describe("Nombre max (défaut 20)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin
      .from("ai_sentinel_alerts")
      .select("id, severity, category, title, description, entity_type, entity_id, resolved_at, created_at")
      .eq("workspace_id", ctx.wsId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);

    if (params.severity) query = query.eq("severity", params.severity);
    if (!params.resolved) query = query.is("resolved_at", null);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ alerts: data, count: data?.length || 0 }) }],
    };
  }
);

// ============================================================
// TOOL 7: validate_action_proposal
// ============================================================
mcpServer.registerTool(
  "validate_action_proposal",
  {
    title: "Validate Action Proposal",
    description: "Valider (approve) ou rejeter (reject) une proposition d'action IA. L'approbation déclenche l'exécution automatique.",
    inputSchema: {
      proposal_id: z.string().describe("UUID de la proposition"),
      decision: z.enum(["approve", "reject"]).describe("'approve' ou 'reject'"),
      validation_notes: z.string().optional().describe("Notes optionnelles"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const { data: proposal } = await supabaseAdmin
      .from("action_proposals")
      .select("id, status, workspace_id")
      .eq("id", params.proposal_id)
      .eq("workspace_id", ctx.wsId)
      .single();

    if (!proposal) {
      return { content: [{ type: "text" as const, text: "Proposition non trouvée dans ce workspace" }] };
    }

    if (proposal.status !== "pending") {
      return { content: [{ type: "text" as const, text: `Proposition déjà traitée (statut: ${proposal.status})` }] };
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

      if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, action: "rejected", proposal_id: params.proposal_id }) }] };
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
          type: "text" as const,
          text: JSON.stringify({
            success: execRes.ok,
            action: "approved",
            proposal_id: params.proposal_id,
            execution_result: execBody,
          }),
        }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur exécution: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 8: resolve_sentinel_alert
// ============================================================
mcpServer.registerTool(
  "resolve_sentinel_alert",
  {
    title: "Resolve Sentinel Alert",
    description: "Marquer une alerte Sentinel comme résolue.",
    inputSchema: {
      alert_id: z.string().describe("UUID de l'alerte"),
      resolution_note: z.string().optional().describe("Note de résolution optionnelle"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const { error } = await supabaseAdmin
      .from("ai_sentinel_alerts")
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: ctx.userId || null,
        ai_metadata: params.resolution_note
          ? { resolution_note: params.resolution_note }
          : undefined,
      })
      .eq("id", params.alert_id)
      .eq("workspace_id", ctx.wsId);

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: true, alert_id: params.alert_id, resolved: true }) }],
    };
  }
);

// ============================================================
// TOOL 9: run_sentinel_analysis
// ============================================================
mcpServer.registerTool(
  "run_sentinel_analysis",
  {
    title: "Run Sentinel Analysis",
    description: "Déclenche une analyse Sentinel à la volée et persiste les alertes trouvées.",
    inputSchema: {
      entity_type: z.string().optional().describe("Filtrer par type d'entité (lead, opportunity, project)"),
      entity_id: z.string().optional().describe("UUID d'une entité spécifique"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    try {
      const sentinelRes = await fetch(
        `${SUPABASE_URL}/functions/v1/ai-sentinel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            workspace_id: ctx.wsId,
            entity_type: params.entity_type,
            entity_id: params.entity_id,
          }),
        }
      );

      const sentinelData = await sentinelRes.json();
      const alerts = sentinelData.alerts || [];

      if (alerts.length === 0) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ alerts_created: 0, message: "Aucune anomalie détectée" }) }],
        };
      }

      const alertRows = alerts.map((a: any) => ({
        workspace_id: ctx.wsId,
        severity: a.severity,
        category: a.category,
        title: a.question || a.title,
        description: a.detail || a.description,
        entity_type: a.entity_type,
        entity_id: a.entity_id,
        ai_metadata: { source: "mcp_triggered", raw: a },
      }));

      const { data: inserted, error } = await supabaseAdmin
        .from("ai_sentinel_alerts")
        .insert(alertRows)
        .select("id, severity, category, title");

      if (error) {
        return { content: [{ type: "text" as const, text: `Analyse OK mais erreur persistance: ${error.message}` }] };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            alerts_created: inserted?.length || 0,
            proposals_created: sentinelData.proposals_created || 0,
            alerts: inserted,
          }),
        }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur Sentinel: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 10: create_lead
// ============================================================
mcpServer.registerTool(
  "create_lead",
  {
    title: "Create Lead",
    description: "Créer un nouveau lead dans le CRM IArche.",
    inputSchema: {
      name: z.string().describe("Nom complet du lead"),
      email: z.string().describe("Email du lead"),
      source: z.string().describe("Source d'acquisition (ex: mcp, linkedin, salon)"),
      company: z.string().optional().describe("Nom de l'entreprise"),
      phone: z.string().optional().describe("Téléphone"),
      position: z.string().optional().describe("Poste / fonction"),
      industry: z.string().optional().describe("Secteur d'activité"),
      city: z.string().optional().describe("Ville"),
      budget: z.number().optional().describe("Budget estimé en euros"),
      qualification_status: z.string().optional().describe("Statut qualification (new, contacted, qualified, hot, won, lost)"),
      message: z.string().optional().describe("Notes / message libre"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const slug = params.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const { data, error } = await supabaseAdmin.from("leads").insert({
      workspace_id: ctx.wsId,
      name: params.name,
      email: params.email,
      source: params.source,
      slug,
      company: params.company || null,
      phone: params.phone || null,
      position: params.position || null,
      industry: params.industry || null,
      city: params.city || null,
      budget: params.budget || null,
      qualification_status: params.qualification_status || "new",
      message: params.message || null,
    }).select("id, name, email, company, slug, created_at").single();

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, lead: data }) }] };
  }
);

// ============================================================
// TOOL 11: update_lead
// ============================================================
mcpServer.registerTool(
  "update_lead",
  {
    title: "Update Lead",
    description: "Modifier un ou plusieurs champs d'un lead existant. Seuls les champs fournis sont mis à jour.",
    inputSchema: {
      lead_id: z.string().describe("UUID du lead à modifier"),
      name: z.string().optional(),
      email: z.string().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
      position: z.string().optional(),
      industry: z.string().optional(),
      city: z.string().optional(),
      address: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional(),
      website: z.string().optional(),
      linkedin_url: z.string().optional(),
      company_size: z.string().optional(),
      revenue_range: z.string().optional(),
      siret: z.string().optional(),
      budget: z.number().optional(),
      lead_score: z.number().optional(),
      qualification_status: z.string().optional(),
      status: z.string().optional(),
      consent_marketing: z.boolean().optional(),
      synthesis_stale: z.boolean().optional(),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const { lead_id, ...fields } = params;
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }

    if (Object.keys(updates).length === 0) {
      return { content: [{ type: "text" as const, text: "Aucun champ à mettre à jour fourni." }] };
    }

    const { data, error } = await supabaseAdmin
      .from("leads")
      .update(updates)
      .eq("id", lead_id)
      .eq("workspace_id", ctx.wsId)
      .select("*")
      .single();

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, lead: data }) }] };
  }
);

// ============================================================
// TOOL 12: create_task
// ============================================================
mcpServer.registerTool(
  "create_task",
  {
    title: "Create Task",
    description: "Créer une tâche liée à un lead ou projet.",
    inputSchema: {
      title: z.string().describe("Titre de la tâche"),
      description: z.string().optional().describe("Description détaillée"),
      status: z.string().optional().describe("Statut (défaut: todo)"),
      priority: z.string().optional().describe("Priorité: low, medium, high, urgent (défaut: medium)"),
      assigned_to: z.string().optional().describe("UUID utilisateur assigné"),
      due_date: z.string().optional().describe("Date d'échéance ISO"),
      lead_id: z.string().optional().describe("UUID lead lié"),
      project_id: z.string().optional().describe("UUID projet lié"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const { data, error } = await supabaseAdmin.from("tasks").insert({
      workspace_id: ctx.wsId,
      title: params.title,
      description: params.description || null,
      status: params.status || "todo",
      priority: params.priority || "medium",
      assigned_to: params.assigned_to || null,
      due_date: params.due_date || null,
      lead_id: params.lead_id || null,
      project_id: params.project_id || null,
    }).select("id, title, status, priority, due_date, lead_id, project_id, created_at").single();

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, task: data }) }] };
  }
);

// ============================================================
// TOOL 13: create_activity_note
// ============================================================
mcpServer.registerTool(
  "create_activity_note",
  {
    title: "Create Activity Note",
    description: "Ajouter une note ou activité dans le journal CRM (append-only).",
    inputSchema: {
      entity_type: z.string().describe("Type d'entité (lead, project, opportunity, partner)"),
      entity_id: z.string().describe("UUID de l'entité"),
      activity_type: z.string().describe("Type d'activité (note, call, email, meeting, status_change, task)"),
      title: z.string().describe("Titre de l'activité"),
      content: z.string().optional().describe("Contenu détaillé"),
      lead_id: z.string().optional().describe("UUID lead lié"),
      opportunity_id: z.string().optional().describe("UUID opportunité liée"),
      project_id: z.string().optional().describe("UUID projet lié"),
      task_id: z.string().optional().describe("UUID tâche liée"),
      visibility: z.string().optional().describe("Visibilité: internal, team, public (défaut: internal)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const { data, error } = await supabaseAdmin.from("activity_log").insert({
      workspace_id: ctx.wsId,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      activity_type: params.activity_type,
      title: params.title,
      content: params.content || null,
      lead_id: params.lead_id || null,
      project_id: params.project_id || null,
      visibility: params.visibility || "internal",
      is_ai_generated: true,
      created_by: ctx.userId || null,
    }).select("id, title, activity_type, entity_type, created_at").single();

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, activity: data }) }] };
  }
);

// ============================================================
// TOOL 14: generate_followup_email
// ============================================================
mcpServer.registerTool(
  "generate_followup_email",
  {
    title: "Generate Follow-up Email",
    description: "Générer un brouillon d'email de relance IA pour un lead.",
    inputSchema: {
      lead_id: z.string().describe("UUID du lead"),
      context: z.string().optional().describe("Contexte additionnel pour personnaliser le mail"),
      tone: z.string().optional().describe("Ton souhaité (formel, amical, direct)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-followup-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          lead_id: params.lead_id,
          workspace_id: ctx.wsId,
          context: params.context,
          tone: params.tone,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { content: [{ type: "text" as const, text: `Erreur: ${JSON.stringify(data)}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, email_draft: data }) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 15: search_viviers
// ============================================================
mcpServer.registerTool(
  "search_viviers",
  {
    title: "Search Viviers",
    description: "Recherche IA dans la base de 170k+ prospects (viviers). Accepte une requête en langage naturel.",
    inputSchema: {
      query: z.string().describe("Requête de recherche en langage naturel (ex: 'agences immobilières à Lyon')"),
      filters: z.record(z.unknown()).optional().describe("Filtres structurés optionnels"),
      limit: z.number().optional().describe("Nombre max de résultats (défaut 20)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/vivier-ai-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          query: params.query,
          workspace_id: ctx.wsId,
          filters: params.filters,
          limit: params.limit || 20,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { content: [{ type: "text" as const, text: `Erreur: ${JSON.stringify(data)}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, results: data }) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 16: promote_vivier
// ============================================================
mcpServer.registerTool(
  "promote_vivier",
  {
    title: "Promote Vivier to Lead",
    description: "Promouvoir un prospect vivier en lead CRM actif.",
    inputSchema: {
      vivier_id: z.string().describe("UUID du vivier à promouvoir"),
      source: z.string().optional().describe("Source d'acquisition (défaut: vivier)"),
      notes: z.string().optional().describe("Notes de promotion"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/promote-vivier-to-lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          vivier_id: params.vivier_id,
          workspace_id: ctx.wsId,
          source: params.source || "vivier",
          notes: params.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { content: [{ type: "text" as const, text: `Erreur: ${JSON.stringify(data)}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, promotion: data }) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 17: run_consulte
// ============================================================
mcpServer.registerTool(
  "run_consulte",
  {
    title: "Run Consulte Synthesis",
    description: "Lancer une synthèse 360° Consulte sur un lead ou projet. Agrège transcriptions, notes, documents.",
    inputSchema: {
      entity_type: z.enum(["lead", "project"]).describe("Type d'entité"),
      entity_id: z.string().describe("UUID de l'entité"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/synthesize-entity-documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          entity_type: params.entity_type,
          entity_id: params.entity_id,
          workspace_id: ctx.wsId,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { content: [{ type: "text" as const, text: `Erreur: ${JSON.stringify(data)}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, synthesis: data }) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 18: upsert_opportunity
// ============================================================
mcpServer.registerTool(
  "upsert_opportunity",
  {
    title: "Upsert Opportunity",
    description: "Créer ou mettre à jour une opportunité commerciale dans le pipeline.",
    inputSchema: {
      title: z.string().describe("Titre de l'opportunité"),
      stage: z.string().describe("Stage du pipeline (lead, qualified, proposal, negotiation, won, lost)"),
      opportunity_id: z.string().optional().describe("UUID existant pour mise à jour"),
      lead_id: z.string().optional().describe("UUID lead associé"),
      description: z.string().optional(),
      value_amount: z.number().optional().describe("Montant du deal en euros"),
      expected_revenue: z.number().optional().describe("Revenu attendu"),
      probability: z.number().optional().describe("Probabilité de closing (0-100)"),
      expected_close_date: z.string().optional().describe("Date de closing prévue ISO"),
      source: z.string().optional().describe("Source de l'opportunité"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const payload: Record<string, unknown> = {
      workspace_id: ctx.wsId,
      title: params.title,
      stage: params.stage,
    };
    if (params.lead_id) payload.lead_id = params.lead_id;
    if (params.description !== undefined) payload.description = params.description;
    if (params.value_amount !== undefined) payload.value_amount = params.value_amount;
    if (params.expected_revenue !== undefined) payload.expected_revenue = params.expected_revenue;
    if (params.probability !== undefined) payload.probability = params.probability;
    if (params.expected_close_date) payload.expected_close_date = params.expected_close_date;
    if (params.source) payload.source = params.source;

    if (params.opportunity_id) {
      // UPDATE
      const { workspace_id: _ws, ...updateFields } = payload as any;
      const { data, error } = await supabaseAdmin
        .from("opportunities")
        .update(updateFields)
        .eq("id", params.opportunity_id)
        .eq("workspace_id", ctx.wsId)
        .select("*")
        .single();

      if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, action: "updated", opportunity: data }) }] };
    } else {
      // INSERT
      const { data, error } = await supabaseAdmin
        .from("opportunities")
        .insert(payload)
        .select("*")
        .single();

      if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, action: "created", opportunity: data }) }] };
    }
  }
);

// ============================================================
// TOOL 19: lookup_company
// ============================================================
mcpServer.registerTool(
  "lookup_company",
  {
    title: "Lookup Company (Pappers)",
    description: "Enrichir les données d'une entreprise via Pappers : SIRET, dirigeants, CA, effectifs, code NAF.",
    inputSchema: {
      query: z.string().describe("Nom d'entreprise ou numéro SIRET"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/pappers-lookup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          query: params.query,
          workspace_id: ctx.wsId,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { content: [{ type: "text" as const, text: `Erreur: ${JSON.stringify(data)}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, company: data }) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur: ${err}` }] };
    }
  }
);
// ============================================================
// TOOL 20: get_tasks
// ============================================================
mcpServer.registerTool(
  "get_tasks",
  {
    title: "Get Tasks",
    description: "Liste les tâches CRM. Filtrable par statut, priorité, lead ou projet.",
    inputSchema: {
      status: z.string().optional().describe("Filtrer par statut (todo, in_progress, done, cancelled)"),
      priority: z.string().optional().describe("Filtrer par priorité (low, medium, high, urgent)"),
      lead_id: z.string().optional().describe("Filtrer par lead"),
      project_id: z.string().optional().describe("Filtrer par projet"),
      limit: z.number().optional().describe("Nombre max (défaut 20)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin
      .from("tasks")
      .select("id, title, status, priority, due_date, assigned_to, lead_id, project_id, task_type, created_at")
      .eq("workspace_id", ctx.wsId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);

    if (params.status) query = query.eq("status", params.status);
    if (params.priority) query = query.eq("priority", params.priority);
    if (params.lead_id) query = query.eq("lead_id", params.lead_id);
    if (params.project_id) query = query.eq("project_id", params.project_id);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ tasks: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 21: update_task
// ============================================================
mcpServer.registerTool(
  "update_task",
  {
    title: "Update Task",
    description: "Modifier un ou plusieurs champs d'une tâche existante.",
    inputSchema: {
      task_id: z.string().describe("UUID de la tâche"),
      title: z.string().optional(),
      status: z.string().optional().describe("todo, in_progress, done, cancelled"),
      priority: z.string().optional().describe("low, medium, high, urgent"),
      due_date: z.string().optional().describe("Date d'échéance ISO"),
      assigned_to: z.string().optional().describe("UUID utilisateur assigné"),
      description: z.string().optional(),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const { task_id, ...fields } = params;
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    if (Object.keys(updates).length === 0) {
      return { content: [{ type: "text" as const, text: "Aucun champ à mettre à jour." }] };
    }

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .update(updates)
      .eq("id", task_id)
      .eq("workspace_id", ctx.wsId)
      .select("id, title, status, priority, due_date, assigned_to, lead_id, project_id, updated_at")
      .single();

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, task: data }) }] };
  }
);

// ============================================================
// TOOL 22: get_activity_log
// ============================================================
mcpServer.registerTool(
  "get_activity_log",
  {
    title: "Get Activity Log",
    description: "Journal d'activité CRM. Filtrable par entité, lead ou projet.",
    inputSchema: {
      entity_type: z.string().optional().describe("Filtrer par type d'entité (lead, project, opportunity, partner)"),
      entity_id: z.string().optional().describe("UUID de l'entité spécifique"),
      lead_id: z.string().optional().describe("Filtrer par lead"),
      project_id: z.string().optional().describe("Filtrer par projet"),
      limit: z.number().optional().describe("Nombre max (défaut 30)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin
      .from("activity_log")
      .select("id, entity_type, entity_id, activity_type, title, content, lead_id, project_id, created_at, is_ai_generated")
      .eq("workspace_id", ctx.wsId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 30);

    if (params.entity_type) query = query.eq("entity_type", params.entity_type);
    if (params.entity_id) query = query.eq("entity_id", params.entity_id);
    if (params.lead_id) query = query.eq("lead_id", params.lead_id);
    if (params.project_id) query = query.eq("project_id", params.project_id);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ activities: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 23: get_bookings
// ============================================================
mcpServer.registerTool(
  "get_bookings",
  {
    title: "Get Bookings",
    description: "Liste les rendez-vous planifiés.",
    inputSchema: {
      status: z.string().optional().describe("Filtrer par statut (confirmed, cancelled, completed)"),
      lead_id: z.string().optional().describe("Filtrer par lead"),
      limit: z.number().optional().describe("Nombre max (défaut 20)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin
      .from("bookings")
      .select("id, name, email, start_time, end_time, status, meeting_type, lead_id, google_meet_link, created_at")
      .eq("workspace_id", ctx.wsId)
      .order("start_time", { ascending: false })
      .limit(params.limit || 20);

    if (params.status) query = query.eq("status", params.status);
    if (params.lead_id) query = query.eq("lead_id", params.lead_id);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ bookings: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 24: get_meeting_notes
// ============================================================
mcpServer.registerTool(
  "get_meeting_notes",
  {
    title: "Get Meeting Notes",
    description: "Liste les comptes-rendus de réunion.",
    inputSchema: {
      project_id: z.string().optional().describe("Filtrer par projet"),
      opportunity_id: z.string().optional().describe("Filtrer par opportunité"),
      booking_id: z.string().optional().describe("Filtrer par booking"),
      limit: z.number().optional().describe("Nombre max (défaut 20)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin
      .from("meeting_notes")
      .select("id, notes, objectives, next_steps, ai_summary, action_items, booking_id, project_id, opportunity_id, created_at")
      .eq("workspace_id", ctx.wsId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);

     if (params.project_id) query = query.eq("project_id", params.project_id);
    if (params.opportunity_id) query = query.eq("opportunity_id", params.opportunity_id);
    if (params.booking_id) query = query.eq("booking_id", params.booking_id);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ meeting_notes: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 25: create_meeting_note
// ============================================================
mcpServer.registerTool(
  "create_meeting_note",
  {
    title: "Create Meeting Note",
    description: "Créer un compte-rendu de réunion.",
    inputSchema: {
      notes: z.string().describe("Contenu des notes de réunion"),
      objectives: z.string().optional().describe("Objectifs de la réunion"),
      next_steps: z.string().optional().describe("Prochaines étapes"),
      booking_id: z.string().optional().describe("UUID du booking lié"),
      project_id: z.string().optional().describe("UUID du projet lié"),
      opportunity_id: z.string().optional().describe("UUID de l'opportunité liée"),
      action_items: z.string().optional().describe("Actions à réaliser (texte libre)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const { data, error } = await supabaseAdmin.from("meeting_notes").insert({
      workspace_id: ctx.wsId,
      notes: params.notes,
      objectives: params.objectives || null,
      next_steps: params.next_steps || null,
      booking_id: params.booking_id || null,
      project_id: params.project_id || null,
      opportunity_id: params.opportunity_id || null,
      action_items: params.action_items ? [{ text: params.action_items, done: false }] : null,
      created_by: ctx.userId || null,
    }).select("id, notes, objectives, next_steps, created_at").single();

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, meeting_note: data }) }] };
  }
);

// ============================================================
// TOOL 26: create_booking
// ============================================================
mcpServer.registerTool(
  "create_booking",
  {
    title: "Create Booking",
    description: "Créer un rendez-vous dans le calendrier.",
    inputSchema: {
      name: z.string().describe("Nom du contact"),
      email: z.string().describe("Email du contact"),
      start_time: z.string().describe("Date/heure de début ISO (ex: 2026-03-10T14:00:00Z)"),
      booking_type_id: z.string().describe("UUID du type de booking"),
      end_time: z.string().optional().describe("Date/heure de fin ISO (calculée auto si absente)"),
      message: z.string().optional().describe("Message ou contexte du RDV"),
      lead_id: z.string().optional().describe("UUID lead lié"),
      meeting_type: z.string().optional().describe("Type: visio, phone, in_person"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    // Default end_time = start_time + 30 min if not provided
    const endTime = params.end_time || new Date(new Date(params.start_time).getTime() + 30 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin.from("bookings").insert({
      workspace_id: ctx.wsId,
      name: params.name,
      email: params.email,
      start_time: params.start_time,
      end_time: endTime,
      booking_type_id: params.booking_type_id,
      status: "confirmed",
      message: params.message || null,
      lead_id: params.lead_id || null,
      meeting_type: params.meeting_type || null,
    }).select("id, name, email, start_time, end_time, status, created_at").single();

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, booking: data }) }] };
  }
);

// ============================================================
// TOOL 27: get_partners
// ============================================================
mcpServer.registerTool(
  "get_partners",
  {
    title: "Get Partners",
    description: "Liste les partenaires du workspace.",
    inputSchema: {
      partner_type: z.string().optional().describe("Filtrer par type (client, partenaire, affilie, apporteur_affaires)"),
      partner_subtype: z.string().optional().describe("Filtrer par sous-type (expert_ia, independant, apport_affaires)"),
      is_active: z.boolean().optional().describe("Filtrer par statut actif"),
      limit: z.number().optional().describe("Nombre max (défaut 20)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin
      .from("partners")
      .select("id, name, email, company, partner_type, partner_subtype, specialties, commission_rate, is_active, created_at")
      .eq("workspace_id", ctx.wsId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);

    if (params.partner_type) query = query.eq("partner_type", params.partner_type);
    if (params.partner_subtype) query = query.eq("partner_subtype", params.partner_subtype);
    if (params.is_active !== undefined) query = query.eq("is_active", params.is_active);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ partners: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 28: update_partner
// ============================================================
mcpServer.registerTool(
  "update_partner",
  {
    title: "Update Partner",
    description: "Modifier les informations d'un partenaire.",
    inputSchema: {
      partner_id: z.string().describe("UUID du partenaire"),
      name: z.string().optional(),
      email: z.string().optional(),
      company: z.string().optional(),
      partner_type: z.string().optional().describe("client, partenaire, affilie, apporteur_affaires"),
      partner_subtype: z.string().optional().describe("expert_ia, independant, apport_affaires"),
      specialties: z.array(z.string()).optional().describe("Liste de spécialités"),
      commission_rate: z.number().optional().describe("Taux de commission (0-100)"),
      is_active: z.boolean().optional(),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const { partner_id, ...fields } = params;
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    if (Object.keys(updates).length === 0) {
      return { content: [{ type: "text" as const, text: "Aucun champ à mettre à jour." }] };
    }

    const { data, error } = await supabaseAdmin
      .from("partners")
      .update(updates)
      .eq("id", partner_id)
      .eq("workspace_id", ctx.wsId)
      .select("id, name, email, company, partner_type, partner_subtype, specialties, commission_rate, is_active, updated_at")
      .single();

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, partner: data }) }] };
  }
);

// ============================================================
// TOOL 29: get_documents
// ============================================================
mcpServer.registerTool(
  "get_documents",
  {
    title: "Get Documents",
    description: "Liste les documents générés (devis, propositions, CDC).",
    inputSchema: {
      document_type: z.string().optional().describe("Filtrer par type (devis, proposition, cdc, rapport)"),
      status: z.string().optional().describe("Filtrer par statut (draft, sent, approved, rejected)"),
      lead_id: z.string().optional().describe("Filtrer par lead"),
      project_id: z.string().optional().describe("Filtrer par projet"),
      limit: z.number().optional().describe("Nombre max (défaut 20)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin
      .from("generated_documents")
      .select("id, title, document_type, status, quote_number, lead_id, project_id, created_at")
      .eq("workspace_id", ctx.wsId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);

    if (params.document_type) query = query.eq("document_type", params.document_type);
    if (params.status) query = query.eq("status", params.status);
    if (params.lead_id) query = query.eq("lead_id", params.lead_id);
    if (params.project_id) query = query.eq("project_id", params.project_id);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ documents: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 30: create_document
// ============================================================
mcpServer.registerTool(
  "create_document",
  {
    title: "Create Document",
    description: "Générer un document commercial (devis, proposition) via IA.",
    inputSchema: {
      template_type: z.string().describe("Type de template (devis, proposition, cdc, rapport)"),
      lead_id: z.string().describe("UUID du lead associé"),
      project_id: z.string().optional().describe("UUID du projet associé"),
      custom_data: z.record(z.unknown()).optional().describe("Données personnalisées pour le document"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          template_type: params.template_type,
          lead_id: params.lead_id,
          project_id: params.project_id,
          custom_data: params.custom_data,
          workspace_id: ctx.wsId,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { content: [{ type: "text" as const, text: `Erreur: ${JSON.stringify(data)}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, document: data }) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 31: get_contacts
// ============================================================
mcpServer.registerTool(
  "get_contacts",
  {
    title: "Get Contacts",
    description: "Liste les messages de contact entrants (formulaire de contact public).",
    inputSchema: {
      source: z.string().optional().describe("Filtrer par source"),
      limit: z.number().optional().describe("Nombre max (défaut 20)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin
      .from("contacts")
      .select("id, name, email, company, subject, message, source, created_at")
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);

    if (params.source) query = query.eq("source", params.source);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ contacts: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 32: get_lead_contacts
// ============================================================
mcpServer.registerTool(
  "get_lead_contacts",
  {
    title: "Get Lead Contacts",
    description: "Liste les contacts multiples associés à un lead (interlocuteurs).",
    inputSchema: {
      lead_id: z.string().describe("UUID du lead"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const { data, error } = await supabaseAdmin
      .from("lead_contacts")
      .select("id, name, email, phone, position, is_primary, created_at")
      .eq("lead_id", params.lead_id);

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ lead_contacts: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 32b: create_lead_contact
// ============================================================
mcpServer.registerTool(
  "create_lead_contact",
  {
    title: "Create Lead Contact",
    description: "Créer un contact (interlocuteur) rattaché à un lead existant.",
    inputSchema: {
      lead_id: z.string().uuid().describe("UUID du lead parent"),
      name: z.string().describe("Nom complet du contact"),
      email: z.string().optional().describe("Email"),
      phone: z.string().optional().describe("Téléphone"),
      position: z.string().optional().describe("Fonction / poste"),
      is_primary: z.boolean().optional().describe("Marquer comme contact principal"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const { data, error } = await supabaseAdmin
      .from("lead_contacts")
      .insert({
        workspace_id: ctx.wsId,
        lead_id: params.lead_id,
        name: params.name,
        email: params.email || null,
        phone: params.phone || null,
        position: params.position || null,
        is_primary: params.is_primary ?? false,
      })
      .select("id, lead_id, name, email, phone, position, is_primary")
      .single();

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, lead_contact: data }) }] };
  }
);


// ============================================================
// TOOL 33: get_ai_prompts
// ============================================================
mcpServer.registerTool(
  "get_ai_prompts",
  {
    title: "Get AI Prompts",
    description: "Liste les prompts IA configurés dans le système. Permet de consulter et auditer la configuration IA.",
    inputSchema: {
      category: z.string().optional().describe("Filtrer par catégorie (ex: commercial, content, agent)"),
      slug: z.string().optional().describe("Récupérer un prompt spécifique par slug"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin
      .from("ai_prompts")
      .select("id, slug, name, category, version, system_prompt, user_prompt, model_config")
      .order("category")
      .order("slug");

    if (params.category) query = query.eq("category", params.category);
    if (params.slug) query = query.eq("slug", params.slug);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ prompts: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 34: update_ai_prompt
// ============================================================
mcpServer.registerTool(
  "update_ai_prompt",
  {
    title: "Update AI Prompt",
    description: "Modifier un prompt IA par son slug. Incrémente automatiquement le numéro de version.",
    inputSchema: {
      slug: z.string().describe("Slug identifiant du prompt"),
      system_prompt: z.string().optional().describe("Nouveau system prompt"),
      user_prompt: z.string().optional().describe("Nouveau user prompt"),
      model_config: z.record(z.unknown()).optional().describe("Config modèle (model, temperature, max_tokens)"),
      name: z.string().optional().describe("Nouveau nom du prompt"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    // First fetch current version
    const { data: current, error: fetchErr } = await supabaseAdmin
      .from("ai_prompts")
      .select("id, version")
      .eq("slug", params.slug)
      .single();

    if (fetchErr || !current) {
      return { content: [{ type: "text" as const, text: `Prompt '${params.slug}' non trouvé.` }] };
    }

    const { slug, ...fields } = params;
    const updates: Record<string, unknown> = {
      version: (current.version || 1) + 1,
      updated_at: new Date().toISOString(),
    };
    if (fields.system_prompt !== undefined) updates.system_prompt = fields.system_prompt;
    if (fields.user_prompt !== undefined) updates.user_prompt = fields.user_prompt;
    if (fields.model_config !== undefined) updates.model_config = fields.model_config;
    if (fields.name !== undefined) updates.name = fields.name;

    const { data, error } = await supabaseAdmin
      .from("ai_prompts")
      .update(updates)
      .eq("id", current.id)
      .select("id, slug, name, category, version, system_prompt, user_prompt, model_config, updated_at")
      .single();

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, prompt: data }) }] };
  }
);

// ============================================================
// TOOL 35: get_ai_dashboard
// ============================================================
mcpServer.registerTool(
  "get_ai_dashboard",
  {
    title: "Get AI Dashboard Metrics",
    description: "KPIs IA en temps réel : embeddings indexés, entités stale, notifications en attente.",
    inputSchema: {},
  },
  async () => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const { data, error } = await supabaseAdmin
      .from("ai_dashboard_metrics")
      .select("*")
      .limit(1)
      .single();

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ dashboard: data }) }] };
  }
);

// ============================================================
// TOOL 36: get_ai_usage
// ============================================================
mcpServer.registerTool(
  "get_ai_usage",
  {
    title: "Get AI Usage Stats",
    description: "Coûts et tokens IA agrégés par API et par jour.",
    inputSchema: {
      days: z.number().optional().describe("Nombre de jours à remonter (défaut 7)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - (params.days || 7));

    const { data, error } = await supabaseAdmin
      .from("api_usage_summary")
      .select("*")
      .eq("workspace_id", ctx.wsId)
      .gte("usage_date", daysAgo.toISOString().split("T")[0])
      .order("usage_date", { ascending: false });

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ usage: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 37: get_daily_intelligence
// ============================================================
mcpServer.registerTool(
  "get_daily_intelligence",
  {
    title: "Get Daily Intelligence",
    description: "Récupère le briefing intelligence quotidien généré par l'IA (résumé CRM, alertes, opportunités).",
    inputSchema: {
      date: z.string().optional().describe("Date ISO (défaut: le plus récent)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin
      .from("daily_intelligence")
      .select("id, generated_date, intelligence, llm_model, generation_ms, created_at")
      .eq("workspace_id", ctx.wsId)
      .order("generated_date", { ascending: false })
      .limit(1);

    if (params.date) {
      query = supabaseAdmin
        .from("daily_intelligence")
        .select("id, generated_date, intelligence, llm_model, generation_ms, created_at")
        .eq("workspace_id", ctx.wsId)
        .eq("generated_date", params.date)
        .limit(1);
    }

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    if (!data || data.length === 0) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ found: false, message: "Aucune intelligence disponible pour cette date." }) }] };
    }
    return { content: [{ type: "text" as const, text: JSON.stringify({ found: true, intelligence: data[0] }) }] };
  }
);

// ============================================================
// TOOL 38: trigger_daily_intelligence
// ============================================================
mcpServer.registerTool(
  "trigger_daily_intelligence",
  {
    title: "Trigger Daily Intelligence",
    description: "Déclenche la génération du briefing intelligence quotidien.",
    inputSchema: {},
  },
  async () => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/auto-daily-intelligence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ workspace_id: ctx.wsId }),
      });
      const data = await res.json().catch(() => ({ status: res.status }));
      if (!res.ok) return { content: [{ type: "text" as const, text: `Erreur: ${JSON.stringify(data)}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ triggered: true, message: "Daily intelligence generation started", result: data }) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 39: search_knowledge
// ============================================================
mcpServer.registerTool(
  "search_knowledge",
  {
    title: "Search Knowledge Base",
    description: "Recherche sémantique dans la base de connaissances (embeddings). Retourne les ressources les plus proches.",
    inputSchema: {
      query: z.string().describe("Requête de recherche en langage naturel"),
      entity_type: z.string().optional().describe("Filtrer par type (article, lead, project, solution)"),
      limit: z.number().optional().describe("Nombre max de résultats (défaut 10)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/search-embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          query: params.query,
          entity_type: params.entity_type,
          limit: params.limit || 10,
          workspace_id: ctx.wsId,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { content: [{ type: "text" as const, text: `Erreur: ${JSON.stringify(data)}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ results: data.results || data, count: data.results?.length || 0 }) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 40: extract_entities
// ============================================================
mcpServer.registerTool(
  "extract_entities",
  {
    title: "Extract Entities from Text",
    description: "Extraction IA d'entités nommées (personnes, entreprises, lieux, etc.) depuis un texte libre.",
    inputSchema: {
      text: z.string().describe("Texte à analyser"),
      entity_types: z.array(z.string()).optional().describe("Types d'entités à extraire (person, company, location, email, phone)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/extract-entities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          text: params.text,
          entity_types: params.entity_types,
          workspace_id: ctx.wsId,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { content: [{ type: "text" as const, text: `Erreur: ${JSON.stringify(data)}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ entities: data }) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 41: get_articles
// ============================================================
mcpServer.registerTool(
  "get_articles",
  {
    title: "Get Articles",
    description: "Liste les articles et contenus CMS (actualités, cas clients, livres blancs, solutions).",
    inputSchema: {
      resource_type: z.string().optional().describe("Filtrer par type (actualite, article, cas-client, livre-blanc, atelier-webinaire, solution)"),
      status: z.string().optional().describe("Filtrer par statut (draft, published, scheduled)"),
      published: z.boolean().optional().describe("Filtrer par état de publication"),
      limit: z.number().optional().describe("Nombre max (défaut 20)"),
      search: z.string().optional().describe("Recherche texte sur titre"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin
      .from("articles")
      .select("id, title, slug, resource_type, status, published, excerpt, meta_title, meta_description, cover_image_url, event_date, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);

    if (params.resource_type) query = query.eq("resource_type", params.resource_type);
    if (params.status) query = query.eq("status", params.status);
    if (params.published !== undefined) query = query.eq("published", params.published);
    if (params.search) query = query.ilike("title", `%${params.search}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ articles: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 42: create_article
// ============================================================
mcpServer.registerTool(
  "create_article",
  {
    title: "Create Article",
    description: "Créer un nouvel article/contenu CMS. Le slug est auto-généré depuis le titre si non fourni.",
    inputSchema: {
      title: z.string().describe("Titre de l'article"),
      resource_type: z.string().describe("Type: actualite, article, cas-client, livre-blanc, atelier-webinaire, solution"),
      content: z.string().optional().describe("Contenu HTML"),
      excerpt: z.string().optional().describe("Résumé court"),
      meta_title: z.string().optional().describe("Titre SEO"),
      meta_description: z.string().optional().describe("Description SEO"),
      cover_image_url: z.string().optional().describe("URL image de couverture"),
      status: z.string().optional().describe("Statut (défaut: draft)"),
      published: z.boolean().optional().describe("Publié (défaut: false)"),
      slug: z.string().optional().describe("Slug personnalisé (auto-généré si absent)"),
      // Champs événement (atelier-webinaire)
      event_date: z.string().optional().describe("Date événement ISO 8601"),
      event_location: z.string().optional().describe("Lieu de l'événement"),
      heure_debut: z.string().optional().describe("Heure de début (HH:MM)"),
      type_evenement: z.string().optional().describe("presentiel, webinaire, hybride"),
      max_participants: z.number().optional().describe("Jauge max participants"),
      intervenants: z.string().optional().describe("JSON string array [{nom, role, bio}]"),
      programme_detaille: z.string().optional().describe("JSON string programme"),
      prerequis: z.string().optional().describe("Prérequis pour l'atelier"),
      registration_open: z.boolean().optional().describe("Inscriptions ouvertes"),
      certificat_delivre: z.boolean().optional().describe("Certificat délivré"),
      rappels_automatiques: z.boolean().optional().describe("Rappels auto activés"),
      duree_heures: z.number().optional().describe("Durée en heures"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const slug = params.slug || params.title.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const insertData: Record<string, unknown> = {
      title: params.title,
      slug,
      resource_type: params.resource_type,
      content: params.content || "",
      excerpt: params.excerpt || null,
      meta_title: params.meta_title || null,
      meta_description: params.meta_description || null,
      cover_image_url: params.cover_image_url || null,
      status: params.status || "draft",
      published: params.published || false,
    };
    // Event fields
    if (params.event_date) insertData.event_date = params.event_date;
    if (params.event_location) insertData.event_location = params.event_location;
    if (params.heure_debut) insertData.heure_debut = params.heure_debut;
    if (params.type_evenement) insertData.type_evenement = params.type_evenement;
    if (params.max_participants) insertData.max_participants = params.max_participants;
    if (params.intervenants) insertData.intervenants = JSON.parse(params.intervenants);
    if (params.programme_detaille) insertData.programme_detaille = JSON.parse(params.programme_detaille);
    if (params.prerequis) insertData.prerequis = params.prerequis;
    if (params.registration_open !== undefined) insertData.registration_open = params.registration_open;
    if (params.certificat_delivre !== undefined) insertData.certificat_delivre = params.certificat_delivre;
    if (params.rappels_automatiques !== undefined) insertData.rappels_automatiques = params.rappels_automatiques;
    if (params.duree_heures) insertData.duree_heures = params.duree_heures;

    const { data, error } = await supabaseAdmin.from("articles").insert(insertData)
      .select("id, title, slug, resource_type, status, created_at").single();

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, article: data }) }] };
  }
);

// ============================================================
// TOOL 43: update_article
// ============================================================
mcpServer.registerTool(
  "update_article",
  {
    title: "Update Article",
    description: "Modifier un article/contenu CMS existant. Seuls les champs fournis sont mis à jour.",
    inputSchema: {
      article_id: z.string().describe("UUID de l'article"),
      title: z.string().optional(),
      content: z.string().optional(),
      excerpt: z.string().optional(),
      meta_title: z.string().optional(),
      meta_description: z.string().optional(),
      cover_image_url: z.string().optional(),
      status: z.string().optional(),
      published: z.boolean().optional(),
      slug: z.string().optional(),
      // Champs événement (atelier-webinaire)
      event_date: z.string().optional().describe("Date événement ISO 8601"),
      event_location: z.string().optional().describe("Lieu de l'événement"),
      heure_debut: z.string().optional().describe("Heure de début (HH:MM)"),
      type_evenement: z.string().optional().describe("presentiel, webinaire, hybride"),
      max_participants: z.number().optional().describe("Jauge max participants"),
      intervenants: z.string().optional().describe("JSON string array [{nom, role, bio}]"),
      programme_detaille: z.string().optional().describe("JSON string programme"),
      prerequis: z.string().optional(),
      registration_open: z.boolean().optional(),
      certificat_delivre: z.boolean().optional(),
      rappels_automatiques: z.boolean().optional(),
      duree_heures: z.number().optional(),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const { article_id, intervenants, programme_detaille, ...fields } = params;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    // Parse JSON string fields
    if (intervenants) updates.intervenants = JSON.parse(intervenants);
    if (programme_detaille) updates.programme_detaille = JSON.parse(programme_detaille);

    const { data, error } = await supabaseAdmin
      .from("articles")
      .update(updates)
      .eq("id", article_id)
      .select("id, title, slug, resource_type, status, published, meta_title, meta_description, updated_at")
      .single();

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, article: data }) }] };
  }
);

// ============================================================
// TOOL 44: generate_article
// ============================================================
mcpServer.registerTool(
  "generate_article",
  {
    title: "Generate Article with AI",
    description: "Générer un article complet via IA à partir d'un prompt.",
    inputSchema: {
      prompt: z.string().describe("Instructions pour la génération de l'article"),
      resource_type: z.string().describe("Type: actualite, article, cas-client, livre-blanc"),
      tone: z.string().optional().describe("Ton souhaité (expert, vulgarisé, formel, engageant)"),
      target_length: z.number().optional().describe("Longueur cible en mots"),
      keywords: z.array(z.string()).optional().describe("Mots-clés SEO à intégrer"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-article-claude`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          prompt: params.prompt,
          resource_type: params.resource_type,
          tone: params.tone,
          target_length: params.target_length,
          keywords: params.keywords,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { content: [{ type: "text" as const, text: `Erreur: ${JSON.stringify(data)}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, generated: data }) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 45: enrich_seo
// ============================================================
mcpServer.registerTool(
  "enrich_seo",
  {
    title: "Enrich Content SEO",
    description: "Enrichir le SEO d'un article : ajoute des <strong> sur les mots-clés stratégiques.",
    inputSchema: {
      article_id: z.string().describe("UUID de l'article à enrichir"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const { data: article, error: fetchErr } = await supabaseAdmin
      .from("articles")
      .select("id, title, content, excerpt")
      .eq("id", params.article_id)
      .single();

    if (fetchErr || !article) {
      return { content: [{ type: "text" as const, text: "Article non trouvé." }] };
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/enrich-content-seo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          content: article.content,
          resourceType: "article",
        }),
      });
      const data = await res.json();
      if (!res.ok) return { content: [{ type: "text" as const, text: `Erreur: ${JSON.stringify(data)}` }] };

      if (data.enrichedContent) {
        await supabaseAdmin
          .from("articles")
          .update({ content: data.enrichedContent, updated_at: new Date().toISOString() })
          .eq("id", params.article_id);
      }

      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, article_id: params.article_id, enriched: !!data.enrichedContent }) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 46: suggest_tags
// ============================================================
mcpServer.registerTool(
  "suggest_tags",
  {
    title: "Suggest Tags",
    description: "Suggérer des tags pertinents pour un contenu via IA.",
    inputSchema: {
      content: z.string().describe("Contenu textuel à analyser"),
      title: z.string().optional().describe("Titre de l'article"),
      excerpt: z.string().optional().describe("Résumé court"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/suggest-tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          title: params.title || "",
          content: params.content,
          excerpt: params.excerpt,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { content: [{ type: "text" as const, text: `Erreur: ${JSON.stringify(data)}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ tags: data.tags || data }) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 47: generate_faq
// ============================================================
mcpServer.registerTool(
  "generate_faq",
  {
    title: "Generate FAQ",
    description: "Générer une FAQ automatique pour un article via IA.",
    inputSchema: {
      article_id: z.string().describe("UUID de l'article"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-faq`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ article_id: params.article_id }),
      });
      const data = await res.json();
      if (!res.ok) return { content: [{ type: "text" as const, text: `Erreur: ${JSON.stringify(data)}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, faq: data }) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 48: get_tags_categories
// ============================================================
mcpServer.registerTool(
  "get_tags_categories",
  {
    title: "Get Tags & Categories",
    description: "Liste tous les tags et catégories disponibles pour le CMS.",
    inputSchema: {},
  },
  async () => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const [tagsRes, categoriesRes] = await Promise.all([
      supabaseAdmin.from("tags").select("id, name, slug").order("name"),
      supabaseAdmin.from("categories").select("id, name, slug").order("name"),
    ]);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          tags: tagsRes.data || [],
          categories: categoriesRes.data || [],
          tags_count: tagsRes.data?.length || 0,
          categories_count: categoriesRes.data?.length || 0,
        }),
      }],
    };
  }
);

// ============================================================
// TOOL 49: get_vivier_campaigns
// ============================================================
mcpServer.registerTool(
  "get_vivier_campaigns",
  {
    title: "Get Vivier Campaigns",
    description: "Liste les campagnes d'outreach sur les viviers (emails, séquences).",
    inputSchema: {
      status: z.string().optional().describe("Filtrer par statut (draft, active, paused, completed)"),
      limit: z.number().optional().describe("Nombre max (défaut 20)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin
      .from("vivier_campaigns")
      .select("id, name, status, subject, sender_email, total_recipients, open_rate, click_rate, created_at")
      .eq("workspace_id", ctx.wsId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);

    if (params.status) query = query.eq("status", params.status);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ campaigns: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 50: get_vivier_stats
// ============================================================
mcpServer.registerTool(
  "get_vivier_stats",
  {
    title: "Get Vivier Statistics",
    description: "Statistiques agrégées de la base viviers : totaux, statuts, score moyen.",
    inputSchema: {},
  },
  async () => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const [totalRes, newRes, contactedRes, qualifiedRes, convertedRes, scoreRes] = await Promise.all([
      supabaseAdmin.from("viviers").select("*", { count: "exact", head: true }).eq("workspace_id", ctx.wsId),
      supabaseAdmin.from("viviers").select("*", { count: "exact", head: true }).eq("workspace_id", ctx.wsId).eq("status", "new"),
      supabaseAdmin.from("viviers").select("*", { count: "exact", head: true }).eq("workspace_id", ctx.wsId).eq("status", "contacted"),
      supabaseAdmin.from("viviers").select("*", { count: "exact", head: true }).eq("workspace_id", ctx.wsId).eq("status", "qualified"),
      supabaseAdmin.from("viviers").select("*", { count: "exact", head: true }).eq("workspace_id", ctx.wsId).in("status", ["converted", "promoted"]),
      supabaseAdmin.from("viviers").select("cold_score").eq("workspace_id", ctx.wsId).not("cold_score", "is", null).limit(1000),
    ]);

    const scored = scoreRes.data || [];
    const avgScore = scored.length > 0
      ? Math.round(scored.reduce((sum: number, v: any) => sum + (v.cold_score || 0), 0) / scored.length)
      : 0;

    const stats = {
      total: totalRes.count || 0,
      new_count: newRes.count || 0,
      contacted_count: contactedRes.count || 0,
      qualified_count: qualifiedRes.count || 0,
      converted_count: convertedRes.count || 0,
      avg_score: avgScore,
    };

    return { content: [{ type: "text" as const, text: JSON.stringify(stats) }] };
  }
);

// ============================================================
// TOOL 51: get_vivier_insights
// ============================================================
mcpServer.registerTool(
  "get_vivier_insights",
  {
    title: "Get Vivier Insights",
    description: "Insights et statistiques avancées sur les viviers via IA.",
    inputSchema: {
      filters: z.record(z.unknown()).optional().describe("Filtres structurés (industry, city, score_min, etc.)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/vivier-insights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ workspace_id: ctx.wsId, filters: params.filters }),
      });
      const data = await res.json();
      if (!res.ok) return { content: [{ type: "text" as const, text: `Erreur: ${JSON.stringify(data)}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ insights: data }) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 52: cleanup_viviers
// ============================================================
mcpServer.registerTool(
  "cleanup_viviers",
  {
    title: "Cleanup Viviers",
    description: "Nettoyer la base viviers : supprime doublons, emails invalides, données incomplètes.",
    inputSchema: {},
  },
  async () => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/vivier-cleanup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ workspace_id: ctx.wsId }),
      });
      const data = await res.json();
      if (!res.ok) return { content: [{ type: "text" as const, text: `Erreur: ${JSON.stringify(data)}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, cleanup: data }) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 53: score_viviers_batch
// ============================================================
mcpServer.registerTool(
  "score_viviers_batch",
  {
    title: "Score Viviers Batch",
    description: "Scorer un lot de viviers via IA. Max 200 par batch.",
    inputSchema: {
      batch_size: z.number().optional().describe("Nombre de viviers à scorer (défaut 50, max 200)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const batchSize = Math.min(params.batch_size || 50, 200);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/score-viviers-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ workspace_id: ctx.wsId, batch_size: batchSize }),
      });
      const data = await res.json();
      if (!res.ok) return { content: [{ type: "text" as const, text: `Erreur: ${JSON.stringify(data)}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, batch_size: batchSize, result: data }) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erreur: ${err}` }] };
    }
  }
);

// ============================================================
// TOOL 54: get_workspace_config
// ============================================================
mcpServer.registerTool(
  "get_workspace_config",
  {
    title: "Get Workspace Configuration",
    description: "Configuration complète du workspace : settings, quotas IA, quotas API, config email.",
    inputSchema: {},
  },
  async () => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const [workspaceRes, aiQuotasRes, apiQuotasRes, emailConfigRes] = await Promise.all([
      supabaseAdmin.from("workspaces").select("name, description, settings").eq("id", ctx.wsId).single(),
      supabaseAdmin.from("workspace_ai_quotas").select("*").eq("workspace_id", ctx.wsId),
      supabaseAdmin.from("api_quotas").select("*").order("api_name"),
      supabaseAdmin.from("email_configurations").select("*").limit(5),
    ]);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          workspace: workspaceRes.data,
          ai_quotas: aiQuotasRes.data || [],
          api_quotas: apiQuotasRes.data || [],
          email_config: emailConfigRes.data || [],
        }),
      }],
    };
  }
);

// ============================================================
// TOOL 55: get_audit_logs
// ============================================================
mcpServer.registerTool(
  "get_audit_logs",
  {
    title: "Get Audit Logs",
    description: "Journal d'audit admin : actions, modifications, qui a fait quoi.",
    inputSchema: {
      action_type: z.string().optional().describe("Filtrer par type d'action (create, update, delete, approve)"),
      resource_type: z.string().optional().describe("Filtrer par type de ressource (article, tag, comment, lead)"),
      limit: z.number().optional().describe("Nombre max (défaut 50)"),
      days: z.number().optional().describe("Remonter sur N jours (défaut 7)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - (params.days || 7));

    let query = supabaseAdmin
      .from("admin_audit_logs")
      .select("id, action_type, resource_type, resource_id, resource_name, user_email, created_at, old_data, new_data")
      .gte("created_at", daysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(params.limit || 50);

    if (params.action_type) query = query.eq("action_type", params.action_type);
    if (params.resource_type) query = query.eq("resource_type", params.resource_type);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ audit_logs: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 56: get_uploaded_files
// ============================================================
mcpServer.registerTool(
  "get_uploaded_files",
  {
    title: "Get Uploaded Files",
    description: "Liste les fichiers uploadés dans le workspace (PDF, images, documents).",
    inputSchema: {
      lead_id: z.string().uuid().optional().describe("Filtrer par lead"),
      project_id: z.string().uuid().optional().describe("Filtrer par projet"),
      file_type: z.string().optional().describe("Filtrer par type de fichier"),
      limit: z.number().optional().describe("Nombre max (défaut 20)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    let query = supabaseAdmin
      .from("uploaded_files")
      .select("id, original_filename, file_type, storage_path, lead_ids, project_ids, ai_summary, processing_status, created_at")
      .eq("workspace_id", ctx.wsId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);
    if (params.file_type) query = query.eq("file_type", params.file_type);
    if (params.lead_id) query = query.contains("lead_ids", [params.lead_id]);
    if (params.project_id) query = query.contains("project_ids", [params.project_id]);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ files: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 57: list_transcriptions (PRIMARY)
// Lightweight metadata listing — payload budget <15k tokens / 20 items
// ============================================================
mcpServer.registerTool(
  "list_transcriptions",
  {
    title: "List Transcriptions",
    description: "Search and list voice transcriptions from CRM meetings, calls, and recordings. Returns metadata only (id, date, title, summary, linked entities). Use for browsing or filtering by date range, lead, project, or status. Excludes heavy fields (full transcript, segments) — use get_transcription_detail for those.",
    inputSchema: {
      lead_id: z.string().uuid().optional().describe("Filter by associated lead UUID"),
      project_id: z.string().uuid().optional().describe("Filter by associated project UUID"),
      entity_id: z.string().uuid().optional().describe("Filter by any linked entity UUID (lead or project)"),
      status: z.string().optional().describe("Filter by status (pending, completed, error)"),
      date_from: z.string().optional().describe("ISO date — only transcriptions created on or after this date"),
      date_to: z.string().optional().describe("ISO date — only transcriptions created on or before this date"),
      limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20, max 50)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const limit = Math.min(params.limit ?? 20, 50);
    // Lightweight columns only — exclude raw_transcript, segments, synthesis_long, raw_audio_url, embeddings, summary (heavy JSON)
    let query = supabaseAdmin
      .from("voice_transcriptions")
      .select("id, title, status, source, slug, lead_id, project_id, created_at, duration_seconds")
      .eq("workspace_id", ctx.wsId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (params.lead_id) query = query.eq("lead_id", params.lead_id);
    if (params.project_id) query = query.eq("project_id", params.project_id);
    if (params.entity_id) query = query.or(`lead_id.eq.${params.entity_id},project_id.eq.${params.entity_id}`);
    if (params.status) query = query.eq("status", params.status);
    if (params.date_from) query = query.gte("created_at", params.date_from);
    if (params.date_to) query = query.lte("created_at", params.date_to);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ transcriptions: data ?? [], count: data?.length ?? 0 }) }] };
  }
);

// ============================================================
// TOOL 58: get_transcription_detail (PRIMARY)
// Full content for a single transcription
// ============================================================
mcpServer.registerTool(
  "get_transcription_detail",
  {
    title: "Get Transcription Detail",
    description: "Fetch full content of a single voice transcription including speaker-segmented text, AI synthesis, action items, participants, and CRM entity links. Requires transcription UUID obtained from list_transcriptions.",
    inputSchema: {
      transcription_id: z.string().uuid().describe("UUID of the transcription to fetch"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const [transcRes, partRes] = await Promise.all([
      supabaseAdmin.from("voice_transcriptions").select("*").eq("id", params.transcription_id).eq("workspace_id", ctx.wsId).single(),
      supabaseAdmin.from("transcription_participants").select("*").eq("transcription_id", params.transcription_id),
    ]);
    if (transcRes.error) return { content: [{ type: "text" as const, text: `Erreur: ${transcRes.error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ transcription: transcRes.data, participants: partRes.data || [] }) }] };
  }
);

// ============================================================
// TOOL 59: get_transcriptions [DEPRECATED — removal 2026-05-20]
// Thin wrapper → list_transcriptions
// ============================================================
mcpServer.registerTool(
  "get_transcriptions",
  {
    title: "Get Transcriptions [DEPRECATED]",
    description: "[DEPRECATED — use list_transcriptions instead, removal 2026-05-20] Legacy alias. Lists voice transcriptions.",
    inputSchema: {
      lead_id: z.string().uuid().optional(),
      project_id: z.string().uuid().optional(),
      status: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
  },
  async (params) => {
    console.warn('[MCP-DEPRECATED] tool=get_transcriptions called, migrate to list_transcriptions, removal=2026-05-20');
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const limit = Math.min(params.limit ?? 20, 50);
    let query = supabaseAdmin
      .from("voice_transcriptions")
      .select("id, title, summary, status, source, slug, lead_id, project_id, created_at, duration_seconds")
      .eq("workspace_id", ctx.wsId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (params.lead_id) query = query.eq("lead_id", params.lead_id);
    if (params.project_id) query = query.eq("project_id", params.project_id);
    if (params.status) query = query.eq("status", params.status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ transcriptions: data ?? [], count: data?.length ?? 0, _deprecated: "Use list_transcriptions" }) }] };
  }
);

// ============================================================
// TOOL 60: get_transcription [DEPRECATED — removal 2026-05-20]
// Thin wrapper → list_transcriptions or get_transcription_detail
// ============================================================
mcpServer.registerTool(
  "get_transcription",
  {
    title: "Get Transcription [DEPRECATED]",
    description: "[DEPRECATED — use list_transcriptions or get_transcription_detail instead, removal 2026-05-20] Legacy alias.",
    inputSchema: {
      transcription_id: z.string().uuid().optional(),
      lead_id: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
  },
  async (params) => {
    console.warn('[MCP-DEPRECATED] tool=get_transcription called, migrate to list_transcriptions or get_transcription_detail, removal=2026-05-20');
    const ctx = getAuthContext();
    if (!ctx) return authError();

    if (params.transcription_id) {
      const [transcRes, partRes] = await Promise.all([
        supabaseAdmin.from("voice_transcriptions").select("*").eq("id", params.transcription_id).eq("workspace_id", ctx.wsId).single(),
        supabaseAdmin.from("transcription_participants").select("*").eq("transcription_id", params.transcription_id),
      ]);
      if (transcRes.error) return { content: [{ type: "text" as const, text: `Erreur: ${transcRes.error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ transcription: transcRes.data, participants: partRes.data || [], _deprecated: "Use get_transcription_detail" }) }] };
    }

    const limit = Math.min(params.limit ?? 10, 50);
    let query = supabaseAdmin
      .from("voice_transcriptions")
      .select("id, title, summary, status, source, slug, lead_id, project_id, created_at")
      .eq("workspace_id", ctx.wsId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (params.lead_id) query = query.eq("lead_id", params.lead_id);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ transcriptions: data ?? [], _deprecated: "Use list_transcriptions" }) }] };
  }
);

// ============================================================
// TOOL 61: update_workspace_config
// ============================================================
mcpServer.registerTool(
  "update_workspace_config",
  {
    title: "Update Workspace Config",
    description: "Met à jour la configuration du workspace (merge JSON, ne remplace pas).",
    inputSchema: {
      settings: z.record(z.unknown()).describe("Champs de configuration à merger dans les settings existants"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const { data: current } = await supabaseAdmin.from("workspaces").select("settings").eq("id", ctx.wsId).single();
    const merged = { ...(current?.settings || {}), ...params.settings };
    const { data, error } = await supabaseAdmin
      .from("workspaces")
      .update({ settings: merged })
      .eq("id", ctx.wsId)
      .select("id, name, settings")
      .single();
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ updated: true, settings: data?.settings }) }] };
  }
);

// ============================================================
// TOOL 60: get_email_logs
// ============================================================
mcpServer.registerTool(
  "get_email_logs",
  {
    title: "Get Email Logs",
    description: "Journal des emails envoyés (notifications, confirmations, campagnes).",
    inputSchema: {
      email_type: z.string().optional().describe("Filtrer par type d'email"),
      status: z.string().optional().describe("Filtrer par statut (sent, failed, pending)"),
      limit: z.number().optional().describe("Nombre max (défaut 50)"),
      days: z.number().optional().describe("Remonter sur N jours (défaut 7)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - (params.days || 7));
    let query = supabaseAdmin
      .from("email_logs")
      .select("id, email_type, recipient_email, subject, status, source_type, created_at")
      .gte("created_at", daysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(params.limit || 50);
    if (params.email_type) query = query.eq("email_type", params.email_type);
    if (params.status) query = query.eq("status", params.status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ emails: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 61: get_billing_entities
// ============================================================
mcpServer.registerTool(
  "get_billing_entities",
  {
    title: "Get Billing Entities",
    description: "Entités de facturation du workspace (SIREN, TVA, adresse, format devis).",
    inputSchema: {},
  },
  async () => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const { data, error } = await supabaseAdmin
      .from("billing_entities")
      .select("id, name, siren, tva_number, address, legal_form, default_tva_rate, quote_prefix")
      .eq("workspace_id", ctx.wsId);
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ billing_entities: data }) }] };
  }
);

// ============================================================
// TOOL 62: get_specifications
// ============================================================
mcpServer.registerTool(
  "get_specifications",
  {
    title: "Get Specifications",
    description: "Liste les cahiers des charges du workspace.",
    inputSchema: {
      project_id: z.string().uuid().optional().describe("Filtrer par projet"),
      status: z.string().optional().describe("Filtrer par statut (draft, validated, archived)"),
      limit: z.number().optional().describe("Nombre max (défaut 20)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    let query = supabaseAdmin
      .from("specifications")
      .select("id, title, content, version, status, project_id, created_at")
      .eq("workspace_id", ctx.wsId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);
    if (params.project_id) query = query.eq("project_id", params.project_id);
    if (params.status) query = query.eq("status", params.status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ specifications: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 63: create_specification
// ============================================================
mcpServer.registerTool(
  "create_specification",
  {
    title: "Create Specification",
    description: "Créer un nouveau cahier des charges.",
    inputSchema: {
      title: z.string().describe("Titre du cahier des charges"),
      project_id: z.string().uuid().describe("ID du projet associé"),
      content: z.string().optional().describe("Contenu du cahier des charges"),
      status: z.string().optional().describe("Statut (défaut: draft)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const { data, error } = await supabaseAdmin
      .from("specifications")
      .insert({ title: params.title, project_id: params.project_id, content: params.content ? (typeof params.content === "string" ? { text: params.content } : params.content) : null, status: params.status || "draft", version: "1", workspace_id: ctx.wsId })
      .select("id, title, version, status, created_at")
      .single();
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ created: true, specification: data }) }] };
  }
);

// ============================================================
// TOOL 64: update_specification
// ============================================================
mcpServer.registerTool(
  "update_specification",
  {
    title: "Update Specification",
    description: "Mettre à jour un cahier des charges (incrémente la version).",
    inputSchema: {
      spec_id: z.string().uuid().describe("ID du cahier des charges"),
      title: z.string().optional().describe("Nouveau titre"),
      content: z.string().optional().describe("Nouveau contenu"),
      status: z.string().optional().describe("Nouveau statut"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const { data: current } = await supabaseAdmin.from("specifications").select("version").eq("id", params.spec_id).eq("workspace_id", ctx.wsId).single();
    if (!current) return { content: [{ type: "text" as const, text: "Cahier des charges non trouvé" }] };
    const currentVersion = parseInt(current.version || "1", 10);
    const newVersion = String(currentVersion + 1);
    const updates: Record<string, unknown> = { version: newVersion };
    if (params.title !== undefined) updates.title = params.title;
    if (params.content !== undefined) updates.content = typeof params.content === "string" ? { text: params.content } : params.content;
    if (params.status !== undefined) updates.status = params.status;
    const { data, error } = await supabaseAdmin.from("specifications").update(updates).eq("id", params.spec_id).eq("workspace_id", ctx.wsId).select().single();
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ updated: true, specification: data }) }] };
  }
);

// ============================================================
// TOOL 65: get_ai_models
// ============================================================
mcpServer.registerTool(
  "get_ai_models",
  {
    title: "Get AI Models",
    description: "Liste les modèles IA disponibles (OpenRouter, Gemini, GPT, etc.).",
    inputSchema: {
      provider_name: z.string().optional().describe("Filtrer par provider"),
      category: z.string().optional().describe("Filtrer par catégorie (chat, embedding, image)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    let query = supabaseAdmin
      .from("ai_models")
      .select("model_id, provider_name, display_name, category, capabilities, context_window, cost_per_1k_input, cost_per_1k_output")
      .order("provider_name").order("category");
    if (params.provider_name) query = query.eq("provider_name", params.provider_name);
    if (params.category) query = query.eq("category", params.category);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ models: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 66: get_ai_provider_config
// ============================================================
mcpServer.registerTool(
  "get_ai_provider_config",
  {
    title: "Get AI Provider Config",
    description: "Configuration des providers IA (priorité, limites, statut). Ne retourne jamais les clés API.",
    inputSchema: {},
  },
  async () => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const { data, error } = await supabaseAdmin
      .from("ai_provider_config")
      .select("provider_name, base_url, is_active, priority, rate_limit_rpm")
      .order("priority");
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ providers: data }) }] };
  }
);

// ============================================================
// TOOL 67: update_ai_provider
// ============================================================
mcpServer.registerTool(
  "update_ai_provider",
  {
    title: "Update AI Provider",
    description: "Modifier la config d'un provider IA (activation, priorité, rate limit).",
    inputSchema: {
      provider_name: z.string().describe("Nom du provider à modifier"),
      is_active: z.boolean().optional().describe("Activer/désactiver"),
      priority: z.number().optional().describe("Priorité (1 = plus haute)"),
      rate_limit_rpm: z.number().optional().describe("Limite requêtes/min"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const updates: Record<string, unknown> = {};
    if (params.is_active !== undefined) updates.is_active = params.is_active;
    if (params.priority !== undefined) updates.priority = params.priority;
    if (params.rate_limit_rpm !== undefined) updates.rate_limit_rpm = params.rate_limit_rpm;
    if (Object.keys(updates).length === 0) return { content: [{ type: "text" as const, text: "Aucun champ à mettre à jour" }] };
    const { data, error } = await supabaseAdmin.from("ai_provider_config").update(updates).eq("provider_name", params.provider_name).select("provider_name, is_active, priority, rate_limit_rpm").single();
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ updated: true, provider: data }) }] };
  }
);

// ============================================================
// TOOL 68: get_edge_function_models
// ============================================================
mcpServer.registerTool(
  "get_edge_function_models",
  {
    title: "Get Edge Function Models",
    description: "Voir quel modèle IA est assigné à chaque Edge Function.",
    inputSchema: {},
  },
  async () => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const { data, error } = await supabaseAdmin.from("edge_function_model_config").select("function_name, provider_name, model_id, is_custom_model").order("function_name");
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ edge_functions: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 69: update_edge_function_model
// ============================================================
mcpServer.registerTool(
  "update_edge_function_model",
  {
    title: "Update Edge Function Model",
    description: "Changer le modèle IA assigné à une Edge Function.",
    inputSchema: {
      function_name: z.string().describe("Nom de la fonction Edge"),
      model_id: z.string().describe("ID du nouveau modèle"),
      provider_name: z.string().optional().describe("Provider du modèle"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const updates: Record<string, unknown> = { model_id: params.model_id };
    if (params.provider_name) updates.provider_name = params.provider_name;
    const { data, error } = await supabaseAdmin.from("edge_function_model_config").update(updates).eq("function_name", params.function_name).select().single();
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ updated: true, config: data }) }] };
  }
);

// ============================================================
// TOOL 70: ask_copilot
// ============================================================
mcpServer.registerTool(
  "ask_copilot",
  {
    title: "Ask Copilot",
    description: "Interroger le copilote IA IArche. Modes : suggest-tasks, detect-inactivity, health-check, next-step, opportunity-score, harvest, harvest-respond, intelligence.",
    inputSchema: {
      mode: z.string().optional().describe("Mode: suggest-tasks, detect-inactivity, health-check, next-step, opportunity-score, harvest, harvest-respond, intelligence (défaut: health-check)"),
      entity_type: z.string().optional().describe("Type d'entité (lead, opportunity, project)"),
      entity_id: z.string().uuid().optional().describe("UUID de l'entité cible"),
      extra: z.string().optional().describe("Contexte additionnel ou question libre"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/cockpit-ai-copilot`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ workspaceId: ctx.wsId, mode: params.mode || "health-check", entityType: params.entity_type, entityId: params.entity_id, extra: params.extra, context: { source: "mcp" } }),
    });
    const result = await resp.json();
    if (!resp.ok) return { content: [{ type: "text" as const, text: `Erreur copilot: ${JSON.stringify(result)}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  }
);

// ============================================================
// TOOL 71: get_ai_memory
// ============================================================
mcpServer.registerTool(
  "get_ai_memory",
  {
    title: "Get AI Memory",
    description: "Mémoire de l'agent IA : contextes, préférences, souvenirs importants.",
    inputSchema: {
      memory_type: z.string().optional().describe("Type (preference, context, fact, instruction)"),
      entity_type: z.string().optional().describe("Type d'entité liée"),
      entity_id: z.string().uuid().optional().describe("ID d'entité liée"),
      limit: z.number().optional().describe("Nombre max (défaut 20)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    let query = supabaseAdmin
      .from("ai_agent_memory")
      .select("id, memory_type, content, entity_type, entity_id, importance_score, expires_at, created_at")
      .eq("workspace_id", ctx.wsId)
      .order("importance_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);
    if (params.memory_type) query = query.eq("memory_type", params.memory_type);
    if (params.entity_type) query = query.eq("entity_type", params.entity_type);
    if (params.entity_id) query = query.eq("entity_id", params.entity_id);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ memories: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 72: project_write
// ============================================================
mcpServer.registerTool(
  "project_write",
  {
    title: "Create or Update Project",
    description: "Créer ou mettre à jour un projet. Si project_id → update, sinon → création (name requis).",
    inputSchema: {
      project_id: z.string().uuid().optional().describe("ID du projet (si update)"),
      name: z.string().optional().describe("Nom du projet (requis si création)"),
      status: z.string().optional().describe("Statut (active, on_hold, completed, cancelled)"),
      health_status: z.string().optional().describe("Santé (green, yellow, red)"),
      budget_amount: z.number().optional().describe("Budget total"),
      consumed_amount: z.number().optional().describe("Montant consommé"),
      lead_id: z.string().uuid().optional().describe("Lead associé"),
      opportunity_id: z.string().uuid().optional().describe("Opportunité associée"),
      description: z.string().optional().describe("Description"),
      assigned_to: z.string().optional().describe("Assigné à"),
      start_date: z.string().optional().describe("Date de début (ISO)"),
      planned_end_date: z.string().optional().describe("Date de fin prévue (ISO)"),
      target_end_date: z.string().optional().describe("Date cible (ISO)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    if (params.project_id) {
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(params)) { if (k !== "project_id" && v !== undefined) updates[k] = v; }
      const { data, error } = await supabaseAdmin.from("projects").update(updates).eq("id", params.project_id).eq("workspace_id", ctx.wsId).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ updated: true, project: data }) }] };
    } else {
      if (!params.name) return { content: [{ type: "text" as const, text: "Erreur: 'name' requis pour créer un projet" }] };
      const { data, error } = await supabaseAdmin.from("projects").insert({
        name: params.name, workspace_id: ctx.wsId, status: params.status || "active", health_status: params.health_status || "green",
        budget_amount: params.budget_amount, consumed_amount: params.consumed_amount, lead_id: params.lead_id, opportunity_id: params.opportunity_id,
        description: params.description, assigned_to: params.assigned_to, start_date: params.start_date, planned_end_date: params.planned_end_date, target_end_date: params.target_end_date,
      }).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ created: true, project: data }) }] };
    }
  }
);

// ============================================================
// TOOL 73: get_api_quotas
// ============================================================
mcpServer.registerTool(
  "get_api_quotas",
  {
    title: "Get API Quotas",
    description: "Quotas API, alertes récentes, quotas IA et usage workspace — vue complète.",
    inputSchema: {},
  },
  async () => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const [quotasRes, alertsRes, aiQuotasRes, aiUsageRes] = await Promise.all([
      supabaseAdmin.from("api_quotas").select("*").order("api_name"),
      supabaseAdmin.from("api_quota_alerts").select("*").gte("created_at", sevenDaysAgo.toISOString()).order("created_at", { ascending: false }),
      supabaseAdmin.from("workspace_ai_quotas").select("*").eq("workspace_id", ctx.wsId),
      supabaseAdmin.from("workspace_ai_usage").select("*").eq("workspace_id", ctx.wsId).order("period_start", { ascending: false }).limit(3),
    ]);
    return { content: [{ type: "text" as const, text: JSON.stringify({ quotas: quotasRes.data || [], alerts: alertsRes.data || [], ai_quotas: aiQuotasRes.data || [], ai_usage: aiUsageRes.data || [] }) }] };
  }
);

// ============================================================
// TOOL 74: get_performance_metrics
// ============================================================
mcpServer.registerTool(
  "get_performance_metrics",
  {
    title: "Get Performance Metrics",
    description: "Métriques de performance (Lighthouse) et coûts API agrégés sur 30 jours.",
    inputSchema: {
      limit: z.number().optional().describe("Nombre de mesures Lighthouse (défaut 10)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [perfRes, costsRaw] = await Promise.all([
      supabaseAdmin.from("performance_metrics").select("performance_score, lcp, fcp, cls, seo_score, created_at").order("created_at", { ascending: false }).limit(params.limit || 10),
      supabaseAdmin.from("api_usage_metrics").select("api_name, estimated_cost_cents, total_tokens").gte("created_at", thirtyDaysAgo.toISOString()),
    ]);
    const grouped: Record<string, { total_cost: number; total_tokens: number; request_count: number }> = {};
    for (const row of costsRaw.data || []) {
      if (!grouped[row.api_name]) grouped[row.api_name] = { total_cost: 0, total_tokens: 0, request_count: 0 };
      grouped[row.api_name].total_cost += row.estimated_cost_cents || 0;
      grouped[row.api_name].total_tokens += row.total_tokens || 0;
      grouped[row.api_name].request_count += 1;
    }
    const apiCosts = Object.entries(grouped).map(([api_name, v]) => ({ api_name, ...v })).sort((a, b) => b.total_cost - a.total_cost);
    return { content: [{ type: "text" as const, text: JSON.stringify({ performance: perfRes.data || [], api_costs_30d: apiCosts }) }] };
  }
);

// ============================================================
// TOOL 75: audit_crm_quality
// ============================================================
mcpServer.registerTool(
  "audit_crm_quality",
  {
    title: "Audit CRM Quality",
    description: "Analyse complète de la qualité et hygiène du CRM. Génère un score /100 avec liste d'actions correctives prioritaires. 10 vérifications : leads inactifs, sans score, sans entreprise, non qualifiés, opportunités sans date/montant, projets rouges sans tâche, tâches en retard, leads qualifiés sans opportunité, doublons.",
    inputSchema: {
      fix: z.boolean().optional().describe("Réservé — les corrections passent toujours par validation explicite (défaut false)"),
    },
  },
  async (_params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const wsId = ctx.wsId;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString();

    const [
      leadsNoActivity,
      leadsNoScore,
      leadsNoCompany,
      leadsNoQualification,
      opportunitiesNoDate,
      opportunitiesNoValue,
      projectsRedNoTask,
      tasksOverdue,
      leadsQualifiedNoOpportunity,
      duplicateLeads,
    ] = await Promise.all([
      // 1. Leads sans activité depuis 30j
      supabaseAdmin
        .from("leads")
        .select("id, name, email, company, status, created_at")
        .eq("workspace_id", wsId)
        .not("status", "in", '("lost","converted")')
        .lt("updated_at", thirtyDaysAgo),
      // 2. Leads sans score
      supabaseAdmin
        .from("leads")
        .select("id, name, email, company")
        .eq("workspace_id", wsId)
        .or("lead_score.is.null,lead_score.eq.0")
        .not("status", "in", '("lost","converted")'),
      // 3. Leads sans entreprise
      supabaseAdmin
        .from("leads")
        .select("id, name, email, status")
        .eq("workspace_id", wsId)
        .is("company", null)
        .not("status", "in", '("lost","converted")'),
      // 4. Leads non qualifiés > 7j
      supabaseAdmin
        .from("leads")
        .select("id, name, email, company")
        .eq("workspace_id", wsId)
        .eq("qualification_status", "new")
        .lt("created_at", sevenDaysAgo),
      // 5. Opportunités sans date de clôture
      supabaseAdmin
        .from("opportunities")
        .select("id, title, stage, value_amount")
        .eq("workspace_id", wsId)
        .is("expected_close_date", null)
        .not("stage", "in", '("closed_won","lost")'),
      // 6. Opportunités sans montant
      supabaseAdmin
        .from("opportunities")
        .select("id, title, stage")
        .eq("workspace_id", wsId)
        .or("value_amount.is.null,value_amount.eq.0")
        .not("stage", "in", '("closed_won","lost")'),
      // 7. Projets rouges sans tâche active
      supabaseAdmin
        .from("projects")
        .select("id, name, health_status, status, tasks(id, status)")
        .eq("workspace_id", wsId)
        .eq("health_status", "red")
        .eq("status", "active"),
      // 8. Tâches en retard
      supabaseAdmin
        .from("tasks")
        .select("id, title, status, priority, due_date, lead_id, project_id")
        .eq("workspace_id", wsId)
        .lt("due_date", today)
        .not("status", "in", '("done","cancelled")'),
      // 9. Leads qualifiés sans opportunité
      supabaseAdmin
        .from("leads")
        .select("id, name, company, lead_score, opportunities(id)")
        .eq("workspace_id", wsId)
        .eq("qualification_status", "qualified"),
      // 10. Doublons potentiels
      supabaseAdmin
        .from("leads")
        .select("id, name, email, company, status")
        .eq("workspace_id", wsId)
        .not("status", "eq", "lost"),
    ]);

    // === Score calculation ===
    const issues: Array<{
      severity: string;
      category: string;
      count: number;
      message: string;
      items: any[];
      action: string;
    }> = [];
    let score = 100;

    // 1. Leads inactifs (-2 pts, max -20)
    const inactiveLeads = leadsNoActivity.data || [];
    if (inactiveLeads.length > 0) {
      score -= Math.min(inactiveLeads.length * 2, 20);
      issues.push({
        severity: inactiveLeads.length > 5 ? "high" : "medium",
        category: "Inactivité",
        count: inactiveLeads.length,
        message: `${inactiveLeads.length} leads sans activité depuis 30j`,
        items: inactiveLeads.slice(0, 5).map((l) => ({ id: l.id, name: l.name, company: l.company })),
        action: "Relancer ou archiver ces leads",
      });
    }

    // 2. Leads sans score (-1 pt, max -10)
    const unscoredLeads = leadsNoScore.data || [];
    if (unscoredLeads.length > 0) {
      score -= Math.min(unscoredLeads.length, 10);
      issues.push({
        severity: "medium",
        category: "Données manquantes",
        count: unscoredLeads.length,
        message: `${unscoredLeads.length} leads sans score`,
        items: unscoredLeads.slice(0, 5).map((l) => ({ id: l.id, name: l.name })),
        action: "Déclencher le scoring IA sur ces leads",
      });
    }

    // 3. Leads sans entreprise (-1 pt, max -10)
    const noCompanyLeads = leadsNoCompany.data || [];
    if (noCompanyLeads.length > 0) {
      score -= Math.min(noCompanyLeads.length, 10);
      issues.push({
        severity: "low",
        category: "Données manquantes",
        count: noCompanyLeads.length,
        message: `${noCompanyLeads.length} leads sans entreprise renseignée`,
        items: noCompanyLeads.slice(0, 5).map((l) => ({ id: l.id, name: l.name })),
        action: "Enrichir via Pappers ou manuellement",
      });
    }

    // 4. Leads non qualifiés > 7j (-1 pt, max -10)
    const unqualifiedLeads = leadsNoQualification.data || [];
    if (unqualifiedLeads.length > 0) {
      score -= Math.min(unqualifiedLeads.length, 10);
      issues.push({
        severity: "medium",
        category: "Pipeline",
        count: unqualifiedLeads.length,
        message: `${unqualifiedLeads.length} leads en statut "new" depuis plus de 7j`,
        items: unqualifiedLeads.slice(0, 5).map((l) => ({ id: l.id, name: l.name })),
        action: "Qualifier ou disqualifier ces leads",
      });
    }

    // 5. Opportunités sans date (-3 pts, max -15)
    const oppsNoDate = opportunitiesNoDate.data || [];
    if (oppsNoDate.length > 0) {
      score -= Math.min(oppsNoDate.length * 3, 15);
      issues.push({
        severity: "high",
        category: "Pipeline",
        count: oppsNoDate.length,
        message: `${oppsNoDate.length} opportunités sans date de clôture`,
        items: oppsNoDate.slice(0, 5).map((o) => ({ id: o.id, title: o.title, stage: o.stage })),
        action: "Ajouter une date de clôture estimée",
      });
    }

    // 6. Opportunités sans montant (-3 pts, max -15)
    const oppsNoValue = opportunitiesNoValue.data || [];
    if (oppsNoValue.length > 0) {
      score -= Math.min(oppsNoValue.length * 3, 15);
      issues.push({
        severity: "high",
        category: "Pipeline",
        count: oppsNoValue.length,
        message: `${oppsNoValue.length} opportunités sans montant estimé`,
        items: oppsNoValue.slice(0, 5).map((o) => ({ id: o.id, title: o.title, stage: o.stage })),
        action: "Renseigner la valeur estimée du deal",
      });
    }

    // 7. Projets rouges sans tâche active (-5 pts, max -15)
    const redProjects = (projectsRedNoTask.data || []).filter(
      (p: any) => !p.tasks || p.tasks.filter((t: any) => t.status !== "done" && t.status !== "cancelled").length === 0
    );
    if (redProjects.length > 0) {
      score -= Math.min(redProjects.length * 5, 15);
      issues.push({
        severity: "critical",
        category: "Projets",
        count: redProjects.length,
        message: `${redProjects.length} projets en rouge sans tâche active`,
        items: redProjects.slice(0, 5).map((p: any) => ({ id: p.id, name: p.name })),
        action: "Créer une tâche de remédiation immédiatement",
      });
    }

    // 8. Tâches en retard (-1 pt, max -10)
    const overdueTasks = tasksOverdue.data || [];
    if (overdueTasks.length > 0) {
      score -= Math.min(overdueTasks.length, 10);
      issues.push({
        severity: overdueTasks.length > 5 ? "high" : "medium",
        category: "Tâches",
        count: overdueTasks.length,
        message: `${overdueTasks.length} tâches en retard`,
        items: overdueTasks.slice(0, 5).map((t) => ({ id: t.id, title: t.title, due_date: t.due_date, priority: t.priority })),
        action: "Reprogrammer ou déléguer ces tâches",
      });
    }

    // 9. Leads qualifiés sans opportunité (-3 pts, max -15)
    const qualifiedNoOpp = (leadsQualifiedNoOpportunity.data || []).filter(
      (l: any) => !l.opportunities || l.opportunities.length === 0
    );
    if (qualifiedNoOpp.length > 0) {
      score -= Math.min(qualifiedNoOpp.length * 3, 15);
      issues.push({
        severity: "high",
        category: "Pipeline",
        count: qualifiedNoOpp.length,
        message: `${qualifiedNoOpp.length} leads qualifiés sans opportunité créée`,
        items: qualifiedNoOpp.slice(0, 5).map((l: any) => ({ id: l.id, name: l.name, lead_score: l.lead_score })),
        action: "Créer une opportunité pour chaque lead qualifié",
      });
    }

    // 10. Doublons potentiels (-5 pts)
    const allLeads = duplicateLeads.data || [];
    const emailMap = new Map<string, string>();
    const duplicates: Array<{ id: string; name: string; email: string }> = [];
    allLeads.forEach((l: any) => {
      if (l.email && emailMap.has(l.email)) {
        duplicates.push({ id: l.id, name: l.name, email: l.email });
      } else if (l.email) {
        emailMap.set(l.email, l.id);
      }
    });
    if (duplicates.length > 0) {
      score -= 5;
      issues.push({
        severity: "medium",
        category: "Doublons",
        count: duplicates.length,
        message: `${duplicates.length} doublons potentiels détectés`,
        items: duplicates.slice(0, 5),
        action: "Fusionner ou supprimer les doublons",
      });
    }

    score = Math.max(0, score);

    const qualityLabel =
      score >= 90 ? "🟢 Excellent" :
      score >= 70 ? "🟡 Correct" :
      score >= 50 ? "🟠 À améliorer" :
      "🔴 Critique";

    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          score,
          quality_label: qualityLabel,
          total_issues: issues.length,
          critical_count: issues.filter((i) => i.severity === "critical").length,
          high_count: issues.filter((i) => i.severity === "high").length,
          issues: issues.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9)),
          generated_at: new Date().toISOString(),
          note: "Pour appliquer les corrections, confirme chaque action — je les exécute via les outils MCP existants.",
        }),
      }],
    };
  }
);

// ============================================================
// TOOL 76: analyze_pipeline
// ============================================================
mcpServer.registerTool(
  "analyze_pipeline",
  {
    title: "Analyze Pipeline",
    description: "Analyse complète du pipeline commercial. Détecte les deals à risque, les opportunités chaudes, les signaux faibles et les actions prioritaires.",
    inputSchema: {
      type: "object" as const,
      properties: {
        risk_threshold_days: { type: "number", description: "Jours sans activité considérés comme risque (défaut: 21)" },
        stage_filter: { type: "string", description: "Filtrer par stage spécifique" },
      },
    },
  },
  async (params: any) => {
    const wsId = (globalThis as any).__mcpAuth?.workspace_id;
    const riskThresholdDays = params.risk_threshold_days || 21;

    let oppsQuery = supabaseAdmin
      .from("opportunities")
      .select(`
        id, title, stage, value_amount, probability,
        expected_close_date, source, created_at, updated_at,
        lead_id, description,
        leads(id, name, company, email, lead_score, status)
      `)
      .eq("workspace_id", wsId)
      .not("stage", "in", '("closed_won","lost")')
      .order("value_amount", { ascending: false })
      .limit(1000);

    if (params.stage_filter) {
      oppsQuery = oppsQuery.eq("stage", params.stage_filter);
    }

    const [opportunities, leads, activities, tasks, projects, wonDeals] = await Promise.all([
      oppsQuery,
      supabaseAdmin
        .from("leads")
        .select("id, name, company, lead_score, qualification_status, updated_at")
        .eq("workspace_id", wsId)
        .eq("qualification_status", "qualified"),
      supabaseAdmin
        .from("activity_log")
        .select("opportunity_id, created_at, activity_type, title")
        .eq("workspace_id", wsId)
        .not("opportunity_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("tasks")
        .select("id, title, status, priority, due_date, opportunity_id")
        .eq("workspace_id", wsId)
        .not("status", "in", '("done","cancelled")')
        .not("opportunity_id", "is", null),
      supabaseAdmin
        .from("projects")
        .select("id, name, status, health_status, opportunity_id, budget_amount")
        .eq("workspace_id", wsId)
        .eq("status", "active"),
      supabaseAdmin
        .from("opportunities")
        .select("id, title, value_amount, stage, closed_at, probability")
        .eq("workspace_id", wsId)
        .eq("stage", "closed_won")
        .gte("closed_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const now = new Date();

    // Dernière activité par opportunité
    const lastActivityMap = new Map<string, any>();
    (activities.data || []).forEach((a: any) => {
      if (!lastActivityMap.has(a.opportunity_id)) {
        lastActivityMap.set(a.opportunity_id, a);
      }
    });

    // Tâches par opportunité
    const tasksMap = new Map<string, any[]>();
    (tasks.data || []).forEach((t: any) => {
      if (!tasksMap.has(t.opportunity_id)) tasksMap.set(t.opportunity_id, []);
      tasksMap.get(t.opportunity_id)!.push(t);
    });

    const analyzedOpps = (opportunities.data || []).map((opp: any) => {
      const lastActivity = lastActivityMap.get(opp.id);
      const daysSinceActivity = lastActivity
        ? Math.floor((now.getTime() - new Date(lastActivity.created_at).getTime()) / (24 * 60 * 60 * 1000))
        : Math.floor((now.getTime() - new Date(opp.updated_at).getTime()) / (24 * 60 * 60 * 1000));

      const oppTasks = tasksMap.get(opp.id) || [];
      const overdueTasksCount = oppTasks.filter(
        (t: any) => t.due_date && new Date(t.due_date) < now
      ).length;

      const daysToClose = opp.expected_close_date
        ? Math.floor((new Date(opp.expected_close_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        : null;

      let riskScore = 0;
      const riskFactors: string[] = [];

      if (daysSinceActivity > riskThresholdDays) {
        riskScore += 3;
        riskFactors.push(`Inactif depuis ${daysSinceActivity}j`);
      }
      if (!opp.expected_close_date) {
        riskScore += 2;
        riskFactors.push("Pas de date de clôture");
      }
      if (daysToClose !== null && daysToClose < 0) {
        riskScore += 3;
        riskFactors.push(`Date de clôture dépassée de ${Math.abs(daysToClose)}j`);
      }
      if (!opp.value_amount || opp.value_amount === 0) {
        riskScore += 1;
        riskFactors.push("Montant non renseigné");
      }
      if (overdueTasksCount > 0) {
        riskScore += 2;
        riskFactors.push(`${overdueTasksCount} tâche(s) en retard`);
      }

      const hotSignals: string[] = [];
      if (daysSinceActivity <= 3) hotSignals.push("Activité récente < 3j");
      if (opp.probability >= 70) hotSignals.push(`Probabilité élevée (${opp.probability}%)`);
      if (daysToClose !== null && daysToClose <= 14 && daysToClose >= 0) {
        hotSignals.push(`Closing imminent (${daysToClose}j)`);
      }
      if (opp.leads?.lead_score >= 15) hotSignals.push("Lead très qualifié");

      const status =
        riskScore >= 5 ? "at_risk" :
        riskScore >= 3 ? "needs_attention" :
        hotSignals.length >= 2 ? "hot" :
        "normal";

      return {
        id: opp.id,
        title: opp.title,
        stage: opp.stage,
        value_amount: opp.value_amount || 0,
        probability: opp.probability || 0,
        expected_close_date: opp.expected_close_date,
        days_to_close: daysToClose,
        days_since_activity: daysSinceActivity,
        last_activity: lastActivity?.title || null,
        lead: opp.leads ? { name: opp.leads.name, company: opp.leads.company, score: opp.leads.lead_score } : null,
        status,
        risk_score: riskScore,
        risk_factors: riskFactors,
        hot_signals: hotSignals,
        active_tasks: oppTasks.length,
        overdue_tasks: overdueTasksCount,
      };
    });

    const totalPipelineValue = analyzedOpps.reduce((sum: number, o: any) => sum + o.value_amount, 0);
    const weightedPipelineValue = analyzedOpps.reduce((sum: number, o: any) => sum + (o.value_amount * (o.probability / 100)), 0);
    const atRisk = analyzedOpps.filter((o: any) => o.status === "at_risk");
    const needsAttention = analyzedOpps.filter((o: any) => o.status === "needs_attention");
    const hotDeals = analyzedOpps.filter((o: any) => o.status === "hot");

    const oppLeadIds = new Set((opportunities.data || []).map((o: any) => o.lead_id).filter(Boolean));
    const qualifiedNoOpp = (leads.data || []).filter((l: any) => !oppLeadIds.has(l.id));

    const wonData = wonDeals.data || [];
    const avgDealSize = wonData.length > 0
      ? wonData.reduce((s: number, d: any) => s + (d.value_amount || 0), 0) / wonData.length
      : 0;

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          summary: {
            total_opportunities: analyzedOpps.length,
            total_pipeline_value: totalPipelineValue,
            weighted_pipeline_value: Math.round(weightedPipelineValue),
            at_risk_count: atRisk.length,
            needs_attention_count: needsAttention.length,
            hot_deals_count: hotDeals.length,
            qualified_leads_no_opp: qualifiedNoOpp.length,
            avg_won_deal_size_90d: Math.round(avgDealSize),
          },
          at_risk: atRisk.sort((a: any, b: any) => b.risk_score - a.risk_score),
          needs_attention: needsAttention,
          hot_deals: hotDeals,
          all_opportunities: analyzedOpps,
          qualified_leads_no_opportunity: qualifiedNoOpp.map((l: any) => ({
            id: l.id, name: l.name, company: l.company, lead_score: l.lead_score,
          })),
          benchmark: {
            won_deals_last_90d: wonData.length,
            avg_deal_size: Math.round(avgDealSize),
          },
          generated_at: new Date().toISOString(),
        }),
      }],
    };
  }
);

// ============================================================
// TOOL 77: get_forecast
// ============================================================
mcpServer.registerTool(
  "get_forecast",
  {
    title: "Get Revenue Forecast",
    description: "Prévisions de revenus avec scénarios pessimiste / réaliste / optimiste. Basé sur les opportunités actives + historique real deals.",
    inputSchema: {
      type: "object" as const,
      properties: {
        months: { type: "number", description: "Horizon de prévision en mois (défaut: 3)" },
        include_scenarios: { type: "boolean", description: "Inclure les 3 scénarios (défaut: true)" },
      },
    },
  },
  async (params: any) => {
    const wsId = (globalThis as any).__mcpAuth?.workspace_id;
    const months = params.months || 3;

    const [activeOpps, wonHistory, projects] = await Promise.all([
      supabaseAdmin
        .from("opportunities")
        .select("id, title, stage, value_amount, probability, expected_close_date, created_at")
        .eq("workspace_id", wsId)
        .not("stage", "in", '("closed_won","lost")')
        .not("expected_close_date", "is", null),
      supabaseAdmin
        .from("opportunities")
        .select("id, value_amount, closed_at, stage, probability")
        .eq("workspace_id", wsId)
        .eq("stage", "closed_won")
        .gte("closed_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .order("closed_at", { ascending: true }),
      supabaseAdmin
        .from("projects")
        .select("id, name, budget_amount, consumed_amount, status, planned_end_date")
        .eq("workspace_id", wsId)
        .eq("status", "active")
        .not("budget_amount", "is", null),
    ]);

    const now = new Date();
    const horizonEnd = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);

    // Grouper par mois
    const monthlyForecast: Record<string, any> = {};
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyForecast[key] = {
        month: key,
        opportunities: [],
        pessimistic: 0,
        realistic: 0,
        optimistic: 0,
      };
    }

    // Répartir les opportunités par mois de clôture estimé
    (activeOpps.data || []).forEach((opp: any) => {
      const closeDate = new Date(opp.expected_close_date);
      if (closeDate <= horizonEnd) {
        const key = `${closeDate.getFullYear()}-${String(closeDate.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyForecast[key]) {
          const value = opp.value_amount || 0;
          const prob = (opp.probability || 50) / 100;
          monthlyForecast[key].opportunities.push({
            id: opp.id,
            title: opp.title,
            value_amount: value,
            probability: opp.probability,
            stage: opp.stage,
          });
          monthlyForecast[key].pessimistic += Math.round(value * prob * 0.6);
          monthlyForecast[key].realistic += Math.round(value * prob);
          monthlyForecast[key].optimistic += Math.round(value * Math.min(prob * 1.3, 1));
        }
      }
    });

    // Historique mensuel (revenus réels)
    const monthlyHistory: Record<string, any> = {};
    (wonHistory.data || []).forEach((deal: any) => {
      const d = new Date(deal.closed_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyHistory[key]) monthlyHistory[key] = { month: key, revenue: 0, deals: 0 };
      monthlyHistory[key].revenue += deal.value_amount || 0;
      monthlyHistory[key].deals++;
    });

    const historyValues = Object.values(monthlyHistory) as any[];
    const avgMonthlyRevenue = historyValues.length > 0
      ? historyValues.reduce((s: number, m: any) => s + m.revenue, 0) / historyValues.length
      : 0;

    const forecastArray = Object.values(monthlyForecast) as any[];
    const totalPessimistic = forecastArray.reduce((s: number, m: any) => s + m.pessimistic, 0);
    const totalRealistic = forecastArray.reduce((s: number, m: any) => s + m.realistic, 0);
    const totalOptimistic = forecastArray.reduce((s: number, m: any) => s + m.optimistic, 0);

    const contractedRevenue = (projects.data || []).reduce((s: number, p: any) => {
      const remaining = (p.budget_amount || 0) - (p.consumed_amount || 0);
      return s + Math.max(0, remaining);
    }, 0);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          horizon_months: months,
          monthly_forecast: (params.include_scenarios !== false) ? forecastArray : forecastArray.map((m: any) => ({ month: m.month, opportunities: m.opportunities, realistic: m.realistic })),
          totals: {
            pessimistic: totalPessimistic,
            realistic: totalRealistic,
            optimistic: totalOptimistic,
            contracted_revenue: Math.round(contractedRevenue),
          },
          historical: {
            monthly_history: historyValues.slice(-6),
            avg_monthly_revenue: Math.round(avgMonthlyRevenue),
            total_won_12m: (wonHistory.data || []).reduce((s: number, d: any) => s + (d.value_amount || 0), 0),
          },
          confidence_note: historyValues.length < 3
            ? "Historique insuffisant (<3 mois) — forecast indicatif uniquement"
            : `Basé sur ${historyValues.length} mois d'historique réel`,
          generated_at: new Date().toISOString(),
        }),
      }],
    };
  }
);

// ============================================================
// TOOL 78: run_workflow
// ============================================================
mcpServer.registerTool(
  "run_workflow",
  {
    title: "Run Workflow",
    description: "Exécute un workflow complexe multi-actions en une commande. Retourne un plan d'exécution détaillé — validation requise avant exécution réelle. Workflows : onboard_client, close_deal, analyze_prospect, weekly_review, content_campaign.",
    inputSchema: {
      type: "object" as const,
      properties: {
        workflow_name: { type: "string", description: "Nom du workflow (onboard_client, close_deal, analyze_prospect, weekly_review, content_campaign)" },
        entity_id: { type: "string", description: "UUID de l'entité cible (opportunity_id ou lead_id selon le workflow)" },
        entity_type: { type: "string", description: "Type d'entité (opportunity, lead)" },
        params: { type: "object", description: "Paramètres spécifiques au workflow (outcome, reason, sector, product…)" },
      },
      required: ["workflow_name"],
    },
  },
  async (params: any) => {
    const wsId = (globalThis as any).__mcpAuth?.workspace_id;

    const workflows: Record<string, (entityId: string | null, wfParams: any) => Promise<any>> = {

      // WORKFLOW 1: ONBOARD CLIENT
      onboard_client: async (entityId, wfParams) => {
        if (!entityId) throw new Error("entity_id requis (opportunity_id)");

        const { data: opp } = await supabaseAdmin
          .from("opportunities")
          .select("*, leads(id, name, company, email)")
          .eq("id", entityId)
          .single();

        if (!opp) throw new Error("Opportunité introuvable");

        const steps = [
          {
            step: 1,
            action: "create_project",
            description: `Créer projet "${opp.title}" pour ${(opp as any).leads?.company}`,
            data: {
              name: opp.title,
              opportunity_id: opp.id,
              lead_id: opp.lead_id,
              budget_amount: opp.value_amount,
              status: "active",
              health_status: "green",
            },
          },
          {
            step: 2,
            action: "create_tasks",
            description: "Créer les 5 tâches d'onboarding standard",
            data: [
              { title: "Kick-off call planifié", priority: "high", due_days: 3 },
              { title: "Accès et credentials envoyés", priority: "high", due_days: 5 },
              { title: "Audit technique initial", priority: "medium", due_days: 10 },
              { title: "Formation utilisateurs", priority: "medium", due_days: 21 },
              { title: "Premier bilan à 30j", priority: "low", due_days: 30 },
            ],
          },
          {
            step: 3,
            action: "create_meeting_note",
            description: "Créer note de kick-off",
            data: {
              title: `Kick-off ${(opp as any).leads?.company}`,
              objectives: `Démarrage projet ${opp.title}`,
              next_steps: "Envoyer accès, planifier formation",
              opportunity_id: opp.id,
            },
          },
          {
            step: 4,
            action: "generate_followup_email",
            description: `Générer email de bienvenue pour ${(opp as any).leads?.name}`,
            data: {
              lead_id: opp.lead_id,
              context: `Client vient de signer pour ${opp.title}. Email de bienvenue chaleureux avec prochaines étapes.`,
            },
          },
          {
            step: 5,
            action: "create_activity_note",
            description: "Logger le démarrage dans l'historique",
            data: {
              entity_type: "opportunity",
              entity_id: opp.id,
              activity_type: "deal_won",
              title: `Deal gagné — ${opp.title}`,
              content: `Valeur : ${opp.value_amount}€. Onboarding initié.`,
              opportunity_id: opp.id,
            },
          },
        ];

        return {
          workflow: "onboard_client",
          entity: { id: opp.id, title: opp.title, client: (opp as any).leads?.company },
          steps_count: steps.length,
          steps,
          estimated_actions: "1 projet + 5 tâches + 1 note réunion + 1 email + 1 activité",
          validation_required: true,
          message: "Plan d'onboarding prêt. Confirme pour exécuter chaque étape.",
        };
      },

      // WORKFLOW 2: CLOSE DEAL
      close_deal: async (entityId, wfParams) => {
        if (!entityId) throw new Error("entity_id requis (opportunity_id)");

        const { data: opp } = await supabaseAdmin
          .from("opportunities")
          .select("*, leads(id, name, company, email, lead_score)")
          .eq("id", entityId)
          .single();

        if (!opp) throw new Error("Opportunité introuvable");

        const outcome = wfParams?.outcome || "closed_won";

        const steps = outcome === "closed_won" ? [
          {
            step: 1,
            action: "update_opportunity",
            description: "Passer l'opportunité en \"closed_won\"",
            data: {
              opportunity_id: opp.id,
              stage: "closed_won",
              closed_at: new Date().toISOString(),
              probability: 100,
            },
          },
          {
            step: 2,
            action: "update_lead",
            description: `Passer le lead ${(opp as any).leads?.name} en "converted"`,
            data: { lead_id: opp.lead_id, status: "converted" },
          },
          {
            step: 3,
            action: "create_specification",
            description: "Générer un CDC initial",
            data: {
              title: `CDC — ${opp.title}`,
              project_id: null,
              status: "draft",
              content: {
                context: opp.description || "",
                value: opp.value_amount,
                client: (opp as any).leads?.company,
              },
            },
          },
          {
            step: 4,
            action: "trigger_onboard",
            description: "Déclencher le workflow onboard_client",
            data: { opportunity_id: opp.id },
          },
        ] : [
          {
            step: 1,
            action: "update_opportunity",
            description: "Passer l'opportunité en \"lost\"",
            data: {
              opportunity_id: opp.id,
              stage: "lost",
              closed_at: new Date().toISOString(),
              close_reason: wfParams?.reason || "Non renseigné",
            },
          },
          {
            step: 2,
            action: "update_lead",
            description: "Passer le lead en \"lost\"",
            data: { lead_id: opp.lead_id, status: "lost" },
          },
          {
            step: 3,
            action: "create_activity_note",
            description: "Logger la perte avec raison",
            data: {
              entity_type: "opportunity",
              entity_id: opp.id,
              activity_type: "deal_lost",
              title: `Deal perdu — ${opp.title}`,
              content: `Raison : ${wfParams?.reason || "Non renseignée"}`,
              opportunity_id: opp.id,
            },
          },
        ];

        return {
          workflow: "close_deal",
          outcome,
          entity: { id: opp.id, title: opp.title, client: (opp as any).leads?.company },
          steps_count: steps.length,
          steps,
          validation_required: true,
          message: `Plan de clôture (${outcome}) prêt. Confirme pour exécuter.`,
        };
      },

      // WORKFLOW 3: ANALYZE PROSPECT
      analyze_prospect: async (entityId, wfParams) => {
        if (!entityId) throw new Error("entity_id requis (lead_id)");

        const [leadResult, activitiesResult, oppsResult] = await Promise.all([
          supabaseAdmin
            .from("leads")
            .select("*")
            .eq("id", entityId)
            .single(),
          supabaseAdmin
            .from("activity_log")
            .select("activity_type, title, created_at")
            .eq("workspace_id", wsId)
            .eq("lead_id", entityId)
            .order("created_at", { ascending: false })
            .limit(10),
          supabaseAdmin
            .from("opportunities")
            .select("id, title, stage, value_amount, probability")
            .eq("workspace_id", wsId)
            .eq("lead_id", entityId),
        ]);

        const lead = leadResult.data;
        if (!lead) throw new Error("Lead introuvable");

        const steps = [
          {
            step: 1,
            action: "pappers_lookup",
            description: `Enrichir ${lead.company || lead.name} via Pappers`,
            data: { query: lead.siret || lead.company || lead.name },
          },
          {
            step: 2,
            action: "run_consulte",
            description: "Générer synthèse 360° Consulte",
            data: { entity_type: "lead", entity_id: lead.id },
          },
          {
            step: 3,
            action: "search_viviers",
            description: "Chercher des contacts similaires dans les viviers",
            data: {
              query: `${lead.industry || ""} ${lead.city || ""} ${lead.company || ""}`.trim(),
            },
          },
          {
            step: 4,
            action: "generate_followup_email",
            description: "Préparer un email de relance personnalisé",
            data: {
              lead_id: lead.id,
              context: `Score: ${lead.lead_score}, Secteur: ${lead.industry}, Budget déclaré: ${lead.budget || "non renseigné"}`,
            },
          },
        ];

        return {
          workflow: "analyze_prospect",
          entity: {
            id: lead.id,
            name: lead.name,
            company: lead.company,
            score: lead.lead_score,
            status: lead.status,
          },
          existing_data: {
            activities_count: activitiesResult.data?.length || 0,
            opportunities_count: oppsResult.data?.length || 0,
            last_activity: activitiesResult.data?.[0]?.title || "Aucune",
          },
          steps_count: steps.length,
          steps,
          validation_required: true,
          message: "Plan d'analyse prêt. Confirme pour lancer chaque étape.",
        };
      },

      // WORKFLOW 4: WEEKLY REVIEW
      weekly_review: async (_entityId, _wfParams) => {
        const steps = [
          { step: 1, action: "audit_crm_quality", description: "Score de qualité CRM de la semaine" },
          { step: 2, action: "analyze_pipeline", description: "État du pipeline et deals à risque" },
          { step: 3, action: "get_forecast", description: "Forecast 3 mois mis à jour" },
          { step: 4, action: "get_tasks", description: "Tâches en retard et priorités semaine prochaine", data: { status: "todo", limit: 20 } },
          { step: 5, action: "get_sentinel_alerts", description: "Alertes Sentinel non résolues" },
          { step: 6, action: "get_ai_usage", description: "Consommation IA de la semaine", data: { days: 7 } },
        ];

        return {
          workflow: "weekly_review",
          week: new Date().toISOString().slice(0, 10),
          steps_count: steps.length,
          steps,
          validation_required: false,
          message: "Revue hebdo — toutes les données en lecture. Lance directement ?",
        };
      },

      // WORKFLOW 5: CONTENT CAMPAIGN
      content_campaign: async (_entityId, wfParams) => {
        const targetSector = wfParams?.sector || "PME françaises";
        const targetProduct = wfParams?.product || "IArche";

        const { data: sectorLeads } = await supabaseAdmin
          .from("leads")
          .select("industry, company, qualification_status, lead_score")
          .eq("workspace_id", wsId)
          .not("status", "in", '("lost","archived")')
          .limit(100);

        const sectorCount: Record<string, number> = {};
        (sectorLeads || []).forEach((l: any) => {
          if (l.industry) {
            sectorCount[l.industry] = (sectorCount[l.industry] || 0) + 1;
          }
        });
        const topSectors = Object.entries(sectorCount)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 3)
          .map(([sector, count]) => ({ sector, count }));

        const steps = [
          {
            step: 1,
            action: "generate_article",
            description: `Générer article SEO ciblé "${targetSector}"`,
            data: {
              prompt: `Rédige un article expert sur l'IA pour les ${targetSector}. Angle : comment ${targetProduct} transforme leur quotidien. SEO-optimisé, ton expert mais accessible.`,
              resource_type: "expertise",
            },
          },
          { step: 2, action: "enrich_seo", description: "Enrichir le SEO de l'article généré" },
          { step: 3, action: "suggest_tags", description: "Suggérer les tags pertinents" },
          { step: 4, action: "generate_faq", description: "Générer la FAQ associée à l'article" },
          {
            step: 5,
            action: "search_viviers",
            description: "Identifier les prospects cibles dans les viviers",
            data: { query: targetSector, limit: 50 },
          },
        ];

        return {
          workflow: "content_campaign",
          target: { sector: targetSector, product: targetProduct },
          sector_analysis: {
            top_sectors_in_crm: topSectors,
            recommendation: topSectors[0]
              ? `Secteur le plus représenté dans ton CRM : ${topSectors[0].sector} (${topSectors[0].count} leads)`
              : "Pas assez de données sectorielles",
          },
          steps_count: steps.length,
          steps,
          validation_required: true,
          message: "Plan de campagne contenu prêt. Confirme pour lancer.",
        };
      },
    };

    // DISPATCHER
    const handler = workflows[params.workflow_name];
    if (!handler) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: `Workflow "${params.workflow_name}" inconnu.`,
            available_workflows: [
              "onboard_client — Onboarder un nouveau client (entity_id = opportunity_id)",
              "close_deal — Clôturer un deal won/lost (entity_id = opportunity_id, params.outcome)",
              "analyze_prospect — Analyse complète d'un prospect (entity_id = lead_id)",
              "weekly_review — Revue hebdomadaire complète (pas d'entity_id)",
              "content_campaign — Campagne contenu ciblée (params.sector, params.product)",
            ],
          }),
        }],
      };
    }

    try {
      const result = await handler(params.entity_id || null, params.params || {});
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result),
        }],
      };
    } catch (err: any) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ error: err.message, workflow: params.workflow_name }),
        }],
      };
    }
  }
);


// ============================================================
// TOOL 79: analyze_content_gaps
// ============================================================
mcpServer.registerTool(
  "analyze_content_gaps",
  {
    title: "Analyze Content Gaps",
    description: "Analyse les lacunes de contenu SEO en croisant les articles existants avec les secteurs réels du pipeline CRM. Identifie les opportunités de contenu manquantes avec priorité high/medium/low.",
    inputSchema: {
      type: "object" as const,
      properties: {
        resource_type: { type: "string", description: "Filtrer par type d'article (expertise, cas-client, actualite, solution…)" },
        min_leads_threshold: { type: "number", description: "Nombre minimum de leads dans un secteur pour justifier un article (défaut: 2)" },
      },
    },
  },
  async (params: any) => {
    const wsId = (globalThis as any).__mcpAuth?.workspace_id;
    try {
      const articlesQuery = supabaseAdmin
        .from('articles')
        .select('id, title, slug, resource_type, status, published, meta_description, created_at')
        .order('created_at', { ascending: false });
      if (params.resource_type) {
        articlesQuery.eq('resource_type', params.resource_type);
      }

      const [articles, leads, viviers, tags] = await Promise.all([
        articlesQuery,
        supabaseAdmin
          .from('leads')
          .select('industry, company, qualification_status, lead_score, status')
          .eq('workspace_id', wsId)
          .not('status', 'in', '("lost","archived")')
          .not('industry', 'is', null),
        supabaseAdmin
          .from('viviers')
          .select('industry')
          .eq('workspace_id', wsId)
          .not('industry', 'is', null)
          .limit(500),
        supabaseAdmin
          .from('tags')
          .select('name, slug')
          .order('name'),
      ]);

      // Analyse des secteurs CRM
      const sectorMap = new Map<string, { leads: number; qualified: number; total_score: number; companies: Set<string> }>();
      (leads.data || []).forEach((l: any) => {
        if (!l.industry) return;
        const sector = l.industry.toLowerCase().trim();
        if (!sectorMap.has(sector)) {
          sectorMap.set(sector, { leads: 0, qualified: 0, total_score: 0, companies: new Set() });
        }
        const s = sectorMap.get(sector)!;
        s.leads++;
        if (l.qualification_status === 'qualified') s.qualified++;
        s.total_score += l.lead_score || 0;
        if (l.company) s.companies.add(l.company);
      });

      // Secteurs viviers
      const vivierSectors = new Map<string, number>();
      (viviers.data || []).forEach((v: any) => {
        if (!v.industry) return;
        const sector = v.industry.toLowerCase().trim();
        vivierSectors.set(sector, (vivierSectors.get(sector) || 0) + 1);
      });

      // Mapping synonymes secteurs
      const sectorSynonyms: Record<string, string[]> = {
        'juridique': ['avocat', 'cabinet', 'droit', 'legal', 'juridique', 'notaire'],
        'comptabilité': ['comptable', 'comptabilité', 'expert-comptable', 'cabinet comptable', 'finance'],
        'architecture': ['architecte', 'architecture', 'btp', 'construction', 'bureau d\'études'],
        'événementiel': ['événement', 'événementiel', 'samba', 'spectacle', 'production'],
        'gestion de patrimoine': ['patrimoine', 'wealth', 'investissement', 'finance', 'immobilier'],
        'clubs d\'affaires': ['club', 'réseau', 'association', 'networking', 'beerecos'],
        'immobilier': ['immobilier', 'agence immobilière', 'promoteur', 'foncier'],
        'santé': ['santé', 'médecin', 'clinique', 'médical', 'pharmacie'],
        'formation': ['formation', 'enseignement', 'éducation', 'organisme de formation'],
        'consulting': ['conseil', 'consulting', 'consultant', 'stratégie'],
      };

      const matchesSector = (article: any, sector: string): boolean => {
        const text = (
          article.title + ' ' +
          (article.meta_description || '') + ' ' +
          (article.slug || '')
        ).toLowerCase();

        // Match direct
        if (text.includes(sector)) return true;

        // Match synonymes
        const synonyms = sectorSynonyms[sector] ||
          sector.split(' ').filter((w: string) => w.length > 3);
        return synonyms.some((syn: string) => text.includes(syn));
      };

      // Identifier les gaps
      const threshold = params.min_leads_threshold || 2;
      const gaps: any[] = [];
      const covered: any[] = [];

      sectorMap.forEach((data, sector) => {
        if (data.leads < threshold) return;

        // Compter les articles couvrant ce secteur
        const coveringArticles = (articles.data || []).filter((a: any) => matchesSector(a, sector));
        // Seuil minimum 2 articles pour considérer un secteur comme "covered"
        const isCovered = coveringArticles.length >= 2;

        const vivierCount = vivierSectors.get(sector) || 0;
        const priority = data.qualified > 0 ? 'high' :
          data.leads >= 3 ? 'medium' : 'low';

        const item = {
          sector,
          leads_count: data.leads,
          qualified_count: data.qualified,
          avg_score: data.leads > 0 ? Math.round(data.total_score / data.leads) : 0,
          companies: Array.from(data.companies).slice(0, 3),
          vivier_prospects: vivierCount,
          covering_articles_count: coveringArticles.length,
          covering_articles: coveringArticles.slice(0, 3).map((a: any) => ({ title: a.title, slug: a.slug })),
          priority,
          article_suggestions: [
            `L'IA dans le secteur ${sector} : guide pratique pour les PME`,
            `Comment ${sector} optimise ses processus avec l'IA en 2026`,
            `Cas client : transformation IA dans le ${sector}`,
          ],
        };

        if (isCovered) {
          covered.push({ ...item, status: 'covered' });
        } else {
          gaps.push({ ...item, status: 'gap' });
        }
      });

      // Trier par priorité
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      gaps.sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));

      // Articles par type
      const articlesByType: Record<string, { total: number; published: number; draft: number }> = {};
      (articles.data || []).forEach((a: any) => {
        if (!articlesByType[a.resource_type]) {
          articlesByType[a.resource_type] = { total: 0, published: 0, draft: 0 };
        }
        articlesByType[a.resource_type].total++;
        if (a.published) articlesByType[a.resource_type].published++;
        else articlesByType[a.resource_type].draft++;
      });

      const result = {
        summary: {
          total_articles: articles.data?.length || 0,
          total_sectors_in_crm: sectorMap.size,
          gaps_identified: gaps.length,
          covered_sectors: covered.length,
          high_priority_gaps: gaps.filter(g => g.priority === 'high').length,
        },
        articles_by_type: articlesByType,
        content_gaps: gaps,
        covered_sectors: covered,
        quick_wins: gaps
          .filter(g => g.priority === 'high')
          .slice(0, 3)
          .map(g => ({
            sector: g.sector,
            reason: `${g.leads_count} leads actifs dont ${g.qualified_count} qualifiés`,
            suggested_title: g.article_suggestions[0],
            vivier_audience: g.vivier_prospects,
          })),
        available_tags: (tags.data || []).map((t: any) => t.name),
        generated_at: new Date().toISOString(),
      };

      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    } catch (err: any) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }],
      };
    }
  }
);


// ============================================================
// TOOL 80: plan_editorial
// ============================================================
mcpServer.registerTool(
  "plan_editorial",
  {
    title: "Plan Editorial",
    description: "Génère un calendrier éditorial sur N semaines basé sur le pipeline réel, les gaps de contenu détectés, et les événements CRM (bookings, opportunités, projets).",
    inputSchema: {
      type: "object" as const,
      properties: {
        weeks: { type: "number", description: "Horizon du calendrier en semaines (défaut: 4)" },
        focus_product: { type: "string", description: "Produit IArche à mettre en avant (Collaboria, ERP Avocat, Team5Connect, ChatbotRAG, Datalia)" },
      },
    },
  },
  async (params: any) => {
    const wsId = (globalThis as any).__mcpAuth?.workspace_id;
    const totalWeeks = params.weeks || 4;
    const focus_product = params.focus_product;

    try {
      const horizonDate = new Date(Date.now() + totalWeeks * 7 * 24 * 60 * 60 * 1000).toISOString();

      const [leadsResult, bookings, opportunities, projects] = await Promise.all([
        supabaseAdmin
          .from('leads')
          .select('industry, qualification_status, lead_score')
          .eq('workspace_id', wsId)
          .not('status', 'in', '("lost","archived")')
          .not('industry', 'is', null),
        supabaseAdmin
          .from('bookings')
          .select('id, name, start_time, meeting_type, lead_id')
          .eq('workspace_id', wsId)
          .gte('start_time', new Date().toISOString())
          .lte('start_time', horizonDate)
          .order('start_time'),
        supabaseAdmin
          .from('opportunities')
          .select('id, title, stage, expected_close_date, value_amount')
          .eq('workspace_id', wsId)
          .not('stage', 'in', '("closed_won","lost")')
          .not('expected_close_date', 'is', null)
          .lte('expected_close_date', horizonDate),
        supabaseAdmin
          .from('projects')
          .select('id, name, planned_end_date, health_status')
          .eq('workspace_id', wsId)
          .eq('status', 'active')
          .not('planned_end_date', 'is', null)
          .lte('planned_end_date', horizonDate),
      ]);

      // Analyser les secteurs prioritaires
      const sectorPriority = new Map<string, { count: number; qualified: number }>();
      (leadsResult.data || []).forEach((l: any) => {
        if (!l.industry) return;
        const s = l.industry.toLowerCase().trim();
        if (!sectorPriority.has(s)) sectorPriority.set(s, { count: 0, qualified: 0 });
        const entry = sectorPriority.get(s)!;
        entry.count++;
        if (l.qualification_status === 'qualified') entry.qualified++;
      });

      const topSectors = Array.from(sectorPriority.entries())
        .sort((a, b) => (b[1].qualified * 3 + b[1].count) - (a[1].qualified * 3 + a[1].count))
        .slice(0, 5)
        .map(([sector, data]) => ({ sector, ...data }));

      // Types de contenu rotatifs
      const contentTypes = ['expertise', 'cas-client', 'actualite', 'solution'];
      const products = focus_product
        ? [focus_product]
        : ['ERP Avocat', 'Collaboria', 'ChatbotRAG', 'Team5Connect', 'Datalia'];

      // Générer le calendrier semaine par semaine
      const calendar: any[] = [];

      for (let w = 0; w < totalWeeks; w++) {
        const weekStart = new Date(Date.now() + w * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        const weekLabel = `Semaine ${w + 1} (${weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })})`;

        const weekBookings = (bookings.data || []).filter((b: any) => {
          const d = new Date(b.start_time);
          return d >= weekStart && d < weekEnd;
        });
        const weekOpps = (opportunities.data || []).filter((o: any) => {
          const d = new Date(o.expected_close_date);
          return d >= weekStart && d < weekEnd;
        });

        const targetSector = topSectors[w % topSectors.length]?.sector || 'PME';
        const contentType = contentTypes[w % contentTypes.length];
        const product = products[w % products.length];

        const contentSuggestions: any[] = [
          {
            type: contentType,
            title: `${product} pour le secteur ${targetSector} : ce qui change vraiment`,
            keywords: [targetSector, product, 'IA', 'PME', 'automatisation'],
            estimated_effort: '2-3h avec generate_article',
            audience: `${topSectors[w % topSectors.length]?.count || 0} leads actifs dans ce secteur`,
            crm_trigger: weekOpps.length > 0
              ? `${weekOpps.length} opportunité(s) à relancer cette semaine`
              : null,
          },
        ];

        if (weekBookings.length > 0) {
          contentSuggestions.push({
            type: 'actualite',
            title: `Retour sur [événement] — Ce que les PME retiennent de l'IA`,
            keywords: ['événement', 'networking', 'IA', 'PME'],
            estimated_effort: '1h post-événement',
            crm_trigger: `${weekBookings.length} RDV cette semaine`,
          });
        }

        calendar.push({
          week: w + 1,
          label: weekLabel,
          target_sector: targetSector,
          content_suggestions: contentSuggestions,
          crm_events: {
            bookings: weekBookings.length,
            closing_opportunities: weekOpps.map((o: any) => o.title),
          },
          priority: weekOpps.length > 0 ? 'high' : 'normal',
        });
      }

      const result = {
        horizon_weeks: totalWeeks,
        focus_product: focus_product || 'Rotation tous produits',
        top_sectors_identified: topSectors,
        calendar,
        next_action: `Commence par la semaine 1 : utilise generate_article avec le titre suggéré, puis enrich_seo + suggest_tags + generate_faq`,
        generated_at: new Date().toISOString(),
      };

      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    } catch (err: any) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }],
      };
    }
  }
);

// ===== TOOL #81: simulate_pricing =====
mcpServer.registerTool(
  "simulate_pricing",
  {
    description: "Simule le pricing IArche pour un produit donné selon le profil client. Calcule ROI, payback period et recommande le bon package.",
    inputSchema: {
      product: z.string().describe("Produit IArche : ERP_Avocat, Collaboria, ChatbotRAG, Team5Connect, Datalia"),
      profile: z.unknown().optional().describe("Objet { team_size, revenue, sector, usage_frequency, needs_setup }"),
      compare_competitors: z.boolean().optional().describe("Inclure comparatif concurrents (défaut false)"),
    },
  },
  async (params: any) => {
    try {
      const PRICING: any = {
        ERP_Avocat: {
          name: 'ERP Avocat', model: 'subscription',
          tiers: [
            { name: 'Solo', min_users: 1, max_users: 2, monthly: 149, annual: 1490, setup: 500 },
            { name: 'Cabinet', min_users: 3, max_users: 10, monthly: 349, annual: 3490, setup: 1000 },
            { name: 'Structure', min_users: 11, max_users: 50, monthly: 749, annual: 7490, setup: 2000 },
          ],
          value_drivers: ['Réduction 40% temps administratif','Conformité RGPD automatisée','Facturation automatique','Gestion CLM intégrée'],
          competitors: [
            { name: 'Clio', monthly_per_user: 49, notes: 'US, pas RGPD natif' },
            { name: 'Jarvis Legal', monthly_per_user: 55, notes: 'FR, moins complet' },
            { name: 'Secib', monthly_per_user: 35, notes: 'FR, vieillissant' },
          ],
        },
        Collaboria: {
          name: 'Collaboria', model: 'per_seat',
          tiers: [
            { name: 'Starter', min_users: 1, max_users: 5, monthly_per_user: 29, annual_per_user: 290 },
            { name: 'Team', min_users: 6, max_users: 20, monthly_per_user: 24, annual_per_user: 240 },
            { name: 'Business', min_users: 21, max_users: 100, monthly_per_user: 19, annual_per_user: 190 },
          ],
          value_drivers: ['Accès 340+ LLMs depuis 1 interface','Collaboration équipe sur prompts','Historique et audit des conversations','Souveraineté données FR'],
          competitors: [
            { name: 'ChatGPT Team', monthly_per_user: 25, notes: 'US, 1 seul LLM' },
            { name: 'Mistral Le Chat Pro', monthly_per_user: 15, notes: 'FR, limité' },
          ],
        },
        ChatbotRAG: {
          name: 'Chatbot RAG Avancé', model: 'credits',
          tiers: [
            { name: 'Découverte', credits: 1000, price: 99, per_credit: 0.099 },
            { name: 'Pro', credits: 5000, price: 399, per_credit: 0.08 },
            { name: 'Scale', credits: 20000, price: 1299, per_credit: 0.065 },
          ],
          setup_range: { min: 2000, max: 8000 },
          value_drivers: ['Support client 24/7 automatisé','Réduction 60% tickets support','Base connaissance propriétaire','Intégration site existant < 1 semaine'],
          competitors: [
            { name: 'Intercom AI', monthly: 74, notes: 'US, générique' },
            { name: 'Crisp AI', monthly: 45, notes: 'FR, moins puissant' },
          ],
        },
        Team5Connect: {
          name: 'Team 5 Connect', model: 'license',
          tiers: [
            { name: 'PME BTP', max_employees: 50, license: 20000, annual_maintenance: 3000 },
            { name: 'ETI BTP', max_employees: 200, license: 35000, annual_maintenance: 5000 },
          ],
          value_drivers: ['Conformité RH BTP automatisée','Gestion intérimaires simplifiée','Réduction accidents chantier via alertes','ROI < 6 mois sur masse salariale'],
          competitors: [
            { name: 'Sage HR', annual: 8000, notes: 'Généraliste, pas BTP' },
            { name: 'Batigest', annual: 5000, notes: 'BTP mais pas RH IA' },
          ],
        },
        Datalia: {
          name: 'Datalia', model: 'lifetime',
          tiers: [{ name: 'Lifetime', price: 749, notes: 'Licence perpétuelle HT' }],
          value_drivers: ['Extraction 46 000+ contacts qualifiés','Données locales Pays Basque / Nouvelle-Aquitaine','Enrichissement automatique','Export direct CRM'],
          competitors: [
            { name: 'Kaspr', monthly: 49, notes: 'International, moins local' },
            { name: 'Lusha', monthly: 79, notes: 'US, RGPD risqué' },
          ],
        },
      };

      const productData = PRICING[params.product];
      if (!productData) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: `Produit inconnu : ${params.product}`, available_products: Object.keys(PRICING) }) }] };
      }

      const teamSize = params.profile?.team_size || 1;
      const sector = params.profile?.sector || 'non renseigné';
      const annualRevenue = params.profile?.revenue || 0;

      let recommendedTier: any = null;
      if (productData.model === 'subscription' || productData.model === 'per_seat') {
        recommendedTier = productData.tiers.find((t: any) => teamSize >= t.min_users && teamSize <= t.max_users) || productData.tiers[productData.tiers.length - 1];
      } else {
        recommendedTier = productData.tiers[0];
      }

      let annualCost = 0, monthlyCost = 0, setupCost = recommendedTier.setup || 0;
      if (productData.model === 'subscription') {
        annualCost = recommendedTier.annual || recommendedTier.monthly * 12;
        monthlyCost = recommendedTier.monthly;
      } else if (productData.model === 'per_seat') {
        annualCost = (recommendedTier.annual_per_user || recommendedTier.monthly_per_user * 12) * teamSize;
        monthlyCost = recommendedTier.monthly_per_user * teamSize;
      } else if (productData.model === 'license') {
        annualCost = recommendedTier.license + (recommendedTier.annual_maintenance || 0);
        monthlyCost = Math.round(annualCost / 12);
        setupCost = 0;
      } else if (productData.model === 'credits') {
        annualCost = recommendedTier.price;
        monthlyCost = Math.round(recommendedTier.price / 12);
        setupCost = params.profile?.needs_setup ? productData.setup_range?.min || 0 : 0;
      } else if (productData.model === 'lifetime') {
        annualCost = recommendedTier.price;
        monthlyCost = 0;
        setupCost = 0;
      }

      const totalFirstYear = annualCost + setupCost;

      let roiAnalysis: any = null;
      if (annualRevenue > 0) {
        const productivityGain: any = { ERP_Avocat: 0.30, Collaboria: 0.20, ChatbotRAG: 0.25, Team5Connect: 0.35, Datalia: 0.15 };
        const gain = annualRevenue * (productivityGain[params.product] || 0.20);
        const roi = Math.round(((gain - totalFirstYear) / totalFirstYear) * 100);
        const paybackMonths = Math.ceil(totalFirstYear / (gain / 12));
        roiAnalysis = { estimated_annual_gain: Math.round(gain), total_first_year_cost: totalFirstYear, roi_percentage: roi, payback_months: paybackMonths, note: 'Estimation basée sur gains productivité moyens observés clients IArche' };
      }

      let competitorComparison: any = null;
      if (params.compare_competitors && productData.competitors) {
        competitorComparison = productData.competitors.map((comp: any) => {
          const compAnnual = comp.monthly ? comp.monthly * 12 : comp.monthly_per_user ? comp.monthly_per_user * 12 * teamSize : comp.annual || 0;
          return {
            name: comp.name, annual_cost: compAnnual,
            vs_iarche: compAnnual > annualCost ? `${Math.round(compAnnual - annualCost)}€ plus cher/an` : `${Math.round(annualCost - compAnnual)}€ moins cher/an`,
            notes: comp.notes,
            iarche_advantage: comp.notes.includes('US') ? 'Souveraineté données FR + RGPD natif' : 'Fonctionnalités IA avancées',
          };
        });
      }

      const result = {
        product: productData.name, model: productData.model,
        profile: { team_size: teamSize, sector, annual_revenue: annualRevenue },
        recommended_tier: { name: recommendedTier.name, monthly_cost: monthlyCost, annual_cost: annualCost, setup_cost: setupCost, total_first_year: totalFirstYear },
        all_tiers: productData.tiers, value_drivers: productData.value_drivers,
        roi_analysis: roiAnalysis, competitor_comparison: competitorComparison,
        sales_recommendation: roiAnalysis?.payback_months <= 6
          ? `ROI < 6 mois — argument closing fort : "Vous êtes rentable avant la fin du semestre"`
          : roiAnalysis?.roi_percentage > 100
            ? `ROI > 100% — mettre en avant le gain net : ${roiAnalysis.estimated_annual_gain - totalFirstYear}€ de gain net an 1`
            : `Mettre en avant les ${productData.value_drivers[0]}`,
        generated_at: new Date().toISOString(),
      };
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }] };
    }
  }
);

// ===== TOOL #82: get_financial_report =====
mcpServer.registerTool(
  "get_financial_report",
  {
    description: "Rapport financier complet IArche. Agrège revenus réalisés, pipeline, projections, coûts IA et KPIs business.",
    inputSchema: {
      period: z.string().optional().describe("Période : Q1, Q2, Q3, Q4, month, year (défaut = trimestre en cours)"),
      year: z.number().optional().describe("Année (défaut = année en cours)"),
    },
  },
  async (params: any) => {
    try {
      const wsId = (globalThis as any).__mcpAuth?.workspace_id || Deno.env.get("OWNER_WORKSPACE_ID") || "00000000-0000-0000-0000-000000000001";
      const currentYear = params.year || new Date().getFullYear();
      const quarter = params.period || `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

      const quarterMap: any = {
        Q1: { start: `${currentYear}-01-01`, end: `${currentYear}-03-31` },
        Q2: { start: `${currentYear}-04-01`, end: `${currentYear}-06-30` },
        Q3: { start: `${currentYear}-07-01`, end: `${currentYear}-09-30` },
        Q4: { start: `${currentYear}-10-01`, end: `${currentYear}-12-31` },
        year: { start: `${currentYear}-01-01`, end: `${currentYear}-12-31` },
        month: {
          start: new Date(currentYear, new Date().getMonth(), 1).toISOString().slice(0, 10),
          end: new Date(currentYear, new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
        },
      };
      const period = quarterMap[quarter] || quarterMap[`Q${Math.ceil((new Date().getMonth() + 1) / 3)}`];

      const [wonDeals, activeOpps, aiUsage, projects, tasks] = await Promise.all([
        supabaseAdmin.from('opportunities').select('id, title, value_amount, closed_at, stage, lead_id').eq('workspace_id', wsId).eq('stage', 'closed_won').gte('closed_at', period.start).lte('closed_at', period.end + 'T23:59:59'),
        supabaseAdmin.from('opportunities').select('id, title, value_amount, probability, stage, expected_close_date').eq('workspace_id', wsId).not('stage', 'in', '("closed_won","lost")'),
        supabaseAdmin.from('ai_usage_metrics').select('model_provider, total_tokens, estimated_cost_cents, created_at').eq('workspace_id', wsId).gte('created_at', period.start).lte('created_at', period.end + 'T23:59:59'),
        supabaseAdmin.from('projects').select('id, name, budget_amount, consumed_amount, status, health_status').eq('workspace_id', wsId).eq('status', 'active'),
        supabaseAdmin.from('tasks').select('status, priority, created_at').eq('workspace_id', wsId).gte('created_at', period.start),
      ]);

      const totalRevenue = (wonDeals.data || []).reduce((s: number, d: any) => s + (d.value_amount || 0), 0);
      const dealCount = wonDeals.data?.length || 0;
      const avgDealSize = dealCount > 0 ? Math.round(totalRevenue / dealCount) : 0;

      const pipelineValue = (activeOpps.data || []).reduce((s: number, o: any) => s + (o.value_amount || 0), 0);
      const weightedPipeline = (activeOpps.data || []).reduce((s: number, o: any) => s + ((o.value_amount || 0) * ((o.probability || 50) / 100)), 0);

      const totalAiCost = (aiUsage.data || []).reduce((s: number, u: any) => s + ((u.estimated_cost_cents || 0) / 100), 0);
      const aiCostByProvider: any = {};
      (aiUsage.data || []).forEach((u: any) => {
        const prov = u.model_provider || 'unknown';
        if (!aiCostByProvider[prov]) aiCostByProvider[prov] = { cost: 0, tokens: 0, calls: 0 };
        aiCostByProvider[prov].cost += (u.estimated_cost_cents || 0) / 100;
        aiCostByProvider[prov].tokens += u.total_tokens || 0;
        aiCostByProvider[prov].calls++;
      });

      const contractedRevenue = (projects.data || []).reduce((s: number, p: any) => s + Math.max(0, (p.budget_amount || 0) - (p.consumed_amount || 0)), 0);

      const allOpps = [...(wonDeals.data || []), ...(activeOpps.data || [])];
      const conversionRate = allOpps.length > 0 ? Math.round((dealCount / allOpps.length) * 100) : 0;

      const taskStats: any = { done: 0, todo: 0, in_progress: 0 };
      (tasks.data || []).forEach((t: any) => { if (taskStats[t.status] !== undefined) taskStats[t.status]++; });

      const healthScore = Math.min(100, Math.round(
        (totalRevenue > 0 ? 30 : 0) +
        (weightedPipeline > totalRevenue ? 25 : 15) +
        (conversionRate > 20 ? 20 : conversionRate) +
        ((projects.data || []).filter((p: any) => p.health_status === 'green').length > 0 ? 15 : 5) +
        (totalAiCost < totalRevenue * 0.1 ? 10 : 5)
      ));

      const result = {
        period: { label: quarter, start: period.start, end: period.end },
        revenue: { realized: Math.round(totalRevenue), deals_won: dealCount, avg_deal_size: avgDealSize, contracted_backlog: Math.round(contractedRevenue) },
        pipeline: { total_value: Math.round(pipelineValue), weighted_value: Math.round(weightedPipeline), active_opportunities: activeOpps.data?.length || 0, conversion_rate_pct: conversionRate },
        costs: {
          ai_total_eur: Math.round(totalAiCost * 100) / 100,
          ai_by_provider: Object.entries(aiCostByProvider).map(([provider, data]: any) => ({ provider, cost_eur: Math.round(data.cost * 100) / 100, tokens: data.tokens, calls: data.calls })),
          ai_cost_ratio_pct: totalRevenue > 0 ? Math.round((totalAiCost / totalRevenue) * 100) : null,
        },
        projects: {
          active_count: projects.data?.length || 0,
          green: (projects.data || []).filter((p: any) => p.health_status === 'green').length,
          orange: (projects.data || []).filter((p: any) => p.health_status === 'orange').length,
          red: (projects.data || []).filter((p: any) => p.health_status === 'red').length,
        },
        productivity: {
          tasks_created: tasks.data?.length || 0, tasks_done: taskStats.done,
          completion_rate_pct: (tasks.data?.length || 0) > 0 ? Math.round((taskStats.done / tasks.data!.length) * 100) : 0,
        },
        health_score: healthScore,
        health_label: healthScore >= 70 ? '🟢 Bonne santé' : healthScore >= 40 ? '🟡 Attention requise' : '🔴 Situation critique',
        executive_summary: `${quarter} ${currentYear} : ${Math.round(totalRevenue)}€ réalisés, ${Math.round(weightedPipeline)}€ pipeline pondéré, ${dealCount} deal(s) gagnés. Coûts IA : ${Math.round(totalAiCost * 100) / 100}€. Score santé : ${healthScore}/100.`,
        generated_at: new Date().toISOString(),
      };
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }] };
    }
  }
);

// ===== TOOL #83: analyze_legal =====
mcpServer.registerTool(
  "analyze_legal",
  {
    description: "Analyse un document juridique (CGV, CDC, contrat) pour détecter clauses risquées, vérifier conformité RGPD et AI Act, suggérer corrections.",
    inputSchema: {
      document_type: z.enum(['cgv', 'cdc', 'contrat', 'mention_legale', 'politique_confidentialite']).describe("Type de document juridique"),
      specification_id: z.string().uuid().optional().describe("ID d'un CDC existant dans IArche"),
      content: z.string().optional().describe("Texte libre à analyser"),
      check_rgpd: z.boolean().optional().describe("Vérifier conformité RGPD (défaut true)"),
      check_ai_act: z.boolean().optional().describe("Vérifier conformité AI Act (défaut true)"),
    },
  },
  async (params: any) => {
    try {
      const { wsId } = getAuthContext()!;

      let documentContent = params.content || '';
      let documentTitle = params.document_type;

      if (params.specification_id) {
        const { data: spec } = await supabaseAdmin
          .from('specifications')
          .select('title, content, version, status')
          .eq('id', params.specification_id)
          .eq('workspace_id', wsId)
          .single();
        if (spec) {
          documentContent = typeof spec.content === 'string' ? spec.content : JSON.stringify(spec.content);
          documentTitle = spec.title;
        }
      }

      const LEGAL_CHECKS: Record<string, any> = {
        cgv: {
          required_clauses: [
            'Identification du vendeur (SIRET, adresse)', 'Prix et modalités de paiement',
            'Délais de livraison', 'Droit de rétractation (14 jours B2C)', 'Garanties légales',
            'Médiation et litiges', 'Droit applicable (droit français)'
          ],
          risk_patterns: [
            { pattern: 'responsabilité limitée', risk: 'medium', note: 'Vérifier plafond de responsabilité explicite' },
            { pattern: 'modification unilatérale', risk: 'high', note: 'Clause abusive possible en B2C' },
            { pattern: 'données personnelles', risk: 'high', note: 'Renvoi obligatoire vers politique RGPD' },
            { pattern: 'résiliation', risk: 'medium', note: 'Préavis minimum à préciser' }
          ]
        },
        cdc: {
          required_clauses: [
            'Contexte et objectifs du projet', 'Périmètre fonctionnel', 'Livrables attendus',
            'Délais et jalons', 'Budget et conditions de paiement', 'Propriété intellectuelle',
            'Confidentialité', 'Conditions de recette et validation'
          ],
          risk_patterns: [
            { pattern: 'propriété intellectuelle', risk: 'high', note: 'Cession de droits à préciser (auteur vs client)' },
            { pattern: 'sous-traitance', risk: 'medium', note: 'Mention Net It Be / partenaires à encadrer' },
            { pattern: 'garantie', risk: 'medium', note: 'Durée et périmètre de garantie à définir' },
            { pattern: 'forfait', risk: 'high', note: 'Définir précisément ce qui est hors forfait' }
          ]
        },
        contrat: {
          required_clauses: [
            'Identité des parties', 'Objet du contrat', 'Durée et renouvellement',
            'Prix et révision tarifaire', 'Obligations de chaque partie', 'Confidentialité (NDA)',
            'Propriété intellectuelle', 'Résiliation et conséquences', 'Force majeure',
            'Attribution de juridiction'
          ],
          risk_patterns: [
            { pattern: 'tacite reconduction', risk: 'medium', note: 'Préavis de résiliation à encadrer' },
            { pattern: 'exclusivité', risk: 'high', note: 'Clause à négocier — impact sur autres clients' },
            { pattern: 'pénalités', risk: 'medium', note: 'Plafond de pénalités à fixer' },
            { pattern: 'cession', risk: 'high', note: 'Cession du contrat à des tiers — accord préalable requis' }
          ]
        },
        mention_legale: {
          required_clauses: [
            "Identité de l'éditeur (SIRET, forme juridique)", 'Directeur de publication',
            'Hébergeur (nom, adresse, contact)', 'Propriété intellectuelle du contenu',
            'Cookies et traceurs', 'Contact pour exercice des droits RGPD'
          ],
          risk_patterns: [
            { pattern: 'cookies', risk: 'high', note: 'Consentement explicite requis (CNIL)' },
            { pattern: 'analytics', risk: 'medium', note: 'Google Analytics → vérifier conformité CNIL' }
          ]
        },
        politique_confidentialite: {
          required_clauses: [
            'Identité du responsable de traitement', 'Données collectées et finalités',
            'Base légale de chaque traitement', 'Durée de conservation', 'Destinataires des données',
            'Transferts hors UE', 'Droits des personnes (accès, rectification, suppression)',
            'Contact DPO ou référent RGPD', 'Cookies et traceurs'
          ],
          risk_patterns: [
            { pattern: 'ia', risk: 'high', note: 'AI Act : mention obligatoire si traitement IA décisionnel' },
            { pattern: 'tiers', risk: 'medium', note: 'Lister les sous-traitants (Supabase, Anthropic, OpenRouter)' },
            { pattern: 'profilage', risk: 'high', note: "Profilage automatisé → consentement explicite + droit d'opposition" },
            { pattern: 'etats-unis', risk: 'high', note: 'Transfert USA → vérifier Standard Contractual Clauses' }
          ]
        }
      };

      const checks = LEGAL_CHECKS[params.document_type] || LEGAL_CHECKS.contrat;
      const contentLower = documentContent.toLowerCase();

      const clauseAnalysis = checks.required_clauses.map((clause: string) => {
        const keywords = clause.toLowerCase().split(' ').filter((w: string) => w.length > 4);
        const present = keywords.some((kw: string) => contentLower.includes(kw));
        return {
          clause,
          status: present ? 'present' : documentContent.length > 100 ? 'missing' : 'unknown',
          note: !present && documentContent.length > 100 ? 'À ajouter' : null
        };
      });

      const riskFindings = checks.risk_patterns
        .filter((rp: any) => contentLower.includes(rp.pattern.toLowerCase()))
        .map((rp: any) => ({ pattern: rp.pattern, risk_level: rp.risk, recommendation: rp.note }));

      const rgpdChecks = params.check_rgpd !== false ? [
        { check: 'Mention responsable de traitement', compliant: contentLower.includes('responsable') || contentLower.includes('traitement') },
        { check: 'Base légale explicite', compliant: contentLower.includes('base légale') || contentLower.includes('consentement') || contentLower.includes('intérêt légitime') },
        { check: 'Droits des personnes', compliant: contentLower.includes('droit') && (contentLower.includes('accès') || contentLower.includes('rectification')) },
        { check: 'Durée de conservation', compliant: contentLower.includes('conservation') || contentLower.includes('durée') },
        { check: 'Contact RGPD', compliant: contentLower.includes('rgpd') || contentLower.includes('cnil') || contentLower.includes('dpo') }
      ] : [];

      const aiActChecks = params.check_ai_act !== false ? [
        { check: 'Mention système IA', compliant: contentLower.includes('intelligence artificielle') || contentLower.includes('ia') || contentLower.includes('algorithme') },
        { check: 'Transparence IA', compliant: contentLower.includes('automatisé') || contentLower.includes('décision automatique') },
        { check: "Droit à l'explication", compliant: contentLower.includes('explication') || contentLower.includes('contestation') },
        { check: 'Niveau de risque IA déclaré', compliant: contentLower.includes('risque') && contentLower.includes('ia') }
      ] : [];

      const totalChecks = clauseAnalysis.length + rgpdChecks.length + aiActChecks.length;
      const passedChecks =
        clauseAnalysis.filter((c: any) => c.status === 'present').length +
        rgpdChecks.filter((c: any) => c.compliant).length +
        aiActChecks.filter((c: any) => c.compliant).length;

      const complianceScore = documentContent.length > 100 ? Math.round((passedChecks / totalChecks) * 100) : null;
      const missingClauses = clauseAnalysis.filter((c: any) => c.status === 'missing');
      const highRisks = riskFindings.filter((r: any) => r.risk_level === 'high');

      const result = {
        document: { type: params.document_type, title: documentTitle, analyzed: documentContent.length > 100, content_length: documentContent.length },
        compliance_score: complianceScore,
        compliance_label: complianceScore === null ? 'Document non fourni — analyse structurelle uniquement'
          : complianceScore >= 80 ? '🟢 Conforme'
          : complianceScore >= 50 ? '🟡 Partiellement conforme'
          : '🔴 Non conforme',
        required_clauses: clauseAnalysis,
        risk_findings: riskFindings,
        rgpd_checks: rgpdChecks,
        ai_act_checks: aiActChecks,
        summary: {
          missing_clauses_count: missingClauses.length,
          high_risk_count: highRisks.length,
          missing_clauses: missingClauses.map((c: any) => c.clause),
          high_risks: highRisks.map((r: any) => r.pattern)
        },
        recommendations: [
          ...missingClauses.slice(0, 3).map((c: any) => `Ajouter : ${c.clause}`),
          ...highRisks.map((r: any) => `⚠️ Risque ${r.risk_level} : ${r.recommendation}`)
        ],
        note: 'Analyse indicative — non substituable à un avis juridique professionnel.',
        generated_at: new Date().toISOString()
      };
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }] };
    }
  }
);

// ===== TOOL #84: get_partner_report =====
mcpServer.registerTool(
  "get_partner_report",
  {
    description: "Rapport d'activité partenaires. Analyse deals apportés, commissions estimées et rentabilité par partenaire.",
    inputSchema: {
      partner_id: z.string().uuid().optional().describe("Rapport pour 1 partenaire spécifique"),
      period_days: z.number().optional().describe("Fenêtre d'analyse en jours (défaut 90)"),
    },
  },
  async (params: any) => {
    try {
      const { wsId } = getAuthContext()!;
      const since = new Date(Date.now() - (params.period_days || 90) * 24 * 60 * 60 * 1000).toISOString();

      const [partners, leads, opportunities] = await Promise.all([
        supabaseAdmin.from('partners')
          .select('id, name, company, email, status, commission_rate, created_at, updated_at')
          .eq('workspace_id', wsId).eq('status', 'active'),
        supabaseAdmin.from('leads')
          .select('id, name, company, source, partner_id, lead_score, status, created_at')
          .eq('workspace_id', wsId).gte('created_at', since).not('partner_id', 'is', null),
        supabaseAdmin.from('opportunities')
          .select('id, title, value_amount, stage, probability, partner_id, closed_at, created_at')
          .eq('workspace_id', wsId).gte('created_at', since).not('partner_id', 'is', null)
      ]);

      const partnerStats = new Map<string, any>();
      (partners.data || []).forEach((p: any) => {
        partnerStats.set(p.id, {
          id: p.id, name: p.name, company: p.company, commission_rate: p.commission_rate || 10,
          leads_referred: 0, opportunities_count: 0, revenue_won: 0, revenue_pipeline: 0,
          commission_earned: 0, commission_pipeline: 0, last_activity: p.updated_at, deals: []
        });
      });

      (leads.data || []).forEach((l: any) => {
        if (partnerStats.has(l.partner_id)) partnerStats.get(l.partner_id).leads_referred++;
      });

      (opportunities.data || []).forEach((o: any) => {
        if (!partnerStats.has(o.partner_id)) return;
        const ps = partnerStats.get(o.partner_id);
        ps.opportunities_count++;
        if (o.stage === 'closed_won') {
          ps.revenue_won += o.value_amount || 0;
          ps.commission_earned += (o.value_amount || 0) * (ps.commission_rate / 100);
        } else if (o.stage !== 'lost') {
          ps.revenue_pipeline += (o.value_amount || 0) * ((o.probability || 50) / 100);
          ps.commission_pipeline += (o.value_amount || 0) * ((o.probability || 50) / 100) * (ps.commission_rate / 100);
        }
        ps.deals.push({ title: o.title, stage: o.stage, value: o.value_amount || 0, probability: o.probability });
      });

      let reportData = Array.from(partnerStats.values());
      if (params.partner_id) reportData = reportData.filter((p: any) => p.id === params.partner_id);
      reportData.sort((a: any, b: any) => b.revenue_won - a.revenue_won);

      const totals = {
        partners_count: reportData.length,
        total_leads_referred: reportData.reduce((s: number, p: any) => s + p.leads_referred, 0),
        total_revenue_won: Math.round(reportData.reduce((s: number, p: any) => s + p.revenue_won, 0)),
        total_commission_due: Math.round(reportData.reduce((s: number, p: any) => s + p.commission_earned, 0)),
        total_pipeline: Math.round(reportData.reduce((s: number, p: any) => s + p.revenue_pipeline, 0))
      };

      const inactiveThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const inactivePartners = reportData.filter((p: any) => new Date(p.last_activity) < inactiveThreshold && p.leads_referred === 0);

      const result = {
        period_days: params.period_days || 90,
        totals,
        partners: reportData.map((p: any) => ({
          ...p,
          commission_earned: Math.round(p.commission_earned),
          commission_pipeline: Math.round(p.commission_pipeline),
          revenue_won: Math.round(p.revenue_won),
          revenue_pipeline: Math.round(p.revenue_pipeline),
          performance: p.leads_referred === 0 ? 'inactive' : p.revenue_won > 0 ? 'converting' : 'prospecting'
        })),
        inactive_partners: inactivePartners.map((p: any) => p.name),
        recommendations: [
          ...inactivePartners.slice(0, 2).map((p: any) => `Relancer ${p.name} — aucune activité depuis 30j`),
          totals.total_commission_due > 0 ? `💶 ${totals.total_commission_due}€ de commissions à verser` : 'Aucune commission due sur la période'
        ],
        generated_at: new Date().toISOString()
      };
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }] };
    }
  }
);

// ===== TOOL #85: save_preference =====
mcpServer.registerTool(
  "save_preference",
  {
    description: "Mémorise une préférence ou information dans ai_agent_memory pour personnaliser les réponses futures. Ex: style communication, priorités, contexte perso.",
    inputSchema: {
      key: z.string().describe("Clé de la préférence (ex: 'tone', 'priority_sector')"),
      value: z.string().describe("Valeur de la préférence"),
      category: z.string().optional().describe("Catégorie: communication, business, personal, technical"),
      ttl_days: z.number().optional().describe("Durée de vie en jours (null = permanent)"),
    },
  },
  async (params: any) => {
    try {
      const { wsId } = getAuthContext()!;
      const memoryContent = `preference:${params.key} = ${params.value}`;
      const expiresAt = params.ttl_days
        ? new Date(Date.now() + params.ttl_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Check for existing preference with same key
      const { data: existing } = await supabaseAdmin
        .from('ai_agent_memory')
        .select('id, content')
        .eq('workspace_id', wsId)
        .eq('memory_type', 'preference')
        .ilike('content', `preference:${params.key} =%`)
        .limit(1);

      let action = 'created';
      let previousValue: string | null = null;

      if (existing?.length) {
        previousValue = existing[0].content.replace(`preference:${params.key} = `, '');
        await supabaseAdmin
          .from('ai_agent_memory')
          .update({
            content: memoryContent,
            category: params.category || 'general',
            importance_score: 0.85,
            expires_at: expiresAt,
            metadata: { key: params.key, category: params.category || 'general' },
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing[0].id);
        action = 'updated';
      } else {
        await supabaseAdmin
          .from('ai_agent_memory')
          .insert({
            workspace_id: wsId,
            content: memoryContent,
            memory_type: 'preference',
            category: params.category || 'general',
            importance_score: 0.85,
            expires_at: expiresAt,
            metadata: { key: params.key, category: params.category || 'general' },
          });
        action = 'created';
      }

      const result = {
        status: 'saved',
        action,
        key: params.key,
        value: params.value,
        category: params.category || 'general',
        expires_at: expiresAt,
        previous_value: previousValue,
        message: `Préférence "${params.key}" mémorisée${expiresAt ? ` jusqu'au ${expiresAt.slice(0, 10)}` : ' de façon permanente'}.`,
        generated_at: new Date().toISOString()
      };
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }] };
    }
  }
);


// ============================================================
// TOOL: create_form
// ============================================================
mcpServer.registerTool(
  "create_form",
  {
    title: "Create Form",
    description: "Créer un nouveau formulaire ALMA. Le slug est auto-généré depuis le titre si non fourni.",
    inputSchema: {
      title: z.string().describe("Titre du formulaire"),
      description: z.string().optional().describe("Description du formulaire"),
      slug: z.string().optional().describe("Slug personnalisé (auto-généré si absent)"),
      fields: z.string().optional().describe("JSON string des champs du formulaire"),
      settings: z.string().optional().describe("JSON string des paramètres"),
      is_active: z.boolean().optional().describe("Formulaire actif (défaut: true)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const slug = params.slug || params.title.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const insertData: Record<string, unknown> = {
      title: params.title,
      slug,
      description: params.description || null,
      is_active: params.is_active !== undefined ? params.is_active : true,
    };
    if (params.fields) insertData.fields = JSON.parse(params.fields);
    if (params.settings) insertData.settings = JSON.parse(params.settings);

    const { data, error } = await supabaseAdmin.from("forms").insert(insertData)
      .select("id, title, slug, is_active, created_at").single();

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, form: data }) }] };
  }
);

// ============================================================
// TOOL: get_forms
// ============================================================
mcpServer.registerTool(
  "get_forms",
  {
    title: "Get Forms",
    description: "Lister les formulaires ALMA avec leurs statistiques.",
    inputSchema: {
      is_active: z.boolean().optional().describe("Filtrer par statut actif/inactif"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin.from("forms")
      .select("id, title, slug, description, is_active, submissions_count, views_count, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (params.is_active !== undefined) query = query.eq("is_active", params.is_active);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ forms: data, count: data?.length }) }] };
  }
);

// ============================================================
// TOOL: get_document_detail
// ============================================================
mcpServer.registerTool(
  "get_document_detail",
  {
    title: "Get Document Detail",
    description: "Lecture complète d'un document généré, incluant le content_json (sections, metadata, modules). Indispensable pour éditer un programme invitation.",
    inputSchema: {
      document_id: z.string().describe("UUID du document"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const { data, error } = await supabaseAdmin
      .from("generated_documents")
      .select("id, title, document_type, status, version, content_json, article_id, lead_id, project_id, quote_number, created_at, updated_at")
      .eq("id", params.document_id)
      .eq("workspace_id", ctx.wsId)
      .single();

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ document: data }) }] };
  }
);

// ============================================================
// TOOL: update_document
// ============================================================
mcpServer.registerTool(
  "update_document",
  {
    title: "Update Document",
    description: "Modifier un document généré (titre, statut, content_json). Supporte le merge partiel : envoyer sections, metadata ou modules met à jour uniquement cette partie du content_json. Refuse la modification si status=approved.",
    inputSchema: {
      document_id: z.string().describe("UUID du document"),
      title: z.string().optional().describe("Nouveau titre"),
      status: z.string().optional().describe("Nouveau statut (draft, sent, approved, rejected)"),
      content_json: z.string().optional().describe("JSON complet du content_json (remplace tout)"),
      sections: z.string().optional().describe("JSON des sections — remplace content_json.sections uniquement"),
      metadata: z.string().optional().describe("JSON metadata — merge dans content_json.metadata"),
      modules: z.string().optional().describe("JSON modules — merge dans content_json.modules"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    // Fetch current document
    const { data: doc, error: fetchErr } = await supabaseAdmin
      .from("generated_documents")
      .select("id, status, content_json")
      .eq("id", params.document_id)
      .eq("workspace_id", ctx.wsId)
      .single();

    if (fetchErr || !doc) return { content: [{ type: "text" as const, text: `Erreur: ${fetchErr?.message || 'Document non trouvé'}` }] };

    if (doc.status === "approved" && params.status !== "draft") {
      return { content: [{ type: "text" as const, text: "Refusé : document approuvé. Passez d'abord le statut à 'draft' pour le modifier." }] };
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (params.title) updateData.title = params.title;
    if (params.status) updateData.status = params.status;

    // Handle content_json updates
    if (params.content_json) {
      // Full replace
      updateData.content_json = JSON.parse(params.content_json);
    } else if (params.sections || params.metadata || params.modules) {
      // Partial merge
      const current = (doc.content_json as Record<string, unknown>) || {};
      if (params.sections) current.sections = JSON.parse(params.sections);
      if (params.metadata) current.metadata = { ...(current.metadata as Record<string, unknown> || {}), ...JSON.parse(params.metadata) };
      if (params.modules) current.modules = { ...(current.modules as Record<string, unknown> || {}), ...JSON.parse(params.modules) };
      updateData.content_json = current;
    }

    const { error } = await supabaseAdmin
      .from("generated_documents")
      .update(updateData)
      .eq("id", params.document_id)
      .eq("workspace_id", ctx.wsId);

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, document_id: params.document_id }) }] };
  }
);

// ============================================================
// TOOL: update_form
// ============================================================
mcpServer.registerTool(
  "update_form",
  {
    title: "Update Form",
    description: "Modifier un formulaire ALMA existant (titre, champs, paramètres, activation, liaison atelier).",
    inputSchema: {
      form_id: z.string().describe("UUID du formulaire"),
      title: z.string().optional().describe("Nouveau titre"),
      description: z.string().optional().describe("Nouvelle description"),
      slug: z.string().optional().describe("Nouveau slug"),
      fields: z.string().optional().describe("JSON string des champs du formulaire"),
      settings: z.string().optional().describe("JSON string des paramètres"),
      is_active: z.boolean().optional().describe("Activer/désactiver le formulaire"),
      article_id: z.string().optional().describe("UUID de l'atelier à lier"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (params.title !== undefined) updateData.title = params.title;
    if (params.description !== undefined) updateData.description = params.description;
    if (params.slug !== undefined) updateData.slug = params.slug;
    if (params.is_active !== undefined) updateData.is_active = params.is_active;
    if (params.article_id !== undefined) updateData.article_id = params.article_id;
    if (params.fields) updateData.fields = JSON.parse(params.fields);
    if (params.settings) updateData.settings = JSON.parse(params.settings);

    const { data, error } = await supabaseAdmin
      .from("forms")
      .update(updateData)
      .eq("id", params.form_id)
      .select("id, title, slug, is_active, updated_at")
      .single();

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, form: data }) }] };
  }
);


// === Tools exposés via tools/list (les autres restent appelables via callTool) ===
const _EXPOSED_TOOLS = new Set([
  // CORE CRM
  'get_leads', 'get_lead_detail', 'create_lead', 'update_lead',
  'get_opportunities', 'upsert_opportunity',
  'get_activity_log', 'create_activity_note',
  'get_tasks', 'create_task', 'update_task',
  'get_contacts', 'get_lead_contacts', 'create_lead_contact',
  // INTELLIGENCE
  'analyze_pipeline', 'get_forecast', 'audit_crm_quality',
  'get_financial_report', 'simulate_pricing',
  'get_daily_intelligence', 'trigger_daily_intelligence',
  'get_sentinel_alerts', 'resolve_sentinel_alert', 'run_sentinel_analysis',
  'get_action_proposals', 'validate_action_proposal',
  // WORKFLOWS
  'run_workflow', 'run_consulte', 'generate_followup_email', 'lookup_company',
  // CONTENU
  'get_articles', 'create_article', 'update_article',
  'analyze_content_gaps', 'plan_editorial', 'generate_article', 'enrich_seo',
  'suggest_tags', 'generate_faq',
  // PARTENAIRES
  'get_partners', 'update_partner', 'get_partner_report',
  // PROSPECTION
  'search_viviers', 'promote_vivier',
  // PROJETS
  'get_projects', 'project_write', 'get_specifications', 'create_specification',
  'get_documents', 'create_document', 'get_document_detail', 'update_document',
  // LEGAL & FINANCE
  'analyze_legal',
  // BOOKINGS & INSCRIPTIONS
  'get_bookings', 'create_booking',
  'get_atelier_inscriptions',
  // FORMULAIRES
  'get_forms', 'create_form', 'update_form',
  // TRANSCRIPTIONS
  'get_transcriptions', 'get_transcription_detail', 'list_transcriptions', 'get_transcription',
  // PREFERENCES
  'save_preference',
]);

function _toolsList() {
  return _tools
    .filter(t => _EXPOSED_TOOLS.has(t.name))
    .map(t => ({ name: t.name, description: t.description, inputSchema: _toJsonSchema(t.inputSchema) }));
}

async function _callTool(name: string, args: any) {
  const tool = _tools.find(t => t.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found. ${_tools.length} tools available.`);
  return await tool.handler(args || {});
}

const app = new Hono().basePath('/mcp-server');

app.options("/*", (c) => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type, accept",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    },
  });
});

const OWNER_WORKSPACE_ID = Deno.env.get("OWNER_WORKSPACE_ID") || "00000000-0000-0000-0000-000000000001";

// Health check — avoids 406 on GET
app.get("/*", (c) => c.json({ status: 'ok', tools: _toolsList().length, tools_internal: _tools.length, server: 'iarche-crm', version: '2.0.0' }));

// MCP JSON-RPC handler — auth required only for tools/call
// Discovery methods (initialize, notifications/initialized, tools/list) are public
// per MCP spec to allow clients (e.g. Claude.ai) to handshake before presenting credentials.
const PUBLIC_MCP_METHODS = new Set(['initialize', 'notifications/initialized', 'tools/list']);

app.post("/*", async (c) => {
  // === Parse body FIRST so we can route auth based on method ===
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
  }

  const { method, params, id } = body;

  // === AUTH GATE: only enforce on tools/call (sensitive ops) ===
  let requestAuth: { workspace_id: string; user_id?: string } | null = null;
  if (!PUBLIC_MCP_METHODS.has(method)) {
    const auth = await authenticateMcpKey(c.req.raw);
    if (!auth.valid) {
      return c.json(
        { jsonrpc: '2.0', id: id ?? null, error: { code: -32001, message: 'Invalid or missing MCP API key. Provide header: Authorization: Bearer iarche_mcp_*' } },
        401
      );
    }
    requestAuth = { workspace_id: auth.workspace_id!, user_id: auth.user_id };
    // Defensive fallback (legacy) — primary auth comes from AsyncLocalStorage below
    (globalThis as any).__mcpAuth = requestAuth;
  }

  try {
    if (method === 'initialize') {
      return c.json({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'iarche-crm', version: '2.0.0' },
        },
      });
    }

    if (method === 'notifications/initialized') {
      return c.json({ jsonrpc: '2.0', id: id ?? null, result: {} });
    }

    if (method === 'tools/list') {
      return c.json({ jsonrpc: '2.0', id, result: { tools: _toolsList() } });
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params || {};
      const startedAt = Date.now();
      try {
        const result = await authStore.run(requestAuth!, () => _callTool(name, args));
        _supabase.from('mcp_request_logs').insert({
          workspace_id: requestAuth!.workspace_id,
          tool_name: name,
          status: 'ok',
          duration_ms: Date.now() - startedAt,
        }).then(() => {}, () => {});
        return c.json({ jsonrpc: '2.0', id, result });
      } catch (toolErr: any) {
        _supabase.from('mcp_request_logs').insert({
          workspace_id: requestAuth!.workspace_id,
          tool_name: name,
          status: 'error',
          error_code: -32603,
          error_message: String(toolErr?.message || toolErr).slice(0, 500),
          duration_ms: Date.now() - startedAt,
        }).then(() => {}, () => {});
        throw toolErr;
      }
    }

    return c.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method "${method}" not supported` } });
  } catch (err: any) {
    console.error('[MCP Error]', method, err.message);
    return c.json({ jsonrpc: '2.0', id, error: { code: -32603, message: err.message } });
  }
});

Deno.serve(app.fetch);
