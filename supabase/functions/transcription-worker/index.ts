import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkTranscriptionOnce } from "../_shared/assemblyai-utils.ts";

/**
 * transcription-worker v2.0 — Async Architecture
 * 
 * Cron-triggered worker (every 1-2 min):
 *   1. Poll transcribing jobs (check AssemblyAI status)
 *   2. Pick queued jobs and submit to process-voice-transcription
 *   3. Unstick truly stale jobs
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY")!;

const MAX_CONCURRENT = 3;
const STALE_TIMEOUT_MINUTES = 30; // Increased: async jobs legitimately take longer
const ANALYZING_STALE_MINUTES = 10; // LLM analysis shouldn't take >10 min

function log(msg: string) { console.log(`[worker] ${msg}`); }

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ============================
    // STEP 1: Poll transcribing jobs (check AssemblyAI completion)
    // ============================
    const { data: transcribingJobs } = await supabase
      .from("voice_transcriptions")
      .select("id, ai_metadata, storage_path")
      .eq("status", "transcribing")
      .limit(5);

    let polled = 0;
    let completed = 0;

    if (transcribingJobs?.length) {
      for (const job of transcribingJobs) {
        const meta = (job.ai_metadata ?? {}) as Record<string, unknown>;
        const assemblyaiId = meta.assemblyai_transcript_id as string | undefined;

        if (!assemblyaiId) {
          // No AssemblyAI ID — this is a stuck legacy job, reset it
          log(`Job ${job.id}: no assemblyai_transcript_id, resetting to queued`);
          await supabase.from("voice_transcriptions").update({
            status: "queued",
            ai_metadata: { ...meta, reset_reason: "no_assemblyai_id", reset_at: new Date().toISOString() },
          }).eq("id", job.id);
          continue;
        }

        polled++;
        try {
          const check = await checkTranscriptionOnce(assemblyaiId, ASSEMBLYAI_API_KEY);

          if (check.status === 'completed') {
            completed++;
            const result = check.result;

            // Format speaker transcript
            const rawText = result.utterances?.length
              ? result.utterances.map(u => `[Intervenant ${u.speaker}] ${u.text}`).join('\n')
              : result.text;

            // Build segments
            const segments = {
              words: result.words?.slice(0, 500),
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

            // Build AssemblyAI metadata
            const sentiments = result.sentiment_analysis_results;
            const assemblyMeta = {
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

            log(`Job ${job.id}: AssemblyAI completed! ${result.text.length} chars, ${assemblyMeta.speakers_count} speakers`);

            // Track AssemblyAI cost in api_usage_metrics
            const durationMin = (result.audio_duration ?? 60) / 60;
            const qualityMode = (meta.quality_mode as string) || "standard";
            const speechModel = qualityMode === "high" ? "best" : "nano";
            // Cost calculation: nano ~$0.10/min, best ~$0.37/min + features
            const baseCostPerMin = speechModel === "best" ? 0.37 : 0.10;
            const featureCost = speechModel === "best" ? 0.09 : 0; // sentiment + entity + chapters + safety
            const totalCostCents = Math.max(0.5, durationMin * (baseCostPerMin + featureCost) * 100);
            
            try {
              await supabase.from("api_usage_metrics").insert({
                workspace_id: '00000000-0000-0000-0000-000000000001',
                api_category: 'ai',
                api_name: 'assemblyai',
                provider_name: 'assemblyai',
                operation_type: 'transcription',
                model_id: `assemblyai-${speechModel}`,
                success: true,
                latency_ms: null, // async, no single latency
                estimated_cost_cents: Math.round(totalCostCents * 100) / 100,
                metadata: {
                  job_id: job.id,
                  audio_duration_s: result.audio_duration,
                  duration_min: Math.round(durationMin * 10) / 10,
                  transcript_length: result.text.length,
                  speakers: assemblyMeta.speakers_count,
                  quality_mode: qualityMode,
                  speech_model: speechModel,
                  language: result.language_code,
                },
              });
              log(`Job ${job.id}: Tracked cost ${totalCostCents.toFixed(1)}¢ (${speechModel}, ${durationMin.toFixed(1)}min)`);
            } catch (trackErr) {
              log(`Job ${job.id}: Cost tracking failed (non-blocking): ${trackErr}`);
            }
              raw_transcript: rawText,
              status: "analyzing",
              duration_seconds: result.audio_duration,
              segments,
              ai_metadata: { ...meta, ...assemblyMeta },
            }).eq("id", job.id);

            // Invoke LLM analysis phase (fire-and-forget)
            fetch(`${SUPABASE_URL}/functions/v1/process-voice-transcription`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({ job_id: job.id, force_reanalyze: true }),
            }).catch(e => log(`LLM invoke failed for ${job.id}: ${e}`));

          } else if (check.status === 'error') {
            log(`Job ${job.id}: AssemblyAI error: ${check.error}`);
            await supabase.from("voice_transcriptions").update({
              status: "error",
              ai_metadata: { ...meta, assemblyai_error: check.error, error_at: new Date().toISOString() },
            }).eq("id", job.id);

          } else {
            log(`Job ${job.id}: AssemblyAI still ${check.status}`);
          }
        } catch (pollErr) {
          log(`Job ${job.id}: poll error: ${pollErr instanceof Error ? pollErr.message : String(pollErr)}`);
        }
      }
    }

    // ============================
    // STEP 2: Unstick stale analyzing jobs (LLM timeout)
    // ============================
    const analyzingThreshold = new Date(Date.now() - ANALYZING_STALE_MINUTES * 60_000).toISOString();
    const { data: staleAnalyzing } = await supabase
      .from("voice_transcriptions")
      .select("id, updated_at")
      .eq("status", "analyzing")
      .lt("updated_at", analyzingThreshold)
      .limit(3);

    if (staleAnalyzing?.length) {
      log(`Found ${staleAnalyzing.length} stale analyzing job(s), resetting to done (transcript preserved)`);
      for (const job of staleAnalyzing) {
        // Don't reset to queued — transcript is already saved, just LLM failed
        // Set to done so user can manually re-analyze
        await supabase.from("voice_transcriptions").update({
          status: "done",
          ai_metadata: {
            reset_by_worker: true,
            reset_at: new Date().toISOString(),
            previous_status: "analyzing",
            reason: "llm_stale_timeout",
          },
        }).eq("id", job.id);
      }
    }

    // ============================
    // STEP 3: Unstick truly stale transcribing jobs (no progress for 30+ min)
    // ============================
    const staleThreshold = new Date(Date.now() - STALE_TIMEOUT_MINUTES * 60_000).toISOString();
    const { data: staleJobs } = await supabase
      .from("voice_transcriptions")
      .select("id, status, updated_at, ai_metadata")
      .eq("status", "transcribing")
      .lt("updated_at", staleThreshold)
      .limit(3);

    if (staleJobs?.length) {
      log(`Found ${staleJobs.length} stale transcribing job(s) (>30min), setting to error`);
      for (const job of staleJobs) {
        await supabase.from("voice_transcriptions").update({
          status: "error",
          ai_metadata: {
            ...(job.ai_metadata as any ?? {}),
            stale_timeout: true,
            reset_at: new Date().toISOString(),
            reason: "transcribing_stale_30min",
          },
        }).eq("id", job.id);
      }
    }

    // ============================
    // STEP 4: Pick oldest queued job and submit
    // ============================
    // Count active jobs (transcribing + analyzing)
    const { count: activeCount } = await supabase
      .from("voice_transcriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["transcribing", "analyzing"]);

    if ((activeCount ?? 0) >= MAX_CONCURRENT) {
      log(`${activeCount} job(s) active (polled=${polled}, completed=${completed}), skipping new submissions`);
      return new Response(JSON.stringify({
        ok: true, action: "poll_only",
        polled, completed, active: activeCount,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: nextJob, error: fetchErr } = await supabase
      .from("voice_transcriptions")
      .select("id, storage_path, status, created_at")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      log(`Fetch error: ${fetchErr.message}`);
      return new Response(JSON.stringify({ ok: false, error: fetchErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!nextJob) {
      log(`No queued jobs (polled=${polled}, completed=${completed})`);
      return new Response(JSON.stringify({
        ok: true, action: "idle", polled, completed,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    log(`Processing job ${nextJob.id} (created ${nextJob.created_at})`);

    // Determine strategy
    const { data: fullJob } = await supabase
      .from("voice_transcriptions")
      .select("raw_transcript, ai_metadata")
      .eq("id", nextJob.id)
      .single();

    const hasPreTranscript = !!fullJob?.raw_transcript?.trim();
    const isNoFile = nextJob.storage_path?.endsWith("_no_file");
    const isAssemblyAI = (fullJob?.ai_metadata as any)?.source === 'assemblyai';
    const metaFlags = (fullJob?.ai_metadata ?? {}) as Record<string, unknown>;

    const invokeBody: Record<string, unknown> = { job_id: nextJob.id };

    // Respect explicit user flags from ai_metadata (set by frontend)
    if (metaFlags.force_retranscribe === true) {
      invokeBody.force_retranscribe = true;
      log(`Job ${nextJob.id}: user requested force_retranscribe`);
    } else if (metaFlags.force_reanalyze === true) {
      invokeBody.force_reanalyze = true;
      log(`Job ${nextJob.id}: user requested force_reanalyze`);
    } else if (isNoFile) {
      invokeBody.force_reanalyze = true;
    } else if (isAssemblyAI && hasPreTranscript) {
      invokeBody.force_reanalyze = true;
    } else {
      invokeBody.force_retranscribe = true;
      log(`Job ${nextJob.id}: ${hasPreTranscript ? 'legacy transcript, forcing AssemblyAI' : 'new job, full pipeline'}`);
    }

    log(`Invoking process-voice-transcription: ${JSON.stringify(invokeBody)}`);

    const processResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-voice-transcription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(invokeBody),
    });

    let processResult: unknown;
    try {
      processResult = await processResponse.json();
    } catch {
      processResult = { status: processResponse.status, statusText: processResponse.statusText };
    }
    log(`process-voice-transcription response: ${JSON.stringify(processResult).slice(0, 200)}`);

    return new Response(JSON.stringify({
      ok: true, action: "processed",
      job_id: nextJob.id,
      polled, completed,
      result: processResult,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log(`Unexpected error: ${msg}`);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
