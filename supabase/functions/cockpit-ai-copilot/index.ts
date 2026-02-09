/**
 * Cockpit AI Copilot - Proactive commercial intelligence
 * 
 * Modes:
 *   - suggest-tasks: Generate contextual task suggestions based on entity state
 *   - detect-inactivity: Find stale leads/opportunities/projects
 *   - health-check: Evaluate project health and generate alerts
 *   - morning-brief: Daily digest of priorities and risks
 *   - next-step: Suggest optimal next action for an opportunity stage
 *   - meeting-prep: Pre-meeting briefing with context & talking points
 *   - opportunity-score: Predictive conversion scoring for pipeline
 *   - win-loss-analysis: Patterns from closed opportunities to improve pipeline
 *   - deadline-cascade: Impact analysis when project deadlines shift
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractStructured, callLLM } from "../_shared/ai-client.ts";
import { loadPrompt } from "../_shared/prompt-loader.ts";
import { buildMaxContext, formatContextSummary } from "../_shared/context-maximizer.ts";

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
      case "meeting-prep":
        result = await meetingPrep(supabase, entityId);
        break;
      case "opportunity-score":
        result = await opportunityScore(supabase, workspaceId);
        break;
      case "win-loss-analysis":
        result = await winLossAnalysis(supabase, workspaceId);
        break;
      case "deadline-cascade":
        result = await deadlineCascade(supabase, entityId);
        break;
      case "harvest":
        result = await harvestOverdueTasks(supabase, workspaceId, entityId);
        break;
      case "harvest-respond":
        result = await harvestRespond(supabase, workspaceId, body.taskIds, body.response, body.action);
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
  let context = "";
  if (entityType && entityId) {
    context = await collectEntityContext(supabase, entityType, entityId);
  } else {
    context = await collectGlobalContext(supabase, workspaceId);
  }

  const prompt = await loadPrompt(supabase, "copilot-suggest-tasks", {
    system_prompt: `Tu es un assistant commercial expert. Suggère 3-5 tâches actionnables. Réponds en français.`,
  });

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
      { role: "system", content: prompt.system_prompt },
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
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                task_type: { type: "string", enum: ["follow_up", "call", "email", "meeting", "proposal", "other"] },
                due_in_days: { type: "number" },
                entity_type: { type: "string" },
                entity_id: { type: "string" },
                reasoning: { type: "string" },
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

  const [{ data: leads }, { data: opportunities }, { data: projects }] = await Promise.all([
    supabase.from("leads").select("id, name, company, updated_at")
      .eq("workspace_id", workspaceId).neq("status", "converted").neq("status", "lost")
      .order("updated_at", { ascending: true }).limit(50),
    supabase.from("opportunities").select("id, title, stage, updated_at, leads:lead_id(name)")
      .eq("workspace_id", workspaceId).not("stage", "in", "(closed_won,closed_lost)")
      .order("updated_at", { ascending: true }).limit(50),
    supabase.from("projects").select("id, name, status, health_status, updated_at")
      .eq("workspace_id", workspaceId).in("status", ["active", "planning"])
      .order("updated_at", { ascending: true }).limit(50),
  ]);

  for (const lead of leads || []) {
    const daysSince = daysBetween(lead.updated_at);
    if (daysSince >= thresholds.lead) {
      const { count } = await supabase.from("tasks").select("id", { count: "exact", head: true })
        .eq("entity_type", "lead").eq("entity_id", lead.id).neq("status", "completed").neq("status", "cancelled");
      alerts.push({
        entity_type: "lead", entity_id: lead.id, entity_name: lead.name || lead.company || "Sans nom",
        days_inactive: daysSince, last_activity: lead.updated_at,
        severity: daysSince > 14 ? "high" : "medium",
        suggestion: (count || 0) === 0 ? "Aucune tâche active. Créer une relance." : `${count} tâche(s) en cours mais aucune interaction depuis ${daysSince}j.`,
      });
    }
  }

  for (const opp of opportunities || []) {
    const daysSince = daysBetween(opp.updated_at);
    if (daysSince >= thresholds.opportunity) {
      alerts.push({
        entity_type: "opportunity", entity_id: opp.id, entity_name: opp.title || opp.leads?.name || "Opportunité",
        days_inactive: daysSince, last_activity: opp.updated_at,
        severity: daysSince > 10 ? "high" : "medium",
        suggestion: `Stagnation en stage "${opp.stage}" depuis ${daysSince}j. Envisager un passage au stage suivant ou une relance.`,
      });
    }
  }

  for (const proj of projects || []) {
    const daysSince = daysBetween(proj.updated_at);
    if (daysSince >= thresholds.project) {
      alerts.push({
        entity_type: "project", entity_id: proj.id, entity_name: proj.name,
        days_inactive: daysSince, last_activity: proj.updated_at,
        severity: daysSince > 20 ? "high" : "medium",
        suggestion: `Projet "${proj.name}" inactif depuis ${daysSince}j. Vérifier l'avancement.`,
      });
    }
  }

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
  const { data: projects } = await supabase.from("projects").select("*")
    .eq("workspace_id", workspaceId).in("status", ["active", "planning"]);

  const checks: Array<{
    project_id: string; project_name: string; current_health: string; computed_health: string;
    risk_factors: string[]; budget_status: { consumed_pct: number; status: string };
    task_status: { total: number; overdue: number; completed: number }; days_since_activity: number;
  }> = [];

  for (const project of projects || []) {
    const { data: tasks } = await supabase.from("tasks").select("id, status, due_date").eq("project_id", project.id);

    const today = new Date().toISOString().split("T")[0];
    const totalTasks = tasks?.length || 0;
    const overdueTasks = tasks?.filter((t: any) => t.due_date && t.due_date < today && t.status !== "completed" && t.status !== "cancelled").length || 0;
    const completedTasks = tasks?.filter((t: any) => t.status === "completed").length || 0;

    const budget = Number(project.budget_amount) || 0;
    const consumed = Number(project.consumed_amount) || 0;
    const consumedPct = budget > 0 ? Math.round((consumed / budget) * 100) : 0;

    const riskFactors: string[] = [];
    const daysSinceActivity = daysBetween(project.updated_at);

    if (overdueTasks > 0) riskFactors.push(`${overdueTasks} tâche(s) en retard`);
    if (consumedPct > 80) riskFactors.push(`Budget consommé à ${consumedPct}%`);
    if (daysSinceActivity > 7) riskFactors.push(`Aucune activité depuis ${daysSinceActivity}j`);
    if (project.planned_end_date && project.planned_end_date < today && project.status !== "completed") {
      riskFactors.push("Date de fin dépassée");
    }
    if (totalTasks === 0) riskFactors.push("Aucune tâche définie");

    let computedHealth = "on_track";
    if (riskFactors.length >= 3 || overdueTasks > 3 || consumedPct > 100) computedHealth = "off_track";
    else if (riskFactors.length >= 1) computedHealth = "at_risk";

    if (computedHealth !== project.health_status) {
      await supabase.from("projects").update({ health_status: computedHealth }).eq("id", project.id);
    }

    checks.push({
      project_id: project.id, project_name: project.name,
      current_health: project.health_status || "unknown", computed_health: computedHealth,
      risk_factors: riskFactors, budget_status: { consumed_pct: consumedPct, status: consumedPct > 90 ? "critical" : consumedPct > 70 ? "warning" : "ok" },
      task_status: { total: totalTasks, overdue: overdueTasks, completed: completedTasks },
      days_since_activity: daysSinceActivity,
    });
  }

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

  const [
    { data: todayTasks }, { data: overdueTasks }, { data: todayBookings },
    { data: recentActivity }, inactivityResult, healthResult,
    { data: upcomingDeadlines }, scoringResult,
  ] = await Promise.all([
    supabase.from("tasks").select("id, title, priority, entity_type, entity_id, due_time")
      .eq("workspace_id", workspaceId).eq("due_date", today).neq("status", "completed").neq("status", "cancelled")
      .order("due_time", { ascending: true, nullsFirst: false }),
    supabase.from("tasks").select("id, title, priority, due_date, entity_type")
      .eq("workspace_id", workspaceId).lt("due_date", today).neq("status", "completed").neq("status", "cancelled")
      .order("due_date", { ascending: true }),
    supabase.from("bookings").select("id, name, email, company, start_time, end_time, booking_types:booking_type_id(name)")
      .eq("workspace_id", workspaceId).gte("start_time", `${today}T00:00:00`).lte("start_time", `${today}T23:59:59`)
      .eq("status", "confirmed").order("start_time"),
    supabase.from("activity_log").select("activity_type, entity_type, title, created_at")
      .eq("workspace_id", workspaceId).gte("created_at", new Date(Date.now() - 86400000).toISOString())
      .order("created_at", { ascending: false }).limit(20),
    detectInactivity(supabase, workspaceId),
    healthCheckProjects(supabase, workspaceId),
    // Phase 2: upcoming deadlines (next 7 days)
    supabase.from("projects").select("id, name, planned_end_date, status, health_status")
      .eq("workspace_id", workspaceId).in("status", ["active", "planning"])
      .gte("planned_end_date", today)
      .lte("planned_end_date", new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0])
      .order("planned_end_date"),
    // Phase 2: pipeline scoring
    opportunityScore(supabase, workspaceId),
  ]);

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

### Deadlines proches (7j)
${upcomingDeadlines?.map((p: any) => `- ${p.name}: fin prévue le ${p.planned_end_date} [${p.health_status || "?"}]`).join("\n") || "Aucune"}

### Pipeline - Scoring prédictif
${scoringResult.scores?.slice(0, 5).map((s: any) => `- ${s.opportunity_title}: ${s.conversion_score}/100 (${s.risk_level}) — ${s.primary_risk || "RAS"}`).join("\n") || "Aucune opportunité"}

### Activité récente (24h)
${recentActivity?.map((a: any) => `- ${a.activity_type}: ${a.title || a.entity_type}`).join("\n") || "Aucune"}
`;

  const briefPrompt = await loadPrompt(supabase, "copilot-morning-brief", {
    system_prompt: `Tu es un assistant de direction commerciale. Génère un briefing matinal concis. Réponds en français. Max 400 mots.`,
  });

  const aiSummary = await callLLM(
    [
      { role: "system", content: briefPrompt.system_prompt },
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
      upcoming_deadlines: upcomingDeadlines || [],
      pipeline_scores: scoringResult.scores?.slice(0, 10) || [],
    },
  };
}

// =============================================================================
// MODE 5: NEXT STEP SUGGESTION
// =============================================================================

async function suggestNextStep(supabase: any, entityId: string) {
  if (!entityId) return { error: "entityId requis pour next-step" };

  const { data: opp } = await supabase.from("opportunities")
    .select(`*, leads:lead_id (id, name, email, company, phone, source, status)`)
    .eq("id", entityId).single();

  if (!opp) return { error: "Opportunité introuvable" };

  // Use context-maximizer for rich context (Axe 3: multi-pass unified)
  let richContext = '';
  try {
    const leadId = opp.lead_id;
    if (leadId) {
      const maxCtx = await buildMaxContext(supabase, {
        entityType: 'lead',
        entityId: leadId,
        tokenBudget: 40000,
        crossEntity: true,
        includeTranscriptions: true,
        includeDocuments: true,
        includeEmails: true,
      });
      richContext = maxCtx.blocks;
      console.log(`[next-step] ${formatContextSummary(maxCtx)}`);
    }
  } catch (e) {
    console.warn('[next-step] Context maximizer failed:', e);
  }

  // Also fetch tasks and activity for the opportunity itself
  const [{ data: tasks }, { data: activity }] = await Promise.all([
    supabase.from("tasks").select("title, status, priority, due_date, task_type, description")
      .or(`entity_id.eq.${entityId},opportunity_id.eq.${entityId}`)
      .order("created_at", { ascending: false }).limit(20),
    supabase.from("activity_log").select("activity_type, title, content, created_at")
      .eq("entity_id", entityId).order("created_at", { ascending: false }).limit(30),
  ]);

  const context = `
## Opportunité
- **${opp.title || "Sans titre"}** — Stage: ${opp.stage}
- Valeur: ${opp.value_amount?.toLocaleString('fr-FR') || 0}€ | Probabilité: ${opp.probability || 0}%
- Lead: ${opp.leads?.name || "?"} (${opp.leads?.company || "?"})
- Source: ${opp.leads?.source || "?"} | Créée: ${opp.created_at} | MàJ: ${opp.updated_at}

## Tâches opportunité (${tasks?.length || 0})
${tasks?.map((t: any) => {
  let line = `- [${t.status}/${t.priority}] ${t.title} (${t.task_type}, échéance: ${t.due_date || "aucune"})`;
  if (t.description) line += `\n  ${t.description.substring(0, 300)}`;
  return line;
}).join("\n") || "Aucune"}

## Historique opportunité (${activity?.length || 0})
${activity?.map((a: any) => {
  let line = `- ${a.created_at}: ${a.activity_type} — ${a.title || ""}`;
  if (a.content) line += `\n  ${a.content.substring(0, 300)}`;
  return line;
}).join("\n") || "Aucun"}

${richContext}
`;
  const nextStepPrompt = await loadPrompt(supabase, "copilot-next-step", {
    system_prompt: `Tu es un expert en vente B2B. Recommande la prochaine action. Réponds en français.`,
  });

  const suggestion = await extractStructured<{
    next_action: string; action_type: string; reasoning: string;
    suggested_stage: string | null; urgency: string; talking_points: string[];
  }>(
    [
      { role: "system", content: nextStepPrompt.system_prompt },
      { role: "user", content: context },
    ],
    {
      name: "suggest_next_step",
      description: "Recommander la prochaine étape commerciale",
      parameters: {
        type: "object",
        properties: {
          next_action: { type: "string" },
          action_type: { type: "string", enum: ["call", "email", "meeting", "proposal", "follow_up", "close", "pause"] },
          reasoning: { type: "string" },
          suggested_stage: { type: "string", nullable: true },
          urgency: { type: "string", enum: ["immediate", "this_week", "next_week"] },
          talking_points: { type: "array", items: { type: "string" } },
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
// MODE 6: MEETING PREP (Phase 2)
// =============================================================================

async function meetingPrep(supabase: any, bookingId: string) {
  if (!bookingId) return { error: "bookingId requis pour meeting-prep" };

  const { data: booking } = await supabase.from("bookings")
    .select(`*, booking_types:booking_type_id(name, duration_minutes), leads:lead_id(id, name, email, company, phone, source, status, qualification_status, lead_score, budget, needs, timeline)`)
    .eq("id", bookingId).single();

  if (!booking) return { error: "Rendez-vous introuvable" };

  // Use context-maximizer for deep CRM data (Axe 3: multi-pass)
  const leadId = booking.lead_id;
  let richContext = '';
  if (leadId) {
    try {
      const maxCtx = await buildMaxContext(supabase, {
        entityType: 'lead',
        entityId: leadId,
        tokenBudget: 50000,
        crossEntity: true,
        includeTranscriptions: true,
        includeDocuments: true,
        includeEmails: true,
      });
      richContext = maxCtx.blocks;
      console.log(`[meeting-prep] ${formatContextSummary(maxCtx)}`);
    } catch (e) {
      console.warn('[meeting-prep] Context maximizer failed:', e);
    }
  }

  // Also fetch booking-specific data
  const [{ data: previousBookings }, { data: specs }] = await Promise.all([
    supabase.from("bookings").select("id, start_time, end_time, notes, meeting_type")
      .eq("email", booking.email).neq("id", bookingId).order("start_time", { ascending: false }).limit(10),
    leadId ? supabase.from("specifications").select("title, status, estimated_budget, complexity")
      .eq("lead_id", leadId).limit(5) : Promise.resolve({ data: [] }),
  ]);

  const context = `
## Rendez-vous à préparer
- Type: ${booking.booking_types?.name || booking.meeting_type || "Non défini"}
- Date: ${booking.start_time}
- Durée: ${booking.booking_types?.duration_minutes || 30} min
- Contact: ${booking.name} (${booking.email})
- Entreprise: ${booking.company || booking.leads?.company || "Non renseignée"}
- Téléphone: ${booking.phone || booking.leads?.phone || "Non renseigné"}
- Message initial: ${booking.message || "Aucun"}

## Profil du lead
- Source: ${booking.leads?.source || "?"}
- Statut: ${booking.leads?.status || "?"} / Qualification: ${booking.leads?.qualification_status || "?"}
- Score: ${booking.leads?.lead_score || "?"}
- Budget: ${booking.leads?.budget || "Non renseigné"}
- Besoins: ${booking.leads?.needs || "Non renseignés"}
- Timeline: ${booking.leads?.timeline || "Non renseignée"}

## Historique des rendez-vous (${previousBookings?.length || 0})
${previousBookings?.map((b: any) => `- ${b.start_time?.slice(0, 10)}: ${b.meeting_type || "rdv"}${b.notes ? ` — ${b.notes.slice(0, 300)}` : ""}`).join("\n") || "Premier rendez-vous"}

## Cahiers des charges (${specs?.length || 0})
${specs?.map((s: any) => `- ${s.title} [${s.status}] — Budget estimé: ${s.estimated_budget || "?"}, Complexité: ${s.complexity || "?"}`).join("\n") || "Aucun"}

${richContext}
`;

  const meetingPrompt = await loadPrompt(supabase, "copilot-meeting-prep", {
    system_prompt: `Tu es un expert en préparation de réunions B2B. Génère un briefing structuré. Réponds en français.`,
  });

  const briefing = await extractStructured<{
    summary: string;
    key_facts: string[];
    objectives: string[];
    talking_points: string[];
    questions_to_ask: string[];
    risks: string[];
    preparation_checklist: string[];
  }>(
    [
      { role: "system", content: meetingPrompt.system_prompt },
      { role: "user", content: context },
    ],
    {
      name: "meeting_prep",
      description: "Briefing de préparation de réunion commerciale",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Résumé en 2-3 phrases du contexte et de l'enjeu" },
          key_facts: { type: "array", items: { type: "string" }, description: "3-5 faits clés à retenir" },
          objectives: { type: "array", items: { type: "string" }, description: "2-3 objectifs pour cette réunion" },
          talking_points: { type: "array", items: { type: "string" }, description: "5-7 points à aborder" },
          questions_to_ask: { type: "array", items: { type: "string" }, description: "3-5 questions stratégiques" },
          risks: { type: "array", items: { type: "string" }, description: "Risques ou points de vigilance" },
          preparation_checklist: { type: "array", items: { type: "string" }, description: "Check-list de préparation" },
        },
        required: ["summary", "key_facts", "objectives", "talking_points", "questions_to_ask", "risks", "preparation_checklist"],
        additionalProperties: false,
      },
    },
    { functionName: FUNCTION_NAME, workspaceId: booking.workspace_id }
  );

  return {
    briefing,
    booking: {
      id: booking.id,
      name: booking.name,
      company: booking.company || booking.leads?.company,
      start_time: booking.start_time,
      type: booking.booking_types?.name,
    },
  };
}

// =============================================================================
// MODE 7: OPPORTUNITY SCORE (Phase 2)
// =============================================================================

async function opportunityScore(supabase: any, workspaceId: string) {
  const { data: opportunities } = await supabase.from("opportunities")
    .select(`*, leads:lead_id(name, company, source, lead_score, qualification_status, budget, needs)`)
    .eq("workspace_id", workspaceId)
    .not("stage", "in", "(closed_won,closed_lost)")
    .order("updated_at", { ascending: false }).limit(20);

  if (!opportunities?.length) return { scores: [], summary: { avg_score: 0, high_risk: 0, total: 0 } };

  const today = new Date().toISOString().split("T")[0];
  const scores: Array<{
    opportunity_id: string; opportunity_title: string; stage: string;
    conversion_score: number; risk_level: string; primary_risk: string;
    recommended_action: string; days_in_stage: number; value_amount: number;
  }> = [];

  for (const opp of opportunities) {
    const daysInStage = daysBetween(opp.updated_at);
    
    // Get task & activity metrics
    const [{ count: taskCount }, { count: overdueCount }, { count: activityCount }] = await Promise.all([
      supabase.from("tasks").select("id", { count: "exact", head: true })
        .or(`entity_id.eq.${opp.id},opportunity_id.eq.${opp.id}`),
      supabase.from("tasks").select("id", { count: "exact", head: true })
        .or(`entity_id.eq.${opp.id},opportunity_id.eq.${opp.id}`)
        .lt("due_date", today).neq("status", "completed").neq("status", "cancelled"),
      supabase.from("activity_log").select("id", { count: "exact", head: true })
        .eq("entity_id", opp.id)
        .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString()),
    ]);

    // Scoring algorithm
    let score = 50; // Base score

    // Stage progression bonus
    const stageScores: Record<string, number> = { lead: 0, r1: 15, r2: 30, proposal: 20 };
    score += stageScores[opp.stage] || 0;

    // Lead quality
    if (opp.leads?.lead_score) score += Math.min(opp.leads.lead_score / 5, 10);
    if (opp.leads?.qualification_status === "qualified") score += 10;
    if (opp.leads?.budget) score += 5;

    // Probability from user
    if (opp.probability) score = Math.round((score + opp.probability) / 2);

    // Activity penalty/bonus
    if ((activityCount || 0) === 0) score -= 15;
    else if ((activityCount || 0) >= 5) score += 10;

    // Stagnation penalty
    const maxDaysPerStage: Record<string, number> = { lead: 10, r1: 14, r2: 21 };
    const maxDays = maxDaysPerStage[opp.stage] || 14;
    if (daysInStage > maxDays) score -= Math.min(Math.floor((daysInStage - maxDays) / 3) * 5, 25);

    // Overdue tasks penalty
    if ((overdueCount || 0) > 0) score -= (overdueCount || 0) * 5;

    // Clamp
    score = Math.max(5, Math.min(100, score));

    // Risk determination
    let riskLevel = "low";
    let primaryRisk = "";
    if (score < 30) { riskLevel = "critical"; primaryRisk = "Score très bas, opportunité en danger"; }
    else if (score < 50) { riskLevel = "high"; primaryRisk = daysInStage > maxDays ? `Stagnation (${daysInStage}j en ${opp.stage})` : "Activité insuffisante"; }
    else if (score < 70) { riskLevel = "medium"; primaryRisk = (overdueCount || 0) > 0 ? `${overdueCount} tâche(s) en retard` : "Progression à surveiller"; }

    // Action recommendation
    let recommendedAction = "Continuer le suivi normal";
    if (riskLevel === "critical") recommendedAction = "Action urgente requise — relancer ou qualifier l'abandon";
    else if (riskLevel === "high") recommendedAction = "Planifier un point de contact cette semaine";
    else if (daysInStage > maxDays * 0.7) recommendedAction = "Envisager de faire avancer le stage";

    scores.push({
      opportunity_id: opp.id,
      opportunity_title: opp.title || opp.leads?.name || "Sans titre",
      stage: opp.stage,
      conversion_score: score,
      risk_level: riskLevel,
      primary_risk: primaryRisk,
      recommended_action: recommendedAction,
      days_in_stage: daysInStage,
      value_amount: opp.value_amount || 0,
    });
  }

  // Sort by score ascending (worst first)
  scores.sort((a, b) => a.conversion_score - b.conversion_score);

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.conversion_score, 0) / scores.length) : 0;

  return {
    scores,
    summary: {
      total: scores.length,
      avg_score: avgScore,
      high_risk: scores.filter((s) => s.risk_level === "critical" || s.risk_level === "high").length,
      pipeline_value: scores.reduce((sum, s) => sum + s.value_amount, 0),
      weighted_value: Math.round(scores.reduce((sum, s) => sum + s.value_amount * (s.conversion_score / 100), 0)),
    },
  };
}

// =============================================================================
// MODE 8: WIN/LOSS ANALYSIS (Phase 3)
// =============================================================================

async function winLossAnalysis(supabase: any, workspaceId: string) {
  // Fetch closed opportunities (last 6 months)
  const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString();

  const { data: closedOpps } = await supabase.from("opportunities")
    .select(`*, leads:lead_id(name, company, source, lead_score, qualification_status, budget, needs)`)
    .eq("workspace_id", workspaceId)
    .in("stage", ["closed_won", "closed_lost"])
    .gte("updated_at", sixMonthsAgo)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (!closedOpps?.length) {
    return { analysis: null, stats: { total: 0, won: 0, lost: 0, win_rate: 0 }, message: "Pas assez de données (aucune opportunité clôturée sur 6 mois)" };
  }

  const won = closedOpps.filter((o: any) => o.stage === "closed_won");
  const lost = closedOpps.filter((o: any) => o.stage === "closed_lost");

  // Collect activity stats per opportunity
  const oppContexts: string[] = [];
  for (const opp of closedOpps.slice(0, 30)) {
    const [{ count: activityCount }, { count: taskCount }, { count: meetingCount }] = await Promise.all([
      supabase.from("activity_log").select("id", { count: "exact", head: true }).eq("entity_id", opp.id),
      supabase.from("tasks").select("id", { count: "exact", head: true }).or(`entity_id.eq.${opp.id},opportunity_id.eq.${opp.id}`),
      supabase.from("meeting_notes").select("id", { count: "exact", head: true }).eq("lead_id", opp.lead_id),
    ]);

    const lifecycle = daysBetween(opp.created_at) - daysBetween(opp.updated_at);
    oppContexts.push(
      `[${opp.stage === "closed_won" ? "WON" : "LOST"}] "${opp.title || opp.leads?.name || "?"}" | ` +
      `Source: ${opp.leads?.source || "?"} | Valeur: ${opp.value_amount || 0}€ | ` +
      `Score lead: ${opp.leads?.lead_score || "?"} | Qualif: ${opp.leads?.qualification_status || "?"} | ` +
      `Durée cycle: ${lifecycle}j | Activités: ${activityCount || 0} | Tâches: ${taskCount || 0} | Meetings: ${meetingCount || 0} | ` +
      `Budget client: ${opp.leads?.budget || "?"} | Raison perte: ${opp.loss_reason || "non renseignée"}`
    );
  }

  const winLossPrompt = await loadPrompt(supabase, "copilot-win-loss", {
    system_prompt: `Tu es un analyste commercial B2B. Identifie les patterns win/loss. Réponds en français.`,
  });

  const analysis = await extractStructured<{
    win_patterns: string[];
    loss_patterns: string[];
    avg_win_cycle_days: number;
    avg_loss_cycle_days: number;
    best_sources: string[];
    critical_stage: string;
    recommendations: string[];
    key_differentiators: string[];
  }>(
    [
      { role: "system", content: winLossPrompt.system_prompt },
      { role: "user", content: `Analyse Win/Loss — ${won.length} gagnées, ${lost.length} perdues:\n\n${oppContexts.join("\n")}` },
    ],
    {
      name: "win_loss_analysis",
      description: "Analyse des patterns de conversion commerciale",
      parameters: {
        type: "object",
        properties: {
          win_patterns: { type: "array", items: { type: "string" }, description: "3-5 patterns des opportunités gagnées" },
          loss_patterns: { type: "array", items: { type: "string" }, description: "3-5 patterns des opportunités perdues" },
          avg_win_cycle_days: { type: "number", description: "Durée moyenne du cycle pour les wins" },
          avg_loss_cycle_days: { type: "number", description: "Durée moyenne du cycle pour les losses" },
          best_sources: { type: "array", items: { type: "string" }, description: "Sources les plus performantes" },
          critical_stage: { type: "string", description: "Le stage où se jouent le plus de deals" },
          recommendations: { type: "array", items: { type: "string" }, description: "3-5 recommandations d'amélioration" },
          key_differentiators: { type: "array", items: { type: "string" }, description: "Facteurs qui distinguent un win d'un loss" },
        },
        required: ["win_patterns", "loss_patterns", "best_sources", "critical_stage", "recommendations", "key_differentiators"],
        additionalProperties: false,
      },
    },
    { functionName: FUNCTION_NAME, workspaceId }
  );

  return {
    analysis,
    stats: {
      total: closedOpps.length,
      won: won.length,
      lost: lost.length,
      win_rate: Math.round((won.length / closedOpps.length) * 100),
      total_won_value: won.reduce((s: number, o: any) => s + (o.value_amount || 0), 0),
      total_lost_value: lost.reduce((s: number, o: any) => s + (o.value_amount || 0), 0),
    },
  };
}

// =============================================================================
// MODE 9: DEADLINE CASCADE (Phase 3)
// =============================================================================

async function deadlineCascade(supabase: any, projectId: string) {
  if (!projectId) return { error: "projectId requis pour deadline-cascade" };

  const { data: project } = await supabase.from("projects")
    .select("*").eq("id", projectId).single();

  if (!project) return { error: "Projet introuvable" };

  // Get all project tasks with dependencies
  const { data: tasks } = await supabase.from("tasks")
    .select("id, title, status, priority, due_date, due_time, task_type, entity_type, entity_id")
    .eq("project_id", projectId)
    .neq("status", "cancelled")
    .order("due_date", { ascending: true, nullsFirst: false });

  // Get project milestones / specs
  const { data: specs } = await supabase.from("specifications")
    .select("id, title, status, estimated_budget, complexity, deadline")
    .eq("project_id", projectId)
    .limit(20);

  // Get linked opportunities
  const { data: opps } = await supabase.from("opportunities")
    .select("id, title, stage, value_amount, expected_close_date")
    .eq("project_id", projectId)
    .limit(10);

  const today = new Date().toISOString().split("T")[0];
  const endDate = project.planned_end_date;
  const daysRemaining = endDate ? Math.floor((new Date(endDate).getTime() - Date.now()) / 86400000) : null;

  // Compute cascade impact
  const pendingTasks = tasks?.filter((t: any) => t.status !== "completed") || [];
  const overdueTasks = pendingTasks.filter((t: any) => t.due_date && t.due_date < today);
  const futureTasks = pendingTasks.filter((t: any) => t.due_date && t.due_date >= today);

  const context = `
## Projet: ${project.name}
- Statut: ${project.status} | Santé: ${project.health_status || "?"}
- Date début: ${project.start_date || "?"} | Date fin prévue: ${endDate || "Non définie"}
- Jours restants: ${daysRemaining !== null ? daysRemaining : "N/A"}
- Budget: ${project.consumed_amount || 0}/${project.budget_amount || 0}€

## Tâches (${tasks?.length || 0} total, ${overdueTasks.length} en retard)
${pendingTasks.map((t: any) => `- [${t.status}/${t.priority}] ${t.title} — échéance: ${t.due_date || "aucune"}`).join("\n") || "Aucune"}

## Cahiers des charges (${specs?.length || 0})
${specs?.map((s: any) => `- ${s.title} [${s.status}] deadline: ${s.deadline || "?"}`).join("\n") || "Aucun"}

## Opportunités liées (${opps?.length || 0})
${opps?.map((o: any) => `- ${o.title} (${o.stage}, close prévu: ${o.expected_close_date || "?"}, ${o.value_amount || 0}€)`).join("\n") || "Aucune"}
`;

  const cascadePrompt = await loadPrompt(supabase, "copilot-deadline-cascade", {
    system_prompt: `Tu es un chef de projet expert. Évalue la faisabilité de la deadline. Réponds en français.`,
  });

  const cascade = await extractStructured<{
    overall_status: string;
    deadline_feasibility: string;
    days_at_risk: number;
    critical_path: string[];
    tasks_to_reschedule: Array<{ task_title: string; current_due: string; suggested_due: string; reason: string }>;
    blocked_milestones: string[];
    impact_on_opportunities: string;
    recommendations: string[];
  }>(
    [
      { role: "system", content: cascadePrompt.system_prompt },
      { role: "user", content: context },
    ],
    {
      name: "deadline_cascade",
      description: "Analyse d'impact et cascade des deadlines",
      parameters: {
        type: "object",
        properties: {
          overall_status: { type: "string", description: "Résumé en 1 phrase de l'état du projet" },
          deadline_feasibility: { type: "string", enum: ["on_track", "at_risk", "impossible"], description: "La deadline est-elle tenable ?" },
          days_at_risk: { type: "number", description: "Nombre de jours de retard estimé" },
          critical_path: { type: "array", items: { type: "string" }, description: "Tâches sur le chemin critique" },
          tasks_to_reschedule: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task_title: { type: "string" },
                current_due: { type: "string" },
                suggested_due: { type: "string" },
                reason: { type: "string" },
              },
              required: ["task_title", "current_due", "suggested_due", "reason"],
              additionalProperties: false,
            },
          },
          blocked_milestones: { type: "array", items: { type: "string" }, description: "Jalons bloqués" },
          impact_on_opportunities: { type: "string", description: "Impact sur les opportunités liées" },
          recommendations: { type: "array", items: { type: "string" }, description: "3-5 recommandations" },
        },
        required: ["overall_status", "deadline_feasibility", "days_at_risk", "critical_path", "tasks_to_reschedule", "recommendations"],
        additionalProperties: false,
      },
    },
    { functionName: FUNCTION_NAME, workspaceId: project.workspace_id }
  );

  return {
    cascade,
    project: { id: project.id, name: project.name, planned_end_date: endDate, days_remaining: daysRemaining },
    stats: {
      total_tasks: tasks?.length || 0,
      overdue: overdueTasks.length,
      pending: pendingTasks.length,
      completed: (tasks?.length || 0) - pendingTasks.length,
    },
  };
}

// =============================================================================
// MODE 10: HARVEST - Interview overdue AI tasks
// =============================================================================

async function harvestOverdueTasks(supabase: any, workspaceId: string, entityId?: string) {
  const today = new Date().toISOString().split("T")[0];

  // Fetch overdue AI tasks, optionally filtered by entity
  let query = supabase
    .from("tasks")
    .select("id, title, description, priority, task_type, due_date, entity_type, entity_id, status, ai_generated, created_at")
    .eq("ai_generated", true)
    .lt("due_date", today)
    .not("status", "in", "(completed,cancelled,harvested)")
    .order("entity_id")
    .order("due_date", { ascending: true })
    .limit(200);

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }

  if (entityId) {
    query = query.eq("entity_id", entityId);
  }

  const { data: overdueTasks } = await query;

  if (!overdueTasks?.length) {
    return { groups: [], total: 0, message: "Aucune tâche IA en retard à récolter." };
  }

  // Group by entity
  const entityGroups: Record<string, { entity_type: string; entity_id: string; entity_name: string; tasks: any[] }> = {};

  for (const task of overdueTasks) {
    const key = `${task.entity_type || "none"}_${task.entity_id || "none"}`;
    if (!entityGroups[key]) {
      entityGroups[key] = {
        entity_type: task.entity_type || "general",
        entity_id: task.entity_id || "",
        entity_name: "",
        tasks: [],
      };
    }
    entityGroups[key].tasks.push(task);
  }

  // Resolve entity names
  for (const group of Object.values(entityGroups)) {
    if (group.entity_id && group.entity_type) {
      const tableMap: Record<string, { table: string; nameCol: string }> = {
        lead: { table: "leads", nameCol: "name" },
        opportunity: { table: "opportunities", nameCol: "title" },
        project: { table: "projects", nameCol: "name" },
        voice_transcription: { table: "voice_transcriptions", nameCol: "title" },
      };
      const mapping = tableMap[group.entity_type];
      if (mapping) {
        const { data } = await supabase.from(mapping.table).select(`${mapping.nameCol}, slug`).eq("id", group.entity_id).maybeSingle();
        group.entity_name = data?.[mapping.nameCol] || group.entity_id;
      } else {
        group.entity_name = `${group.entity_type} (${group.entity_id.slice(0, 8)})`;
      }
    }
  }

  // Sort groups: most tasks first
  const sortedGroups = Object.values(entityGroups).sort((a, b) => b.tasks.length - a.tasks.length);

  // Generate interview questions for the top group (or specified entity)
  const targetGroup = sortedGroups[0];
  const taskList = targetGroup.tasks.map((t: any) => 
    `- [ID:${t.id}] "${t.title}" (${t.task_type}, priorité: ${t.priority}, créée le ${t.created_at?.slice(0, 10)}, échéance: ${t.due_date})`
  ).join("\n");

  const harvestPrompt = await loadPrompt(supabase, "copilot-harvest-interview", {
    system_prompt: `Tu es un assistant de direction. Regroupe les tâches par thème et pose 2-4 questions synthétiques. Réponds en français.`,
  });

  const questions = await extractStructured<{
    entity_summary: string;
    questions: Array<{
      question: string;
      related_task_ids: string[];
      context: string;
      suggested_actions: string[];
    }>;
  }>(
    [
      { role: "system", content: harvestPrompt.system_prompt },
      {
        role: "user",
        content: `Entité: ${targetGroup.entity_type} — "${targetGroup.entity_name}"
${targetGroup.tasks.length} tâches IA en retard:
${taskList}`,
      },
    ],
    {
      name: "harvest_questions",
      description: "Questions de récolte pour les tâches IA en retard",
      parameters: {
        type: "object",
        properties: {
          entity_summary: { type: "string", description: "Résumé de la situation de l'entité en 1-2 phrases" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string", description: "Question synthétique à poser à l'utilisateur" },
                related_task_ids: { type: "array", items: { type: "string" }, description: "IDs des tâches concernées" },
                context: { type: "string", description: "Contexte pour comprendre pourquoi cette question" },
                suggested_actions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Actions possibles: 'keep_update', 'new_task', 'archive_enriched', 'done_offplatform'",
                },
              },
              required: ["question", "related_task_ids", "context", "suggested_actions"],
              additionalProperties: false,
            },
          },
        },
        required: ["entity_summary", "questions"],
        additionalProperties: false,
      },
    },
    { functionName: FUNCTION_NAME, workspaceId }
  );

  return {
    groups: sortedGroups.map((g) => ({
      entity_type: g.entity_type,
      entity_id: g.entity_id,
      entity_name: g.entity_name,
      task_count: g.tasks.length,
      oldest_task_date: g.tasks[0]?.due_date,
      tasks: g.tasks,
    })),
    total: overdueTasks.length,
    current_interview: {
      entity_type: targetGroup.entity_type,
      entity_id: targetGroup.entity_id,
      entity_name: targetGroup.entity_name,
      summary: questions?.entity_summary || "",
      questions: questions?.questions || [],
      task_ids: targetGroup.tasks.map((t: any) => t.id),
    },
  };
}

// =============================================================================
// MODE 11: HARVEST RESPOND - Process user answers
// =============================================================================

async function harvestRespond(supabase: any, workspaceId: string, taskIds: string[], response: string, action: string) {
  // Fetch the tasks being responded to
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, description, entity_type, entity_id, task_type, priority, workspace_id")
    .in("id", taskIds);

  if (!tasks?.length) {
    return { error: "Tâches non trouvées" };
  }

  const entityType = tasks[0].entity_type;
  const entityId = tasks[0].entity_id;
  const resolvedWorkspaceId = workspaceId || tasks[0].workspace_id;

  // Store the response as context knowledge
  if (entityId && response) {
    await supabase.from("entity_context_notes").insert({
      workspace_id: resolvedWorkspaceId,
      entity_type: entityType || "general",
      entity_id: entityId,
      content: `[Récolte IA] ${response}`,
    });
  }

  // Log the harvest activity
  for (const task of tasks) {
    await supabase.from("activity_log").insert({
      workspace_id: resolvedWorkspaceId,
      entity_type: task.entity_type || "task",
      entity_id: task.entity_id || task.id,
      activity_type: "ai_harvest",
      title: `Récolte IA: ${task.title}`,
      content: `Action: ${action}. Réponse: ${response}`,
      is_ai_generated: true,
      task_id: task.id,
    });
  }

  let newTasks: any[] = [];

  switch (action) {
    case "harvested":
      // Mark as harvested — knowledge captured, task done
      await supabase.from("tasks").update({ status: "harvested" }).in("id", taskIds);
      break;

    case "done_offplatform":
      // Was done outside the platform
      await supabase.from("tasks").update({ status: "completed" }).in("id", taskIds);
      break;

    case "new_task": {
      // Generate fresh replacement tasks based on the response
      const harvestNewPrompt = await loadPrompt(supabase, "copilot-harvest-new-tasks", {
        system_prompt: `Génère 1-3 nouvelles tâches actionnables basées sur la réponse utilisateur. Réponds en français.`,
      });

      const freshTasks = await extractStructured<{
        tasks: Array<{ title: string; description: string; priority: string; task_type: string; due_in_days: number }>;
      }>(
        [
          { role: "system", content: harvestNewPrompt.system_prompt },
          {
            role: "user",
            content: `Anciennes tâches:\n${tasks.map((t: any) => `- ${t.title}: ${t.description || ""}`).join("\n")}\n\nRéponse utilisateur: ${response}`,
          },
        ],
        {
          name: "generate_fresh_tasks",
          description: "Générer des tâches fraîches",
          parameters: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                    task_type: { type: "string", enum: ["follow_up", "call", "email", "meeting", "proposal", "other"] },
                    due_in_days: { type: "number" },
                  },
                  required: ["title", "description", "priority", "task_type", "due_in_days"],
                  additionalProperties: false,
                },
              },
            },
            required: ["tasks"],
            additionalProperties: false,
          },
        },
        { functionName: FUNCTION_NAME, workspaceId }
      );

      // Mark old tasks as harvested
      await supabase.from("tasks").update({ status: "harvested" }).in("id", taskIds);

      // Create new tasks
      if (freshTasks?.tasks?.length) {
        const insertData = freshTasks.tasks.map((t) => {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + t.due_in_days);
          return {
            title: t.title,
            description: t.description,
            priority: t.priority,
            task_type: t.task_type,
            status: "pending",
            due_date: dueDate.toISOString().split("T")[0],
            workspace_id: resolvedWorkspaceId,
            entity_type: entityType,
            entity_id: entityId,
            ai_generated: true,
          };
        });

        const { data: created } = await supabase.from("tasks").insert(insertData).select();
        newTasks = created || [];
      }
      break;
    }

    case "keep_update":
      // Keep tasks but update with new context, reset due date to +7 days
      const newDue = new Date();
      newDue.setDate(newDue.getDate() + 7);
      await supabase.from("tasks").update({
        due_date: newDue.toISOString().split("T")[0],
        description: tasks.map((t: any) => t.description || "").join(". ") + ` [MAJ Récolte: ${response}]`,
      }).in("id", taskIds);
      break;
  }

  // =========================================================================
  // CASCADE: Propagate staleness to linked entities (transcription → lead → project)
  // =========================================================================
  await propagateHarvestCascade(supabase, tasks, resolvedWorkspaceId, action, response);

  return {
    processed: taskIds.length,
    action,
    new_tasks: newTasks,
    message: `${taskIds.length} tâche(s) traitée(s) avec l'action "${action}".`,
  };
}

/**
 * Post-harvest cascade: marks linked entities as stale and propagates up the chain.
 * Transcription → Lead → Project (full parent cascade)
 */
async function propagateHarvestCascade(supabase: any, tasks: any[], workspaceId: string, action: string, response: string) {
  const entitySet = new Map<string, string>();
  for (const t of tasks) {
    if (t.entity_id && t.entity_type) {
      entitySet.set(t.entity_id, t.entity_type);
    }
  }

  const staleUpdates: Array<{ table: string; id: string }> = [];
  const activityInserts: Array<Record<string, unknown>> = [];

  for (const [entityId, entityType] of entitySet) {
    const directTable = entityTypeToTable(entityType);
    if (directTable) {
      staleUpdates.push({ table: directTable, id: entityId });
    }

    activityInserts.push({
      workspace_id: workspaceId,
      entity_type: entityType,
      entity_id: entityId,
      activity_type: "ai_harvest_cascade",
      title: `Récolte terminée: ${tasks.filter(t => t.entity_id === entityId).length} tâche(s) traitée(s)`,
      content: response ? `Action: ${action}. Note: ${response}` : `Action: ${action}`,
      is_ai_generated: true,
    });

    if (entityType === "voice_transcription") {
      const { data: transcription } = await supabase
        .from("voice_transcriptions").select("lead_id, project_id").eq("id", entityId).single();
      if (transcription?.lead_id) {
        staleUpdates.push({ table: "leads", id: transcription.lead_id });
        activityInserts.push({
          workspace_id: workspaceId, entity_type: "lead", entity_id: transcription.lead_id,
          activity_type: "ai_harvest_cascade", title: `Récolte propagée depuis transcription`, is_ai_generated: true,
        });
        const { data: leadProjects } = await supabase
          .from("projects").select("id").eq("lead_id", transcription.lead_id).limit(10);
        for (const p of leadProjects || []) {
          staleUpdates.push({ table: "projects", id: p.id });
        }
      }
      if (transcription?.project_id) {
        staleUpdates.push({ table: "projects", id: transcription.project_id });
      }
    } else if (entityType === "lead") {
      const { data: leadProjects } = await supabase
        .from("projects").select("id").eq("lead_id", entityId).limit(10);
      for (const p of leadProjects || []) {
        staleUpdates.push({ table: "projects", id: p.id });
      }
    } else if (entityType === "project") {
      const { data: project } = await supabase
        .from("projects").select("lead_id").eq("id", entityId).single();
      if (project?.lead_id) {
        staleUpdates.push({ table: "leads", id: project.lead_id });
      }
    }
  }

  const uniqueStale = [...new Map(staleUpdates.map(s => [`${s.table}:${s.id}`, s])).values()];
  await Promise.all(
    uniqueStale.map(({ table, id }) =>
      supabase.from(table).update({ synthesis_stale: true }).eq("id", id)
    )
  );

  if (activityInserts.length > 0) {
    await supabase.from("activity_log").insert(activityInserts);
  }
}

function entityTypeToTable(entityType: string): string | null {
  const map: Record<string, string> = {
    voice_transcription: "voice_transcriptions", lead: "leads", project: "projects",
    opportunity: "opportunities", partner: "partners",
  };
  return map[entityType] || null;
}

// =============================================================================
// HELPERS
// =============================================================================

function daysBetween(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

async function collectEntityContext(supabase: any, entityType: string, entityId: string): Promise<string> {
  // Use context-maximizer for rich 128k-aware context assembly
  try {
    const maxCtx = await buildMaxContext(supabase, {
      entityType,
      entityId,
      tokenBudget: 60000,
      crossEntity: true,
      includeTranscriptions: true,
      includeDocuments: true,
      includeEmails: true,
    });
    
    console.log(`[cockpit-copilot] ${formatContextSummary(maxCtx)}`);
    
    const tableMap: Record<string, string> = { lead: "leads", opportunity: "opportunities", project: "projects" };
    const table = tableMap[entityType];
    let entityBlock = '';
    if (table) {
      const { data } = await supabase.from(table).select("*").eq("id", entityId).single();
      if (data) entityBlock = `## Entité (${entityType})\n${JSON.stringify(data, null, 2)}\n\n`;
    }

    const { data: tasks } = await supabase.from("tasks")
      .select("title, status, priority, due_date, task_type, description, assignee_name")
      .or(`entity_id.eq.${entityId},lead_id.eq.${entityId},opportunity_id.eq.${entityId},project_id.eq.${entityId}`)
      .order("created_at", { ascending: false }).limit(30);

    let tasksBlock = '';
    if (tasks?.length) {
      tasksBlock = `\n## 📋 Tâches (${tasks.length})\n${tasks.map((t: any) => {
        let line = `- [${t.status}] **${t.title}** (${t.priority}, échéance: ${t.due_date || "?"})`;
        if (t.assignee_name) line += ` — ${t.assignee_name}`;
        if (t.description) line += `\n  ${t.description.substring(0, 300)}`;
        return line;
      }).join("\n")}\n`;
    }

    return entityBlock + tasksBlock + maxCtx.blocks;
  } catch (e) {
    console.warn('[cockpit-copilot] Context maximizer failed, falling back:', e);
    const parts: string[] = [];
    const tableMap: Record<string, string> = { lead: "leads", opportunity: "opportunities", project: "projects" };
    const table = tableMap[entityType];
    if (table) {
      const { data } = await supabase.from(table).select("*").eq("id", entityId).single();
      if (data) parts.push(`Entité (${entityType}): ${JSON.stringify(data, null, 2)}`);
    }
    return parts.join("\n\n");
  }
}

async function collectGlobalContext(supabase: any, workspaceId: string): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const parts: string[] = [];

  const [{ data: pendingTasks }, { data: activeOpps }, { data: activeProjects }, { data: recentActivity }, { data: recentTranscriptions }] = await Promise.all([
    supabase.from("tasks").select("title, status, priority, due_date, entity_type, description, assignee_name")
      .eq("workspace_id", workspaceId).in("status", ["pending", "in_progress"])
      .order("due_date", { ascending: true, nullsFirst: false }).limit(40),
    supabase.from("opportunities").select("title, stage, value_amount, probability, updated_at, expected_close_date, leads:lead_id(name, company)")
      .eq("workspace_id", workspaceId).not("stage", "in", "(closed_won,closed_lost)")
      .order("updated_at", { ascending: false }).limit(25),
    supabase.from("projects").select("name, status, health_status, budget_amount, consumed_amount, planned_end_date, description")
      .eq("workspace_id", workspaceId).in("status", ["active", "planning"]).limit(20),
    supabase.from("activity_log").select("activity_type, entity_type, title, content, created_at")
      .eq("workspace_id", workspaceId).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .order("created_at", { ascending: false }).limit(50),
    supabase.from("voice_transcriptions").select("title, transcription_date, ai_summary, lead_id, project_id")
      .eq("status", "done")
      .gte("transcription_date", new Date(Date.now() - 14 * 86400000).toISOString())
      .order("transcription_date", { ascending: false }).limit(15),
  ]);

  parts.push(`Date: ${today}`);
  parts.push(`## 📋 Tâches en cours (${pendingTasks?.length || 0})\n${pendingTasks?.map((t: any) => {
    let line = `- [${t.priority}] **${t.title}** (${t.entity_type}, échéance: ${t.due_date || "?"})`;
    if (t.assignee_name) line += ` — ${t.assignee_name}`;
    if (t.description) line += `\n  ${t.description.substring(0, 200)}`;
    return line;
  }).join("\n") || "Aucune"}`);
  parts.push(`## 💼 Pipeline actif (${activeOpps?.length || 0})\n${activeOpps?.map((o: any) => {
    let line = `- **${o.title || o.leads?.name || "?"}** (${o.stage}, ${o.value_amount?.toLocaleString('fr-FR') || 0}€)`;
    if (o.probability) line += ` — proba: ${o.probability}%`;
    if (o.expected_close_date) line += ` — clôture: ${o.expected_close_date}`;
    if (o.leads?.company) line += ` — ${o.leads.company}`;
    return line;
  }).join("\n") || "Aucune"}`);
  parts.push(`## 🏗️ Projets actifs (${activeProjects?.length || 0})\n${activeProjects?.map((p: any) => {
    let line = `- **${p.name}** [${p.health_status || "?"}] budget: ${p.consumed_amount?.toLocaleString('fr-FR') || 0}/${p.budget_amount?.toLocaleString('fr-FR') || 0}€`;
    if (p.planned_end_date) line += ` — fin: ${p.planned_end_date}`;
    if (p.description) line += `\n  ${p.description.substring(0, 150)}`;
    return line;
  }).join("\n") || "Aucun"}`);
  if (recentTranscriptions?.length) {
    parts.push(`## 🎙️ Transcriptions récentes (14j)\n${recentTranscriptions.map((t: any) => {
      let line = `- **${t.title || 'Réunion'}** (${t.transcription_date})`;
      if (t.ai_summary) line += `\n  ${t.ai_summary.substring(0, 500)}`;
      return line;
    }).join("\n")}`);
  }
  parts.push(`## 📊 Activité récente (7j, ${recentActivity?.length || 0} événements)\n${recentActivity?.map((a: any) => {
    let line = `- ${a.created_at?.slice(0, 10)}: **${a.activity_type}** ${a.entity_type}`;
    if (a.title) line += ` — ${a.title}`;
    if (a.content) line += `\n  ${a.content.substring(0, 200)}`;
    return line;
  }).join("\n") || "Aucune"}`);

  return parts.join("\n\n");
}
