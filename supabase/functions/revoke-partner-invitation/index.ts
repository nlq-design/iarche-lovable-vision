import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse, authenticatePartnerOwner } from "../_shared/partnerAuth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { invitation_id } = await req.json();
    if (!invitation_id) return jsonResponse({ error: "invitation_id requis" }, 400);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: inv } = await supabaseAdmin
      .from("partner_invitations")
      .select("partner_id, accepted_at")
      .eq("id", invitation_id)
      .maybeSingle();
    if (!inv) return jsonResponse({ error: "Invitation introuvable" }, 404);
    if (inv.accepted_at) return jsonResponse({ error: "Invitation déjà acceptée" }, 400);

    const auth = await authenticatePartnerOwner(req, { partner_id: inv.partner_id });
    if ("error" in auth) return auth.error;
    const { supabase } = auth;

    const { error: delErr } = await supabase
      .from("partner_invitations")
      .delete()
      .eq("id", invitation_id)
      .is("accepted_at", null);
    if (delErr) return jsonResponse({ error: delErr.message }, 500);

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
