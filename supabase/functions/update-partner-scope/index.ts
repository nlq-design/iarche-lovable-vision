import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse, authenticatePartnerOwner } from "../_shared/partnerAuth.ts";

const ALLOWED_KEYS = ["leads", "projets", "documents", "transcriptions", "digest"] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { partner_id, scope } = await req.json();
    if (!partner_id) return jsonResponse({ error: "partner_id requis" }, 400);
    if (!scope || typeof scope !== "object" || Array.isArray(scope)) {
      return jsonResponse({ error: "scope doit être un objet" }, 400);
    }
    const cleaned: Record<string, boolean> = {};
    for (const k of ALLOWED_KEYS) {
      if (k in scope) cleaned[k] = Boolean((scope as any)[k]);
    }

    const auth = await authenticatePartnerOwner(req, { partner_id });
    if ("error" in auth) return auth.error;
    const { supabase } = auth;

    const { error: updErr } = await supabase
      .from("partners")
      .update({ scope: cleaned })
      .eq("id", partner_id);
    if (updErr) return jsonResponse({ error: updErr.message }, 500);
    return jsonResponse({ success: true, scope: cleaned });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
