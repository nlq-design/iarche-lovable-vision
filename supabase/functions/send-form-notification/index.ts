import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { logEmail } from '../_shared/emailLogger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface FormField {
  id: string;
  label: string;
  type: string;
}

interface FormNotificationRequest {
  form_id: string;
  form_title: string;
  form_fields?: FormField[];
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
      form_fields,
      response_data,
      respondent_email,
      admin_email,
      send_to_respondent,
      custom_subject,
      custom_message,
    }: FormNotificationRequest = await req.json();

    console.log('[send-form-notification] Processing notification for form:', form_title);
    console.log('[send-form-notification] Form fields:', JSON.stringify(form_fields));
    console.log('[send-form-notification] Respondent email received:', respondent_email);

    // Créer un mapping ID -> Label pour les champs
    const fieldLabelMap: Record<string, string> = {};
    if (form_fields && Array.isArray(form_fields)) {
      for (const field of form_fields) {
        if (field.id && field.label) {
          fieldLabelMap[field.id] = field.label;
        }
      }
    }
    console.log('[send-form-notification] Field label map:', JSON.stringify(fieldLabelMap));

    // Trouver l'email du répondant dans les données si non fourni
    let finalRespondentEmail = respondent_email;
    if (!finalRespondentEmail && response_data) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const [key, value] of Object.entries(response_data)) {
        if (typeof value === 'string' && emailRegex.test(value)) {
          finalRespondentEmail = value;
          console.log('[send-form-notification] Found email in response_data:', finalRespondentEmail, 'field:', key);
          break;
        }
      }
    }

    const adminEmailAddress = admin_email || 'nlq@iarche.fr';
    const results = { admin: false, respondent: false };
    // Toujours envoyer au répondant si on a trouvé un email
    const shouldSendToRespondent = !!finalRespondentEmail;
    
    console.log('[send-form-notification] Final respondent email:', finalRespondentEmail);
    console.log('[send-form-notification] Should send to respondent:', shouldSendToRespondent);

    // Construire le résumé des réponses en HTML avec les vrais labels (pour admin)
    const responseHtml = Object.entries(response_data)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
        const fieldLabel = fieldLabelMap[key] || key;
        
        let displayValue = '';
        if (typeof value === 'boolean') {
          displayValue = value ? 'Oui' : 'Non';
        } else if (Array.isArray(value)) {
          displayValue = value.join(', ');
        } else {
          displayValue = String(value);
        }
        
        if (displayValue.includes('_')) {
          displayValue = displayValue.replace(/_/g, ' ');
        }
        
        return `<tr>
          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-weight: 500; color: #374151; width: 35%;">${fieldLabel}</td>
          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; color: #6B7280;">${displayValue}</td>
        </tr>`;
      })
      .join('');

    // Extraire les infos clés pour le prospect (nom, prénom)
    let prospectName = '';
    const nameLabels = ['nom', 'prénom', 'prenom', 'name', 'firstname', 'lastname', 'nom complet'];
    for (const [key, value] of Object.entries(response_data)) {
      const label = (fieldLabelMap[key] || key).toLowerCase();
      if (nameLabels.some(n => label.includes(n)) && typeof value === 'string' && value.trim()) {
        prospectName = prospectName ? `${prospectName} ${value}` : value;
      }
    }
    prospectName = prospectName || 'vous';

    // Email admin (DÉTAILLÉ avec toutes les infos)
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
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">📝 Nouvelle soumission</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${form_title}</p>
              </div>
              
              <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
                  <p style="margin: 0; color: #92400E; font-size: 14px; font-weight: 500;">
                    ⏰ Reçu le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                
                <h2 style="color: hsl(218, 47%, 20%); font-size: 16px; margin-bottom: 15px; border-bottom: 2px solid hsl(12, 60%, 44%); padding-bottom: 8px;">
                  📋 Détail complet des réponses
                </h2>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #F9FAFB; border-radius: 8px;">
                  ${responseHtml}
                </table>
                
                ${finalRespondentEmail ? `
                <div style="background: #ECFDF5; border-left: 4px solid #10B981; padding: 12px 16px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
                  <p style="margin: 0; color: #065F46; font-size: 14px;">
                    ✅ Email de confirmation envoyé à <strong>${finalRespondentEmail}</strong>
                  </p>
                </div>
                ` : ''}
                
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

    // Email prospect (SUCCINCT - juste confirmation)
    if (shouldSendToRespondent && finalRespondentEmail) {
      try {
        const respondentSubject = custom_subject || `Merci ${prospectName} ! Votre demande a bien été reçue`;
        const respondentMessage = custom_message || `Bonjour ${prospectName},\n\nNous avons bien reçu votre demande et nous vous en remercions.`;

        console.log('[send-form-notification] Sending confirmation to:', finalRespondentEmail);

        const respondentEmailResponse = await resend.emails.send({
          from: 'IArche <contact@iarche.fr>',
          to: [finalRespondentEmail],
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
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Merci ${prospectName} !</h1>
                </div>
                
                <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                  <p style="color: #374151; font-size: 16px; line-height: 1.7; margin-bottom: 20px;">
                    Nous avons bien reçu votre demande concernant <strong style="color: hsl(218, 47%, 20%);">${form_title}</strong>.
                  </p>
                  
                  <p style="color: #374151; font-size: 16px; line-height: 1.7; margin-bottom: 25px;">
                    Notre équipe va prendre connaissance de vos informations et reviendra vers vous dans les meilleurs délais.
                  </p>
                  
                  <div style="background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%); padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid hsl(218, 47%, 20%);">
                    <p style="color: hsl(218, 47%, 20%); margin: 0; font-size: 15px; font-weight: 500;">
                      💡 En attendant, découvrez nos solutions IA sur notre site
                    </p>
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="https://iarche.fr/solutions" 
                       style="display: inline-block; background: hsl(12, 60%, 44%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
                      Découvrir nos solutions →
                    </a>
                  </div>
                  
                  <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin-top: 30px; text-align: center;">
                    Une question ? Contactez-nous à <a href="mailto:nlq@iarche.fr" style="color: hsl(12, 60%, 44%); text-decoration: none; font-weight: 500;">nlq@iarche.fr</a>
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <p style="color: #9CA3AF; font-size: 12px;">
                    IArche • Agence IA • Bayonne, France<br>
                    <a href="https://iarche.fr" style="color: hsl(218, 47%, 20%); text-decoration: none;">iarche.fr</a>
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
          recipient_email: finalRespondentEmail,
          email_type: 'user_confirmation',
          subject: respondentSubject,
          status: 'sent',
        });
      } catch (emailError: any) {
        console.error('[send-form-notification] Respondent email error:', emailError);
        await logEmail({
          source_type: 'form',
          source_id: form_id,
          recipient_email: finalRespondentEmail!,
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
