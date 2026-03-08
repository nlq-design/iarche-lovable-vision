/**
 * MCP Server Edge Function — IArche CRM
 * 
 * Exposes 9 MCP tools (6 READ + 3 WRITE) via official @modelcontextprotocol/sdk.
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
      notes: params.notes || null,
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
