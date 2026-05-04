import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, password } = await req.json();
    if (!token) return json({ error: "Token requis" }, 400);

    // Try to read JWT
    let authenticatedUserId: string | null = null;
    let authenticatedEmail: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await supabaseClient.auth.getUser();
      if (userData?.user) {
        authenticatedUserId = userData.user.id;
        authenticatedEmail = userData.user.email ?? null;
      }
    }

    const { data: invitation, error: invErr } = await supabase
      .from("team_invitations")
      .select("id, workspace_id, email, role, expires_at, accepted_at, invited_by")
      .eq("token", token)
      .maybeSingle();
    if (invErr || !invitation) return json({ error: "Invitation invalide ou introuvable" }, 404);
    if (invitation.accepted_at) return json({ error: "Cette invitation a déjà été acceptée" }, 400);
    if (new Date(invitation.expires_at) < new Date()) return json({ error: "Cette invitation a expiré" }, 400);

    let userId: string;

    if (authenticatedUserId) {
      // Logged-in flow
      userId = authenticatedUserId;
    } else {
      if (!password || password.length < 8) return json({ error: "Mot de passe requis (min. 8 caractères)" }, 400);
      const { data: usersList } = await supabase.auth.admin.listUsers();
      const existing = usersList?.users?.find((u) => u.email?.toLowerCase() === invitation.email.toLowerCase());
      if (existing) return json({ error: "Un compte existe déjà avec cet email. Veuillez vous connecter." }, 400);
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: invitation.email, password, email_confirm: true,
      });
      if (createErr || !newUser.user) {
        console.error("[accept-team-invitation] create user failed:", createErr);
        return json({ error: "Erreur lors de la création du compte" }, 500);
      }
      userId = newUser.user.id;
      await supabase.from("user_roles").insert({ user_id: userId, role: "cockpit_user" });
    }

    // Insert workspace_members
    const { error: memberErr } = await supabase.from("workspace_members").insert({
      workspace_id: invitation.workspace_id,
      user_id: userId,
      role: invitation.role,
      invited_by: invitation.invited_by,
      status: "active",
    });
    if (memberErr && !memberErr.message?.includes("duplicate")) {
      console.error("[accept-team-invitation] member insert failed:", memberErr);
      return json({ error: "Erreur lors de l'ajout au workspace" }, 500);
    }

    // Mark accepted (service role bypasses RLS)
    await supabase.from("team_invitations").update({ accepted_at: new Date().toISOString() }).eq("id", invitation.id);

    return json({
      success: true,
      email: invitation.email,
      workspace_id: invitation.workspace_id,
      message: "Invitation acceptée",
      created_account: !authenticatedUserId,
    });
  } catch (err) {
    console.error("[accept-team-invitation] error:", err);
    return json({ error: (err as Error).message || "Erreur interne" }, 500);
  }
});
