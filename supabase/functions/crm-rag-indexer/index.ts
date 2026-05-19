/**
 * crm-rag-indexer — CDC v2 CRM-as-RAG, Sprint 1
 *
 * Indexe les contenus riches du CRM dans `resource_embeddings` pour les rendre
 * accessibles au RAG (cockpit-ai-copilot, sentinel, cross-signals).
 *
 * Modes :
 *   - POST { task: 'index', resource_type, resource_id, workspace_id? }
 *       → indexe une ressource ciblée (appelée par trigger pg_net)
 *   - POST { task: 'backfill', resource_type, workspace_id?, limit? }
 *       → backfill des ressources existantes
 *
 * Resource types supportés (Sprint 1) :
 *   - transcription_chunk + transcription_summary  (voice_transcriptions)
 *
 * Embedding model : openai/text-embedding-3-small (1536d natif, le moins cher,
 * compatible avec la colonne vector(1536) existante).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EMBED_MODEL = "openai/text-embedding-3-small"; // 1536d natif
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;
const MAX_CHUNKS_PER_DOC = 80; // garde-fou (transcription 41KB ~ 28 chunks)
const EMBED_BATCH_SIZE = 32;

interface IndexRequest {
  task?: "index" | "backfill";
  resource_type: string;
  resource_id?: string;
  workspace_id?: string;
  limit?: number;
}

// ─── Telemetry ──────────────────────────────────────────────────────────────

type LogCtx = Record<string, unknown>;
let CURRENT_REQUEST_ID = "";

function newRequestId(): string {
  return `rag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function logEvent(level: "info" | "warn" | "error", event: string, ctx: LogCtx = {}) {
  const payload = { ts: new Date().toISOString(), req: CURRENT_REQUEST_ID, level, event, ...ctx };
  const line = `[crm-rag-indexer] ${event} ${JSON.stringify(payload)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/**
 * Normalize any thrown value (PostgrestError, Error, unknown) into a structured payload.
 * PostgrestError fields: code, message, details, hint.
 */
function normalizeError(err: unknown): {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  stack?: string;
} {
  if (!err) return { message: "unknown error" };
  if (err instanceof Error) {
    const e = err as Error & { code?: string; details?: string; hint?: string };
    return {
      message: e.message,
      code: e.code,
      details: e.details,
      hint: e.hint,
      stack: e.stack,
    };
  }
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    return {
      message: typeof e.message === "string" ? e.message : JSON.stringify(err),
      code: e.code != null ? String(e.code) : undefined,
      details: e.details != null ? String(e.details) : undefined,
      hint: e.hint != null ? String(e.hint) : undefined,
    };
  }
  return { message: String(err) };
}

/**
 * Wrap a PostgrestError into a logged + structured Error.
 * Use after `const { error } = await supabase...` checks.
 */
function pgError(op: string, ctx: LogCtx, error: unknown): Error {
  const n = normalizeError(error);
  const fullCtx = { op, ...ctx, code: n.code, message: n.message, details: n.details, hint: n.hint };
  logEvent("error", "postgrest_error", fullCtx);
  const err = new Error(
    `[${op}] ${n.message}${n.code ? ` (code=${n.code})` : ""}${n.details ? ` | details=${n.details}` : ""}${n.hint ? ` | hint=${n.hint}` : ""}`,
  );
  (err as Error & { code?: string; details?: string; hint?: string; op?: string; ctx?: LogCtx }).code = n.code;
  (err as Error & { details?: string }).details = n.details;
  (err as Error & { hint?: string }).hint = n.hint;
  (err as Error & { op?: string }).op = op;
  (err as Error & { ctx?: LogCtx }).ctx = ctx;
  return err;
}

function serializeError(err: unknown): string {
  const n = normalizeError(err);
  const parts = [n.message, n.code && `code=${n.code}`, n.details && `details=${n.details}`, n.hint && `hint=${n.hint}`]
    .filter(Boolean);
  return parts.join(" | ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  CURRENT_REQUEST_ID = newRequestId();
  const startedAt = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json().catch(() => ({}))) as IndexRequest;
    const task = body.task ?? "index";

    logEvent("info", "request_received", {
      task,
      resource_type: body.resource_type,
      resource_id: body.resource_id,
      workspace_id: body.workspace_id,
      limit: body.limit,
    });

    if (!body.resource_type) {
      return json({ error: "resource_type is required", request_id: CURRENT_REQUEST_ID }, 400);
    }

    if (task === "backfill") {
      const result = await backfill(supabase, body);
      logEvent("info", "request_done", { task, duration_ms: Date.now() - startedAt, ...summarizeResult(result) });
      return json({ ...result, request_id: CURRENT_REQUEST_ID });
    }

    if (!body.resource_id) {
      return json({ error: "resource_id is required for task=index", request_id: CURRENT_REQUEST_ID }, 400);
    }

    const result = await indexOne(supabase, body.resource_type, body.resource_id);
    logEvent("info", "request_done", { task, duration_ms: Date.now() - startedAt, ...summarizeResult(result) });
    return json({ ...result, request_id: CURRENT_REQUEST_ID });
  } catch (err) {
    const n = normalizeError(err);
    logEvent("error", "request_failed", {
      duration_ms: Date.now() - startedAt,
      message: n.message,
      code: n.code,
      details: n.details,
      hint: n.hint,
      op: (err as { op?: string })?.op,
      ctx: (err as { ctx?: LogCtx })?.ctx,
    });
    return json({ error: serializeError(err), request_id: CURRENT_REQUEST_ID }, 500);
  }
});

function summarizeResult(r: unknown): LogCtx {
  if (!r || typeof r !== "object") return {};
  const x = r as Record<string, unknown>;
  return {
    processed: x.processed,
    ok: x.ok,
    failed: x.failed,
    total_chunks: x.total_chunks,
    chunks: x.chunks,
  };
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────

async function indexOne(
  supabase: ReturnType<typeof createClient>,
  resourceType: string,
  resourceId: string,
) {
  switch (resourceType) {
    case "transcription_chunk":
    case "transcription_summary":
    case "voice_transcription":
      return await indexTranscription(supabase, resourceId);
    case "lead_summary":
    case "lead":
      return await indexLead(supabase, resourceId);
    case "opportunity":
      return await indexOpportunity(supabase, resourceId);
    case "entity_note":
    case "entity_context_note":
      return await indexEntityNote(supabase, "entity_context_notes", resourceId);
    case "project_note":
      return await indexEntityNote(supabase, "project_notes", resourceId);
    default:
      throw new Error(`Unsupported resource_type: ${resourceType}`);
  }
}

async function backfill(
  supabase: ReturnType<typeof createClient>,
  req: IndexRequest,
) {
  const limit = req.limit ?? 1000;
  const results: { id: string; ok: boolean; chunks?: number; error?: string }[] = [];

  if (
    req.resource_type === "transcription_chunk" ||
    req.resource_type === "transcription_summary" ||
    req.resource_type === "voice_transcription"
  ) {
    // Récupère les ids déjà indexés (pagination pour dépasser le 1000-row cap)
    const indexedIds = new Set<string>();
    const PAGE = 1000;
    for (let offset = 0; ; offset += PAGE) {
      const { data: page, error: pageErr } = await supabase
        .from("resource_embeddings")
        .select("parent_resource_id")
        .in("resource_type", ["transcription_chunk", "transcription_summary"])
        .not("parent_resource_id", "is", null)
        .range(offset, offset + PAGE - 1);
      if (pageErr) throw pgError("backfill.list_indexed", { table: "resource_embeddings", resource_type: req.resource_type, offset, workspace_id: req.workspace_id }, pageErr);
      if (!page || page.length === 0) break;
      for (const r of page) {
        const id = (r as { parent_resource_id: string }).parent_resource_id;
        if (id) indexedIds.add(id);
      }
      if (page.length < PAGE) break;
    }

    // Fetch all transcriptions (pas de raw_transcript filter ici car déjà filtré côté indexOne)
    let q = supabase
      .from("voice_transcriptions")
      .select("id, workspace_id")
      .not("raw_transcript", "is", null)
      .limit(1000);
    if (req.workspace_id) q = q.eq("workspace_id", req.workspace_id);
    const { data: rows, error } = await q;
    if (error) throw pgError("backfill.list_sources", { table: "voice_transcriptions", workspace_id: req.workspace_id }, error);

    const toProcess = (rows ?? [])
      .filter((r) => !indexedIds.has((r as { id: string }).id))
      .slice(0, limit);

    for (const row of toProcess) {
      const id = (row as { id: string }).id;
      try {
        const r = await indexTranscription(supabase, id);
        results.push({ id, ok: true, chunks: r.chunks });
      } catch (e) {
        const n = normalizeError(e);
        logEvent("error", "backfill_row_failed", {
          resource_type: req.resource_type,
          resource_id: id,
          table: "voice_transcriptions",
          message: n.message,
          code: n.code,
          details: n.details,
          hint: n.hint,
          op: (e as { op?: string })?.op,
        });
        results.push({ id, ok: false, error: n.message });
      }
    }
    return {
      task: "backfill",
      resource_type: req.resource_type,
      processed: results.length,
      ok: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      total_chunks: results.reduce((s, r) => s + (r.chunks ?? 0), 0),
      results,
    };
  }

  if (req.resource_type === "lead_summary" || req.resource_type === "lead") {
    return await genericBackfill(supabase, req, "leads", "lead_summary", indexLead);
  }

  if (req.resource_type === "opportunity") {
    return await genericBackfill(supabase, req, "opportunities", "opportunity", indexOpportunity);
  }

  if (req.resource_type === "entity_note" || req.resource_type === "entity_context_note") {
    return await genericBackfill(supabase, req, "entity_context_notes", "entity_note",
      (s, id) => indexEntityNote(s, "entity_context_notes", id));
  }

  if (req.resource_type === "project_note") {
    return await genericBackfill(supabase, req, "project_notes", "project_note",
      (s, id) => indexEntityNote(s, "project_notes", id));
  }

  throw new Error(`Backfill not implemented for: ${req.resource_type}`);
}

async function genericBackfill(
  supabase: ReturnType<typeof createClient>,
  req: IndexRequest,
  table: string,
  embeddingType: string,
  handler: (s: ReturnType<typeof createClient>, id: string) => Promise<{ chunks: number }>,
) {
  const limit = req.limit ?? 1000;
  const indexedIds = new Set<string>();
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data: page, error } = await supabase
      .from("resource_embeddings")
      .select("parent_resource_id")
      .eq("resource_type", embeddingType)
      .not("parent_resource_id", "is", null)
      .range(offset, offset + PAGE - 1);
    if (error) throw pgError("backfill.list_indexed", { table: "resource_embeddings", resource_type: embeddingType, offset, workspace_id: req.workspace_id }, error);
    if (!page || page.length === 0) break;
    for (const r of page) {
      const id = (r as { parent_resource_id: string }).parent_resource_id;
      if (id) indexedIds.add(id);
    }
    if (page.length < PAGE) break;
  }

  let q = supabase.from(table).select("id, workspace_id").limit(1000);
  if (req.workspace_id) q = q.eq("workspace_id", req.workspace_id);
  const { data: rows, error } = await q;
  if (error) throw pgError("backfill.list_sources", { table, resource_type: req.resource_type, workspace_id: req.workspace_id }, error);

  const toProcess = (rows ?? [])
    .filter((r) => !indexedIds.has((r as { id: string }).id))
    .slice(0, limit);

  const results: { id: string; ok: boolean; chunks?: number; error?: string; code?: string; details?: string; hint?: string }[] = [];
  for (const row of toProcess) {
    const id = (row as { id: string }).id;
    try {
      const r = await handler(supabase, id);
      results.push({ id, ok: true, chunks: r.chunks });
    } catch (e) {
      const n = normalizeError(e);
      logEvent("error", "backfill_row_failed", {
        resource_type: req.resource_type,
        resource_id: id,
        table,
        message: n.message,
        code: n.code,
        details: n.details,
        hint: n.hint,
        op: (e as { op?: string })?.op,
      });
      results.push({ id, ok: false, error: n.message, code: n.code, details: n.details, hint: n.hint });
    }
  }
  return {
    task: "backfill",
    resource_type: req.resource_type,
    processed: results.length,
    ok: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    total_chunks: results.reduce((s, r) => s + (r.chunks ?? 0), 0),
  };
}

// ─── Handler : transcription ────────────────────────────────────────────────

async function indexTranscription(
  supabase: ReturnType<typeof createClient>,
  transcriptionId: string,
) {
  const { data, error } = await supabase
    .from("voice_transcriptions")
    .select(
      "id, workspace_id, raw_transcript, ai_documents_summary, title, slug, " +
        "lead_id, project_id, solution_id, transcription_date, created_at",
    )
    .eq("id", transcriptionId)
    .maybeSingle();
  if (error) throw pgError("indexTranscription.select", { table: "voice_transcriptions", resource_id: transcriptionId }, error);
  if (!data) throw new Error(`Transcription ${transcriptionId} not found`);

  const t = data as {
    id: string;
    workspace_id: string | null;
    raw_transcript: string | null;
    ai_documents_summary: string | null;
    title: string | null;
    slug: string | null;
    lead_id: string | null;
    project_id: string | null;
    solution_id: string | null;
    transcription_date: string | null;
    created_at: string | null;
  };

  if (!t.workspace_id) {
    throw new Error(`Transcription ${transcriptionId} has no workspace_id`);
  }

  const title = t.title || `Transcription ${t.id.slice(0, 8)}`;
  const slug = t.slug || t.id;
  const sourceDate = t.transcription_date || t.created_at;
  const entityLinks = buildEntityLinks([
    { type: "voice_transcription", id: t.id },
    { type: "lead", id: t.lead_id },
    { type: "project", id: t.project_id },
    { type: "solution", id: t.solution_id },
  ]);

  // 1) Effacer les anciens chunks pour cette transcription (idempotent)
  await supabase
    .from("resource_embeddings")
    .delete()
    .eq("parent_resource_id", t.id)
    .in("resource_type", ["transcription_chunk", "transcription_summary"]);

  // Aussi nettoyer les anciennes lignes qui utilisaient resource_id=t.id sans parent
  await supabase
    .from("resource_embeddings")
    .delete()
    .eq("resource_id", t.id)
    .in("resource_type", ["transcription_chunk", "transcription_summary"]);

  let totalChunks = 0;

  // 2) Indexer la synthèse Nicolas (1 seul chunk, chunk_index=0)
  if (t.ai_documents_summary && t.ai_documents_summary.trim().length > 50) {
    const summaryText = t.ai_documents_summary.trim().slice(0, 8000);
    const [embedding] = await embedTexts([summaryText]);
    await supabase.from("resource_embeddings").upsert(
      {
        resource_id: t.id,
        resource_type: "transcription_summary",
        resource_title: `Synthèse — ${title}`,
        resource_slug: slug,
        content_chunk: summaryText,
        chunk_index: 0,
        embedding,
        workspace_id: t.workspace_id,
        entity_links: entityLinks,
        temporal_weight: computeTemporalWeight(sourceDate),
        source_date: sourceDate,
        parent_resource_id: t.id,
        metadata: { kind: "summary", title, slug },
      },
      { onConflict: "resource_id,chunk_index" },
    );
    totalChunks++;
  }

  // 3) Chunker le raw_transcript et indexer
  if (t.raw_transcript && t.raw_transcript.trim().length > 100) {
    const chunks = chunkText(t.raw_transcript, CHUNK_SIZE, CHUNK_OVERLAP).slice(
      0,
      MAX_CHUNKS_PER_DOC,
    );

    // Pour éviter collision avec le summary (resource_id=t.id, chunk_index=0),
    // les chunks utilisent un resource_id dérivé déterministe (UUID v5-like via hash).
    // Solution simple : on crée un resource_id distinct par chunk en concaténant
    // t.id et un offset, mais la colonne est UUID — on génère un UUID stable par chunk.
    // → Utilisation de la unique key (resource_id, chunk_index) avec resource_id = t.id
    //   pour les chunks aussi, mais on offsette chunk_index à partir de 1.
    //
    // Donc : summary = chunk_index 0, chunks = chunk_index 1..N.

    // Batch les embeddings
    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const embeddings = await embedTexts(batch);

      const rows = batch.map((text, j) => {
        const globalIndex = i + j;
        return {
          resource_id: t.id,
          resource_type: "transcription_chunk",
          resource_title: `${title} — extrait ${globalIndex + 1}`,
          resource_slug: slug,
          content_chunk: text,
          chunk_index: globalIndex + 1, // +1 car index 0 réservé au summary
          embedding: embeddings[j],
          workspace_id: t.workspace_id,
          entity_links: entityLinks,
          temporal_weight: computeTemporalWeight(sourceDate),
          speaker: null, // segments hétérogènes, speaker non extrait au Sprint 1
          source_date: sourceDate,
          parent_resource_id: t.id,
          metadata: {
            kind: "chunk",
            title,
            slug,
            chunk_position: globalIndex,
            total_chunks: chunks.length,
          },
        };
      });

      const { error: upErr } = await supabase
        .from("resource_embeddings")
        .upsert(rows, { onConflict: "resource_id,chunk_index" });
      if (upErr) throw pgError("indexTranscription.upsert_chunks", { table: "resource_embeddings", resource_type: "transcription_chunk", resource_id: t.id, workspace_id: t.workspace_id, batch_size: rows.length, chunk_index_start: rows[0]?.chunk_index, chunk_index_end: rows[rows.length - 1]?.chunk_index }, upErr);
      totalChunks += rows.length;
    }
  }

  return { transcription_id: t.id, chunks: totalChunks };
}

// ─── Handler : lead ─────────────────────────────────────────────────────────

async function indexLead(
  supabase: ReturnType<typeof createClient>,
  leadId: string,
) {
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, workspace_id, name, company, position, industry, ai_documents_summary, " +
        "message, source_context, status, slug, updated_at, created_at",
    )
    .eq("id", leadId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Lead ${leadId} not found`);

  const l = data as {
    id: string;
    workspace_id: string | null;
    name: string | null;
    company: string | null;
    position: string | null;
    industry: string | null;
    ai_documents_summary: string | null;
    message: string | null;
    source_context: string | null;
    status: string | null;
    slug: string | null;
    updated_at: string | null;
    created_at: string | null;
  };
  if (!l.workspace_id) throw new Error(`Lead ${leadId} has no workspace_id`);

  const header = [
    l.name && `Contact : ${l.name}`,
    l.position && `Poste : ${l.position}`,
    l.company && `Société : ${l.company}`,
    l.industry && `Secteur : ${l.industry}`,
    l.status && `Statut : ${l.status}`,
  ].filter(Boolean).join("\n");

  const body = [
    header,
    l.message && `Message initial :\n${l.message}`,
    l.source_context && `Contexte source :\n${l.source_context}`,
    l.ai_documents_summary && `Synthèse Nicolas :\n${l.ai_documents_summary}`,
  ].filter(Boolean).join("\n\n").trim();

  if (body.length < 30) return { lead_id: l.id, chunks: 0 };

  const title = l.name ? `Lead — ${l.name}${l.company ? " · " + l.company : ""}` : `Lead ${l.id.slice(0,8)}`;
  const slug = l.slug || l.id;
  const sourceDate = l.updated_at || l.created_at;
  const entityLinks = buildEntityLinks([{ type: "lead", id: l.id }]);

  await supabase
    .from("resource_embeddings")
    .delete()
    .eq("parent_resource_id", l.id)
    .eq("resource_type", "lead_summary");

  const chunks = chunkText(body, CHUNK_SIZE, CHUNK_OVERLAP).slice(0, MAX_CHUNKS_PER_DOC);
  let total = 0;
  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedTexts(batch);
    const rows = batch.map((text, j) => ({
      resource_id: l.id,
      resource_type: "lead_summary",
      resource_title: title,
      resource_slug: slug,
      content_chunk: text,
      chunk_index: i + j,
      embedding: embeddings[j],
      workspace_id: l.workspace_id,
      entity_links: entityLinks,
      temporal_weight: computeTemporalWeight(sourceDate),
      source_date: sourceDate,
      parent_resource_id: l.id,
      metadata: { kind: "lead_summary", title, slug },
    }));
    const { error: upErr } = await supabase
      .from("resource_embeddings")
      .upsert(rows, { onConflict: "resource_id,chunk_index" });
    if (upErr) throw upErr;
    total += rows.length;
  }
  return { lead_id: l.id, chunks: total };
}

// ─── Handler : opportunity ──────────────────────────────────────────────────

async function indexOpportunity(
  supabase: ReturnType<typeof createClient>,
  oppId: string,
) {
  const { data, error } = await supabase
    .from("opportunities")
    .select(
      "id, workspace_id, lead_id, title, description, stage, value_amount, " +
        "probability, ai_metadata, updated_at, created_at",
    )
    .eq("id", oppId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Opportunity ${oppId} not found`);

  const o = data as {
    id: string;
    workspace_id: string | null;
    lead_id: string | null;
    title: string | null;
    description: string | null;
    stage: string | null;
    value_amount: number | null;
    probability: number | null;
    ai_metadata: Record<string, unknown> | null;
    updated_at: string | null;
    created_at: string | null;
  };
  if (!o.workspace_id) throw new Error(`Opportunity ${oppId} has no workspace_id`);

  const meta = o.ai_metadata || {};
  const narrative = (meta as { narrative?: string }).narrative;
  const evidence = (meta as { evidence?: string }).evidence;

  const body = [
    o.title && `Opportunité : ${o.title}`,
    o.stage && `Étape : ${o.stage}`,
    o.value_amount != null && `Montant : ${o.value_amount} €`,
    o.probability != null && `Probabilité : ${o.probability}%`,
    o.description && `Description :\n${o.description}`,
    narrative && `Narratif :\n${narrative}`,
    evidence && `Preuves :\n${evidence}`,
  ].filter(Boolean).join("\n\n").trim();

  if (body.length < 30) return { opportunity_id: o.id, chunks: 0 };

  const title = o.title || `Opportunité ${o.id.slice(0,8)}`;
  const sourceDate = o.updated_at || o.created_at;
  const entityLinks = buildEntityLinks([
    { type: "opportunity", id: o.id },
    { type: "lead", id: o.lead_id },
  ]);

  await supabase
    .from("resource_embeddings")
    .delete()
    .eq("parent_resource_id", o.id)
    .eq("resource_type", "opportunity");

  const chunks = chunkText(body, CHUNK_SIZE, CHUNK_OVERLAP).slice(0, MAX_CHUNKS_PER_DOC);
  let total = 0;
  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedTexts(batch);
    const rows = batch.map((text, j) => ({
      resource_id: o.id,
      resource_type: "opportunity",
      resource_title: title,
      resource_slug: o.id,
      content_chunk: text,
      chunk_index: i + j,
      embedding: embeddings[j],
      workspace_id: o.workspace_id,
      entity_links: entityLinks,
      temporal_weight: computeTemporalWeight(sourceDate),
      source_date: sourceDate,
      parent_resource_id: o.id,
      metadata: { kind: "opportunity", title, stage: o.stage },
    }));
    const { error: upErr } = await supabase
      .from("resource_embeddings")
      .upsert(rows, { onConflict: "resource_id,chunk_index" });
    if (upErr) throw upErr;
    total += rows.length;
  }
  return { opportunity_id: o.id, chunks: total };
}

// ─── Handler : entity_note (entity_context_notes + project_notes) ──────────

async function indexEntityNote(
  supabase: ReturnType<typeof createClient>,
  table: "entity_context_notes" | "project_notes",
  noteId: string,
) {
  const isProject = table === "project_notes";
  const cols = isProject
    ? "id, workspace_id, project_id, title, content, note_type, tags, updated_at, created_at"
    : "id, workspace_id, entity_type, entity_id, content, updated_at, created_at";
  const { data, error } = await supabase.from(table).select(cols).eq("id", noteId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Note ${noteId} not found in ${table}`);
  const n = data as Record<string, unknown>;
  const workspaceId = n.workspace_id as string | null;
  if (!workspaceId) throw new Error(`Note ${noteId} has no workspace_id`);

  const content = (n.content as string | null)?.trim() || "";
  if (content.length < 30) return { note_id: noteId, chunks: 0 };

  const embeddingType = isProject ? "project_note" : "entity_note";
  const sourceDate = (n.updated_at as string) || (n.created_at as string);
  let title: string;
  let entityLinks: { type: string; id: string }[];

  if (isProject) {
    title = (n.title as string | null) || `Note projet`;
    entityLinks = buildEntityLinks([
      { type: "project_note", id: noteId },
      { type: "project", id: (n.project_id as string | null) || null },
    ]);
  } else {
    const entType = n.entity_type as string | null;
    const entId = n.entity_id as string | null;
    title = `Note ${entType || "contexte"}`;
    entityLinks = buildEntityLinks([
      { type: "entity_note", id: noteId },
      { type: entType || "unknown", id: entId },
    ]);
  }

  await supabase
    .from("resource_embeddings")
    .delete()
    .eq("parent_resource_id", noteId)
    .eq("resource_type", embeddingType);

  const chunks = chunkText(content, CHUNK_SIZE, CHUNK_OVERLAP).slice(0, MAX_CHUNKS_PER_DOC);
  let total = 0;
  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedTexts(batch);
    const rows = batch.map((text, j) => ({
      resource_id: noteId,
      resource_type: embeddingType,
      resource_title: title,
      resource_slug: noteId,
      content_chunk: text,
      chunk_index: i + j,
      embedding: embeddings[j],
      workspace_id: workspaceId,
      entity_links: entityLinks,
      temporal_weight: computeTemporalWeight(sourceDate),
      source_date: sourceDate,
      parent_resource_id: noteId,
      metadata: { kind: embeddingType, title },
    }));
    const { error: upErr } = await supabase
      .from("resource_embeddings")
      .upsert(rows, { onConflict: "resource_id,chunk_index" });
    if (upErr) throw upErr;
    total += rows.length;
  }
  return { note_id: noteId, chunks: total };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildEntityLinks(
  raw: { type: string; id: string | null }[],
): { type: string; id: string }[] {
  return raw.filter((x): x is { type: string; id: string } => !!x.id);
}

function computeTemporalWeight(sourceDate: string | null): number {
  if (!sourceDate) return 0.5;
  const days = Math.max(
    0,
    (Date.now() - new Date(sourceDate).getTime()) / 86_400_000,
  );
  if (days < 7) return 1.0;
  if (days > 90) return 0.3;
  // Decay linéaire entre 7j (1.0) et 90j (0.3)
  const w = 1.0 - ((days - 7) / 83) * 0.7;
  return Math.round(w * 1000) / 1000;
}

function chunkText(input: string, size: number, overlap: number): string[] {
  const text = input.replace(/\s+/g, " ").trim();
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    // Essayer de couper à la fin d'une phrase (.!?) ou à un espace
    if (end < text.length) {
      const slice = text.slice(start, end);
      const lastPunct = Math.max(
        slice.lastIndexOf(". "),
        slice.lastIndexOf("! "),
        slice.lastIndexOf("? "),
      );
      const lastSpace = slice.lastIndexOf(" ");
      const cut = lastPunct > size * 0.6 ? lastPunct + 1 : lastSpace > size * 0.6 ? lastSpace : -1;
      if (cut > 0) end = start + cut;
    }
    chunks.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter((c) => c.length > 20);
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: texts,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) {
      throw new Error("Rate limited by Lovable AI Gateway (429). Retry later.");
    }
    if (res.status === 402) {
      throw new Error("Payment required: add credits to Lovable AI workspace.");
    }
    throw new Error(`Embedding API ${res.status}: ${body}`);
  }

  const { data } = (await res.json()) as { data: { embedding: number[] }[] };
  return data.map((d) => d.embedding);
}
