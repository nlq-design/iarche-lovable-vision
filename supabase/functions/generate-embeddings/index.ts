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

// Services data (statique)
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

// Configuration chunking optimisée
const CHUNK_CONFIG = {
  maxLength: 800,      // Taille max par chunk (réduit de 2000)
  overlap: 150,        // Chevauchement entre chunks
  minLength: 100,      // Taille min pour éviter chunks trop petits
};

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

/**
 * Extrait les sections sémantiques du HTML (basé sur H2/H3)
 */
function extractSemanticSections(html: string): string[] {
  if (!html) return [];
  
  // Nettoyer le HTML
  let cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Découper par titres H2 et H3
  const sectionPattern = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  const sections: string[] = [];
  let lastIndex = 0;
  let match;
  
  // Trouver tous les titres
  const headings: { index: number; title: string }[] = [];
  while ((match = sectionPattern.exec(cleanHtml)) !== null) {
    headings.push({
      index: match.index,
      title: match[1].replace(/<[^>]*>/g, '').trim()
    });
  }
  
  // Extraire le contenu entre chaque titre
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].index;
    const end = i < headings.length - 1 ? headings[i + 1].index : cleanHtml.length;
    const sectionHtml = cleanHtml.substring(start, end);
    const sectionText = sectionHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (sectionText.length >= CHUNK_CONFIG.minLength) {
      sections.push(`${headings[i].title}: ${sectionText}`);
    }
  }
  
  // Si pas de sections trouvées, retourner le contenu nettoyé complet
  if (sections.length === 0) {
    const fullText = cleanHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (fullText.length >= CHUNK_CONFIG.minLength) {
      return [fullText];
    }
  }
  
  return sections;
}

/**
 * Chunk un texte avec overlap pour meilleure continuité sémantique
 */
function chunkTextWithOverlap(text: string): string[] {
  const { maxLength, overlap, minLength } = CHUNK_CONFIG;
  const chunks: string[] = [];
  
  // Si le texte est assez court, retourner tel quel
  if (text.length <= maxLength) {
    return text.length >= minLength ? [text] : [];
  }
  
  // Découper par phrases
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";
  let overlapBuffer = "";
  
  for (const sentence of sentences) {
    // Si ajouter cette phrase dépasse la limite
    if ((currentChunk + " " + sentence).length > maxLength) {
      if (currentChunk.length >= minLength) {
        chunks.push(currentChunk.trim());
        
        // Garder les dernières phrases pour l'overlap
        const words = currentChunk.split(' ');
        overlapBuffer = words.slice(-Math.ceil(overlap / 5)).join(' ');
      }
      
      // Commencer nouveau chunk avec overlap
      currentChunk = overlapBuffer + " " + sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }
  
  // Dernier chunk
  if (currentChunk.trim().length >= minLength) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
}

/**
 * Chunking intelligent combinant sections sémantiques et overlap
 */
function smartChunk(content: string, isHtml: boolean = true): string[] {
  const allChunks: string[] = [];
  
  if (isHtml) {
    // Extraire sections sémantiques
    const sections = extractSemanticSections(content);
    
    // Chunker chaque section avec overlap
    for (const section of sections) {
      const sectionChunks = chunkTextWithOverlap(section);
      allChunks.push(...sectionChunks);
    }
    
    // Si aucun chunk produit, fallback sur texte brut
    if (allChunks.length === 0) {
      const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return chunkTextWithOverlap(plainText);
    }
  } else {
    // Texte brut: juste overlap chunking
    return chunkTextWithOverlap(content);
  }
  
  return allChunks;
}

async function indexResource(
  supabase: any,
  resourceId: string,
  resourceType: string,
  title: string,
  slug: string,
  content: string,
  metadata: Record<string, unknown> = {},
  isHtml: boolean = true
): Promise<{ success: boolean; chunks: number; error?: string }> {
  try {
    // Delete existing embeddings for this resource
    await supabase
      .from("resource_embeddings")
      .delete()
      .eq("resource_id", resourceId);

    // Smart chunking avec sections sémantiques et overlap
    const chunks = smartChunk(content, isHtml);
    console.log(`Indexing ${resourceType}/${slug}: ${chunks.length} chunks (smart chunking)`);

    if (chunks.length === 0) {
      console.warn(`No chunks generated for ${resourceType}/${slug}`);
      return { success: true, chunks: 0 };
    }

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
          metadata: { 
            ...metadata, 
            chunk_total: chunks.length,
            chunk_method: 'semantic_overlap'
          },
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
  // Récupérer la FAQ associée si elle existe
  let faqContent = "";
  const { data: faqData } = await supabase
    .from("faqs")
    .select("questions")
    .eq("article_id", article.id)
    .single();
  
  if (faqData?.questions) {
    const faqQuestions = faqData.questions as Array<{ question: string; answer: string }>;
    faqContent = faqQuestions
      .map(q => `Question: ${q.question}\nRéponse: ${q.answer}`)
      .join("\n\n");
  }

  // Construire le contenu enrichi
  const contentParts = [
    `Titre: ${article.title}`,
    article.excerpt ? `Résumé: ${article.excerpt}` : "",
    article.problematique ? `Problématique: ${article.problematique}` : "",
    article.content || "",
    article.tags?.length ? `Tags: ${article.tags.join(", ")}` : "",
    article.thematiques?.length ? `Thématiques: ${article.thematiques.join(", ")}` : "",
    faqContent ? `\n--- FAQ ---\n${faqContent}` : ""
  ].filter(Boolean).join("\n\n");

  return indexResource(
    supabase,
    article.id,
    article.resource_type,
    article.title,
    article.slug,
    contentParts,
    {
      tags: article.tags,
      thematiques: article.thematiques,
      secteur_activite: article.secteur_activite,
      has_faq: !!faqContent,
    },
    true // is HTML
  );
}

async function indexService(supabase: any, service: typeof SERVICES_DATA[0]): Promise<{ success: boolean; chunks: number; error?: string }> {
  const content = [
    `Service: ${service.title}`,
    service.description,
    `Mots-clés: ${service.keywords.join(", ")}`,
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
    { service_id: service.id, keywords: service.keywords },
    false // not HTML
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

    // Get unique resource count
    const { data: uniqueResources } = await supabase
      .from("resource_embeddings")
      .select("resource_id")
      .eq("resource_type", type);
    
    const uniqueIndexed = new Set(uniqueResources?.map((r: any) => r.resource_id) || []).size;

    // Count total chunks
    const { count: chunkCount } = await supabase
      .from("resource_embeddings")
      .select("id", { count: "exact", head: true })
      .eq("resource_type", type);

    await supabase
      .from("vectorization_status")
      .upsert({
        resource_type: type,
        total_resources: totalCount || 0,
        indexed_resources: uniqueIndexed,
        total_chunks: chunkCount || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'resource_type' });

    status[type] = {
      total: totalCount || 0,
      indexed: uniqueIndexed,
      chunks: chunkCount || 0,
    };
  }

  // Services (static data)
  const { data: uniqueServices } = await supabase
    .from("resource_embeddings")
    .select("resource_id")
    .eq("resource_type", "service");
  
  const uniqueServiceCount = new Set(uniqueServices?.map((r: any) => r.resource_id) || []).size;

  const { count: serviceChunkCount } = await supabase
    .from("resource_embeddings")
    .select("id", { count: "exact", head: true })
    .eq("resource_type", "service");

  await supabase
    .from("vectorization_status")
    .upsert({
      resource_type: "service",
      total_resources: SERVICES_DATA.length,
      indexed_resources: uniqueServiceCount,
      total_chunks: serviceChunkCount || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'resource_type' });

  status.service = {
    total: SERVICES_DATA.length,
    indexed: uniqueServiceCount,
    chunks: serviceChunkCount || 0,
  };

  return status;
}

async function generateAll(supabase: any): Promise<{
  success: boolean;
  indexed: number;
  errors: number;
  totalChunks: number;
  details: Record<string, any>;
}> {
  let indexed = 0;
  let errors = 0;
  let totalChunks = 0;
  const details: Record<string, any> = {};

  // Index services first (static data)
  console.log("Indexing services...");
  
  // Clear existing service embeddings
  await supabase
    .from("resource_embeddings")
    .delete()
    .eq("resource_type", "service");

  let serviceChunks = 0;
  for (const service of SERVICES_DATA) {
    const result = await indexService(supabase, service);
    if (result.success) {
      indexed++;
      serviceChunks += result.chunks;
    } else {
      errors++;
    }
  }
  totalChunks += serviceChunks;
  details.services = { indexed: SERVICES_DATA.length - errors, errors, chunks: serviceChunks };

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
    let typeChunks = 0;

    for (const article of articles || []) {
      const result = await indexArticle(supabase, article);
      if (result.success) {
        indexed++;
        typeIndexed++;
        typeChunks += result.chunks;
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

    totalChunks += typeChunks;
    details[type] = { 
      indexed: typeIndexed, 
      errors: typeErrors, 
      total: articles?.length || 0,
      chunks: typeChunks 
    };
  }

  // Sync final status
  await syncStatus(supabase);

  return { success: errors === 0, indexed, errors, totalChunks, details };
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
