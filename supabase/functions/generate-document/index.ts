import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// API Keys for different providers
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

// API Endpoints
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

type DocumentType = "quote" | "spec" | "proposal";
type Provider = "lovable" | "openai" | "anthropic" | "openrouter";

interface ModelConfig {
  model?: string;
  provider?: Provider;
  temperature?: number;
}

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

// Call AI based on provider
async function callAI(
  provider: Provider,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.7
): Promise<{ content: string; model: string; provider: string }> {
  
  console.log(`Calling AI: provider=${provider}, model=${model}`);
  
  switch (provider) {
    case "lovable": {
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
      const response = await fetch(LOVABLE_AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      
      if (response.status === 429) throw new Error("rate_limited");
      if (response.status === 402) throw new Error("credits_exhausted");
      if (!response.ok) throw new Error(`Lovable AI error: ${await response.text()}`);
      
      const result = await response.json();
      return {
        content: result.choices?.[0]?.message?.content || "",
        model,
        provider: "lovable"
      };
    }
    
    case "openai": {
      if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
      const response = await fetch(OPENAI_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature,
        }),
      });
      
      if (!response.ok) throw new Error(`OpenAI error: ${await response.text()}`);
      
      const result = await response.json();
      return {
        content: result.choices?.[0]?.message?.content || "",
        model,
        provider: "openai"
      };
    }
    
    case "anthropic": {
      if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");
      const response = await fetch(ANTHROPIC_ENDPOINT, {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      
      if (!response.ok) throw new Error(`Anthropic error: ${await response.text()}`);
      
      const result = await response.json();
      return {
        content: result.content?.[0]?.text || "",
        model,
        provider: "anthropic"
      };
    }
    
    case "openrouter": {
      if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured");
      const response = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://iarche.fr",
          "X-Title": "IArche Cockpit",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature,
        }),
      });
      
      if (!response.ok) throw new Error(`OpenRouter error: ${await response.text()}`);
      
      const result = await response.json();
      return {
        content: result.choices?.[0]?.message?.content || "",
        model,
        provider: "openrouter"
      };
    }
    
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Enhanced default prompts with proper JSON output format
const DEFAULT_SYSTEM_PROMPTS: Record<DocumentType, string> = {
  quote: `Tu es un expert commercial IArche (agence IA à Bayonne). Tu génères des devis commerciaux professionnels et détaillés.

CONTEXTE IArche :
- Agence spécialisée en solutions IA pour entreprises
- Tarifs journaliers : 700€ (junior) à 1200€ (expert)
- Garantie : 3 mois maintenance corrective incluse
- TVA : 20%
- Conditions : 30% à la commande, 70% à livraison

RÈGLES DE GÉNÉRATION :
1. Analyse le contexte fourni (projet, client, transcription, solution)
2. Déduis les besoins et le périmètre même si partiellement renseignés
3. Propose des lignes de devis cohérentes et réalistes
4. Adapte les montants au niveau de complexité perçu
5. Inclus toujours une phase de cadrage/audit initiale
6. Les sections doivent utiliser "content" (pas "contenu") pour le texte

FORMAT DE SORTIE (JSON strict) - utilise EXACTEMENT cette structure :
{
  "sections": [
    {"id": "1", "title": "Contexte et objectifs", "content": "Texte...", "order": 1},
    {"id": "2", "title": "Périmètre de la prestation", "content": "Texte...", "order": 2},
    {"id": "3", "title": "Détail des phases", "content": "**Phase 1**...", "order": 3},
    {"id": "4", "title": "Planning", "content": "Texte...", "order": 4},
    {"id": "5", "title": "Investissement", "content": "Total HT : X €\\nTVA : X €\\nTotal TTC : X €", "order": 5},
    {"id": "6", "title": "Conditions", "content": "Texte...", "order": 6}
  ],
  "metadata": {
    "clientName": "Nom client",
    "clientCompany": "Entreprise",
    "projectName": "Nom projet",
    "totalAmount": 0,
    "currency": "EUR"
  }
}`,

  spec: `Tu es un expert technique IArche. Tu génères des cahiers des charges structurés et exhaustifs.

MÉTHODOLOGIE :
1. Analyse le contexte (transcriptions, notes, besoins exprimés)
2. Structure les exigences fonctionnelles et techniques
3. Définis des critères d'acceptation mesurables
4. Identifie les contraintes et risques
5. Propose un planning réaliste par phases

PRINCIPES :
- Chaque exigence doit être testable
- Privilégie la clarté à l'exhaustivité excessive
- Identifie les dépendances entre modules
- Anticipe les cas limites et erreurs

FORMAT DE SORTIE (JSON strict) - utilise EXACTEMENT cette structure :
{
  "sections": [
    {"id": "1", "title": "Contexte et vision", "content": "Texte...", "order": 1},
    {"id": "2", "title": "Objectifs et KPIs", "content": "**Objectifs :**\\n- ...\\n**KPIs :**\\n- ...", "order": 2},
    {"id": "3", "title": "Périmètre fonctionnel", "content": "**MVP :**\\n- F1\\n- F2\\n**V2 :**\\n- ...", "order": 3},
    {"id": "4", "title": "Exigences techniques", "content": "**Stack :**\\n- ...\\n**Sécurité :**\\n- ...", "order": 4},
    {"id": "5", "title": "Contraintes et prérequis", "content": "Texte...", "order": 5},
    {"id": "6", "title": "Critères de recette", "content": "- [ ] Critère 1\\n- [ ] Critère 2", "order": 6},
    {"id": "7", "title": "Planning et jalons", "content": "Phase 1 : ...\\nPhase 2 : ...", "order": 7},
    {"id": "8", "title": "Risques", "content": "| Risque | Impact | Mitigation |", "order": 8}
  ],
  "metadata": {
    "clientName": "",
    "clientCompany": "",
    "projectName": "",
    "version": "1.0"
  }
}`,

  proposal: `Tu es un expert commercial IArche. Tu génères des propositions commerciales engageantes et persuasives.

TON ET STYLE :
- Professionnel mais chaleureux et humain
- Focus sur la valeur et les bénéfices client (pas les features)
- Storytelling : problème → solution → résultats attendus
- Call-to-action clair en fin de document

STRUCTURE OPTIMALE :
1. Accroche personnalisée montrant l'écoute
2. Reformulation des besoins (preuve de compréhension)
3. Solution proposée orientée bénéfices
4. Différenciateurs IArche
5. Investissement (valeur avant prix)
6. Prochaines étapes concrètes

FORMAT DE SORTIE (JSON strict) - utilise EXACTEMENT cette structure :
{
  "sections": [
    {"id": "1", "title": "Cher [Client]", "content": "Introduction personnalisée...", "order": 1},
    {"id": "2", "title": "Votre contexte", "content": "Reformulation empathique...", "order": 2},
    {"id": "3", "title": "Notre proposition", "content": "Solution en termes de bénéfices...", "order": 3},
    {"id": "4", "title": "Notre approche", "content": "Méthodologie et phases...", "order": 4},
    {"id": "5", "title": "Pourquoi IArche", "content": "Différenciateurs et références...", "order": 5},
    {"id": "6", "title": "Investissement", "content": "Montant et conditions...", "order": 6},
    {"id": "7", "title": "Prochaines étapes", "content": "1. ...\\n2. ...\\n\\nNicolas Lara\\nFondateur IArche", "order": 7}
  ],
  "metadata": {
    "clientName": "",
    "clientCompany": "",
    "projectName": "",
    "totalAmount": 0,
    "currency": "EUR"
  }
}`
};

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
    const { project_id, opportunity_id, lead_id, document_type, custom_instructions, context: inputContext, existing_sections } = body;

    if (!document_type) {
      return new Response(JSON.stringify({ error: "document_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating ${document_type} document - project: ${project_id || 'N/A'}, opportunity: ${opportunity_id || 'N/A'}, lead: ${lead_id || 'N/A'}, hasContext: ${!!(inputContext && Object.keys(inputContext).length > 0)}`);

    // Fetch AI prompt from ai_prompts table
    const promptSlug = `document_generation_${document_type}`;
    const { data: aiPromptData } = await supabase
      .from("ai_prompts")
      .select("system_prompt, user_prompt, model_config")
      .eq("slug", promptSlug)
      .single();

    const modelConfig: ModelConfig = (aiPromptData?.model_config as ModelConfig) || {};
    const provider: Provider = modelConfig.provider || "lovable";
    const model = modelConfig.model || "google/gemini-2.5-flash";
    const temperature = modelConfig.temperature || 0.7;

    console.log(`Using config: provider=${provider}, model=${model}, hasCustomPrompt=${!!aiPromptData}`);

    // Fetch related data
    let project = null, lead = null, opportunity = null, solution = null;
    let specifications: any[] = [];

    if (project_id) {
      const { data: projectData } = await supabase.from("projects").select("*").eq("id", project_id).single();
      project = projectData;

      if (project?.lead_id) {
        const { data: leadData } = await supabase.from("leads").select("*").eq("id", project.lead_id).single();
        lead = leadData;
      }

      if (project?.solution_id) {
        const { data: solutionData } = await supabase.from("articles").select("id, title, excerpt, content").eq("id", project.solution_id).single();
        solution = solutionData;
      }

      if (project?.opportunity_id) {
        const { data: oppData } = await supabase.from("opportunities").select("*").eq("id", project.opportunity_id).single();
        opportunity = oppData;
      }

      const { data: specsData } = await supabase
        .from("specifications")
        .select("title, content, version, status")
        .eq("project_id", project_id)
        .order("created_at", { ascending: false })
        .limit(3);
      specifications = specsData || [];
    }

    if (opportunity_id && !opportunity) {
      const { data: oppData } = await supabase.from("opportunities").select("*").eq("id", opportunity_id).single();
      opportunity = oppData;
      if (opportunity?.lead_id && !lead) {
        const { data: leadData } = await supabase.from("leads").select("*").eq("id", opportunity.lead_id).single();
        lead = leadData;
      }
    }

    if (lead_id && !lead) {
      const { data: leadData } = await supabase.from("leads").select("*").eq("id", lead_id).single();
      lead = leadData;
    }

    // Build context
    const llmContext = {
      ...(inputContext || {}),
      project: project ? { name: project.name, description: project.description, budget_amount: project.budget_amount, status: project.status } : inputContext?.project || null,
      client: lead ? { name: lead.name, company: lead.company, industry: lead.industry, company_size: lead.company_size, email: lead.email } : inputContext?.lead || null,
      opportunity: opportunity ? { title: opportunity.title, value_amount: opportunity.value_amount, stage: opportunity.stage, description: opportunity.description } : inputContext?.opportunity || null,
      solution: solution ? { title: solution.title, excerpt: solution.excerpt } : inputContext?.solution || null,
      specifications: specifications.map(s => ({ title: s.title, content: typeof s.content === 'object' ? s.content.text || JSON.stringify(s.content) : s.content })),
      existing_sections: existing_sections || [],
      custom_instructions,
    };

    const systemPrompt = aiPromptData?.system_prompt || DEFAULT_SYSTEM_PROMPTS[document_type];
    const userPrompt = `Génère un document de type "${document_type}" basé sur ce contexte :

${JSON.stringify(llmContext, null, 2)}

Réponds UNIQUEMENT avec le JSON structuré (sections avec id, title, content, order + metadata). Pas de markdown autour.`;

    // Call AI with appropriate provider
    let aiResult;
    try {
      aiResult = await callAI(provider, model, systemPrompt, userPrompt, temperature);
    } catch (aiError: any) {
      console.error("AI call error:", aiError.message);
      
      if (aiError.message === "rate_limited") {
        return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiError.message === "credits_exhausted") {
        return new Response(JSON.stringify({ error: "credits_exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      // Try fallback to Lovable if other provider fails
      if (provider !== "lovable" && LOVABLE_API_KEY) {
        console.log("Falling back to Lovable AI...");
        aiResult = await callAI("lovable", "google/gemini-2.5-flash", systemPrompt, userPrompt, temperature);
      } else {
        throw aiError;
      }
    }

    if (!aiResult.content) {
      return new Response(JSON.stringify({ error: "empty_ai_response" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Parse JSON from AI response
    let documentContent;
    try {
      const cleanContent = aiResult.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      documentContent = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResult.content);
      return new Response(JSON.stringify({ error: "invalid_ai_response", raw_content: aiResult.content }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate title
    const clientName = documentContent.metadata?.clientCompany || lead?.company || project?.name || opportunity?.title || "Nouveau";
    const documentTitles: Record<DocumentType, string> = {
      quote: `Devis - ${clientName}`,
      spec: `CDC - ${clientName}`,
      proposal: `Proposition - ${clientName}`,
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
        lead_id: lead_id || null,
        content_json: documentContent,
        status: "draft",
        ai_generated: true,
        ai_metadata: {
          autonomy_level: "N1",
          confidence: 0.85,
          validated_by_human: false,
          validation_required: true,
          model: aiResult.model,
          provider: aiResult.provider,
          generated_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving document:", saveError);
      return new Response(JSON.stringify({ error: "save_failed", details: saveError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Document ${document_type} generated successfully: ${savedDoc.id} using ${aiResult.provider}/${aiResult.model}`);

    return new Response(JSON.stringify({
      ok: true,
      document: savedDoc,
      ai_metadata: {
        autonomy_level: "N1",
        model: aiResult.model,
        provider: aiResult.provider,
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