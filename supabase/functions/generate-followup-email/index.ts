import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callLLM } from "../_shared/ai-client.ts";
import { loadPrompt } from "../_shared/prompt-loader.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type EmailType = "first_contact" | "post_meeting" | "followup" | "proposal";

interface TranscriptionContext {
  transcript_summary?: string;
  key_points?: string[];
  action_items?: string[];
  next_steps?: string;
}

interface GenerateEmailRequest {
  transcription_id?: string;
  lead_id?: string | null;
  email_type: EmailType;
  context?: TranscriptionContext;
  custom_context?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const body: GenerateEmailRequest = await req.json();
    const { transcription_id, lead_id, email_type, context: transcriptionContext, custom_context } = body;

    if (!email_type) {
      return new Response(JSON.stringify({ error: "email_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load prompt from DB
    const prompt = await loadPrompt(supabase, "email-followup", {
      system_prompt: `Tu es un assistant commercial expert pour IArche, Architecte IA basé à Bayonne.

Tu génères des emails de suivi commerciaux professionnels, personnalisés et engageants.

RÈGLES :
- Ton professionnel mais chaleureux (vouvoiement systématique)
- Emails courts et impactants (max 150 mots)
- CTA clair et unique
- Mentionner les solutions IArche pertinentes si détectées
- Signature : "Nicolas Lara, Fondateur IArche"

TYPES D'EMAILS :
- first_contact : Premier contact suite à une demande entrante
- post_meeting : Suivi après un RDV
- followup : Relance après période d'inactivité
- proposal : Accompagnement d'une proposition commerciale

FORMAT DE SORTIE (JSON strict) :
{"subject": "...", "greeting": "...", "body": "...", "cta": "...", "cta_url": "...", "signature": "..."}`
    });

    let lead = null;
    let recentActivity: any[] = [];
    let linkedSolutions: any[] = [];
    let latestMeeting = null;

    if (lead_id) {
      const { data: leadData } = await supabase.from("leads").select("*").eq("id", lead_id).single();
      if (leadData) {
        lead = leadData;
        const { data: activityData } = await supabase.from("activity_log").select("activity_type, title, content, created_at").eq("lead_id", lead_id).order("created_at", { ascending: false }).limit(5);
        recentActivity = activityData || [];
        const { data: solutionsData } = await supabase.from("solution_leads").select(`interest_level, solution:articles(title, slug, excerpt)`).eq("lead_id", lead_id);
        linkedSolutions = solutionsData || [];
        const { data: meetingData } = await supabase.from("meeting_notes").select("objectives, notes, ai_summary, action_items").or(`lead_id.eq.${lead_id}`).order("created_at", { ascending: false }).limit(1).maybeSingle();
        latestMeeting = meetingData;
      }
    }

    const context = {
      lead: lead ? { name: lead.name, email: lead.email, company: lead.company, industry: lead.industry, source: lead.source, qualification_status: lead.qualification_status } : null,
      transcription: transcriptionContext || null,
      recent_activity: recentActivity,
      linked_solutions: linkedSolutions?.map((s: any) => ({ title: s.solution?.title, interest: s.interest_level })) || [],
      latest_meeting: latestMeeting ? { objectives: latestMeeting.objectives, summary: latestMeeting.ai_summary } : null,
      custom_context,
    };

    const userPrompt = `Génère un email de type "${email_type}" pour ce lead :\n\nCONTEXTE :\n${JSON.stringify(context, null, 2)}\n\nRéponds UNIQUEMENT avec le JSON.`;

    // Use centralized callLLM instead of direct API call
    const contentRaw = await callLLM(
      [
        { role: "system", content: prompt.system_prompt },
        { role: "user", content: userPrompt },
      ],
      { functionName: 'generate-followup-email' }
    );

    if (!contentRaw) {
      return new Response(JSON.stringify({ error: "empty_ai_response" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let emailData;
    try {
      const cleanContent = contentRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      emailData = JSON.parse(cleanContent);
    } catch {
      return new Response(JSON.stringify({ error: "invalid_ai_response", raw_content: contentRaw }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (lead_id) {
      await supabase.from("activity_log").insert({
        entity_type: "lead", entity_id: lead_id, lead_id,
        activity_type: "email_draft_generated",
        title: `Brouillon email "${email_type}" généré`,
        content: JSON.stringify(emailData),
        is_ai_generated: true,
        ai_metadata: { autonomy_level: "N1", confidence: 0.85, email_type, transcription_id: transcription_id || null, email_data: emailData, recipient_email: lead?.email },
        metadata: { draft_status: "pending_review", can_send: true, email_subject: emailData.subject },
        visibility: "internal",
        workspace_id: "00000000-0000-0000-0000-000000000001",
      });
    }

    return new Response(JSON.stringify({
      ok: true, email: emailData,
      lead_name: lead?.name || null, lead_email: lead?.email || null,
      ai_metadata: { autonomy_level: "N1", generated_at: new Date().toISOString() },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating email:", error);
    const message = (error as Error)?.message || "Unknown error";
    let statusCode = 500;
    if (message.includes('429')) statusCode = 429;
    else if (message.includes('402')) statusCode = 402;
    return new Response(JSON.stringify({ error: "internal_error", message }), {
      status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
