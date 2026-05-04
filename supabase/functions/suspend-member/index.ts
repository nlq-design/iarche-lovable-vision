import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse, authenticateOwner } from "../_shared/teamAuth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { workspace_id, user_id } = await req.json();
    if (!workspace_id || !user_id) return jsonResponse({ error: "workspace_id et user_id requis" }, 400);
    const auth = await authenticateOwner(req, workspace_id);
    if ("error" in auth) return auth.error;
    const { supabase } = auth;

    const { error: updErr } = await supabase
      .from("workspace_members")
      .update({ status: "suspended", suspended_at: new Date().toISOString() })
      .eq("workspace_id", workspace_id)
      .eq("user_id", user_id);
    if (updErr) return jsonResponse({ error: updErr.message }, 500);
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
