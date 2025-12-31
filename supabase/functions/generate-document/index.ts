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

type DocumentType = "quote" | "spec" | "proposal";

interface GenerateDocumentRequest {
  project_id?: string;
  opportunity_id?: string;
  lead_id?: string;
  document_type: DocumentType;
  custom_instructions?: string;
  context?: Record<string, any>;
  existing_sections?: Array<{ title: string; content: string }>;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: GenerateDocumentRequest = await req.json();
    const { project_id, opportunity_id, lead_id, document_type, custom_instructions, context: inputContext, existing_sections, metadata: inputMetadata } = body;

    if (!document_type) {
      return new Response(JSON.stringify({ error: "document_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Accept project_id, opportunity_id, lead_id, OR context (for direct AI generation)
    const hasEntityLink = project_id || opportunity_id || lead_id || (inputContext && Object.keys(inputContext).length > 0);
    if (!hasEntityLink) {
      return new Response(JSON.stringify({ error: "project_id, opportunity_id, lead_id, or context required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating ${document_type} document for project: ${project_id || 'N/A'}, opportunity: ${opportunity_id || 'N/A'}`);

    // Fetch project data
    let project = null;
    let lead = null;
    let opportunity = null;
    let specifications: any[] = [];
    let solution = null;

    if (project_id) {
      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .eq("id", project_id)
        .single();
      project = projectData;

      if (project?.lead_id) {
        const { data: leadData } = await supabase
          .from("leads")
          .select("*")
          .eq("id", project.lead_id)
          .single();
        lead = leadData;
      }

      if (project?.solution_id) {
        const { data: solutionData } = await supabase
          .from("articles")
          .select("id, title, excerpt, content")
          .eq("id", project.solution_id)
          .single();
        solution = solutionData;
      }

      if (project?.opportunity_id) {
        const { data: oppData } = await supabase
          .from("opportunities")
          .select("*")
          .eq("id", project.opportunity_id)
          .single();
        opportunity = oppData;
      }

      // Fetch specifications
      const { data: specsData } = await supabase
        .from("specifications")
        .select("title, content, version, status")
        .eq("project_id", project_id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(3);
      specifications = specsData || [];
    }

    if (opportunity_id && !opportunity) {
      const { data: oppData } = await supabase
        .from("opportunities")
        .select("*")
        .eq("id", opportunity_id)
        .single();
      opportunity = oppData;

      if (opportunity?.lead_id && !lead) {
        const { data: leadData } = await supabase
          .from("leads")
          .select("*")
          .eq("id", opportunity.lead_id)
          .single();
        lead = leadData;
      }
    }

    // Fetch lead directly if lead_id provided and no lead yet
    if (lead_id && !lead) {
      const { data: leadData } = await supabase
        .from("leads")
        .select("*")
        .eq("id", lead_id)
        .single();
      lead = leadData;
    }

    // Build context for LLM - merge with input context from client
    const llmContext = {
      ...(inputContext || {}),
      project: project ? {
        name: project.name,
        description: project.description,
        budget_amount: project.budget_amount,
        status: project.status,
      } : inputContext?.project || null,
      client: lead ? {
        name: lead.name,
        company: lead.company,
        industry: lead.industry,
        company_size: lead.company_size,
        email: lead.email,
      } : inputContext?.lead || null,
      opportunity: opportunity ? {
        title: opportunity.title,
        value_amount: opportunity.value_amount,
        stage: opportunity.stage,
        description: opportunity.description,
      } : inputContext?.opportunity || null,
      solution: solution ? {
        title: solution.title,
        excerpt: solution.excerpt,
      } : inputContext?.solution || null,
      specifications: specifications.length > 0 ? specifications.map(s => ({
        title: s.title,
        content: typeof s.content === 'object' ? s.content.text || JSON.stringify(s.content) : s.content,
      })) : [],
      existing_sections: existing_sections || [],
      custom_instructions,
    };

    // System prompts by document type
    const systemPrompts: Record<DocumentType, string> = {
      quote: `Tu es un expert commercial IArche (agence IA à Bayonne). Tu génères des devis commerciaux professionnels.

RÈGLES STRICTES :
- Format JSON structuré uniquement
- Montants en euros, HT
- Délais réalistes
- Conditions de paiement : 30% acompte, 70% à livraison
- Garantie : 3 mois de maintenance corrective incluse
- TVA : 20%

FORMAT DE SORTIE (JSON strict) :
{
  "reference": "DEV-AAAA-XXX",
  "client": { "name": "", "company": "", "address": "" },
  "date_emission": "YYYY-MM-DD",
  "date_validite": "YYYY-MM-DD",
  "objet": "Description courte du projet",
  "lignes": [
    { "description": "", "quantite": 1, "unite": "forfait", "prix_unitaire_ht": 0, "total_ht": 0 }
  ],
  "total_ht": 0,
  "tva": 0,
  "total_ttc": 0,
  "conditions": {
    "paiement": "30% à la commande, 70% à livraison",
    "validite": "30 jours",
    "delai_realisation": "X semaines"
  },
  "notes": "Notes additionnelles"
}`,
      spec: `Tu es un expert technique IArche. Tu génères des cahiers des charges structurés.

RÈGLES STRICTES :
- Structure claire avec sections numérotées
- Spécifications fonctionnelles et techniques
- Critères d'acceptation mesurables
- Contraintes et prérequis explicites

FORMAT DE SORTIE (JSON strict) :
{
  "titre": "CDC - Nom du projet",
  "version": "1.0",
  "date": "YYYY-MM-DD",
  "sections": [
    {
      "numero": "1",
      "titre": "Contexte et objectifs",
      "contenu": "Description..."
    },
    {
      "numero": "2", 
      "titre": "Périmètre fonctionnel",
      "sous_sections": [
        { "numero": "2.1", "titre": "Fonctionnalités principales", "contenu": "" }
      ]
    },
    {
      "numero": "3",
      "titre": "Exigences techniques",
      "contenu": ""
    },
    {
      "numero": "4",
      "titre": "Contraintes et prérequis",
      "contenu": ""
    },
    {
      "numero": "5",
      "titre": "Critères d'acceptation",
      "contenu": ""
    },
    {
      "numero": "6",
      "titre": "Planning prévisionnel",
      "contenu": ""
    }
  ],
  "annexes": []
}`,
      proposal: `Tu es un expert commercial IArche. Tu génères des propositions commerciales engageantes.

RÈGLES :
- Ton professionnel mais chaleureux
- Mise en avant de la valeur ajoutée
- Structure claire : contexte, solution, bénéfices, investissement, prochaines étapes

FORMAT DE SORTIE (JSON strict) :
{
  "titre": "Proposition commerciale",
  "client": { "name": "", "company": "" },
  "date": "YYYY-MM-DD",
  "executive_summary": "Résumé exécutif (2-3 phrases)",
  "sections": [
    { "titre": "Compréhension de vos besoins", "contenu": "" },
    { "titre": "Notre solution", "contenu": "" },
    { "titre": "Bénéfices attendus", "contenu": "" },
    { "titre": "Investissement", "contenu": "" },
    { "titre": "Méthodologie et planning", "contenu": "" },
    { "titre": "Pourquoi IArche", "contenu": "" }
  ],
  "prochaines_etapes": ["Étape 1", "Étape 2"],
  "contact": {
    "name": "Nicolas Lara",
    "role": "Fondateur IArche",
    "email": "contact@iarche.fr"
  }
}`,
    };

    const userPrompt = `Génère un document de type "${document_type}" basé sur ce contexte :

${JSON.stringify(llmContext, null, 2)}

Réponds UNIQUEMENT avec le JSON structuré, sans markdown ni commentaires.`;

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
          { role: "system", content: systemPrompts[document_type] },
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
    let documentContent;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      documentContent = JSON.parse(cleanContent);
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

    // Generate title
    const documentTitles: Record<DocumentType, string> = {
      quote: `Devis - ${project?.name || opportunity?.title || 'Nouveau'}`,
      spec: `CDC - ${project?.name || 'Nouveau'}`,
      proposal: `Proposition - ${project?.name || opportunity?.title || 'Nouveau'}`,
    };

    // Save to database
    const { data: savedDoc, error: saveError } = await supabase
      .from("generated_documents")
      .insert({
        workspace_id: "00000000-0000-0000-0000-000000000001",
        document_type,
        title: documentTitles[document_type],
        project_id: project_id || null,
        opportunity_id: opportunity_id || null,
        content_json: documentContent,
        status: "draft",
        ai_generated: true,
        ai_metadata: {
          autonomy_level: "N1",
          confidence: 0.85,
          validated_by_human: false,
          validation_required: true,
          model: "google/gemini-2.5-flash",
          generated_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving document:", saveError);
      return new Response(JSON.stringify({ error: "save_failed", details: saveError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Document ${document_type} generated successfully: ${savedDoc.id}`);

    return new Response(JSON.stringify({
      ok: true,
      document: savedDoc,
      ai_metadata: {
        autonomy_level: "N1",
        model: "google/gemini-2.5-flash",
        generated_at: new Date().toISOString(),
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating document:", error);
    return new Response(JSON.stringify({ 
      error: "internal_error",
      message: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
