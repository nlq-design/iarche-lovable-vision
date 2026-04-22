import { Resend } from 'https://esm.sh/resend@2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { logEmail } from '../_shared/emailLogger.ts';
import { trackAPIUsage } from '../_shared/api-tracker.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rateLimit.ts';
import { EMAIL_COLORS, LOGO_URL, getEmailHeader, getEmailFooter, wrapEmailContent, getInfoCard, getSignature } from '../_shared/emailTemplate.ts';
import { atelierConfirmationSchema, validateRequest } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Fonction d'échappement HTML pour prévenir les attaques XSS dans les emails
const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// Template par défaut pour le prospect (inscription atelier)
const getDefaultProspectTemplate = (
  safeName: string,
  safeAtelierTitle: string,
  eventDetailsHtml: string
): string => {
  return `
    <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Bonjour <strong>${safeName}</strong>,</p>
    
    <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 20px;">Nous avons bien reçu votre inscription à l'événement :</p>
    
    ${getInfoCard(`<h3 style="margin: 0; font-size: 18px; color: ${EMAIL_COLORS.nightBlue};">${safeAtelierTitle}</h3>`)}
    
    ${eventDetailsHtml}
    
    <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Vous recevrez un rappel quelques jours avant l'événement avec toutes les informations pratiques.</p>
    
    <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px;">En attendant, n'hésitez pas à nous contacter si vous avez des questions.</p>
    
    ${getSignature()}
  `;
};

// Remplacer les variables dans le template
const replaceTemplateVariables = (
  template: string,
  variables: Record<string, string>
): string => {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const subject = (atelierTitle: string) => `✅ Inscription confirmée : ${atelierTitle}`;

  try {
    // Rate limiting: 5 requêtes par IP par heure
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';

    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      clientIP,
      'atelier-confirmation',
      { maxRequests: 5, windowMinutes: 60 }
    );

    const rateLimitHeaders = getRateLimitHeaders(
      rateLimitResult.remaining,
      5,
      60
    );

    if (!rateLimitResult.allowed) {
      console.warn('Rate limit exceeded for IP:', clientIP);
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests. Please try again later.',
          retryAfter: 60 * 60 
        }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': String(60 * 60),
            ...corsHeaders,
            ...rateLimitHeaders
          } 
        }
      );
    }

    // Parse and validate request body
    const rawData = await req.json();
    const validation = validateRequest(atelierConfirmationSchema, rawData, corsHeaders);
    if (!validation.success) {
      return validation.response;
    }
    
    const { 
      name, 
      email, 
      atelier_title,
      atelier_id,
      event_date,
      event_location,
      heure_debut,
      type_evenement 
    } = validation.data;

    console.log(`Sending atelier confirmation to ${email} for "${atelier_title}"`);

    // Échapper les données utilisateur pour prévenir les attaques XSS
    const safeName = escapeHtml(name);
    const safeAtelierTitle = escapeHtml(atelier_title);
    const safeEventLocation = event_location ? escapeHtml(event_location) : null;
    const safeTypeEvenement = type_evenement ? escapeHtml(type_evenement) : null;
    const safeHeureDebut = heure_debut ? escapeHtml(heure_debut) : null;

    // Format date for display
    const formattedDate = event_date 
      ? new Date(event_date).toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : 'Date à confirmer';

    // Build event details HTML
    let eventDetailsHtml = '';
    if (event_date || safeEventLocation || safeHeureDebut || safeTypeEvenement) {
      eventDetailsHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          ${event_date ? `<tr><td style="padding: 10px 0; color: ${EMAIL_COLORS.mutedGray}; width: 100px;">📅 Date</td><td style="padding: 10px 0; color: ${EMAIL_COLORS.nightBlue}; font-weight: 500;">${formattedDate}${safeHeureDebut ? ` à ${safeHeureDebut}` : ''}</td></tr>` : ''}
          ${safeEventLocation ? `<tr><td style="padding: 10px 0; color: ${EMAIL_COLORS.mutedGray};">📍 Lieu</td><td style="padding: 10px 0; color: ${EMAIL_COLORS.nightBlue}; font-weight: 500;">${safeEventLocation}</td></tr>` : ''}
          ${safeTypeEvenement ? `<tr><td style="padding: 10px 0; color: ${EMAIL_COLORS.mutedGray};">🎯 Format</td><td style="padding: 10px 0; color: ${EMAIL_COLORS.nightBlue}; font-weight: 500;">${safeTypeEvenement}</td></tr>` : ''}
        </table>
      `;
    }

    // Le subject email n'est pas du HTML : utiliser le titre brut (pas escapeHtml)
    const emailSubject = subject(atelier_title);

    // Récupérer le template depuis la BDD
    const { data: emailConfig } = await supabaseAdmin
      .from('email_configurations')
      .select('user_email_template, user_email_subject')
      .eq('source_type', 'atelier-webinaire')
      .eq('is_active', true)
      .maybeSingle();

    console.log('[send-atelier-confirmation] Email config found:', !!emailConfig);

    // Variables pour le template
    const templateVariables = {
      name: safeName,
      atelier_title: safeAtelierTitle,
      event_date: formattedDate,
      event_location: safeEventLocation || 'À confirmer',
      heure_debut: safeHeureDebut || '',
      type_evenement: safeTypeEvenement || '',
      event_details: eventDetailsHtml,
    };

    // Utiliser le template BDD ou le template par défaut
    let emailContent: string;
    let finalSubject = emailSubject;

    if (emailConfig?.user_email_template) {
      console.log('[send-atelier-confirmation] Using database template for prospect');
      emailContent = replaceTemplateVariables(emailConfig.user_email_template, templateVariables);
      if (emailConfig.user_email_subject) {
        finalSubject = replaceTemplateVariables(emailConfig.user_email_subject, templateVariables);
      }
    } else {
      console.log('[send-atelier-confirmation] Using default template for prospect');
      emailContent = getDefaultProspectTemplate(safeName, safeAtelierTitle, eventDetailsHtml);
    }

    // Generate email with v4.0 template
    const header = getEmailHeader('Inscription confirmée !');
    const footer = getEmailFooter();
    const emailHtml = wrapEmailContent(header, emailContent, footer);

    const { data, error } = await resend.emails.send({
      from: 'IArche <contact@iarche.fr>',
      to: [email],
      subject: finalSubject,
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending confirmation email:', error);
      
      // Log failed email
      await logEmail({
        recipient_email: email,
        subject: finalSubject,
        source_type: 'atelier-webinaire',
        email_type: 'user_confirmation',
        source_id: atelier_id,
        status: 'failed',
        error_message: error.message,
        metadata: { name, atelier_title }
      });

      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Confirmation email sent successfully:', data);

    // Track email API usage
    try {
      await trackAPIUsage({
        workspaceId: '00000000-0000-0000-0000-000000000001',
        apiCategory: 'email',
        apiName: 'resend',
        providerName: 'resend',
        operationType: 'atelier-confirmation',
        requestCount: 1,
        success: true,
        estimatedCostCents: 0.1,
        metadata: { atelier_id, email },
      });
    } catch (e) {
      console.error('[send-atelier-confirmation] Tracking error:', e);
    }

    // Log successful email
    await logEmail({
      recipient_email: email,
      subject: finalSubject,
      source_type: 'atelier-webinaire',
      email_type: 'user_confirmation',
      source_id: atelier_id,
      status: 'sent',
      metadata: { name, atelier_title, resend_id: data?.id }
    });

    return new Response(
      JSON.stringify({ success: true, email_id: data?.id }),
      { headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-atelier-confirmation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
