/**
 * MCP Server Edge Function — IArche CRM
 * 
 * Exposes 37 MCP tools via official @modelcontextprotocol/sdk.
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
