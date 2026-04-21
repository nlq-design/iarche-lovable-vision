// TODO Nick: replace with real Stripe keys from Supabase secrets.
// M2 Phase 3 — Stripe Checkout Session creation
// Auth: verify_jwt = true (handled by Supabase) + in-code JWT validation
// Pattern: std@0.190.0 + supabase-js@2.49.1 + service_role + inline corsHeaders

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

interface CheckoutBody {
  plan_slug: string;
  workspace_id: string;
  success_url: string;
  cancel_url: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Auth: validate JWT inline ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
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

    // ---- Body ----
    const body = (await req.json()) as Partial<CheckoutBody>;
    const { plan_slug, workspace_id, success_url, cancel_url } = body;

    if (!plan_slug || !workspace_id || !success_url || !cancel_url) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: plan_slug, workspace_id, success_url, cancel_url",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ---- Load plan ----
    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .select("id, slug, name, tier, stripe_price_id, active")
      .eq("slug", plan_slug)
      .maybeSingle();

    if (planErr || !plan) {
      return new Response(
        JSON.stringify({ error: `Plan '${plan_slug}' not found` }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!plan.stripe_price_id) {
      return new Response(
        JSON.stringify({
          error: `Plan '${plan_slug}' has no stripe_price_id configured`,
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ---- Load workspace + reuse stripe_customer_id if exists ----
    const { data: workspace, error: wsErr } = await supabase
      .from("workspaces")
      .select("id, name, stripe_customer_id, billing_owner_id")
      .eq("id", workspace_id)
      .maybeSingle();

    if (wsErr || !workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Create Stripe Checkout Session ----
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      customer: workspace.stripe_customer_id || undefined,
      customer_email: workspace.stripe_customer_id ? undefined : user.email,
      client_reference_id: workspace_id,
      success_url,
      cancel_url,
      metadata: {
        workspace_id,
        user_id: user.id,
        plan_id: plan.id,
        plan_slug: plan.slug,
        plan_tier: plan.tier,
      },
      subscription_data: {
        metadata: {
          workspace_id,
          user_id: user.id,
          plan_id: plan.id,
          plan_slug: plan.slug,
        },
      },
    });

    return new Response(
      JSON.stringify({ session_id: session.id, url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe-checkout-session] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
