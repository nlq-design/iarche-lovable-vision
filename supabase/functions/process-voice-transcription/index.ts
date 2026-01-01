import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Whisper file size limit
const WHISPER_MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const TARGET_CHUNK_SIZE_BYTES = 20 * 1024 * 1024; // 20MB for safety margin

type LLMProvider = "lovable" | "openai" | "anthropic" | "openrouter";

interface LLMModel {
  id: string;
  provider: LLMProvider;
  model_id: string;
  display_name: string;
  supports_tools: boolean;
}

type VoiceJob = {
  id: string;
  workspace_id: string;
  storage_path: string;
  source: "upload" | "recording";
  lead_id: string | null;
  project_id: string | null;
  solution_id: string | null;
  status: string;
  auto_create_tasks: boolean;
  prompt_profile_id: string | null;
  created_by: string;
  ai_metadata: Record<string, unknown>;
};

/**
 * Compress audio using FFmpeg (available in Deno Deploy)
 * Converts to mono 16kHz MP3 for optimal Whisper performance
 */
async function compressAudio(audioBlob: Blob): Promise<Blob> {
  const originalSize = audioBlob.size;
  console.log(`[Compression] Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  
  // If already small enough, skip compression
  if (originalSize <= WHISPER_MAX_SIZE_BYTES) {
    console.log("[Compression] File already within limits, skipping compression");
    return audioBlob;
  }
  
  // Convert to ArrayBuffer
  const arrayBuffer = await audioBlob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Create temp files
  const tempInputPath = `/tmp/input_${Date.now()}`;
  const tempOutputPath = `/tmp/output_${Date.now()}.mp3`;
  
  try {
    // Write input file
    await Deno.writeFile(tempInputPath, uint8Array);
    
    // FFmpeg command: convert to mono 16kHz 64kbps MP3
    const ffmpegProcess = new Deno.Command("ffmpeg", {
      args: [
        "-i", tempInputPath,
        "-vn",              // No video
        "-ac", "1",         // Mono
        "-ar", "16000",     // 16kHz sample rate
        "-ab", "64k",       // 64kbps bitrate
        "-f", "mp3",        // MP3 format
        "-y",               // Overwrite
        tempOutputPath
      ],
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code, stderr } = await ffmpegProcess.output();
    
    if (code !== 0) {
      const errorOutput = new TextDecoder().decode(stderr);
      console.error("[Compression] FFmpeg error:", errorOutput);
      // Fallback: return original if compression fails
      console.log("[Compression] Falling back to original audio");
      return audioBlob;
    }
    
    // Read compressed file
    const compressedData = await Deno.readFile(tempOutputPath);
    const compressedBlob = new Blob([compressedData], { type: "audio/mpeg" });
    
    console.log(`[Compression] Compressed size: ${(compressedBlob.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[Compression] Compression ratio: ${((1 - compressedBlob.size / originalSize) * 100).toFixed(1)}%`);
    
    return compressedBlob;
    
  } catch (err) {
    console.warn("[Compression] FFmpeg not available or failed:", err);
    // Fallback to original
    return audioBlob;
  } finally {
    // Cleanup temp files
    try { await Deno.remove(tempInputPath); } catch {}
    try { await Deno.remove(tempOutputPath); } catch {}
  }
}

/**
 * Split audio into chunks of approximately targetSize bytes
 * Uses FFmpeg to split at specific durations
 */
async function splitAudioIntoChunks(audioBlob: Blob, targetSizeBytes: number): Promise<Blob[]> {
  const totalSize = audioBlob.size;
  
  // If already small enough, return single chunk
  if (totalSize <= targetSizeBytes) {
    return [audioBlob];
  }
  
  const arrayBuffer = await audioBlob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  const tempInputPath = `/tmp/chunk_input_${Date.now()}`;
  const tempOutputPattern = `/tmp/chunk_output_${Date.now}_%03d.mp3`;
  
  try {
    await Deno.writeFile(tempInputPath, uint8Array);
    
    // Estimate audio duration based on file size and typical bitrate
    // For 64kbps audio: 1 minute ≈ 480KB
    const estimatedDurationSeconds = (totalSize / (64 * 1024 / 8)); // 64kbps = 8KB/s
    const numChunks = Math.ceil(totalSize / targetSizeBytes);
    const chunkDurationSeconds = Math.ceil(estimatedDurationSeconds / numChunks);
    
    console.log(`[Chunking] Splitting ${(totalSize / 1024 / 1024).toFixed(2)} MB into ~${numChunks} chunks of ${chunkDurationSeconds}s each`);
    
    // Use FFmpeg segment muxer
    const ffmpegProcess = new Deno.Command("ffmpeg", {
      args: [
        "-i", tempInputPath,
        "-f", "segment",
        "-segment_time", String(chunkDurationSeconds),
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-ab", "64k",
        "-reset_timestamps", "1",
        tempOutputPattern
      ],
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code, stderr } = await ffmpegProcess.output();
    
    if (code !== 0) {
      const errorOutput = new TextDecoder().decode(stderr);
      console.error("[Chunking] FFmpeg segmentation error:", errorOutput);
      // Fallback: return original as single chunk
      return [audioBlob];
    }
    
    // Read all chunk files
    const chunks: Blob[] = [];
    for (let i = 0; i < 100; i++) { // Max 100 chunks
      const chunkPath = tempOutputPattern.replace("%03d", String(i).padStart(3, "0"));
      try {
        const chunkData = await Deno.readFile(chunkPath);
        chunks.push(new Blob([chunkData], { type: "audio/mpeg" }));
        await Deno.remove(chunkPath);
      } catch {
        break; // No more chunks
      }
    }
    
    console.log(`[Chunking] Created ${chunks.length} chunks`);
    return chunks.length > 0 ? chunks : [audioBlob];
    
  } catch (err) {
    console.warn("[Chunking] FFmpeg chunking failed:", err);
    return [audioBlob];
  } finally {
    try { await Deno.remove(tempInputPath); } catch {}
  }
}

/**
 * Transcribe a single audio chunk using OpenAI Whisper API
 */
async function transcribeChunkWithWhisper(audioBlob: Blob, language = "fr"): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("openai_api_key_not_configured: OPENAI_API_KEY is required for Whisper transcription");
  }
  
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.mp3");
  formData.append("model", "whisper-1");
  formData.append("language", language);
  formData.append("response_format", "text");
  
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Whisper] API error:", response.status, errorText);
    throw new Error(`whisper_api_error: ${response.status} - ${errorText}`);
  }
  
  return await response.text();
}

/**
 * Main transcription function using Whisper with compression + chunking
 */
async function transcribeAudio(
  audioBlob: Blob,
  language = "fr"
): Promise<{ text: string; processingInfo: { originalSizeMB: number; compressedSizeMB: number; chunksCount: number } }> {
  const originalSizeMB = audioBlob.size / 1024 / 1024;
  console.log(`[Transcription] Starting Whisper transcription, original size: ${originalSizeMB.toFixed(2)} MB`);
  
  // Step 1: Compress audio
  let processedBlob = await compressAudio(audioBlob);
  const compressedSizeMB = processedBlob.size / 1024 / 1024;
  
  // Step 2: Chunk if still too large
  let chunks: Blob[];
  if (processedBlob.size > WHISPER_MAX_SIZE_BYTES) {
    console.log(`[Transcription] Still > 25MB after compression, chunking...`);
    chunks = await splitAudioIntoChunks(processedBlob, TARGET_CHUNK_SIZE_BYTES);
  } else {
    chunks = [processedBlob];
  }
  
  console.log(`[Transcription] Processing ${chunks.length} chunk(s)`);
  
  // Step 3: Transcribe each chunk
  const transcripts: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`[Transcription] Processing chunk ${i + 1}/${chunks.length} (${(chunks[i].size / 1024 / 1024).toFixed(2)} MB)`);
    const chunkText = await transcribeChunkWithWhisper(chunks[i], language);
    transcripts.push(chunkText.trim());
  }
  
  // Step 4: Combine transcripts
  const fullText = transcripts.join(" ");
  console.log(`[Transcription] Completed: ${fullText.length} characters from ${chunks.length} chunk(s)`);
  
  return {
    text: fullText,
    processingInfo: {
      originalSizeMB,
      compressedSizeMB,
      chunksCount: chunks.length,
    }
  };
}


async function loadPromptProfile(supabase: any, prompt_profile_id: string | null) {
  // If specific profile requested, use it
  if (prompt_profile_id) {
    const { data, error } = await supabase
      .from("ai_prompts")
      .select("id, system_prompt, user_prompt, output_schema, model_config")
      .eq("id", prompt_profile_id)
      .single();

    if (error) throw new Error(`prompt_profile_not_found: ${error.message}`);
    return data;
  }

  // Otherwise, try to load the master cockpit assistant prompt
  const { data: masterPrompt } = await supabase
    .from("ai_prompts")
    .select("id, system_prompt, user_prompt, output_schema, model_config")
    .eq("slug", "cockpit-master-assistant")
    .maybeSingle();

  if (masterPrompt) {
    console.log("Using master cockpit assistant prompt");
    return masterPrompt;
  }

  // Fallback to legacy transcription prompt if exists
  const { data: legacyPrompt } = await supabase
    .from("ai_prompts")
    .select("id, system_prompt, user_prompt, output_schema, model_config")
    .eq("slug", "transcription_rdv_commercial")
    .maybeSingle();

  return legacyPrompt ?? null;
}

// Semantic search for auto-detecting solutions from transcript
interface SemanticSearchResult {
  resource_id: string;
  resource_type: string;
  resource_title: string;
  resource_slug: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

/**
 * Fetch keyword aliases for text normalization and improved matching.
 * Uses phonetic matching for better detection of spoken variations.
 */
async function fetchKeywordAliases(supabase: any): Promise<Map<string, string>> {
  const aliasMap = new Map<string, string>();
  
  try {
    const { data, error } = await supabase
      .from("keyword_aliases")
      .select("canonical_name, alias, phonetic_key")
      .eq("is_active", true);
    
    if (error) {
      console.warn("Failed to fetch keyword aliases:", error);
      return aliasMap;
    }
    
    // Build lookup map: alias (lowercase) -> canonical_name
    for (const row of data || []) {
      aliasMap.set(row.alias.toLowerCase(), row.canonical_name);
      // Also add phonetic variations if available
      if (row.phonetic_key) {
        aliasMap.set(row.phonetic_key.toLowerCase(), row.canonical_name);
      }
    }
    
    console.log(`Loaded ${aliasMap.size} keyword aliases for normalization`);
    return aliasMap;
  } catch (err) {
    console.warn("Error fetching keyword aliases:", err);
    return aliasMap;
  }
}

/**
 * Normalize transcript text using keyword aliases.
 * Replaces known variations with canonical names for better matching.
 */
function normalizeTranscriptWithAliases(transcript: string, aliasMap: Map<string, string>): string {
  if (aliasMap.size === 0) return transcript;
  
  let normalized = transcript;
  
  // Sort aliases by length (longest first) to avoid partial replacements
  const sortedAliases = Array.from(aliasMap.entries())
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [alias, canonical] of sortedAliases) {
    // Case-insensitive replacement with word boundaries
    const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    normalized = normalized.replace(regex, canonical);
  }
  
  return normalized;
}

async function searchSimilarResources(
  transcript: string,
  filterTypes: string[] = ["solution", "service"],
  aliasMap?: Map<string, string>
): Promise<SemanticSearchResult[]> {
  try {
    console.log("Performing semantic search on transcript...");
    
    // Normalize transcript using aliases if available
    let searchText = transcript;
    if (aliasMap && aliasMap.size > 0) {
      searchText = normalizeTranscriptWithAliases(transcript, aliasMap);
      console.log("Transcript normalized with keyword aliases");
    }
    
    // Use first 2000 chars of transcript as search query (embeddings have limits)
    const searchQuery = searchText.slice(0, 2000);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/search-embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        filter_types: filterTypes,
        match_threshold: 0.65, // Lower threshold for broader matching
        match_count: 10,
      }),
    });

    if (!response.ok) {
      console.warn("Semantic search failed:", await response.text());
      return [];
    }

    const data = await response.json();
    console.log(`Semantic search found ${data.results?.length ?? 0} potential matches`);
    return data.results ?? [];
  } catch (error) {
    console.warn("Semantic search error:", error);
    return [];
  }
}

async function fetchEntityContext(supabase: any, job: VoiceJob, transcript?: string) {
  let lead: any = null;
  let project: any = null;
  let solution: any = null;
  let detectedSolutions: SemanticSearchResult[] = [];

  if (job.project_id) {
    const { data } = await supabase.from("projects").select("*").eq("id", job.project_id).single();
    project = data ?? null;
  }

  if (job.solution_id) {
    const { data } = await supabase
      .from("articles")
      .select("*")
      .eq("id", job.solution_id)
      .eq("resource_type", "solution")
      .single();
    solution = data ?? null;
  }

  // If no project/solution linked and transcript provided, do semantic search
  const shouldAutoDetect = !job.project_id && !job.solution_id && transcript;
  if (shouldAutoDetect) {
    console.log("No project/solution linked, performing RAG detection with keyword aliases...");
    // Load keyword aliases for better matching
    const aliasMap = await fetchKeywordAliases(supabase);
    detectedSolutions = await searchSimilarResources(transcript, ["solution", "service"], aliasMap);
    
    // Log detected solutions for debugging
    if (detectedSolutions.length > 0) {
      console.log("Auto-detected solutions:", detectedSolutions.map(s => ({
        title: s.resource_title,
        type: s.resource_type,
        similarity: s.similarity.toFixed(3)
      })));
    }
  }

  // Cascade lead
  let leadId = job.lead_id;
  if (!leadId && project?.lead_id) leadId = project.lead_id;

  if (!leadId && job.solution_id) {
    const { data } = await supabase
      .from("solution_leads")
      .select("lead_id")
      .eq("solution_id", job.solution_id)
      .order("created_at", { ascending: false })
      .limit(1);
    leadId = data?.[0]?.lead_id ?? null;
  }

  // Fetch lead contacts if lead exists
  let leadContacts: any[] = [];
  if (leadId) {
    const { data } = await supabase.from("leads").select("*").eq("id", leadId).single();
    lead = data ?? null;
    
    // Fetch associated contacts
    const { data: contacts } = await supabase
      .from("lead_contacts")
      .select("*")
      .eq("lead_id", leadId)
      .order("is_primary", { ascending: false });
    leadContacts = contacts ?? [];
    console.log(`Found ${leadContacts.length} contacts for lead ${leadId}`);
  }

  const activity = leadId
    ? (await supabase
        .from("activity_log")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(20)).data
    : [];

  const tasks = leadId
    ? (await supabase
        .from("tasks")
        .select("*")
        .eq("lead_id", leadId)
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(50)).data
    : [];

  return { 
    lead, 
    leadContacts,
    project, 
    solution, 
    leadId, 
    activity: activity ?? [], 
    tasks: tasks ?? [],
    detectedSolutions,
    autoDetectionUsed: shouldAutoDetect,
  };
}

function buildLLM(
  systemPrompt: string, 
  userPrompt: string | null, 
  transcriptText: string, 
  ctx: ReturnType<typeof fetchEntityContext> extends Promise<infer T> ? T : never, 
  schema: Record<string, unknown> | null
) {
  // Build detected solutions context for RAG
  const detectedSolutionsContext = ctx.detectedSolutions?.length 
    ? ctx.detectedSolutions.map(s => ({
        title: s.resource_title,
        type: s.resource_type,
        slug: s.resource_slug,
        similarity_score: s.similarity,
        metadata: s.metadata,
      }))
    : [];

  // Build lead contacts context
  const leadContactsContext = ctx.leadContacts?.length
    ? ctx.leadContacts.map(c => ({
        name: c.name,
        position: c.position,
        email: c.email,
        phone: c.phone,
        is_primary: c.is_primary,
      }))
    : [];

  const payload = {
    transcript: transcriptText,
    crm_context: {
      lead: ctx.lead,
      lead_contacts: leadContactsContext,
      project: ctx.project,
      solution: ctx.solution,
      recent_activity: ctx.activity,
      open_tasks: ctx.tasks,
    },
    // Add RAG context
    rag_context: {
      auto_detection_used: ctx.autoDetectionUsed ?? false,
      detected_solutions: detectedSolutionsContext,
      detection_note: ctx.autoDetectionUsed
        ? "Les solutions suivantes ont été détectées automatiquement par recherche sémantique. Confirme ou affine dans ta synthèse."
        : null,
    },
    output_schema: schema ?? null,
    rules: {
      json_only: true,
      no_hallucination: true,
      actions_only_if_explicit: true,
      unknown_to_null: true,
      max_executive_summary_words: 200,
      include_detected_solutions: ctx.autoDetectionUsed,
    },
  };

  const sys = systemPrompt;
  const usr = userPrompt
    ? `${userPrompt}\n\nINPUT:\n${JSON.stringify(payload)}`
    : JSON.stringify(payload);

  return { sys, usr };
}

async function fetchLLMModel(supabase: any, modelId: string | null): Promise<LLMModel | null> {
  if (!modelId) return null;
  
  const { data } = await supabase
    .from("llm_models")
    .select("id, provider, model_id, display_name, supports_tools")
    .eq("id", modelId)
    .eq("is_active", true)
    .single();
  
  return data as LLMModel | null;
}

async function callLLM(
  provider: LLMProvider,
  modelId: string,
  sys: string,
  usr: string,
  outputSchema: Record<string, unknown> | null,
  supportsTools: boolean
): Promise<Record<string, unknown>> {
  console.log(`Calling ${provider} with model: ${modelId}`);
  
  const systemContent = sys + "\n\nRéponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans ```json, sans texte avant ou après.";
  
  let response: Response;
  
  switch (provider) {
    case "lovable": {
      const requestBody: Record<string, unknown> = {
        model: modelId,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: usr },
        ],
      };
      
      if (outputSchema && supportsTools) {
        requestBody.tools = [{
          type: "function",
          function: {
            name: "submit_transcription_summary",
            description: "Submit the structured summary of the transcription",
            parameters: outputSchema
          }
        }];
        requestBody.tool_choice = { type: "function", function: { name: "submit_transcription_summary" } };
      }
      
      response = await fetch(LOVABLE_AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      break;
    }
    
    case "openai": {
      if (!OPENAI_API_KEY) throw new Error("openai_api_key_not_configured");
      
      const requestBody: Record<string, unknown> = {
        model: modelId,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: usr },
        ],
        max_tokens: 4096,
      };
      
      if (outputSchema && supportsTools) {
        requestBody.tools = [{
          type: "function",
          function: {
            name: "submit_transcription_summary",
            description: "Submit the structured summary of the transcription",
            parameters: outputSchema
          }
        }];
        requestBody.tool_choice = { type: "function", function: { name: "submit_transcription_summary" } };
      }
      
      response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      break;
    }
    
    case "anthropic": {
      if (!ANTHROPIC_API_KEY) throw new Error("anthropic_api_key_not_configured");
      
      const requestBody: Record<string, unknown> = {
        model: modelId,
        max_tokens: 4096,
        system: systemContent,
        messages: [{ role: "user", content: usr }],
      };
      
      if (outputSchema && supportsTools) {
        requestBody.tools = [{
          name: "submit_transcription_summary",
          description: "Submit the structured summary of the transcription",
          input_schema: outputSchema
        }];
        requestBody.tool_choice = { type: "tool", name: "submit_transcription_summary" };
      }
      
      response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      break;
    }
    
    case "openrouter": {
      if (!OPENROUTER_API_KEY) throw new Error("openrouter_api_key_not_configured");
      
      const requestBody: Record<string, unknown> = {
        model: modelId,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: usr },
        ],
      };
      
      if (outputSchema && supportsTools) {
        requestBody.tools = [{
          type: "function",
          function: {
            name: "submit_transcription_summary",
            description: "Submit the structured summary of the transcription",
            parameters: outputSchema
          }
        }];
        requestBody.tool_choice = { type: "function", function: { name: "submit_transcription_summary" } };
      }
      
      response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://iarche.fr",
          "X-Title": "IArche Cockpit",
        },
        body: JSON.stringify(requestBody),
      });
      break;
    }
    
    default:
      throw new Error(`unknown_provider: ${provider}`);
  }
  
  const txt = await response.text();
  console.log("LLM response length:", txt.length);
  
  // Handle rate limiting
  if (response.status === 429) {
    throw new Error("rate_limited: Too many requests, please try again later");
  }
  
  // Handle payment required
  if (response.status === 402) {
    throw new Error("credits_exhausted: Please add funds to your Lovable AI workspace");
  }
  
  if (!response.ok) throw new Error(`llm_failed: ${txt}`);
  
  return parseProviderResponse(provider, txt, outputSchema);
}

function parseProviderResponse(
  provider: LLMProvider,
  responseText: string,
  outputSchema: Record<string, unknown> | null
): Record<string, unknown> {
  const json = JSON.parse(responseText);
  
  // Anthropic has different response format
  if (provider === "anthropic") {
    // Check for tool use first
    const toolUse = json?.content?.find((c: any) => c.type === "tool_use");
    if (toolUse?.input) {
      console.log("Using Anthropic tool call response");
      return toolUse.input;
    }
    
    // Otherwise, get text content
    const textContent = json?.content?.find((c: any) => c.type === "text");
    if (textContent?.text) {
      return extractJsonFromText(textContent.text);
    }
    throw new Error("anthropic_empty_content");
  }
  
  // OpenAI-compatible format (Lovable, OpenAI, OpenRouter)
  const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    console.log("Using tool call response");
    try {
      return JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Tool call JSON parse error:", e);
    }
  }
  
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("llm_empty_content");
  
  return extractJsonFromText(content);
}

function extractJsonFromText(content: string): Record<string, unknown> {
  console.log("Parsing content response, first 500 chars:", content.substring(0, 500));
  
  // Try direct parse first
  try {
    return JSON.parse(content);
  } catch (e1) {
    console.log("Direct parse failed, trying regex extraction");
    
    // Try to extract JSON from markdown code blocks
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch (e2) {
        console.log("Code block parse failed");
      }
    }
    
    // Try to find JSON object
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e3) {
        console.error("JSON regex parse failed:", e3);
        // Try to fix common issues
        let fixed = jsonMatch[0]
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/\n/g, ' ')
          .replace(/\t/g, ' ');
        
        try {
          return JSON.parse(fixed);
        } catch (e4) {
          console.error("Fixed JSON parse failed:", e4);
        }
      }
    }
    
    throw new Error(`llm_invalid_json: Could not parse LLM response`);
  }
}

/**
 * Parse date from action item
 * Supports formats: "2024-01-15", "15/01/2024", "15 janvier", "demain", "lundi prochain", etc.
 */
function parseDueDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const normalized = dateStr.toLowerCase().trim();
  
  // ISO format: 2024-01-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // French format: 15/01/2024 or 15-01-2024
  const frMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (frMatch) {
    const [, day, month, year] = frMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Relative dates
  if (normalized === "aujourd'hui" || normalized === "today") {
    return today.toISOString().split('T')[0];
  }
  if (normalized === "demain" || normalized === "tomorrow") {
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  }
  if (normalized === "après-demain" || normalized === "après demain") {
    today.setDate(today.getDate() + 2);
    return today.toISOString().split('T')[0];
  }
  
  // "dans X jours" or "in X days"
  const daysMatch = normalized.match(/dans\s+(\d+)\s+jours?/);
  if (daysMatch) {
    today.setDate(today.getDate() + parseInt(daysMatch[1]));
    return today.toISOString().split('T')[0];
  }
  
  // "semaine prochaine" / "la semaine prochaine"
  if (normalized.includes("semaine prochaine")) {
    today.setDate(today.getDate() + 7);
    return today.toISOString().split('T')[0];
  }
  
  // Day names: "lundi", "mardi", "lundi prochain", etc.
  const dayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  for (let i = 0; i < dayNames.length; i++) {
    if (normalized.includes(dayNames[i])) {
      const currentDay = today.getDay();
      let daysToAdd = (i - currentDay + 7) % 7;
      if (daysToAdd === 0 && normalized.includes("prochain")) daysToAdd = 7;
      if (daysToAdd === 0) daysToAdd = 7; // Default to next occurrence
      today.setDate(today.getDate() + daysToAdd);
      return today.toISOString().split('T')[0];
    }
  }
  
  // French month names: "15 janvier", "3 mars 2024"
  const monthNames: Record<string, number> = {
    "janvier": 0, "février": 1, "mars": 2, "avril": 3, "mai": 4, "juin": 5,
    "juillet": 6, "août": 7, "septembre": 8, "octobre": 9, "novembre": 10, "décembre": 11
  };
  const monthMatch = normalized.match(/(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)(?:\s+(\d{4}))?/);
  if (monthMatch) {
    const day = parseInt(monthMatch[1]);
    const month = monthNames[monthMatch[2]];
    const year = monthMatch[3] ? parseInt(monthMatch[3]) : now.getFullYear();
    const date = new Date(year, month, day);
    // If date is in the past without year specified, assume next year
    if (!monthMatch[3] && date < now) {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

/**
 * Parse time from action item
 * Supports: "14h", "14h30", "14:30", "9h", "à 15h", etc.
 */
function parseDueTime(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null;
  
  const normalized = timeStr.toLowerCase().trim();
  
  // Format: "14h30", "14h", "9h30"
  const hMatch = normalized.match(/(\d{1,2})h(\d{2})?/);
  if (hMatch) {
    const hours = hMatch[1].padStart(2, '0');
    const mins = hMatch[2] ?? '00';
    return `${hours}:${mins}:00`;
  }
  
  // Format: "14:30", "09:00"
  const colonMatch = normalized.match(/(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    const hours = colonMatch[1].padStart(2, '0');
    const mins = colonMatch[2];
    return `${hours}:${mins}:00`;
  }
  
  return null;
}

async function createTasksFromActions(
  supabase: any, 
  job: VoiceJob, 
  summary: Record<string, unknown>, 
  leadId: string | null
): Promise<Array<{ id: string; title: string }>> {
  // FORCE auto-création des tâches pour toutes les transcriptions avec des actions
  console.log(`[createTasksFromActions] auto_create_tasks=${job.auto_create_tasks}, forcing task creation for all transcriptions`);

  const items = Array.isArray(summary?.action_items) ? summary.action_items : [];
  if (!items.length) return [];

  const inserts: Array<{
    workspace_id: string;
    title: string;
    task_type: string;
    priority: string;
    status: string;
    lead_id: string | null;
    project_id: string | null;
    entity_type: string;
    entity_id: string;
    created_by: string;
    due_date: string | null;
    due_time: string | null;
    ai_generated: boolean;
    ai_metadata: Record<string, unknown>;
  }> = [];

  for (const it of items) {
    const title = (it?.task as string ?? "").trim();
    if (!title) continue;
    
    // Parse date and time from the action item
    const dueDate = parseDueDate(it?.due_date as string) || parseDueDate(it?.deadline as string) || parseDueDate(it?.date as string);
    const dueTime = parseDueTime(it?.due_time as string) || parseDueTime(it?.time as string) || parseDueTime(it?.heure as string);
    
    console.log(`[Task] "${title}" -> due_date: ${dueDate}, due_time: ${dueTime}`);
    
    inserts.push({
      workspace_id: job.workspace_id,
      title: title.slice(0, 200),
      task_type: "follow_up",
      priority: (it?.priority as string) ?? "medium",
      status: "pending",
      lead_id: leadId,
      project_id: job.project_id,
      entity_type: "voice_transcription",
      entity_id: job.id,
      created_by: job.created_by,
      due_date: dueDate,
      due_time: dueTime,
      ai_generated: true,
      ai_metadata: {
        source: "voice_transcription",
        source_transcription_id: job.id,
        raw_action: it,
        generated_at: new Date().toISOString(),
        autonomy_level: "N1",
        validation_required: true,
        validated_by_human: false,
      },
    });
  }

  if (!inserts.length) return [];

  const { data, error } = await supabase.from("tasks").insert(inserts).select("id,title,due_date,due_time");
  if (error) throw new Error(`tasks_insert_failed: ${error.message}`);
  
  console.log(`[createTasksFromActions] Created ${data?.length ?? 0} tasks:`, 
    data?.map((t: any) => ({ title: t.title, due_date: t.due_date, due_time: t.due_time }))
  );
  
  return data ?? [];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { job_id } = await req.json();
    if (!job_id) {
      return new Response(JSON.stringify({ error: "missing_job_id" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: job, error: jerr } = await supabase
      .from("voice_transcriptions")
      .select("*")
      .eq("id", job_id)
      .single();

    if (jerr || !job) {
      return new Response(JSON.stringify({ error: "job_not_found" }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const vjob = job as VoiceJob;
    if (vjob.status === "done") {
      return new Response(JSON.stringify({ ok: true, already_done: true }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log(`Processing voice transcription job: ${job_id}`);

    // Status -> transcribing
    await supabase.from("voice_transcriptions").update({ status: "transcribing" }).eq("id", job_id);

    // Signed URL + fetch audio
    const bucket = "voice-transcriptions";
    const { data: signed, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(vjob.storage_path, 600); // 10 minutes for large files
    
    if (signErr || !signed?.signedUrl) {
      throw new Error(`signed_url_failed: ${signErr?.message ?? "no_url"}`);
    }

    const audioRes = await fetch(signed.signedUrl);
    if (!audioRes.ok) throw new Error(`audio_fetch_failed: ${await audioRes.text()}`);

    const audioBlob = await audioRes.blob();
    console.log(`Audio fetched: ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB, type: ${audioBlob.type}`);

    // STT with Whisper (compression + chunking)
    const stt = await transcribeAudio(audioBlob, "fr");
    const rawText = stt.text ?? "";
    const processingInfo = stt.processingInfo;

    console.log(`Transcription completed: ${rawText.length} chars, processed in ${processingInfo.chunksCount} chunk(s)`);

    await supabase
      .from("voice_transcriptions")
      .update({
        raw_transcript: rawText,
        segments: null, // Whisper doesn't provide word-level segments in simple mode
        status: "analyzing",
        ai_metadata: {
          ...(vjob.ai_metadata ?? {}),
          source: "openai-whisper",
          stt_model: "whisper-1",
          file_size_mb: processingInfo.originalSizeMB.toFixed(2),
          compressed_size_mb: processingInfo.compressedSizeMB.toFixed(2),
          chunks_count: processingInfo.chunksCount,
          transcript_length: rawText.length,
          generated_at: new Date().toISOString(),
        },
      })
      .eq("id", job_id);

    // Context + cascade lead + RAG detection
    const ctx = await fetchEntityContext(supabase, vjob, rawText);
    console.log(`Context fetched: lead=${ctx.leadId}, project=${ctx.project?.id ?? null}, autoDetected=${ctx.autoDetectionUsed}, detectedSolutions=${ctx.detectedSolutions?.length ?? 0}`);

    // Prompt profile & LLM model selection
    const profile = await loadPromptProfile(supabase, vjob.prompt_profile_id);
    const systemPrompt = profile?.system_prompt ?? "Return JSON only.";
    const userPrompt = profile?.user_prompt ?? null;
    const outputSchema = profile?.output_schema ?? null;
    
    // Determine which LLM to use: from profile model_config.llm_model_id or default
    let provider: LLMProvider = "lovable";
    let modelId = "google/gemini-2.5-flash";
    let supportsTools = true;
    let resolvedLLMModelId: string | null = null;
    
    // Check if profile has configured LLM model ID
    const profileModelConfig = profile?.model_config as Record<string, unknown> | null;
    const configuredLLMModelId = profileModelConfig?.llm_model_id as string | undefined;
    
    if (configuredLLMModelId) {
      const llmModel = await fetchLLMModel(supabase, configuredLLMModelId);
      if (llmModel) {
        provider = llmModel.provider as LLMProvider;
        modelId = llmModel.model_id;
        supportsTools = llmModel.supports_tools;
        resolvedLLMModelId = llmModel.id;
        console.log(`Using admin-configured LLM: ${provider}/${modelId}`);
      }
    } else if (profileModelConfig?.model) {
      // Fallback to legacy model string format
      const profileModel = profileModelConfig.model as string;
      modelId = profileModel;
      // Infer provider from model format
      if (profileModel.startsWith("gpt-")) {
        provider = "openai";
      } else if (profileModel.startsWith("claude-")) {
        provider = "anthropic";
      }
      console.log(`Using legacy profile model: ${provider}/${modelId}`);
    }

    const { sys, usr } = buildLLM(systemPrompt, userPrompt, rawText, ctx, outputSchema);

    // LLM summarize using multi-provider routing
    console.log(`Calling LLM: ${provider}/${modelId}`);
    const summary = await callLLM(provider, modelId, sys, usr, outputSchema as Record<string, unknown> | null, supportsTools);
    console.log(`Summary generated with confidence: ${(summary as any)?.extraction_quality?.confidence ?? 'unknown'}`);

    // Tasks (optional)
    const createdTasks = await createTasksFromActions(supabase, vjob, summary, ctx.leadId);
    console.log(`Created ${createdTasks.length} tasks`);

    // Activity log
    const llmModelFullName = `${provider}/${modelId}`;
    const summaryAny = summary as any;
    await supabase.from("activity_log").insert({
      workspace_id: vjob.workspace_id,
      entity_type: "voice_transcription",
      entity_id: vjob.id,
      activity_type: "transcription_completed",
      content: `Transcription générée (${createdTasks.length} tâche(s) créée(s))`,
      lead_id: ctx.leadId,
      project_id: vjob.project_id,
      created_by: vjob.created_by,
      ai_metadata: {
        ...(vjob.ai_metadata ?? {}),
        stt_model: "whisper-1",
        llm_model: llmModelFullName,
        llm_provider: provider,
        autonomy_level: "N0",
        confidence: summaryAny?.extraction_quality?.confidence ?? null,
      },
    });

    // Done - include RAG metadata
    const ragMetadata = ctx.autoDetectionUsed
      ? {
          rag_used: true,
          detected_solutions: ctx.detectedSolutions?.map(s => ({
            resource_id: s.resource_id,
            resource_type: s.resource_type,
            resource_title: s.resource_title,
            resource_slug: s.resource_slug,
            similarity: s.similarity,
          })) ?? [],
        }
      : { rag_used: false };

    await supabase
      .from("voice_transcriptions")
      .update({
        summary,
        status: "done",
        llm_model_id: resolvedLLMModelId,
        ai_metadata: {
          ...(vjob.ai_metadata ?? {}),
          llm_model: llmModelFullName,
          llm_provider: provider,
          autonomy_level: ctx.autoDetectionUsed ? "N1" : "N0", // N1 if RAG was used
          confidence: summaryAny?.extraction_quality?.confidence ?? null,
          validated_by_human: false,
          validation_required: ctx.autoDetectionUsed, // Requires validation if auto-detected
          ...ragMetadata,
        },
      })
      .eq("id", job_id);

    console.log(`Job ${job_id} completed successfully`);

    return new Response(JSON.stringify({ ok: true, job_id, created_tasks: createdTasks.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const errStr = e instanceof Error ? (e.stack || e.message) : String(e);
    console.error("Process error:", errStr);

    // Try to update job status to error
    try {
      const { job_id } = await req.clone().json();
      if (job_id) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from("voice_transcriptions")
          .update({
            status: "error",
            ai_metadata: { last_error: errStr, last_error_at: new Date().toISOString() },
          })
          .eq("id", job_id);
      }
    } catch {
      // Ignore cleanup errors
    }

    return new Response(JSON.stringify({ error: "process_failed", details: errStr }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
