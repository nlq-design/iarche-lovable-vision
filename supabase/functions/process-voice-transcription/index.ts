import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type VoiceJob = {
  id: string;
  workspace_id: string;
  storage_path: string;
  source: "upload" | "recording";
  lead_id: string | null;
  project_id: string | null;
  solution_id: string | null;
  status: string;
  auto_create_tasks: boolean;
  prompt_profile_id: string | null;
  created_by: string;
  ai_metadata: Record<string, unknown>;
};

async function openaiTranscribe(blob: Blob, language = "fr") {
  const form = new FormData();
  form.append("model", "whisper-1");
  form.append("language", language);
  form.append("response_format", "json");
  form.append("file", blob, "audio.m4a");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });

  const txt = await res.text();
  if (!res.ok) throw new Error(`openai_stt_failed: ${txt}`);
  return JSON.parse(txt);
}

async function loadPromptProfile(supabase: any, prompt_profile_id: string | null) {
  if (!prompt_profile_id) {
    const { data } = await supabase
      .from("ai_prompts")
      .select("id, system_prompt, user_prompt, output_schema, model_config")
      .eq("slug", "transcription_rdv_commercial")
      .limit(1);
    return data?.[0] ?? null;
  }

  const { data, error } = await supabase
    .from("ai_prompts")
    .select("id, system_prompt, user_prompt, output_schema, model_config")
    .eq("id", prompt_profile_id)
    .single();

  if (error) throw new Error(`prompt_profile_not_found: ${error.message}`);
  return data;
}

async function fetchEntityContext(supabase: any, job: VoiceJob) {
  let lead: any = null;
  let project: any = null;
  let solution: any = null;

  if (job.project_id) {
    const { data } = await supabase.from("projects").select("*").eq("id", job.project_id).single();
    project = data ?? null;
  }

  if (job.solution_id) {
    const { data } = await supabase
      .from("articles")
      .select("*")
      .eq("id", job.solution_id)
      .eq("resource_type", "solution")
      .single();
    solution = data ?? null;
  }

  // Cascade lead
  let leadId = job.lead_id;
  if (!leadId && project?.lead_id) leadId = project.lead_id;

  if (!leadId && job.solution_id) {
    const { data } = await supabase
      .from("solution_leads")
      .select("lead_id")
      .eq("solution_id", job.solution_id)
      .order("created_at", { ascending: false })
      .limit(1);
    leadId = data?.[0]?.lead_id ?? null;
  }

  if (leadId) {
    const { data } = await supabase.from("leads").select("*").eq("id", leadId).single();
    lead = data ?? null;
  }

  const activity = leadId
    ? (await supabase
        .from("activity_log")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(20)).data
    : [];

  const tasks = leadId
    ? (await supabase
        .from("tasks")
        .select("*")
        .eq("lead_id", leadId)
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(50)).data
    : [];

  return { lead, project, solution, leadId, activity: activity ?? [], tasks: tasks ?? [] };
}

function buildLLM(
  systemPrompt: string, 
  userPrompt: string | null, 
  transcriptText: string, 
  ctx: ReturnType<typeof fetchEntityContext> extends Promise<infer T> ? T : never, 
  schema: Record<string, unknown> | null
) {
  const payload = {
    transcript: transcriptText,
    crm_context: {
      lead: ctx.lead,
      project: ctx.project,
      solution: ctx.solution,
      recent_activity: ctx.activity,
      open_tasks: ctx.tasks,
    },
    output_schema: schema ?? null,
    rules: {
      json_only: true,
      no_hallucination: true,
      actions_only_if_explicit: true,
      unknown_to_null: true,
      max_executive_summary_words: 200,
    },
  };

  const sys = systemPrompt;
  const usr = userPrompt
    ? `${userPrompt}\n\nINPUT:\n${JSON.stringify(payload)}`
    : JSON.stringify(payload);

  return { sys, usr };
}

async function lovableSummarize(model: string, sys: string, usr: string) {
  const response = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: usr },
      ],
    }),
  });

  const txt = await response.text();
  
  // Handle rate limiting
  if (response.status === 429) {
    throw new Error("rate_limited: Too many requests, please try again later");
  }
  
  // Handle payment required
  if (response.status === 402) {
    throw new Error("credits_exhausted: Please add funds to your Lovable AI workspace");
  }
  
  if (!response.ok) throw new Error(`lovable_llm_failed: ${txt}`);

  const json = JSON.parse(txt);
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("lovable_llm_empty_content");

  try {
    return JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("lovable_llm_invalid_json");
    return JSON.parse(m[0]);
  }
}

async function createTasksFromActions(
  supabase: any, 
  job: VoiceJob, 
  summary: Record<string, unknown>, 
  leadId: string | null
): Promise<Array<{ id: string; title: string }>> {
  if (!job.auto_create_tasks) return [];

  const items = Array.isArray(summary?.action_items) ? summary.action_items : [];
  if (!items.length) return [];

  const inserts: Array<{
    workspace_id: string;
    title: string;
    task_type: string;
    priority: string;
    status: string;
    lead_id: string | null;
    project_id: string | null;
    entity_type: string;
    entity_id: string;
    created_by: string;
  }> = [];

  for (const it of items) {
    const title = (it?.task as string ?? "").trim();
    if (!title) continue;
    inserts.push({
      workspace_id: job.workspace_id,
      title: title.slice(0, 200),
      task_type: "follow_up",
      priority: (it?.priority as string) ?? "medium",
      status: "pending",
      lead_id: leadId,
      project_id: job.project_id,
      entity_type: "voice_transcription",
      entity_id: job.id,
      created_by: job.created_by,
    });
  }

  if (!inserts.length) return [];

  const { data, error } = await supabase.from("tasks").insert(inserts).select("id,title");
  if (error) throw new Error(`tasks_insert_failed: ${error.message}`);
  return data ?? [];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { job_id } = await req.json();
    if (!job_id) {
      return new Response(JSON.stringify({ error: "missing_job_id" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: job, error: jerr } = await supabase
      .from("voice_transcriptions")
      .select("*")
      .eq("id", job_id)
      .single();

    if (jerr || !job) {
      return new Response(JSON.stringify({ error: "job_not_found" }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const vjob = job as VoiceJob;
    if (vjob.status === "done") {
      return new Response(JSON.stringify({ ok: true, already_done: true }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log(`Processing voice transcription job: ${job_id}`);

    // Status -> transcribing
    await supabase.from("voice_transcriptions").update({ status: "transcribing" }).eq("id", job_id);

    // Signed URL + fetch audio
    const bucket = "voice-transcriptions";
    const { data: signed, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(vjob.storage_path, 120);
    
    if (signErr || !signed?.signedUrl) {
      throw new Error(`signed_url_failed: ${signErr?.message ?? "no_url"}`);
    }

    const audioRes = await fetch(signed.signedUrl);
    if (!audioRes.ok) throw new Error(`audio_fetch_failed: ${await audioRes.text()}`);

    const audioBlob = await audioRes.blob();
    console.log(`Audio fetched: ${audioBlob.size} bytes`);

    // STT with Whisper
    const stt = await openaiTranscribe(audioBlob, "fr");
    const rawText = stt.text ?? "";
    const segments = stt.segments ?? null;

    console.log(`Transcription completed: ${rawText.length} chars`);

    await supabase
      .from("voice_transcriptions")
      .update({
        raw_transcript: rawText,
        segments,
        status: "analyzing",
        ai_metadata: {
          ...(vjob.ai_metadata ?? {}),
          source: "openai-whisper",
          stt_model: "whisper-1",
          generated_at: new Date().toISOString(),
        },
      })
      .eq("id", job_id);

    // Context + cascade lead
    const ctx = await fetchEntityContext(supabase, vjob);
    console.log(`Context fetched: lead=${ctx.leadId}, project=${ctx.project?.id ?? null}`);

    // Prompt profile
    const profile = await loadPromptProfile(supabase, vjob.prompt_profile_id);
    const systemPrompt = profile?.system_prompt ?? "Return JSON only.";
    const userPrompt = profile?.user_prompt ?? null;
    const outputSchema = profile?.output_schema ?? null;
    const model = (profile?.model_config as Record<string, string>)?.model ?? "google/gemini-2.5-flash";

    const { sys, usr } = buildLLM(systemPrompt, userPrompt, rawText, ctx, outputSchema);

    // LLM summarize
    console.log(`Calling LLM with model: ${model}`);
    const summary = await lovableSummarize(model, sys, usr);
    console.log(`Summary generated with confidence: ${summary?.extraction_quality?.confidence ?? 'unknown'}`);

    // Tasks (optional)
    const createdTasks = await createTasksFromActions(supabase, vjob, summary, ctx.leadId);
    console.log(`Created ${createdTasks.length} tasks`);

    // Activity log
    await supabase.from("activity_log").insert({
      workspace_id: vjob.workspace_id,
      entity_type: "voice_transcription",
      entity_id: vjob.id,
      activity_type: "transcription_completed",
      content: `Transcription générée (${createdTasks.length} tâche(s) créée(s))`,
      lead_id: ctx.leadId,
      project_id: vjob.project_id,
      created_by: vjob.created_by,
      ai_metadata: {
        ...(vjob.ai_metadata ?? {}),
        stt_model: "whisper-1",
        llm_model: model,
        autonomy_level: "N0",
        confidence: summary?.extraction_quality?.confidence ?? null,
      },
    });

    // Done
    await supabase
      .from("voice_transcriptions")
      .update({
        summary,
        status: "done",
        ai_metadata: {
          ...(vjob.ai_metadata ?? {}),
          llm_model: model,
          autonomy_level: "N0",
          confidence: summary?.extraction_quality?.confidence ?? null,
          validated_by_human: false,
          validation_required: false,
        },
      })
      .eq("id", job_id);

    console.log(`Job ${job_id} completed successfully`);

    return new Response(JSON.stringify({ ok: true, job_id, created_tasks: createdTasks.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Process error:", e);
    
    // Try to update job status to error
    try {
      const { job_id } = await req.clone().json();
      if (job_id) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from("voice_transcriptions")
          .update({
            status: "error",
            ai_metadata: { last_error: String(e) },
          })
          .eq("id", job_id);
      }
    } catch {
      // Ignore cleanup errors
    }

    return new Response(JSON.stringify({ error: "process_failed", details: String(e) }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
