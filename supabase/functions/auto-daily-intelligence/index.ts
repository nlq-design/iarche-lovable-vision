import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startMs = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const workspaceId = "00000000-0000-0000-0000-000000000001";

  try {
    // Check if already generated today
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("daily_intelligence")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("generated_date", today)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Already generated today",
          existing_id: existing.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call cockpit-ai-copilot intelligence mode
    const { data: intelligenceResult, error: intelligenceError } =
      await supabase.functions.invoke("cockpit-ai-copilot", {
        body: { mode: "intelligence", workspaceId },
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
      });

    if (intelligenceError) {
      throw new Error(`Intelligence call failed: ${intelligenceError.message}`);
    }

    // Store in DB
    const generationMs = Date.now() - startMs;
    const { data: inserted, error: insertError } = await supabase
      .from("daily_intelligence")
      .insert({
        workspace_id: workspaceId,
        generated_date: today,
        intelligence: intelligenceResult.intelligence,
        raw_data: intelligenceResult.raw,
        consulte_count: intelligenceResult.raw?.stale_count || 0,
        generation_ms: generationMs,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    // Send Telegram notification with top 3 actions
    const topActions =
      intelligenceResult.intelligence?.top_actions?.slice(0, 3) || [];
    if (topActions.length > 0) {
      const urgencyEmojis: Record<string, string> = {
        critical: "🔴",
        high: "🟠",
        medium: "🔵",
        low: "⚪",
      };

      const briefLines = [
        `🧠 *Brief du ${new Date().toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}*`,
        "",
        `📊 Score santé: ${
          intelligenceResult.intelligence?.health_overview?.global_score || "?"
        }/100`,
        `📈 Momentum: ${
          intelligenceResult.intelligence?.health_overview?.pipeline_momentum ||
          "?"
        }`,
        "",
        "🎯 *Actions prioritaires :*",
      ];

      topActions.forEach((action: any, i: number) => {
        const emoji = urgencyEmojis[action.urgency] || "⚪";
        briefLines.push(`${emoji} ${i + 1}. ${action.action}`);
        if (action.reasoning) {
          briefLines.push(`   _${action.reasoning.slice(0, 100)}_`);
        }
      });

      const crossSignals =
        intelligenceResult.intelligence?.cross_signals?.slice(0, 2) || [];
      if (crossSignals.length > 0) {
        briefLines.push("");
        briefLines.push("🔗 *Signaux croisés :*");
        crossSignals.forEach((s: any) => {
          briefLines.push(`• ${s.signal}`);
        });
      }

      briefLines.push("");
      briefLines.push("_Ouvre le Cockpit pour voir les détails_");

      try {
        await supabase.functions.invoke("telegram-proactive-notifications", {
          body: {
            action: "send_morning_briefing",
            custom_message: briefLines.join("\n"),
          },
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
        });
        console.log("[auto-daily-intelligence] Telegram notification sent");
      } catch (telegramError) {
        console.warn(
          "[auto-daily-intelligence] Telegram notification failed:",
          telegramError
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: inserted.id,
        generation_ms: generationMs,
        top_actions_count: topActions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[auto-daily-intelligence] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
