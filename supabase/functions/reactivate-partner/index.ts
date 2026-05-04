import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse, authenticatePartnerOwner } from "../_shared/partnerAuth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { partner_id } = await req.json();
    if (!partner_id) return jsonResponse({ error: "partner_id requis" }, 400);
    const auth = await authenticatePartnerOwner(req, { partner_id });
    if ("error" in auth) return auth.error;
    const { supabase } = auth;

    const { error: updErr } = await supabase
      .from("partners")
      .update({ status: "active", suspended_at: null, is_active: true })
      .eq("id", partner_id);
    if (updErr) return jsonResponse({ error: updErr.message }, 500);
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
