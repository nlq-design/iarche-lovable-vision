import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callLLMWithFallback } from "../_shared/ai-legacy-bridge.ts";
import { startTranscription, getDefaultTranscriptionOptions, type AssemblyAIFullResult } from "../_shared/assemblyai-utils.ts";

/**
 * process-voice-transcription v13.0 — Clean Rewrite
 * 
 * 2-phase pipeline:
 *   Phase 1: AssemblyAI transcription (all features)
 *   Phase 2: LLM analysis (executive summary + CRM matching)
 * 
 * Supports:
 *   - force_retranscribe: re-send audio to AssemblyAI
 *   - force_reanalyze: re-run LLM on existing transcript
 *   - _no_file records: LLM-only (no audio)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");

const LLM_TIMEOUT_MS = 90_000;
// ASSEMBLYAI_MAX_WAIT_MS removed — async architecture, worker polls instead
const MAX_TRANSCRIPT_FOR_LLM = 25_000;

// ============= HELPERS =============

function log(tag: string, msg: string) { console.log(`[${tag}] ${msg}`); }
function logErr(tag: string, err: unknown) { console.error(`[${tag}] ${err instanceof Error ? err.message : String(err)}`); }

// ============= JSON EXTRACTION =============

function extractJson(raw: string): Record<string, unknown> {
  const s = raw.trim();
  // Direct parse
  try { return JSON.parse(s); } catch { /* continue */ }
  // Strip markdown fences
  const fenceMatch = s.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) try { return JSON.parse(fenceMatch[1].trim()); } catch { /* continue */ }
  // Extract between outer braces
  const first = s.indexOf("{"), last = s.lastIndexOf("}");
  if (first !== -1 && last > first) {
    const candidate = s.slice(first, last + 1);
    try { return JSON.parse(candidate); } catch { /* continue */ }
    // Minimal repair: trailing commas, control chars
    const repaired = candidate
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[\x00-\x1F\x7F]/g, " ");
    try { return JSON.parse(repaired); } catch { /* continue */ }
  }
  console.warn("[JSON] parse_failed, returning fallback");
  return { _parse_fallback: true, raw_text: s.slice(0, 3000) };
}

// ============= ASSEMBLYAI DATA EXTRACTION =============

function formatSpeakerTranscript(result: AssemblyAIFullResult): string {
  if (result.utterances?.length) {
    return result.utterances
      .map(u => `[Intervenant ${u.speaker}] ${u.text}`)
      .join('\n');
  }
  return result.text;
}

function buildSegmentsData(result: AssemblyAIFullResult): Record<string, unknown> {
  return {
    words: result.words?.slice(0, 500), // Keep first 500 for UI timeline
    utterances: result.utterances?.map(u => ({
      speaker: u.speaker, text: u.text,
      start_ms: u.start, end_ms: u.end, confidence: u.confidence,
    })),
    sentiment_analysis: result.sentiment_analysis_results?.map(s => ({
      sentiment: s.sentiment, confidence: s.confidence, text: s.text,
      start: s.start, end: s.end, speaker: s.speaker,
    })),
    entities: result.entities?.map(e => ({
      entity_type: e.entity_type, text: e.text, start: e.start, end: e.end,
    })),
    chapters: result.chapters?.map(c => ({
      summary: c.summary, gist: c.gist, headline: c.headline,
      start: c.start, end: c.end,
    })),
    content_safety_labels: result.content_safety_labels,
  };
}

function buildAssemblyAIMetadata(result: AssemblyAIFullResult): Record<string, unknown> {
  const sentiments = result.sentiment_analysis_results;
  return {
    source: "assemblyai",
    speech_model: "best",
    transcribed_at: new Date().toISOString(),
    audio_duration_s: result.audio_duration,
    language_detected: result.language_code,
    speakers_count: result.utterances
      ? [...new Set(result.utterances.map(u => u.speaker))].length
      : 0,
    chapters_count: result.chapters?.length ?? 0,
    entities_count: result.entities?.length ?? 0,
    sentiment_summary: sentiments?.length ? {
      total: sentiments.length,
      positive: sentiments.filter(s => s.sentiment === "POSITIVE").length,
      negative: sentiments.filter(s => s.sentiment === "NEGATIVE").length,
      neutral: sentiments.filter(s => s.sentiment === "NEUTRAL").length,
    } : null,
  };
}

// ============= LLM ANALYSIS =============

function getAnalysisSystemPrompt(): string {
  return `# Analyse de Transcription Audio v13.0

Tu es un analyste expert pour IArche (conseil IA B2B). Tu reçois une transcription audio et des données contextuelles.

## TES MISSIONS (TOUTES OBLIGATOIRES)

### 1. RÉSUMÉ EXÉCUTIF
Fournis un executive_summary de 3-5 phrases synthétisant le contenu. C'est le texte d'aperçu dans l'interface. OBLIGATOIRE.

### 2. POINTS CLÉS & SUJETS
- key_points: 3-8 points importants à retenir
- topics: 2-5 sujets/thèmes abordés

### 3. MATCHING CRM
Compare les noms/entreprises mentionnés avec existing_entities.
- Match trouvé → action: "link" + existing_id = UUID exact
- Nouveau → action: "create"  
- Incertain → action: "verify"

### 4. ACTIONS & DÉCISIONS
- action_items: tâches avec responsable, deadline (YYYY-MM-DD), priorité
- decisions: décisions prises avec responsable
- next_steps: prochaines étapes

### 5. DONNÉES STRUCTURÉES
- financial_data: tous les montants mentionnés
- dates_mentioned: dates relatives → YYYY-MM-DD absolu
- risks_blockers: risques et blocages identifiés
- questions_open: questions en suspens

### 6. PARTICIPANTS
Résous "Intervenant A/B/C" vers noms réels si identifiables via le contexte CRM.

### 7. PARTICIPANTS CONFIRMÉS (PRIORITAIRE)
Si confirmed_participants est fourni, ce sont les noms validés par l'humain. Tu DOIS utiliser EXACTEMENT ces noms dans TOUT le texte (executive_summary, key_points, action_items, decisions, etc.). Ne jamais inventer d'autres noms pour ces personnes. Ne jamais utiliser un nom complet si l'alias confirmé est différent (ex: si "NLQ" est confirmé, utiliser "NLQ" partout, pas "Nicolas Larazda").

## NORMALISATION PHONÉTIQUE
Utilise dictionary_context pour normaliser les variations (ex: "bérécos" → "Beerecos").

## RÈGLES
- RÉPONDS TOUJOURS EN FRANÇAIS. Tous les champs textuels (executive_summary, key_points, topics, decisions, action_items, risks_blockers, questions_open, next_steps, financial_data.context, dates_mentioned.context) DOIVENT être rédigés en français, même si la transcription est en anglais ou multilingue.
- ZÉRO invention, ZÉRO hallucination
- Préserve TOUS les montants, dates, noms propres (garder les noms propres dans leur langue d'origine)
- Retourne UNIQUEMENT un JSON valide selon le schéma`;
}

function getAnalysisOutputSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      title: { type: "string", description: "Titre court (max 80 chars)" },
      executive_summary: { type: "string", description: "Résumé exécutif 3-5 phrases. OBLIGATOIRE." },
      topics: { type: "array", items: { type: "string" }, description: "2-5 sujets abordés" },
      key_points: { type: "array", items: { type: "string" }, description: "3-8 points clés" },
      participants: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" }, role: { type: "string" }, company: { type: "string" },
            crm_match: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["lead", "partner"] },
                id: { type: "string" }, confidence: { type: "number" }
              }
            }
          },
          required: ["name", "role"]
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
        }
      },
      action_items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" }, assignee: { type: "string" },
            due_date: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            linked_entity: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["lead", "project", "solution", "partner"] },
                id: { type: "string" }, name: { type: "string" }
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
          properties: { content: { type: "string" }, owner: { type: "string" }, date_mentioned: { type: "string" } },
          required: ["content"]
        }
      },
      risks_blockers: { type: "array", items: { type: "string" } },
      questions_open: { type: "array", items: { type: "string" } },
      next_steps: {
        type: "array",
        items: {
          type: "object",
          properties: { action: { type: "string" }, owner: { type: "string" }, deadline: { type: "string" } },
          required: ["action"]
        }
      },
      financial_data: {
        type: "array",
        items: {
          type: "object",
          properties: { amount: { type: "number" }, currency: { type: "string" }, context: { type: "string" } },
          required: ["amount", "context"]
        }
      },
      dates_mentioned: {
        type: "array",
        items: {
          type: "object",
          properties: { original: { type: "string" }, normalized: { type: "string" }, context: { type: "string" } },
          required: ["original", "normalized", "context"]
        }
      },
      sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
      quality_score: { type: "number", minimum: 0, maximum: 100 }
    },
    required: ["title", "executive_summary", "topics", "key_points", "participants",
      "detected_entities", "action_items", "decisions", "sentiment"]
  };
}

// ============= CONTEXT FETCHING =============

// deno-lint-ignore no-explicit-any
async function fetchContext(supabase: any, job: any) {
  // Parallel fetch of all context data
  const [leadsRes, projectsRes, solutionsRes, partnersRes, aliasesRes] = await Promise.all([
    supabase.from("leads").select("id, name, company").order("created_at", { ascending: false }).limit(100),
    supabase.from("projects").select("id, name").order("created_at", { ascending: false }).limit(50),
    supabase.from("articles").select("id, title, slug").eq("resource_type", "solution").eq("published", true),
    supabase.from("partners").select("id, name, company, partner_type").is("deleted_at", null).limit(50),
    supabase.from("keyword_aliases").select("canonical_name, alias").eq("is_active", true).limit(100),
  ]);

  const existingEntities = {
    leads: (leadsRes.data || []).map((l: any) => ({ id: l.id, name: l.name, company: l.company })),
    projects: (projectsRes.data || []).map((p: any) => ({ id: p.id, name: p.name })),
    solutions: (solutionsRes.data || []).map((s: any) => ({ id: s.id, title: s.title, slug: s.slug })),
    partners: (partnersRes.data || []).map((p: any) => ({ id: p.id, name: p.name, company: p.company, type: p.partner_type })),
  };

  const dictionary = (aliasesRes.data || []).map((a: any) => ({ alias: a.alias, canonical: a.canonical_name }));

  // Fetch linked lead/project details
  let lead = null, project = null;
  const leadId = job.lead_id || null;
  const projectId = job.project_id || null;

  if (leadId) {
    const { data } = await supabase.from("leads").select("id, name, company, email, phone, stage").eq("id", leadId).maybeSingle();
    lead = data;
  }
  if (projectId) {
    const { data } = await supabase.from("projects").select("id, name, status").eq("id", projectId).maybeSingle();
    project = data;
  }

  log("Context", `entities: ${existingEntities.leads.length}L/${existingEntities.projects.length}P/${existingEntities.solutions.length}S/${existingEntities.partners.length}Pa, dict: ${dictionary.length}`);

  return { existingEntities, dictionary, lead, project, leadId, projectId };
}

function buildLLMInput(
  transcript: string,
  // deno-lint-ignore no-explicit-any
  segments: Record<string, unknown> | null,
  // deno-lint-ignore no-explicit-any
  ctx: any,
  analysisContext: string | null,
  // deno-lint-ignore no-explicit-any
  expectedParticipants: any[] = [],
  confirmedParticipants: { name: string; role?: string; linked_entity_type?: string }[] = [],
): string {
  const chapterSummaries = segments?.chapters
    // deno-lint-ignore no-explicit-any
    ? (segments.chapters as any[]).map((c: any) => `[${c.headline}] ${c.summary}`).join('\n')
    : null;

  const assemblyEntities = segments?.entities
    // deno-lint-ignore no-explicit-any
    ? (segments.entities as any[]).map((e: any) => `${e.entity_type}: ${e.text}`).join(', ')
    : null;

  return JSON.stringify({
    transcript: transcript.slice(0, MAX_TRANSCRIPT_FOR_LLM),
    chapter_summaries: chapterSummaries,
    assemblyai_entities: assemblyEntities,
    existing_entities: ctx.existingEntities,
    expected_participants: expectedParticipants.length > 0 ? expectedParticipants : undefined,
    confirmed_participants: confirmedParticipants.length > 0 ? confirmedParticipants : undefined,
    crm_context: {
      lead: ctx.lead ? { id: ctx.lead.id, name: ctx.lead.name, company: ctx.lead.company } : null,
      project: ctx.project ? { id: ctx.project.id, name: ctx.project.name } : null,
    },
    dictionary_context: ctx.dictionary.slice(0, 50),
    analysis_context: analysisContext,
    today_date: new Date().toISOString().split('T')[0],
  });
}

// ============= POST-PROCESSING: ENTITY LINKING =============

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// deno-lint-ignore no-explicit-any
async function processEntities(supabase: any, transcriptionId: string, entities: any[]): Promise<{ linked: number; aliases: number }> {
  const stats = { linked: 0, aliases: 0 };
  if (!entities?.length) return stats;

  const refs = [];
  const newAliases = [];

  for (const e of entities) {
    if (!e.name || !e.type) continue;
    const hasUUID = e.existing_id && UUID_RE.test(e.existing_id);

    if (hasUUID && e.confidence >= 0.85 && (e.action === 'link' || e.action === 'verify')) {
      refs.push({
        source_entity_id: transcriptionId,
        source_entity_type: 'voice_transcription',
        target_entity_id: e.existing_id,
        target_entity_type: e.type,
        confidence_score: e.confidence,
        detected_by: 'llm_auto',
        context: `Détecté: "${e.name}"`,
      });
      stats.linked++;
    } else if (e.action === 'create' || (e.action === 'verify' && !hasUUID)) {
      newAliases.push({
        alias: e.name,
        canonical_name: e.name,
        context_type: e.type === 'company' ? 'client' : e.type,
        status: 'pending',
        detected_count: 1,
        first_detected_at: new Date().toISOString(),
      });
      stats.aliases++;
    }
  }

  if (refs.length) {
    const { error } = await supabase.from('entity_name_references')
      .upsert(refs, { onConflict: 'source_entity_id,source_entity_type,target_entity_id,target_entity_type', ignoreDuplicates: true });
    if (error) console.warn(`[Entities] refs insert error: ${error.message?.slice(0, 100)}`);

    // Auto-link partners
    const partnerRefs = refs.filter(r => r.target_entity_type === 'partner');
    if (partnerRefs.length) {
      await supabase.from('transcription_partners')
        .upsert(partnerRefs.map(r => ({
          transcription_id: transcriptionId, partner_id: r.target_entity_id,
          context: r.context, created_at: new Date().toISOString(),
        })), { onConflict: 'transcription_id,partner_id', ignoreDuplicates: true });
    }

    // Mark stale for re-synthesis
    const leadIds = refs.filter(r => r.target_entity_type === 'lead').map(r => r.target_entity_id);
    const projectIds = refs.filter(r => r.target_entity_type === 'project').map(r => r.target_entity_id);
    const partnerIds = partnerRefs.map(r => r.target_entity_id);
    if (leadIds.length) await supabase.from('leads').update({ synthesis_stale: true }).in('id', leadIds);
    if (projectIds.length) await supabase.from('projects').update({ synthesis_stale: true }).in('id', projectIds);
    if (partnerIds.length) await supabase.from('partners').update({ synthesis_stale: true }).in('id', partnerIds);
  }

  if (newAliases.length) {
    await supabase.from('keyword_aliases').insert(newAliases).catch(() => {});
  }

  log("Entities", `linked=${stats.linked}, aliases=${stats.aliases}`);
  return stats;
}

// ============= TASK CREATION =============

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

function parseDueDate(d: string | null | undefined): string | null {
  if (!d) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const fr = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2].padStart(2, '0')}-${fr[1].padStart(2, '0')}`;
  return null;
}

// deno-lint-ignore no-explicit-any
async function createTasks(supabase: any, job: any, summary: Record<string, unknown>, leadId: string | null): Promise<number> {
  const items = Array.isArray(summary.action_items) ? summary.action_items : [];
  if (!items.length) return 0;

  // deno-lint-ignore no-explicit-any
  const inserts = items.filter((it: any) => it?.title?.trim()).map((it: any) => ({
    workspace_id: job.workspace_id,
    title: it.title.trim().slice(0, 200),
    task_type: "follow_up",
    priority: PRIORITIES.includes(it.priority) ? it.priority : "medium",
    status: "pending",
    lead_id: leadId,
    project_id: job.project_id,
    entity_type: "voice_transcription",
    entity_id: job.id,
    created_by: job.created_by,
    due_date: parseDueDate(it.due_date || it.deadline),
    ai_generated: true,
    ai_metadata: { source: "voice_transcription", source_transcription_id: job.id, generated_at: new Date().toISOString() },
  }));

  if (!inserts.length) return 0;
  const { data, error } = await supabase.from("tasks").insert(inserts).select("id");
  if (error) { console.warn(`[Tasks] insert error: ${error.message}`); return 0; }
  return data?.length ?? 0;
}

// ============= MAIN =============

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  let jobId: string | null = null;
  let initialStatus: string | null = null;

  try {
    const body = await req.json();
    jobId = body.job_id;
    const forceReanalyze = body.force_reanalyze === true;
    let forceRetranscribe = body.force_retranscribe === true;
    if (forceRetranscribe) { /* retranscribe implies reanalyze */ }

    if (!jobId) {
      return new Response(JSON.stringify({ error: "missing_job_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Load job
    const { data: job, error: jerr } = await supabase
      .from("voice_transcriptions").select("*").eq("id", jobId).single();
    if (jerr || !job) {
      return new Response(JSON.stringify({ error: "job_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    initialStatus = job.status;

    // Skip if already done (unless force)
    if (job.status === "done" && !forceReanalyze && !forceRetranscribe) {
      return new Response(JSON.stringify({ ok: true, already_done: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    log("Job", `Processing ${jobId} (status=${job.status}, retranscribe=${forceRetranscribe}, reanalyze=${forceReanalyze})`);

    const hasNoFile = job.storage_path?.endsWith("_no_file");
    if (hasNoFile && forceRetranscribe) {
      log("Job", "_no_file detected — downgrading to reanalyze-only");
      forceRetranscribe = false;
    }

    const existingTranscript = job.raw_transcript as string | null;
    const aiMeta = (job.ai_metadata ?? {}) as Record<string, unknown>;
    let rawText: string;
    let segments: Record<string, unknown> | null = null;

    // ============================
    // PHASE 1: TRANSCRIPTION
    // ============================
    const needsTranscription = forceRetranscribe || (!existingTranscript?.trim() && !hasNoFile);

    if (needsTranscription) {
      if (!ASSEMBLYAI_API_KEY) throw new Error("ASSEMBLYAI_API_KEY not configured");

      await supabase.from("voice_transcriptions").update({
        status: "transcribing",
        ai_metadata: { ...aiMeta, transcription_started_at: new Date().toISOString() },
      }).eq("id", jobId);

      // Get signed URL
      const storagePath = job.storage_path;
      const bucket = storagePath.startsWith("telegram-audio/") ? "cockpit-uploads" : "voice-transcriptions";
      log("Audio", `bucket=${bucket}, path=${storagePath}`);

      const { data: signed, error: signErr } = await supabase.storage
        .from(bucket).createSignedUrl(storagePath, 3600); // 1h for long processing
      if (signErr || !signed?.signedUrl) throw new Error(`signed_url_failed: ${signErr?.message ?? "no_url"}`);

      // Custom vocabulary: keyword aliases + expected participant names
      let wordBoost: string[] = [];
      try {
        const { data: aliases } = await supabase.from("keyword_aliases")
          .select("canonical_name").eq("is_active", true).limit(100);
        if (aliases?.length) wordBoost = aliases.map((a: any) => a.canonical_name).filter(Boolean);
      } catch { /* non-blocking */ }

      // Add expected participant names to word_boost for better recognition
      const expectedParticipants = (aiMeta?.expected_participants as any[]) || [];
      if (expectedParticipants.length) {
        const participantNames = expectedParticipants
          .map((p: any) => p.name)
          .filter(Boolean);
        const participantCompanies = expectedParticipants
          .map((p: any) => p.company)
          .filter(Boolean);
        wordBoost = [...wordBoost, ...participantNames, ...participantCompanies];
        log("WordBoost", `Added ${participantNames.length} participant names + ${participantCompanies.length} companies`);

        // Fetch custom vocabulary for linked CRM entities
        const entityIds = expectedParticipants
          .filter((p: any) => p.entity_id && p.type && p.type !== 'manual')
          .map((p: any) => p.entity_id);
        if (entityIds.length) {
          try {
            const { data: vocabTerms } = await supabase
              .from("entity_vocabulary")
              .select("term")
              .in("entity_id", entityIds)
              .limit(200);
            if (vocabTerms?.length) {
              const terms = vocabTerms.map((v: any) => v.term).filter(Boolean);
              wordBoost = [...wordBoost, ...terms];
              log("WordBoost", `Added ${terms.length} custom vocabulary terms from entity_vocabulary`);
            }
          } catch (e) {
            log("WordBoost", `entity_vocabulary fetch failed (non-blocking): ${e}`);
          }
        }
      }

      // Submit to AssemblyAI — ASYNC: return immediately, worker will poll
      const qualityMode = (aiMeta?.quality_mode as string) || "standard";
      log("AssemblyAI", `Submitting to AssemblyAI (async mode, quality=${qualityMode})...`);
      const options = getDefaultTranscriptionOptions({
        quality: qualityMode as "standard" | "high",
        word_boost: wordBoost.length > 0 ? wordBoost : undefined,
      });

      const assemblyaiTranscriptId = await startTranscription(signed.signedUrl, ASSEMBLYAI_API_KEY, options);

      // Store the AssemblyAI job ID so the worker can poll for it
      await supabase.from("voice_transcriptions").update({
        status: "transcribing",
        ai_metadata: {
          ...aiMeta,
          source: "assemblyai",
          assemblyai_transcript_id: assemblyaiTranscriptId,
          transcription_started_at: new Date().toISOString(),
        },
      }).eq("id", jobId);

      log("AssemblyAI", `Job submitted: assemblyai_id=${assemblyaiTranscriptId}. Worker will poll.`);

      // Return immediately — the worker cron will poll for completion
      return new Response(JSON.stringify({
        ok: true,
        phase: "transcription_submitted",
        message: "Transcription soumise à AssemblyAI. Le worker va vérifier l'avancement.",
        job: { id: jobId, status: "transcribing", assemblyai_id: assemblyaiTranscriptId },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      // Use existing transcript
      rawText = existingTranscript || "";
      log("Job", `Using existing transcript (${rawText.length} chars)`);

      // Load segments from DB
      try {
        const seg = job.segments;
        if (seg) segments = typeof seg === 'string' ? JSON.parse(seg) : seg as Record<string, unknown>;
      } catch { /* ignore */ }

      await supabase.from("voice_transcriptions").update({
        status: "analyzing",
        ai_metadata: { ...aiMeta, transcription_skipped: true },
      }).eq("id", jobId);
    }

    // ============================
    // PHASE 2: LLM ANALYSIS
    // ============================
    log("LLM", "Starting analysis...");

    const ctx = await fetchContext(supabase, job);
    const analysisContext = job.analysis_context as string | null;
    const expectedParticipants = (aiMeta?.expected_participants as any[]) || [];

    // Load persisted participants (from previous analysis or manual edits)
    let confirmedParticipants: { name: string; role?: string; linked_entity_type?: string }[] = [];
    try {
      const { data: persistedParts } = await supabase
        .from('transcription_participants')
        .select('name, role_in_meeting, linked_entity_type, linked_entity_id')
        .eq('transcription_id', jobId);
      if (persistedParts?.length) {
        confirmedParticipants = persistedParts.map((p: any) => ({
          name: p.name,
          role: p.role_in_meeting || undefined,
          linked_entity_type: p.linked_entity_type || undefined,
        }));
        log("Participants", `Found ${confirmedParticipants.length} confirmed participants for re-analysis`);
      }
    } catch { /* non-blocking */ }

    const llmInput = buildLLMInput(rawText, segments, ctx, analysisContext, expectedParticipants, confirmedParticipants);

    await supabase.from("voice_transcriptions").update({
      ai_metadata: {
        ...aiMeta,
        ...(segments ? buildAssemblyAIMetadata({} as any) : {}),
        llm_call_started_at: new Date().toISOString(),
        llm_model: "google/gemini-2.5-flash",
      },
    }).eq("id", jobId);

    let summary: Record<string, unknown>;

    try {
      const llmResult = await callLLMWithFallback(
        getAnalysisSystemPrompt(),
        llmInput,
        null, // No tool calling — use json_object mode for reliability with Gemini
        { category: 'reasoning', timeoutMs: LLM_TIMEOUT_MS, maxTokens: 16384 }
      );
      
      // Validate the LLM actually returned useful data
      if (llmResult.error === "empty_response" || llmResult._parse_fallback) {
        throw new Error("LLM returned empty or unparseable response");
      }
      
      summary = llmResult;
      log("LLM", `Analysis complete: title="${summary.title}", entities=${(summary.detected_entities as any[])?.length ?? 0}`);
    } catch (llmErr) {
      logErr("LLM", llmErr);
      // If we have segments, build a basic summary from AssemblyAI data
      if (segments?.chapters && (segments.chapters as any[]).length > 0) {
        log("LLM", "Falling back to AssemblyAI-only summary");
        const chapters = segments.chapters as any[];
        summary = {
          title: chapters[0]?.headline ?? job.original_filename ?? "Transcription",
          executive_summary: chapters.map((c: any) => c.summary).join(' '),
          topics: chapters.map((c: any) => c.headline),
          key_points: chapters.map((c: any) => c.gist).filter(Boolean),
          participants: [],
          detected_entities: [],
          action_items: [],
          decisions: [],
          risks_blockers: [],
          questions_open: [],
          next_steps: [],
          financial_data: [],
          dates_mentioned: [],
          sentiment: "neutral",
          _fallback: "assemblyai_only",
        };
      } else {
        // No chapters, no LLM — mark error
        throw llmErr;
      }
    }

    // ============================
    // POST-PROCESSING
    // ============================

    // Tasks
    const tasksCreated = job.auto_create_tasks
      ? await createTasks(supabase, job, summary, ctx.leadId)
      : 0;

    // Entity linking
    let entityStats = { linked: 0, aliases: 0 };
    try {
      entityStats = await processEntities(supabase, jobId!, summary.detected_entities as any[]);
    } catch (e) { logErr("Entities", e); }

    // Seed transcription_participants from expected + LLM-detected participants
    // STRATEGY: Skip seeding entirely on re-analysis if participants already exist (protect manual edits)
    try {
      const { count: existingParticipantCount } = await supabase
        .from('transcription_participants')
        .select('id', { count: 'exact', head: true })
        .eq('transcription_id', jobId);

      const isReanalysis = forceReanalyze || initialStatus === 'done' || initialStatus === 'analyzing';
      const hasExistingParticipants = (existingParticipantCount ?? 0) > 0;

      if (isReanalysis && hasExistingParticipants) {
        log("Participants", `Skipping seeding — re-analysis with ${existingParticipantCount} existing participants (protecting manual edits)`);
      } else {
        const expectedParts = (aiMeta?.expected_participants as any[]) || [];
        const llmParts = (summary.participants as any[]) || [];
        const participantRows: any[] = [];

        // Expected participants (pre-selected by user)
        for (const ep of expectedParts) {
          if (!ep.name) continue;
          const linkedType = ep.type === 'manual' ? null : ep.type;
          participantRows.push({
            transcription_id: jobId,
            name: ep.name,
            presence_status: 'present',
            linked_entity_type: linkedType,
            linked_entity_id: ep.entity_id || null,
          });
        }

        // LLM-detected participants (merge, don't overwrite expected)
        const existingNames = new Set(participantRows.map(p => p.name.toLowerCase()));
        for (const lp of llmParts) {
          if (!lp.name || existingNames.has(lp.name.toLowerCase())) continue;
          participantRows.push({
            transcription_id: jobId,
            name: lp.name,
            presence_status: 'present',
            ai_suggested_match: lp.crm_match || null,
            confidence_score: lp.crm_match?.confidence || null,
          });
        }

        // Phase P0.5: Auto-link from transcription-level entity FKs (lead_contact, lead)
        try {
          if (job.lead_contact_id) {
            const { data: contact } = await supabase
              .from('lead_contacts')
              .select('name')
              .eq('id', job.lead_contact_id)
              .single();
            if (contact) {
              // Try to match by name similarity
              for (const row of participantRows) {
                if (row.linked_entity_id) continue;
                const rowNorm = row.name.toLowerCase().trim();
                const contactNorm = contact.name.toLowerCase().trim();
                if (rowNorm === contactNorm || rowNorm.includes(contactNorm) || contactNorm.includes(rowNorm)) {
                  row.linked_entity_type = 'lead_contact';
                  row.linked_entity_id = job.lead_contact_id;
                  log("Participants", `Auto-linked "${row.name}" → Lead Contact "${contact.name}" from transcription FK`);
                  break;
                }
              }
            }
          }
          if (job.lead_id) {
            // Check if any unlinked participant matches the lead name
            const { data: lead } = await supabase
              .from('leads')
              .select('name')
              .eq('id', job.lead_id)
              .single();
            if (lead) {
              for (const row of participantRows) {
                if (row.linked_entity_id) continue;
                const rowNorm = row.name.toLowerCase().trim();
                const leadNorm = lead.name.toLowerCase().trim();
                if (rowNorm === leadNorm || rowNorm.includes(leadNorm) || leadNorm.includes(rowNorm)) {
                  row.linked_entity_type = 'lead';
                  row.linked_entity_id = job.lead_id;
                  log("Participants", `Auto-linked "${row.name}" → Lead "${lead.name}" from transcription FK`);
                  break;
                }
              }
            }
          }
        } catch (e) { logErr("Participant FK auto-link", e); }
        try {
          const unlinkedNames = participantRows
            .filter(p => !p.linked_entity_id)
            .map(p => p.name.toLowerCase());
          
          if (unlinkedNames.length > 0) {
            const { data: mappings } = await supabase
              .from('participant_entity_mappings')
              .select('participant_name, linked_entity_type, linked_entity_id, linked_entity_name, usage_count')
              .eq('workspace_id', job.workspace_id)
              .order('usage_count', { ascending: false });

            if (mappings?.length) {
              let autoLinked = 0;
              for (const row of participantRows) {
                if (row.linked_entity_id) continue;
                const match = mappings.find(
                  (m: any) => m.participant_name.toLowerCase() === row.name.toLowerCase()
                );
                if (match) {
                  row.linked_entity_type = match.linked_entity_type;
                  row.linked_entity_id = match.linked_entity_id;
                  autoLinked++;
                }
              }
              if (autoLinked > 0) log("Participants", `Auto-linked ${autoLinked} from memory`);
            }
          }
        } catch (e) { logErr("Participant memory lookup", e); }

        if (participantRows.length > 0) {
          await supabase.from("transcription_participants")
            .upsert(participantRows, { onConflict: 'transcription_id,name', ignoreDuplicates: true });
          log("Participants", `Seeded ${participantRows.length} participants`);
        }
      }

      // Phase P3: Advanced AI matching — Levenshtein + phonetic + company context
      try {
        const unlinked = participantRows.filter(p => !p.linked_entity_id);
        if (unlinked.length > 0) {
          const [{ data: partners }, { data: contacts }, { data: leads }] = await Promise.all([
            supabase.from('partners').select('id, name, company, slug').eq('workspace_id', job.workspace_id).limit(100),
            supabase.from('lead_contacts').select('id, name, email').limit(100),
            supabase.from('leads').select('id, name, company').eq('workspace_id', job.workspace_id).limit(100),
          ]);

          const crmEntities: Array<{ type: string; id: string; name: string; extra?: string }> = [];
          partners?.forEach(p => crmEntities.push({ type: 'partner', id: p.id, name: p.name, extra: p.company || undefined }));
          contacts?.forEach(c => crmEntities.push({ type: 'lead_contact', id: c.id, name: c.name, extra: c.email || undefined }));
          leads?.forEach(l => crmEntities.push({ type: 'lead', id: l.id, name: l.name, extra: l.company || undefined }));

          if (crmEntities.length > 0) {
            const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

            // Levenshtein distance
            const levenshtein = (a: string, b: string): number => {
              if (a.length === 0) return b.length;
              if (b.length === 0) return a.length;
              const matrix: number[][] = [];
              for (let i = 0; i <= b.length; i++) matrix[i] = [i];
              for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
              for (let i = 1; i <= b.length; i++) {
                for (let j = 1; j <= a.length; j++) {
                  const cost = b[i - 1] === a[j - 1] ? 0 : 1;
                  matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                  );
                }
              }
              return matrix[b.length][a.length];
            };

            // Simple French phonetic normalization
            const phonetic = (s: string): string => {
              return normalize(s)
                .replace(/ph/g, 'f')
                .replace(/qu/g, 'k')
                .replace(/gu(?=[ei])/g, 'g')
                .replace(/eau|aux|au/g, 'o')
                .replace(/ou/g, 'u')
                .replace(/ai|ei/g, 'e')
                .replace(/oi/g, 'wa')
                .replace(/an|en|am|em/g, 'an')
                .replace(/in|im|ain|ein|un/g, 'in')
                .replace(/on|om/g, 'on')
                .replace(/th/g, 't')
                .replace(/ch/g, 'sh')
                .replace(/gn/g, 'ny')
                .replace(/ll|l$/g, 'l')
                .replace(/ss|c(?=[ei])/g, 's')
                .replace(/([a-z])\1+/g, '$1') // deduplicate consecutive chars
                .replace(/[hx]/g, '')
                .replace(/e$/g, '');
            };

            const updates: Array<{ name: string; match: any; score: number }> = [];
            for (const p of unlinked) {
              const pNorm = normalize(p.name);
              const pParts = pNorm.split(/\s+/);
              const pPhonetic = phonetic(p.name);

              let bestMatch: typeof crmEntities[0] | null = null;
              let bestScore = 0;

              for (const entity of crmEntities) {
                const eNorm = normalize(entity.name);
                const eParts = eNorm.split(/\s+/);
                let score = 0;

                // 1. Exact match
                if (pNorm === eNorm) { bestMatch = entity; bestScore = 1.0; break; }

                // 2. Full name containment
                if (eNorm.includes(pNorm) || pNorm.includes(eNorm)) {
                  score = Math.max(score, 0.88);
                }

                // 3. Levenshtein similarity on full name
                const maxLen = Math.max(pNorm.length, eNorm.length);
                if (maxLen > 0) {
                  const dist = levenshtein(pNorm, eNorm);
                  const sim = 1 - dist / maxLen;
                  if (sim >= 0.75) score = Math.max(score, sim * 0.9);
                }

                // 4. Phonetic similarity
                const ePhonetic = phonetic(entity.name);
                if (pPhonetic === ePhonetic) {
                  score = Math.max(score, 0.85);
                } else if (pPhonetic.length > 2 && ePhonetic.length > 2) {
                  const pDist = levenshtein(pPhonetic, ePhonetic);
                  const pMaxLen = Math.max(pPhonetic.length, ePhonetic.length);
                  const pSim = 1 - pDist / pMaxLen;
                  if (pSim >= 0.8) score = Math.max(score, pSim * 0.82);
                }

                // 5. Surname match (last word)
                const pLast = pParts[pParts.length - 1];
                const eLast = eParts[eParts.length - 1];
                if (pLast.length >= 3 && pLast === eLast) {
                  const surnameScore = pParts.length === 1 ? 0.6 : 0.78;
                  score = Math.max(score, surnameScore);
                }
                // Phonetic surname match
                if (pLast.length >= 3 && phonetic(pLast) === phonetic(eLast)) {
                  score = Math.max(score, 0.7);
                }

                // 6. First name cross-match (e.g. "Mme Guyou" vs "Isabelle Guyou")
                if (pParts.length >= 2 && eParts.length >= 2) {
                  const pSurname = pParts[pParts.length - 1];
                  const eSurname = eParts[eParts.length - 1];
                  if (pSurname === eSurname || phonetic(pSurname) === phonetic(eSurname)) {
                    // Surnames match, check if first part is a title/abbreviation
                    const titles = ['mme', 'mr', 'mlle', 'dr', 'pr', 'me', 'madame', 'monsieur', 'mademoiselle'];
                    const pFirst = pParts[0];
                    if (titles.includes(pFirst) || pFirst.length <= 2) {
                      score = Math.max(score, 0.8);
                    }
                  }
                }

                // 7. Company context boost: if participant company context matches entity company
                if (entity.extra && p.name) {
                  // Check if the transcript has company context from LLM participants
                  const participantObj = (summary as any)?.participants?.find(
                    (lp: any) => normalize(lp.name || '') === pNorm || normalize(lp.name || '').includes(pNorm)
                  );
                  if (participantObj?.company && entity.extra) {
                    const companyMatch = normalize(participantObj.company) === normalize(entity.extra) ||
                      normalize(entity.extra).includes(normalize(participantObj.company)) ||
                      normalize(participantObj.company).includes(normalize(entity.extra));
                    if (companyMatch && score >= 0.5) {
                      score = Math.min(score + 0.15, 0.95); // Boost score with company confirmation
                    }
                  }
                }

                if (score > bestScore) { bestMatch = entity; bestScore = score; }
              }

              if (bestMatch && bestScore >= 0.55) {
                updates.push({
                  name: p.name,
                  match: { type: bestMatch.type, id: bestMatch.id, name: bestMatch.name, confidence: bestScore },
                  score: bestScore,
                });
              }
            }

            // Auto-link high-confidence matches, suggest the rest
            for (const u of updates) {
              if (u.score >= 0.9) {
                // High confidence: auto-link
                await supabase.from('transcription_participants')
                  .update({
                    linked_entity_type: u.match.type,
                    linked_entity_id: u.match.id,
                    ai_suggested_match: u.match,
                    confidence_score: u.score,
                  })
                  .eq('transcription_id', jobId)
                  .eq('name', u.name);
              } else {
                // Medium confidence: suggest only
                await supabase.from('transcription_participants')
                  .update({ ai_suggested_match: u.match, confidence_score: u.score })
                  .eq('transcription_id', jobId)
                  .eq('name', u.name);
              }
            }
            const autoLinkedCount = updates.filter(u => u.score >= 0.9).length;
            const suggestedCount = updates.filter(u => u.score < 0.9).length;
            if (updates.length > 0) log("AI Matching", `Auto-linked ${autoLinkedCount}, suggested ${suggestedCount} CRM matches (Levenshtein+phonetic)`);
          }
        }
      } catch (e) { logErr("AI participant matching", e); }
    } catch (e) { logErr("Participants seeding", e); }

    // Activity log
    await supabase.from("activity_log").insert({
      workspace_id: job.workspace_id,
      entity_type: "voice_transcription",
      entity_id: jobId,
      activity_type: "transcription_completed",
      content: `Transcription analysée (${tasksCreated} tâche(s), ${entityStats.linked} entités liées)`,
      lead_id: ctx.leadId,
      project_id: job.project_id,
      created_by: job.created_by,
      ai_metadata: { stt_model: "assemblyai", llm_model: "google/gemini-2.5-flash", entity_linking: entityStats },
    });

    // Extract title
    const extractedTitle = typeof summary.title === 'string' && summary.title.trim()
      ? summary.title.trim().slice(0, 100)
      : typeof summary.executive_summary === 'string' && summary.executive_summary.trim()
        ? (summary.executive_summary.match(/^[^.!?]+[.!?]?/)?.[0] ?? "").trim().slice(0, 100)
        : undefined;

    // Save final result
    await supabase.from("voice_transcriptions").update({
      ...(extractedTitle ? { title: extractedTitle } : {}),
      summary,
      status: "done",
      ai_metadata: {
        ...(aiMeta),
        llm_model: "google/gemini-2.5-flash",
        entity_linking: entityStats,
        completed_at: new Date().toISOString(),
      },
    }).eq("id", jobId);

    log("Job", `${jobId} completed ✓`);

    // Fire-and-forget: entity extraction
    fetch(`${SUPABASE_URL}/functions/v1/extract-entities`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "scan_entity", entity_type: "voice_transcription", entity_id: jobId }),
    }).catch(() => {});

    // Fire-and-forget: auto-consulte for linked stale entities (pipeline post-transcription)
    // The extract-entities function already marks entities as stale, so trigger recalculation
    setTimeout(() => {
      fetch(`${SUPABASE_URL}/functions/v1/auto-consulte-stale`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});
    }, 10000); // Delay 10s to let entity extraction mark entities as stale first

    return new Response(JSON.stringify({ ok: true, job_id: jobId, tasks_created: tasksCreated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    logErr("Main", e);

    if (jobId) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: current } = await supabase.from("voice_transcriptions").select("ai_metadata").eq("id", jobId).maybeSingle();
        const meta = (current as any)?.ai_metadata ?? {};

        const isReanalyzeFailure = initialStatus === "done" || initialStatus === "analyzing";

        await supabase.from("voice_transcriptions").update({
          status: isReanalyzeFailure ? "done" : "error",
          ai_metadata: {
            ...meta,
            ...(isReanalyzeFailure
              ? { last_reanalyze_error: errMsg.slice(0, 1000), last_reanalyze_error_at: new Date().toISOString() }
              : { last_error: errMsg.slice(0, 1000), last_error_at: new Date().toISOString() }),
          },
        }).eq("id", jobId);
      } catch { /* cleanup errors */ }
    }

    const isExpected = ["TIMEOUT", "rate_limited", "credits_exhausted"].some(k => errMsg.includes(k));
    return new Response(JSON.stringify({ ok: false, error: isExpected ? "timeout_or_rate_limit" : "process_failed", message: errMsg.slice(0, 500) }), {
      status: isExpected ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
