import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptInvitationRequest {
  token: string;
  password: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, password }: AcceptInvitationRequest = await req.json();

    if (!token || !password) {
      return new Response(JSON.stringify({ error: "Token et mot de passe requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Le mot de passe doit contenir au moins 8 caractères" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Processing invitation token:", token.substring(0, 8) + "...");

    // Find valid invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("partner_invitations")
      .select("id, partner_id, email, expires_at, accepted_at")
      .eq("token", token)
      .single();

    if (inviteError || !invitation) {
      console.error("Invitation not found:", inviteError);
      return new Response(JSON.stringify({ error: "Invitation invalide ou introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return new Response(JSON.stringify({ error: "Cette invitation a déjà été acceptée" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Cette invitation a expiré" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get partner info
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("id, name, user_id")
      .eq("id", invitation.partner_id)
      .is("deleted_at", null)
      .single();

    if (partnerError || !partner) {
      console.error("Partner not found:", partnerError);
      return new Response(JSON.stringify({ error: "Partenaire non trouvé" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if partner already has user
    if (partner.user_id) {
      return new Response(JSON.stringify({ error: "Ce partenaire a déjà un compte lié" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if email already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some(u => u.email === invitation.email);
    
    if (emailExists) {
      return new Response(JSON.stringify({ error: "Un compte existe déjà avec cet email. Veuillez vous connecter." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user account
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true, // Auto-confirm since they clicked the invitation link
      user_metadata: {
        partner_id: partner.id,
        partner_name: partner.name,
      },
    });

    if (createUserError || !newUser.user) {
      console.error("Failed to create user:", createUserError);
      return new Response(JSON.stringify({ error: "Erreur lors de la création du compte" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("User created:", newUser.user.id);

    // Assign 'partner' role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: "partner",
      });

    if (roleError) {
      console.error("Failed to assign role:", roleError);
      // Don't fail entirely, user is created
    }

    // Link user to partner profile
    const { error: linkError } = await supabase
      .from("partners")
      .update({ user_id: newUser.user.id })
      .eq("id", partner.id);

    if (linkError) {
      console.error("Failed to link partner:", linkError);
    }

    // Mark invitation as accepted
    await supabase
      .from("partner_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    console.log("Partner invitation accepted successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Compte créé avec succès",
        email: invitation.email 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in accept-partner-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur interne" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
