import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getEmailHeader, getEmailFooter, wrapEmailContent, getCtaButton, getSignature, EMAIL_COLORS } from "../_shared/emailTemplate.ts";
import { logEmail } from "../_shared/emailLogger.ts";

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
      .select("id, name, slug, email, user_id, workspace_id")
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

    // QW#10 B1 — Scope rôle au workspace du partner (anti fuite cross-tenant)
    const partnerWorkspaceId = (partner as any).workspace_id;
    if (partnerWorkspaceId) {
      const { data: canAccess, error: accessError } = await supabase.rpc(
        'can_access_entity_workspace',
        { p_workspace_id: partnerWorkspaceId, p_user_id: userData.user.id }
      );
      if (accessError || !canAccess) {
        console.warn('[invite-partner] cross-tenant blocked', {
          user_id: userData.user.id,
          partner_id,
          partner_workspace_id: partnerWorkspaceId,
          error: accessError?.message,
        });
        return new Response(JSON.stringify({ error: "Accès refusé à ce workspace" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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

    // Build email content using shared templates (charte graphique v4.0)
    const emailSubject = `Invitation à rejoindre l'Espace Partenaire IArche`;
    const header = getEmailHeader("🤝 Invitation Partenaire");
    const footer = getEmailFooter();
    
    const emailContent = `
      <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin: 0 0 16px 0;">
        Bonjour <strong style="color: ${EMAIL_COLORS.nightBlue};">${partner.name}</strong> 👋
      </p>
      
      <p style="color: ${EMAIL_COLORS.textGray}; font-size: 15px; margin: 0 0 20px 0;">
        Vous avez été invité(e) à rejoindre l'<strong>Espace Partenaire IArche</strong>.
      </p>
      
      <div style="background-color: ${EMAIL_COLORS.offWhite}; border-left: 4px solid ${EMAIL_COLORS.terracotta}; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <p style="color: ${EMAIL_COLORS.textGray}; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">
          Cet espace vous permettra de :
        </p>
        <ul style="color: ${EMAIL_COLORS.textGray}; font-size: 14px; margin: 8px 0 0 0; padding-left: 20px;">
          <li style="margin-bottom: 4px;">Suivre vos missions et projets en cours</li>
          <li style="margin-bottom: 4px;">Accéder aux documents partagés</li>
          <li style="margin-bottom: 4px;">Consulter les annonces de l'équipe</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 28px 0;">
        ${getCtaButton("Créer mon compte partenaire", inviteUrl, "primary")}
      </div>
      
      <p style="color: ${EMAIL_COLORS.mutedGray}; font-size: 13px; background-color: #FEF3C7; padding: 12px 16px; border-radius: 8px; margin: 20px 0;">
        ⚠️ Ce lien expire dans <strong>7 jours</strong>. Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
      </p>
      
      ${getSignature()}
    `;

    const emailHtml = wrapEmailContent(header, emailContent, footer);

    // Send invitation email using verified domain iarche.fr
    try {
      const emailResponse = await resend.emails.send({
        from: "IArche <contact@iarche.fr>",
        to: [email],
        subject: emailSubject,
        html: emailHtml,
      });

      console.log("Email sent successfully:", emailResponse);

      // Log successful email
      await logEmail({
        recipient_email: email,
        subject: emailSubject,
        source_type: "partner_invitation",
        email_type: "user_confirmation",
        source_id: invitation.id,
        status: "sent",
        metadata: {
          partner_id,
          partner_name: partner.name,
          invitation_id: invitation.id,
        },
      });

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
    } catch (emailError: any) {
      console.error("Failed to send email:", emailError);
      
      // Log failed email
      await logEmail({
        recipient_email: email,
        subject: emailSubject,
        source_type: "partner_invitation",
        email_type: "user_confirmation",
        source_id: invitation.id,
        status: "failed",
        error_message: emailError.message || "Unknown error",
        metadata: {
          partner_id,
          partner_name: partner.name,
          invitation_id: invitation.id,
        },
      });

      // Invitation created but email failed - return partial success
      return new Response(
        JSON.stringify({ 
          success: false, 
          warning: "Invitation créée mais l'email n'a pas pu être envoyé",
          error: emailError.message,
          invitation_id: invitation.id 
        }),
        {
          status: 207, // Multi-Status
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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
