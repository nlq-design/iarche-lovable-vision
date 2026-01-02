import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Serve Transcription Audio
 * 
 * Serves audio files for transcriptions by slug.
 * This ensures each transcription audio file has a unique URL.
 * 
 * Usage: GET /serve-transcription-audio?slug=transcription-20260102-1430
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    const id = url.searchParams.get('id');

    if (!slug && !id) {
      return new Response(
        JSON.stringify({ error: "missing_identifier", message: "slug or id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch transcription by slug or id
    let query = supabase
      .from("voice_transcriptions")
      .select("id, slug, storage_path, source");

    if (slug) {
      query = query.eq("slug", slug);
    } else if (id) {
      query = query.eq("id", id);
    }

    const { data: transcription, error: fetchError } = await query.single();

    if (fetchError || !transcription) {
      console.error("[serve-transcription-audio] Not found:", slug || id, fetchError);
      return new Response(
        JSON.stringify({ error: "not_found", message: "Transcription not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!transcription.storage_path) {
      return new Response(
        JSON.stringify({ error: "no_audio", message: "No audio file for this transcription" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[serve-transcription-audio] Serving: ${transcription.slug} -> ${transcription.storage_path}`);

    // Generate signed URL for the audio file
    const { data: signedUrlData, error: signError } = await supabase.storage
      .from("voice-transcriptions")
      .createSignedUrl(transcription.storage_path, 3600); // 1 hour expiry

    if (signError || !signedUrlData?.signedUrl) {
      console.error("[serve-transcription-audio] Sign error:", signError);
      return new Response(
        JSON.stringify({ error: "storage_error", message: "Failed to generate audio URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return JSON with audio URL and metadata
    return new Response(
      JSON.stringify({
        ok: true,
        slug: transcription.slug,
        id: transcription.id,
        audio_url: signedUrlData.signedUrl,
        source: transcription.source,
        expires_in: 3600,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[serve-transcription-audio] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
