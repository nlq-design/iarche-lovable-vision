import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * transcription-worker v1.0
 * 
 * Cron-triggered worker that processes queued voice transcriptions server-side.
 * Picks the oldest "queued" job and invokes process-voice-transcription.
 * 
 * This eliminates the need for users to stay on the page during transcription.
 * Designed to be called every 1-2 minutes via pg_cron.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_CONCURRENT = 1; // Process one at a time to avoid overloading
const STALE_TIMEOUT_MINUTES = 10; // Consider jobs stale after 10 min in processing states

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. Unstick stale jobs (stuck in transcribing/analyzing for too long)
    const staleThreshold = new Date(Date.now() - STALE_TIMEOUT_MINUTES * 60_000).toISOString();
    
    const { data: staleJobs } = await supabase
      .from("voice_transcriptions")
      .select("id, status, updated_at")
      .in("status", ["transcribing", "analyzing"])
      .lt("updated_at", staleThreshold)
      .limit(5);

    if (staleJobs?.length) {
      console.log(`[worker] Found ${staleJobs.length} stale job(s), resetting to queued`);
      for (const job of staleJobs) {
        await supabase.from("voice_transcriptions").update({
          status: "queued",
          ai_metadata: {
            reset_by_worker: true,
            reset_at: new Date().toISOString(),
            previous_status: job.status,
          },
        }).eq("id", job.id);
      }
    }

    // 2. Check how many jobs are currently processing
    const { count: activeCount } = await supabase
      .from("voice_transcriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["transcribing", "analyzing"]);

    if ((activeCount ?? 0) >= MAX_CONCURRENT) {
      console.log(`[worker] ${activeCount} job(s) already processing, skipping`);
      return new Response(JSON.stringify({ 
        ok: true, 
        action: "skip", 
        reason: "max_concurrent_reached",
        active: activeCount,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Pick the oldest queued job
    const { data: nextJob, error: fetchErr } = await supabase
      .from("voice_transcriptions")
      .select("id, storage_path, status, created_at")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      console.error("[worker] Fetch error:", fetchErr.message);
      return new Response(JSON.stringify({ ok: false, error: fetchErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!nextJob) {
      console.log("[worker] No queued jobs");
      return new Response(JSON.stringify({ ok: true, action: "idle", message: "No queued jobs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[worker] Processing job ${nextJob.id} (created ${nextJob.created_at})`);

    // 4. Determine transcription strategy based on source
    const { data: fullJob } = await supabase
      .from("voice_transcriptions")
      .select("raw_transcript, ai_metadata")
      .eq("id", nextJob.id)
      .single();

    const hasPreTranscript = !!fullJob?.raw_transcript?.trim();
    const isNoFile = nextJob.storage_path?.endsWith("_no_file");
    const isAssemblyAI = (fullJob?.ai_metadata as any)?.source === 'assemblyai';

    // 5. Invoke process-voice-transcription
    const invokeBody: Record<string, unknown> = { job_id: nextJob.id };
    
    if (isNoFile) {
      // No audio file — LLM analysis only on existing text
      invokeBody.force_reanalyze = true;
    } else if (isAssemblyAI && hasPreTranscript) {
      // Already transcribed by AssemblyAI — just re-analyze with LLM
      invokeBody.force_reanalyze = true;
    } else {
      // New job OR legacy transcript (Whisper/other) — full AssemblyAI pipeline
      // This ensures all non-AssemblyAI transcripts get properly re-transcribed
      invokeBody.force_retranscribe = true;
      console.log(`[worker] Job ${nextJob.id}: ${hasPreTranscript ? 'legacy transcript detected, forcing AssemblyAI re-transcription' : 'new job, full pipeline'}`);
    }

    console.log(`[worker] Invoking process-voice-transcription: ${JSON.stringify(invokeBody)}`);

    const processResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-voice-transcription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(invokeBody),
    });

    const processResult = await processResponse.json();
    console.log(`[worker] process-voice-transcription response: ${JSON.stringify(processResult).slice(0, 200)}`);

    return new Response(JSON.stringify({
      ok: true,
      action: "processed",
      job_id: nextJob.id,
      result: processResult,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[worker] Unexpected error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
