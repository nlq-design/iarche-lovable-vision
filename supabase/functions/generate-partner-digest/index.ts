// Placeholder: M8 will implement real AI generation.
// For now, simply seeds a partner_digests row with status=pending.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { workspace_id, partner_id, week_start } = await req.json();
    if (!workspace_id || !week_start) {
      return json({ error: "workspace_id et week_start requis" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("partner_digests")
      .insert({
        workspace_id,
        partner_id: partner_id ?? null,
        week_start,
        content: { status: "pending", generated_at: null },
        sent_at: null,
      })
      .select("id")
      .single();
    if (error) return json({ error: error.message }, 500);

    return json({ success: true, digest_id: data.id, status: "pending" });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
