import { Resend } from 'https://esm.sh/resend@2.0.0';
import { logEmail } from '../_shared/emailLogger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface UserConfirmationRequest {
  email: string;
  name: string;
  source_type: 'contact' | 'newsletter' | 'livre-blanc' | 'solution-contact' | 'booking';
  source_context?: string;
  source_id?: string;
  // Livre blanc specific
  livre_blanc_title?: string;
  file_url?: string;
}

const getEmailContent = (data: UserConfirmationRequest) => {
  switch (data.source_type) {
    case 'contact':
      return {
        subject: '✅ Demande reçue · IArche',
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1A2B4A; font-size: 24px; margin-bottom: 10px;">Demande reçue !</h1>
            </div>
            <p>Bonjour <strong>${data.name}</strong>,</p>
            <p>Nous avons bien reçu votre message${data.source_context ? ` concernant "${data.source_context}"` : ''}.</p>
            <p>Notre équipe vous répondra dans les plus brefs délais, généralement sous 24h.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">À bientôt,<br><strong style="color: #1A2B4A;">L'équipe IArche</strong></p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
              <p>IArche · Bayonne · France</p>
              <p><a href="https://iarche.fr" style="color: #B04A32;">iarche.fr</a></p>
            </div>
          </body>
          </html>
        `,
      };

    case 'solution-contact':
      return {
        subject: `✅ Demande pour ${data.source_context || 'nos solutions'} · IArche`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1A2B4A; font-size: 24px; margin-bottom: 10px;">Demande reçue !</h1>
            </div>
            <p>Bonjour <strong>${data.name}</strong>,</p>
            <p>Nous avons bien reçu votre demande concernant <strong>${data.source_context || 'nos solutions'}</strong>.</p>
            <p>Un membre de notre équipe vous contactera rapidement pour organiser une présentation personnalisée.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">À bientôt,<br><strong style="color: #1A2B4A;">L'équipe IArche</strong></p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
              <p>IArche · Bayonne · France</p>
              <p><a href="https://iarche.fr" style="color: #B04A32;">iarche.fr</a></p>
            </div>
          </body>
          </html>
        `,
      };

    case 'livre-blanc':
      return {
        subject: `📚 Votre livre blanc : ${data.livre_blanc_title || 'Document'}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1A2B4A; font-size: 24px; margin-bottom: 10px;">Votre livre blanc est prêt !</h1>
            </div>
            <p>Bonjour <strong>${data.name}</strong>,</p>
            <p>Merci pour votre intérêt ! Voici votre livre blanc :</p>
            <div style="background: linear-gradient(135deg, #1A2B4A 0%, #B04A32 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h2 style="margin: 0 0 15px 0; font-size: 18px;">${data.livre_blanc_title || 'Document'}</h2>
              ${data.file_url ? `<a href="${data.file_url}" style="display: inline-block; background: white; color: #1A2B4A; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">📥 Télécharger le PDF</a>` : ''}
            </div>
            <p>Bonne lecture ! N'hésitez pas à nous contacter si vous avez des questions.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">À bientôt,<br><strong style="color: #1A2B4A;">L'équipe IArche</strong></p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
              <p>IArche · Bayonne · France</p>
              <p><a href="https://iarche.fr" style="color: #B04A32;">iarche.fr</a></p>
            </div>
          </body>
          </html>
        `,
      };

    case 'newsletter':
      return {
        subject: '✅ Bienvenue dans la newsletter IArche !',
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1A2B4A; font-size: 24px; margin-bottom: 10px;">Bienvenue !</h1>
            </div>
            <p>Bonjour <strong>${data.name}</strong>,</p>
            <p>Merci de vous être inscrit à notre newsletter !</p>
            <p>Vous recevrez régulièrement :</p>
            <ul style="color: #666;">
              <li>Veille technologique et actualités IA</li>
              <li>Conseils pratiques pour dirigeants</li>
              <li>Retours d'expérience et cas d'usage</li>
            </ul>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">À bientôt,<br><strong style="color: #1A2B4A;">L'équipe IArche</strong></p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
              <p>IArche · Bayonne · France</p>
              <p><a href="https://iarche.fr" style="color: #B04A32;">iarche.fr</a></p>
            </div>
          </body>
          </html>
        `,
      };

    case 'booking':
      return {
        subject: `✅ Rendez-vous confirmé : ${data.source_context || 'IArche'}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1A2B4A; font-size: 24px; margin-bottom: 10px;">Rendez-vous confirmé !</h1>
            </div>
            <p>Bonjour <strong>${data.name}</strong>,</p>
            <p>Votre rendez-vous <strong>${data.source_context || ''}</strong> est bien confirmé.</p>
            <p>Vous recevrez une invitation Google Calendar avec le lien de visioconférence.</p>
            <p>À très bientôt !</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">À bientôt,<br><strong style="color: #1A2B4A;">L'équipe IArche</strong></p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
              <p>IArche · Bayonne · France</p>
              <p><a href="https://iarche.fr" style="color: #B04A32;">iarche.fr</a></p>
            </div>
          </body>
          </html>
        `,
      };

    default:
      return {
        subject: '✅ Confirmation · IArche',
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; padding: 20px;">
            <p>Bonjour ${data.name},</p>
            <p>Nous avons bien reçu votre demande.</p>
            <p>L'équipe IArche</p>
          </body>
          </html>
        `,
      };
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: UserConfirmationRequest = await req.json();
    
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
