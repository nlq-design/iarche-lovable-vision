// M5.4 — Cancel subscription at period end (idempotent)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const stripe = new Stripe(
  Deno.env.get("STRIPE_SECRET_KEY") || "sk_test_placeholder",
  { apiVersion: "2024-04-10" },
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const { workspace_id, reason } = body as { workspace_id?: string; reason?: string };

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "Missing workspace_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: member } = await supabase
      .from("workspace_members")
      .select("id, role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: "Not a member of this workspace" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("id, stripe_subscription_id, cancel_at_period_end, current_period_end, status")
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subErr || !sub) {
      return new Response(JSON.stringify({ error: "No active subscription found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency
    if (sub.cancel_at_period_end === true) {
      return new Response(
        JSON.stringify({
          canceled_at_period_end: true,
          period_end: sub.current_period_end,
          already_scheduled: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!sub.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: "Subscription has no Stripe id" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedFeedback = new Set([
      "customer_service",
      "low_quality",
      "missing_features",
      "other",
      "switched_service",
      "too_complex",
      "too_expensive",
      "unused",
    ]);
    const feedback = allowedFeedback.has(reason ?? "") ? reason : "other";

    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
      cancellation_details: { feedback: feedback as any },
    });

    await supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("id", sub.id);

    await supabase.from("subscription_changes").insert({
      workspace_id,
      subscription_id: sub.id,
      change_type: "canceled",
      metadata: { reason: reason ?? "other", source: "stripe-cancel", user_id: user.id },
    });

    return new Response(
      JSON.stringify({
        canceled_at_period_end: true,
        period_end: updated.current_period_end
          ? new Date(updated.current_period_end * 1000).toISOString()
          : sub.current_period_end,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[stripe-cancel] error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
