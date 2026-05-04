import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getTeamInvitationEmail } from "../_shared/emailTemplate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabaseClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Non autorisé" }, 401);
    const authenticatedUserId = userData.user.id;

    const { workspace_id, email, role } = await req.json();
    if (!workspace_id || !email || !role) return json({ error: "workspace_id, email et role requis" }, 400);
    if (!["owner", "editor", "viewer"].includes(role)) return json({ error: "Rôle invalide" }, 400);

    const { data: isOwner } = await supabase.rpc("has_workspace_role", {
      _workspace_id: workspace_id, _user_id: authenticatedUserId, _role: "owner",
    });
    if (!isOwner) return json({ error: "Seul un propriétaire peut inviter" }, 403);

    // Check existing membership via auth admin lookup
    const { data: usersList } = await supabase.auth.admin.listUsers();
    const existingUser = usersList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      const { data: existingMember } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace_id)
        .eq("user_id", existingUser.id)
        .maybeSingle();
      if (existingMember) return json({ error: "Cet utilisateur est déjà membre" }, 400);
    }

    // Pending invitation
    const { data: pending } = await supabase
      .from("team_invitations")
      .select("id, expires_at")
      .eq("workspace_id", workspace_id)
      .eq("email", email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (pending) return json({ error: "Une invitation est déjà en attente pour cet email" }, 400);

    // Insert invitation (token + expires_at via DEFAULT)
    const { data: invitation, error: insertErr } = await supabase
      .from("team_invitations")
      .insert({ workspace_id, email, role, invited_by: authenticatedUserId })
      .select("id, token, expires_at")
      .single();
    if (insertErr || !invitation) {
      console.error("[invite-team-member] insert failed:", insertErr);
      return json({ error: "Erreur lors de la création de l'invitation" }, 500);
    }

    // Workspace name + inviter name
    const [{ data: workspace }, { data: profile }] = await Promise.all([
      supabase.from("workspaces").select("name").eq("id", workspace_id).single(),
      supabase.from("owner_profile").select("display_name").eq("user_id", authenticatedUserId).maybeSingle(),
    ]);
    const workspaceName = workspace?.name || "votre espace";
    const inviterName = profile?.display_name || userData.user.email || "Un membre de l'équipe";

    const baseUrl = Deno.env.get("SITE_URL") || "https://iarche.fr";
    const inviteUrl = `${baseUrl}/cockpit/invitation/accepter/${invitation.token}`;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return json({ success: true, invitation_id: invitation.id, warning: "Email non envoyé (service indisponible)" }, 207);
    }

    try {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: "IArche <contact@iarche.fr>",
        to: [email],
        subject: `Invitation à rejoindre ${workspaceName} sur IArche`,
        html: getTeamInvitationEmail(inviteUrl, workspaceName, inviterName, role),
      });
    } catch (err) {
      console.error("[invite-team-member] resend failed:", err);
      return json({ success: true, invitation_id: invitation.id, warning: "Invitation créée mais email non envoyé" }, 207);
    }

    return json({ success: true, invitation_id: invitation.id, message: `Invitation envoyée à ${email}` });
  } catch (err) {
    console.error("[invite-team-member] error:", err);
    return json({ error: (err as Error).message || "Erreur interne" }, 500);
  }
});
