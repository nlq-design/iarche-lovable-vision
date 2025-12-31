import { Resend } from 'https://esm.sh/resend@2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { logEmail } from '../_shared/emailLogger.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rateLimit.ts';
import { EMAIL_COLORS, LOGO_URL, getEmailHeader, getEmailFooter, wrapEmailContent, getCtaButton, getInfoCard, getSignature } from '../_shared/emailTemplate.ts';
import { userConfirmationSchema, validateRequest, type UserConfirmationRequest } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Fonction d'échappement HTML pour prévenir les injections XSS
const escapeHtml = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Validation des URLs pour s'assurer qu'elles pointent vers des domaines de confiance
const validateFileUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const trustedDomains = ['iarche.fr', 'mgjyhlyrwnnioctkbdkk.supabase.co'];
    if (trustedDomains.some(domain => parsed.hostname.endsWith(domain))) {
      return url;
    }
    console.warn(`Untrusted file URL domain: ${parsed.hostname}`);
    return '';
  } catch {
    console.warn(`Invalid file URL: ${url}`);
    return '';
  }
};

const getEmailContent = (data: UserConfirmationRequest) => {
  // Échapper toutes les données utilisateur
  const safeName = escapeHtml(data.name);
  const safeSourceContext = escapeHtml(data.source_context);
  const safeLivreBlanctitle = escapeHtml(data.livre_blanc_title);
  const safeFileUrl = validateFileUrl(data.file_url);

  const header = (title: string) => getEmailHeader(title);
  const footer = getEmailFooter();

  switch (data.source_type) {
    case 'contact':
      return {
        subject: '✅ Demande reçue · IArche',
        html: wrapEmailContent(
          header('Demande reçue !'),
          `
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Bonjour <strong>${safeName}</strong>,</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Nous avons bien reçu votre message${safeSourceContext ? ` concernant "${safeSourceContext}"` : ''}.</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 24px;">Notre équipe vous répondra dans les plus brefs délais, généralement sous 24h.</p>
            ${getSignature()}
          `,
          footer
        ),
      };

    case 'solution-contact':
      return {
        subject: `✅ Demande pour ${safeSourceContext || 'nos solutions'} · IArche`,
        html: wrapEmailContent(
          header('Demande reçue !'),
          `
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Bonjour <strong>${safeName}</strong>,</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Nous avons bien reçu votre demande concernant <strong>${safeSourceContext || 'nos solutions'}</strong>.</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 24px;">Un membre de notre équipe vous contactera rapidement pour organiser une présentation personnalisée.</p>
            ${getSignature()}
          `,
          footer
        ),
      };

    case 'livre-blanc':
      return {
        subject: `📚 Votre livre blanc : ${safeLivreBlanctitle || 'Document'}`,
        html: wrapEmailContent(
          header('Votre livre blanc est prêt !'),
          `
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Bonjour <strong>${safeName}</strong>,</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 20px;">Merci pour votre intérêt ! Voici votre livre blanc :</p>
            
            ${getInfoCard(`<h3 style="margin: 0 0 12px 0; font-size: 18px; color: ${EMAIL_COLORS.nightBlue};">${safeLivreBlanctitle || 'Document'}</h3>
            ${safeFileUrl ? `<div style="text-align: center; margin-top: 12px;">${getCtaButton('📥 Télécharger le PDF', safeFileUrl)}</div>` : ''}`)}
            
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-top: 24px;">Bonne lecture ! N'hésitez pas à nous contacter si vous avez des questions.</p>
            ${getSignature()}
          `,
          footer
        ),
      };

    case 'newsletter':
      return {
        subject: '🎉 Bienvenue dans la communauté IArche !',
        html: wrapEmailContent(
          header('Bienvenue dans la communauté IArche !'),
          `
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Bonjour <strong>${safeName}</strong>,</p>
            
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 20px;">
              Merci de rejoindre notre newsletter ! Vous faites désormais partie d'une communauté de dirigeants qui souhaitent intégrer l'IA de manière pragmatique dans leur entreprise.
            </p>
            
            ${getInfoCard(`
              <h3 style="margin: 0 0 12px 0; font-size: 16px; color: ${EMAIL_COLORS.nightBlue};">📬 Ce que vous allez recevoir</h3>
              <ul style="color: ${EMAIL_COLORS.textGray}; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li><strong>Veille technologique</strong> · L'essentiel des actualités IA</li>
                <li><strong>Conseils pratiques</strong> · Des applications concrètes pour votre PME</li>
                <li><strong>Retours d'expérience</strong> · Cas d'usage réels et résultats mesurables</li>
                <li><strong>Invitations exclusives</strong> · Ateliers, webinaires et événements</li>
              </ul>
            `, EMAIL_COLORS.terracotta)}
            
            <div style="text-align: center; margin: 28px 0;">
              ${getCtaButton('Découvrir nos ressources', 'https://iarche.fr/ressources')}
            </div>
            
            <p style="color: ${EMAIL_COLORS.mutedGray}; font-size: 14px; margin-top: 24px; text-align: center;">
              Envoi mensuel · Désinscription en un clic · Pas de spam
            </p>
            
            ${getSignature()}
          `,
          footer
        ),
      };

    case 'booking':
      return {
        subject: `✅ Rendez-vous confirmé : ${safeSourceContext || 'IArche'}`,
        html: wrapEmailContent(
          header('Rendez-vous confirmé !'),
          `
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Bonjour <strong>${safeName}</strong>,</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Votre rendez-vous <strong>${safeSourceContext || ''}</strong> est bien confirmé.</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 24px;">Vous recevrez une invitation Google Calendar avec le lien de visioconférence.</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px;">À très bientôt !</p>
            ${getSignature()}
          `,
          footer
        ),
      };

    default:
      return {
        subject: '✅ Confirmation · IArche',
        html: wrapEmailContent(
          header('Confirmation'),
          `
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Bonjour ${safeName},</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px;">Nous avons bien reçu votre demande.</p>
            ${getSignature()}
          `,
          footer
        ),
      };
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed, remaining } = await checkRateLimit(supabase, clientIP, 'user-confirmation', {
      maxRequests: 10,
      windowMinutes: 60
    });

    if (!allowed) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Trop de requêtes. Veuillez réessayer plus tard.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...getRateLimitHeaders(remaining, 10, 60),
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Parse and validate request body
    const rawData = await req.json();
    const validation = validateRequest(userConfirmationSchema, rawData, corsHeaders);
    if (!validation.success) {
      return validation.response;
    }
    
    const data = validation.data;
    console.log(`Sending user confirmation to ${data.email} for source: ${data.source_type}`);

    const emailContent = getEmailContent(data);

    const { data: emailData, error } = await resend.emails.send({
      from: 'IArche <contact@iarche.fr>',
      to: [data.email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (error) {
      console.error('Error sending user confirmation:', error);
      
      await logEmail({
        recipient_email: data.email,
        subject: emailContent.subject,
        source_type: data.source_type,
        email_type: 'user_confirmation',
        source_id: data.source_id,
        status: 'failed',
        error_message: error.message,
        metadata: { name: data.name, source_context: data.source_context }
      });

      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User confirmation sent successfully:', emailData);

    await logEmail({
      recipient_email: data.email,
      subject: emailContent.subject,
      source_type: data.source_type,
      email_type: 'user_confirmation',
      source_id: data.source_id,
      status: 'sent',
      metadata: { name: data.name, source_context: data.source_context, resend_id: emailData?.id }
    });

    return new Response(
      JSON.stringify({ success: true, email_id: emailData?.id }),
      { 
        headers: { 
          ...corsHeaders, 
          ...getRateLimitHeaders(remaining, 10, 60),
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in send-user-confirmation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
