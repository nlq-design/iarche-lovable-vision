// TODO Nick: replace with real Stripe keys from Supabase secrets.
// M2 Phase 3 — Stripe Webhook handler
// Auth: verify_jwt = false (Stripe HMAC signature validation in-code)
// Pattern: std@0.190.0 + supabase-js@2.49.1 + service_role + inline corsHeaders
// Idempotency: dedupe via stripe_events.stripe_event_id UNIQUE

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// TODO Nick: replace with real Stripe keys from Supabase secrets.
const stripe = new Stripe(
  Deno.env.get("STRIPE_SECRET_KEY") || "sk_test_placeholder",
  { apiVersion: "2024-04-10" },
);

const WEBHOOK_SECRET =
  Deno.env.get("STRIPE_WEBHOOK_SECRET") || "whsec_placeholder";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Map Stripe subscription status → workspace billing_status
function mapBillingStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
    case "paused":
      return "incomplete";
    default:
      return "none";
  }
}

async function upsertSubscription(sub: Stripe.Subscription) {
  const workspace_id =
    (sub.metadata?.workspace_id as string | undefined) || null;
  const user_id = (sub.metadata?.user_id as string | undefined) || null;
  const plan_slug = (sub.metadata?.plan_slug as string | undefined) || null;

  if (!workspace_id || !user_id) {
    console.warn(
      `[stripe-webhook] subscription ${sub.id} missing workspace_id/user_id metadata, skipping upsert`,
    );
    return;
  }

  // Resolve plan_id from slug (or stripe_price_id fallback)
  const priceId = sub.items.data[0]?.price?.id || null;
  let planId: string | null = null;

  if (plan_slug) {
    const { data: planBySlug } = await supabase
      .from("plans")
      .select("id")
      .eq("slug", plan_slug)
      .maybeSingle();
    planId = planBySlug?.id ?? null;
  }
  if (!planId && priceId) {
    const { data: planByPrice } = await supabase
      .from("plans")
      .select("id")
      .eq("stripe_price_id", priceId)
      .maybeSingle();
    planId = planByPrice?.id ?? null;
  }

  if (!planId) {
    console.warn(
      `[stripe-webhook] cannot resolve plan_id for subscription ${sub.id}`,
    );
    return;
  }

  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;
  const periodStart = sub.current_period_start
    ? new Date(sub.current_period_start * 1000).toISOString()
    : null;
  const trialEnd = sub.trial_end
    ? new Date(sub.trial_end * 1000).toISOString()
    : null;
  const cancelAt = sub.cancel_at
    ? new Date(sub.cancel_at * 1000).toISOString()
    : null;

  // Upsert subscription on stripe_subscription_id
  const { error: subErr } = await supabase
    .from("subscriptions")
    .upsert(
      {
        workspace_id,
        user_id,
        plan_id: planId,
        stripe_subscription_id: sub.id,
        stripe_customer_id:
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
        status: sub.status,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        trial_end: trialEnd,
        cancel_at: cancelAt,
        cancel_at_period_end: sub.cancel_at_period_end,
      },
      { onConflict: "stripe_subscription_id" },
    );

  if (subErr) {
    console.error("[stripe-webhook] upsert subscription error:", subErr);
    throw subErr;
  }

  // Sync cached fields on workspace
  const { data: planRow } = await supabase
    .from("plans")
    .select("tier, slug")
    .eq("id", planId)
    .maybeSingle();

  const { error: wsErr } = await supabase
    .from("workspaces")
    .update({
      stripe_customer_id:
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
      subscription_tier: planRow?.tier ?? null,
      billing_status: mapBillingStatus(sub.status),
      trial_ends_at: trialEnd,
    })
    .eq("id", workspace_id);

  if (wsErr) {
    console.error("[stripe-webhook] update workspace error:", wsErr);
    throw wsErr;
  }
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspace_id =
        session.client_reference_id ||
        (session.metadata?.workspace_id as string | undefined);
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      if (workspace_id && customerId) {
        await supabase
          .from("workspaces")
          .update({ stripe_customer_id: customerId })
          .eq("id", workspace_id);
      }

      if (session.subscription) {
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        await upsertSubscription(sub);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await upsertSubscription(sub);
      break;
    }

    case "invoice.payment_succeeded":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        await upsertSubscription(sub);
      }
      break;
    }

    default:
      console.log(`[stripe-webhook] unhandled event type: ${event.type}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(
      JSON.stringify({ error: "Missing stripe-signature header" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      WEBHOOK_SECRET,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe-webhook] signature verification failed:", msg);
    return new Response(
      JSON.stringify({ error: `Webhook signature failed: ${msg}` }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ---- Idempotency: dedupe via stripe_events ----
  const { data: existing } = await supabase
    .from("stripe_events")
    .select("id, processed_at")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existing?.processed_at) {
    return new Response(
      JSON.stringify({ received: true, deduped: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (!existing) {
    const { error: insErr } = await supabase.from("stripe_events").insert({
      stripe_event_id: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });
    if (insErr) {
      console.error("[stripe-webhook] insert stripe_events error:", insErr);
      // Continue: another concurrent invocation may have inserted it.
    }
  }

  try {
    await handleEvent(event);

    await supabase
      .from("stripe_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe-webhook] handler error:", msg);

    await supabase
      .from("stripe_events")
      .update({ error_message: msg })
      .eq("stripe_event_id", event.id);

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
