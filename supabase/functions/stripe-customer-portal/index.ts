// TODO Nick: replace with real Stripe keys from Supabase secrets.
// M2 Phase 3 — Stripe Customer Portal session
// Auth: verify_jwt = true + in-code JWT validation
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

interface PortalBody {
  workspace_id: string;
  return_url: string;
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

    // ---- Auth ----
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

    // ---- Body ----
    const body = (await req.json()) as Partial<PortalBody>;
    const { workspace_id, return_url } = body;

    if (!workspace_id || !return_url) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: workspace_id, return_url",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ---- Load workspace + stripe_customer_id ----
    const { data: workspace, error: wsErr } = await supabase
      .from("workspaces")
      .select("id, stripe_customer_id")
      .eq("id", workspace_id)
      .maybeSingle();

    if (wsErr || !workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!workspace.stripe_customer_id) {
      return new Response(
        JSON.stringify({
          error:
            "No Stripe customer associated with this workspace. Subscribe first.",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ---- Create Stripe Billing Portal session ----
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: workspace.stripe_customer_id,
      return_url,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe-customer-portal] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
