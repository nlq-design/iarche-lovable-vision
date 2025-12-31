import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

// Services data (statique, importée depuis le code)
const SERVICES_DATA = [
  {
    id: 'audit',
    slug: 'audit',
    title: 'Audit & Conseil',
    description: 'Comprendre où vous en êtes et définir par où commencer. On analyse votre activité, vos outils, vos équipes. On identifie où l\'IA a du sens — et où elle n\'en a pas. Résultat : une roadmap claire, chiffrée, priorisée.',
    keywords: ['audit', 'conseil', 'stratégie', 'roadmap', 'analyse', 'maturité', 'cas d\'usage', 'diagnostic']
  },
  {
    id: 'developpement',
    slug: 'developpement',
    title: 'Développement & Intégration',
    description: 'Des solutions IA conçues pour votre métier, connectées à vos outils. Du prototype à la production. Prototypage rapide, architecture adaptée, intégration avec vos outils existants.',
    keywords: ['développement', 'intégration', 'prototype', 'production', 'solution', 'outil', 'logiciel', 'application']
  },
  {
    id: 'accompagnement',
    slug: 'accompagnement',
    title: 'Accompagnement & Autonomie',
    description: 'Rendre vos équipes capables de continuer sans nous. Sessions techniques, ateliers métier, accompagnement individuel ou collectif, documentation personnalisée. Formation prompting, fine-tuning, RAG.',
    keywords: ['formation', 'accompagnement', 'autonomie', 'équipe', 'atelier', 'session', 'prompting', 'compétences']
  },
  {
    id: 'conformite',
    slug: 'conformite',
    title: 'Conformité & Réglementation',
    description: 'S\'assurer que vos projets IA respectent les règles du jeu. AI Act, RGPD : nouvelles obligations pour les entreprises utilisant l\'IA. Audit de conformité, documentation réglementaire, veille.',
    keywords: ['conformité', 'réglementation', 'RGPD', 'AI Act', 'légal', 'audit', 'risque', 'sécurité']
  }
];

interface EmbeddingRequest {
  action: 'generate_single' | 'generate_all' | 'sync_status';
  resource_id?: string;
  resource_type?: string;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Embedding API error:", errorText);
    throw new Error(`embedding_failed: ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function chunkText(text: string, maxLength = 2000): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
}

async function indexResource(
  supabase: any,
  resourceId: string,
  resourceType: string,
  title: string,
  slug: string,
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<{ success: boolean; chunks: number; error?: string }> {
  try {
    // Delete existing embeddings for this resource
    await supabase
      .from("resource_embeddings")
      .delete()
      .eq("resource_id", resourceId);

    // Chunk the content
    const chunks = chunkText(content);
    console.log(`Indexing ${resourceType}/${slug}: ${chunks.length} chunks`);

    // Generate embeddings for each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk);

      const { error } = await supabase
        .from("resource_embeddings")
        .insert({
          resource_id: resourceId,
          resource_type: resourceType,
          resource_title: title,
          resource_slug: slug,
          content_chunk: chunk,
          chunk_index: i,
          embedding: `[${embedding.join(",")}]`,
          metadata: { ...metadata, chunk_total: chunks.length },
        });

      if (error) {
        console.error(`Error inserting chunk ${i}:`, error);
        throw error;
      }
    }

    return { success: true, chunks: chunks.length };
  } catch (error) {
    console.error(`Failed to index ${resourceType}/${slug}:`, error);
    return { success: false, chunks: 0, error: String(error) };
  }
}

async function indexArticle(supabase: any, article: any): Promise<{ success: boolean; chunks: number; error?: string }> {
  const content = [
    article.title,
    article.excerpt || "",
    article.content?.replace(/<[^>]*>/g, " ") || "",
    article.problematique || "",
  ].filter(Boolean).join("\n\n");

  return indexResource(
    supabase,
    article.id,
    article.resource_type,
    article.title,
    article.slug,
    content,
    {
      tags: article.tags,
      thematiques: article.thematiques,
      secteur_activite: article.secteur_activite,
    }
  );
}

async function indexService(supabase: any, service: typeof SERVICES_DATA[0]): Promise<{ success: boolean; chunks: number; error?: string }> {
  const content = [
    service.title,
    service.description,
    service.keywords.join(", "),
  ].join("\n\n");

  // Use a deterministic UUID for services based on slug
  const serviceId = crypto.randomUUID();

  return indexResource(
    supabase,
    serviceId,
    "service",
    service.title,
    service.slug,
    content,
    { service_id: service.id, keywords: service.keywords }
  );
}

async function syncStatus(supabase: any): Promise<Record<string, any>> {
  const status: Record<string, any> = {};

  // Count articles by resource_type (excluding cas-client)
  const resourceTypes = ['article', 'actualite', 'livre-blanc', 'atelier-webinaire', 'solution'];
  
  for (const type of resourceTypes) {
    const { count: totalCount } = await supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("resource_type", type)
      .eq("published", true);

    const { count: indexedCount } = await supabase
      .from("resource_embeddings")
      .select("resource_id", { count: "exact", head: true })
      .eq("resource_type", type);

    // Get unique resource count
    const { data: uniqueResources } = await supabase
      .from("resource_embeddings")
      .select("resource_id")
      .eq("resource_type", type);
    
    const uniqueIndexed = new Set(uniqueResources?.map((r: any) => r.resource_id) || []).size;

    await supabase
      .from("vectorization_status")
      .upsert({
        resource_type: type,
        total_resources: totalCount || 0,
        indexed_resources: uniqueIndexed,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'resource_type' });

    status[type] = {
      total: totalCount || 0,
      indexed: uniqueIndexed,
    };
  }

  // Services (static data)
  const { count: serviceIndexed } = await supabase
    .from("resource_embeddings")
    .select("resource_id", { count: "exact", head: true })
    .eq("resource_type", "service");

  const { data: uniqueServices } = await supabase
    .from("resource_embeddings")
    .select("resource_id")
    .eq("resource_type", "service");
  
  const uniqueServiceCount = new Set(uniqueServices?.map((r: any) => r.resource_id) || []).size;

  await supabase
    .from("vectorization_status")
    .upsert({
      resource_type: "service",
      total_resources: SERVICES_DATA.length,
      indexed_resources: uniqueServiceCount,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'resource_type' });

  status.service = {
    total: SERVICES_DATA.length,
    indexed: uniqueServiceCount,
  };

  return status;
}

async function generateAll(supabase: any): Promise<{
  success: boolean;
  indexed: number;
  errors: number;
  details: Record<string, any>;
}> {
  let indexed = 0;
  let errors = 0;
  const details: Record<string, any> = {};

  // Index services first (static data)
  console.log("Indexing services...");
  
  // Clear existing service embeddings
  await supabase
    .from("resource_embeddings")
    .delete()
    .eq("resource_type", "service");

  for (const service of SERVICES_DATA) {
    const result = await indexService(supabase, service);
    if (result.success) {
      indexed++;
    } else {
      errors++;
    }
  }
  details.services = { indexed: SERVICES_DATA.length - errors, errors };

  // Index articles by type (excluding cas-client)
  const resourceTypes = ['article', 'actualite', 'livre-blanc', 'atelier-webinaire', 'solution'];
  
  for (const type of resourceTypes) {
    console.log(`Indexing ${type}...`);
    const { data: articles } = await supabase
      .from("articles")
      .select("id, title, slug, content, excerpt, resource_type, tags, thematiques, secteur_activite, problematique")
      .eq("resource_type", type)
      .eq("published", true);

    let typeIndexed = 0;
    let typeErrors = 0;

    for (const article of articles || []) {
      const result = await indexArticle(supabase, article);
      if (result.success) {
        indexed++;
        typeIndexed++;
      } else {
        errors++;
        typeErrors++;

        // Log error in status
        await supabase
          .from("vectorization_status")
          .update({ last_error: result.error })
          .eq("resource_type", type);
      }
    }

    details[type] = { indexed: typeIndexed, errors: typeErrors, total: articles?.length || 0 };
  }

  // Sync final status
  await syncStatus(supabase);

  return { success: errors === 0, indexed, errors, details };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: EmbeddingRequest = await req.json();

    console.log("Embedding request:", body.action);

    switch (body.action) {
      case "sync_status": {
        const status = await syncStatus(supabase);
        return new Response(JSON.stringify({ success: true, status }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "generate_single": {
        if (!body.resource_id || !body.resource_type) {
          throw new Error("resource_id and resource_type required");
        }

        let result;
        if (body.resource_type === "service") {
          const service = SERVICES_DATA.find(s => s.id === body.resource_id);
          if (!service) throw new Error("Service not found");
          result = await indexService(supabase, service);
        } else {
          const { data: article } = await supabase
            .from("articles")
            .select("*")
            .eq("id", body.resource_id)
            .single();
          
          if (!article) throw new Error("Article not found");
          result = await indexArticle(supabase, article);
        }

        await syncStatus(supabase);

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "generate_all": {
        const result = await generateAll(supabase);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Unknown action: ${body.action}`);
    }
  } catch (error) {
    console.error("Embedding error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
