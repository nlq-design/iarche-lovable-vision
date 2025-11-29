import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SecurityAlert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  details: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { alert }: { alert: SecurityAlert } = await req.json();

    // Récupérer les admins
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!adminRoles || adminRoles.length === 0) {
      return new Response(JSON.stringify({ message: 'No admins to notify' }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: { users } } = await supabase.auth.admin.listUsers();
    const adminUserIds = adminRoles.map(r => r.user_id);
    const adminEmails = users
      .filter(u => adminUserIds.includes(u.id))
      .map(u => u.email)
      .filter((email): email is string => email !== undefined);

    const severityColors = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#F97316',
      critical: '#EF4444'
    };

    const severityLabels = {
      low: '🔵 Faible',
      medium: '🟡 Moyen',
      high: '🟠 Élevé',
      critical: '🔴 Critique'
    };

    // Envoyer l'alerte par email
    await resend.emails.send({
      from: "IArche Security <onboarding@resend.dev>",
      to: adminEmails,
      subject: `[${severityLabels[alert.severity]}] Alerte de sécurité : ${alert.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${severityColors[alert.severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">${severityLabels[alert.severity]} Alerte de sécurité</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="margin-top: 0; color: #111827;">${alert.title}</h2>
            <p style="color: #4b5563; line-height: 1.6;">${alert.description}</p>
            
            ${alert.details ? `
              <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 20px; border: 1px solid #e5e7eb;">
                <h3 style="margin-top: 0; font-size: 16px; color: #111827;">Détails :</h3>
                <pre style="background: #f3f4f6; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${JSON.stringify(alert.details, null, 2)}</pre>
              </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <a href="https://iarche.fr/admin/security-dashboard" 
                 style="display: inline-block; background: ${severityColors[alert.severity]}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Voir le Dashboard de Sécurité
              </a>
            </div>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">
              Cette alerte a été générée automatiquement par le système de sécurité IArche.<br>
              Connectez-vous à l'admin pour plus de détails et prendre les mesures appropriées.
            </p>
          </div>
        </div>
      `,
    });

    console.log(`Security alert sent to ${adminEmails.length} admins:`, alert.title);

    return new Response(JSON.stringify({ 
      success: true,
      recipientsCount: adminEmails.length 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Error in send-security-alert function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
};

serve(handler);
