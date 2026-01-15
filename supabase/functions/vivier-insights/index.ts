import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface VivierStats {
  total_leads: number;
  avg_score: number;
  high_score_count: number;
  not_contacted_30d: number;
  top_industries: Array<{ industry: string; count: number; avg_score: number }>;
  top_cities: Array<{ city: string; count: number }>;
  score_distribution: Array<{ range: string; count: number }>;
}

const FALLBACK_PROMPT = `Tu es un expert en analyse de données commerciales B2B.
Tu reçois des statistiques agrégées sur une base de prospects.
Génère des INSIGHTS ACTIONNABLES pour aider l'équipe commerciale.

Types d'insights à produire:
1. OPPORTUNITÉS : Leads à fort potentiel non exploités
2. COHORTES : Segments surperformants
3. TENDANCES : Évolutions notables
4. ALERTES : Points d'attention

Règles:
- Maximum 5 insights par réponse
- Chaque insight DOIT avoir une action concrète
- Être spécifique avec les chiffres
- Toujours proposer une requête IA suggérée

Format JSON strict (pas de markdown, juste le JSON):
{
  "insights": [
    {
      "type": "opportunity|cohort|trend|alert",
      "title": "Titre court < 60 chars",
      "description": "Description avec chiffres précis",
      "metric": "Valeur clé",
      "priority": "high|medium|low",
      "suggested_query": "Requête IA suggérée"
    }
  ]
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ============================================
    // ULTRA-FAST STATS FETCHING - Direct parallel count queries
    // Bypasses slow RPC and uses indexed columns only
    // ============================================

    // Run all count queries in parallel - much faster than RPC
    const [
      totalResult,
      scoredResult,
      qualifiedResult,
      promotedResult,
    ] = await Promise.all([
      supabase.from('viviers').select('id', { count: 'exact', head: true }),
      supabase.from('viviers').select('id', { count: 'exact', head: true }).not('cold_score', 'is', null),
      supabase.from('viviers').select('id', { count: 'exact', head: true }).gte('cold_score', 70),
      supabase.from('viviers').select('id', { count: 'exact', head: true }).eq('status', 'promoted'),
    ]);

    const total_leads = totalResult.count || 0;
    const scored_count = scoredResult.count || 0;
    const high_score_count = qualifiedResult.count || 0;
    const pending_count = total_leads - scored_count;

    // For avg_score, sample a small set (fast) - don't scan full table
    let avg_score = 0;
    if (scored_count > 0) {
      const { data: scoreData } = await supabase
        .from('viviers')
        .select('cold_score')
        .not('cold_score', 'is', null)
        .limit(500); // Small sample for speed
      
      if (scoreData && scoreData.length > 0) {
        const scores = scoreData.map(v => v.cold_score as number);
        avg_score = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
    }

    // Leads with status 'new' and score >= 50 (qualified but not yet contacted)
    const { count: notContactedCount } = await supabase
      .from('viviers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
      .gte('cold_score', 50);
    
    const not_contacted_30d = notContactedCount || 0;

    // ============================================
    // TOP INDUSTRIES - Optimized with sampling
    // ============================================
    // For large tables, sample up to 20k rows to compute industry distribution
    const SAMPLE_SIZE = 20000;
    const { data: industryData } = await supabase
      .from('viviers')
      .select('industry, cold_score')
      .not('industry', 'is', null)
      .limit(SAMPLE_SIZE);

    const industryMap = new Map<string, { count: number; totalScore: number; scoredCount: number }>();
    industryData?.forEach(v => {
      const ind = v.industry?.toUpperCase().trim();
      if (ind && ind.length > 2) { // Filter out very short industry names
        const existing = industryMap.get(ind) || { count: 0, totalScore: 0, scoredCount: 0 };
        industryMap.set(ind, {
          count: existing.count + 1,
          totalScore: existing.totalScore + (v.cold_score || 0),
          scoredCount: existing.scoredCount + (v.cold_score !== null ? 1 : 0),
        });
      }
    });

    const top_industries = Array.from(industryMap.entries())
      .map(([industry, data]) => ({
        industry,
        count: data.count,
        avg_score: data.scoredCount > 0 ? Math.round(data.totalScore / data.scoredCount) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ============================================
    // TOP CITIES - Optimized with sampling
    // ============================================
    const { data: cityData } = await supabase
      .from('viviers')
      .select('city')
      .not('city', 'is', null)
      .limit(SAMPLE_SIZE);

    const cityMap = new Map<string, number>();
    cityData?.forEach(v => {
      const city = v.city?.toUpperCase().trim();
      if (city && city.length > 2) { // Filter out very short city names
        cityMap.set(city, (cityMap.get(city) || 0) + 1);
      }
    });

    const top_cities = Array.from(cityMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ============================================
    // SCORE DISTRIBUTION - Using count queries for accuracy
    // ============================================
    // Parallel count queries for each score range
    const [dist0_20, dist20_40, dist40_60, dist60_80, dist80_100] = await Promise.all([
      supabase.from('viviers').select('id', { count: 'exact', head: true })
        .not('cold_score', 'is', null).gte('cold_score', 0).lt('cold_score', 20),
      supabase.from('viviers').select('id', { count: 'exact', head: true })
        .not('cold_score', 'is', null).gte('cold_score', 20).lt('cold_score', 40),
      supabase.from('viviers').select('id', { count: 'exact', head: true })
        .not('cold_score', 'is', null).gte('cold_score', 40).lt('cold_score', 60),
      supabase.from('viviers').select('id', { count: 'exact', head: true })
        .not('cold_score', 'is', null).gte('cold_score', 60).lt('cold_score', 80),
      supabase.from('viviers').select('id', { count: 'exact', head: true })
        .not('cold_score', 'is', null).gte('cold_score', 80).lte('cold_score', 100),
    ]);

    const score_distribution = [
      { range: '0-20', count: dist0_20.count || 0 },
      { range: '20-40', count: dist20_40.count || 0 },
      { range: '40-60', count: dist40_60.count || 0 },
      { range: '60-80', count: dist60_80.count || 0 },
      { range: '80-100', count: dist80_100.count || 0 },
    ];

    const stats: VivierStats = {
      total_leads,
      avg_score: Math.round(avg_score * 10) / 10,
      high_score_count,
      not_contacted_30d,
      top_industries,
      top_cities,
      score_distribution,
    };

    console.log(`[vivier-insights] Stats computed: ${total_leads} total, ${scored_count} scored, ${pending_count} pending`);

    // 2. Fetch prompt from ai_prompts
    const { data: promptData } = await supabase
      .from('ai_prompts')
      .select('system_prompt, model_config')
      .eq('slug', 'vivier-insights')
      .single();

    const systemPrompt = promptData?.system_prompt || FALLBACK_PROMPT;
    const modelConfig = promptData?.model_config as { model?: string; temperature?: number } || {};
    const model = modelConfig.model || 'google/gemini-2.5-flash';
    const temperature = modelConfig.temperature || 0.3;

    // 3. Generate insights via AI
    let insights: any[] = [];

    if (lovableApiKey && total_leads > 0) {
      try {
        const userPrompt = `Voici les statistiques actuelles des viviers:

TOTAUX:
- Total leads: ${stats.total_leads.toLocaleString('fr-FR')}
- Score moyen: ${stats.avg_score}
- Leads score ≥ 70: ${stats.high_score_count.toLocaleString('fr-FR')}
- Leads qualifiés non contactés: ${stats.not_contacted_30d.toLocaleString('fr-FR')}
- Leads en attente de scoring: ${pending_count.toLocaleString('fr-FR')}

TOP SECTEURS:
${stats.top_industries.slice(0, 5).map(i => `- ${i.industry}: ${i.count} leads (score moy: ${i.avg_score})`).join('\n')}

TOP VILLES:
${stats.top_cities.slice(0, 5).map(c => `- ${c.city}: ${c.count} leads`).join('\n')}

DISTRIBUTION SCORES:
${stats.score_distribution.map(d => `- ${d.range}: ${d.count} leads`).join('\n')}

Génère 3 à 5 insights actionnables basés sur ces données. Retourne uniquement un objet JSON valide.`;

        const aiResponse = await fetch(LOVABLE_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature,
            max_tokens: 1500,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          
          if (content) {
            // Parse JSON from response (handle markdown code blocks)
            let jsonStr = content;
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
              jsonStr = jsonMatch[1];
            }
            
            try {
              const parsed = JSON.parse(jsonStr.trim());
              if (parsed.insights && Array.isArray(parsed.insights)) {
                insights = parsed.insights;
              }
            } catch (parseErr) {
              console.error('Failed to parse AI response:', parseErr);
            }
          }
        } else {
          const errorText = await aiResponse.text();
          console.error('AI API error:', aiResponse.status, errorText);
        }
      } catch (aiErr) {
        console.error('AI call failed:', aiErr);
      }
    }

    // 4. Fallback: generate basic insights from stats if AI failed
    if (insights.length === 0) {
      // Alert for pending scoring
      if (pending_count > 0) {
        insights.push({
          type: 'alert',
          title: 'Leads en attente de scoring',
          description: `${pending_count.toLocaleString('fr-FR')} leads n'ont pas encore été scorés. Lancez le scoring pour les qualifier.`,
          metric: pending_count.toString(),
          priority: pending_count > 10000 ? 'high' : 'medium',
          suggested_query: 'leads sans score',
        });
      }

      // Generate rule-based insights
      if (stats.not_contacted_30d > 100) {
        insights.push({
          type: 'opportunity',
          title: 'Leads qualifiés non exploités',
          description: `${stats.not_contacted_30d} leads avec score ≥ 50 n'ont pas été contactés.`,
          metric: stats.not_contacted_30d.toString(),
          priority: stats.not_contacted_30d > 500 ? 'high' : 'medium',
          suggested_query: 'leads qualifiés non contactés',
        });
      }

      if (stats.high_score_count > 0) {
        insights.push({
          type: 'opportunity',
          title: 'Leads à fort potentiel',
          description: `${stats.high_score_count} leads ont un score ≥ 70, prioritaires pour la prospection.`,
          metric: stats.high_score_count.toString(),
          priority: 'high',
          suggested_query: 'leads score supérieur à 70',
        });
      }

      if (stats.top_industries.length > 0 && stats.top_industries[0].count > 50) {
        const topInd = stats.top_industries[0];
        insights.push({
          type: 'cohort',
          title: `Secteur ${topInd.industry} dominant`,
          description: `${topInd.count} leads dans ce secteur avec un score moyen de ${topInd.avg_score}.`,
          metric: topInd.count.toString(),
          priority: 'medium',
          suggested_query: `secteur ${topInd.industry}`,
        });
      }

      const lowScoreCount = stats.score_distribution
        .filter(d => d.range === '0-20' || d.range === '20-40')
        .reduce((sum, d) => sum + d.count, 0);
      
      const totalScored = stats.score_distribution.reduce((sum, d) => sum + d.count, 0);
      if (totalScored > 0 && lowScoreCount > totalScored * 0.4) {
        insights.push({
          type: 'alert',
          title: 'Beaucoup de leads à faible score',
          description: `${Math.round(lowScoreCount / totalScored * 100)}% des leads scorés ont un score < 40. Envisager un enrichissement ou nettoyage.`,
          metric: `${Math.round(lowScoreCount / totalScored * 100)}%`,
          priority: 'medium',
          suggested_query: 'leads score inférieur à 40',
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      stats,
      insights,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('vivier-insights error:', err);
    return new Response(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
