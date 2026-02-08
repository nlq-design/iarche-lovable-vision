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
      case "meeting-prep":
        result = await meetingPrep(supabase, entityId);
        break;
      case "opportunity-score":
        result = await opportunityScore(supabase, workspaceId);
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

  const aiSummary = await callLLM(
    [
      {
        role: "system",
        content: `Tu es un assistant de direction commerciale. Génère un briefing matinal concis et actionnable.
Structure : 
1. 🎯 Priorités du jour (3 max)
2. ⚠️ Points d'attention (risques, retards, deadlines proches)
3. 📊 Pipeline (opportunités à risque, scores faibles)
4. 💡 Recommandations (actions à fort impact)
Sois direct, utilise les noms des contacts/projets. Réponds en français. Max 400 mots.`,
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

  const [{ data: tasks }, { data: activity }] = await Promise.all([
    supabase.from("tasks").select("title, status, priority, due_date, task_type")
      .or(`entity_id.eq.${entityId},opportunity_id.eq.${entityId}`)
      .order("created_at", { ascending: false }).limit(10),
    supabase.from("activity_log").select("activity_type, title, content, created_at")
      .eq("entity_id", entityId).order("created_at", { ascending: false }).limit(10),
  ]);

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
    next_action: string; action_type: string; reasoning: string;
    suggested_stage: string | null; urgency: string; talking_points: string[];
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

  // Parallel context collection
  const leadId = booking.lead_id;
  const queries: Promise<any>[] = [];

  // Previous meetings with this contact
  queries.push(supabase.from("bookings").select("id, start_time, end_time, notes, meeting_type")
    .eq("email", booking.email).neq("id", bookingId).order("start_time", { ascending: false }).limit(5));

  // Meeting notes from previous meetings
  if (leadId) {
    queries.push(supabase.from("meeting_notes").select("title, summary, action_items, meeting_date, meeting_type")
      .eq("lead_id", leadId).order("meeting_date", { ascending: false }).limit(5));
    // Opportunities linked to lead
    queries.push(supabase.from("opportunities").select("title, stage, value_amount, probability, updated_at")
      .eq("lead_id", leadId).order("updated_at", { ascending: false }).limit(5));
    // Recent activity on this lead
    queries.push(supabase.from("activity_log").select("activity_type, title, content, created_at")
      .eq("entity_id", leadId).order("created_at", { ascending: false }).limit(10));
    // Context notes
    queries.push(supabase.from("entity_context_notes").select("content, updated_at")
      .eq("entity_id", leadId).eq("entity_type", "lead").order("updated_at", { ascending: false }).limit(5));
    // Specifications
    queries.push(supabase.from("specifications").select("title, status, estimated_budget, complexity")
      .eq("lead_id", leadId).limit(5));
  } else {
    queries.push(Promise.resolve({ data: [] }));
    queries.push(Promise.resolve({ data: [] }));
    queries.push(Promise.resolve({ data: [] }));
    queries.push(Promise.resolve({ data: [] }));
    queries.push(Promise.resolve({ data: [] }));
  }

  const [
    { data: previousBookings },
    { data: meetingNotes },
    { data: opportunities },
    { data: activity },
    { data: contextNotes },
    { data: specs },
  ] = await Promise.all(queries);

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
${previousBookings?.map((b: any) => `- ${b.start_time?.slice(0, 10)}: ${b.meeting_type || "rdv"}${b.notes ? ` — ${b.notes.slice(0, 100)}` : ""}`).join("\n") || "Premier rendez-vous"}

## Comptes-rendus précédents (${meetingNotes?.length || 0})
${meetingNotes?.map((n: any) => `- ${n.meeting_date}: ${n.title}\n  Résumé: ${n.summary?.slice(0, 150) || "?"}\n  Actions: ${JSON.stringify(n.action_items || [])}`).join("\n") || "Aucun"}

## Opportunités liées (${opportunities?.length || 0})
${opportunities?.map((o: any) => `- ${o.title} (${o.stage}, ${o.value_amount || 0}€, proba: ${o.probability || 0}%)`).join("\n") || "Aucune"}

## Notes de contexte
${contextNotes?.map((n: any) => n.content).join("\n---\n") || "Aucune"}

## Cahiers des charges (${specs?.length || 0})
${specs?.map((s: any) => `- ${s.title} [${s.status}] — Budget estimé: ${s.estimated_budget || "?"}, Complexité: ${s.complexity || "?"}`).join("\n") || "Aucun"}

## Activité récente
${activity?.map((a: any) => `- ${a.created_at?.slice(0, 10)}: ${a.activity_type} — ${a.title || a.content || ""}`).join("\n") || "Aucune"}
`;

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
      {
        role: "system",
        content: `Tu es un expert en préparation de réunions commerciales B2B. Analyse le contexte et génère un briefing structuré pour bien préparer ce rendez-vous.
Sois spécifique, utilise les noms et données réels. Réponds en français.`,
      },
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
// HELPERS
// =============================================================================

function daysBetween(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

async function collectEntityContext(supabase: any, entityType: string, entityId: string): Promise<string> {
  const parts: string[] = [];
  const tableMap: Record<string, string> = { lead: "leads", opportunity: "opportunities", project: "projects" };
  const table = tableMap[entityType];
  if (table) {
    const { data } = await supabase.from(table).select("*").eq("id", entityId).single();
    if (data) parts.push(`Entité (${entityType}): ${JSON.stringify(data, null, 2)}`);
  }

  const [{ data: tasks }, { data: activity }] = await Promise.all([
    supabase.from("tasks").select("title, status, priority, due_date, task_type")
      .or(`entity_id.eq.${entityId},lead_id.eq.${entityId},opportunity_id.eq.${entityId},project_id.eq.${entityId}`)
      .order("created_at", { ascending: false }).limit(10),
    supabase.from("activity_log").select("activity_type, title, content, created_at")
      .eq("entity_id", entityId).order("created_at", { ascending: false }).limit(15),
  ]);

  if (tasks?.length) parts.push(`Tâches:\n${tasks.map((t: any) => `- [${t.status}] ${t.title} (${t.priority}, échéance: ${t.due_date || "?"})`).join("\n")}`);
  if (activity?.length) parts.push(`Activité:\n${activity.map((a: any) => `- ${a.created_at?.slice(0, 10)}: ${a.activity_type} - ${a.title || ""}`).join("\n")}`);

  const fkColumn = entityType === "lead" ? "lead_id" : entityType === "project" ? "project_id" : null;
  if (fkColumn) {
    const { data: notes } = await supabase.from("meeting_notes").select("title, summary, meeting_date")
      .eq(fkColumn, entityId).order("meeting_date", { ascending: false }).limit(5);
    if (notes?.length) parts.push(`Comptes-rendus:\n${notes.map((n: any) => `- ${n.meeting_date}: ${n.title} — ${n.summary?.slice(0, 100) || ""}`).join("\n")}`);
  }

  return parts.join("\n\n");
}

async function collectGlobalContext(supabase: any, workspaceId: string): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const parts: string[] = [];

  const [{ data: pendingTasks }, { data: activeOpps }, { data: activeProjects }, { data: recentActivity }] = await Promise.all([
    supabase.from("tasks").select("title, status, priority, due_date, entity_type")
      .eq("workspace_id", workspaceId).in("status", ["pending", "in_progress"])
      .order("due_date", { ascending: true, nullsFirst: false }).limit(20),
    supabase.from("opportunities").select("title, stage, value_amount, updated_at, leads:lead_id(name)")
      .eq("workspace_id", workspaceId).not("stage", "in", "(closed_won,closed_lost)")
      .order("updated_at", { ascending: false }).limit(15),
    supabase.from("projects").select("name, status, health_status, budget_amount, consumed_amount")
      .eq("workspace_id", workspaceId).in("status", ["active", "planning"]).limit(10),
    supabase.from("activity_log").select("activity_type, entity_type, title, created_at")
      .eq("workspace_id", workspaceId).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .order("created_at", { ascending: false }).limit(20),
  ]);

  parts.push(`Date: ${today}`);
  parts.push(`Tâches en cours (${pendingTasks?.length || 0}):\n${pendingTasks?.map((t: any) => `- [${t.priority}] ${t.title} (${t.entity_type}, échéance: ${t.due_date || "?"})`).join("\n") || "Aucune"}`);
  parts.push(`Pipeline actif (${activeOpps?.length || 0}):\n${activeOpps?.map((o: any) => `- ${o.title || o.leads?.name || "?"} (${o.stage}, ${o.value_amount || 0}€)`).join("\n") || "Aucune"}`);
  parts.push(`Projets actifs (${activeProjects?.length || 0}):\n${activeProjects?.map((p: any) => `- ${p.name} [${p.health_status || "?"}] budget: ${p.consumed_amount || 0}/${p.budget_amount || 0}€`).join("\n") || "Aucun"}`);
  parts.push(`Activité récente (7j):\n${recentActivity?.map((a: any) => `- ${a.created_at?.slice(0, 10)}: ${a.activity_type} ${a.entity_type}`).join("\n") || "Aucune"}`);

  return parts.join("\n\n");
}
