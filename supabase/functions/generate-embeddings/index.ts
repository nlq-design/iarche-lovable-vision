import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Embedding dimension for OpenAI text-embedding-3-small
const EMBEDDING_DIM = 1536;

/**
 * Generate embedding using OpenAI API directly
 * Falls back to deterministic hash-based approach if OpenAI fails
 */
async function generateEmbedding(text: string): Promise<number[]> {
  // Try OpenAI embeddings API
  if (OPENAI_API_KEY && OPENAI_API_KEY.startsWith("sk-")) {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text.slice(0, 8000), // Limit to 8000 chars for safety
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.[0]?.embedding) {
          return data.data[0].embedding;
        }
      } else {
        const errorText = await response.text();
        console.warn("OpenAI embedding API error:", response.status, errorText);
      }
    } catch (e) {
      console.warn("OpenAI embedding request failed:", e);
    }
  }

  // Fallback: Generate deterministic hash-based embedding (768 dims for compat)
  console.log("Using hash-based fallback embedding");
  const embedding = new Array(768).fill(0);
  const normalizedText = text.toLowerCase().trim();
  
  for (let i = 0; i < normalizedText.length; i++) {
    const charCode = normalizedText.charCodeAt(i);
    for (let d = 0; d < 768; d++) {
      const angle = (i / Math.pow(10000, (2 * (d % 384)) / 768));
      if (d % 2 === 0) {
        embedding[d] += Math.sin(angle) * (charCode / 255);
      } else {
        embedding[d] += Math.cos(angle) * (charCode / 255);
      }
    }
  }
  
  // Normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < 768; i++) {
      embedding[i] = embedding[i] / magnitude;
    }
  }
  
  return embedding;
}

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

// Configuration chunking optimisée - REDUCED minLength for short content
const CHUNK_CONFIG = {
  maxLength: 800,
  overlap: 150,
  minLength: 30, // Reduced from 100 to handle short lead/project descriptions
};

// Extended resource types for Cockpit modules
const COCKPIT_RESOURCE_TYPES = [
  'lead', 'project', 'partner', 'uploaded_file', 'specification',
  'voice_transcription', 'generated_document'
];

interface EmbeddingRequest {
  action: 'generate_single' | 'generate_all' | 'sync_status';
  resource_id?: string;
  resource_type?: string;
}

/**
 * Extrait les sections sémantiques du HTML (basé sur H2/H3)
 */
function extractSemanticSections(html: string): string[] {
  if (!html) return [];
  
  let cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  const sectionPattern = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  const headings: { index: number; title: string }[] = [];
  let match;
  
  while ((match = sectionPattern.exec(cleanHtml)) !== null) {
    headings.push({
      index: match.index,
      title: match[1].replace(/<[^>]*>/g, '').trim()
    });
  }
  
  const sections: string[] = [];
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].index;
    const end = i < headings.length - 1 ? headings[i + 1].index : cleanHtml.length;
    const sectionHtml = cleanHtml.substring(start, end);
    const sectionText = sectionHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (sectionText.length >= CHUNK_CONFIG.minLength) {
      sections.push(`${headings[i].title}: ${sectionText}`);
    }
  }
  
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
  
  if (text.length <= maxLength) {
    return text.length >= minLength ? [text] : [];
  }
  
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";
  let overlapBuffer = "";
  
  for (const sentence of sentences) {
    if ((currentChunk + " " + sentence).length > maxLength) {
      if (currentChunk.length >= minLength) {
        chunks.push(currentChunk.trim());
        const words = currentChunk.split(' ');
        overlapBuffer = words.slice(-Math.ceil(overlap / 5)).join(' ');
      }
      currentChunk = overlapBuffer + " " + sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }
  
  if (currentChunk.trim().length >= minLength) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : (text.length >= minLength ? [text.substring(0, maxLength)] : []);
}

/**
 * Chunking intelligent combinant sections sémantiques et overlap
 */
function smartChunk(content: string, isHtml: boolean = true): string[] {
  if (!content || content.trim().length < CHUNK_CONFIG.minLength) {
    return content && content.trim().length >= CHUNK_CONFIG.minLength ? [content.trim()] : [];
  }
  
  const allChunks: string[] = [];
  
  if (isHtml) {
    const sections = extractSemanticSections(content);
    
    for (const section of sections) {
      const sectionChunks = chunkTextWithOverlap(section);
      allChunks.push(...sectionChunks);
    }
    
    if (allChunks.length === 0) {
      const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return chunkTextWithOverlap(plainText);
    }
  } else {
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
    console.log(`Indexing ${resourceType}/${slug.slice(0, 20)}: ${chunks.length} chunks`);

    if (chunks.length === 0) {
      // Even if no chunks, we consider it "processed" - just no content to index
      console.warn(`No chunks generated for ${resourceType}/${slug.slice(0, 20)} (content length: ${content?.length || 0})`);
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
    const errorMsg = `Error: embedding_failed: ${JSON.stringify(error)}`;
    console.error(`Failed to index ${resourceType}/${slug}:`, error);
    return { success: false, chunks: 0, error: errorMsg };
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
    true
  );
}

async function indexService(supabase: any, service: typeof SERVICES_DATA[0]): Promise<{ success: boolean; chunks: number; error?: string }> {
  const content = [
    `Service IArche: ${service.title}`,
    service.description,
    `Mots-clés: ${service.keywords.join(", ")}`,
  ].join("\n\n");

  const serviceId = crypto.randomUUID();

  return indexResource(
    supabase,
    serviceId,
    "service",
    service.title,
    service.slug,
    content,
    { service_id: service.id, keywords: service.keywords },
    false
  );
}

// ===== Cockpit Module Indexing Functions =====

async function indexLead(supabase: any, lead: any): Promise<{ success: boolean; chunks: number; error?: string }> {
  const content = [
    `Lead CRM: ${lead.name}`,
    lead.company ? `Entreprise: ${lead.company}` : "",
    lead.email ? `Contact: ${lead.email}` : "",
    lead.phone ? `Téléphone: ${lead.phone}` : "",
    lead.industry ? `Secteur d'activité: ${lead.industry}` : "",
    lead.position ? `Fonction: ${lead.position}` : "",
    lead.company_size ? `Taille entreprise: ${lead.company_size}` : "",
    lead.source ? `Canal d'acquisition: ${lead.source}` : "",
    lead.source_context ? `Contexte: ${lead.source_context}` : "",
    lead.message ? `Message: ${lead.message}` : "",
    lead.qualification_status ? `Statut qualification: ${lead.qualification_status}` : "",
    lead.lead_score ? `Score: ${lead.lead_score}` : "",
  ].filter(Boolean).join("\n");

  return indexResource(
    supabase,
    lead.id,
    "lead",
    `${lead.name}${lead.company ? ` - ${lead.company}` : ''}`,
    lead.email || lead.id,
    content,
    { 
      company: lead.company, 
      qualification_status: lead.qualification_status,
      lead_score: lead.lead_score 
    },
    false
  );
}

async function indexProject(supabase: any, project: any): Promise<{ success: boolean; chunks: number; error?: string }> {
  const content = [
    `Projet IArche: ${project.name}`,
    project.description ? `Description du projet: ${project.description}` : "",
    project.status ? `Phase projet: ${project.status}` : "",
    project.health_status ? `Santé projet: ${project.health_status}` : "",
    project.budget_amount ? `Budget alloué: ${project.budget_amount}€` : "",
    project.start_date ? `Démarrage: ${project.start_date}` : "",
    project.end_date ? `Échéance: ${project.end_date}` : "",
    project.tags?.length ? `Tags: ${project.tags.join(", ")}` : "",
  ].filter(Boolean).join("\n");

  return indexResource(
    supabase,
    project.id,
    "project",
    project.name,
    project.id,
    content,
    { 
      status: project.status, 
      health_status: project.health_status,
      budget_amount: project.budget_amount 
    },
    false
  );
}

async function indexUploadedFile(supabase: any, file: any): Promise<{ success: boolean; chunks: number; error?: string }> {
  const content = [
    `Document uploadé: ${file.original_filename}`,
    file.file_type ? `Type de fichier: ${file.file_type}` : "",
    file.category ? `Catégorie: ${file.category}` : "",
    file.extracted_text ? `Contenu extrait:\n${file.extracted_text}` : "",
    file.ai_summary ? `Résumé IA: ${file.ai_summary}` : "",
    file.tags?.length ? `Tags: ${file.tags.join(", ")}` : "",
  ].filter(Boolean).join("\n\n");

  return indexResource(
    supabase,
    file.id,
    "uploaded_file",
    file.original_filename,
    file.id,
    content,
    { 
      file_type: file.file_type, 
      category: file.category,
      has_ai_summary: !!file.ai_summary 
    },
    false
  );
}

async function indexSpecification(supabase: any, spec: any): Promise<{ success: boolean; chunks: number; error?: string }> {
  // Parse content_json robustly
  let contentJson = spec.content_json;
  if (typeof contentJson === 'string') {
    try {
      contentJson = JSON.parse(contentJson);
    } catch {
      contentJson = { raw_content: contentJson };
    }
  }

  // Extract all meaningful fields from content_json
  const extractContent = (obj: any, prefix = ''): string[] => {
    if (!obj) return [];
    const parts: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      if (typeof value === 'string' && value.trim()) {
        parts.push(`${prefix}${key}: ${value}`);
      } else if (Array.isArray(value)) {
        const arrayStr = value.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ');
        if (arrayStr) parts.push(`${prefix}${key}: ${arrayStr}`);
      } else if (typeof value === 'object') {
        parts.push(...extractContent(value, `${prefix}${key}.`));
      }
    }
    return parts;
  };

  const jsonContent = extractContent(contentJson);
  
  const content = [
    `Cahier des charges: ${spec.title}`,
    spec.version ? `Version: ${spec.version}` : "",
    spec.status ? `Statut: ${spec.status}` : "",
    ...jsonContent,
  ].filter(Boolean).join("\n\n");

  return indexResource(
    supabase,
    spec.id,
    "specification",
    spec.title,
    spec.id,
    content,
    { 
      version: spec.version, 
      status: spec.status 
    },
    false
  );
}

async function indexVoiceTranscription(supabase: any, transcription: any): Promise<{ success: boolean; chunks: number; error?: string }> {
  const content = [
    transcription.original_filename ? `Enregistrement audio: ${transcription.original_filename}` : "Transcription vocale",
    transcription.transcript_text ? `Transcription complète:\n${transcription.transcript_text}` : "",
    transcription.ai_summary ? `Résumé IA: ${transcription.ai_summary}` : "",
    transcription.detected_entities ? `Entités détectées: ${JSON.stringify(transcription.detected_entities)}` : "",
  ].filter(Boolean).join("\n\n");

  return indexResource(
    supabase,
    transcription.id,
    "voice_transcription",
    transcription.original_filename || `Transcription ${transcription.id.slice(0, 8)}`,
    transcription.id,
    content,
    { 
      status: transcription.status,
      has_summary: !!transcription.ai_summary 
    },
    false
  );
}

async function indexPartner(supabase: any, partner: any): Promise<{ success: boolean; chunks: number; error?: string }> {
  const content = [
    `Partenaire IArche: ${partner.name}`,
    partner.type ? `Type de partenariat: ${partner.type}` : "",
    partner.company ? `Entreprise: ${partner.company}` : "",
    partner.email ? `Contact: ${partner.email}` : "",
    partner.phone ? `Téléphone: ${partner.phone}` : "",
    partner.specialty ? `Spécialité: ${partner.specialty}` : "",
    partner.description ? `Description: ${partner.description}` : "",
    partner.expertise_areas?.length ? `Domaines d'expertise: ${partner.expertise_areas.join(", ")}` : "",
    partner.commission_rate ? `Taux commission: ${partner.commission_rate}%` : "",
    partner.status ? `Statut: ${partner.status}` : "",
  ].filter(Boolean).join("\n");

  return indexResource(
    supabase,
    partner.id,
    "partner",
    partner.name,
    partner.id,
    content,
    { 
      type: partner.type, 
      specialty: partner.specialty,
      status: partner.status 
    },
    false
  );
}

async function indexGeneratedDocument(supabase: any, doc: any): Promise<{ success: boolean; chunks: number; error?: string }> {
  // Parse content_json robustly
  let contentJson = doc.content_json;
  if (typeof contentJson === 'string') {
    try {
      contentJson = JSON.parse(contentJson);
    } catch {
      contentJson = { raw_content: contentJson };
    }
  }

  // Recursive extraction for nested objects
  const extractContent = (obj: any, depth = 0): string => {
    if (!obj || depth > 3) return '';
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number') return String(obj);
    if (Array.isArray(obj)) {
      return obj.map(item => extractContent(item, depth + 1)).filter(Boolean).join('\n');
    }
    if (typeof obj === 'object') {
      const parts: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) continue;
        // Skip internal fields
        if (['id', 'created_at', 'updated_at', 'workspace_id'].includes(key)) continue;
        const extracted = extractContent(value, depth + 1);
        if (extracted) {
          parts.push(`${key}: ${extracted}`);
        }
      }
      return parts.join('\n');
    }
    return '';
  };

  const jsonContent = extractContent(contentJson);
  
  const content = [
    `Document généré: ${doc.title}`,
    doc.document_type ? `Type: ${doc.document_type}` : "",
    doc.version ? `Version: ${doc.version}` : "",
    doc.status ? `Statut: ${doc.status}` : "",
    jsonContent ? `Contenu:\n${jsonContent}` : "",
  ].filter(Boolean).join("\n\n");

  return indexResource(
    supabase,
    doc.id,
    "generated_document",
    doc.title,
    doc.id,
    content,
    { 
      document_type: doc.document_type, 
      version: doc.version,
      status: doc.status 
    },
    false
  );
}

async function syncStatus(supabase: any): Promise<Record<string, any>> {
  const status: Record<string, any> = {};

  // Count articles by resource_type
  const resourceTypes = ['article', 'actualite', 'livre-blanc', 'atelier-webinaire', 'solution', 'cas-client'];
  
  for (const type of resourceTypes) {
    const { count: totalCount } = await supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("resource_type", type)
      .eq("published", true);

    const { data: uniqueResources } = await supabase
      .from("resource_embeddings")
      .select("resource_id")
      .eq("resource_type", type);
    
    const uniqueIndexed = new Set(uniqueResources?.map((r: any) => r.resource_id) || []).size;

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
        last_error: null, // Clear errors on sync
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
      last_error: null,
    }, { onConflict: 'resource_type' });

  status.service = {
    total: SERVICES_DATA.length,
    indexed: uniqueServiceCount,
    chunks: serviceChunkCount || 0,
  };

  // Cockpit module status
  const cockpitTables: Record<string, { table: string; filter?: Record<string, any> }> = {
    lead: { table: "leads" },
    project: { table: "projects" },
    partner: { table: "partners" },
    uploaded_file: { table: "uploaded_files" },
    specification: { table: "specifications" },
    voice_transcription: { table: "voice_transcriptions", filter: { status: "completed" } },
    generated_document: { table: "generated_documents" },
  };

  for (const [type, config] of Object.entries(cockpitTables)) {
    let query = supabase.from(config.table).select("id", { count: "exact", head: true });
    if (config.filter) {
      for (const [key, value] of Object.entries(config.filter)) {
        query = query.eq(key, value);
      }
    }
    const { count: totalCount } = await query;

    const { data: uniqueResources } = await supabase
      .from("resource_embeddings")
      .select("resource_id")
      .eq("resource_type", type);
    
    const uniqueIndexed = new Set(uniqueResources?.map((r: any) => r.resource_id) || []).size;

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
        last_indexed_at: uniqueIndexed > 0 ? new Date().toISOString() : null,
        last_error: null,
      }, { onConflict: 'resource_type' });

    status[type] = {
      total: totalCount || 0,
      indexed: uniqueIndexed,
      chunks: chunkCount || 0,
    };
  }

  return status;
}

// Helper to update last_indexed_at for a specific type
async function updateLastIndexedAt(supabase: any, resourceType: string): Promise<void> {
  await supabase
    .from("vectorization_status")
    .update({ 
      last_indexed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("resource_type", resourceType);
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
  await updateLastIndexedAt(supabase, 'service');

  // Index articles by type
  const resourceTypes = ['article', 'actualite', 'livre-blanc', 'atelier-webinaire', 'solution', 'cas-client'];
  
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
    
    // Update last_indexed_at for this type
    await updateLastIndexedAt(supabase, type);
  }

  // ===== Index Cockpit modules =====

  // Index Leads
  console.log("Indexing leads...");
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .limit(500);
  
  let leadIndexed = 0, leadErrors = 0, leadChunks = 0;
  for (const lead of leads || []) {
    const result = await indexLead(supabase, lead);
    if (result.success) { 
      indexed++; 
      leadIndexed++; 
      leadChunks += result.chunks; 
    } else { 
      errors++; 
      leadErrors++; 
    }
  }
  totalChunks += leadChunks;
  details.lead = { indexed: leadIndexed, errors: leadErrors, total: leads?.length || 0, chunks: leadChunks };
  await updateLastIndexedAt(supabase, 'lead');

  // Index Projects
  console.log("Indexing projects...");
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .limit(200);
  
  let projectIndexed = 0, projectErrors = 0, projectChunks = 0;
  for (const project of projects || []) {
    const result = await indexProject(supabase, project);
    if (result.success) { 
      indexed++; 
      projectIndexed++; 
      projectChunks += result.chunks; 
    } else { 
      errors++; 
      projectErrors++; 
    }
  }
  totalChunks += projectChunks;
  details.project = { indexed: projectIndexed, errors: projectErrors, total: projects?.length || 0, chunks: projectChunks };
  await updateLastIndexedAt(supabase, 'project');

  // Index Partners
  console.log("Indexing partners...");
  const { data: partners } = await supabase
    .from("partners")
    .select("*")
    .limit(200);
  
  let partnerIndexed = 0, partnerErrors = 0, partnerChunks = 0;
  for (const partner of partners || []) {
    const result = await indexPartner(supabase, partner);
    if (result.success) { 
      indexed++; 
      partnerIndexed++; 
      partnerChunks += result.chunks; 
    } else { 
      errors++; 
      partnerErrors++; 
    }
  }
  totalChunks += partnerChunks;
  details.partner = { indexed: partnerIndexed, errors: partnerErrors, total: partners?.length || 0, chunks: partnerChunks };
  await updateLastIndexedAt(supabase, 'partner');

  // Index Uploaded Files (with extracted text)
  console.log("Indexing uploaded files...");
  const { data: files } = await supabase
    .from("uploaded_files")
    .select("*")
    .not("extracted_text", "is", null)
    .limit(500);
  
  let fileIndexed = 0, fileErrors = 0, fileChunks = 0;
  for (const file of files || []) {
    const result = await indexUploadedFile(supabase, file);
    if (result.success) { 
      indexed++; 
      fileIndexed++; 
      fileChunks += result.chunks; 
    } else { 
      errors++; 
      fileErrors++; 
    }
  }
  totalChunks += fileChunks;
  details.uploaded_file = { indexed: fileIndexed, errors: fileErrors, total: files?.length || 0, chunks: fileChunks };
  await updateLastIndexedAt(supabase, 'uploaded_file');

  // Index Specifications
  console.log("Indexing specifications...");
  const { data: specs } = await supabase
    .from("specifications")
    .select("*")
    .limit(200);
  
  let specIndexed = 0, specErrors = 0, specChunks = 0;
  for (const spec of specs || []) {
    const result = await indexSpecification(supabase, spec);
    if (result.success) { 
      indexed++; 
      specIndexed++; 
      specChunks += result.chunks; 
    } else { 
      errors++; 
      specErrors++; 
    }
  }
  totalChunks += specChunks;
  details.specification = { indexed: specIndexed, errors: specErrors, total: specs?.length || 0, chunks: specChunks };
  await updateLastIndexedAt(supabase, 'specification');

  // Index Voice Transcriptions (completed only)
  console.log("Indexing voice transcriptions...");
  const { data: transcriptions } = await supabase
    .from("voice_transcriptions")
    .select("*")
    .eq("status", "completed")
    .limit(500);
  
  let transIndexed = 0, transErrors = 0, transChunks = 0;
  for (const trans of transcriptions || []) {
    const result = await indexVoiceTranscription(supabase, trans);
    if (result.success) { 
      indexed++; 
      transIndexed++; 
      transChunks += result.chunks; 
    } else { 
      errors++; 
      transErrors++; 
    }
  }
  totalChunks += transChunks;
  details.voice_transcription = { indexed: transIndexed, errors: transErrors, total: transcriptions?.length || 0, chunks: transChunks };
  await updateLastIndexedAt(supabase, 'voice_transcription');

  // Index Generated Documents
  console.log("Indexing generated documents...");
  const { data: docs } = await supabase
    .from("generated_documents")
    .select("*")
    .limit(500);
  
  let docIndexed = 0, docErrors = 0, docChunks = 0;
  for (const doc of docs || []) {
    const result = await indexGeneratedDocument(supabase, doc);
    if (result.success) { 
      indexed++; 
      docIndexed++; 
      docChunks += result.chunks; 
    } else { 
      errors++; 
      docErrors++; 
    }
  }
  totalChunks += docChunks;
  details.generated_document = { indexed: docIndexed, errors: docErrors, total: docs?.length || 0, chunks: docChunks };
  await updateLastIndexedAt(supabase, 'generated_document');

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
        } else if (COCKPIT_RESOURCE_TYPES.includes(body.resource_type)) {
          // Handle Cockpit resource types
          const tableMap: Record<string, string> = {
            lead: "leads",
            project: "projects",
            partner: "partners",
            uploaded_file: "uploaded_files",
            specification: "specifications",
            voice_transcription: "voice_transcriptions",
            generated_document: "generated_documents",
          };
          const table = tableMap[body.resource_type];
          if (!table) throw new Error("Unknown resource type");
          
          const { data: resource } = await supabase
            .from(table)
            .select("*")
            .eq("id", body.resource_id)
            .single();
          
          if (!resource) throw new Error("Resource not found");
          
          const indexFnMap: Record<string, Function> = {
            lead: indexLead,
            project: indexProject,
            partner: indexPartner,
            uploaded_file: indexUploadedFile,
            specification: indexSpecification,
            voice_transcription: indexVoiceTranscription,
            generated_document: indexGeneratedDocument,
          };
          result = await indexFnMap[body.resource_type](supabase, resource);
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
