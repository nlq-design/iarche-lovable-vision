// TODO Nick: replace with real Stripe keys from Supabase secrets.
// M2 Phase 3 — Stripe Webhook (verify_jwt = false, signature HMAC validée in-code)
// Pattern: std@0.190.0 + supabase-js@2.49.1 + service_role + corsHeaders inline

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

serve(async (req) => {
  // (a) CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // (b) Raw body + signature
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // (c) Vérif signature
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe-webhook] Invalid signature:", msg);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // (d) Idempotence via INSERT + 23505
  const { error: insertErr } = await supabase
    .from("stripe_events")
    .insert({
      stripe_event_id: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });

  if (insertErr) {
    // PostgreSQL unique violation = duplicate event
    // @ts-ignore — code present on PostgrestError
    if (insertErr.code === "23505") {
      console.log(`[stripe-webhook] duplicate event ${event.id} (${event.type})`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("[stripe-webhook] insert stripe_events failed:", insertErr);
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // (e) Dispatch
  try {
    console.log(`[stripe-webhook] processing ${event.type} (${event.id})`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!session.subscription) break;

        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subId);

        const meta = subscription.metadata || {};
        const workspace_id = meta.workspace_id as string | undefined;
        const plan_id = meta.plan_id as string | undefined;
        const user_id = meta.user_id as string | undefined;

        if (!workspace_id || !plan_id || !user_id) {
          console.warn(
            `[stripe-webhook] checkout.session.completed missing metadata for sub ${subId}`,
          );
          break;
        }

        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const { error: subInsErr } = await supabase.from("subscriptions").insert({
          workspace_id,
          plan_id,
          user_id,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });

        if (subInsErr) {
          // @ts-ignore
          if (subInsErr.code !== "23505") {
            console.error("[stripe-webhook] insert subscription error:", subInsErr);
            throw subInsErr;
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const meta = subscription.metadata || {};
        const workspace_id = meta.workspace_id as string | undefined;
        const plan_id = meta.plan_id as string | undefined;
        const user_id = meta.user_id as string | undefined;

        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const { error: upErr } = await supabase
          .from("subscriptions")
          .upsert(
            {
              workspace_id,
              plan_id,
              user_id,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: customerId,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              canceled_at: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000).toISOString()
                : null,
              trial_end: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "stripe_subscription_id" },
          );

        if (upErr) {
          console.error("[stripe-webhook] upsert subscription error:", upErr);
          throw upErr;
        }

        // Sync workspace cached fields via plan slug
        if (workspace_id) {
          // Resolve plan_slug
          let resolvedPlanId = plan_id;
          if (!resolvedPlanId) {
            const { data: subRow } = await supabase
              .from("subscriptions")
              .select("plan_id")
              .eq("stripe_subscription_id", subscription.id)
              .maybeSingle();
            resolvedPlanId = subRow?.plan_id ?? undefined;
          }

          let plan_slug: string | null = null;
          if (resolvedPlanId) {
            const { data: planRow } = await supabase
              .from("plans")
              .select("slug")
              .eq("id", resolvedPlanId)
              .maybeSingle();
            plan_slug = planRow?.slug ?? null;
          }

          const { error: wsErr } = await supabase
            .from("workspaces")
            .update({
              subscription_tier: plan_slug,
              billing_status: subscription.status,
            })
            .eq("id", workspace_id);

          if (wsErr) {
            console.error("[stripe-webhook] update workspace error:", wsErr);
            throw wsErr;
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { error: subUpdErr } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            canceled_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (subUpdErr) {
          console.error("[stripe-webhook] update subscription canceled error:", subUpdErr);
          throw subUpdErr;
        }

        const { data: subRow } = await supabase
          .from("subscriptions")
          .select("workspace_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (subRow?.workspace_id) {
          const { error: wsErr } = await supabase
            .from("workspaces")
            .update({
              subscription_tier: null,
              billing_status: "canceled",
            })
            .eq("id", subRow.workspace_id);

          if (wsErr) {
            console.error("[stripe-webhook] workspace cancel sync error:", wsErr);
            throw wsErr;
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        if (customerId) {
          const { error: wsErr } = await supabase
            .from("workspaces")
            .update({ billing_status: "past_due" })
            .eq("stripe_customer_id", customerId);

          if (wsErr) {
            console.error("[stripe-webhook] workspace past_due sync error:", wsErr);
            throw wsErr;
          }
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] unhandled event type: ${event.type}`);
    }

    // (f) Mark processed
    await supabase
      .from("stripe_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);

    // (g) Return
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[stripe-webhook] handler error for ${event.type}:`, msg);

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
