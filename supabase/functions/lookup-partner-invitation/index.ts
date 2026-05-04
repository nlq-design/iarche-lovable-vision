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
    const { token } = await req.json();
    if (!token || typeof token !== "string") return json({ valid: false }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: inv } = await supabase
      .from("partner_invitations")
      .select("id, email, expires_at, accepted_at, partner_id")
      .eq("token", token)
      .maybeSingle();

    if (!inv) return json({ valid: false });
    if (inv.accepted_at) return json({ valid: false, already_accepted: true });
    if (new Date(inv.expires_at) < new Date()) return json({ valid: false, expired: true });

    const { data: partner } = await supabase
      .from("partners")
      .select("name, workspace_id")
      .eq("id", inv.partner_id)
      .maybeSingle();
    let workspaceName: string | null = null;
    if (partner?.workspace_id) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", partner.workspace_id)
        .maybeSingle();
      workspaceName = ws?.name ?? null;
    }

    return json({
      valid: true,
      email: inv.email,
      partner_name: partner?.name ?? null,
      workspace_name: workspaceName,
    });
  } catch (err) {
    console.error("[lookup-partner-invitation] error:", err);
    return json({ valid: false, error: (err as Error).message }, 500);
  }
});
