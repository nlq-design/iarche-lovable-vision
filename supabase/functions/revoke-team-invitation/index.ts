import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/teamAuth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Non autorisé" }, 401);

    const { invitation_id } = await req.json();
    if (!invitation_id) return jsonResponse({ error: "invitation_id requis" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabaseClient.auth.getUser();
    if (!userData?.user) return jsonResponse({ error: "Non autorisé" }, 401);

    const { data: inv } = await supabase
      .from("team_invitations")
      .select("workspace_id, accepted_at")
      .eq("id", invitation_id)
      .maybeSingle();
    if (!inv) return jsonResponse({ error: "Invitation introuvable" }, 404);
    if (inv.accepted_at) return jsonResponse({ error: "Invitation déjà acceptée" }, 400);

    const { data: isOwner } = await supabase.rpc("has_workspace_role", {
      p_workspace_id: inv.workspace_id, p_user_id: userData.user.id, p_min_role: "owner",
    });
    if (!isOwner) return jsonResponse({ error: "Réservé aux propriétaires" }, 403);

    const { error: delErr } = await supabase
      .from("team_invitations")
      .delete()
      .eq("id", invitation_id)
      .is("accepted_at", null);
    if (delErr) return jsonResponse({ error: delErr.message }, 500);

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
