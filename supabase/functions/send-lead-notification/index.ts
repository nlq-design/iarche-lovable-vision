import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { logEmail } from '../_shared/emailLogger.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// HTML escape function to prevent XSS
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface LeadNotificationRequest {
  lead_id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  source: string;
  source_context?: string;
  message?: string;
  event_details?: {
    date: string | null;
    location: string | null;
    heure_debut: string | null;
    type_evenement: string | null;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed, remaining } = await checkRateLimit(supabaseAdmin, clientIP, 'lead-notification', {
      maxRequests: 10,
      windowMinutes: 60
    });

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Trop de requêtes. Réessayez plus tard.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            ...getRateLimitHeaders(remaining, 10, 60)
          } 
        }
      );
    }

    const { lead_id, name, email, company, phone, source, source_context, message, event_details }: LeadNotificationRequest = await req.json();

    console.log('Sending lead notification for:', lead_id);

    // Escape all user-provided data
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeCompany = escapeHtml(company);
    const safePhone = escapeHtml(phone);
    const safeSourceContext = escapeHtml(source_context);
    const safeMessage = escapeHtml(message);
    const safeLeadId = escapeHtml(lead_id);

    // Déterminer le type de lead et le contexte
    const sourceLabel = source === 'livre-blanc' ? 'Téléchargement Livre Blanc' :
                        source === 'atelier-webinaire' ? 'Inscription Atelier/Webinaire' :
                        source === 'contact' ? 'Formulaire de Contact' :
                        source === 'solution_detail' ? 'Contact Solution' : source;

    const contextInfo = safeSourceContext ? `<p><strong>Contexte:</strong> ${safeSourceContext}</p>` : '';
    
    // Si un message est fourni, l'ajouter à l'email
    const messageInfo = safeMessage ? `
      <h3 style="color: hsl(218, 47%, 20%); font-size: 18px; margin-top: 25px;">💬 Message</h3>
      <div style="background: #FAF9F7; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid hsl(12, 60%, 53%);">
        <p style="margin: 0; white-space: pre-wrap; color: #374151;">${safeMessage}</p>
      </div>
    ` : '';

    // Si c'est un atelier, ajouter les détails de l'événement (escape event_details)
    let eventDetailsHtml = '';
    if (source === 'atelier-webinaire' && event_details) {
      const safeLocation = escapeHtml(event_details.location);
      const safeHeureDebut = escapeHtml(event_details.heure_debut);
      const safeTypeEvenement = escapeHtml(event_details.type_evenement);
      const formattedDate = event_details.date ? new Date(event_details.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
      
      eventDetailsHtml = `
        <h3 style="color: hsl(218, 47%, 20%); font-size: 18px; margin-top: 25px;">📅 Détails de l'événement</h3>
        <div style="background: #FAF9F7; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid hsl(12, 60%, 53%);">
          ${formattedDate ? `<p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}${safeHeureDebut ? ` à ${safeHeureDebut}` : ''}</p>` : ''}
          ${safeLocation ? `<p style="margin: 5px 0;"><strong>Lieu:</strong> ${safeLocation}</p>` : ''}
          ${safeTypeEvenement ? `<p style="margin: 5px 0;"><strong>Format:</strong> ${safeTypeEvenement}</p>` : ''}
        </div>
      `;
    }

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FAF9F7;">
        <div style="background: linear-gradient(135deg, hsl(218, 47%, 20%), hsl(12, 60%, 53%)); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">🎯 Nouveau Lead IArche</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: hsl(218, 47%, 20%); margin-top: 0; font-size: 20px;">📋 Informations du lead</h2>
          
          <div style="background: #FAF9F7; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid hsl(12, 60%, 53%);">
            <p style="margin: 5px 0;"><strong>Nom:</strong> ${safeName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${safeEmail}" style="color: hsl(12, 60%, 53%);">${safeEmail}</a></p>
            ${safeCompany ? `<p style="margin: 5px 0;"><strong>Société:</strong> ${safeCompany}</p>` : ''}
            ${safePhone ? `<p style="margin: 5px 0;"><strong>Téléphone:</strong> ${safePhone}</p>` : ''}
          </div>

          <h3 style="color: hsl(218, 47%, 20%); font-size: 18px; margin-top: 25px;">📍 Source</h3>
          <p style="margin: 10px 0;"><strong>Type:</strong> ${sourceLabel}</p>
          ${contextInfo}
          
          ${messageInfo}
          
          ${eventDetailsHtml}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
            <p style="color: #6B7280; font-size: 14px; margin: 0;">
              Lead ID: <code style="background: #F3F4F6; padding: 2px 6px; border-radius: 3px;">${safeLeadId}</code>
            </p>
            <p style="color: #6B7280; font-size: 12px; margin-top: 10px;">
              IArche · Agence IA · Bayonne, France
            </p>
          </div>
        </div>
      </div>
    `;

    const emailSubject = `🎯 Nouveau Lead: ${safeName} (${sourceLabel})`;
    const adminEmail = 'nlq@iarche.fr';

    const { data, error } = await resend.emails.send({
      from: 'IArche Notifications <notifications@iarche.fr>',
      to: [adminEmail],
      reply_to: 'nlq@iarche.fr',
      subject: emailSubject,
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending lead notification email:', error);
      
      // Log failed email
      await logEmail({
        recipient_email: adminEmail,
        subject: emailSubject,
        source_type: source,
        email_type: 'admin_notification',
        source_id: lead_id,
        status: 'failed',
        error_message: error.message,
        metadata: { name, email, company, phone, source_context }
      });

      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Lead notification email sent successfully:', data);

    // Log successful email
    await logEmail({
      recipient_email: adminEmail,
      subject: emailSubject,
      source_type: source,
      email_type: 'admin_notification',
      source_id: lead_id,
      status: 'sent',
      metadata: { name, email, company, phone, source_context, resend_id: data?.id }
    });

    return new Response(
      JSON.stringify({ success: true, email_id: data?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-lead-notification function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
