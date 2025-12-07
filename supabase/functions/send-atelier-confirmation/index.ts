import { Resend } from 'https://esm.sh/resend@2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { logEmail } from '../_shared/emailLogger.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface AtelierConfirmationRequest {
  name: string;
  email: string;
  atelier_title: string;
  atelier_id?: string;
  event_date: string | null;
  event_location: string | null;
  heure_debut: string | null;
  type_evenement: string | null;
}

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

    const { 
      name, 
      email, 
      atelier_title,
      atelier_id,
      event_date,
      event_location,
      heure_debut,
      type_evenement 
    }: AtelierConfirmationRequest = await req.json();

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
        <div style="background-color: #f8f7f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1A2B4A; margin-top: 0;">Détails de l'événement</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${event_date ? `<tr><td style="padding: 8px 0; color: #666;">📅 Date</td><td style="padding: 8px 0; color: #1A2B4A; font-weight: 500;">${formattedDate}${safeHeureDebut ? ` à ${safeHeureDebut}` : ''}</td></tr>` : ''}
            ${safeEventLocation ? `<tr><td style="padding: 8px 0; color: #666;">📍 Lieu</td><td style="padding: 8px 0; color: #1A2B4A; font-weight: 500;">${safeEventLocation}</td></tr>` : ''}
            ${safeTypeEvenement ? `<tr><td style="padding: 8px 0; color: #666;">🎯 Format</td><td style="padding: 8px 0; color: #1A2B4A; font-weight: 500;">${safeTypeEvenement}</td></tr>` : ''}
          </table>
        </div>
      `;
    }

    const emailSubject = subject(safeAtelierTitle);

    const { data, error } = await resend.emails.send({
      from: 'IArche <contact@iarche.fr>',
      to: [email],
      subject: emailSubject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1A2B4A; font-size: 24px; margin-bottom: 10px;">Inscription confirmée !</h1>
          </div>
          
          <p>Bonjour <strong>${safeName}</strong>,</p>
          
          <p>Nous avons bien reçu votre inscription à l'événement :</p>
          
          <div style="background: linear-gradient(135deg, #1A2B4A 0%, #B04A32 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0; font-size: 20px;">${safeAtelierTitle}</h2>
          </div>
          
          ${eventDetailsHtml}
          
          <p>Vous recevrez un rappel quelques jours avant l'événement avec toutes les informations pratiques.</p>
          
          <p>En attendant, n'hésitez pas à nous contacter si vous avez des questions.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #666; font-size: 14px;">
            À bientôt,<br>
            <strong style="color: #1A2B4A;">L'équipe IArche</strong>
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
            <p>IArche · Bayonne · France</p>
            <p><a href="https://iarche.fr" style="color: #B04A32;">iarche.fr</a></p>
          </div>
          
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending confirmation email:', error);
      
      // Log failed email
      await logEmail({
        recipient_email: email,
        subject: emailSubject,
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

    // Log successful email
    await logEmail({
      recipient_email: email,
      subject: emailSubject,
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
