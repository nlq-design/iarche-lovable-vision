import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Auto-Harvest Daily: CRON-triggered function that automatically processes
 * overdue AI-generated tasks older than 7 days.
 * 
 * Actions:
 * - Tasks > 30 days overdue → auto-archive
 * - Tasks 7-30 days overdue → reschedule +7 days (once only)
 * - Logs all actions for audit trail
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date();
  const stats = { archived: 0, rescheduled: 0, total_overdue: 0 };

  try {
    // Get workspace ID
    const { data: ws } = await supabase.from("workspaces").select("id").limit(1).single();
    const workspaceId = ws?.id;
    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "No workspace found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find overdue AI-generated tasks
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select("id, title, due_date, entity_type, entity_id, description, ai_metadata")
      .eq("ai_generated", true)
      .eq("status", "pending")
      .lt("due_date", sevenDaysAgo)
      .eq("workspace_id", workspaceId)
      .order("due_date", { ascending: true })
      .limit(50);

    if (!overdueTasks?.length) {
      return new Response(JSON.stringify({ message: "Aucune tâche IA en retard", ...stats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    stats.total_overdue = overdueTasks.length;
    console.log(`[auto-harvest] Found ${overdueTasks.length} overdue AI tasks`);

    const toArchive: string[] = [];
    const toReschedule: string[] = [];

    for (const task of overdueTasks) {
      const dueDate = new Date(task.due_date);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Check if already rescheduled by auto-harvest (via metadata)
      const alreadyRescheduled = task.ai_metadata?.auto_harvested;

      if (daysOverdue > 30 || alreadyRescheduled) {
        toArchive.push(task.id);
      } else {
        toReschedule.push(task.id);
      }
    }

    // Archive old tasks
    if (toArchive.length) {
      await supabase
        .from("tasks")
        .update({ status: "harvested" })
        .in("id", toArchive);
      stats.archived = toArchive.length;
      console.log(`[auto-harvest] Archived ${toArchive.length} tasks`);
    }

    // Reschedule recent tasks +7 days
    if (toReschedule.length) {
      const newDue = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      await supabase
        .from("tasks")
        .update({
          due_date: newDue,
          ai_metadata: { auto_harvested: true, rescheduled_at: now.toISOString() },
        })
        .in("id", toReschedule);
      stats.rescheduled = toReschedule.length;
      console.log(`[auto-harvest] Rescheduled ${toReschedule.length} tasks to ${newDue}`);
    }

    // Log activity
    await supabase.from("activity_log").insert({
      workspace_id: workspaceId,
      entity_type: "system",
      entity_id: "auto-harvest-daily",
      activity_type: "ai_action",
      title: `Récolte auto: ${stats.archived} archivées, ${stats.rescheduled} reportées`,
      content: `${stats.total_overdue} tâches IA en retard traitées automatiquement`,
      is_ai_generated: true,
    });

    return new Response(JSON.stringify({ message: "Récolte automatique terminée", ...stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[auto-harvest] Fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
