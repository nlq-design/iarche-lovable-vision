import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { trackAPIUsage } from "../_shared/api-tracker.ts";
import { transcribeWithAssemblyAI } from "../_shared/assemblyai-utils.ts";

/**
 * Transcribe Audio Chunk
 * 
 * Transcribes a single audio chunk using AssemblyAI.
 * Used by the client-side chunking system for large files.
 * 
 * Expected body: FormData with:
 * - file: Audio blob
 * - language: (optional) Language code, default 'fr'
 * - chunk_index: (optional) Index of the chunk for ordering
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
    const language = (formData.get("language") as string) || "fr";
    const chunkIndex = parseInt((formData.get("chunk_index") as string) || "0", 10);

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "missing_file", message: "Audio file is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileSizeMB = audioFile.size / (1024 * 1024);
    console.log(`[transcribe-audio-chunk] Processing chunk ${chunkIndex}, size: ${fileSizeMB.toFixed(2)} MB, type: ${audioFile.type}`);

    // Read the full file into memory
    const audioData = await audioFile.arrayBuffer();

    const startTime = Date.now();

    const result = await transcribeWithAssemblyAI(
      audioData,
      ASSEMBLYAI_API_KEY,
      {
        language_code: language,
        maxWaitMs: 300_000, // 5 min max for a chunk
      }
    );

    const processingTime = Date.now() - startTime;
    console.log(`[transcribe-audio-chunk] Chunk ${chunkIndex} transcribed in ${processingTime}ms: ${result.text.length} chars`);

    // Track API usage for AssemblyAI
    try {
      // AssemblyAI pricing: ~$0.37/hour ($0.00617/min)
      const durationMin = (result.audio_duration ?? 60) / 60;
      await trackAPIUsage({
        workspaceId: '00000000-0000-0000-0000-000000000001',
        apiCategory: 'ai',
        apiName: 'assemblyai',
        providerName: 'assemblyai',
        operationType: 'transcription',
        modelId: 'assemblyai-default',
        success: true,
        latencyMs: processingTime,
        estimatedCostCents: Math.max(0.6, durationMin * 0.617),
        metadata: { chunk_index: chunkIndex, file_size_mb: fileSizeMB, transcript_length: result.text.length, audio_duration_s: result.audio_duration },
      });
    } catch (e) {
      console.error('[transcribe-audio-chunk] Tracking error (non-blocking):', e);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        chunk_index: chunkIndex,
        transcript: result.text,
        processing_time_ms: processingTime,
        file_size_bytes: audioFile.size,
        audio_duration: result.audio_duration,
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
