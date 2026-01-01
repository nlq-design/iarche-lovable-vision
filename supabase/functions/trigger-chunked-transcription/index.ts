import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Trigger Chunked Transcription (Webhook to Fly.io Worker)
 * 
 * This edge function is triggered when a transcription job is queued
 * and the file exceeds the Whisper API limit (25MB).
 * 
 * It calls the Fly.io worker to:
 * 1. Download the file from Supabase Storage
 * 2. Split into chunks using FFmpeg
 * 3. Transcribe each chunk via Whisper
 * 4. Merge results and update the database
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FLY_WORKER_URL = Deno.env.get("FLY_WORKER_URL"); // e.g., https://iarche-transcription-worker.fly.dev
const FLY_WORKER_SECRET = Deno.env.get("FLY_WORKER_SECRET"); // Shared secret for webhook auth

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { transcription_id } = await req.json();

    if (!transcription_id) {
      return new Response(
        JSON.stringify({ error: "transcription_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[trigger-chunked-transcription] Processing job: ${transcription_id}`);

    // Fetch transcription details
    const { data: transcription, error: fetchError } = await supabase
      .from("voice_transcriptions")
      .select("*")
      .eq("id", transcription_id)
      .single();

    if (fetchError || !transcription) {
      console.error("[trigger-chunked-transcription] Transcription not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Transcription not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if worker URL is configured
    if (!FLY_WORKER_URL) {
      console.error("[trigger-chunked-transcription] FLY_WORKER_URL not configured");
      
      // Update status to failed with helpful message
      await supabase
        .from("voice_transcriptions")
        .update({
          status: "failed",
          ai_metadata: {
            ...((transcription.ai_metadata as Record<string, unknown>) || {}),
            last_error: "WORKER_NOT_CONFIGURED: Chunked transcription worker not available. Configure FLY_WORKER_URL.",
            failed_at: new Date().toISOString(),
          },
        })
        .eq("id", transcription_id);

      return new Response(
        JSON.stringify({ 
          error: "Worker not configured",
          details: "Set FLY_WORKER_URL and FLY_WORKER_SECRET in Supabase secrets"
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a signed URL for the worker to download the file
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("voice-transcriptions")
      .createSignedUrl(transcription.storage_path, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("[trigger-chunked-transcription] Failed to generate signed URL:", signedUrlError);
      throw new Error("Failed to generate signed URL for file");
    }

    // Update status to processing
    await supabase
      .from("voice_transcriptions")
      .update({
        status: "processing",
        ai_metadata: {
          ...((transcription.ai_metadata as Record<string, unknown>) || {}),
          processing_mode: "chunked",
          worker_triggered_at: new Date().toISOString(),
        },
      })
      .eq("id", transcription_id);

    // Call the Fly.io worker
    console.log(`[trigger-chunked-transcription] Calling worker at ${FLY_WORKER_URL}`);
    
    const workerPayload = {
      transcription_id,
      signed_url: signedUrlData.signedUrl,
      file_type: transcription.file_type,
      original_filename: transcription.original_filename,
      callback_url: `${SUPABASE_URL}/functions/v1/chunked-transcription-callback`,
      supabase_url: SUPABASE_URL,
      // The worker will use its own service role key configured as env var
    };

    const workerResponse = await fetch(`${FLY_WORKER_URL}/transcribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FLY_WORKER_SECRET || ""}`,
      },
      body: JSON.stringify(workerPayload),
    });

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error("[trigger-chunked-transcription] Worker error:", workerResponse.status, errorText);
      
      // Update status to failed
      await supabase
        .from("voice_transcriptions")
        .update({
          status: "failed",
          ai_metadata: {
            ...((transcription.ai_metadata as Record<string, unknown>) || {}),
            last_error: `WORKER_ERROR: ${workerResponse.status} - ${errorText.slice(0, 200)}`,
            failed_at: new Date().toISOString(),
          },
        })
        .eq("id", transcription_id);

      return new Response(
        JSON.stringify({ error: "Worker failed", details: errorText.slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workerResult = await workerResponse.json();
    console.log("[trigger-chunked-transcription] Worker accepted job:", workerResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Chunked transcription job queued",
        job_id: workerResult.job_id || transcription_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[trigger-chunked-transcription] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
