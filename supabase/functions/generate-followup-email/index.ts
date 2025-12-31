import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const body: GenerateEmailRequest = await req.json();
    const { transcription_id, lead_id, email_type, context: transcriptionContext, custom_context } = body;

    if (!email_type) {
      return new Response(JSON.stringify({ error: "email_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating ${email_type} email${lead_id ? ` for lead: ${lead_id}` : ' from transcription'}`);

    let lead = null;
    let recentActivity: any[] = [];
    let linkedSolutions: any[] = [];
    let latestMeeting = null;

    // Fetch lead data if lead_id provided
    if (lead_id) {
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .select("*")
        .eq("id", lead_id)
        .single();

      if (!leadError && leadData) {
        lead = leadData;

        // Fetch recent activity
        const { data: activityData } = await supabase
          .from("activity_log")
          .select("activity_type, title, content, created_at")
          .eq("lead_id", lead_id)
          .order("created_at", { ascending: false })
          .limit(5);
        recentActivity = activityData || [];

        // Fetch linked solutions
        const { data: solutionsData } = await supabase
          .from("solution_leads")
          .select(`
            interest_level,
            solution:articles(title, slug, excerpt)
          `)
          .eq("lead_id", lead_id);
        linkedSolutions = solutionsData || [];

        // Fetch latest meeting note
        const { data: meetingData } = await supabase
          .from("meeting_notes")
          .select("objectives, notes, ai_summary, action_items")
          .or(`lead_id.eq.${lead_id}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        latestMeeting = meetingData;
      }
    }

    // Build context for LLM - prioritize transcription context if provided
    const context = {
      lead: lead ? {
        name: lead.name,
        email: lead.email,
        company: lead.company,
        industry: lead.industry,
        source: lead.source,
        source_context: lead.source_context,
        message: lead.message,
        qualification_status: lead.qualification_status,
        last_contacted_at: lead.last_contacted_at,
      } : null,
      transcription: transcriptionContext ? {
        summary: transcriptionContext.transcript_summary,
        key_points: transcriptionContext.key_points,
        action_items: transcriptionContext.action_items,
        next_steps: transcriptionContext.next_steps,
      } : null,
      recent_activity: recentActivity,
      linked_solutions: linkedSolutions?.map((s: any) => ({
        title: s.solution?.title,
        interest: s.interest_level,
        excerpt: s.solution?.excerpt,
      })) || [],
      latest_meeting: latestMeeting ? {
        objectives: latestMeeting.objectives,
        summary: latestMeeting.ai_summary,
        action_items: latestMeeting.action_items,
      } : null,
      custom_context,
    };

    // System prompt for email generation
    const systemPrompt = `Tu es un assistant commercial expert pour IArche, agence IA basée à Bayonne.

Tu génères des emails de suivi commerciaux professionnels, personnalisés et engageants.

RÈGLES :
- Ton professionnel mais chaleureux (tutoiement évité, vouvoiement systématique)
- Emails courts et impactants (max 150 mots)
- CTA clair et unique
- Mentionner les solutions IArche pertinentes si détectées
- Signature : "Nicolas Lara, Fondateur IArche"

TYPES D'EMAILS :
- first_contact : Premier contact suite à une demande entrante
- post_meeting : Suivi après un RDV (remercier, résumer les points clés, prochaines étapes)
- followup : Relance après période d'inactivité
- proposal : Accompagnement d'une proposition commerciale

FORMAT DE SORTIE (JSON strict) :
{
  "subject": "Objet de l'email",
  "greeting": "Formule d'accroche personnalisée",
  "body": "Corps de l'email (HTML autorisé pour mise en forme)",
  "cta": "Texte du bouton CTA",
  "cta_url": "URL du CTA (calendrier, solution, contact)",
  "signature": "Signature complète"
}`;

    const userPrompt = `Génère un email de type "${email_type}" pour ce lead :

CONTEXTE :
${JSON.stringify(context, null, 2)}

Réponds UNIQUEMENT avec le JSON, sans markdown.`;

    // Call Lovable AI
    const response = await fetch(LOVABLE_AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", errorText);
      return new Response(JSON.stringify({ error: "ai_generation_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "empty_ai_response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse JSON from AI response
    let emailData;
    try {
      // Clean potential markdown wrapping
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      emailData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ 
        error: "invalid_ai_response",
        raw_content: content 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log activity only if we have a lead
    if (lead_id) {
      await supabase.from("activity_log").insert({
        entity_type: "lead",
        entity_id: lead_id,
        lead_id: lead_id,
        activity_type: "email_draft_generated",
        title: `Brouillon email "${email_type}" généré`,
        content: emailData.subject,
        is_ai_generated: true,
        ai_metadata: {
          autonomy_level: "N1",
          confidence: 0.85,
          validated_by_human: false,
          validation_required: true,
          email_type,
          transcription_id: transcription_id || null,
          model: "google/gemini-2.5-flash",
          generated_at: new Date().toISOString(),
        },
        visibility: "internal",
        workspace_id: "00000000-0000-0000-0000-000000000001",
      });
    }

    console.log(`Email draft generated successfully${lead_id ? ` for lead ${lead_id}` : ''}`);

    return new Response(JSON.stringify({
      ok: true,
      email: emailData,
      lead_name: lead?.name || null,
      lead_email: lead?.email || null,
      ai_metadata: {
        autonomy_level: "N1",
        model: "google/gemini-2.5-flash",
        generated_at: new Date().toISOString(),
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating email:", error);
    return new Response(JSON.stringify({ 
      error: "internal_error",
      message: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
