// Shared helpers for M7 admin endpoints
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

export async function authenticateOwner(req: Request, workspaceId: string) {
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

  const { data: isOwner } = await supabase.rpc("has_workspace_role", {
    p_workspace_id: workspaceId,
    p_user_id: userData.user.id,
    p_min_role: "owner",
  });
  if (!isOwner) return { error: jsonResponse({ error: "Réservé aux propriétaires" }, 403) };

  return { supabase, userId: userData.user.id };
}

export async function countOwners(supabase: any, workspaceId: string): Promise<number> {
  const { count } = await supabase
    .from("workspace_members")
    .select("user_id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("role", "owner")
    .eq("status", "active");
  return count || 0;
}
