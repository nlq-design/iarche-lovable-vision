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
    // Helper to convert empty strings to null for UUID fields
    const toUuidOrNull = (val: unknown): string | null => {
      if (val === null || val === undefined || val === '') return null;
      return String(val);
    };

    const {
      workspace_id,
      storage_path,
      source,
      lead_id: rawLeadId,
      lead_contact_id: rawLeadContactId,
      project_id: rawProjectId,
      solution_id: rawSolutionId,
      meeting_note_id: rawMeetingNoteId,
      auto_create_tasks = false,
      prompt_profile_id: rawPromptProfileId,
      llm_model_id: rawLlmModelId,
      pre_transcribed_text = null,
      transcription_date = null,
      original_filename = null,
      file_size_bytes = null,
      duration_seconds = null,
      audio_format = null,
      analysis_context = null,
      expected_participants = null,
    } = body;

    // Convert empty strings to null for UUID fields
    const lead_id = toUuidOrNull(rawLeadId);
    const lead_contact_id = toUuidOrNull(rawLeadContactId);
    const project_id = toUuidOrNull(rawProjectId);
    const solution_id = toUuidOrNull(rawSolutionId);
    const meeting_note_id = toUuidOrNull(rawMeetingNoteId);
    const prompt_profile_id = toUuidOrNull(rawPromptProfileId);
    const llm_model_id = toUuidOrNull(rawLlmModelId);

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

    if (expected_participants?.length) {
      initialMetadata.expected_participants = expected_participants;
    }

    const { data, error } = await supabase
      .from("voice_transcriptions")
      .insert({
        workspace_id,
        storage_path,
        source,
        lead_id,
        lead_contact_id,
        project_id,
        solution_id,
        meeting_note_id,
        auto_create_tasks,
        prompt_profile_id,
        llm_model_id,
        transcription_date,
        original_filename,
        file_size_bytes,
        duration_seconds,
        audio_format,
        analysis_context, // Store analysis context
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
