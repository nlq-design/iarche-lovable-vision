import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[enrich-all-resources] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[enrich-all-resources] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin role verification
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error('[enrich-all-resources] User is not admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[enrich-all-resources] Admin verified:', user.email);
    console.log('[enrich-all-resources] Démarrage enrichissement en masse');

    // Récupérer tous les articles publiés de tous types
    const { data: articles, error: fetchError } = await supabase
      .from('articles')
      .select('id, title, slug, content, resource_type')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[enrich-all-resources] Erreur récupération articles:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch articles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[enrich-all-resources] ${articles?.length || 0} articles à enrichir`);

    const results = {
      total: articles?.length || 0,
      enriched: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[]
    };

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No articles to enrich', results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enrichir chaque article
    for (const article of articles) {
      try {
        console.log(`[enrich-all-resources] Enrichissement de ${article.slug} (${article.resource_type})`);

        // Vérifier si le contenu contient déjà des <strong> (indicateur d'enrichissement déjà effectué)
        const strongCount = (article.content.match(/<strong>/g) || []).length;
        
        if (strongCount > 10) {
          console.log(`[enrich-all-resources] ${article.slug} déjà enrichi (${strongCount} balises <strong>), skip`);
          results.skipped++;
          results.details.push({
            slug: article.slug,
            status: 'skipped',
            reason: `Already enriched (${strongCount} strong tags)`
          });
          continue;
        }

        // Appel à l'enrichissement SEO
        const systemPrompt = `Tu es un expert SEO. Ta mission est d'enrichir le contenu HTML fourni en ajoutant des balises <strong> autour des mots-clés et concepts importants pour améliorer le référencement naturel.

RÈGLES STRICTES :
1. Conserve EXACTEMENT la structure HTML existante (balises, attributs, classes)
2. Ajoute UNIQUEMENT des balises <strong> autour des mots-clés stratégiques
3. Ne modifie JAMAIS le texte, seulement ajoute des <strong>
4. Privilégie : termes techniques, concepts clés, mots-clés métier, expressions importantes
5. Maximum 2-3% du texte total doit être en gras (ne pas surcharger)
6. Ne mets PAS en gras : articles, prépositions, pronoms, mots de liaison
7. Retourne UNIQUEMENT le HTML enrichi, sans commentaires ni explications
8. Si le contenu contient déjà des <strong>, respecte-les et ajoutes-en d'autres si pertinent`;

        const userPrompt = `Enrichis ce contenu HTML en ajoutant des <strong> sur les mots-clés SEO importants :

${article.content}`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.3,
          }),
        });

        if (!aiResponse.ok) {
          console.error(`[enrich-all-resources] AI error for ${article.slug}:`, aiResponse.status);
          results.failed++;
          results.details.push({
            slug: article.slug,
            status: 'failed',
            reason: `AI error: ${aiResponse.status}`
          });
          continue;
        }

        const aiData = await aiResponse.json();
        const enrichedContent = aiData.choices?.[0]?.message?.content;

        if (!enrichedContent) {
          console.error(`[enrich-all-resources] No enriched content for ${article.slug}`);
          results.failed++;
          results.details.push({
            slug: article.slug,
            status: 'failed',
            reason: 'No enriched content returned'
          });
          continue;
        }

        // Mettre à jour l'article avec le contenu enrichi
        const { error: updateError } = await supabase
          .from('articles')
          .update({ content: enrichedContent })
          .eq('id', article.id);

        if (updateError) {
          console.error(`[enrich-all-resources] Update error for ${article.slug}:`, updateError);
          results.failed++;
          results.details.push({
            slug: article.slug,
            status: 'failed',
            reason: updateError.message
          });
          continue;
        }

        console.log(`[enrich-all-resources] ✅ ${article.slug} enrichi avec succès`);
        results.enriched++;
        results.details.push({
          slug: article.slug,
          status: 'success',
          resourceType: article.resource_type
        });

        // Pause pour éviter rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`[enrich-all-resources] Error processing ${article.slug}:`, error);
        results.failed++;
        results.details.push({
          slug: article.slug,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('[enrich-all-resources] Enrichissement terminé:', results);

    return new Response(
      JSON.stringify({
        message: 'Enrichment completed',
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[enrich-all-resources] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
