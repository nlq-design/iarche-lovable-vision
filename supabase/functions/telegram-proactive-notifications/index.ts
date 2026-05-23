import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

// Default chat ID for notifications (admin)
const DEFAULT_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") || "";

interface NotificationPayload {
  type: "new_lead" | "new_booking" | "task_reminder" | "morning_briefing" | "content_gap_alert";
  entity_id?: string;
  entity_type?: string;
  data?: Record<string, unknown>;
  chat_id?: string;
}

// deno-lint-ignore no-explicit-any
type SupabaseClientAny = any;

async function sendTelegramMessage(chatId: string, text: string, parseMode = "HTML"): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });
    
    const result = await response.json();
    if (!result.ok) {
      console.error("Telegram send error:", result);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Telegram send exception:", error);
    return false;
  }
}

async function checkAlreadySent(
  supabase: SupabaseClientAny,
  chatId: string,
  notificationType: string,
  entityId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("telegram_sent_notifications")
    .select("id")
    .eq("chat_id", chatId)
    .eq("notification_type", notificationType)
    .eq("entity_id", entityId)
    .maybeSingle();
  
  return !!data;
}

async function markAsSent(
  supabase: SupabaseClientAny,
  chatId: string,
  notificationType: string,
  entityType: string,
  entityId: string
): Promise<void> {
  await supabase.from("telegram_sent_notifications").insert({
    chat_id: chatId,
    notification_type: notificationType,
    entity_type: entityType,
    entity_id: entityId,
  });
}

async function getActiveNotificationPrefs(supabase: SupabaseClientAny) {
  const { data } = await supabase
    .from("telegram_notification_preferences")
    .select("*")
    .eq("is_active", true);
  
  return data || [];
}

// ============ NOTIFICATION HANDLERS ============

async function handleNewLead(supabase: SupabaseClientAny, leadId: string, chatId: string): Promise<string> {
  const alreadySent = await checkAlreadySent(supabase, chatId, "new_lead", leadId);
  if (alreadySent) return "Notification déjà envoyée";

  const { data: lead } = await supabase
    .from("leads")
    .select("id, name, email, company, source, created_at, phone, message")
    .eq("id", leadId)
    .single();

  if (!lead) return "Lead non trouvé";

  const leadMessage = lead.message as string | null;
  const message = `🆕 <b>Nouveau Lead !</b>

👤 <b>${lead.name}</b>
${lead.company ? `🏢 ${lead.company}` : ""}
📧 ${lead.email}
${lead.phone ? `📱 ${lead.phone}` : ""}
📍 Source: ${lead.source}

${leadMessage ? `💬 Message:\n<i>${leadMessage.slice(0, 200)}${leadMessage.length > 200 ? "..." : ""}</i>` : ""}

🔗 <a href="https://iarche.fr/cockpit/leads">Voir dans le Cockpit</a>`;

  const sent = await sendTelegramMessage(chatId, message);
  if (sent) {
    await markAsSent(supabase, chatId, "new_lead", "lead", leadId);
    return "Notification envoyée";
  }
  return "Échec d'envoi";
}

async function handleNewBooking(supabase: SupabaseClientAny, bookingId: string, chatId: string): Promise<string> {
  const alreadySent = await checkAlreadySent(supabase, chatId, "new_booking", bookingId);
  if (alreadySent) return "Notification déjà envoyée";

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, name, email, company, start_time, end_time, message, status, booking_type_id")
    .eq("id", bookingId)
    .single();

  if (!booking) return "Booking non trouvé";

  // Fetch booking type separately
  let bookingTypeName = "RDV";
  let durationMinutes = 60;
  if (booking.booking_type_id) {
    const { data: bookingType } = await supabase
      .from("booking_types")
      .select("name, duration_minutes")
      .eq("id", booking.booking_type_id)
      .single();
    if (bookingType) {
      bookingTypeName = bookingType.name;
      durationMinutes = bookingType.duration_minutes;
    }
  }

  const startDate = new Date(booking.start_time as string);
  const dateStr = startDate.toLocaleDateString("fr-FR", { 
    weekday: "long", 
    day: "numeric", 
    month: "long" 
  });
  const timeStr = startDate.toLocaleTimeString("fr-FR", { 
    hour: "2-digit", 
    minute: "2-digit" 
  });

  const bookingMessage = booking.message as string | null;

  const message = `📅 <b>Nouveau RDV réservé !</b>

👤 <b>${booking.name}</b>
${booking.company ? `🏢 ${booking.company}` : ""}
📧 ${booking.email}

📆 ${dateStr}
🕐 ${timeStr} (${durationMinutes} min)
📋 Type: ${bookingTypeName}

${bookingMessage ? `💬 Note:\n<i>${bookingMessage.slice(0, 150)}${bookingMessage.length > 150 ? "..." : ""}</i>` : ""}

🔗 <a href="https://iarche.fr/cockpit/agenda">Voir l'agenda</a>`;

  const sent = await sendTelegramMessage(chatId, message);
  if (sent) {
    await markAsSent(supabase, chatId, "new_booking", "booking", bookingId);
    return "Notification envoyée";
  }
  return "Échec d'envoi";
}

async function handleTaskReminder(supabase: SupabaseClientAny, taskId: string, chatId: string): Promise<string> {
  const alreadySent = await checkAlreadySent(supabase, chatId, "task_reminder", taskId);
  if (alreadySent) return "Notification déjà envoyée";

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, description, due_date, due_time, priority, status, lead_id, project_id")
    .eq("id", taskId)
    .single();

  if (!task) return "Tâche non trouvée";

  const priorityEmoji: Record<string, string> = {
    high: "🔴",
    medium: "🟡",
    low: "🟢",
  };

  // Fetch lead and project info separately
  let leadName = "";
  let leadCompany = "";
  let projectName = "";

  if (task.lead_id) {
    const { data: lead } = await supabase
      .from("leads")
      .select("name, company")
      .eq("id", task.lead_id)
      .single();
    if (lead) {
      leadName = lead.name;
      leadCompany = lead.company || "";
    }
  }

  if (task.project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", task.project_id)
      .single();
    if (project) {
      projectName = project.name;
    }
  }

  const taskDescription = task.description as string | null;
  const taskPriority = task.priority as string;

  const message = `⏰ <b>Rappel de tâche</b>

${priorityEmoji[taskPriority] || "📌"} <b>${task.title}</b>

${taskDescription ? `📝 ${taskDescription.slice(0, 150)}${taskDescription.length > 150 ? "..." : ""}` : ""}
${task.due_time ? `🕐 À faire à ${task.due_time}` : ""}
${leadName ? `👤 Lead: ${leadName}${leadCompany ? ` (${leadCompany})` : ""}` : ""}
${projectName ? `📁 Projet: ${projectName}` : ""}

🔗 <a href="https://iarche.fr/cockpit/taches">Voir les tâches</a>`;

  const sent = await sendTelegramMessage(chatId, message);
  if (sent) {
    await markAsSent(supabase, chatId, "task_reminder", "task", taskId);
    return "Notification envoyée";
  }
  return "Échec d'envoi";
}

async function handleMorningBriefing(supabase: SupabaseClientAny, chatId: string): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const briefingKey = `briefing_${today}`;
  
  const alreadySent = await checkAlreadySent(supabase, chatId, "morning_briefing", briefingKey);
  if (alreadySent) return "Briefing déjà envoyé aujourd'hui";

  // Fetch today's data
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Leads des dernières 24h
  const { data: recentLeads } = await supabase
    .from("leads")
    .select("id, name, company, source, lead_score")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(5);

  // Leads chauds (score >= 70)
  const { data: hotLeads } = await supabase
    .from("leads")
    .select("id, name, company, lead_score, last_contacted_at")
    .gte("lead_score", 70)
    .order("lead_score", { ascending: false })
    .limit(5);

  // RDV aujourd'hui
  const { data: todayBookings } = await supabase
    .from("bookings")
    .select("id, name, company, start_time, booking_type_id")
    .gte("start_time", todayStart.toISOString())
    .lte("start_time", todayEnd.toISOString())
    .eq("status", "confirmed")
    .order("start_time", { ascending: true });

  // Tâches du jour
  const { data: todayTasks } = await supabase
    .from("tasks")
    .select("id, title, priority, due_time")
    .eq("due_date", today)
    .eq("status", "pending")
    .order("priority", { ascending: true })
    .limit(10);

  // Opportunités à risque
  const { data: atRiskOpps } = await supabase
    .from("opportunities")
    .select("id, title, value_amount, stage, expected_close_date")
    .lt("expected_close_date", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
    .not("stage", "in", "(closed_won,lost)")
    .limit(5);

  // Build briefing message
  let message = `☀️ <b>Briefing du ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</b>\n\n`;

  // Today's bookings
  if (todayBookings && todayBookings.length > 0) {
    message += `📅 <b>RDV aujourd'hui (${todayBookings.length})</b>\n`;
    for (const b of todayBookings) {
      const time = new Date(b.start_time as string).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      message += `  • ${time} - ${b.name}${b.company ? ` (${b.company})` : ""}\n`;
    }
    message += "\n";
  } else {
    message += `📅 <i>Pas de RDV aujourd'hui</i>\n\n`;
  }

  // Today's tasks
  if (todayTasks && todayTasks.length > 0) {
    message += `✅ <b>Tâches du jour (${todayTasks.length})</b>\n`;
    const priorityOrder: Record<string, number> = { high: 1, medium: 2, low: 3 };
    const sortedTasks = [...todayTasks].sort((a, b) => 
      (priorityOrder[a.priority as string] || 3) - 
      (priorityOrder[b.priority as string] || 3)
    );
    for (const t of sortedTasks.slice(0, 5)) {
      const taskPriority = t.priority as string;
      const emoji = taskPriority === "high" ? "🔴" : taskPriority === "medium" ? "🟡" : "🟢";
      message += `  ${emoji} ${t.title}${t.due_time ? ` (${t.due_time})` : ""}\n`;
    }
    if (todayTasks.length > 5) message += `  <i>+ ${todayTasks.length - 5} autres</i>\n`;
    message += "\n";
  }

  // Hot leads
  if (hotLeads && hotLeads.length > 0) {
    message += `🔥 <b>Leads chauds (score ≥70)</b>\n`;
    for (const l of hotLeads.slice(0, 3)) {
      message += `  • ${l.name}${l.company ? ` (${l.company})` : ""} - Score: ${l.lead_score}\n`;
    }
    message += "\n";
  }

  // Recent leads
  if (recentLeads && recentLeads.length > 0) {
    message += `🆕 <b>Nouveaux leads (24h)</b>\n`;
    for (const l of recentLeads.slice(0, 3)) {
      message += `  • ${l.name}${l.company ? ` (${l.company})` : ""} via ${l.source}\n`;
    }
    message += "\n";
  }

  // At-risk opportunities
  if (atRiskOpps && atRiskOpps.length > 0) {
    message += `⚠️ <b>Opportunités à surveiller</b>\n`;
    for (const o of atRiskOpps) {
      const closeDate = new Date(o.expected_close_date as string).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      message += `  • ${o.title} - ${o.value_amount ? o.value_amount + "€" : "?"} - Clôture ${closeDate}\n`;
    }
    message += "\n";
  }

  message += `\n🔗 <a href="https://iarche.fr/cockpit">Ouvrir le Cockpit</a>`;

  const sent = await sendTelegramMessage(chatId, message);
  if (sent) {
    await markAsSent(supabase, chatId, "morning_briefing", "system", briefingKey);
    return "Briefing envoyé";
  }
  return "Échec d'envoi du briefing";
}

// ============ CRON HANDLERS ============

async function checkDueTaskReminders(supabase: SupabaseClientAny, chatId: string): Promise<{ sent: number; skipped: number }> {
  // Find tasks due in the next hour that haven't been reminded
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  
  const today = now.toISOString().split("T")[0];
  const currentTime = now.toTimeString().slice(0, 5);
  const oneHourLater = inOneHour.toTimeString().slice(0, 5);

  const { data: dueTasks } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("due_date", today)
    .eq("status", "pending")
    .gte("due_time", currentTime)
    .lte("due_time", oneHourLater);

  let sent = 0;
  let skipped = 0;

  for (const task of dueTasks || []) {
    const taskId = task.id as string;
    const alreadySent = await checkAlreadySent(supabase, chatId, "task_reminder", taskId);
    if (alreadySent) {
      skipped++;
      continue;
    }
    
    await handleTaskReminder(supabase, taskId, chatId);
    sent++;
  }

  return { sent, skipped };
}

async function checkMorningBriefingTime(supabase: SupabaseClientAny): Promise<{ sent: number }> {
  const prefs = await getActiveNotificationPrefs(supabase);
  let sent = 0;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  for (const pref of prefs) {
    if (!pref.notify_morning_briefing) continue;
    
    const briefingTimeStr = (pref.briefing_time || "08:00") as string;
    const [briefingHour, briefingMinute] = briefingTimeStr.split(":").map(Number);
    
    // Check if within 5 minute window of briefing time
    if (currentHour === briefingHour && Math.abs(currentMinute - briefingMinute) <= 5) {
      const chatId = pref.telegram_chat_id as string;
      const result = await handleMorningBriefing(supabase, chatId);
      if (result === "Briefing envoyé") sent++;
    }
  }

  return { sent };
}

// ============ MAIN HANDLER ============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const body = await req.json() as NotificationPayload & { action?: string };
    const chatId = body.chat_id || DEFAULT_CHAT_ID;

    if (!chatId) {
      return new Response(
        JSON.stringify({ error: "No chat_id configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle cron-style actions
    if (body.action === "check_task_reminders") {
      const result = await checkDueTaskReminders(supabase, chatId);
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.action === "check_morning_briefing") {
      const result = await checkMorningBriefingTime(supabase);
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.action === "send_morning_briefing") {
      const result = await handleMorningBriefing(supabase, chatId);
      return new Response(
        JSON.stringify({ success: true, message: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle direct notifications
    let result: string;

    switch (body.type) {
      case "new_lead":
        if (!body.entity_id) throw new Error("entity_id required for new_lead");
        result = await handleNewLead(supabase, body.entity_id, chatId);
        break;

      case "new_booking":
        if (!body.entity_id) throw new Error("entity_id required for new_booking");
        result = await handleNewBooking(supabase, body.entity_id, chatId);
        break;

      case "task_reminder":
        if (!body.entity_id) throw new Error("entity_id required for task_reminder");
        result = await handleTaskReminder(supabase, body.entity_id, chatId);
        break;

      case "morning_briefing":
        result = await handleMorningBriefing(supabase, chatId);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown notification type: ${body.type}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`[ProactiveNotif] ${body.type} → ${result}`);

    return new Response(
      JSON.stringify({ success: true, message: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ProactiveNotif] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
