import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Chunked Transcription Callback
 * 
 * Called by the Fly.io worker when transcription is complete or failed.
 * Updates the voice_transcriptions table with results.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FLY_WORKER_SECRET = Deno.env.get("FLY_WORKER_SECRET");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify worker secret
  const authHeader = req.headers.get("authorization");
  if (FLY_WORKER_SECRET && authHeader !== `Bearer ${FLY_WORKER_SECRET}`) {
    console.error("[chunked-callback] Unauthorized callback attempt");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const payload = await req.json();
    const { 
      transcription_id, 
      status, 
      transcript_text, 
      chunks_info,
      error_message,
      processing_time_ms,
      total_duration_seconds,
    } = payload;

    if (!transcription_id) {
      return new Response(
        JSON.stringify({ error: "transcription_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[chunked-callback] Received callback for ${transcription_id}, status: ${status}`);

    // Fetch current transcription to merge metadata
    const { data: current } = await supabase
      .from("voice_transcriptions")
      .select("ai_metadata")
      .eq("id", transcription_id)
      .single();

    const existingMetadata = (current?.ai_metadata as Record<string, unknown>) || {};

    if (status === "completed") {
      // Success - update with transcript
      const updateData = {
        status: "completed",
        transcript_text: transcript_text || "",
        ai_metadata: {
          ...existingMetadata,
          processing_mode: "chunked",
          chunks_count: chunks_info?.length || 0,
          chunks_info,
          processing_time_ms,
          total_duration_seconds,
          completed_at: new Date().toISOString(),
        },
      };

      const { error: updateError } = await supabase
        .from("voice_transcriptions")
        .update(updateData)
        .eq("id", transcription_id);

      if (updateError) {
        console.error("[chunked-callback] Update error:", updateError);
        throw updateError;
      }

      console.log(`[chunked-callback] Successfully updated transcription ${transcription_id}`);

      // Log activity
      const { data: transcription } = await supabase
        .from("voice_transcriptions")
        .select("workspace_id, lead_id, project_id")
        .eq("id", transcription_id)
        .single();

      if (transcription) {
        await supabase.from("activity_log").insert({
          workspace_id: transcription.workspace_id,
          entity_type: "voice_transcription",
          entity_id: transcription_id,
          activity_type: "transcription_completed",
          title: "Transcription terminée (chunked)",
          content: `Transcription complète en ${chunks_info?.length || 0} segments`,
          lead_id: transcription.lead_id,
          project_id: transcription.project_id,
          metadata: { processing_mode: "chunked", chunks_count: chunks_info?.length },
        });
      }

    } else if (status === "failed") {
      // Failure - update with error
      const { error: updateError } = await supabase
        .from("voice_transcriptions")
        .update({
          status: "failed",
          ai_metadata: {
            ...existingMetadata,
            processing_mode: "chunked",
            last_error: error_message || "Unknown worker error",
            failed_at: new Date().toISOString(),
            processing_time_ms,
          },
        })
        .eq("id", transcription_id);

      if (updateError) {
        console.error("[chunked-callback] Update error:", updateError);
        throw updateError;
      }

      console.log(`[chunked-callback] Marked transcription ${transcription_id} as failed`);

    } else {
      // Progress update (optional)
      console.log(`[chunked-callback] Progress update for ${transcription_id}:`, payload);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[chunked-callback] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
