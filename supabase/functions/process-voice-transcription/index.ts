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
const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";

// Limits - Whisper max is 25MB, but we can stream larger files
const WHISPER_MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB - OpenAI Whisper per-request limit
const EDGE_FUNCTION_MAX_FILE_SIZE = 250 * 1024 * 1024; // 250MB - streaming allows larger files
const MAX_TRANSCRIPTION_CHARS = 15000; // Limit text sent to LLM

// LLM timeout must be BELOW the Edge Function platform timeout (~60-150s) to fail gracefully.
// If LLM takes too long, we catch the error and persist status before platform kills us.
const LLM_TIMEOUT_MS = 50_000; // 50s - fail fast before platform timeout
const WHISPER_TIMEOUT_MS = 55_000; // 55s - streaming helps but still cap it

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

// ============= SAFE LOGGING UTILITIES =============
function logPreview(tag: string, s: string, max = 300) {
  const safe = s ?? "";
  console.log(`[${tag}] len=${safe.length} preview=${safe.slice(0, max)}`);
}

function logError(tag: string, err: unknown, max = 500) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[${tag}] ${msg.slice(0, max)}`);
}

// ============= MULTIPART STREAMING UTILITIES =============
function encodeUtf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function concatUint8(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/**
 * Build a streaming multipart/form-data body without loading file in memory
 */
function multipartStream(params: {
  boundary: string;
  fields: Array<{ name: string; value: string }>;
  file: {
    fieldName: string;
    filename: string;
    contentType: string;
    stream: ReadableStream<Uint8Array>;
  };
}): ReadableStream<Uint8Array> {
  const { boundary, fields, file } = params;

  const preambleParts: Uint8Array[] = [];

  for (const f of fields) {
    preambleParts.push(encodeUtf8(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${f.name}"\r\n\r\n` +
      `${f.value}\r\n`
    ));
  }

  preambleParts.push(encodeUtf8(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${file.fieldName}"; filename="${file.filename}"\r\n` +
    `Content-Type: ${file.contentType}\r\n\r\n`
  ));

  const preamble = preambleParts.reduce((acc, cur) => concatUint8(acc, cur), new Uint8Array());
  const closing = encodeUtf8(`\r\n--${boundary}--\r\n`);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(preamble);

      const reader = file.stream.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) controller.enqueue(value);
        }
      } finally {
        reader.releaseLock();
      }

      controller.enqueue(closing);
      controller.close();
    }
  });
}

/**
 * Get file extension from MIME type for Whisper API
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/aac': 'm4a',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/wave': 'wav',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
    'audio/x-flac': 'flac',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  };
  
  return mimeToExt[mimeType.toLowerCase()] || 'mp3';
}

// ============= WHISPER TRANSCRIPTION (STREAMING) =============

/**
 * Transcribe audio by streaming directly from Storage to Whisper
 * No blob() call - prevents memory exhaustion
 */
async function transcribeWithWhisperStreaming(params: {
  audioStream: ReadableStream<Uint8Array>;
  fileName: string;
  mimeType: string;
  language?: string;
}): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("openai_api_key_not_configured: OPENAI_API_KEY is required for Whisper transcription");
  }

  const { audioStream, fileName, mimeType, language = "fr" } = params;
  const boundary = `----edge-${crypto.randomUUID()}`;

  console.log(`[Whisper] Streaming transcription: ${fileName}, type=${mimeType}`);

  const fields = [
    { name: "model", value: "whisper-1" },
    { name: "language", value: language },
    { name: "response_format", value: "text" },
  ];

  const bodyStream = multipartStream({
    boundary,
    fields,
    file: {
      fieldName: "file",
      filename: fileName,
      contentType: mimeType || "application/octet-stream",
      stream: audioStream,
    },
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), WHISPER_TIMEOUT_MS);

  try {
    const res = await fetch(WHISPER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyStream,
      signal: controller.signal,
    });

    const txt = await res.text();
    logPreview("Whisper_Response", txt);

    if (res.status === 413) {
      throw new Error("WHISPER_MAX_SIZE: File exceeds Whisper API limit (25MB). Chunking or compression required.");
    }

    if (!res.ok) {
      throw new Error(`whisper_api_error: ${res.status} - ${txt.slice(0, 500)}`);
    }

    return txt.trim();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fallback: Transcribe small audio using blob (for files < 25MB already fetched)
 */
async function transcribeWithWhisperBlob(audioBlob: Blob, language = "fr"): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("openai_api_key_not_configured");
  }

  const ext = getExtensionFromMimeType(audioBlob.type);
  const fileName = `audio.${ext}`;
  console.log(`[Whisper] Blob transcription: ${fileName}, size=${(audioBlob.size / 1024).toFixed(1)} KB`);

  const formData = new FormData();
  formData.append("file", audioBlob, fileName);
  formData.append("model", "whisper-1");
  formData.append("language", language);
  formData.append("response_format", "text");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), WHISPER_TIMEOUT_MS);

  try {
    const response = await fetch(WHISPER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
      signal: controller.signal,
    });

    if (response.status === 413) {
      throw new Error("WHISPER_MAX_SIZE: File exceeds Whisper API limit (25MB). Chunking or compression required.");
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`whisper_api_error: ${response.status} - ${errorText.slice(0, 500)}`);
    }

    return (await response.text()).trim();
  } finally {
    clearTimeout(timeout);
  }
}

// ============= JSON EXTRACTION O(n) =============

function tryParseJson(s: string): Record<string, unknown> | null {
  try { return JSON.parse(s); } catch { return null; }
}

function stripOuterBackticks(s: string): string {
  let out = s.trim();
  while (out.startsWith("`")) out = out.slice(1).trimStart();
  while (out.endsWith("`")) out = out.slice(0, -1).trimEnd();
  return out;
}

function extractFromFences(s: string): string | null {
  const lower = s.toLowerCase();
  const start = lower.indexOf("```json");
  if (start !== -1) {
    const after = s.indexOf("\n", start);
    if (after !== -1) {
      const end = s.indexOf("```", after + 1);
      if (end !== -1) return s.slice(after + 1, end).trim();
    }
  }
  const s2 = s.indexOf("```");
  if (s2 !== -1) {
    const after = s.indexOf("\n", s2);
    if (after !== -1) {
      const end = s.indexOf("```", after + 1);
      if (end !== -1) return s.slice(after + 1, end).trim();
    }
  }
  return null;
}

function extractBetweenOuterBraces(s: string): string | null {
  const first = s.indexOf("{");
  if (first === -1) return null;
  const last = s.lastIndexOf("}");
  if (last <= first) return null;
  return s.slice(first, last + 1).trim();
}

function nextNonWhitespace(s: string, from: number): string | null {
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (c !== " " && c !== "\n" && c !== "\r" && c !== "\t") return c;
  }
  return null;
}

function collapseSpaces(s: string): string {
  let out = "";
  let prevSpace = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const isSpace = c === " ";
    if (isSpace) {
      if (!prevSpace) out += " ";
      prevSpace = true;
    } else {
      out += c;
      prevSpace = false;
    }
  }
  return out;
}

function minimalJsonRepair(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\n" || ch === "\r" || ch === "\t") {
      out += " ";
      continue;
    }
    if (ch === ",") {
      const nextChar = nextNonWhitespace(s, i + 1);
      if (nextChar === "}" || nextChar === "]") continue;
    }
    out += ch;
  }
  return collapseSpaces(out).trim();
}

/**
 * Extract JSON from text - O(n) without heavy regex
 */
function extractJsonFromText(content: string): Record<string, unknown> {
  const cleaned = (content ?? "").trim();
  logPreview("JSON_Extract", cleaned, 200);

  // 1) Direct parse
  const direct = tryParseJson(cleaned);
  if (direct) return direct;

  // 2) Strip backticks
  const stripped = stripOuterBackticks(cleaned);
  const strippedParsed = tryParseJson(stripped);
  if (strippedParsed) return strippedParsed;

  // 3) Extract from fences
  const fenced = extractFromFences(stripped);
  if (fenced) {
    const fencedParsed = tryParseJson(fenced);
    if (fencedParsed) return fencedParsed;
  }

  // 4) First { ... last }
  const braceCandidate = extractBetweenOuterBraces(stripped);
  if (braceCandidate) {
    const braceParsed = tryParseJson(braceCandidate);
    if (braceParsed) return braceParsed;

    // Minimal repairs
    const repaired = minimalJsonRepair(braceCandidate);
    const repairedParsed = tryParseJson(repaired);
    if (repairedParsed) return repairedParsed;
  }

  // Fallback
  console.warn(`[JSON] parse_failed; returning fallback summary`);
  return { 
    summary: stripped.slice(0, 5000), 
    action_items: [], 
    _parse_fallback: true 
  };
}

// ============= LLM CALL WITH TIMEOUT + RETRY =============

async function callLLM(
  provider: LLMProvider,
  modelId: string,
  sys: string,
  usr: string,
  outputSchema: Record<string, unknown> | null,
  supportsTools: boolean
): Promise<Record<string, unknown>> {
  console.log(`[LLM] provider=${provider} model=${modelId}`);

  const jsonStrictSuffix = `

CRITICAL OUTPUT RULES:
- Output ONLY valid JSON, nothing else.
- No markdown, no code fences, no extra text.
- If you cannot comply, output: {"error":"invalid_output"}.
- Respect exact keys and structure requested.`;

  const systemContent = sys + jsonStrictSuffix;
  
  // Truncate user content to prevent memory issues
  const truncatedUsr = usr.length > MAX_TRANSCRIPTION_CHARS 
    ? usr.slice(0, MAX_TRANSCRIPTION_CHARS) + "\n[...TRUNCATED...]"
    : usr;

  const makeRequestBody = () => {
    const body: Record<string, unknown> = {
      model: modelId,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: truncatedUsr },
      ],
    };

    if (!supportsTools || !outputSchema) {
      body.response_format = { type: "json_object" };
    }

    if (outputSchema && supportsTools) {
      body.tools = [{
        type: "function",
        function: {
          name: "submit_transcription_summary",
          description: "Submit the structured summary of the transcription",
          parameters: outputSchema
        }
      }];
      body.tool_choice = { type: "function", function: { name: "submit_transcription_summary" } };
    }

    return body;
  };

  const attempt = async (attemptNo: number): Promise<Record<string, unknown>> => {
    let apiUrl = LOVABLE_AI_GATEWAY;
    let headers: Record<string, string> = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    };

    // Provider-specific configuration
    if (provider === "openai" && OPENAI_API_KEY) {
      apiUrl = OPENAI_API_URL;
      headers = { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" };
    } else if (provider === "anthropic" && ANTHROPIC_API_KEY) {
      apiUrl = ANTHROPIC_API_URL;
      headers = { 
        "x-api-key": ANTHROPIC_API_KEY, 
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json" 
      };
    } else if (provider === "openrouter" && OPENROUTER_API_KEY) {
      apiUrl = OPENROUTER_API_URL;
      headers = { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" };
    }

    const requestBody = makeRequestBody();
    
    // Anthropic has different format
    if (provider === "anthropic") {
      const anthropicBody: Record<string, unknown> = {
        model: modelId,
        max_tokens: 4096,
        system: systemContent,
        messages: [{ role: "user", content: truncatedUsr }],
      };
      if (outputSchema && supportsTools) {
        anthropicBody.tools = [{
          name: "submit_transcription_summary",
          description: "Submit the structured summary of the transcription",
          input_schema: outputSchema
        }];
        anthropicBody.tool_choice = { type: "tool", name: "submit_transcription_summary" };
      }
      Object.assign(requestBody, anthropicBody);
    }

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort("timeout"), LLM_TIMEOUT_MS);

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const txt = await res.text();
      logPreview(`LLM_Response_${attemptNo}`, txt);

      if (res.status === 429) throw new Error("rate_limited");
      if (res.status === 402) throw new Error("credits_exhausted");
      if (!res.ok) throw new Error(`llm_failed: ${txt.slice(0, 500)}`);

      return parseProviderResponse(provider, txt, outputSchema);
    } finally {
      clearTimeout(t);
    }
  };

  try {
    return await attempt(1);
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? e);
    // 1 retry on transient errors - but NOT on timeout (abort kills us before we can catch)
    // For timeout, we've already failed once; retrying just wastes time and risks platform kill
    if (msg.includes("rate_limited") || (msg.includes("fetch") && !msg.includes("timeout") && !msg.includes("abort"))) {
      console.warn(`[LLM] retrying once due to: ${msg.slice(0, 120)}`);
      return await attempt(2);
    }
    // Re-throw with clear message for timeout
    if (msg.includes("timeout") || msg.includes("abort")) {
      throw new Error(`LLM_TIMEOUT: Analysis took too long (>${LLM_TIMEOUT_MS/1000}s). Transcript may be too complex or too long.`);
    }
    throw e;
  }
}

function parseProviderResponse(
  provider: LLMProvider,
  responseText: string,
  _outputSchema: Record<string, unknown> | null
): Record<string, unknown> {
  const json = JSON.parse(responseText);
  
  if (provider === "anthropic") {
    const toolUse = json?.content?.find((c: Record<string, unknown>) => c.type === "tool_use");
    if (toolUse?.input) return toolUse.input as Record<string, unknown>;
    
    const textContent = json?.content?.find((c: Record<string, unknown>) => c.type === "text");
    if (textContent?.text) return extractJsonFromText(textContent.text as string);
    throw new Error("anthropic_empty_content");
  }
  
  const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      return JSON.parse(toolCall.function.arguments);
    } catch {
      // Fall through to content extraction
    }
  }
  
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("llm_empty_content");
  
  return extractJsonFromText(content);
}

// ============= ENTITY CONTEXT & PROMPTS =============

/**
 * Determine the best transcription prompt based on context
 * - If project is linked → transcription_reunion_projet
 * - If lead is linked (commercial context) → transcription_rdv_commercial
 * - Default → transcription_rdv_commercial
 */
function selectTranscriptionPromptSlug(job: VoiceJob): string {
  // If project is linked, use project meeting prompt
  if (job.project_id) {
    return "transcription_reunion_projet";
  }
  
  // Default: commercial RDV prompt (most common use case)
  return "transcription_rdv_commercial";
}

// deno-lint-ignore no-explicit-any
async function loadMasterPrompt(supabase: any) {
  // Prefer the global master-agent, fallback to cockpit-master-assistant
  const { data: master } = await supabase
    .from("ai_prompts")
    .select("id, slug, system_prompt, user_prompt, output_schema, model_config")
    .eq("slug", "master-agent")
    .maybeSingle();

  if (master) return master;

  const { data: cockpit } = await supabase
    .from("ai_prompts")
    .select("id, slug, system_prompt, user_prompt, output_schema, model_config")
    .eq("slug", "cockpit-master-assistant")
    .maybeSingle();

  return cockpit ?? null;
}

// deno-lint-ignore no-explicit-any
async function loadPromptProfile(supabase: any, prompt_profile_id: string | null, job?: VoiceJob) {
  // Secondary prompt = the specialized transcription prompt
  let secondary: any = null;

  // 1) Explicit prompt profile
  if (prompt_profile_id) {
    const { data, error } = await supabase
      .from("ai_prompts")
      .select("id, slug, system_prompt, user_prompt, output_schema, model_config")
      .eq("id", prompt_profile_id)
      .single();

    if (error) throw new Error(`prompt_profile_not_found: ${error.message}`);
    secondary = data;
    console.log(`[Prompt] Using explicit profile: ${secondary?.slug}`);
  } else {
    // 2) Auto-select based on context (lead/project)
    const selectedSlug = job ? selectTranscriptionPromptSlug(job) : "transcription_rdv_commercial";

    const { data: ctxPrompt } = await supabase
      .from("ai_prompts")
      .select("id, slug, system_prompt, user_prompt, output_schema, model_config")
      .eq("slug", selectedSlug)
      .maybeSingle();

    if (ctxPrompt) {
      secondary = ctxPrompt;
      console.log(`[Prompt] Auto-selected: ${secondary.slug}`);
    }
  }

  // 3) Fallback secondary
  if (!secondary) {
    const { data: fallback } = await supabase
      .from("ai_prompts")
      .select("id, slug, system_prompt, user_prompt, output_schema, model_config")
      .eq("slug", "transcription_rdv_commercial")
      .maybeSingle();

    if (fallback) {
      secondary = fallback;
      console.log(`[Prompt] Fallback to: transcription_rdv_commercial`);
    }
  }

  // Master prompt is always prepended to the system prompt (as requested)
  const master = await loadMasterPrompt(supabase);
  if (master?.slug) console.log(`[Prompt] Master loaded: ${master.slug}`);

  if (!master && !secondary) {
    console.warn("[Prompt] No prompts found - using minimal fallback");
    return null;
  }

  const combinedSystem = [master?.system_prompt, secondary?.system_prompt]
    .filter(Boolean)
    .join("\n\n");

  // Keep user_prompt/output_schema/model_config from secondary (the specialized one)
  const out = {
    ...(secondary ?? master),
    system_prompt: combinedSystem,
    user_prompt: secondary?.user_prompt ?? null,
    output_schema: secondary?.output_schema ?? null,
    model_config: (secondary?.model_config ?? master?.model_config) ?? null,
  };

  return out;
}

interface SemanticSearchResult {
  resource_id: string;
  resource_type: string;
  resource_title: string;
  resource_slug: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

// deno-lint-ignore no-explicit-any
async function fetchKeywordAliases(supabase: any): Promise<Map<string, string>> {
  const aliasMap = new Map<string, string>();
  
  try {
    const { data, error } = await supabase
      .from("keyword_aliases")
      .select("canonical_name, alias, phonetic_key")
      .eq("is_active", true);
    
    if (error) {
      console.warn("[Aliases] Failed to fetch:", error.message.slice(0, 100));
      return aliasMap;
    }
    
    // deno-lint-ignore no-explicit-any
    for (const row of (data || []) as any[]) {
      aliasMap.set(row.alias.toLowerCase(), row.canonical_name);
      if (row.phonetic_key) {
        aliasMap.set(row.phonetic_key.toLowerCase(), row.canonical_name);
      }
    }
    
    console.log(`[Aliases] Loaded ${aliasMap.size} entries`);
    return aliasMap;
  } catch (err) {
    logError("Aliases", err);
    return aliasMap;
  }
}

function normalizeTranscriptWithAliases(transcript: string, aliasMap: Map<string, string>): string {
  if (aliasMap.size === 0) return transcript;
  
  let normalized = transcript;
  const sortedAliases = Array.from(aliasMap.entries())
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [alias, canonical] of sortedAliases) {
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
    let searchText = transcript;
    if (aliasMap && aliasMap.size > 0) {
      searchText = normalizeTranscriptWithAliases(transcript, aliasMap);
    }
    
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
        match_threshold: 0.65,
        match_count: 10,
      }),
    });

    if (!response.ok) {
      console.warn("[RAG] Search failed");
      return [];
    }

    const data = await response.json();
    console.log(`[RAG] Found ${data.results?.length ?? 0} matches`);
    return data.results ?? [];
  } catch (error) {
    logError("RAG", error);
    return [];
  }
}

// deno-lint-ignore no-explicit-any
async function fetchEntityContext(supabase: any, job: VoiceJob, transcript?: string) {
  // deno-lint-ignore no-explicit-any
  let lead: any = null;
  // deno-lint-ignore no-explicit-any
  let project: any = null;
  // deno-lint-ignore no-explicit-any
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

  // IMPORTANT: ensure this is a boolean (previously this accidentally became the transcript string)
  const shouldAutoDetect = !job.project_id && !job.solution_id && !!transcript;
  if (shouldAutoDetect) {
    console.log("[Context] RAG auto-detection enabled");
    const aliasMap = await fetchKeywordAliases(supabase);
    detectedSolutions = await searchSimilarResources(transcript, ["solution", "service"], aliasMap);
  }

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

  // deno-lint-ignore no-explicit-any
  let leadContacts: any[] = [];
  if (leadId) {
    const { data } = await supabase.from("leads").select("*").eq("id", leadId).single();
    lead = data ?? null;
    
    const { data: contacts } = await supabase
      .from("lead_contacts")
      .select("*")
      .eq("lead_id", leadId)
      .order("is_primary", { ascending: false });
    leadContacts = contacts ?? [];
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

type EntityContext = Awaited<ReturnType<typeof fetchEntityContext>>;

function buildLLM(
  systemPrompt: string, 
  userPrompt: string | null, 
  transcriptText: string, 
  ctx: EntityContext, 
  schema: Record<string, unknown> | null
) {
  const detectedSolutionsContext = ctx.detectedSolutions?.length 
    ? ctx.detectedSolutions.map(s => ({
        title: s.resource_title,
        type: s.resource_type,
        slug: s.resource_slug,
        similarity_score: s.similarity,
      }))
    : [];

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
    transcript: transcriptText.slice(0, MAX_TRANSCRIPTION_CHARS),
    crm_context: {
      lead: ctx.lead,
      lead_contacts: leadContactsContext,
      project: ctx.project,
      solution: ctx.solution,
      recent_activity: ctx.activity?.slice(0, 10),
      open_tasks: ctx.tasks?.slice(0, 20),
    },
    rag_context: {
      auto_detection_used: ctx.autoDetectionUsed ?? false,
      detected_solutions: detectedSolutionsContext,
    },
    output_schema: schema ?? null,
    rules: {
      json_only: true,
      no_hallucination: true,
      max_executive_summary_words: 200,
    },
  };

  const usr = userPrompt
    ? `${userPrompt}\n\nINPUT:\n${JSON.stringify(payload)}`
    : JSON.stringify(payload);

  return { sys: systemPrompt, usr };
}

// deno-lint-ignore no-explicit-any
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

// ============= DATE/TIME PARSING =============

function parseDueDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const normalized = dateStr.toLowerCase().trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  const frMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (frMatch) {
    const [, day, month, year] = frMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  if (normalized === "aujourd'hui" || normalized === "today") {
    return today.toISOString().split('T')[0];
  }
  if (normalized === "demain" || normalized === "tomorrow") {
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  }
  
  const daysMatch = normalized.match(/dans\s+(\d+)\s+jours?/);
  if (daysMatch) {
    today.setDate(today.getDate() + parseInt(daysMatch[1]));
    return today.toISOString().split('T')[0];
  }
  
  if (normalized.includes("semaine prochaine")) {
    today.setDate(today.getDate() + 7);
    return today.toISOString().split('T')[0];
  }
  
  return null;
}

function parseDueTime(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null;
  
  const normalized = timeStr.toLowerCase().trim();
  
  const hMatch = normalized.match(/(\d{1,2})h(\d{2})?/);
  if (hMatch) {
    const hours = hMatch[1].padStart(2, '0');
    const mins = hMatch[2] ?? '00';
    return `${hours}:${mins}:00`;
  }
  
  const colonMatch = normalized.match(/(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    const hours = colonMatch[1].padStart(2, '0');
    const mins = colonMatch[2];
    return `${hours}:${mins}:00`;
  }
  
  return null;
}

// ============= TASK CREATION =============

// deno-lint-ignore no-explicit-any
async function createTasksFromActions(
  supabase: any, 
  job: VoiceJob, 
  summary: Record<string, unknown>, 
  leadId: string | null
): Promise<Array<{ id: string; title: string }>> {
  const items = Array.isArray(summary?.action_items) ? summary.action_items : [];
  if (!items.length) return [];

  const inserts: Array<Record<string, unknown>> = [];

  for (const it of items) {
    const title = (it?.task as string ?? "").trim();
    if (!title) continue;
    
    const dueDate = parseDueDate(it?.due_date as string) || parseDueDate(it?.deadline as string);
    const dueTime = parseDueTime(it?.due_time as string) || parseDueTime(it?.time as string);
    
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
        generated_at: new Date().toISOString(),
      },
    });
  }

  if (!inserts.length) return [];

  const { data, error } = await supabase.from("tasks").insert(inserts).select("id,title");
  if (error) throw new Error(`tasks_insert_failed: ${error.message}`);
  
  console.log(`[Tasks] Created ${data?.length ?? 0} tasks`);
  return data ?? [];
}

// ============= MAIN HANDLER =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let jobId: string | null = null;
  let initialStatus: string | null = null;
  let forceReanalyze = false;

  try {
    const body = await req.json();
    jobId = body.job_id;
    forceReanalyze = body?.force_reanalyze === true;

    if (!jobId) {
      return new Response(JSON.stringify({ error: "missing_job_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: job, error: jerr } = await supabase
      .from("voice_transcriptions")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jerr || !job) {
      return new Response(JSON.stringify({ error: "job_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const vjob = job as VoiceJob;
    initialStatus = vjob.status;

    // Allows re-running LLM analysis on completed transcriptions
    if (vjob.status === "done" && !forceReanalyze) {
      return new Response(JSON.stringify({ ok: true, already_done: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (forceReanalyze && vjob.status === "done") {
      console.log(`[Job] Force re-analyzing completed transcription ${jobId}`);
    }

    console.log(`[Job] Processing ${jobId}`);

    // If raw transcript already exists, skip Whisper and go straight to analysis.
    // This covers:
    // - client-side chunking flow (pre_transcribed_text)
    // - retries where transcription already completed
    const existingRawTranscript = (job as Record<string, unknown>).raw_transcript as string | null;
    const aiMeta = vjob.ai_metadata ?? {};

    let rawText: string;

    if (existingRawTranscript && existingRawTranscript.trim().length > 0) {
      console.log("[Process] Using existing raw_transcript (skip Whisper)");
      rawText = existingRawTranscript;

      await supabase
        .from("voice_transcriptions")
        .update({
          status: "analyzing",
          ai_metadata: {
            ...aiMeta,
            transcription_skipped: true,
            transcribed_at: (aiMeta as Record<string, unknown>).transcribed_at ?? new Date().toISOString(),
          },
        })
        .eq("id", jobId);
    } else {
      // Need to transcribe the audio
      await supabase.from("voice_transcriptions").update({ status: "transcribing" }).eq("id", jobId);

      // Get signed URL for audio
      const bucket = "voice-transcriptions";
      const { data: signed, error: signErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(vjob.storage_path, 600);
      
      if (signErr || !signed?.signedUrl) {
        throw new Error(`signed_url_failed: ${signErr?.message ?? "no_url"}`);
      }

      // Fetch audio with HEAD first to check size
      const headRes = await fetch(signed.signedUrl, { method: "HEAD" });
      const contentLength = headRes.headers.get("content-length");
      const sizeBytes = contentLength ? Number(contentLength) : null;
      const mimeType = (headRes.headers.get("content-type") ?? "application/octet-stream").split(";")[0];
      const fileSizeMB = typeof sizeBytes === "number" && !Number.isNaN(sizeBytes) ? sizeBytes / 1024 / 1024 : null;

      console.log(`[Audio] size=${fileSizeMB ? fileSizeMB.toFixed(2) + " MB" : "unknown"}, type=${mimeType}`);

      // Check if file exceeds Whisper API limit - require client-side chunking
      if (typeof sizeBytes === "number" && sizeBytes > WHISPER_MAX_SIZE_BYTES) {
        console.error(`[Process] WHISPER_MAX_SIZE: File exceeds Whisper API limit (25MB). Chunking or compression required.`);
        await supabase.from("voice_transcriptions").update({
          status: "error",
          ai_metadata: {
            ...aiMeta,
            error_code: "WHISPER_MAX_SIZE",
            error_message: `Fichier trop volumineux (${fileSizeMB?.toFixed(1)} MB). Utilisez le découpage client-side pour les fichiers > 25MB.`,
            rejected_at: new Date().toISOString(),
          },
        }).eq("id", jobId);

        return new Response(JSON.stringify({
          ok: false,
          error: "process_failed",
          details: "WHISPER_MAX_SIZE: File exceeds Whisper API limit (25MB). Chunking or compression required.",
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Safety cap for extreme files (streaming limit)
      if (typeof sizeBytes === "number" && sizeBytes > EDGE_FUNCTION_MAX_FILE_SIZE) {
        console.error(`[REJECTED] File too large: ${fileSizeMB?.toFixed(2)} MB`);
        await supabase.from("voice_transcriptions").update({
          status: "error",
          ai_metadata: {
            ...aiMeta,
            error_code: "file_too_large",
            error_message: `Fichier trop volumineux (${fileSizeMB?.toFixed(1)} MB). Limite: ${(EDGE_FUNCTION_MAX_FILE_SIZE / 1024 / 1024)} MB.`,
            rejected_at: new Date().toISOString(),
          },
        }).eq("id", jobId);

        return new Response(JSON.stringify({
          ok: false,
          error: "file_too_large",
          message: `Fichier audio trop volumineux. Maximum: ${(EDGE_FUNCTION_MAX_FILE_SIZE / 1024 / 1024)} MB.`,
        }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Transcription: files <= 25MB only (larger files use client-side chunking)
      const ext = getExtensionFromMimeType(mimeType);
      const fileName = `audio.${ext}`;

      console.log("[Whisper] Using blob mode for file <= 25MB");
      const audioRes = await fetch(signed.signedUrl);
      if (!audioRes.ok) throw new Error(`audio_fetch_failed: ${audioRes.status}`);
      const audioBlob = await audioRes.blob();
      rawText = await transcribeWithWhisperBlob(audioBlob, "fr");

      // Update with transcription result
      await supabase
        .from("voice_transcriptions")
        .update({
          raw_transcript: rawText,
          segments: null,
          status: "analyzing",
          ai_metadata: {
            ...aiMeta,
            source: "openai-whisper",
            transcribed_at: new Date().toISOString(),
          },
        })
        .eq("id", jobId);
    }

    logPreview("Transcription", rawText);

    // Note: raw_transcript update is now handled in the transcription branches above

    // Context + RAG
    const ctx = await fetchEntityContext(supabase, vjob, rawText);
    console.log(`[Context] lead=${ctx.leadId}, project=${ctx.project?.id ?? null}, rag=${ctx.autoDetectionUsed}`);

    // LLM processing
    const profile = await loadPromptProfile(supabase, vjob.prompt_profile_id, vjob);
    const systemPrompt = profile?.system_prompt ?? "Return JSON only.";
    const userPrompt = profile?.user_prompt ?? null;
    const outputSchema = profile?.output_schema ?? null;
    
    let provider: LLMProvider = "lovable";
    let modelId = "google/gemini-2.5-flash";
    let supportsTools = true;
    let resolvedLLMModelId: string | null = null;
    
    const profileModelConfig = profile?.model_config as Record<string, unknown> | null;
    const configuredLLMModelId = profileModelConfig?.llm_model_id as string | undefined;
    
    if (configuredLLMModelId) {
      const llmModel = await fetchLLMModel(supabase, configuredLLMModelId);
      if (llmModel) {
        provider = llmModel.provider as LLMProvider;
        modelId = llmModel.model_id;
        supportsTools = llmModel.supports_tools;
        resolvedLLMModelId = llmModel.id;
      }
    } else if (profileModelConfig?.model) {
      const profileModel = profileModelConfig.model as string;
      modelId = profileModel;
      if (profileModel.startsWith("gpt-")) provider = "openai";
      else if (profileModel.startsWith("claude-")) provider = "anthropic";
    }

    const { sys, usr } = buildLLM(systemPrompt, userPrompt, rawText, ctx, outputSchema as Record<string, unknown> | null);

    // CRITICAL: Mark as analyzing_llm before LLM call
    // If LLM times out and kills the function, we need to persist error status BEFORE the call
    // We use a pre-emptive metadata flag that the error handler can check
    await supabase
      .from("voice_transcriptions")
      .update({
        ai_metadata: {
          ...(vjob.ai_metadata ?? {}),
          llm_call_started_at: new Date().toISOString(),
          llm_model: `${provider}/${modelId}`,
        },
      })
      .eq("id", jobId);

    let summary: Record<string, unknown>;
    try {
      summary = await callLLM(provider, modelId, sys, usr, outputSchema as Record<string, unknown> | null, supportsTools);
    } catch (llmErr) {
      // LLM failed - persist error status immediately before we might be killed
      const llmErrMsg = llmErr instanceof Error ? llmErr.message : String(llmErr);
      console.error(`[LLM] Failed: ${llmErrMsg.slice(0, 300)}`);
      
      await supabase
        .from("voice_transcriptions")
        .update({
          status: "error",
          ai_metadata: {
            ...(vjob.ai_metadata ?? {}),
            last_error: llmErrMsg.slice(0, 1000),
            last_error_at: new Date().toISOString(),
            llm_model: `${provider}/${modelId}`,
          },
        })
        .eq("id", jobId);
      
      throw llmErr;
    }

    // Tasks
    const createdTasks = await createTasksFromActions(supabase, vjob, summary, ctx.leadId);

    // Activity log
    const llmModelFullName = `${provider}/${modelId}`;
    await supabase.from("activity_log").insert({
      workspace_id: vjob.workspace_id,
      entity_type: "voice_transcription",
      entity_id: vjob.id,
      activity_type: "transcription_completed",
      content: `Transcription générée (${createdTasks.length} tâche(s))`,
      lead_id: ctx.leadId,
      project_id: vjob.project_id,
      created_by: vjob.created_by,
      ai_metadata: {
        stt_model: "whisper-1",
        llm_model: llmModelFullName,
        llm_provider: provider,
      },
    });

    // Done
    const ragMetadata = ctx.autoDetectionUsed
      ? {
          rag_used: true,
          detected_solutions: ctx.detectedSolutions?.map(s => ({
            resource_id: s.resource_id,
            resource_title: s.resource_title,
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
          ...ragMetadata,
        },
      })
      .eq("id", jobId);

    console.log(`[Job] ${jobId} completed`);

    return new Response(JSON.stringify({ ok: true, job_id: jobId, created_tasks: createdTasks.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    logError("Process", e, 500);

    if (jobId) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Preserve existing metadata (and, on re-analysis, avoid flipping a previously done item to error)
        const { data: current } = await supabase
          .from("voice_transcriptions")
          .select("ai_metadata")
          .eq("id", jobId)
          .maybeSingle();

        const currentMeta = (current as any)?.ai_metadata ?? {};
        const isReanalyzeFailure = forceReanalyze && initialStatus === "done";

        await supabase
          .from("voice_transcriptions")
          .update({
            status: isReanalyzeFailure ? "done" : "error",
            ai_metadata: {
              ...currentMeta,
              ...(isReanalyzeFailure
                ? {
                    last_reanalyze_error: errMsg.slice(0, 1000),
                    last_reanalyze_error_at: new Date().toISOString(),
                  }
                : {
                    last_error: errMsg.slice(0, 1000),
                    last_error_at: new Date().toISOString(),
                  }),
            },
          })
          .eq("id", jobId);
      } catch {
        // Ignore cleanup errors
      }
    }

    return new Response(JSON.stringify({ error: "process_failed", details: errMsg.slice(0, 500) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
