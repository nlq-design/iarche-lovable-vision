/**
 * Cockpit AI Copilot - Proactive commercial intelligence
 * 
 * Modes:
 *   - suggest-tasks: Generate contextual task suggestions based on entity state
 *   - detect-inactivity: Find stale leads/opportunities/projects
 *   - health-check: Evaluate project health and generate alerts
 *   - morning-brief: Daily digest of priorities and risks
 *   - next-step: Suggest optimal next action for an opportunity stage
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractStructured, callLLM } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FUNCTION_NAME = "cockpit-ai-copilot";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const token = authHeader?.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { mode, workspaceId, entityType, entityId } = body;

    if (!mode) {
      return new Response(JSON.stringify({ error: "Mode requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: unknown;

    switch (mode) {
      case "suggest-tasks":
        result = await suggestTasks(supabase, workspaceId, entityType, entityId);
        break;
      case "detect-inactivity":
        result = await detectInactivity(supabase, workspaceId);
        break;
      case "health-check":
        result = await healthCheckProjects(supabase, workspaceId);
        break;
      case "morning-brief":
        result = await morningBrief(supabase, workspaceId);
        break;
      case "next-step":
        result = await suggestNextStep(supabase, entityId);
        break;
      default:
        return new Response(JSON.stringify({ error: `Mode inconnu: ${mode}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] Error:`, error);
    
    // Forward rate limit / quota errors
    if (error?.status === 429 || error?.message?.includes("429")) {
      return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (error?.status === 402 || error?.message?.includes("402")) {
      return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: error?.message || "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// =============================================================================
// MODE 1: SUGGEST TASKS
// =============================================================================

async function suggestTasks(supabase: any, workspaceId: string, entityType?: string, entityId?: string) {
  // Collect context about the entity
  let context = "";

  if (entityType && entityId) {
    context = await collectEntityContext(supabase, entityType, entityId);
  } else {
    // Global context: recent activity, pending tasks, pipeline state
    context = await collectGlobalContext(supabase, workspaceId);
  }

  const suggestions = await extractStructured<{
    suggestions: Array<{
      title: string;
      description: string;
      priority: string;
      task_type: string;
      due_in_days: number;
      entity_type?: string;
      entity_id?: string;
      reasoning: string;
    }>;
  }>(
    [
      {
        role: "system",
        content: `Tu es un assistant commercial expert en gestion de pipeline B2B. 
Analyse le contexte fourni et suggère 3 à 5 tâches concrètes et actionnables.
Chaque tâche doit être spécifique, pas générique. Utilise les noms des contacts et entités.
Priorité: urgent (action immédiate), high (cette semaine), medium (sous 10 jours), low (planification).
Types: follow_up, call, email, meeting, proposal, other.
Réponds en français.`,
      },
      { role: "user", content: `Contexte commercial:\n${context}` },
    ],
    {
      name: "suggest_tasks",
      description: "Suggérer des tâches commerciales actionnables",
      parameters: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Titre court de la tâche" },
                description: { type: "string", description: "Description détaillée" },
                priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                task_type: { type: "string", enum: ["follow_up", "call", "email", "meeting", "proposal", "other"] },
                due_in_days: { type: "number", description: "Nombre de jours avant échéance" },
                entity_type: { type: "string", description: "Type d'entité liée" },
                entity_id: { type: "string", description: "ID de l'entité liée" },
                reasoning: { type: "string", description: "Justification de la suggestion" },
              },
              required: ["title", "description", "priority", "task_type", "due_in_days", "reasoning"],
              additionalProperties: false,
            },
          },
        },
        required: ["suggestions"],
        additionalProperties: false,
      },
    },
    { functionName: FUNCTION_NAME, workspaceId }
  );

  return { suggestions: suggestions?.suggestions || [] };
}

// =============================================================================
// MODE 2: DETECT INACTIVITY
// =============================================================================

async function detectInactivity(supabase: any, workspaceId: string) {
  const thresholds = { lead: 7, opportunity: 5, project: 10 };
  const alerts: Array<{ entity_type: string; entity_id: string; entity_name: string; days_inactive: number; last_activity: string; severity: string; suggestion: string }> = [];

  // Check leads without recent activity
  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, company, updated_at")
    .eq("workspace_id", workspaceId)
    .neq("status", "converted")
    .neq("status", "lost")
    .order("updated_at", { ascending: true })
    .limit(50);

  for (const lead of leads || []) {
    const daysSince = daysBetween(lead.updated_at);
    if (daysSince >= thresholds.lead) {
      // Check if there are recent tasks
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("entity_type", "lead")
        .eq("entity_id", lead.id)
        .neq("status", "completed")
        .neq("status", "cancelled");

      alerts.push({
        entity_type: "lead",
        entity_id: lead.id,
        entity_name: lead.name || lead.company || "Sans nom",
        days_inactive: daysSince,
        last_activity: lead.updated_at,
        severity: daysSince > 14 ? "high" : "medium",
        suggestion: (count || 0) === 0
          ? "Aucune tâche active. Créer une relance."
          : `${count} tâche(s) en cours mais aucune interaction depuis ${daysSince}j.`,
      });
    }
  }

  // Check opportunities stagnating in same stage
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, title, stage, updated_at, leads:lead_id(name)")
    .eq("workspace_id", workspaceId)
    .not("stage", "in", "(closed_won,closed_lost)")
    .order("updated_at", { ascending: true })
    .limit(50);

  for (const opp of opportunities || []) {
    const daysSince = daysBetween(opp.updated_at);
    if (daysSince >= thresholds.opportunity) {
      alerts.push({
        entity_type: "opportunity",
        entity_id: opp.id,
        entity_name: opp.title || opp.leads?.name || "Opportunité",
        days_inactive: daysSince,
        last_activity: opp.updated_at,
        severity: daysSince > 10 ? "high" : "medium",
        suggestion: `Stagnation en stage "${opp.stage}" depuis ${daysSince}j. Envisager un passage au stage suivant ou une relance.`,
      });
    }
  }

  // Check active projects without recent activity
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, health_status, updated_at")
    .eq("workspace_id", workspaceId)
    .in("status", ["active", "planning"])
    .order("updated_at", { ascending: true })
    .limit(50);

  for (const proj of projects || []) {
    const daysSince = daysBetween(proj.updated_at);
    if (daysSince >= thresholds.project) {
      alerts.push({
        entity_type: "project",
        entity_id: proj.id,
        entity_name: proj.name,
        days_inactive: daysSince,
        last_activity: proj.updated_at,
        severity: daysSince > 20 ? "high" : "medium",
        suggestion: `Projet "${proj.name}" inactif depuis ${daysSince}j. Vérifier l'avancement.`,
      });
    }
  }

  // Sort by severity then days_inactive
  alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    return b.days_inactive - a.days_inactive;
  });

  return { alerts, total: alerts.length };
}

// =============================================================================
// MODE 3: HEALTH CHECK PROJECTS
// =============================================================================

async function healthCheckProjects(supabase: any, workspaceId: string) {
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("status", ["active", "planning"]);

  const checks: Array<{
    project_id: string;
    project_name: string;
    current_health: string;
    computed_health: string;
    risk_factors: string[];
    budget_status: { consumed_pct: number; status: string };
    task_status: { total: number; overdue: number; completed: number };
    days_since_activity: number;
  }> = [];

  for (const project of projects || []) {
    // Get task stats
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, status, due_date")
      .eq("project_id", project.id);

    const today = new Date().toISOString().split("T")[0];
    const totalTasks = tasks?.length || 0;
    const overdueTasks = tasks?.filter((t: any) => t.due_date && t.due_date < today && t.status !== "completed" && t.status !== "cancelled").length || 0;
    const completedTasks = tasks?.filter((t: any) => t.status === "completed").length || 0;

    // Budget analysis
    const budget = Number(project.budget_amount) || 0;
    const consumed = Number(project.consumed_amount) || 0;
    const consumedPct = budget > 0 ? Math.round((consumed / budget) * 100) : 0;

    // Compute risk factors
    const riskFactors: string[] = [];
    const daysSinceActivity = daysBetween(project.updated_at);

    if (overdueTasks > 0) riskFactors.push(`${overdueTasks} tâche(s) en retard`);
    if (consumedPct > 80) riskFactors.push(`Budget consommé à ${consumedPct}%`);
    if (daysSinceActivity > 7) riskFactors.push(`Aucune activité depuis ${daysSinceActivity}j`);
    if (project.planned_end_date && project.planned_end_date < today && project.status !== "completed") {
      riskFactors.push("Date de fin dépassée");
    }
    if (totalTasks === 0) riskFactors.push("Aucune tâche définie");

    // Compute health
    let computedHealth = "on_track";
    if (riskFactors.length >= 3 || overdueTasks > 3 || consumedPct > 100) {
      computedHealth = "off_track";
    } else if (riskFactors.length >= 1) {
      computedHealth = "at_risk";
    }

    // Auto-update health_status if changed
    if (computedHealth !== project.health_status) {
      await supabase
        .from("projects")
        .update({ health_status: computedHealth })
        .eq("id", project.id);
    }

    checks.push({
      project_id: project.id,
      project_name: project.name,
      current_health: project.health_status || "unknown",
      computed_health: computedHealth,
      risk_factors: riskFactors,
      budget_status: { consumed_pct: consumedPct, status: consumedPct > 90 ? "critical" : consumedPct > 70 ? "warning" : "ok" },
      task_status: { total: totalTasks, overdue: overdueTasks, completed: completedTasks },
      days_since_activity: daysSinceActivity,
    });
  }

  // Sort: off_track first
  checks.sort((a, b) => {
    const order = { off_track: 0, at_risk: 1, on_track: 2, unknown: 3 };
    return (order[a.computed_health as keyof typeof order] ?? 3) - (order[b.computed_health as keyof typeof order] ?? 3);
  });

  return {
    projects: checks,
    summary: {
      total: checks.length,
      on_track: checks.filter((c) => c.computed_health === "on_track").length,
      at_risk: checks.filter((c) => c.computed_health === "at_risk").length,
      off_track: checks.filter((c) => c.computed_health === "off_track").length,
    },
  };
}

// =============================================================================
// MODE 4: MORNING BRIEF
// =============================================================================

async function morningBrief(supabase: any, workspaceId: string) {
  const today = new Date().toISOString().split("T")[0];

  // Parallel data collection
  const [
    { data: todayTasks },
    { data: overdueTasks },
    { data: todayBookings },
    { data: recentActivity },
    inactivityResult,
    healthResult,
  ] = await Promise.all([
    // Today's tasks
    supabase
      .from("tasks")
      .select("id, title, priority, entity_type, entity_id, due_time")
      .eq("workspace_id", workspaceId)
      .eq("due_date", today)
      .neq("status", "completed")
      .neq("status", "cancelled")
      .order("due_time", { ascending: true, nullsFirst: false }),

    // Overdue tasks
    supabase
      .from("tasks")
      .select("id, title, priority, due_date, entity_type")
      .eq("workspace_id", workspaceId)
      .lt("due_date", today)
      .neq("status", "completed")
      .neq("status", "cancelled")
      .order("due_date", { ascending: true }),

    // Today's bookings
    supabase
      .from("bookings")
      .select("id, name, email, company, start_time, end_time, booking_types:booking_type_id(name)")
      .eq("workspace_id", workspaceId)
      .gte("start_time", `${today}T00:00:00`)
      .lte("start_time", `${today}T23:59:59`)
      .eq("status", "confirmed")
      .order("start_time"),

    // Last 24h activity
    supabase
      .from("activity_log")
      .select("activity_type, entity_type, title, created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", new Date(Date.now() - 86400000).toISOString())
      .order("created_at", { ascending: false })
      .limit(20),

    // Inactivity detection
    detectInactivity(supabase, workspaceId),

    // Health checks
    healthCheckProjects(supabase, workspaceId),
  ]);

  // Build AI brief context
  const briefContext = `
## Données du jour (${today})

### Tâches du jour (${todayTasks?.length || 0})
${todayTasks?.map((t: any) => `- [${t.priority}] ${t.title}${t.due_time ? ` à ${t.due_time}` : ""}`).join("\n") || "Aucune"}

### Tâches en retard (${overdueTasks?.length || 0})
${overdueTasks?.map((t: any) => `- [${t.priority}] ${t.title} (échéance: ${t.due_date})`).join("\n") || "Aucune"}

### Rendez-vous du jour (${todayBookings?.length || 0})
${todayBookings?.map((b: any) => `- ${new Date(b.start_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} : ${b.name} (${b.company || b.email})`).join("\n") || "Aucun"}

### Alertes d'inactivité (${inactivityResult.total})
${inactivityResult.alerts.slice(0, 5).map((a: any) => `- [${a.severity}] ${a.entity_type}: "${a.entity_name}" inactif depuis ${a.days_inactive}j`).join("\n") || "Aucune"}

### Santé des projets
${healthResult.projects.map((p: any) => `- ${p.project_name}: ${p.computed_health}${p.risk_factors.length > 0 ? ` (${p.risk_factors.join(", ")})` : ""}`).join("\n") || "Aucun projet actif"}

### Activité récente (24h)
${recentActivity?.map((a: any) => `- ${a.activity_type}: ${a.title || a.entity_type}`).join("\n") || "Aucune"}
`;

  const aiSummary = await callLLM(
    [
      {
        role: "system",
        content: `Tu es un assistant de direction commerciale. Génère un briefing matinal concis et actionnable.
Structure : 
1. 🎯 Priorités du jour (3 max)
2. ⚠️ Points d'attention (risques, retards)  
3. 💡 Recommandations (actions à fort impact)
Sois direct, utilise les noms des contacts/projets. Réponds en français. Max 300 mots.`,
      },
      { role: "user", content: briefContext },
    ],
    { functionName: FUNCTION_NAME, workspaceId }
  );

  return {
    brief: aiSummary,
    data: {
      today_tasks: todayTasks || [],
      overdue_tasks: overdueTasks || [],
      today_bookings: todayBookings || [],
      inactivity_alerts: inactivityResult.alerts.slice(0, 10),
      health_summary: healthResult.summary,
      project_checks: healthResult.projects,
    },
  };
}

// =============================================================================
// MODE 5: NEXT STEP SUGGESTION
// =============================================================================

async function suggestNextStep(supabase: any, entityId: string) {
  if (!entityId) {
    return { error: "entityId requis pour next-step" };
  }

  // Get opportunity with lead data
  const { data: opp } = await supabase
    .from("opportunities")
    .select(`
      *,
      leads:lead_id (id, name, email, company, phone, source, status)
    `)
    .eq("id", entityId)
    .single();

  if (!opp) return { error: "Opportunité introuvable" };

  // Get related tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, status, priority, due_date, task_type")
    .or(`entity_id.eq.${entityId},opportunity_id.eq.${entityId}`)
    .order("created_at", { ascending: false })
    .limit(10);

  // Get recent activity
  const { data: activity } = await supabase
    .from("activity_log")
    .select("activity_type, title, content, created_at")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(10);

  const context = `
Opportunité: ${opp.title || "Sans titre"}
Stage: ${opp.stage}
Valeur: ${opp.value_amount || 0}€
Probabilité: ${opp.probability || 0}%
Lead: ${opp.leads?.name || "?"} (${opp.leads?.company || "?"})
Source: ${opp.leads?.source || "?"}
Créée le: ${opp.created_at}
Dernière MàJ: ${opp.updated_at}

Tâches (${tasks?.length || 0}):
${tasks?.map((t: any) => `- [${t.status}/${t.priority}] ${t.title} (${t.task_type}, échéance: ${t.due_date || "aucune"})`).join("\n") || "Aucune"}

Historique (${activity?.length || 0}):
${activity?.map((a: any) => `- ${a.created_at}: ${a.activity_type} - ${a.title || a.content || ""}`).join("\n") || "Aucun"}
`;

  const suggestion = await extractStructured<{
    next_action: string;
    action_type: string;
    reasoning: string;
    suggested_stage: string | null;
    urgency: string;
    talking_points: string[];
  }>(
    [
      {
        role: "system",
        content: `Tu es un expert en vente B2B. Analyse l'état de cette opportunité et recommande la meilleure prochaine action.
Pipeline: lead → r1 → r2 → pause/closed_won/closed_lost.
Sois spécifique et actionnable. Réponds en français.`,
      },
      { role: "user", content: context },
    ],
    {
      name: "suggest_next_step",
      description: "Recommander la prochaine étape commerciale",
      parameters: {
        type: "object",
        properties: {
          next_action: { type: "string", description: "Action recommandée (1 phrase)" },
          action_type: { type: "string", enum: ["call", "email", "meeting", "proposal", "follow_up", "close", "pause"] },
          reasoning: { type: "string", description: "Justification (2-3 phrases)" },
          suggested_stage: { type: "string", description: "Stage recommandé si changement, sinon null", nullable: true },
          urgency: { type: "string", enum: ["immediate", "this_week", "next_week"] },
          talking_points: { type: "array", items: { type: "string" }, description: "3 points clés à aborder" },
        },
        required: ["next_action", "action_type", "reasoning", "urgency", "talking_points"],
        additionalProperties: false,
      },
    },
    { functionName: FUNCTION_NAME, workspaceId: opp.workspace_id }
  );

  return { suggestion, opportunity: { id: opp.id, title: opp.title, stage: opp.stage } };
}

// =============================================================================
// HELPERS
// =============================================================================

function daysBetween(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

async function collectEntityContext(supabase: any, entityType: string, entityId: string): Promise<string> {
  const parts: string[] = [];

  // Entity data
  const tableMap: Record<string, string> = { lead: "leads", opportunity: "opportunities", project: "projects" };
  const table = tableMap[entityType];
  if (table) {
    const { data } = await supabase.from(table).select("*").eq("id", entityId).single();
    if (data) parts.push(`Entité (${entityType}): ${JSON.stringify(data, null, 2)}`);
  }

  // Recent tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, status, priority, due_date, task_type")
    .or(`entity_id.eq.${entityId},lead_id.eq.${entityId},opportunity_id.eq.${entityId},project_id.eq.${entityId}`)
    .order("created_at", { ascending: false })
    .limit(10);
  if (tasks?.length) parts.push(`Tâches:\n${tasks.map((t: any) => `- [${t.status}] ${t.title} (${t.priority}, échéance: ${t.due_date || "?"})`).join("\n")}`);

  // Recent activity
  const { data: activity } = await supabase
    .from("activity_log")
    .select("activity_type, title, content, created_at")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(15);
  if (activity?.length) parts.push(`Activité:\n${activity.map((a: any) => `- ${a.created_at?.slice(0, 10)}: ${a.activity_type} - ${a.title || ""}`).join("\n")}`);

  // Meeting notes
  const fkColumn = entityType === "lead" ? "lead_id" : entityType === "project" ? "project_id" : null;
  if (fkColumn) {
    const { data: notes } = await supabase
      .from("meeting_notes")
      .select("title, summary, meeting_date")
      .eq(fkColumn, entityId)
      .order("meeting_date", { ascending: false })
      .limit(5);
    if (notes?.length) parts.push(`Comptes-rendus:\n${notes.map((n: any) => `- ${n.meeting_date}: ${n.title} — ${n.summary?.slice(0, 100) || ""}`).join("\n")}`);
  }

  return parts.join("\n\n");
}

async function collectGlobalContext(supabase: any, workspaceId: string): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const parts: string[] = [];

  const [
    { data: pendingTasks },
    { data: activeOpps },
    { data: activeProjects },
    { data: recentActivity },
  ] = await Promise.all([
    supabase.from("tasks").select("title, status, priority, due_date, entity_type")
      .eq("workspace_id", workspaceId)
      .in("status", ["pending", "in_progress"])
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(20),
    supabase.from("opportunities").select("title, stage, value_amount, updated_at, leads:lead_id(name)")
      .eq("workspace_id", workspaceId)
      .not("stage", "in", "(closed_won,closed_lost)")
      .order("updated_at", { ascending: false })
      .limit(15),
    supabase.from("projects").select("name, status, health_status, budget_amount, consumed_amount")
      .eq("workspace_id", workspaceId)
      .in("status", ["active", "planning"])
      .limit(10),
    supabase.from("activity_log").select("activity_type, entity_type, title, created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  parts.push(`Date: ${today}`);
  parts.push(`Tâches en cours (${pendingTasks?.length || 0}):\n${pendingTasks?.map((t: any) => `- [${t.priority}] ${t.title} (${t.entity_type}, échéance: ${t.due_date || "?"})`).join("\n") || "Aucune"}`);
  parts.push(`Pipeline actif (${activeOpps?.length || 0}):\n${activeOpps?.map((o: any) => `- ${o.title || o.leads?.name || "?"} (${o.stage}, ${o.value_amount || 0}€)`).join("\n") || "Aucune"}`);
  parts.push(`Projets actifs (${activeProjects?.length || 0}):\n${activeProjects?.map((p: any) => `- ${p.name} [${p.health_status || "?"}] budget: ${p.consumed_amount || 0}/${p.budget_amount || 0}€`).join("\n") || "Aucun"}`);
  parts.push(`Activité récente (7j):\n${recentActivity?.map((a: any) => `- ${a.created_at?.slice(0, 10)}: ${a.activity_type} ${a.entity_type}`).join("\n") || "Aucune"}`);

  return parts.join("\n\n");
}
