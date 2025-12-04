import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { logEmail } from '../_shared/emailLogger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface FormNotificationRequest {
  form_id: string;
  form_title: string;
  response_data: Record<string, any>;
  respondent_email?: string;
  admin_email?: string;
  send_to_respondent?: boolean;
  custom_subject?: string;
  custom_message?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      form_id,
      form_title,
      response_data,
      respondent_email,
      admin_email,
      send_to_respondent,
      custom_subject,
      custom_message,
    }: FormNotificationRequest = await req.json();

    console.log('[send-form-notification] Processing notification for form:', form_title);

    const adminEmailAddress = admin_email || 'nlq@iarche.fr';
    const results = { admin: false, respondent: false };
    const shouldSendToRespondent = send_to_respondent !== false; // Par défaut true

    // Construire le résumé des réponses en HTML
    const responseHtml = Object.entries(response_data)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
        const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
        return `<tr>
          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-weight: 500; color: #374151; width: 35%;">${key}</td>
          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; color: #6B7280;">${displayValue}</td>
        </tr>`;
      })
      .join('');

    // Email admin
    try {
      const adminEmailResponse = await resend.emails.send({
        from: 'IArche Formulaires <notifications@iarche.fr>',
        to: [adminEmailAddress],
        subject: `📝 Nouvelle réponse: ${form_title}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FAF9F7;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, hsl(218, 47%, 20%) 0%, hsl(12, 60%, 44%) 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Nouvelle réponse au formulaire</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${form_title}</p>
              </div>
              
              <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
                  Une nouvelle réponse a été soumise. Voici le détail :
                </p>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                  ${responseHtml}
                </table>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://iarche.fr/admin/formulaires/${form_id}/reponses" 
                     style="display: inline-block; background: hsl(218, 47%, 20%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
                    Voir toutes les réponses →
                  </a>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #9CA3AF; font-size: 12px;">IArche • Bayonne, France</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log('[send-form-notification] Admin email sent:', adminEmailResponse);
      results.admin = true;

      await logEmail({
        source_type: 'form',
        source_id: form_id,
        recipient_email: adminEmailAddress,
        email_type: 'admin_notification',
        subject: `Nouvelle réponse: ${form_title}`,
        status: 'sent',
      });
    } catch (emailError: any) {
      console.error('[send-form-notification] Admin email error:', emailError);
      await logEmail({
        source_type: 'form',
        source_id: form_id,
        recipient_email: adminEmailAddress,
        email_type: 'admin_notification',
        subject: `Nouvelle réponse: ${form_title}`,
        status: 'failed',
        error_message: emailError.message,
      });
    }

    // Email respondent (si configuré)
    if (shouldSendToRespondent && respondent_email) {
      try {
        const respondentSubject = custom_subject || `Confirmation de votre réponse - ${form_title}`;
        const respondentMessage = custom_message || 'Nous avons bien reçu votre réponse et nous vous en remercions.';

        const respondentEmailResponse = await resend.emails.send({
          from: 'IArche <contact@iarche.fr>',
          to: [respondent_email],
          subject: respondentSubject,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FAF9F7;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: linear-gradient(135deg, hsl(218, 47%, 20%) 0%, hsl(12, 60%, 44%) 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Merci pour votre réponse !</h1>
                </div>
                
                <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                  <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
                    ${respondentMessage}
                  </p>
                  
                  <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: hsl(218, 47%, 20%); margin: 0 0 15px 0; font-size: 16px;">Récapitulatif de vos réponses :</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      ${responseHtml}
                    </table>
                  </div>
                  
                  <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
                    Si vous avez des questions, n'hésitez pas à nous contacter à <a href="mailto:nlq@iarche.fr" style="color: hsl(12, 60%, 44%);">nlq@iarche.fr</a>
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <p style="color: #9CA3AF; font-size: 12px;">
                    IArche • Agence IA • Bayonne, France<br>
                    <a href="https://iarche.fr" style="color: hsl(218, 47%, 20%);">iarche.fr</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        console.log('[send-form-notification] Respondent email sent:', respondentEmailResponse);
        results.respondent = true;

        await logEmail({
          source_type: 'form',
          source_id: form_id,
          recipient_email: respondent_email,
          email_type: 'user_confirmation',
          subject: respondentSubject,
          status: 'sent',
        });
      } catch (emailError: any) {
        console.error('[send-form-notification] Respondent email error:', emailError);
        await logEmail({
          source_type: 'form',
          source_id: form_id,
          recipient_email: respondent_email,
          email_type: 'user_confirmation',
          subject: custom_subject || `Confirmation - ${form_title}`,
          status: 'failed',
          error_message: emailError.message,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error('[send-form-notification] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
