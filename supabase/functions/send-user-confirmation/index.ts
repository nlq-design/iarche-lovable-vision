import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { sendGmail } from '../_shared/gmailClient.ts';
import { logEmail } from '../_shared/emailLogger.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rateLimit.ts';
import { EMAIL_COLORS, getEmailHeader, getEmailFooter, wrapEmailContent, getCtaButton, getInfoCard, getSignature } from '../_shared/emailTemplate.ts';
import { userConfirmationSchema, validateRequest, type UserConfirmationRequest } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        subject: '✅ Bienvenue dans la newsletter IArche !',
        html: wrapEmailContent(
          header('Bienvenue !'),
          `
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Bonjour <strong>${safeName}</strong>,</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 20px;">Merci de vous être inscrit à notre newsletter !</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 8px;">Vous recevrez régulièrement :</p>
            <ul style="color: ${EMAIL_COLORS.mutedGray}; margin-bottom: 24px;">
              <li>Veille technologique et actualités IA</li>
              <li>Conseils pratiques pour dirigeants</li>
              <li>Retours d'expérience et cas d'usage</li>
            </ul>
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
    console.log(`[Gmail] Sending user confirmation to ${data.email} for source: ${data.source_type}`);

    const emailContent = getEmailContent(data);

    // Send via Gmail API
    const result = await sendGmail({
      to: data.email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (!result.success) {
      console.error('[Gmail] Error sending user confirmation:', result.error);
      
      await logEmail({
        recipient_email: data.email,
        subject: emailContent.subject,
        source_type: data.source_type,
        email_type: 'user_confirmation',
        source_id: data.source_id,
        status: 'failed',
        error_message: result.error,
        metadata: { name: data.name, source_context: data.source_context }
      });

      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Gmail] User confirmation sent successfully:', result.messageId);

    await logEmail({
      recipient_email: data.email,
      subject: emailContent.subject,
      source_type: data.source_type,
      email_type: 'user_confirmation',
      source_id: data.source_id,
      status: 'sent',
      metadata: { name: data.name, source_context: data.source_context, gmail_id: result.messageId }
    });

    return new Response(
      JSON.stringify({ success: true, email_id: result.messageId }),
      { 
        headers: { 
          ...corsHeaders, 
          ...getRateLimitHeaders(remaining, 10, 60),
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('[Gmail] Error in send-user-confirmation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
