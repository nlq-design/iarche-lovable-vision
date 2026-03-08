/**
 * MCP Server Edge Function — IArche CRM (74 tools)
 *
 * Exposes 74 MCP tools via official @modelcontextprotocol/sdk.
 * Auth: Custom MCP API key (Bearer iarche_mcp_...) on tool calls.
 * Initialize/discovery requests pass without auth (MCP spec requirement).
 * All queries use service_role scoped by workspace_id from key.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { McpServer } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/webStandardStreamableHttp.js'
import { Hono } from 'npm:hono@^4.9.7'
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from 'npm:zod@^3.25.0'

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

// === Helper to get auth context, returns error response if not authed ===
function getAuthContext(): { wsId: string; userId?: string } | null {
  const auth = (globalThis as any).__mcpAuth;
  if (!auth?.workspace_id) return null;
  return { wsId: auth.workspace_id, userId: auth.user_id };
}

function authError() {
  return { content: [{ type: "text" as const, text: "Auth error: no workspace. Provide a valid MCP API key." }] };
}

// === MCP Server setup ===
const mcpServer = new McpServer({
  name: "iarche-crm",
  version: "1.0.0",
});

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
      opportunity_id: params.opportunity_id || null,
      project_id: params.project_id || null,
      task_id: params.task_id || null,
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
      lead_id: z.string().optional().describe("Filtrer par lead lié (via booking)"),
      project_id: z.string().optional().describe("Filtrer par projet"),
      opportunity_id: z.string().optional().describe("Filtrer par opportunité"),
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
      partner_type: z.string().optional().describe("Filtrer par type (consultant, apporteur, revendeur)"),
      is_active: z.boolean().optional().describe("Filtrer par statut actif"),
      limit: z.number().optional().describe("Nombre max (défaut 20)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    let query = supabaseAdmin
      .from("partners")
      .select("id, name, email, company, partner_type, specialties, commission_rate, is_active, created_at")
      .eq("workspace_id", ctx.wsId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);

    if (params.partner_type) query = query.eq("partner_type", params.partner_type);
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
      partner_type: z.string().optional(),
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
      .select("id, name, email, company, partner_type, specialties, commission_rate, is_active, updated_at")
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
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const slug = params.slug || params.title.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const { data, error } = await supabaseAdmin.from("articles").insert({
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
    }).select("id, title, slug, resource_type, status, created_at").single();

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
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();

    const { article_id, ...fields } = params;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }

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

    const { data, error } = await supabaseAdmin
      .from("viviers")
      .select("status, cold_score")
      .eq("workspace_id", ctx.wsId);

    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };

    const rows = data || [];
    const scored = rows.filter((v: any) => v.cold_score != null);
    const stats = {
      total: rows.length,
      new_count: rows.filter((v: any) => v.status === "new").length,
      contacted_count: rows.filter((v: any) => v.status === "contacted").length,
      qualified_count: rows.filter((v: any) => v.status === "qualified").length,
      converted_count: rows.filter((v: any) => v.status === "converted" || v.status === "promoted").length,
      avg_score: scored.length > 0
        ? Math.round(scored.reduce((sum: number, v: any) => sum + (v.cold_score || 0), 0) / scored.length)
        : 0,
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
// TOOL 57: get_transcriptions
// ============================================================
mcpServer.registerTool(
  "get_transcriptions",
  {
    title: "Get Transcriptions",
    description: "Liste les transcriptions vocales du workspace.",
    inputSchema: {
      lead_id: z.string().uuid().optional().describe("Filtrer par lead"),
      project_id: z.string().uuid().optional().describe("Filtrer par projet"),
      status: z.string().optional().describe("Filtrer par statut (pending, completed, error)"),
      limit: z.number().optional().describe("Nombre max (défaut 20)"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    let query = supabaseAdmin
      .from("voice_transcriptions")
      .select("id, title, status, transcription_text, summary, lead_id, project_id, slug, created_at")
      .eq("workspace_id", ctx.wsId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 20);
    if (params.lead_id) query = query.eq("lead_id", params.lead_id);
    if (params.project_id) query = query.eq("project_id", params.project_id);
    if (params.status) query = query.eq("status", params.status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text" as const, text: `Erreur: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ transcriptions: data, count: data?.length || 0 }) }] };
  }
);

// ============================================================
// TOOL 58: get_transcription_detail
// ============================================================
mcpServer.registerTool(
  "get_transcription_detail",
  {
    title: "Get Transcription Detail",
    description: "Détail complet d'une transcription avec ses participants.",
    inputSchema: {
      transcription_id: z.string().uuid().describe("ID de la transcription"),
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
// TOOL 59: update_workspace_config
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
      .insert({ title: params.title, project_id: params.project_id, content: params.content || "", status: params.status || "draft", version: 1, workspace_id: ctx.wsId })
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
    const updates: Record<string, unknown> = { version: (current.version || 1) + 1 };
    if (params.title !== undefined) updates.title = params.title;
    if (params.content !== undefined) updates.content = params.content;
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
    description: "Interroger le copilote IA IArche : briefing, health-check, scoring pipeline, analyse, etc.",
    inputSchema: {
      prompt: z.string().describe("Question ou instruction pour le copilote"),
      mode: z.string().optional().describe("Mode: morning-brief, health-check, pipeline-analysis, lead-scoring, meeting-prep, weekly-review, risk-alert, task-prioritization, opportunity-coach, project-health"),
    },
  },
  async (params) => {
    const ctx = getAuthContext();
    if (!ctx) return authError();
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/cockpit-ai-copilot`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ workspaceId: ctx.wsId, prompt: params.prompt, mode: params.mode || "health-check", context: { source: "mcp" } }),
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

// === Hono app ===
const app = new Hono().basePath('/mcp-server');

// CORS preflight
app.options("/*", (c) => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type, accept",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    },
  });
});

// All MCP requests — no auth required (Claude.ai doesn't send headers for custom MCP)
// Security: workspace scoped to owner's fixed workspace_id
const OWNER_WORKSPACE_ID = Deno.env.get("OWNER_WORKSPACE_ID") || "00000000-0000-0000-0000-000000000001";

app.all("/*", async (c) => {
  // Inject fixed workspace context for all requests
  (globalThis as any).__mcpAuth = {
    workspace_id: OWNER_WORKSPACE_ID,
    user_id: null,
  };

  // Create a fresh transport per request (stateless, edge-compatible)
  const transport = new WebStandardStreamableHTTPServerTransport();
  await mcpServer.connect(transport);
  return transport.handleRequest(c.req.raw);
});

Deno.serve(app.fetch);
