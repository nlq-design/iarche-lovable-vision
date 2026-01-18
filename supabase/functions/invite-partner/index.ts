import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitePartnerRequest {
  partner_id: string;
  email: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Service email non configuré" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Verify user has cockpit access
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user role directly (bypass MFA check for edge function)
    const { data: userRoles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

    if (roleError) {
      console.error("Error checking user roles:", roleError);
      return new Response(JSON.stringify({ error: "Erreur de vérification des droits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roles = userRoles?.map(r => r.role) || [];
    const hasCockpitRole = roles.some(r => ['cockpit_user', 'cockpit_admin', 'admin'].includes(r));
    
    if (!hasCockpitRole) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const { partner_id, email }: InvitePartnerRequest = await req.json();

    if (!partner_id || !email) {
      return new Response(JSON.stringify({ error: "partner_id et email requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Inviting partner ${partner_id} with email ${email}`);

    // Get partner info
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("id, name, slug, email, user_id")
      .eq("id", partner_id)
      .is("deleted_at", null)
      .single();

    if (partnerError || !partner) {
      console.error("Partner not found:", partnerError);
      return new Response(JSON.stringify({ error: "Partenaire non trouvé" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if partner already has a linked user
    if (partner.user_id) {
      return new Response(JSON.stringify({ error: "Ce partenaire a déjà un compte lié" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from("partner_invitations")
      .select("id, expires_at")
      .eq("partner_id", partner_id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingInvitation) {
      return new Response(JSON.stringify({ error: "Une invitation est déjà en attente pour ce partenaire" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate secure token
    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("partner_invitations")
      .insert({
        partner_id,
        email,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: userData.user.id,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Failed to create invitation:", inviteError);
      return new Response(JSON.stringify({ error: "Erreur lors de la création de l'invitation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update partner email if different
    if (partner.email !== email) {
      await supabase
        .from("partners")
        .update({ email })
        .eq("id", partner_id);
    }

    // Build invitation URL
    const baseUrl = Deno.env.get("SITE_URL") || "https://iarche-lovable-vision.lovable.app";
    const inviteUrl = `${baseUrl}/espace-partenaire/accepter/${token}`;

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: "IArche <noreply@iarche.com>",
      to: [email],
      subject: `Invitation à rejoindre l'Espace Partenaire IArche`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { font-size: 28px; font-weight: bold; color: #6366f1; }
            .content { background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 32px; }
            .button { display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
            .button:hover { background: #4f46e5; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; }
            .expiry { color: #ef4444; font-size: 14px; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">IArche</div>
            </div>
            <div class="content">
              <h1 style="margin-top: 0;">Bonjour ${partner.name} 👋</h1>
              <p>Vous avez été invité(e) à rejoindre l'<strong>Espace Partenaire IArche</strong>.</p>
              <p>Cet espace vous permettra de :</p>
              <ul>
                <li>Suivre vos missions et projets en cours</li>
                <li>Accéder aux documents partagés</li>
                <li>Consulter les annonces de l'équipe</li>
              </ul>
              <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">Créer mon compte partenaire</a>
              </div>
              <p class="expiry">⚠️ Ce lien expire dans 7 jours.</p>
            </div>
            <div class="footer">
              <p>Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.</p>
              <p>© ${new Date().getFullYear()} IArche - Tous droits réservés</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invitation envoyée à ${email}`,
        invitation_id: invitation.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in invite-partner:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur interne" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
