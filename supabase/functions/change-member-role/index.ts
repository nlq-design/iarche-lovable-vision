import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse, authenticateOwner, countOwners } from "../_shared/teamAuth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { workspace_id, user_id, role } = await req.json();
    if (!workspace_id || !user_id || !role) return jsonResponse({ error: "workspace_id, user_id, role requis" }, 400);
    if (!["owner", "editor", "viewer"].includes(role)) return jsonResponse({ error: "Rôle invalide" }, 400);

    const auth = await authenticateOwner(req, workspace_id);
    if ("error" in auth) return auth.error;
    const { supabase, userId } = auth;

    // current member
    const { data: member } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user_id)
      .maybeSingle();
    if (!member) return jsonResponse({ error: "Membre introuvable" }, 404);

    // prevent removing last owner
    if (member.role === "owner" && role !== "owner") {
      const owners = await countOwners(supabase, workspace_id);
      if (owners <= 1) return jsonResponse({ error: "Impossible de rétrograder le dernier propriétaire" }, 400);
    }

    const { error: updErr } = await supabase
      .from("workspace_members")
      .update({ role })
      .eq("workspace_id", workspace_id)
      .eq("user_id", user_id);
    if (updErr) return jsonResponse({ error: updErr.message }, 500);

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
