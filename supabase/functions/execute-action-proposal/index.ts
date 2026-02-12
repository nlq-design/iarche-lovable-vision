/**
 * Execute Action Proposal - Runs validated AI-proposed actions
 * 
 * Supported action types:
 *   - create_task: Creates a task in the tasks table
 *   - update_lead: Updates lead fields
 *   - create_note: Creates an activity log note
 *   - schedule_meeting: Creates a booking
 *   - send_email: Placeholder for email sending
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceRole = token === serviceRoleKey;
    
    let userId: string;
    
    if (isServiceRole) {
      // Internal call (e.g., from Telegram webhook) — use system user
      const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
      const { data: owner } = await supabaseAdmin
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", "00000000-0000-0000-0000-000000000001")
        .eq("role", "owner")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      userId = owner?.user_id || "";
    } else {
      // Standard user auth
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
      userId = user.id;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    const { proposal_id, validation_notes, source } = await req.json();

    if (!proposal_id) {
      return new Response(JSON.stringify({ error: "proposal_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the proposal
    const { data: proposal, error: fetchError } = await supabase
      .from("action_proposals")
      .select("*")
      .eq("id", proposal_id)
      .single();

    if (fetchError || !proposal) {
      return new Response(JSON.stringify({ error: "Proposition introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Accept both "pending" (web) and "validated" (Telegram pre-validated) statuses
    const acceptableStatuses = ["pending", "validated"];
    if (!acceptableStatuses.includes(proposal.status)) {
      return new Response(JSON.stringify({ error: "Cette proposition a déjà été traitée" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Execute based on action_type
    let executionResult: Record<string, unknown> = {};

    switch (proposal.action_type) {
      case "create_task": {
        const payload = proposal.action_payload as Record<string, unknown>;
        const { data, error } = await supabase.from("tasks").insert({
          workspace_id: proposal.workspace_id,
          title: payload.title as string || proposal.action_label,
          description: payload.description as string || null,
          priority: payload.priority as string || "medium",
          status: "pending",
          lead_id: payload.lead_id as string || null,
          project_id: payload.project_id as string || null,
          assigned_to: userId,
        }).select("id").single();

        if (error) throw error;
        executionResult = { task_id: data.id, type: "task_created" };
        break;
      }

      case "update_lead": {
        const payload = proposal.action_payload as Record<string, unknown>;
        const leadId = payload.lead_id as string;
        if (!leadId) throw new Error("lead_id manquant dans le payload");

        // Only allow safe fields to be updated
        const safeFields = ["email", "phone", "company", "position", "industry",
          "company_size", "website", "city", "qualification_status", "siret"];
        const updates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(payload)) {
          if (safeFields.includes(key) && value !== undefined) {
            updates[key] = value;
          }
        }

        if (Object.keys(updates).length === 0) throw new Error("Aucun champ valide à mettre à jour");

        const { error } = await supabase.from("leads").update(updates).eq("id", leadId);
        if (error) throw error;
        executionResult = { lead_id: leadId, updated_fields: Object.keys(updates), type: "lead_updated" };
        break;
      }

      case "create_note": {
        const payload = proposal.action_payload as Record<string, unknown>;
        const { data, error } = await supabase.from("activity_log").insert({
          workspace_id: proposal.workspace_id,
          entity_type: payload.entity_type as string || "lead",
          entity_id: payload.entity_id as string || "",
          activity_type: "note",
          title: payload.title as string || proposal.action_label,
          content: payload.content as string || "",
          is_ai_generated: true,
          created_by: userId,
        }).select("id").single();

        if (error) throw error;
        executionResult = { note_id: data.id, type: "note_created" };
        break;
      }

      case "schedule_meeting": {
        const payload = proposal.action_payload as Record<string, unknown>;
        // Create a booking
        const { data: bookingType } = await supabase
          .from("booking_types")
          .select("id")
          .eq("is_active", true)
          .limit(1)
          .single();

        if (!bookingType) throw new Error("Aucun type de rendez-vous configuré");

        const startTime = payload.start_time as string || new Date().toISOString();
        const durationMinutes = payload.duration_minutes as number || 30;
        const endTime = new Date(new Date(startTime).getTime() + durationMinutes * 60000).toISOString();

        // meeting_type must be one of: visio, telephone, presentiel
        const rawMeetingType = (payload.meeting_type as string || "visio").toLowerCase();
        const allowedTypes = ["visio", "telephone", "presentiel"];
        const meetingType = allowedTypes.includes(rawMeetingType) ? rawMeetingType : "visio";

        const { data, error } = await supabase.from("bookings").insert({
          booking_type_id: bookingType.id,
          name: payload.name as string || "Rendez-vous IA",
          email: payload.email as string || "",
          start_time: startTime,
          end_time: endTime,
          message: payload.message as string || proposal.action_label,
          status: "confirmed",
          meeting_type: meetingType,
          lead_id: payload.lead_id as string || null,
          workspace_id: proposal.workspace_id,
        }).select("id").single();

        if (error) throw error;
        executionResult = { booking_id: data.id, type: "meeting_scheduled" };
        break;
      }

      case "send_email": {
        const payload = proposal.action_payload as Record<string, unknown>;
        const recipientEmail = payload.to as string || payload.email as string;
        if (!recipientEmail) throw new Error("Adresse email du destinataire manquante");

        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (!resendKey) throw new Error("RESEND_API_KEY non configurée");

        const emailSubject = payload.subject as string || proposal.action_label;
        const emailBody = payload.body as string || payload.content as string || "";
        const fromEmail = payload.from as string || "IArche CRM <crm@iarche.fr>";

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [recipientEmail],
            subject: emailSubject,
            html: emailBody,
          }),
        });

        if (!resendResponse.ok) {
          const errText = await resendResponse.text();
          throw new Error(`Échec envoi email: ${errText}`);
        }

        const resendData = await resendResponse.json();

        // Log to email_logs
        await supabase.from("email_logs").insert({
          email_type: "ai_action",
          source_type: "action_proposal",
          source_id: proposal_id,
          recipient_email: recipientEmail,
          subject: emailSubject,
          status: "sent",
          sent_at: new Date().toISOString(),
          metadata: { resend_id: resendData.id, ai_generated: true },
        });

        executionResult = { type: "email_sent", resend_id: resendData.id, to: recipientEmail };
        break;
      }

      default:
        throw new Error(`Type d'action non supporté: ${proposal.action_type}`);
    }

    // Update proposal status
    await supabase.from("action_proposals").update({
      status: "executed",
      validation_notes: validation_notes || null,
      executed_at: new Date().toISOString(),
      executed_result: executionResult,
      updated_at: new Date().toISOString(),
    }).eq("id", proposal_id);

    // Log the execution
    await supabase.from("activity_log").insert({
      workspace_id: proposal.workspace_id,
      entity_type: "action_proposal",
      entity_id: proposal_id,
      activity_type: "ai_action",
      title: `Action IA exécutée: ${proposal.action_label}`,
      content: JSON.stringify(executionResult),
      is_ai_generated: true,
      created_by: userId,
    });

    return new Response(JSON.stringify({
      success: true,
      result: executionResult,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Execute action error:", error);
    const message = error instanceof Error ? error.message : "Erreur interne";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
