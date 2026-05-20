import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { trackAPIUsage } from "../_shared/api-tracker.ts";
import { transcribeWithAssemblyAI, getDefaultTranscriptionOptions } from "../_shared/assemblyai-utils.ts";

/**
 * Transcribe Audio Chunk (v11.0)
 * 
 * Transcribes a single audio chunk using AssemblyAI with all features enabled.
 * Used by the client-side chunking system for large files.
 * 
 * Expected body: FormData with:
 * - file: Audio blob
 * - language: (optional) Language code, null for auto-detect
 * - chunk_index: (optional) Index of the chunk for ordering
 * - word_boost: (optional) JSON array of custom vocabulary terms
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  if (!ASSEMBLYAI_API_KEY) {
    console.error("[transcribe-audio-chunk] ASSEMBLYAI_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "assemblyai_api_key_not_configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("file") as File | null;
    const language = formData.get("language") as string | null;
    const chunkIndex = parseInt((formData.get("chunk_index") as string) || "0", 10);
    const wordBoostRaw = formData.get("word_boost") as string | null;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "missing_file", message: "Audio file is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse custom vocabulary if provided
    let wordBoost: string[] = [];
    if (wordBoostRaw) {
      try { wordBoost = JSON.parse(wordBoostRaw); } catch { /* ignore */ }
    }

    const fileSizeMB = audioFile.size / (1024 * 1024);
    console.log(`[transcribe-audio-chunk] Processing chunk ${chunkIndex}, size: ${fileSizeMB.toFixed(2)} MB, type: ${audioFile.type}`);

    const audioData = await audioFile.arrayBuffer();
    const startTime = Date.now();

    // Use all AssemblyAI features
    const options = getDefaultTranscriptionOptions({
      language_code: language === "auto" || !language ? null : language,
      word_boost: wordBoost.length > 0 ? wordBoost : undefined,
      maxWaitMs: 300_000,
    });

    const result = await transcribeWithAssemblyAI(audioData, ASSEMBLYAI_API_KEY, options);

    const processingTime = Date.now() - startTime;
    console.log(`[transcribe-audio-chunk] Chunk ${chunkIndex} transcribed in ${processingTime}ms: ${result.text.length} chars, lang=${result.language_code}`);

    // Track API usage
    try {
      const durationMin = (result.audio_duration ?? 60) / 60;
      await trackAPIUsage({
        workspaceId: '00000000-0000-0000-0000-000000000001',
        apiCategory: 'ai',
        apiName: 'assemblyai',
        providerName: 'assemblyai',
        operationType: 'transcription',
        modelId: 'assemblyai-best',
        success: true,
        latencyMs: processingTime,
        estimatedCostCents: Math.max(0.6, durationMin * 0.617),
        metadata: {
          chunk_index: chunkIndex,
          file_size_mb: fileSizeMB,
          transcript_length: result.text.length,
          audio_duration_s: result.audio_duration,
          language_detected: result.language_code,
          features: {
            speech_model: "best",
            sentiment_analysis: !!result.sentiment_analysis_results?.length,
            entity_detection: !!result.entities?.length,
            auto_chapters: !!result.chapters?.length,
            content_safety: !!result.content_safety_labels,
            speaker_labels: !!result.utterances?.length,
          },
        },
      });
    } catch (e) {
      console.error('[transcribe-audio-chunk] Tracking error (non-blocking):', e);
    }

    // Suivi vocal per-user (scalabilité observabilité)
    try {
      const authHeader = req.headers.get('Authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      let userId: string | null = null;
      if (token && token.split('.').length === 3) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
          userId = payload?.sub ?? null;
        } catch { /* ignore */ }
      }
      const workspaceIdHeader = (formData.get('workspace_id') as string | null) || '00000000-0000-0000-0000-000000000001';
      if (userId) {
        const durationS = Math.round(result.audio_duration ?? 0);
        const costUsd = (durationS / 60) * 0.00617; // assemblyai-best ~0.617 cents/min
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (supabaseUrl && serviceKey) {
          await fetch(`${supabaseUrl}/rest/v1/rpc/bump_voice_usage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              p_user_id: userId,
              p_workspace_id: workspaceIdHeader,
              p_seconds: durationS,
              p_cost_usd: costUsd,
            }),
          });
        }
      }
    } catch (e) {
      console.warn('[transcribe-audio-chunk] voice_usage tracking skipped:', (e as Error).message);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        chunk_index: chunkIndex,
        transcript: result.text,
        processing_time_ms: processingTime,
        file_size_bytes: audioFile.size,
        audio_duration: result.audio_duration,
        language_code: result.language_code,
        // Enriched data
        words: result.words,
        utterances: result.utterances,
        sentiment_analysis_results: result.sentiment_analysis_results,
        entities: result.entities,
        chapters: result.chapters,
        content_safety_labels: result.content_safety_labels,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[transcribe-audio-chunk] Error:", errorMessage);

    if (errorMessage.includes("TIMEOUT") || errorMessage.includes("timeout")) {
      return new Response(
        JSON.stringify({ error: "timeout", message: "Transcription timed out" }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "unexpected_error", message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
