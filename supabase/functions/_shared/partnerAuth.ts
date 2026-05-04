// Shared helpers for M7 partner admin endpoints
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Authenticate a partner-admin action.
 * Resolves the workspace either from supplied workspace_id or from the partner_id passed in.
 * Verifies caller is owner of that workspace.
 */
export async function authenticatePartnerOwner(
  req: Request,
  opts: { workspace_id?: string; partner_id?: string },
) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { error: jsonResponse({ error: "Non autorisé" }, 401) };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey);
  const supabaseClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabaseClient.auth.getUser();
  if (userErr || !userData.user) return { error: jsonResponse({ error: "Non autorisé" }, 401) };
  const authenticatedUserId = userData.user.id;

  let workspaceId = opts.workspace_id ?? null;
  if (!workspaceId && opts.partner_id) {
    const { data: p } = await supabase
      .from("partners")
      .select("workspace_id")
      .eq("id", opts.partner_id)
      .maybeSingle();
    if (!p) return { error: jsonResponse({ error: "Partenaire introuvable" }, 404) };
    workspaceId = (p as any).workspace_id;
  }
  if (!workspaceId) return { error: jsonResponse({ error: "workspace_id ou partner_id requis" }, 400) };

  const { data: isOwner } = await supabase.rpc("has_workspace_role", {
    p_workspace_id: workspaceId,
    p_user_id: authenticatedUserId,
    p_min_role: "owner",
  });
  if (!isOwner) return { error: jsonResponse({ error: "Réservé aux propriétaires" }, 403) };

  return { supabase, userId: authenticatedUserId, workspaceId };
}
