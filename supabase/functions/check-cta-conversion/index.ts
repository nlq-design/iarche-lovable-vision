import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Seuil de conversion critique (en pourcentage)
const CONVERSION_THRESHOLD = 5; // 5% minimum

// Nombre minimum de clics pour considérer les statistiques valides
const MIN_CLICKS_THRESHOLD = 20;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Analyzing CTA conversion rates...');

    // Période d'analyse: derniers 7 jours
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Récupérer tous les clics CTA des 7 derniers jours
    const { data: ctaClicks, error: ctaError } = await supabase
      .from('cta_clicks')
      .select('cta_name, source_page, source_context, user_session')
      .gte('clicked_at', sevenDaysAgo.toISOString());

    if (ctaError) {
      throw new Error(`Error fetching CTA clicks: ${ctaError.message}`);
    }

    // Récupérer tous les contacts des 7 derniers jours
    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .select('source, source_context, user_session')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (contactError) {
      throw new Error(`Error fetching contacts: ${contactError.message}`);
    }

    // Analyser les conversions par CTA
    const ctaStats = new Map<string, { clicks: number; conversions: number; sessions: Set<string> }>();

    // Compter les clics par CTA
    ctaClicks?.forEach((click) => {
      const key = `${click.cta_name}|${click.source_page}`;
      if (!ctaStats.has(key)) {
        ctaStats.set(key, { clicks: 0, conversions: 0, sessions: new Set() });
      }
      const stat = ctaStats.get(key)!;
      stat.clicks++;
      if (click.user_session) {
        stat.sessions.add(click.user_session);
      }
    });

    // Compter les conversions (contacts) par source
    contacts?.forEach((contact) => {
      const key = `${contact.source}|${contact.source_context || 'unknown'}`;
      if (ctaStats.has(key)) {
        const stat = ctaStats.get(key)!;
        stat.conversions++;
      }
    });

    // Identifier les CTAs à faible conversion
    const lowConversionCTAs: Array<{
      cta_name: string;
      source_page: string;
      clicks: number;
      conversions: number;
      conversion_rate: number;
    }> = [];

    ctaStats.forEach((stat, key) => {
      const [cta_name, source_page] = key.split('|');
      
      // Ne considérer que les CTAs avec un volume suffisant
      if (stat.clicks >= MIN_CLICKS_THRESHOLD) {
        const conversionRate = (stat.conversions / stat.clicks) * 100;
        
        if (conversionRate < CONVERSION_THRESHOLD) {
          lowConversionCTAs.push({
            cta_name,
            source_page,
            clicks: stat.clicks,
            conversions: stat.conversions,
            conversion_rate: conversionRate,
          });
        }
      }
    });

    // Si aucun CTA à faible conversion, retourner succès sans email
    if (lowConversionCTAs.length === 0) {
      console.log('✅ All CTAs have healthy conversion rates');
      return new Response(
        JSON.stringify({ success: true, message: 'No low conversion CTAs detected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trier par taux de conversion croissant
    lowConversionCTAs.sort((a, b) => a.conversion_rate - b.conversion_rate);

    // Générer le HTML de l'email d'alerte
    const ctaRows = lowConversionCTAs.map((cta) => `
      <tr style="border-bottom: 1px solid #E5E7EB;">
        <td style="padding: 12px; font-weight: 500; color: hsl(218, 47%, 20%);">${cta.cta_name}</td>
        <td style="padding: 12px; color: #6B7280;">${cta.source_page}</td>
        <td style="padding: 12px; text-align: center; color: #6B7280;">${cta.clicks}</td>
        <td style="padding: 12px; text-align: center; color: #6B7280;">${cta.conversions}</td>
        <td style="padding: 12px; text-align: center;">
          <span style="background: ${cta.conversion_rate < 2 ? '#FEE2E2' : '#FEF3C7'}; color: ${cta.conversion_rate < 2 ? '#991B1B' : '#92400E'}; padding: 4px 12px; border-radius: 12px; font-weight: 600;">
            ${cta.conversion_rate.toFixed(2)}%
          </span>
        </td>
      </tr>
    `).join('');

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #FAF9F7;">
        <div style="background: linear-gradient(135deg, #991B1B, #DC2626); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">⚠️ Alerte Conversion CTA</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
            ${lowConversionCTAs.length} CTA${lowConversionCTAs.length > 1 ? 's' : ''} sous le seuil de ${CONVERSION_THRESHOLD}%
          </p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-top: 0;">
            Les CTAs suivants présentent un taux de conversion <strong>inférieur à ${CONVERSION_THRESHOLD}%</strong> sur les 7 derniers jours :
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #FAF9F7; border-radius: 6px; overflow: hidden;">
            <thead>
              <tr style="background: hsl(218, 47%, 20%); color: white;">
                <th style="padding: 12px; text-align: left; font-weight: 600;">CTA</th>
                <th style="padding: 12px; text-align: left; font-weight: 600;">Source</th>
                <th style="padding: 12px; text-align: center; font-weight: 600;">Clics</th>
                <th style="padding: 12px; text-align: center; font-weight: 600;">Conversions</th>
                <th style="padding: 12px; text-align: center; font-weight: 600;">Taux</th>
              </tr>
            </thead>
            <tbody>
              ${ctaRows}
            </tbody>
          </table>

          <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; border-radius: 6px; margin-top: 25px;">
            <p style="margin: 0; color: #92400E; font-weight: 500;">💡 Actions recommandées :</p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400E;">
              <li>Revoir le copy et le positionnement des CTAs</li>
              <li>Tester des variantes A/B du texte et du design</li>
              <li>Analyser le contexte d'affichage et l'UX</li>
              <li>Vérifier la pertinence du CTA par rapport au contenu</li>
            </ul>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
            <p style="color: #6B7280; font-size: 12px; margin: 0;">
              Analyse période: 7 derniers jours • Seuil minimum: ${MIN_CLICKS_THRESHOLD} clics
            </p>
            <p style="color: #6B7280; font-size: 12px; margin-top: 5px;">
              IArche · Agence IA · Bayonne, France
            </p>
          </div>
        </div>
      </div>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'IArche Analytics <onboarding@resend.dev>',
      to: ['nlq@iarche.fr'],
      subject: `⚠️ Alerte: ${lowConversionCTAs.length} CTA${lowConversionCTAs.length > 1 ? 's' : ''} à faible conversion`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending CTA alert email:', emailError);
      return new Response(
        JSON.stringify({ error: emailError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ CTA conversion alert email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_id: emailData?.id,
        low_conversion_ctas: lowConversionCTAs.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-cta-conversion function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
