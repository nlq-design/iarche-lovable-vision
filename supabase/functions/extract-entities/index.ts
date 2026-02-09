import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callLLM } from "../_shared/ai-client.ts";
import { loadPrompt } from "../_shared/prompt-loader.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ExtractRequest {
  mode: "scan_all" | "scan_recent" | "scan_entity";
  entity_type?: string;
  entity_id?: string;
  days_back?: number;
}

interface ExtractedEntity {
  name: string;
  type: "client" | "solution" | "outil" | "concurrent" | "service" | "autre";
  aliases: string[];
  confidence: number;
  source_count: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ExtractRequest = await req.json();
    const { mode = "scan_recent", entity_type, entity_id, days_back = 30 } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log(`[ExtractEntities] mode=${mode}, days_back=${days_back}`);

    // Collect text sources for entity extraction
    const textSources: Array<{ source: string; content: string; entity_type: string; entity_id: string }> = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days_back);
    const cutoffISO = cutoffDate.toISOString();

    // 1. Voice transcriptions
    let transcriptQuery = supabase
      .from("voice_transcriptions")
      .select("id, raw_transcript, summary, created_at")
      .not("raw_transcript", "is", null)
      .order("created_at", { ascending: false });
    
    if (mode === "scan_recent") {
      transcriptQuery = transcriptQuery.gte("created_at", cutoffISO);
    } else if (mode === "scan_entity" && entity_type === "voice_transcription" && entity_id) {
      transcriptQuery = transcriptQuery.eq("id", entity_id);
    }

    const { data: transcripts } = await transcriptQuery.limit(100);
    
    for (const t of transcripts || []) {
      const content = [t.raw_transcript, typeof t.summary === "string" ? t.summary : ""].filter(Boolean).join("\n");
      if (content.length > 50) {
        textSources.push({ 
          source: "voice_transcription", 
          content: content.slice(0, 10000), 
          entity_type: "voice_transcription",
          entity_id: t.id 
        });
      }
    }

    // 2. Leads - company names, messages
    let leadsQuery = supabase
      .from("leads")
      .select("id, name, company, message, industry, source_context, created_at")
      .order("created_at", { ascending: false });
    
    if (mode === "scan_recent") {
      leadsQuery = leadsQuery.gte("created_at", cutoffISO);
    } else if (mode === "scan_entity" && entity_type === "lead" && entity_id) {
      leadsQuery = leadsQuery.eq("id", entity_id);
    }

    const { data: leads } = await leadsQuery.limit(200);
    
    for (const l of leads || []) {
      const content = [l.company, l.message, l.industry, l.source_context].filter(Boolean).join("\n");
      if (content.length > 20) {
        textSources.push({ 
          source: "lead", 
          content, 
          entity_type: "lead",
          entity_id: l.id 
        });
      }
    }

    // 3. Projects - descriptions, notes
    let projectsQuery = supabase
      .from("projects")
      .select("id, name, description, project_notes, created_at")
      .order("created_at", { ascending: false });
    
    if (mode === "scan_recent") {
      projectsQuery = projectsQuery.gte("created_at", cutoffISO);
    } else if (mode === "scan_entity" && entity_type === "project" && entity_id) {
      projectsQuery = projectsQuery.eq("id", entity_id);
    }

    const { data: projects } = await projectsQuery.limit(100);
    
    for (const p of projects || []) {
      const content = [p.name, p.description, p.project_notes].filter(Boolean).join("\n");
      if (content.length > 30) {
        textSources.push({ 
          source: "project", 
          content: content.slice(0, 5000), 
          entity_type: "project",
          entity_id: p.id 
        });
      }
    }

    // 4. Uploaded files - summaries
    let filesQuery = supabase
      .from("uploaded_files")
      .select("id, original_name, extracted_summary, created_at")
      .not("extracted_summary", "is", null)
      .order("created_at", { ascending: false });
    
    if (mode === "scan_recent") {
      filesQuery = filesQuery.gte("created_at", cutoffISO);
    }

    const { data: files } = await filesQuery.limit(100);
    
    for (const f of files || []) {
      if (f.extracted_summary && f.extracted_summary.length > 50) {
        textSources.push({ 
          source: "uploaded_file", 
          content: f.extracted_summary.slice(0, 5000), 
          entity_type: "uploaded_file",
          entity_id: f.id 
        });
      }
    }

    // 5. Generated documents
    let docsQuery = supabase
      .from("generated_documents")
      .select("id, title, content_json, created_at")
      .order("created_at", { ascending: false });
    
    if (mode === "scan_recent") {
      docsQuery = docsQuery.gte("created_at", cutoffISO);
    }

    const { data: docs } = await docsQuery.limit(50);
    
    for (const d of docs || []) {
      const contentStr = typeof d.content_json === "string" 
        ? d.content_json 
        : JSON.stringify(d.content_json || {});
      if (contentStr.length > 50) {
        textSources.push({ 
          source: "generated_document", 
          content: contentStr.slice(0, 5000), 
          entity_type: "generated_document",
          entity_id: d.id 
        });
      }
    }

    // 6. Meeting notes
    let meetingQuery = supabase
      .from("meeting_notes")
      .select("id, notes, ai_summary, objectives, next_steps, created_at")
      .order("created_at", { ascending: false });
    
    if (mode === "scan_recent") {
      meetingQuery = meetingQuery.gte("created_at", cutoffISO);
    }

    const { data: meetings } = await meetingQuery.limit(50);
    
    for (const m of meetings || []) {
      const content = [m.notes, m.ai_summary, m.objectives, m.next_steps].filter(Boolean).join("\n");
      if (content.length > 50) {
        textSources.push({ 
          source: "meeting_note", 
          content: content.slice(0, 5000), 
          entity_type: "meeting_note",
          entity_id: m.id 
        });
      }
    }

    console.log(`[ExtractEntities] Collected ${textSources.length} text sources`);

    if (textSources.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        extracted: 0, 
        message: "No text sources found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Fetch existing aliases to avoid duplicates
    const { data: existingAliases } = await supabase
      .from("keyword_aliases")
      .select("canonical_name, alias");
    
    const existingSet = new Set(
      (existingAliases || []).map(a => `${a.canonical_name.toLowerCase()}|${a.alias.toLowerCase()}`)
    );

    // Batch text for LLM (max ~50k chars)
    const batchedText = textSources
      .map(s => `[${s.source}] ${s.content}`)
      .join("\n---\n")
      .slice(0, 50000);

    const prompt = await loadPrompt(supabase, "entity-extraction", {
      system_prompt: `Tu es un expert en extraction d'entités nommées pour un CRM B2B.

TYPES : client, solution, outil, concurrent, service
RÈGLES :
1. Extraire UNIQUEMENT les noms propres qui apparaissent PLUSIEURS FOIS
2. Détecter les variations orthographiques (ex: "Datalia" vs "Data Lia")
3. Minimum 2 occurrences pour être extrait
4. Ignorer les noms génériques

FORMAT JSON : {"entities": [{"name": "...", "type": "...", "aliases": [...], "confidence": 0.85, "source_count": 3}]}`
    });

    const userPrompt = `Analyse ces textes extraits du CRM et identifie les entités nommées récurrentes avec leurs variantes:

${batchedText}

Retourne UNIQUEMENT le JSON des entités extraites.`;

    console.log(`[ExtractEntities] Calling LLM with ${batchedText.length} chars`);

    // Use centralized AI client with automatic DB config lookup
    const llmContent = await callLLM(
      [
        { role: "system", content: prompt.system_prompt },
        { role: "user", content: `Analyse ces textes du CRM et identifie les entités récurrentes :\n\n${batchedText}\n\nRetourne UNIQUEMENT le JSON.` }
      ],
      { functionName: 'extract-entities' }
    );
    
    let extracted: { entities: ExtractedEntity[] };
    try {
      extracted = JSON.parse(llmContent);
    } catch {
      console.error("[ExtractEntities] JSON parse failed:", llmContent.slice(0, 500));
      extracted = { entities: [] };
    }

    const entities = extracted.entities || [];
    console.log(`[ExtractEntities] LLM extracted ${entities.length} entities`);

    // Insert new aliases
    const inserts: Array<{
      canonical_name: string;
      alias: string;
      context_type: string;
      is_active: boolean;
    }> = [];

    for (const entity of entities) {
      if (!entity.name || entity.confidence < 0.5) continue;

      // Add self-reference if new
      const selfKey = `${entity.name.toLowerCase()}|${entity.name.toLowerCase()}`;
      if (!existingSet.has(selfKey)) {
        inserts.push({
          canonical_name: entity.name,
          alias: entity.name,
          context_type: entity.type || "autre",
          is_active: true,
        });
        existingSet.add(selfKey);
      }

      // Add aliases
      for (const alias of entity.aliases || []) {
        if (!alias || alias.toLowerCase() === entity.name.toLowerCase()) continue;
        const aliasKey = `${entity.name.toLowerCase()}|${alias.toLowerCase()}`;
        if (!existingSet.has(aliasKey)) {
          inserts.push({
            canonical_name: entity.name,
            alias: alias,
            context_type: entity.type || "autre",
            is_active: true,
          });
          existingSet.add(aliasKey);
        }
      }
    }

    console.log(`[ExtractEntities] Inserting ${inserts.length} new aliases`);

    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from("keyword_aliases")
        .upsert(inserts, { onConflict: "canonical_name,alias" });
      
      if (insertError) {
        console.error("[ExtractEntities] Insert error:", insertError);
      }
    }

    // Create entity references for cross-linking
    for (const entity of entities) {
      if (entity.source_count >= 2) {
        // Find entities in sources that reference this entity
        for (const source of textSources) {
          const contentLower = source.content.toLowerCase();
          const nameMatch = contentLower.includes(entity.name.toLowerCase());
          const aliasMatch = (entity.aliases || []).some(a => contentLower.includes(a.toLowerCase()));
          
          if (nameMatch || aliasMatch) {
            // Create reference (will be deduplicated by DB constraint)
            await supabase
              .from("entity_name_references")
              .upsert({
                source_entity_type: source.entity_type,
                source_entity_id: source.entity_id,
                target_entity_type: "keyword_alias",
                target_entity_id: entity.name, // Using name as reference
                reference_type: "auto_detected",
                detected_by: "extract-entities",
                confidence_score: entity.confidence,
                context: entity.name,
              }, { onConflict: "source_entity_type,source_entity_id,target_entity_type,target_entity_id" })
              .select()
              .maybeSingle();
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sources_scanned: textSources.length,
      entities_found: entities.length,
      aliases_inserted: inserts.length,
      entities: entities.map(e => ({ name: e.name, type: e.type, aliases_count: e.aliases?.length || 0 })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[ExtractEntities] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
