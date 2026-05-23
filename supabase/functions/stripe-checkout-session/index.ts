// TODO Nick: replace with real Stripe keys from Supabase secrets.
// M2 Phase 3 — Stripe Checkout Session
// Pattern: std@0.190.0 + supabase-js@2.49.1 + service_role + corsHeaders inline + auth.getUser inline

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// TODO Nick: replace with real Stripe keys from Supabase secrets.
const stripe = new Stripe(
  Deno.env.get("STRIPE_SECRET_KEY") || "sk_test_placeholder",
  { apiVersion: "2024-04-10" },
);

serve(async (req) => {
  // (a) CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // (b) Auth JWT inline
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

    // Body
    const { plan_slug, workspace_id, success_url, cancel_url, billing_period } = await req.json();
    if (!plan_slug || !workspace_id || !success_url || !cancel_url) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: plan_slug, workspace_id, success_url, cancel_url",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const period: "monthly" | "yearly" = billing_period === "yearly" ? "yearly" : "monthly";

    // (c) Vérif membre workspace
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!member) {
      return new Response(
        JSON.stringify({ error: "Not a member of this workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // (d) Plan actif
    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .select("*")
      .eq("slug", plan_slug)
      .eq("active", true)
      .maybeSingle();

    if (planErr || !plan) {
      return new Response(
        JSON.stringify({ error: "Plan inactive or not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const priceId = period === "yearly" ? plan.stripe_price_id_yearly : plan.stripe_price_id;
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `Plan has no stripe_price_id configured for ${period} billing` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    // (e) Récup ou création stripe_customer_id
    const { data: workspace, error: wsErr } = await supabase
      .from("workspaces")
      .select("id, name, stripe_customer_id")
      .eq("id", workspace_id)
      .maybeSingle();

    if (wsErr || !workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let stripeCustomerId = workspace.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          workspace_id,
          user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;

      const { error: updErr } = await supabase
        .from("workspaces")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", workspace_id);

      if (updErr) {
        console.error("[stripe-checkout-session] update workspace failed:", updErr);
        throw updErr;
      }
    }

    // (f) Création Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          workspace_id,
          plan_id: plan.id,
          plan_slug,
          billing_period: period,
          user_id: user.id,
        },
      },
      success_url,
      cancel_url,
      allow_promotion_codes: true,
    });

    // (g) Return
    return new Response(JSON.stringify({ checkout_url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe-checkout-session] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
