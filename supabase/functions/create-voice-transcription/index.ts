import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "missing_auth" }), { 
      status: 401, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  try {
    const { data: u, error: uerr } = await supabase.auth.getUser();
    if (uerr || !u?.user) {
      return new Response(JSON.stringify({ error: "invalid_auth" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const body = await req.json();
    const {
      workspace_id,
      storage_path,
      source,
      lead_id = null,
      project_id = null,
      solution_id = null,
      meeting_note_id = null,
      auto_create_tasks = false,
      prompt_profile_id = null,
      llm_model_id = null,
      pre_transcribed_text = null, // For client-side chunked transcription
      transcription_date = null,
    } = body;

    console.log(`Creating voice transcription job for workspace: ${workspace_id}`);

    // If pre_transcribed_text is provided, skip to analyzing phase
    const initialStatus = pre_transcribed_text ? "analyzing" : "queued";
    const initialMetadata: Record<string, unknown> = {
      autonomy_level: "N0",
      validated_by_human: false,
      validation_required: false,
    };

    if (pre_transcribed_text) {
      initialMetadata.chunked_client_side = true;
      initialMetadata.pre_transcribed = true;
    }

    const { data, error } = await supabase
      .from("voice_transcriptions")
      .insert({
        workspace_id,
        storage_path,
        source,
        lead_id,
        project_id,
        solution_id,
        meeting_note_id,
        auto_create_tasks,
        prompt_profile_id,
        llm_model_id,
        transcription_date,
        created_by: u.user.id,
        status: initialStatus,
        raw_transcript: pre_transcribed_text, // Store pre-transcribed text
        ai_metadata: initialMetadata,
      })
      .select("id,status,created_at")
      .single();

    if (error) {
      console.error("DB insert error:", error);
      return new Response(JSON.stringify({ error: "db_insert_failed", details: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log(`Voice transcription job created: ${data.id}`);

    return new Response(JSON.stringify({ ok: true, job: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: "unexpected_error", details: String(e) }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
