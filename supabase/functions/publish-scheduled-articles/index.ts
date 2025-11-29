import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Checking for scheduled articles to publish...');

    // Find articles scheduled for publication
    const { data: scheduledArticles, error: fetchError } = await supabase
      .from('articles')
      .select('id, title, slug, scheduled_publish_at')
      .eq('published', false)
      .not('scheduled_publish_at', 'is', null)
      .lte('scheduled_publish_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching scheduled articles:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!scheduledArticles || scheduledArticles.length === 0) {
      console.log('No articles to publish');
      return new Response(
        JSON.stringify({ message: 'No articles to publish', count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${scheduledArticles.length} articles to publish`);

    // Publish each article
    const publishPromises = scheduledArticles.map(async (article) => {
      console.log(`Publishing article: ${article.title} (${article.id})`);
      
      const { error: updateError } = await supabase
        .from('articles')
        .update({
          published: true,
          published_at: new Date().toISOString(),
          scheduled_publish_at: null,
        })
        .eq('id', article.id);

      if (updateError) {
        console.error(`Error publishing article ${article.id}:`, updateError);
        return { success: false, id: article.id, error: updateError.message };
      }

      // Send newsletter for published article
      try {
        await supabase.functions.invoke('send-newsletter', {
          body: { articleId: article.id }
        });
        console.log(`Newsletter sent for article: ${article.title}`);
      } catch (newsletterError) {
        console.error(`Newsletter error for article ${article.id}:`, newsletterError);
      }

      return { success: true, id: article.id, title: article.title };
    });

    const results = await Promise.allSettled(publishPromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

    console.log(`Published ${successCount} articles, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        message: 'Scheduled articles processed',
        total: scheduledArticles.length,
        published: successCount,
        failed: failCount,
        articles: scheduledArticles.map(a => ({ id: a.id, title: a.title }))
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in publish-scheduled-articles function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
