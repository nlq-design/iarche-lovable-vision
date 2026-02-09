import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { callLLM } from "../_shared/ai-client.ts";
import { loadPrompt } from "../_shared/prompt-loader.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnomalyDetectionResult {
  isAnomalous: boolean;
  riskScore: number;
  reasons: string[];
  recommendations: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const prompt = await loadPrompt(supabase, "security-anomalies", {
      system_prompt: 'Tu es un expert en cybersécurité. Réponds UNIQUEMENT avec du JSON valide, sans markdown ni texte supplémentaire.'
    });

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: logs, error: logsError } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .gte('created_at', last24Hours)
      .order('created_at', { ascending: false });

    if (logsError) throw logsError;

    const deletionCount = logs?.filter(l => l.action_type === 'delete').length || 0;
    const uniqueUsers = new Set(logs?.map(l => l.user_id)).size;
    const actionsByType = logs?.reduce((acc, log) => {
      acc[log.action_type] = (acc[log.action_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const userPrompt = `Analyse de sécurité des logs d'audit admin (dernières 24h) :

Total d'actions : ${logs?.length || 0}
Suppressions : ${deletionCount}
Utilisateurs actifs : ${uniqueUsers}
Actions par type : ${JSON.stringify(actionsByType)}

Logs récents :
${logs?.slice(0, 20).map(l => 
  `- ${l.action_type} sur ${l.resource_type} par ${l.user_email || 'inconnu'} à ${l.created_at}`
).join('\n')}

Retourne ta réponse sous cette structure JSON :
{"isAnomalous": boolean, "riskScore": number (0-100), "reasons": [...], "recommendations": [...]}`;

    const content = await callLLM(
      [
        { role: 'system', content: prompt.system_prompt },
        { role: 'user', content: userPrompt }
      ],
      { functionName: 'detect-anomalies', temperature: 0.3 }
    );
    
    let analysis: AnomalyDetectionResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse AI analysis' }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      analysis,
      stats: { totalActions: logs?.length || 0, deletions: deletionCount, uniqueUsers, actionsByType }
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Error in detect-anomalies:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};

serve(handler);
