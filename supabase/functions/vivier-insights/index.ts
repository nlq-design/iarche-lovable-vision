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
  recent_imports_7d: number;
  hot_leads_count: number;
  complete_data_count: number;
  top_industries: Array<{ industry: string; count: number; avg_score: number }>;
  top_cities: Array<{ city: string; count: number }>;
}

interface Opportunity {
  type: 'hot_leads' | 'golden_segment' | 'quick_win' | 'reactivation';
  title: string;
  description: string;
  count: number;
  avg_score: number;
  priority: 'high' | 'medium';
  action: {
    type: 'search' | 'export' | 'create_list' | 'score';
    label: string;
    query: string;
  };
}

const FALLBACK_PROMPT = `Tu es un assistant commercial expert en prospection B2B.
Tu analyses les données du vivier pour identifier les OPPORTUNITÉS CONCRÈTES du jour.

RÈGLES STRICTES:
1. Chaque opportunité DOIT avoir une action immédiate réalisable
2. Priorise les leads RÉCENTS avec BON SCORE (>60)
3. Identifie les PATTERNS gagnants (secteur + ville + score)
4. Maximum 4 opportunités, triées par potentiel commercial

TYPES D'OPPORTUNITÉS:
- "hot_leads": Leads récents (7j) avec score élevé, prêts à contacter
- "golden_segment": Combinaison secteur+géo surperformante
- "quick_win": Leads qualifiés avec données complètes (email+tel+siret)
- "reactivation": Bons leads scorés mais jamais contactés

FORMAT JSON STRICT:
{
  "opportunities": [...],
  "daily_summary": "Résumé en 1 phrase"
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
    // FETCH STATS FOR OPPORTUNITIES DETECTION
    // ============================================
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      totalResult,
      highScoreResult,
      recentImportsResult,
      hotLeadsResult,
      completeDataResult,
      neverContactedResult,
      industryResult,
      cityResult,
      scoreResult,
    ] = await Promise.all([
      // Core counts
      supabase.from('viviers').select('id', { count: 'exact', head: true }),
      supabase.from('viviers').select('id', { count: 'exact', head: true }).gte('cold_score', 70),
      // Recent imports (7 days)
      supabase.from('viviers').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      // Hot leads: recent + high score
      supabase.from('viviers').select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo)
        .gte('cold_score', 60),
      // Complete data: has email + phone + siret
      supabase.from('viviers').select('id', { count: 'exact', head: true })
        .not('email', 'is', null)
        .not('phone', 'is', null)
        .not('siret', 'is', null)
        .gte('cold_score', 50),
      // Never contacted with good score
      supabase.from('viviers').select('id', { count: 'exact', head: true })
        .gte('cold_score', 60)
        .or('status.eq.new,status.is.null'),
      // Sampling for aggregates
      supabase.from('viviers').select('industry, cold_score, city')
        .not('industry', 'is', null)
        .gte('cold_score', 50)
        .limit(2000),
      supabase.from('viviers').select('city, cold_score')
        .not('city', 'is', null)
        .gte('cold_score', 50)
        .limit(2000),
      supabase.from('viviers').select('cold_score')
        .not('cold_score', 'is', null)
        .limit(500),
    ]);

    const total_leads = totalResult.count || 0;
    const high_score_count = highScoreResult.count || 0;
    const recent_imports_7d = recentImportsResult.count || 0;
    const hot_leads_count = hotLeadsResult.count || 0;
    const complete_data_count = completeDataResult.count || 0;
    const never_contacted_count = neverContactedResult.count || 0;

    // Calculate avg score
    let avg_score = 0;
    if (scoreResult.data && scoreResult.data.length > 0) {
      const scores = scoreResult.data.map(v => v.cold_score as number);
      avg_score = scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    // Process industry data with scores
    const industryMap = new Map<string, { count: number; totalScore: number; scoredCount: number }>();
    industryResult.data?.forEach(v => {
      const ind = v.industry?.toUpperCase().trim();
      if (ind && ind.length > 2) {
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
      .filter(i => i.avg_score >= 50)
      .sort((a, b) => (b.count * b.avg_score) - (a.count * a.avg_score))
      .slice(0, 8);

    // Process city data
    const cityMap = new Map<string, { count: number; totalScore: number }>();
    cityResult.data?.forEach(v => {
      const city = v.city?.toUpperCase().trim();
      if (city && city.length > 2) {
        const existing = cityMap.get(city) || { count: 0, totalScore: 0 };
        cityMap.set(city, {
          count: existing.count + 1,
          totalScore: existing.totalScore + (v.cold_score || 0),
        });
      }
    });

    const top_cities = Array.from(cityMap.entries())
      .map(([city, data]) => ({ 
        city, 
        count: data.count,
        avg_score: Math.round(data.totalScore / data.count)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const stats: VivierStats = {
      total_leads,
      avg_score: Math.round(avg_score * 10) / 10,
      high_score_count,
      recent_imports_7d,
      hot_leads_count,
      complete_data_count,
      top_industries,
      top_cities,
    };

    console.log(`[vivier-insights] Stats: ${total_leads} total, ${hot_leads_count} hot, ${complete_data_count} complete`);

    // ============================================
    // GENERATE OPPORTUNITIES (Rule-based first, then AI enrichment)
    // ============================================
    let opportunities: Opportunity[] = [];

    // 1. Hot Leads (recent + high score)
    if (hot_leads_count > 0) {
      opportunities.push({
        type: 'hot_leads',
        title: `${hot_leads_count} leads chauds cette semaine`,
        description: `Leads importés ces 7 derniers jours avec score ≥60. Prêts à contacter.`,
        count: hot_leads_count,
        avg_score: 65,
        priority: 'high',
        action: {
          type: 'search',
          label: 'Voir les leads chauds',
          query: 'leads récents score élevé',
        },
      });
    }

    // 2. Quick Wins (complete data)
    if (complete_data_count > 10) {
      opportunities.push({
        type: 'quick_win',
        title: `${complete_data_count} leads prêts à l'export`,
        description: `Leads qualifiés avec email, téléphone et SIRET. Données complètes pour campagne.`,
        count: complete_data_count,
        avg_score: 55,
        priority: 'high',
        action: {
          type: 'search',
          label: 'Exporter les leads complets',
          query: 'leads avec téléphone et siret score supérieur à 50',
        },
      });
    }

    // 3. Golden Segment (best industry)
    if (top_industries.length > 0) {
      const best = top_industries[0];
      if (best.count >= 20 && best.avg_score >= 55) {
        opportunities.push({
          type: 'golden_segment',
          title: `Pépite: ${best.industry.substring(0, 25)}`,
          description: `${best.count} leads avec score moyen de ${best.avg_score}. Segment à fort potentiel.`,
          count: best.count,
          avg_score: best.avg_score,
          priority: best.avg_score >= 65 ? 'high' : 'medium',
          action: {
            type: 'create_list',
            label: 'Créer une liste',
            query: `secteur ${best.industry}`,
          },
        });
      }
    }

    // 4. Reactivation (never contacted but good score)
    if (never_contacted_count > 50) {
      opportunities.push({
        type: 'reactivation',
        title: `${never_contacted_count} leads à réactiver`,
        description: `Leads scorés ≥60 jamais contactés. Potentiel inexploité.`,
        count: never_contacted_count,
        avg_score: 62,
        priority: never_contacted_count > 200 ? 'high' : 'medium',
        action: {
          type: 'search',
          label: 'Voir les leads dormants',
          query: 'leads qualifiés non contactés',
        },
      });
    }

    // 5. Best City Opportunity
    if (top_cities.length > 0) {
      const bestCity = top_cities[0];
      if (bestCity.count >= 30) {
        opportunities.push({
          type: 'golden_segment',
          title: `${bestCity.count} leads à ${bestCity.city}`,
          description: `Concentration importante sur cette ville. Idéal pour campagne géolocalisée.`,
          count: bestCity.count,
          avg_score: 0,
          priority: 'medium',
          action: {
            type: 'search',
            label: `Explorer ${bestCity.city}`,
            query: `ville ${bestCity.city}`,
          },
        });
      }
    }

    // Sort by priority and limit
    opportunities = opportunities
      .sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        return b.count - a.count;
      })
      .slice(0, 4);

    // ============================================
    // AI ENRICHMENT (optional - add context to opportunities)
    // ============================================
    let dailySummary = `${total_leads.toLocaleString('fr-FR')} leads dont ${high_score_count} à fort potentiel.`;

    if (lovableApiKey && opportunities.length > 0) {
      try {
        const { data: promptData } = await supabase
          .from('ai_prompts')
          .select('system_prompt, model_config')
          .eq('slug', 'vivier-insights')
          .single();

        const systemPrompt = promptData?.system_prompt || FALLBACK_PROMPT;
        const modelConfig = promptData?.model_config as { model?: string; temperature?: number } || {};

        const userPrompt = `DONNÉES VIVIER:
- Total: ${stats.total_leads.toLocaleString('fr-FR')} leads
- Score moyen: ${stats.avg_score}
- Leads score ≥70: ${stats.high_score_count}
- Imports 7j: ${stats.recent_imports_7d}
- Leads chauds (récents+score≥60): ${stats.hot_leads_count}
- Données complètes (email+tel+siret): ${stats.complete_data_count}

TOP SECTEURS (score≥50):
${stats.top_industries.slice(0, 5).map(i => `- ${i.industry}: ${i.count} (score: ${i.avg_score})`).join('\n')}

TOP VILLES:
${stats.top_cities.slice(0, 5).map(c => `- ${c.city}: ${c.count}`).join('\n')}

Génère le daily_summary en 1 phrase percutante et enrichis les opportunités si tu identifies des patterns intéressants.`;

        const aiResponse = await fetch(LOVABLE_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelConfig.model || 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: modelConfig.temperature || 0.4,
            max_tokens: 1000,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          
          if (content) {
            let jsonStr = content;
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) jsonStr = jsonMatch[1];
            
            try {
              const parsed = JSON.parse(jsonStr.trim());
              if (parsed.daily_summary) {
                dailySummary = parsed.daily_summary;
              }
              // Merge AI opportunities if any new ones
              if (parsed.opportunities?.length > 0) {
                const aiOpps = parsed.opportunities.filter((o: any) => 
                  o.type && o.title && o.action?.query &&
                  !opportunities.some(existing => existing.type === o.type && existing.title === o.title)
                );
                opportunities = [...opportunities, ...aiOpps].slice(0, 4);
              }
            } catch (e) {
              console.log('AI parsing skipped, using rule-based opportunities');
            }
          }
        }
      } catch (aiErr) {
        console.log('AI enrichment skipped:', aiErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      stats,
      opportunities,
      daily_summary: dailySummary,
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
