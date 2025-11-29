import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Seuils critiques de performance
const THRESHOLDS = {
  performance_score: 85,        // Score Lighthouse < 85
  accessibility_score: 90,      // Accessibilité < 90
  best_practices_score: 90,     // Best Practices < 90
  seo_score: 95,                // SEO < 95
  lcp: 2.5,                     // LCP > 2.5s (Core Web Vital)
  fcp: 1.8,                     // FCP > 1.8s
  tti: 3.8,                     // TTI > 3.8s
  cls: 0.1,                     // CLS > 0.1 (shift layout)
  tbt: 200,                     // TBT > 200ms
  bundle_size_total: 500        // Bundle > 500KB
};

interface PerformanceMetric {
  performance_score?: number;
  accessibility_score?: number;
  best_practices_score?: number;
  seo_score?: number;
  fcp?: number;
  lcp?: number;
  tti?: number;
  tbt?: number;
  cls?: number;
  bundle_size_total?: number;
  environment: string;
  recorded_at: string;
}

interface ThresholdViolation {
  metric: string;
  value: number;
  threshold: number;
  severity: 'critical' | 'warning';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      throw new Error('Unauthorized: Admin role required');
    }

    const metric: PerformanceMetric = await req.json();
    console.log('Checking performance thresholds for:', metric);

    // Détection des violations de seuils
    const violations: ThresholdViolation[] = [];

    // Lighthouse scores (lower is worse)
    if (metric.performance_score !== undefined && metric.performance_score < THRESHOLDS.performance_score) {
      violations.push({
        metric: 'Performance Score',
        value: metric.performance_score,
        threshold: THRESHOLDS.performance_score,
        severity: metric.performance_score < 70 ? 'critical' : 'warning'
      });
    }

    if (metric.accessibility_score !== undefined && metric.accessibility_score < THRESHOLDS.accessibility_score) {
      violations.push({
        metric: 'Accessibility Score',
        value: metric.accessibility_score,
        threshold: THRESHOLDS.accessibility_score,
        severity: 'warning'
      });
    }

    if (metric.best_practices_score !== undefined && metric.best_practices_score < THRESHOLDS.best_practices_score) {
      violations.push({
        metric: 'Best Practices Score',
        value: metric.best_practices_score,
        threshold: THRESHOLDS.best_practices_score,
        severity: 'warning'
      });
    }

    if (metric.seo_score !== undefined && metric.seo_score < THRESHOLDS.seo_score) {
      violations.push({
        metric: 'SEO Score',
        value: metric.seo_score,
        threshold: THRESHOLDS.seo_score,
        severity: 'warning'
      });
    }

    // Core Web Vitals (higher is worse)
    if (metric.lcp !== undefined && metric.lcp > THRESHOLDS.lcp) {
      violations.push({
        metric: 'LCP (Largest Contentful Paint)',
        value: metric.lcp,
        threshold: THRESHOLDS.lcp,
        severity: metric.lcp > 4.0 ? 'critical' : 'warning'
      });
    }

    if (metric.fcp !== undefined && metric.fcp > THRESHOLDS.fcp) {
      violations.push({
        metric: 'FCP (First Contentful Paint)',
        value: metric.fcp,
        threshold: THRESHOLDS.fcp,
        severity: 'warning'
      });
    }

    if (metric.tti !== undefined && metric.tti > THRESHOLDS.tti) {
      violations.push({
        metric: 'TTI (Time to Interactive)',
        value: metric.tti,
        threshold: THRESHOLDS.tti,
        severity: 'warning'
      });
    }

    if (metric.cls !== undefined && metric.cls > THRESHOLDS.cls) {
      violations.push({
        metric: 'CLS (Cumulative Layout Shift)',
        value: metric.cls,
        threshold: THRESHOLDS.cls,
        severity: metric.cls > 0.25 ? 'critical' : 'warning'
      });
    }

    if (metric.tbt !== undefined && metric.tbt > THRESHOLDS.tbt) {
      violations.push({
        metric: 'TBT (Total Blocking Time)',
        value: metric.tbt,
        threshold: THRESHOLDS.tbt,
        severity: 'warning'
      });
    }

    // Bundle size
    if (metric.bundle_size_total !== undefined && metric.bundle_size_total > THRESHOLDS.bundle_size_total) {
      violations.push({
        metric: 'Bundle Size Total',
        value: metric.bundle_size_total,
        threshold: THRESHOLDS.bundle_size_total,
        severity: metric.bundle_size_total > 700 ? 'critical' : 'warning'
      });
    }

    // Si aucune violation, retourner succès
    if (violations.length === 0) {
      console.log('No threshold violations detected');
      return new Response(
        JSON.stringify({ 
          success: true, 
          violations: 0,
          message: 'All metrics within acceptable thresholds' 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Générer email d'alerte
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    const warningViolations = violations.filter(v => v.severity === 'warning');

    const violationsHTML = violations.map(v => {
      const color = v.severity === 'critical' ? '#dc2626' : '#f59e0b';
      const icon = v.severity === 'critical' ? '🔴' : '⚠️';
      const comparator = ['LCP', 'FCP', 'TTI', 'CLS', 'TBT', 'Bundle'].some(s => v.metric.includes(s)) ? '>' : '<';
      
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 8px; color: ${color}; font-weight: 600;">
            ${icon} ${v.metric}
          </td>
          <td style="padding: 12px 8px; text-align: center; font-family: monospace;">
            ${v.value}${v.metric.includes('Score') ? '' : v.metric.includes('KB') ? ' KB' : v.metric.includes('ms') ? ' ms' : v.metric.includes('s)') ? 's' : ''}
          </td>
          <td style="padding: 12px 8px; text-align: center; color: #6b7280;">
            ${comparator} ${v.threshold}
          </td>
        </tr>
      `;
    }).join('');

    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 8px; margin-top: 32px; margin-bottom: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="margin: 0; color: #1f2937; font-size: 24px; font-weight: 700;">
                ${criticalViolations.length > 0 ? '🚨 Alerte Performance Critique' : '⚠️ Alerte Performance'}
              </h1>
              <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
                ${metric.environment.toUpperCase()} · ${new Date(metric.recorded_at).toLocaleString('fr-FR')}
              </p>
            </div>

            <!-- Summary -->
            <div style="background-color: ${criticalViolations.length > 0 ? '#fef2f2' : '#fffbeb'}; border-left: 4px solid ${criticalViolations.length > 0 ? '#dc2626' : '#f59e0b'}; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #1f2937;">
                <strong>${violations.length} métrique${violations.length > 1 ? 's' : ''}</strong> ${violations.length > 1 ? 'ont' : 'a'} dépassé les seuils critiques :
              </p>
              ${criticalViolations.length > 0 ? `
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #dc2626; font-weight: 600;">
                  • ${criticalViolations.length} critique${criticalViolations.length > 1 ? 's' : ''}
                </p>
              ` : ''}
              ${warningViolations.length > 0 ? `
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #f59e0b; font-weight: 600;">
                  • ${warningViolations.length} avertissement${warningViolations.length > 1 ? 's' : ''}
                </p>
              ` : ''}
            </div>

            <!-- Violations Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">
                    Métrique
                  </th>
                  <th style="padding: 12px 8px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">
                    Valeur
                  </th>
                  <th style="padding: 12px 8px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">
                    Seuil
                  </th>
                </tr>
              </thead>
              <tbody>
                ${violationsHTML}
              </tbody>
            </table>

            <!-- Actions recommandées -->
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1f2937;">
                Actions recommandées
              </h3>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4b5563; line-height: 1.6;">
                ${criticalViolations.some(v => v.metric.includes('Performance')) ? `
                  <li>Vérifier le lazy loading des routes admin et des images</li>
                ` : ''}
                ${violations.some(v => v.metric.includes('LCP')) ? `
                  <li>Optimiser les images above-the-fold (WebP, compression)</li>
                ` : ''}
                ${violations.some(v => v.metric.includes('Bundle')) ? `
                  <li>Analyser le bundle avec webpack-bundle-analyzer</li>
                  <li>Vérifier les dépendances inutilisées ou dupliquées</li>
                ` : ''}
                ${violations.some(v => v.metric.includes('CLS')) ? `
                  <li>Corriger les problèmes de décalage de mise en page</li>
                  <li>Définir les dimensions d'images et conteneurs</li>
                ` : ''}
                <li>Consulter le dashboard performance dans l'admin</li>
                <li>Comparer avec les métriques précédentes</li>
              </ul>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Cette alerte a été générée automatiquement par IArche Performance Monitoring
              </p>
            </div>

          </div>
        </body>
      </html>
    `;

    // Envoyer l'email d'alerte via Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "IArche Performance <onboarding@resend.dev>",
        to: ["nlq@iarche.fr"],
        subject: `${criticalViolations.length > 0 ? '🚨 CRITIQUE' : '⚠️ Alerte'} Performance ${metric.environment.toUpperCase()} · ${violations.length} métrique${violations.length > 1 ? 's' : ''} hors seuil`,
        html: emailHTML,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const emailData = await emailResponse.json();
    console.log('Alert email sent successfully:', emailData);

    return new Response(
      JSON.stringify({
        success: true,
        violations: violations.length,
        critical: criticalViolations.length,
        warnings: warningViolations.length,
        emailSent: true,
        emailId: emailData.id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in check-performance-threshold:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
