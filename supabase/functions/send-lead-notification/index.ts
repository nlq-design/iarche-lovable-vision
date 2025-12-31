import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { sendGmail } from '../_shared/gmailClient.ts';
import { logEmail } from '../_shared/emailLogger.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rateLimit.ts';
import { EMAIL_COLORS, getEmailHeader, getEmailFooter, wrapEmailContent, getInfoCard } from '../_shared/emailTemplate.ts';
import { leadNotificationSchema, validateRequest } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Parse and validate request body
    const rawData = await req.json();
    const validation = validateRequest(leadNotificationSchema, rawData, corsHeaders);
    if (!validation.success) {
      return validation.response;
    }
    
    const { lead_id, name, email, company, phone, source, source_context, message, event_details } = validation.data;
    console.log('[Gmail] Sending lead notification for:', lead_id);

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

    const contextInfo = safeSourceContext ? `<p style="margin: 5px 0;"><strong>Contexte:</strong> ${safeSourceContext}</p>` : '';
    
    // Si un message est fourni
    const messageSection = safeMessage ? `
      <h3 style="color: ${EMAIL_COLORS.nightBlue}; font-size: 16px; margin: 20px 0 12px 0;">💬 Message</h3>
      ${getInfoCard(`<p style="margin: 0; white-space: pre-wrap; color: ${EMAIL_COLORS.textGray};">${safeMessage}</p>`)}
    ` : '';

    // Si c'est un atelier, ajouter les détails de l'événement
    let eventDetailsHtml = '';
    if (source === 'atelier-webinaire' && event_details) {
      const safeLocation = escapeHtml(event_details.location);
      const safeHeureDebut = escapeHtml(event_details.heure_debut);
      const safeTypeEvenement = escapeHtml(event_details.type_evenement);
      const formattedDate = event_details.date ? new Date(event_details.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
      
      eventDetailsHtml = `
        <h3 style="color: ${EMAIL_COLORS.nightBlue}; font-size: 16px; margin: 20px 0 12px 0;">📅 Détails de l'événement</h3>
        ${getInfoCard(`
          ${formattedDate ? `<p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}${safeHeureDebut ? ` à ${safeHeureDebut}` : ''}</p>` : ''}
          ${safeLocation ? `<p style="margin: 5px 0;"><strong>Lieu:</strong> ${safeLocation}</p>` : ''}
          ${safeTypeEvenement ? `<p style="margin: 5px 0;"><strong>Format:</strong> ${safeTypeEvenement}</p>` : ''}
        `)}
      `;
    }

    // Generate email with v4.0 template
    const header = getEmailHeader('🎯 Nouveau Lead IArche');
    const content = `
      <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #92400E; font-size: 14px; font-weight: 500;">
          ${sourceLabel}
        </p>
      </div>
      
      <h3 style="color: ${EMAIL_COLORS.nightBlue}; font-size: 16px; margin: 0 0 12px 0;">📋 Informations du lead</h3>
      ${getInfoCard(`
        <p style="margin: 5px 0;"><strong>Nom:</strong> ${safeName}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${safeEmail}" style="color: ${EMAIL_COLORS.terracotta};">${safeEmail}</a></p>
        ${safeCompany ? `<p style="margin: 5px 0;"><strong>Société:</strong> ${safeCompany}</p>` : ''}
        ${safePhone ? `<p style="margin: 5px 0;"><strong>Téléphone:</strong> ${safePhone}</p>` : ''}
        ${contextInfo}
      `)}
      
      ${messageSection}
      ${eventDetailsHtml}
      
      <p style="color: ${EMAIL_COLORS.lightGray}; font-size: 12px; margin-top: 24px; text-align: center;">
        Lead ID: <code style="background: #F3F4F6; padding: 2px 6px; border-radius: 3px;">${safeLeadId}</code>
      </p>
    `;
    const footer = getEmailFooter();
    const emailHtml = wrapEmailContent(header, content, footer);

    const emailSubject = `🎯 Nouveau Lead: ${safeName} (${sourceLabel})`;
    const adminEmail = 'nlq@iarche.fr';

    // Send via Gmail API
    const result = await sendGmail({
      to: adminEmail,
      subject: emailSubject,
      html: emailHtml,
      replyTo: 'nlq@iarche.fr',
    });

    if (!result.success) {
      console.error('[Gmail] Error sending lead notification:', result.error);
      
      await logEmail({
        recipient_email: adminEmail,
        subject: emailSubject,
        source_type: source,
        email_type: 'admin_notification',
        source_id: lead_id,
        status: 'failed',
        error_message: result.error,
        metadata: { name, email, company, phone, source_context }
      });

      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Gmail] Lead notification sent successfully:', result.messageId);

    await logEmail({
      recipient_email: adminEmail,
      subject: emailSubject,
      source_type: source,
      email_type: 'admin_notification',
      source_id: lead_id,
      status: 'sent',
      metadata: { name, email, company, phone, source_context, gmail_id: result.messageId }
    });

    return new Response(
      JSON.stringify({ success: true, email_id: result.messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Gmail] Error in send-lead-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
