import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Centralized AI client for provider switching and fallback
import { callLLMWithFallback } from "../_shared/ai-legacy-bridge.ts";
import { transcribeFromUrl, getDefaultTranscriptionOptions, type AssemblyAIFullResult } from "../_shared/assemblyai-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
// Note: Provider API keys are now managed by the centralized AI client
// ANTHROPIC_API_KEY and OPENROUTER_API_KEY are read automatically by ai-client.ts

const MAX_TRANSCRIPTION_CHARS = 20000; // Limit text sent to LLM (increased for better coverage)
const CHUNK_SIZE_CHARS = 12000; // Size of each chunk for chunked analysis
const MAX_CHUNKS = 5; // Maximum chunks to process (prevents runaway costs)

// LLM timeout must be BELOW the Edge Function platform timeout (~60-150s) to fail gracefully.
const LLM_TIMEOUT_MS = 55_000; // 55s - slightly increased for complex analysis
const COMPRESSION_TIMEOUT_MS = 60_000; // 60s for compression of long transcripts

// AssemblyAI max wait for transcription polling
const ASSEMBLYAI_MAX_WAIT_MS = 300_000; // 5 minutes

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

// ============= LLM CALL - NOW USING CENTRALIZED AI CLIENT =============
// The callLLM function now uses the centralized AI client with automatic
// provider fallback. Provider switching is controlled via /admin/api-library.

async function callLLM(
  _provider: LLMProvider, // Kept for API compatibility, provider is now managed centrally
  _modelId: string, // Kept for API compatibility, model is selected via ai_models config
  sys: string,
  usr: string,
  outputSchema: Record<string, unknown> | null,
  _supportsTools: boolean // Handled automatically by centralized client
): Promise<Record<string, unknown>> {
  console.log(`[LLM] Using centralized AI client with fallback`);
  
  // Truncate user content to prevent memory issues
  const truncatedUsr = usr.length > MAX_TRANSCRIPTION_CHARS 
    ? usr.slice(0, MAX_TRANSCRIPTION_CHARS) + "\n[...TRUNCATED...]"
    : usr;

  try {
    const result = await callLLMWithFallback(
      sys,
      truncatedUsr,
      outputSchema,
      {
        category: 'reasoning',
        timeoutMs: LLM_TIMEOUT_MS,
        maxTokens: 4096,
      }
    );
    
    console.log(`[LLM] Centralized client returned successfully`);
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logError("LLM_Centralized", e);
    throw new Error(msg);
  }
}

// ============= ENTITY CONTEXT & PROMPTS =============

// ============= DEFAULT TRANSCRIPTION PROMPTS (v7.0 Fallback) =============

function getDefaultTranscriptionSystemPrompt(): string {
  return `# Analyse Transcription v7.0 - Mode Exhaustif

Tu es un analyste expert pour IArche (conseil IA B2B). Tu analyses des transcriptions audio.

## RÈGLES CRITIQUES DE PRÉSERVATION

### 1. ZÉRO PERTE D'INFORMATION
Tu DOIS capturer et préserver :
- **TOUS les montants** : euros, pourcentages, délais, quantités
- **TOUTES les dates** : convertir en format absolu DD/MM/YYYY
- **TOUS les noms propres** : personnes, entreprises, produits
- **TOUTES les décisions** : explicites ou implicites
- **TOUS les engagements** : avec responsable identifié

### 2. NORMALISATION PHONÉTIQUE
Utilise le dictionnaire fourni (dictionary_context) pour normaliser les variations.
Exemple : "bérécos" → "Beerecos", "stéfane" → "Stéphane"

### 3. MATCHING ENTITÉS CRM (OBLIGATOIRE)
Tu DOIS utiliser le champ **existing_entities** fourni dans l'input pour matcher les mentions.
Pour CHAQUE nom de personne/entreprise mentionné dans la transcription :
1. Cherche une correspondance dans existing_entities.leads (par name ou company)
2. Cherche une correspondance dans existing_entities.partners (par name ou company)
3. Cherche une correspondance dans existing_entities.projects (par name ou slug)
4. Cherche une correspondance dans existing_entities.solutions (par title ou slug)

Si MATCH trouvé (même partiel/fuzzy) → action: "link" + **existing_id = l'UUID exact de l'entité**
Si NOUVEAU → action: "create"
Si INCERTAIN → action: "verify"

IMPORTANT: Le champ detected_entities ne doit JAMAIS être vide si des noms propres sont mentionnés.

### 4. DATES RELATIVES → ABSOLUES
Convertis toutes les dates relatives en dates absolues :
- "demain" → DD/MM/YYYY (basé sur aujourd'hui)
- "vendredi prochain" → date calculée
- "dans 2 semaines" → date calculée
- "fin janvier" → dernier jour ouvré du mois

### 5. ACTIONS ITEMS LIÉS
Chaque action doit identifier :
- Responsable (@Qui)
- Deadline (date absolue)
- Entité liée si possible (lead, project, solution)

## FORMAT DE SORTIE
Tu DOIS retourner un JSON valide suivant l'output_schema fourni.
Puis un résumé Markdown pour lecture humaine dans le champ summary_markdown.`;
}

function getDefaultTranscriptionUserPrompt(): string {
  return `## Contexte utilisateur
{{analysis_context}}

## Transcription audio
{{transcript}}

---

Analyse cette transcription en suivant les règles du système.

CHECKLIST AVANT RÉPONSE :
- [ ] Tous les montants capturés avec contexte ?
- [ ] Toutes les dates converties en absolu ?
- [ ] Tous les noms propres identifiés ?
- [ ] Toutes les décisions listées ?
- [ ] Matching CRM effectué pour chaque entité mentionnée ?
- [ ] Actions items avec responsable + deadline + entité liée ?

Retourne le JSON complet selon le schéma.`;
}

function getDefaultTranscriptionOutputSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      title: { 
        type: "string", 
        description: "Titre COURT de la transcription (max 80 caractères). Exemple: 'RDV commercial Biroko - Stratégie WhatsApp'. NE PAS mettre le résumé complet ici." 
      },
      executive_summary: { 
        type: "string", 
        description: "Résumé exécutif en 3-5 phrases. Synthèse complète du contenu discuté." 
      },
      topics: {
        type: "array",
        items: { type: "string" },
        description: "Liste des sujets/thèmes évoqués dans la conversation (ex: 'Stratégie WhatsApp', 'Organisation événements')"
      },
      participants: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            role: { type: "string" },
            company: { type: "string" },
            crm_match: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["lead", "partner"] },
                id: { type: "string" },
                confidence: { type: "number" }
              }
            }
          },
          required: ["name", "role"]
        }
      },
      key_points: {
        type: "array",
        items: { type: "string" },
        description: "Points clés abordés - les informations importantes à retenir"
      },
      decisions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            content: { type: "string" },
            owner: { type: "string" },
            date_mentioned: { type: "string" }
          },
          required: ["content"]
        },
        description: "Décisions prises durant la réunion"
      },
      risks_blockers: {
        type: "array",
        items: { type: "string" },
        description: "Risques identifiés, blocages, points de vigilance"
      },
      questions_open: {
        type: "array",
        items: { type: "string" },
        description: "Questions restées en suspens, points à clarifier"
      },
      next_steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: { type: "string" },
            owner: { type: "string" },
            deadline: { type: "string", description: "Format YYYY-MM-DD si mentionné" }
          },
          required: ["action"]
        },
        description: "Prochaines étapes concrètes à réaliser"
      },
      action_items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            assignee: { type: "string" },
            due_date: { type: "string", description: "Format YYYY-MM-DD" },
            priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            linked_entity: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["lead", "project", "solution", "partner"] },
                id: { type: "string" },
                name: { type: "string" }
              }
            }
          },
          required: ["title", "assignee", "priority"]
        }
      },
      detected_entities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            type: { type: "string", enum: ["lead", "project", "solution", "partner", "company", "person"] },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            existing_id: { type: "string" },
            action: { type: "string", enum: ["link", "create", "verify"] }
          },
          required: ["name", "type", "confidence", "action"]
        },
        description: "Entités CRM détectées pour liaison automatique"
      },
      financial_data: {
        type: "array",
        items: {
          type: "object",
          properties: {
            amount: { type: "number" },
            currency: { type: "string", default: "EUR" },
            context: { type: "string" }
          },
          required: ["amount", "context"]
        }
      },
      dates_mentioned: {
        type: "array",
        items: {
          type: "object",
          properties: {
            original: { type: "string", description: "Expression originale" },
            normalized: { type: "string", description: "Format YYYY-MM-DD" },
            context: { type: "string" }
          },
          required: ["original", "normalized", "context"]
        }
      },
      sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
      quality_score: { 
        type: "number", 
        minimum: 0, 
        maximum: 100,
        description: "Score qualité audio/contenu"
      }
    },
    required: [
      "title", 
      "executive_summary", 
      "topics",
      "participants", 
      "key_points", 
      "decisions",
      "risks_blockers",
      "questions_open",
      "next_steps",
      "action_items", 
      "detected_entities", 
      "sentiment"
    ]
  };
}

/**
 * Partner type for prompt selection
 */
interface LinkedPartner {
  id: string;
  name: string;
  partner_type: string;
}

/**
 * Determine the best transcription prompt based on context v7.0
 * Priority order:
 * 1. Expert IA partner linked → transcription_avec_expert_ia
 * 2. Referent/apporteur partner linked → transcription_avec_referent
 * 3. Project linked → transcription_reunion_projet
 * 4. Lead linked (commercial) → transcription_rdv_commercial
 * 5. No entities linked (internal) → transcription_interne
 * 6. Support tag detected → transcription_support_client
 */
function selectTranscriptionPromptSlug(
  job: VoiceJob, 
  linkedPartners: LinkedPartner[] = [],
  tags: string[] = []
): string {
  // 1. Check for expert IA partner
  const expertIA = linkedPartners.find(p => 
    p.partner_type === 'expert_ia' || 
    p.partner_type === 'expert-ia' ||
    p.name?.toLowerCase().includes('expert ia')
  );
  if (expertIA) {
    console.log(`[PromptSelect] Expert IA partner detected: ${expertIA.name}`);
    return "transcription_avec_expert_ia";
  }
  
  // 2. Check for referent/apporteur partner
  const referent = linkedPartners.find(p => 
    p.partner_type === 'referent' || 
    p.partner_type === 'apporteur' ||
    p.partner_type === 'revendeur'
  );
  if (referent) {
    console.log(`[PromptSelect] Referent partner detected: ${referent.name}`);
    return "transcription_avec_referent";
  }
  
  // 3. Check for support tags
  const supportTags = ['support', 'assistance', 'ticket', 'bug', 'incident'];
  const hasSupport = tags.some(t => supportTags.includes(t.toLowerCase()));
  if (hasSupport) {
    console.log(`[PromptSelect] Support context detected via tags`);
    return "transcription_support_client";
  }
  
  // 4. Project linked → project meeting
  if (job.project_id) {
    console.log(`[PromptSelect] Project context: ${job.project_id}`);
    return "transcription_reunion_projet";
  }
  
  // 5. Lead linked → commercial RDV
  if (job.lead_id) {
    console.log(`[PromptSelect] Lead context: ${job.lead_id}`);
    return "transcription_rdv_commercial";
  }
  
  // 6. No lead/project → internal meeting
  console.log(`[PromptSelect] No entity linked, using internal meeting prompt`);
  return "transcription_interne";
}

/**
 * Load partners linked to a transcription job
 */
// deno-lint-ignore no-explicit-any
async function loadLinkedPartners(supabase: any, transcriptionId: string): Promise<LinkedPartner[]> {
  try {
    const { data, error } = await supabase
      .from("transcription_partners")
      .select("partner_id, partners(id, name, partner_type)")
      .eq("transcription_id", transcriptionId);
    
    if (error) {
      console.log(`[Partners] No partners table or error: ${error.message}`);
      return [];
    }
    
    // deno-lint-ignore no-explicit-any
    return (data || []).map((row: any) => row.partners).filter(Boolean);
  } catch {
    // Table may not exist yet
    return [];
  }
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
async function loadPromptProfile(
  supabase: any, 
  prompt_profile_id: string | null, 
  job?: VoiceJob,
  transcriptionId?: string
) {
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
    // 2) Auto-select based on context (lead/project/partners)
    // Load linked partners for smarter prompt selection
    const linkedPartners = transcriptionId 
      ? await loadLinkedPartners(supabase, transcriptionId) 
      : [];
    
    // TODO: Load tags from transcription metadata if available
    const tags: string[] = [];
    
    const selectedSlug = job 
      ? selectTranscriptionPromptSlug(job, linkedPartners, tags) 
      : "transcription_rdv_commercial";

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
    console.warn("[Prompt] No prompts found - using hardcoded fallback v7.0");
    // Return hardcoded fallback prompt for transcription analysis
    return {
      id: 'fallback',
      slug: 'transcription_fallback_v7',
      system_prompt: getDefaultTranscriptionSystemPrompt(),
      user_prompt: getDefaultTranscriptionUserPrompt(),
      output_schema: getDefaultTranscriptionOutputSchema(),
      model_config: { model: 'google/gemini-2.5-flash' },
    };
  }

  const combinedSystem = [master?.system_prompt, secondary?.system_prompt]
    .filter(Boolean)
    .join("\n\n");

  // MERGE output schemas: base schema + v7.0 mandatory fields (detected_entities, financial_data, dates_mentioned)
  const baseSchema = secondary?.output_schema ?? {};
  const v7Schema = getDefaultTranscriptionOutputSchema();
  
  // Deep merge properties - ensure v7.0 critical fields are always present
  const mergedSchema = {
    type: "object",
    properties: {
      ...(baseSchema as any).properties,
      // Force v7.0 critical fields
      detected_entities: (v7Schema as any).properties.detected_entities,
      financial_data: (v7Schema as any).properties.financial_data,
      dates_mentioned: (v7Schema as any).properties.dates_mentioned,
      participants: (v7Schema as any).properties.participants,
    },
    required: [
      ...((baseSchema as any).required ?? []),
      "detected_entities", // Always require detected_entities for post-processing
    ],
  };

  // Keep user_prompt/output_schema/model_config from secondary (the specialized one)
  const out = {
    ...(secondary ?? master),
    system_prompt: combinedSystem,
    user_prompt: secondary?.user_prompt ?? getDefaultTranscriptionUserPrompt(),
    output_schema: mergedSchema,
    model_config: (secondary?.model_config ?? master?.model_config) ?? { model: 'google/gemini-2.5-flash' },
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
async function fetchRecentMemory(supabase: any, workspaceId: string, leadId?: string | null, projectId?: string | null): Promise<any[]> {
  try {
    // Fetch recent contextual memory from ai_agent_memory
    let query = supabase
      .from("ai_agent_memory")
      .select("memory_type, category, entity_type, entity_id, content, metadata, importance_score, created_at")
      .eq("workspace_id", workspaceId)
      .order("importance_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(15);
    
    // Filter by linked entities if available
    if (leadId) {
      query = query.or(`entity_id.eq.${leadId},entity_type.eq.lead`);
    }
    if (projectId) {
      query = query.or(`entity_id.eq.${projectId},entity_type.eq.project`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.warn("[Memory] Failed to fetch:", error.message?.slice(0, 100));
      return [];
    }
    
    console.log(`[Memory] Loaded ${data?.length ?? 0} memory entries`);
    return data ?? [];
  } catch (err) {
    logError("Memory", err);
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
  // deno-lint-ignore no-explicit-any
  let recentMemory: any[] = [];

  // Always fetch keyword aliases for normalization
  const aliasMap = await fetchKeywordAliases(supabase);

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

  // Fetch recent AI memory for this workspace/lead/project context
  recentMemory = await fetchRecentMemory(supabase, job.workspace_id, leadId, job.project_id);

  // NEW: Fetch existing CRM entities for matching (lightweight index)
  const existingEntities = await fetchExistingEntitiesIndex(supabase);

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
    aliasMap,
    recentMemory,
    existingEntities,
  };
}

// NEW: Fetch lightweight index of existing CRM entities for matching
// deno-lint-ignore no-explicit-any
async function fetchExistingEntitiesIndex(supabase: any): Promise<{
  leads: Array<{ id: string; name: string; company: string | null }>;
  projects: Array<{ id: string; name: string; slug: string }>;
  solutions: Array<{ id: string; title: string; slug: string }>;
  partners: Array<{ id: string; name: string; company: string | null; type: string }>;
}> {
  try {
    const [leadsRes, projectsRes, solutionsRes, partnersRes] = await Promise.all([
      supabase.from("leads").select("id, name, company").order("created_at", { ascending: false }).limit(100),
      supabase.from("projects").select("id, name, slug").order("created_at", { ascending: false }).limit(50),
      supabase.from("articles").select("id, title, slug").eq("resource_type", "solution").eq("published", true),
      supabase.from("partners").select("id, name, company, partner_type").is("deleted_at", null).limit(50),
    ]);

    const result = {
      leads: (leadsRes.data || []).map((l: any) => ({ id: l.id, name: l.name, company: l.company })),
      projects: (projectsRes.data || []).map((p: any) => ({ id: p.id, name: p.name, slug: p.slug })),
      solutions: (solutionsRes.data || []).map((s: any) => ({ id: s.id, title: s.title, slug: s.slug })),
      partners: (partnersRes.data || []).map((p: any) => ({ id: p.id, name: p.name, company: p.company, type: p.partner_type })),
    };

    console.log(`[Entities] Loaded index: ${result.leads.length} leads, ${result.projects.length} projects, ${result.solutions.length} solutions, ${result.partners.length} partners`);
    return result;
  } catch (err) {
    logError("EntitiesIndex", err);
    return { leads: [], projects: [], solutions: [], partners: [] };
  }
}

type EntityContext = Awaited<ReturnType<typeof fetchEntityContext>>;

function buildLLM(
  systemPrompt: string,
  userPrompt: string | null,
  transcriptText: string,
  ctx: EntityContext & { aliasMap?: Map<string, string>; recentMemory?: any[]; existingEntities?: any },
  schema: Record<string, unknown> | null,
  analysisContext: string | null
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

  // Format dictionary aliases for context
  const dictionaryContext = ctx.aliasMap && ctx.aliasMap.size > 0
    ? Array.from(ctx.aliasMap.entries()).slice(0, 50).map(([alias, canonical]) => ({
        alias,
        canonical,
      }))
    : [];

  // Format memory for context
  const memoryContext = ctx.recentMemory?.slice(0, 10).map(m => ({
    type: m.memory_type,
    category: m.category,
    content: m.content?.slice(0, 300),
    importance: m.importance_score,
    entity_type: m.entity_type,
  })) ?? [];

  // NEW: Format existing entities for CRM matching
  const existingEntitiesContext = ctx.existingEntities ? {
    leads: ctx.existingEntities.leads?.slice(0, 30).map((l: any) => ({
      id: l.id,
      name: l.name,
      company: l.company,
    })) ?? [],
    projects: ctx.existingEntities.projects?.slice(0, 20).map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
    })) ?? [],
    solutions: ctx.existingEntities.solutions?.map((s: any) => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
    })) ?? [],
    partners: ctx.existingEntities.partners?.slice(0, 20).map((p: any) => ({
      id: p.id,
      name: p.name,
      company: p.company,
      type: p.type,
    })) ?? [],
  } : { leads: [], projects: [], solutions: [], partners: [] };

  const payload = {
    transcript: transcriptText.slice(0, MAX_TRANSCRIPTION_CHARS),
    analysis_context: analysisContext ?? null,
    crm_context: {
      lead: ctx.lead,
      lead_contacts: leadContactsContext,
      project: ctx.project,
      solution: ctx.solution,
      recent_activity: ctx.activity?.slice(0, 10),
      open_tasks: ctx.tasks?.slice(0, 20),
    },
    // NEW: Existing entities for matching
    existing_entities: existingEntitiesContext,
    rag_context: {
      auto_detection_used: ctx.autoDetectionUsed ?? false,
      detected_solutions: detectedSolutionsContext,
    },
    dictionary_context: {
      aliases_count: ctx.aliasMap?.size ?? 0,
      sample_aliases: dictionaryContext,
    },
    memory_context: {
      entries_count: ctx.recentMemory?.length ?? 0,
      recent_memories: memoryContext,
    },
    output_schema: schema ?? null,
    rules: {
      json_only: true,
      no_hallucination: true,
      max_executive_summary_words: 200,
      // NEW: Explicit matching instructions
      entity_matching: "Compare mentions against existing_entities. If name/company matches (fuzzy OK), set action='link' with existing_id. If new, set action='create'. If unsure, set action='verify'.",
      date_normalization: "Convert ALL relative dates to absolute YYYY-MM-DD format based on today's date.",
      financial_capture: "Extract ALL monetary values mentioned, even estimates or ranges.",
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
// ============= ASSEMBLYAI-NATIVE ANALYSIS (v12.0) =============

/**
 * Map AssemblyAI entity_type to CRM entity type
 */
function mapAssemblyAIEntityType(aaiType: string): string {
  switch (aaiType) {
    case "person_name": return "person";
    case "organization": return "company";
    case "location": return "location";
    case "date": return "date";
    case "phone_number": return "phone";
    case "email_address": return "email";
    default: return aaiType;
  }
}

/**
 * Build base analysis from AssemblyAI native enriched data.
 * Returns null if no enriched data is available (fallback to full LLM).
 */
function buildBaseAnalysisFromAssemblyAI(segments: Record<string, unknown>): Record<string, unknown> | null {
  const chapters = segments.chapters as Array<{ summary: string; gist: string; headline: string; start: number; end: number }> | undefined;
  const sentiments = segments.sentiment_analysis as Array<{ sentiment: string; confidence: number; text: string }> | undefined;
  const entities = segments.entities as Array<{ entity_type: string; text: string; start: number; end: number }> | undefined;
  const utterances = segments.utterances as Array<{ speaker: string; text: string; start_ms: number; end_ms: number; confidence: number }> | undefined;
  const words = segments.words as Array<{ confidence: number }> | undefined;

  // Need at least chapters OR entities to build a useful base analysis
  if (!chapters?.length && !entities?.length) {
    return null;
  }

  // Title from first chapter headline
  const title = chapters?.[0]?.headline ?? null;

  // Executive summary from all chapter summaries
  const executive_summary = chapters?.map(c => c.summary).join(' ') ?? null;

  // Topics from chapter headlines
  const topics = chapters?.map(c => c.headline) ?? [];

  // Key points from chapter gists
  const key_points = chapters?.map(c => c.gist).filter(Boolean) ?? [];

  // Sentiment aggregate from AssemblyAI sentiment analysis
  let sentiment: string = "neutral";
  if (sentiments?.length) {
    const pos = sentiments.filter(s => s.sentiment === "POSITIVE").length;
    const neg = sentiments.filter(s => s.sentiment === "NEGATIVE").length;
    if (pos > neg * 1.5) sentiment = "positive";
    else if (neg > pos * 1.5) sentiment = "negative";
  }

  // Deduplicate entities by text (case-insensitive)
  const uniqueEntityNames = new Set<string>();
  const detected_entities = (entities ?? [])
    .filter(e => {
      const key = e.text.toLowerCase();
      if (uniqueEntityNames.has(key)) return false;
      uniqueEntityNames.add(key);
      return true;
    })
    .map(e => ({
      name: e.text,
      type: mapAssemblyAIEntityType(e.entity_type),
      confidence: 0.9,
      action: "verify" as const,
    }));

  // Participants from speaker diarization
  const speakers = utterances ? [...new Set(utterances.map(u => u.speaker))] : [];
  const participants = speakers.map(s => ({
    name: `Intervenant ${s}`,
    role: "participant",
  }));

  // Quality score from average word confidence
  const avgConfidence = words?.length
    ? words.reduce((sum, w) => sum + (w.confidence ?? 0), 0) / words.length
    : 0.85;

  return {
    title,
    executive_summary,
    topics,
    participants,
    key_points,
    sentiment,
    detected_entities,
    quality_score: Math.round(avgConfidence * 100),
    // Will be filled by minimal LLM call
    decisions: [],
    risks_blockers: [],
    questions_open: [],
    next_steps: [],
    action_items: [],
    financial_data: [],
    dates_mentioned: [],
    _source: "assemblyai_native",
  };
}

/**
 * Minimal CRM-matching system prompt (v12.0)
 * LLM only does CRM matching + action extraction, NOT summarization.
 */
function getCRMMatchingSystemPrompt(): string {
  return `# CRM Matching & Action Extraction v12.0

Tu reçois des données PRÉ-ANALYSÉES par AssemblyAI (chapitres, entités, sentiment).

## TA SEULE MISSION
1. **MATCHER les entités CRM** : Compare les noms/entreprises des champs assemblyai_entities et chapter_summaries avec existing_entities. Si match fuzzy → action="link" + existing_id=UUID exact. Si nouveau → "create". Si incertain → "verify".
2. **EXTRAIRE les actions** : Tâches à faire avec responsable (@Qui), deadline (YYYY-MM-DD), priorité.
3. **IDENTIFIER les décisions** prises.
4. **DÉTECTER les données financières** (montants, %).
5. **NORMALISER les dates** relatives → YYYY-MM-DD.
6. **IDENTIFIER risques/blocages et questions ouvertes.**
7. **ENRICHIR les participants** : Résoudre "Intervenant A/B/C" vers noms réels si identifiables.

## CE QUE TU NE FAIS PAS
- PAS de résumé (AssemblyAI l'a fait)
- PAS d'analyse de sentiment (AssemblyAI l'a fait)
- PAS de liste de sujets (AssemblyAI l'a fait)

## NORMALISATION PHONÉTIQUE
Utilise le dictionary_context pour normaliser les variations.

Retourne UNIQUEMENT un JSON valide.`;
}

function getCRMMatchingOutputSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      title_override: {
        type: "string",
        description: "Titre amélioré avec noms CRM résolus (max 80 chars). Null si le titre AssemblyAI est suffisant."
      },
      detected_entities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            type: { type: "string", enum: ["lead", "project", "solution", "partner", "company", "person"] },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            existing_id: { type: "string" },
            action: { type: "string", enum: ["link", "create", "verify"] }
          },
          required: ["name", "type", "confidence", "action"]
        }
      },
      participants_enriched: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            role: { type: "string" },
            company: { type: "string" },
            crm_match: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["lead", "partner"] },
                id: { type: "string" },
                confidence: { type: "number" }
              }
            }
          },
          required: ["name", "role"]
        }
      },
      action_items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            assignee: { type: "string" },
            due_date: { type: "string", description: "Format YYYY-MM-DD" },
            priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            linked_entity: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["lead", "project", "solution", "partner"] },
                id: { type: "string" },
                name: { type: "string" }
              }
            }
          },
          required: ["title", "assignee", "priority"]
        }
      },
      decisions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            content: { type: "string" },
            owner: { type: "string" },
            date_mentioned: { type: "string" }
          },
          required: ["content"]
        }
      },
      risks_blockers: { type: "array", items: { type: "string" } },
      questions_open: { type: "array", items: { type: "string" } },
      next_steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: { type: "string" },
            owner: { type: "string" },
            deadline: { type: "string", description: "Format YYYY-MM-DD" }
          },
          required: ["action"]
        }
      },
      financial_data: {
        type: "array",
        items: {
          type: "object",
          properties: {
            amount: { type: "number" },
            currency: { type: "string", default: "EUR" },
            context: { type: "string" }
          },
          required: ["amount", "context"]
        }
      },
      dates_mentioned: {
        type: "array",
        items: {
          type: "object",
          properties: {
            original: { type: "string" },
            normalized: { type: "string", description: "Format YYYY-MM-DD" },
            context: { type: "string" }
          },
          required: ["original", "normalized", "context"]
        }
      }
    },
    required: ["detected_entities", "action_items", "decisions"]
  };
}

// ============= DATE/TIME PARSING =============

// Validate that a date string represents a real date
function isValidDate(dateStr: string): boolean {
  const parsed = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(parsed.getTime())) return false;
  // Check that the parsed date matches the input (handles invalid dates like Feb 29 in non-leap years)
  const [year, month, day] = dateStr.split('-').map(Number);
  return parsed.getUTCFullYear() === year && 
         parsed.getUTCMonth() + 1 === month && 
         parsed.getUTCDate() === day;
}

function parseDueDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const normalized = dateStr.toLowerCase().trim();
  
  // ISO format YYYY-MM-DD - validate it's a real date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return isValidDate(dateStr) ? dateStr : null;
  }
  
  // French format DD/MM/YYYY or DD-MM-YYYY
  const frMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (frMatch) {
    const [, day, month, year] = frMatch;
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return isValidDate(isoDate) ? isoDate : null;
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

// ============= POST-PROCESSING: ENTITY LINKING & CASCADE =============

interface DetectedEntity {
  name: string;
  type: 'lead' | 'project' | 'solution' | 'partner' | 'company' | 'person';
  confidence: number;
  existing_id?: string;
  action: 'link' | 'create' | 'verify';
}

/**
 * Process detected entities from LLM output:
 * 1. Create entity_name_references for high-confidence matches
 * 2. Add new aliases to keyword_aliases with 'pending' status
 * 3. Mark linked parent entities as 'stale' for re-synthesis
 */
// deno-lint-ignore no-explicit-any
async function processDetectedEntities(
  supabase: any,
  transcriptionId: string,
  detectedEntities: DetectedEntity[],
  existingEntities: any
): Promise<{
  linked: number;
  pending_aliases: number;
  stale_marked: number;
}> {
  const stats = { linked: 0, pending_aliases: 0, stale_marked: 0 };
  
  if (!detectedEntities?.length) {
    console.log("[PostProcess] No detected_entities to process");
    return stats;
  }

  console.log(`[PostProcess] Processing ${detectedEntities.length} detected entities`);

  const entitiesToLink: Array<{
    source_entity_id: string;
    source_entity_type: string;
    target_entity_id: string;
    target_entity_type: string;
    confidence_score: number;
    detected_by: string;
    context: string;
  }> = [];

  const aliasesToCreate: Array<{
    alias: string;
    canonical_name: string;
    context_type: string;
    status: string;
    detected_count: number;
    first_detected_at: string;
  }> = [];

  const staleEntityIds: Set<string> = new Set();

  // UUID validation regex
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  for (const entity of detectedEntities) {
    if (!entity.name || !entity.type) continue;

    // Validate existing_id is a real UUID (ignore "Non spécifié", null, undefined)
    const hasValidUUID = entity.existing_id && UUID_REGEX.test(entity.existing_id);

    // HIGH CONFIDENCE LINKS (>=0.85) - accept both 'link' and 'verify' with valid UUID
    // This handles LLMs that use 'verify' conservatively even when they provide a valid UUID
    const shouldLink = hasValidUUID && entity.confidence >= 0.85 && 
      (entity.action === 'link' || entity.action === 'verify');
    
    if (shouldLink) {
      entitiesToLink.push({
        source_entity_id: transcriptionId,
        source_entity_type: 'voice_transcription',
        target_entity_id: entity.existing_id!,
        target_entity_type: entity.type,
        confidence_score: entity.confidence,
        detected_by: 'llm_auto',
        context: `Détecté: "${entity.name}"`,
      });

      // Mark target entity as stale for re-synthesis
      staleEntityIds.add(entity.existing_id!);
      stats.linked++;
    }
    // If action is 'link' but no valid UUID, treat as 'verify'
    else if (entity.action === 'link' && !hasValidUUID) {
      console.log(`[PostProcess] Entity "${entity.name}" has action=link but invalid existing_id, treating as verify`);
    }

    // NEW ENTITIES or LOW CONFIDENCE (without valid link) → Add to aliases for review
    // Skip if already linked (shouldLink was true)
    const shouldAddToAliases = !shouldLink && (
      entity.action === 'create' || 
      (entity.action === 'verify' && (!hasValidUUID || entity.confidence < 0.85))
    );
    if (shouldAddToAliases) {
      // Check if alias already exists
      const existingAlias = await supabase
        .from('keyword_aliases')
        .select('id, detected_count')
        .eq('alias', entity.name.toLowerCase())
        .maybeSingle();

      if (existingAlias.data) {
        // Increment detected_count
        await supabase
          .from('keyword_aliases')
          .update({ 
            detected_count: (existingAlias.data.detected_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAlias.data.id);
      } else {
        aliasesToCreate.push({
          alias: entity.name,
          canonical_name: entity.name, // Will be confirmed/corrected by user
          context_type: entity.type === 'company' ? 'client' : entity.type,
          status: 'pending',
          detected_count: 1,
          first_detected_at: new Date().toISOString(),
        });
        stats.pending_aliases++;
      }
    }
  }

  // Batch insert entity references
  if (entitiesToLink.length > 0) {
    const { error: refError } = await supabase
      .from('entity_name_references')
      .upsert(entitiesToLink, { 
        onConflict: 'source_entity_id,source_entity_type,target_entity_id,target_entity_type',
        ignoreDuplicates: true 
      });

    if (refError) {
      console.warn(`[PostProcess] Failed to insert entity_name_references: ${refError.message?.slice(0, 100)}`);
    } else {
      console.log(`[PostProcess] Created ${entitiesToLink.length} entity references`);
    }

    // Auto-populate transcription_partners for partner-type entities
    const partnerLinks = entitiesToLink
      .filter(e => e.target_entity_type === 'partner')
      .map(e => ({
        transcription_id: transcriptionId,
        partner_id: e.target_entity_id,
        context: e.context || null,
        created_at: new Date().toISOString(),
      }));

    if (partnerLinks.length > 0) {
      const { error: partnerError } = await supabase
        .from('transcription_partners')
        .upsert(partnerLinks, { 
          onConflict: 'transcription_id,partner_id',
          ignoreDuplicates: true 
        });

      if (partnerError) {
        console.warn(`[PostProcess] Failed to insert transcription_partners: ${partnerError.message?.slice(0, 100)}`);
      } else {
        console.log(`[PostProcess] Linked ${partnerLinks.length} partners to transcription`);
      }
    }
  }

  // Batch insert new aliases
  if (aliasesToCreate.length > 0) {
    const { error: aliasError } = await supabase
      .from('keyword_aliases')
      .insert(aliasesToCreate);

    if (aliasError) {
      console.warn(`[PostProcess] Failed to insert keyword_aliases: ${aliasError.message?.slice(0, 100)}`);
    } else {
      console.log(`[PostProcess] Created ${aliasesToCreate.length} pending aliases`);
    }
  }

  // Mark linked entities as stale for re-synthesis
  if (staleEntityIds.size > 0) {
    const staleIds = Array.from(staleEntityIds);
    
    // Mark leads as stale
    const leadIds = entitiesToLink.filter(e => e.target_entity_type === 'lead').map(e => e.target_entity_id);
    if (leadIds.length > 0) {
      await supabase.from('leads').update({ synthesis_stale: true }).in('id', leadIds);
      stats.stale_marked += leadIds.length;
    }

    // Mark projects as stale
    const projectIds = entitiesToLink.filter(e => e.target_entity_type === 'project').map(e => e.target_entity_id);
    if (projectIds.length > 0) {
      await supabase.from('projects').update({ synthesis_stale: true }).in('id', projectIds);
      stats.stale_marked += projectIds.length;
    }

    // Mark partners as stale
    const partnerIds = entitiesToLink.filter(e => e.target_entity_type === 'partner').map(e => e.target_entity_id);
    if (partnerIds.length > 0) {
      await supabase.from('partners').update({ synthesis_stale: true }).in('id', partnerIds);
      stats.stale_marked += partnerIds.length;
    }

    console.log(`[PostProcess] Marked ${stats.stale_marked} entities as stale`);
  }

  return stats;
}

// ============= TASK CREATION =============

const VALID_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
type TaskPriority = typeof VALID_PRIORITIES[number];

function validatePriority(raw: unknown): TaskPriority {
  const str = typeof raw === "string" ? raw.toLowerCase().trim() : "";
  if (VALID_PRIORITIES.includes(str as TaskPriority)) return str as TaskPriority;
  return "medium"; // Safe fallback
}

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
      priority: validatePriority(it?.priority as string),
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
  let forceRetranscribe = false;

  try {
    const body = await req.json();
    jobId = body.job_id;
    forceReanalyze = body?.force_reanalyze === true;
    forceRetranscribe = body?.force_retranscribe === true;
    // force_retranscribe implies force_reanalyze
    if (forceRetranscribe) forceReanalyze = true;

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
      console.log(`[Job] Force re-analyzing completed transcription ${jobId} (retranscribe=${forceRetranscribe})`);
    }

    console.log(`[Job] Processing ${jobId}`);

    // If raw transcript already exists, skip transcription and go straight to analysis.
    // UNLESS force_retranscribe is set — then re-submit audio to AssemblyAI for enriched data.
    // This covers:
    // - client-side chunking flow (pre_transcribed_text)
    // - retries where transcription already completed
    const existingRawTranscript = (job as Record<string, unknown>).raw_transcript as string | null;
    const aiMeta = vjob.ai_metadata ?? {};

    let rawText: string;
    let parsedSegments: Record<string, unknown> | null = null;

    if (existingRawTranscript && existingRawTranscript.trim().length > 0 && !forceRetranscribe) {
      console.log("[Process] Using existing raw_transcript (skip transcription)");
      rawText = existingRawTranscript;

      // Load enriched segments from DB if available (from previous AssemblyAI transcription)
      try {
        const segmentsRaw = (job as Record<string, unknown>).segments;
        if (segmentsRaw) {
          parsedSegments = typeof segmentsRaw === 'string' ? JSON.parse(segmentsRaw) : segmentsRaw as Record<string, unknown>;
          const hasChapters = Array.isArray((parsedSegments as any)?.chapters) && (parsedSegments as any).chapters.length > 0;
          console.log(`[Segments] Loaded from DB: chapters=${hasChapters}, entities=${Array.isArray((parsedSegments as any)?.entities) ? (parsedSegments as any).entities.length : 0}`);
        }
      } catch { /* segments not available or not parseable */ }

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

      // parsedSegments already loaded from DB above (lines 1779-1784)
      // No need to reassign — they are ready for the AssemblyAI-first analysis flow
    } else {
      // Need to transcribe the audio via AssemblyAI
      if (!ASSEMBLYAI_API_KEY) {
        throw new Error("assemblyai_api_key_not_configured: ASSEMBLYAI_API_KEY is required");
      }

      await supabase.from("voice_transcriptions").update({ 
        status: "transcribing",
        ai_metadata: {
          ...aiMeta,
          transcription_started_at: new Date().toISOString(),
        }
      }).eq("id", jobId);

      // Get signed URL for audio - detect bucket from path prefix
      const storagePath = vjob.storage_path;
      const isTelegramAudio = storagePath.startsWith("telegram-audio/");
      const bucket = isTelegramAudio ? "cockpit-uploads" : "voice-transcriptions";
      
      console.log(`[Audio] Using bucket: ${bucket}, path: ${storagePath}`);
      
      const { data: signed, error: signErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 600);
      
      if (signErr || !signed?.signedUrl) {
        throw new Error(`signed_url_failed: ${signErr?.message ?? "no_url"}`);
      }

      // Fetch audio metadata
      const headRes = await fetch(signed.signedUrl, { method: "HEAD" });
      const contentLength = headRes.headers.get("content-length");
      const sizeBytes = contentLength ? Number(contentLength) : null;
      const fileSizeMB = typeof sizeBytes === "number" && !Number.isNaN(sizeBytes) ? sizeBytes / 1024 / 1024 : null;

      console.log(`[Audio] size=${fileSizeMB ? fileSizeMB.toFixed(2) + " MB" : "unknown"}`);

      // AssemblyAI can handle files up to ~2GB, safety cap for extreme files
      // Just a safety cap for extreme files
      const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
      if (typeof sizeBytes === "number" && sizeBytes > MAX_FILE_SIZE) {
        console.error(`[REJECTED] File too large: ${fileSizeMB?.toFixed(2)} MB`);
        await supabase.from("voice_transcriptions").update({
          status: "error",
          ai_metadata: {
            ...aiMeta,
            error_code: "file_too_large",
            error_message: `Fichier trop volumineux (${fileSizeMB?.toFixed(1)} MB). Limite: 500 MB.`,
            rejected_at: new Date().toISOString(),
          },
        }).eq("id", jobId);

        return new Response(JSON.stringify({
          ok: false,
          error: "file_too_large",
          message: `Fichier audio trop volumineux. Maximum: 500 MB.`,
        }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Load custom vocabulary for this workspace
      let wordBoost: string[] = [];
      try {
        const { data: aliases } = await supabase
          .from("keyword_aliases")
          .select("canonical_name")
          .eq("is_active", true)
          .limit(100);
        if (aliases?.length) {
          wordBoost = aliases.map((a: any) => a.canonical_name).filter(Boolean);
          console.log(`[Vocabulary] Loaded ${wordBoost.length} custom terms for word boost`);
        }
      } catch { /* non-blocking */ }

      // AssemblyAI: all features enabled (v11.0)
      console.log(`[AssemblyAI] Transcribing with ALL features enabled (best model, auto-lang, sentiment, entities, chapters, safety)...`);
      const options = getDefaultTranscriptionOptions({
        word_boost: wordBoost.length > 0 ? wordBoost : undefined,
        maxWaitMs: ASSEMBLYAI_MAX_WAIT_MS,
      });
      
      const transcriptionResult: AssemblyAIFullResult = await transcribeFromUrl(
        signed.signedUrl,
        ASSEMBLYAI_API_KEY,
        options
      );

      rawText = transcriptionResult.text;

      // Format transcript with speaker labels if utterances are available
      let speakerFormattedText: string | null = null;
      const utterances = transcriptionResult.utterances;
      
      if (utterances && utterances.length > 0) {
        const uniqueSpeakers = [...new Set(utterances.map(u => u.speaker))];
        console.log(`[Diarization] ${utterances.length} utterances, ${uniqueSpeakers.length} speakers detected`);
        
        speakerFormattedText = utterances
          .map(u => `[Intervenant ${u.speaker}] ${u.text}`)
          .join('\n');
      }

      // Build enriched metadata from all AssemblyAI features
      const assemblyaiEnrichedData: Record<string, unknown> = {
        source: "assemblyai",
        speech_model: "best",
        transcribed_at: new Date().toISOString(),
        audio_duration_s: transcriptionResult.audio_duration,
        language_detected: transcriptionResult.language_code,
        speaker_diarization: !!(utterances && utterances.length > 0),
        speakers_count: utterances ? [...new Set(utterances.map(u => u.speaker))].length : 0,
        // Sentiment Analysis summary
        sentiment_summary: transcriptionResult.sentiment_analysis_results?.length
          ? {
              total: transcriptionResult.sentiment_analysis_results.length,
              positive: transcriptionResult.sentiment_analysis_results.filter(s => s.sentiment === "POSITIVE").length,
              negative: transcriptionResult.sentiment_analysis_results.filter(s => s.sentiment === "NEGATIVE").length,
              neutral: transcriptionResult.sentiment_analysis_results.filter(s => s.sentiment === "NEUTRAL").length,
            }
          : null,
        // Entity Detection summary
        entities_detected: transcriptionResult.entities?.length
          ? {
              total: transcriptionResult.entities.length,
              types: [...new Set(transcriptionResult.entities.map(e => e.entity_type))],
            }
          : null,
        // Auto Chapters count
        chapters_count: transcriptionResult.chapters?.length ?? 0,
        // Content Safety summary
        content_safety_summary: transcriptionResult.content_safety_labels?.summary ?? null,
        // Custom vocabulary used
        word_boost_count: wordBoost.length,
        // Features enabled
        features_enabled: ["best_model", "auto_language", "speaker_labels", "sentiment_analysis", "entity_detection", "auto_chapters", "content_safety", "word_boost"],
      };

      // Store enriched AssemblyAI data as a structured JSON field in segments
      const enrichedSegments: Record<string, unknown> = {
        utterances: utterances?.map(u => ({
          speaker: u.speaker,
          text: u.text,
          start_ms: u.start,
          end_ms: u.end,
          confidence: u.confidence,
        })) ?? [],
        words: transcriptionResult.words?.map(w => ({
          text: w.text,
          start_ms: w.start,
          end_ms: w.end,
          confidence: w.confidence,
          speaker: w.speaker,
        })) ?? [],
        sentiment_analysis: transcriptionResult.sentiment_analysis_results ?? [],
        entities: transcriptionResult.entities ?? [],
        chapters: transcriptionResult.chapters ?? [],
        content_safety: transcriptionResult.content_safety_labels ?? null,
      };

      // Update with full transcription result
      await supabase
        .from("voice_transcriptions")
        .update({
          raw_transcript: rawText,
          segments: JSON.stringify(enrichedSegments),
          status: "analyzing",
          duration_seconds: transcriptionResult.audio_duration,
          ai_metadata: {
            ...aiMeta,
            ...assemblyaiEnrichedData,
          },
        })
        .eq("id", jobId);

      // Use speaker-formatted text for LLM analysis if available (richer context)
      if (speakerFormattedText) {
        rawText = speakerFormattedText;
      }

      // ===== 2-PHASE ARCHITECTURE =====
      // If this was a force_retranscribe call, the transcription phase is now complete.
      // To avoid 504 timeouts, we return immediately and self-invoke for the analysis phase.
      if (forceRetranscribe) {
        console.log(`[2-Phase] Transcription complete. Self-invoking for analysis phase...`);
        
        // Fire-and-forget: self-invoke for analysis
        const selfUrl = `${SUPABASE_URL}/functions/v1/process-voice-transcription`;
        fetch(selfUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            job_id: jobId,
            force_reanalyze: true,
            // NOT force_retranscribe — we just did that
          }),
        }).catch(e => console.error(`[2-Phase] Self-invoke failed: ${e}`));

        return new Response(JSON.stringify({
          ok: true,
          phase: "transcription_complete",
          message: "Transcription AssemblyAI terminée. Analyse en cours...",
          job: { id: jobId, status: "analyzing" },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    logPreview("Transcription", rawText);

    // Note: raw_transcript update is now handled in the transcription branches above

    // Context + RAG
    const ctx = await fetchEntityContext(supabase, vjob, rawText);
    console.log(`[Context] lead=${ctx.leadId}, project=${ctx.project?.id ?? null}, rag=${ctx.autoDetectionUsed}`);

    // ============= ANALYSIS: AssemblyAI-first or Legacy LLM =============
    const analysisContext = (job as Record<string, unknown>).analysis_context as string | null;
    const baseAnalysis = parsedSegments ? buildBaseAnalysisFromAssemblyAI(parsedSegments) : null;

    let summary: Record<string, unknown>;
    let provider: LLMProvider = "lovable";
    let modelId = "google/gemini-2.5-flash";
    let supportsTools = true;
    let resolvedLLMModelId: string | null = null;
    let fastPipelineUsed = false;
    let chunkedProcessing = false;

    if (baseAnalysis) {
      // ===== NEW FLOW v12.0: AssemblyAI-first, minimal LLM =====
      console.log(`[v12.0] AssemblyAI-first flow: chapters=${(parsedSegments as any)?.chapters?.length ?? 0}, entities=${(parsedSegments as any)?.entities?.length ?? 0}`);

      // Build condensed CRM matching input (much smaller than full transcript)
      const chapterSummaries = ((parsedSegments as any)?.chapters ?? [])
        .map((c: any) => `[${c.headline}] ${c.summary}`)
        .join('\n');
      const assemblyEntities = ((parsedSegments as any)?.entities ?? [])
        .map((e: any) => `${e.entity_type}: ${e.text}`)
        .join(', ');

      // Dictionary context for normalization
      const dictionaryContext = ctx.aliasMap && ctx.aliasMap.size > 0
        ? Array.from(ctx.aliasMap.entries()).slice(0, 50).map(([alias, canonical]) => ({ alias, canonical }))
        : [];

      const crmInput = {
        chapter_summaries: chapterSummaries,
        assemblyai_entities: assemblyEntities,
        existing_entities: {
          leads: ctx.existingEntities?.leads?.slice(0, 30) ?? [],
          projects: ctx.existingEntities?.projects?.slice(0, 20) ?? [],
          solutions: ctx.existingEntities?.solutions ?? [],
          partners: ctx.existingEntities?.partners?.slice(0, 20) ?? [],
        },
        crm_context: {
          lead: ctx.lead ? { id: ctx.lead.id, name: ctx.lead.name, company: ctx.lead.company } : null,
          project: ctx.project ? { id: ctx.project.id, name: ctx.project.name } : null,
        },
        // Include transcript excerpt for action items extraction (decisions, dates, etc.)
        transcript_excerpt: rawText.slice(0, 10000),
        analysis_context: analysisContext,
        dictionary_context: dictionaryContext,
        today_date: new Date().toISOString().split('T')[0],
      };

      // Mark as analyzing
      await supabase
        .from("voice_transcriptions")
        .update({
          ai_metadata: {
            ...(vjob.ai_metadata ?? {}),
            llm_call_started_at: new Date().toISOString(),
            llm_model: `${provider}/${modelId}`,
            analysis_mode: "assemblyai_first_v12",
            assemblyai_chapters: (parsedSegments as any)?.chapters?.length ?? 0,
            assemblyai_entities: (parsedSegments as any)?.entities?.length ?? 0,
            analysis_context_used: !!(analysisContext && analysisContext.trim()),
          },
        })
        .eq("id", jobId);

      try {
        const crmResult = await callLLM(
          provider, modelId,
          getCRMMatchingSystemPrompt(),
          JSON.stringify(crmInput),
          getCRMMatchingOutputSchema(),
          supportsTools
        );

        // Merge: AssemblyAI base + LLM CRM enrichment
        summary = {
          ...baseAnalysis,
          // Override with LLM results (CRM-specific fields)
          detected_entities: crmResult.detected_entities ?? baseAnalysis.detected_entities,
          action_items: crmResult.action_items ?? [],
          decisions: crmResult.decisions ?? [],
          risks_blockers: crmResult.risks_blockers ?? [],
          questions_open: crmResult.questions_open ?? [],
          next_steps: crmResult.next_steps ?? [],
          financial_data: crmResult.financial_data ?? [],
          dates_mentioned: crmResult.dates_mentioned ?? [],
          // Title: use LLM override if available, otherwise AssemblyAI
          title: (crmResult.title_override as string) || baseAnalysis.title,
          // Keep AssemblyAI native data (NOT overridden by LLM)
          executive_summary: baseAnalysis.executive_summary,
          topics: baseAnalysis.topics,
          key_points: baseAnalysis.key_points,
          sentiment: baseAnalysis.sentiment,
          quality_score: baseAnalysis.quality_score,
          // Enrich participants if LLM resolved speaker identities
          participants: (crmResult.participants_enriched as any[])?.length
            ? crmResult.participants_enriched
            : baseAnalysis.participants,
          _analysis_sources: ["assemblyai_native", "llm_crm_matching"],
        };

        console.log(`[v12.0] Merged: AssemblyAI base + LLM CRM matching. Entities: ${(summary.detected_entities as any[])?.length ?? 0}, Actions: ${(summary.action_items as any[])?.length ?? 0}`);
      } catch (llmErr) {
        // LLM failed but we still have AssemblyAI data - use base analysis
        const llmErrMsg = llmErr instanceof Error ? llmErr.message : String(llmErr);
        console.warn(`[v12.0] LLM CRM matching failed, using AssemblyAI-only: ${llmErrMsg.slice(0, 200)}`);
        summary = {
          ...baseAnalysis,
          _analysis_sources: ["assemblyai_native_only"],
          _llm_error: llmErrMsg.slice(0, 500),
        };
      }
    } else {
      // ===== LEGACY FLOW: Full LLM analysis (no AssemblyAI enriched data) =====
      console.log(`[Legacy] No AssemblyAI enriched data available, using full LLM analysis`);

      const profile = await loadPromptProfile(supabase, vjob.prompt_profile_id, vjob, jobId);
      const systemPrompt = profile?.system_prompt ?? "Return JSON only.";
      const userPrompt = profile?.user_prompt ?? null;
      const outputSchema = profile?.output_schema ?? null;

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

      // Long transcript chunking (legacy - needed without AssemblyAI chapters)
      const isLongTranscript = rawText.length > MAX_TRANSCRIPTION_CHARS;
      let analysisText = rawText;

      if (isLongTranscript) {
        fastPipelineUsed = true;
        console.log(`[LongTranscript] Detected: ${rawText.length} chars (>${MAX_TRANSCRIPTION_CHARS}). Using chunked compression.`);
        provider = "lovable";
        modelId = "google/gemini-2.5-flash";
        supportsTools = true;
        resolvedLLMModelId = null;

        const chunks: string[] = [];
        let remaining = rawText;
        while (remaining.length > 0 && chunks.length < MAX_CHUNKS) {
          let splitPoint = Math.min(CHUNK_SIZE_CHARS, remaining.length);
          if (remaining.length > CHUNK_SIZE_CHARS) {
            const searchStart = Math.max(0, CHUNK_SIZE_CHARS - 500);
            const searchArea = remaining.slice(searchStart, CHUNK_SIZE_CHARS);
            const lastSentenceEnd = Math.max(
              searchArea.lastIndexOf('. '), searchArea.lastIndexOf('! '),
              searchArea.lastIndexOf('? '), searchArea.lastIndexOf('.\n'),
              searchArea.lastIndexOf('!\n'), searchArea.lastIndexOf('?\n')
            );
            if (lastSentenceEnd > 0) splitPoint = searchStart + lastSentenceEnd + 2;
          }
          chunks.push(remaining.slice(0, splitPoint));
          remaining = remaining.slice(splitPoint).trim();
        }

        console.log(`[LongTranscript] Split into ${chunks.length} chunks`);

        if (chunks.length > 1) {
          chunkedProcessing = true;
          const chunkSummaries: string[] = [];
          const compressionSchema: Record<string, unknown> = {
            type: "object",
            properties: {
              chunk_summary: { type: "string" },
              participants_mentioned: { type: "array", items: { type: "string" } },
              key_facts: { type: "array", items: { type: "string" } },
            },
            required: ["chunk_summary", "participants_mentioned", "key_facts"],
            additionalProperties: false,
          };
          const compressionSys = `Tu es un expert en prise de notes. Résume fidèlement UN SEGMENT d'une conversation plus longue.\nRÈGLES: ZÉRO invention, préserve noms/montants/dates, ce segment fait partie de ${chunks.length} au total.`;

          for (let i = 0; i < chunks.length; i++) {
            const chunkUsr = `## Segment ${i + 1}/${chunks.length}\n${chunks[i]}`;
            try {
              console.log(`[LongTranscript] Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
              const compressed = await callLLM("lovable", "google/gemini-2.5-flash", compressionSys, chunkUsr, compressionSchema, true);
              const chunkResult = compressed as { chunk_summary?: string; participants_mentioned?: string[]; key_facts?: string[] };
              if (chunkResult.chunk_summary) {
                let chunkSummary = `### Segment ${i + 1}\n${chunkResult.chunk_summary}`;
                if (chunkResult.participants_mentioned?.length) chunkSummary += `\n**Personnes:** ${chunkResult.participants_mentioned.join(', ')}`;
                if (chunkResult.key_facts?.length) chunkSummary += `\n**Faits clés:** ${chunkResult.key_facts.join(' | ')}`;
                chunkSummaries.push(chunkSummary);
              }
            } catch (chunkErr) {
              logError(`Chunk_${i}`, chunkErr);
              chunkSummaries.push(`### Segment ${i + 1} (non compressé)\n${chunks[i].slice(0, 2000)}...`);
            }
          }
          analysisText = chunkSummaries.join('\n\n---\n\n');
          console.log(`[LongTranscript] Merged ${chunkSummaries.length} chunk summaries (${analysisText.length} chars)`);
        } else {
          // Single long chunk - truncate
          analysisText = rawText.slice(0, MAX_TRANSCRIPTION_CHARS) + "\n[...TRUNCATED...]";
        }
      }

      const { sys, usr } = buildLLM(systemPrompt, userPrompt, analysisText, ctx, outputSchema as Record<string, unknown> | null, analysisContext);

      await supabase
        .from("voice_transcriptions")
        .update({
          ai_metadata: {
            ...(vjob.ai_metadata ?? {}),
            llm_call_started_at: new Date().toISOString(),
            llm_model: `${provider}/${modelId}`,
            analysis_mode: "legacy_full_llm",
            fast_pipeline: fastPipelineUsed,
            chunked_processing: chunkedProcessing,
            original_transcript_length: rawText.length,
            compressed_text_length: analysisText.length,
            analysis_context_used: !!(analysisContext && analysisContext.trim()),
          },
        })
        .eq("id", jobId);

      try {
        summary = await callLLM(provider, modelId, sys, usr, outputSchema as Record<string, unknown> | null, supportsTools);
      } catch (llmErr) {
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
              fast_pipeline: fastPipelineUsed,
            },
          })
          .eq("id", jobId);
        throw llmErr;
      }
    }

    // Tasks
    const createdTasks = await createTasksFromActions(supabase, vjob, summary, ctx.leadId);

    // POST-PROCESSING: Entity linking & cascade (Phase 2/3)
    let entityProcessingStats = { linked: 0, pending_aliases: 0, stale_marked: 0 };
    try {
      const detectedEntities = summary.detected_entities as DetectedEntity[] | undefined;
      if (detectedEntities?.length) {
        entityProcessingStats = await processDetectedEntities(
          supabase,
          jobId!,
          detectedEntities,
          ctx.existingEntities
        );
        console.log(`[PostProcess] Entity processing: linked=${entityProcessingStats.linked}, pending=${entityProcessingStats.pending_aliases}, stale=${entityProcessingStats.stale_marked}`);
      }
    } catch (postErr) {
      // Non-blocking - don't fail transcription if post-processing fails
      console.warn(`[PostProcess] Entity processing failed: ${(postErr as Error)?.message?.slice(0, 200)}`);
    }

    // Activity log
    const llmModelFullName = `${provider}/${modelId}`;
    await supabase.from("activity_log").insert({
      workspace_id: vjob.workspace_id,
      entity_type: "voice_transcription",
      entity_id: vjob.id,
      activity_type: "transcription_completed",
      content: `Transcription générée (${createdTasks.length} tâche(s), ${entityProcessingStats.linked} entités liées)`,
      lead_id: ctx.leadId,
      project_id: vjob.project_id,
      created_by: vjob.created_by,
      ai_metadata: {
        stt_model: "assemblyai",
        llm_model: llmModelFullName,
        llm_provider: provider,
        entity_linking: entityProcessingStats,
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

    // Extract title from LLM summary if available (fixes missing title bug)
    // Priority: explicit title field > truncated summary (first sentence, max 100 chars)
    const summaryObj = summary as Record<string, unknown>;
    let extractedTitle: string | undefined;
    
    // Check if there's an explicit 'title' field in the summary
    if (summaryObj.title && typeof summaryObj.title === 'string' && summaryObj.title.trim()) {
      extractedTitle = summaryObj.title.trim().slice(0, 100);
    } 
    // Otherwise, extract first sentence from executive_summary (max 100 chars)
    else if (summaryObj.executive_summary && typeof summaryObj.executive_summary === 'string' && summaryObj.executive_summary.trim()) {
      const fullSummary = summaryObj.executive_summary.trim();
      // Get first sentence (up to first period, question mark, or exclamation)
      const firstSentenceMatch = fullSummary.match(/^[^.!?]+[.!?]?/);
      const firstSentence = firstSentenceMatch ? firstSentenceMatch[0].trim() : fullSummary;
      // Truncate to 100 chars, adding ellipsis if needed
      extractedTitle = firstSentence.length > 100 
        ? firstSentence.slice(0, 97) + '...' 
        : firstSentence;
    }
    
    const titleUpdate = extractedTitle ? { title: extractedTitle } : {};

    await supabase
      .from("voice_transcriptions")
      .update({
        ...titleUpdate,
        summary,
        status: "done",
        llm_model_id: resolvedLLMModelId,
        ai_metadata: {
          ...(vjob.ai_metadata ?? {}),
          llm_model: llmModelFullName,
          llm_provider: provider,
          ...ragMetadata,
          entity_linking: entityProcessingStats,
          completed_at: new Date().toISOString(),
        },
      })
      .eq("id", jobId);

    console.log(`[Job] ${jobId} completed`);

    // Trigger entity extraction to enrich dictionary (fire-and-forget)
    try {
      console.log(`[PostProcess] Triggering extract-entities for transcription ${jobId}`);
      fetch(`${SUPABASE_URL}/functions/v1/extract-entities`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "scan_entity",
          entity_type: "voice_transcription",
          entity_id: jobId,
        }),
      }).then(res => {
        if (res.ok) {
          console.log(`[PostProcess] extract-entities triggered successfully`);
        } else {
          console.warn(`[PostProcess] extract-entities returned ${res.status}`);
        }
      }).catch(err => {
        console.warn(`[PostProcess] extract-entities failed:`, err?.message?.slice(0, 100));
      });
    } catch (extractErr) {
      // Non-blocking - don't fail the transcription if entity extraction fails
      console.warn("[PostProcess] Failed to trigger extract-entities:", extractErr);
    }

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

    const isExpected = errMsg.includes("LLM_TIMEOUT") || errMsg.includes("ASSEMBLYAI_TIMEOUT") || errMsg.includes("rate_limited") || errMsg.includes("credits_exhausted");
    const code = errMsg.includes("LLM_TIMEOUT")
      ? "LLM_TIMEOUT"
      : errMsg.includes("ASSEMBLYAI_TIMEOUT")
        ? "ASSEMBLYAI_TIMEOUT"
        : errMsg.includes("rate_limited")
          ? "rate_limited"
          : errMsg.includes("credits_exhausted")
            ? "credits_exhausted"
            : "process_failed";

    return new Response(JSON.stringify({ ok: false, error: code, message: errMsg.slice(0, 500) }), {
      status: isExpected ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
