/**
 * Cockpit AI Copilot - Proactive commercial intelligence
 * 
 * Modes:
 *   - suggest-tasks: Generate contextual task suggestions based on entity state
 *   - detect-inactivity: Find stale leads/opportunities/projects
 *   - health-check: Evaluate project health and generate alerts
 *   - next-step: Suggest optimal next action for an opportunity stage
 *   - opportunity-score: Predictive conversion scoring for pipeline
 *   - harvest: Interview overdue AI tasks
 *   - harvest-respond: Process harvest responses
 *   - intelligence: Aggregated daily intelligence
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

    // Verify user (allow service-role bypass for CRON calls)
    const token = authHeader?.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceRole = token === serviceRoleKey;

    let authenticatedUserId: string | null = null;

    if (!isServiceRole) {
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
      authenticatedUserId = user.id;
    }

    const body = await req.json();
    const { mode, workspaceId, entityType, entityId } = body;

    if (!mode) {
      return new Response(JSON.stringify({ error: "Mode requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANT GUARD — valide que workspaceId appartient au user JWT
    // Service-role bypass préservé (CRON / triggers internes)
    // ═══════════════════════════════════════════════════════════════
    if (!isServiceRole && workspaceId && authenticatedUserId) {
      const { data: canAccess, error: rpcError } = await supabase.rpc(
        "can_access_entity_workspace",
        { p_workspace_id: workspaceId, p_user_id: authenticatedUserId }
      );

      if (rpcError || !canAccess) {
        console.warn(`[${FUNCTION_NAME}] cross-tenant blocked`, {
          user_id: authenticatedUserId,
          requested_workspace: workspaceId,
          rpc_error: rpcError?.message ?? null,
        });
        return new Response(
          JSON.stringify({ error: "Accès refusé à ce workspace" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
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
      case "next-step":
        result = await suggestNextStep(supabase, entityId);
        break;
      case "opportunity-score":
        result = await opportunityScore(supabase, workspaceId);
        break;
      case "harvest":
        result = await harvestOverdueTasks(supabase, workspaceId, entityId);
        break;
      case "harvest-respond":
        result = await harvestRespond(supabase, workspaceId, body.taskIds, body.response, body.action);
        break;
      case "intelligence":
        result = await intelligenceAggregator(supabase, workspaceId);
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
    if (riskFactors.length >= 3 || overdueTasks > 3 || consumedPct > 100) computedHealth = "blocked";
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
// MODE 12: INTELLIGENCE AGGREGATOR (Command Intelligence Layer)
// =============================================================================

async function intelligenceAggregator(supabase: any, workspaceId: string) {
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();

  // Parallel fetch ALL data sources
  const [
    { data: leads }, { data: opportunities }, { data: projects },
    { data: todayTasks }, { data: overdueTasks }, { data: todayBookings },
    { data: recentActivity }, { data: recentTranscriptions },
    { data: partners }, { data: staleLeads }, { data: staleProjects }, { data: stalePartners },
    inactivityResult, healthResult, scoringResult,
  ] = await Promise.all([
    supabase.from("leads").select("id, name, company, status, lead_score, source, ai_documents_summary, updated_at, email, phone")
      .eq("workspace_id", workspaceId).in("status", ["new", "contacted", "qualified", "proposal"])
      .order("lead_score", { ascending: false, nullsFirst: false }).limit(20),
    supabase.from("opportunities").select("id, title, stage, expected_revenue, probability, expected_close_date, lead_id, project_id, value_amount, updated_at")
      .eq("workspace_id", workspaceId).not("stage", "in", "(closed_won,closed_lost)")
      .order("expected_revenue", { ascending: false, nullsFirst: false }).limit(20),
    supabase.from("projects").select("id, name, status, health_status, budget_amount, consumed_amount, planned_end_date, updated_at, ai_documents_summary")
      .eq("workspace_id", workspaceId).in("status", ["active", "planning"]).limit(20),
    supabase.from("tasks").select("id, title, priority, entity_type, entity_id, due_time, ai_generated")
      .eq("workspace_id", workspaceId).eq("due_date", today).neq("status", "completed").neq("status", "cancelled"),
    supabase.from("tasks").select("id, title, priority, due_date, entity_type, ai_generated")
      .eq("workspace_id", workspaceId).lt("due_date", today).neq("status", "completed").neq("status", "cancelled").neq("status", "harvested"),
    supabase.from("bookings").select("id, name, email, company, start_time, end_time, lead_id, booking_types:booking_type_id(name)")
      .eq("workspace_id", workspaceId).gte("start_time", `${today}T00:00:00`).lte("start_time", `${today}T23:59:59`)
      .eq("status", "confirmed").order("start_time"),
    supabase.from("activity_log").select("activity_type, entity_type, entity_id, title, content, created_at, is_ai_generated")
      .eq("workspace_id", workspaceId).gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false }).limit(50),
    supabase.from("voice_transcriptions").select("id, title, transcription_date, ai_summary, lead_id, project_id, status")
      .eq("workspace_id", workspaceId).eq("status", "done").gte("transcription_date", fourteenDaysAgo)
      .order("transcription_date", { ascending: false }).limit(10),
    supabase.from("partners").select("id, name, partner_type, expertise, ai_documents_summary, is_active")
      .eq("workspace_id", workspaceId).eq("is_active", true).limit(15),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("synthesis_stale", true),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("synthesis_stale", true),
    supabase.from("partners").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("synthesis_stale", true),
    detectInactivity(supabase, workspaceId),
    healthCheckProjects(supabase, workspaceId),
    opportunityScore(supabase, workspaceId),
  ]);

  // === SENTINELLE — alertes SQL actives (top 15 non résolues, prio critical>warning>info) ===
  const { data: sentinelAlerts } = await supabase
    .from("ai_sentinel_alerts")
    .select("severity, category, entity_type, entity_id, title, description, created_at")
    .eq("workspace_id", workspaceId)
    .is("resolved_at", null)
    .order("severity", { ascending: true }) // critical < info alphabétiquement → on retrie en JS
    .order("created_at", { ascending: false })
    .limit(50);

  const sevOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  const topSentinel = (sentinelAlerts || [])
    .sort((a: any, b: any) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9))
    .slice(0, 15);

  // Win/loss stats
  const [{ data: won }, { data: lost }] = await Promise.all([
    supabase.from("opportunities").select("id, value_amount").eq("workspace_id", workspaceId).eq("stage", "closed_won"),
    supabase.from("opportunities").select("id").eq("workspace_id", workspaceId).eq("stage", "closed_lost"),
  ]);
  const wonCount = won?.length || 0;
  const lostCount = lost?.length || 0;
  const winRate = (wonCount + lostCount) > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;

  // Booking-partner cross-reference
  const bookingIds = (todayBookings || []).map((b: any) => b.id);
  let bookingPartners: any[] = [];
  if (bookingIds.length > 0) {
    const { data: bp } = await supabase.from("booking_partners")
      .select("booking_id, partner_id, partners:partner_id(name, partner_type)")
      .in("booking_id", bookingIds);
    bookingPartners = bp || [];
  }

  // Build lead name map for cross-referencing
  const leadNameMap: Record<string, string> = {};
  for (const l of leads || []) leadNameMap[l.id] = l.company || l.name || "Lead";

  const staleCount = (staleLeads?.count || 0) + (staleProjects?.count || 0) + (stalePartners?.count || 0);
  const overdueAiCount = (overdueTasks || []).filter((t: any) => t.ai_generated).length;
  const pipelineValue = (opportunities || []).reduce((s: number, o: any) => s + (Number(o.value_amount || o.expected_revenue) || 0), 0);
  const weightedValue = (opportunities || []).reduce((s: number, o: any) => s + ((Number(o.value_amount || o.expected_revenue) || 0) * (Number(o.probability) || 0) / 100), 0);

  // Build massive context for LLM
  const llmContext = `
## Date: ${today}
## Vue d'ensemble: ${leads?.length || 0} leads actifs, ${opportunities?.length || 0} opportunités, ${projects?.length || 0} projets

### Pipeline (${pipelineValue.toLocaleString('fr-FR')}€ total, ${Math.round(weightedValue).toLocaleString('fr-FR')}€ pondéré, win rate: ${winRate}%)
${(opportunities || []).map((o: any) => {
  const lead = o.lead_id ? leadNameMap[o.lead_id] || "" : "";
  const daysInStage = daysBetween(o.updated_at);
  return `- ${o.title} [${o.stage}] ${Number(o.value_amount || o.expected_revenue || 0).toLocaleString('fr-FR')}€ proba:${o.probability || "?"}% close:${o.expected_close_date || "?"} inactif:${daysInStage}j${lead ? ` — ${lead}` : ""}`;
}).join("\n") || "Aucune"}

### Leads actifs (top 15 par score)
${(leads || []).slice(0, 15).map((l: any) => {
  const daysInactive = daysBetween(l.updated_at);
  const synthExcerpt = l.ai_documents_summary ? ` | Synthèse: ${l.ai_documents_summary.slice(0, 150)}…` : " | Pas de synthèse";
  return `- ${l.company || l.name} [${l.status}] score:${l.lead_score || "?"} inactif:${daysInactive}j${synthExcerpt}`;
}).join("\n") || "Aucun"}

### Tâches du jour (${todayTasks?.length || 0}) + En retard (${overdueTasks?.length || 0}, dont ${overdueAiCount} IA)
${(todayTasks || []).map((t: any) => `- [AUJOURD'HUI] ${t.title} (${t.priority})`).join("\n") || "Aucune"}
${(overdueTasks || []).slice(0, 10).map((t: any) => `- [RETARD ${t.due_date}] ${t.title} (${t.priority})${t.ai_generated ? " [IA]" : ""}`).join("\n") || ""}

### RDV du jour (${todayBookings?.length || 0})
${(todayBookings || []).map((b: any) => {
  const time = new Date(b.start_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const bpNames = bookingPartners.filter((bp: any) => bp.booking_id === b.id).map((bp: any) => bp.partners?.name).filter(Boolean);
  const linkedLead = b.lead_id ? leadNameMap[b.lead_id] : null;
  return `- ${time}: ${b.name} (${b.company || b.email})${bpNames.length ? ` — Partenaires: ${bpNames.join(", ")}` : ""}${linkedLead ? ` — Lead: ${linkedLead}` : ""}`;
}).join("\n") || "Aucun"}

### Santé projets (${healthResult.summary.on_track}🟢 ${healthResult.summary.at_risk}🟡 ${healthResult.summary.off_track}🔴)
${healthResult.projects.filter((p: any) => p.computed_health !== 'on_track').map((p: any) => 
  `- ${p.project_name}: ${p.computed_health} — ${p.risk_factors.join(", ")} (budget: ${p.budget_status.consumed_pct}%)`
).join("\n") || "Tous OK"}

### Alertes d'inactivité (${inactivityResult.total})
${inactivityResult.alerts.slice(0, 8).map((a: any) => `- [${a.severity}] ${a.entity_type}: "${a.entity_name}" inactif ${a.days_inactive}j — ${a.suggestion}`).join("\n") || "Aucune"}

### Scoring prédictif pipeline
${(scoringResult.scores || []).slice(0, 8).map((s: any) => `- ${s.opportunity_title}: ${s.conversion_score}/100 [${s.risk_level}] — ${s.primary_risk || "RAS"} → ${s.recommended_action}`).join("\n") || "Aucune"}

### Transcriptions récentes (14j)
${(recentTranscriptions || []).map((t: any) => {
  const linked = [t.lead_id ? `Lead:${leadNameMap[t.lead_id] || t.lead_id}` : null].filter(Boolean).join(", ");
  return `- ${t.title || "Réunion"} (${t.transcription_date})${linked ? ` — ${linked}` : ""}${t.ai_summary ? `\n  Résumé: ${t.ai_summary.slice(0, 300)}` : ""}`;
}).join("\n") || "Aucune"}

### Partenaires actifs (${partners?.length || 0})
${(partners || []).map((p: any) => {
  const synthExcerpt = p.ai_documents_summary ? ` | ${p.ai_documents_summary.slice(0, 100)}…` : "";
  return `- ${p.name} [${p.partner_type || "?"}] ${p.expertise || ""}${synthExcerpt}`;
}).join("\n") || "Aucun"}

### Synthèses obsolètes: ${staleCount} entités en attente de re-synthèse

### Activité récente (7j, ${recentActivity?.length || 0} événements)
${(recentActivity || []).slice(0, 15).map((a: any) => `- ${a.created_at?.slice(0, 10)}: ${a.activity_type} ${a.entity_type}${a.title ? ` — ${a.title}` : ""}${a.is_ai_generated ? " [IA]" : ""}`).join("\n") || "Aucune"}
`;

  // === FEEDBACK BOUCLE — ai_actions actives (contexte utilisateur sur les éléments IA précédents) ===
  const { data: activeAIActions } = await supabase
    .from('ai_actions')
    .select('source, action_text, status, snooze_until, user_notes, structured_updates, entity_name, updated_at')
    .eq('workspace_id', workspaceId)
    .not('status', 'in', '(done,dismissed)')
    .gte('updated_at', sevenDaysAgo)
    .order('updated_at', { ascending: false })
    .limit(30);

  const userFeedbackContext = (activeAIActions && activeAIActions.length > 0)
    ? `\n\n--- FEEDBACK UTILISATEUR (boucle d'apprentissage) ---
Ces éléments IA précédents ont été enrichis par l'utilisateur. Tu dois en tenir compte : ne PAS répéter une action déjà reportée, intégrer les nouvelles infos (deadline, montant, contact) dans tes suggestions, fusionner ou affiner plutôt que dupliquer.

${activeAIActions.map((a: any) => {
  const notes = Array.isArray(a.user_notes) && a.user_notes.length > 0
    ? `\n  Notes: ${a.user_notes.map((n: any) => `"${n.text}"`).join(' | ')}` : '';
  const updates = a.structured_updates && Object.keys(a.structured_updates).length > 0
    ? `\n  Mises à jour: ${JSON.stringify(a.structured_updates)}` : '';
  const snoozeInfo = a.snooze_until ? ` [reporté jusqu'au ${a.snooze_until.slice(0, 10)}]` : '';
  return `- [${a.source}/${a.status}${snoozeInfo}] ${a.entity_name || ''}: "${a.action_text}"${notes}${updates}`;
}).join('\n')}
--- FIN FEEDBACK ---`
    : '';


  // === ENRICHISSEMENT CONSULTE : Synthèses 360° des entités actives ===
  const consulteSections: string[] = [];

  // Leads avec synthèses Consulte complètes (800 chars au lieu de 150)
  const leadsWithSynthesis = (leads || []).filter((l: any) => l.ai_documents_summary && l.ai_documents_summary.length > 100);
  if (leadsWithSynthesis.length > 0) {
    consulteSections.push('## SYNTHÈSES CONSULTE — LEADS ACTIFS');
    for (const lead of leadsWithSynthesis.slice(0, 10)) {
      const summary = lead.ai_documents_summary.slice(0, 800);
      consulteSections.push(`### ${lead.company || lead.name} (${lead.status}, score: ${lead.lead_score || '?'})\n${summary}\n`);
    }
  }

  // Projets avec synthèses Consulte
  const projectsWithSynthesis = (projects || []).filter((p: any) => p.ai_documents_summary && p.ai_documents_summary.length > 100);
  if (projectsWithSynthesis.length > 0) {
    consulteSections.push('## SYNTHÈSES CONSULTE — PROJETS ACTIFS');
    for (const project of projectsWithSynthesis.slice(0, 8)) {
      const summary = project.ai_documents_summary.slice(0, 800);
      consulteSections.push(`### ${project.name} (${project.status} / ${project.health_status})\n${summary}\n`);
    }
  }

  // Partenaires avec synthèses Consulte
  const partnersWithSynthesis = (partners || []).filter((p: any) => p.ai_documents_summary && p.ai_documents_summary.length > 100);
  if (partnersWithSynthesis.length > 0) {
    consulteSections.push('## SYNTHÈSES CONSULTE — PARTENAIRES ACTIFS');
    for (const partner of partnersWithSynthesis.slice(0, 5)) {
      const summary = partner.ai_documents_summary.slice(0, 500);
      consulteSections.push(`### ${partner.name} (${partner.partner_type || '?'})\n${summary}\n`);
    }
  }

  const consulteContext = consulteSections.join('\n');
  const consulteInjectedCount =
    leadsWithSynthesis.slice(0, 10).length +
    projectsWithSynthesis.slice(0, 8).length +
    partnersWithSynthesis.slice(0, 5).length;
  const consulteEnrichment = consulteContext.length > 200
    ? `\n\n--- CONTEXTE ENRICHI (Synthèses Consulte 360°) ---\nCes synthèses ont été générées par le module Consulte à partir de l'ensemble des données CRM, transcriptions, documents et historique de chaque entité. Elles sont plus riches et complètes que les données SQL brutes ci-dessus. PRIORISE ces synthèses pour tes analyses.\n\n${consulteContext}\n--- FIN CONTEXTE ENRICHI ---`
    : '';

  // === SENTINELLE — injection alertes SQL dans le contexte LLM ===
  const sentinelBlock = topSentinel.length > 0
    ? `\n\n--- ALERTES SENTINELLE (${topSentinel.length} actives, non dismissées) ---\nCes alertes proviennent de règles SQL déterministes (incohérences, inactivités, doublons, données manquantes). Utilise-les comme SIGNAUX FAIBLES à croiser avec le pipeline et les synthèses Consulte. Ne les recopie pas telles quelles : transforme-les en actions concrètes ou en cross_signals composites.\n\n${topSentinel.map((a: any) => `- [${a.severity.toUpperCase()}/${a.category}] ${a.entity_type}:${a.entity_id?.slice(0,8) || '?'} — ${a.title}${a.description ? ` (${a.description.slice(0, 200)})` : ''}`).join('\n')}\n--- FIN ALERTES SENTINELLE ---`
    : '';

  const enrichedLlmContext = llmContext + consulteEnrichment + sentinelBlock + userFeedbackContext;

  // Load prompt from DB
  const prompt = await loadPrompt(supabase, "cockpit-intelligence-aggregator", {
    system_prompt: `Tu es le cerveau analytique du Command Center. Analyse TOUTES les données et produis une intelligence structurée. Français uniquement.`,
  });

  // Single LLM call with structured output
  const result = await extractStructured<{
    top_actions: Array<{
      action: string;
      urgency: string;
      entity_type: string;
      entity_id: string;
      entity_name: string;
      reasoning: string;
      impact_value: number;
    }>;
    cross_signals: Array<{
      signal: string;
      entities: Array<{ type: string; id: string; name: string }>;
      severity: string;
    }>;
    predictions: Array<{
      prediction: string;
      confidence: number;
      timeframe: string;
      entities: Array<{ type: string; id: string; name: string }>;
      risk_type: string;
    }>;
    health_overview: {
      global_score: number;
      pipeline_momentum: string;
      critical_count: number;
      improving: string[];
      degrading: string[];
    };
    narrative_brief: string;
    stale_synthesis_impact: string;
  }>(
    [
      { role: "system", content: prompt.system_prompt },
      { role: "user", content: `${prompt.user_prompt || "Analyse le contexte commercial complet:"}\n\n${enrichedLlmContext}` },
    ],
    {
      name: "intelligence_aggregator",
      description: "Produire une intelligence commerciale structurée et circulaire à partir de toutes les données CRM",
      parameters: {
        type: "object",
        properties: {
          top_actions: {
            type: "array",
            description: "3-5 actions prioritaires classées par urgence et impact financier",
            items: {
              type: "object",
              properties: {
                action: { type: "string", description: "Description concrète de l'action avec noms et montants" },
                urgency: { type: "string", enum: ["critical", "high", "medium", "low"] },
                entity_type: { type: "string", enum: ["lead", "opportunity", "project", "partner", "task"] },
                entity_id: { type: "string" },
                entity_name: { type: "string" },
                reasoning: { type: "string", description: "Pourquoi cette action est prioritaire (données croisées)" },
                impact_value: { type: "number", description: "Impact financier estimé en euros (0 si non applicable)" },
              },
              required: ["action", "urgency", "entity_type", "entity_id", "entity_name", "reasoning"],
              additionalProperties: false,
            },
          },
          cross_signals: {
            type: "array",
            description: "Connexions cachées entre entités détectées par croisement des données",
            items: {
              type: "object",
              properties: {
                signal: { type: "string", description: "Description du signal croisé détecté" },
                entities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      id: { type: "string" },
                      name: { type: "string" },
                    },
                    required: ["type", "id", "name"],
                    additionalProperties: false,
                  },
                },
                severity: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["signal", "entities", "severity"],
              additionalProperties: false,
            },
          },
          predictions: {
            type: "array",
            description: "Prédictions à 7 jours basées sur les tendances observées",
            items: {
              type: "object",
              properties: {
                prediction: { type: "string" },
                confidence: { type: "number", description: "0.0 à 1.0" },
                timeframe: { type: "string" },
                entities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { type: { type: "string" }, id: { type: "string" }, name: { type: "string" } },
                    required: ["type", "id", "name"],
                    additionalProperties: false,
                  },
                },
                risk_type: { type: "string", enum: ["opportunity", "risk"] },
              },
              required: ["prediction", "confidence", "timeframe", "entities", "risk_type"],
              additionalProperties: false,
            },
          },
          health_overview: {
            type: "object",
            properties: {
              global_score: { type: "number", description: "Score de santé global 0-100" },
              pipeline_momentum: { type: "string", enum: ["accelerating", "stable", "decelerating", "stalled"] },
              critical_count: { type: "number" },
              improving: { type: "array", items: { type: "string" } },
              degrading: { type: "array", items: { type: "string" } },
            },
            required: ["global_score", "pipeline_momentum", "critical_count", "improving", "degrading"],
            additionalProperties: false,
          },
          narrative_brief: {
            type: "string",
            description: "Résumé exécutif narratif de 10-15 lignes en Markdown. Style direction commerciale. Priorise urgences puis opportunités.",
          },
          stale_synthesis_impact: {
            type: "string",
            description: "Impact des synthèses obsolètes sur la fiabilité des recommandations",
          },
        },
        required: ["top_actions", "cross_signals", "predictions", "health_overview", "narrative_brief", "stale_synthesis_impact"],
        additionalProperties: false,
      },
    },
    { functionName: FUNCTION_NAME, workspaceId }
  );

  return {
    intelligence: {
      ...result,
      generated_at: new Date().toISOString(),
    },
    raw: {
      leads_count: leads?.length || 0,
      opportunities_count: opportunities?.length || 0,
      projects_count: projects?.length || 0,
      today_tasks_count: todayTasks?.length || 0,
      overdue_tasks_count: overdueTasks?.length || 0,
      today_bookings_count: todayBookings?.length || 0,
      stale_count: staleCount,
      consulte_injected_count: consulteInjectedCount,
      sentinel_injected_count: topSentinel.length,
      overdue_ai_count: overdueAiCount,
      health_summary: healthResult.summary,
      pipeline_value: pipelineValue,
      weighted_value: weightedValue,
      win_rate: winRate,
      scoring: (scoringResult.scores || []).slice(0, 10),
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
