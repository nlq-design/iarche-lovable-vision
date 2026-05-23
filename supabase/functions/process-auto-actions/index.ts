/**
 * process-auto-actions — Phase IA-2J
 *
 * Cron (toutes les 5 min) : exécute les action_proposals dont
 * auto_execute_status='scheduled' et auto_execute_at <= now().
 * Délégue à execute-action-proposal (réutilise la logique existante).
 *
 * verify_jwt désactivé via config — appelé uniquement par pg_cron.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const startedAt = Date.now();
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  try {
    const { data: due, error } = await supabase
      .from("scheduled_auto_actions")
      .select("id, workspace_id, action_label")
      .limit(20);

    if (error) throw error;

    for (const p of due ?? []) {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/execute-action-proposal`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
          body: JSON.stringify({
            proposal_id: p.id,
            validation_notes: "[Auto-exécuté] confiance ≥ 0.85, aucune annulation pendant la période de grâce",
            source: "auto_action_cron",
          }),
        });
        const body = await resp.json().catch(() => ({}));
        if (!resp.ok || body?.error) {
          await supabase.from("action_proposals").update({
            auto_execute_status: "failed",
            validation_notes: `[Échec auto] ${body?.error ?? resp.statusText}`,
            updated_at: new Date().toISOString(),
          }).eq("id", p.id);
          results.push({ id: p.id, ok: false, error: body?.error ?? resp.statusText });
        } else {
          await supabase.from("action_proposals").update({
            auto_execute_status: "executed",
          }).eq("id", p.id);
          results.push({ id: p.id, ok: true });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ id: p.id, ok: false, error: msg });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        duration_ms: Date.now() - startedAt,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
