import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Transcribe Audio Chunk
 * 
 * Transcribes a single audio chunk (≤25MB) using Whisper API.
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

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";
const WHISPER_TIMEOUT_MS = 180_000; // 3 minutes for large chunks

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  if (!OPENAI_API_KEY) {
    console.error("[transcribe-audio-chunk] OPENAI_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "openai_api_key_not_configured" }),
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

    // Check size limit (Whisper max is 25MB)
    if (audioFile.size > 25 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ 
          error: "chunk_too_large", 
          message: `Chunk ${chunkIndex} exceeds 25MB limit (${fileSizeMB.toFixed(2)} MB)` 
        }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get proper file extension for Whisper API
    const getExtension = (mime: string): string => {
      const map: Record<string, string> = {
        'audio/wav': 'wav', 'audio/wave': 'wav', 'audio/x-wav': 'wav',
        'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
        'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a',
        'audio/ogg': 'ogg', 'audio/webm': 'webm',
        'audio/flac': 'flac', 'audio/x-flac': 'flac',
      };
      return map[mime.toLowerCase()] || 'wav';
    };

    const ext = getExtension(audioFile.type);
    const fileName = `chunk_${chunkIndex}.${ext}`;
    
    // Create a new File with proper name (Whisper requires filename with extension)
    const namedFile = new File([audioFile], fileName, { type: audioFile.type });
    
    console.log(`[transcribe-audio-chunk] Sending to Whisper: ${fileName}, type: ${audioFile.type}`);

    // Prepare request to Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append("file", namedFile, fileName);
    whisperFormData.append("model", "whisper-1");
    whisperFormData.append("language", language);
    whisperFormData.append("response_format", "text");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("timeout"), WHISPER_TIMEOUT_MS);

    try {
      const startTime = Date.now();
      
      const response = await fetch(WHISPER_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: whisperFormData,
        signal: controller.signal,
      });

      const processingTime = Date.now() - startTime;
      console.log(`[transcribe-audio-chunk] Whisper responded in ${processingTime}ms, status: ${response.status}`);

      if (response.status === 413) {
        return new Response(
          JSON.stringify({ 
            error: "whisper_file_too_large", 
            message: "File exceeds Whisper API limit" 
          }),
          { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[transcribe-audio-chunk] Whisper error: ${response.status}`, errorText);
        return new Response(
          JSON.stringify({ 
            error: "whisper_api_error", 
            message: errorText.slice(0, 500),
            status: response.status
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const transcriptText = (await response.text()).trim();
      console.log(`[transcribe-audio-chunk] Chunk ${chunkIndex} transcribed: ${transcriptText.length} chars`);

      return new Response(
        JSON.stringify({ 
          ok: true,
          chunk_index: chunkIndex,
          transcript: transcriptText,
          processing_time_ms: processingTime,
          file_size_bytes: audioFile.size,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } finally {
      clearTimeout(timeout);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[transcribe-audio-chunk] Error:", errorMessage);
    
    if (errorMessage.includes("timeout") || errorMessage.includes("abort")) {
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
