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

interface BillingEntity {
  id: string;
  name: string;
  legal_form: string | null;
  siren: string | null;
  tva_number: string | null;
  rcs_city: string | null;
  capital_amount: number | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  primary_color: string | null;
  default_tva_rate: number | null;
  default_validity_days: number | null;
  default_payment_terms: any;
  quote_prefix: string | null;
  quote_format: string | null;
  current_quote_sequence: number | null;
  cgv_template_id: string | null;
}

interface CgvTemplate {
  id: string;
  name: string;
  content_html: string;
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
  billing_entity_id?: string;
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

// Build billing entity context for prompts
function buildBillingEntityContext(entity: BillingEntity | null): string {
  if (!entity) return "Aucune société émettrice sélectionnée";
  
  const parts = [];
  parts.push(`**Société émettrice:** ${entity.name}`);
  if (entity.legal_form) parts.push(`Forme juridique: ${entity.legal_form}`);
  if (entity.siren) parts.push(`SIREN: ${entity.siren}`);
  if (entity.tva_number) parts.push(`N° TVA: ${entity.tva_number}`);
  if (entity.rcs_city) parts.push(`RCS: ${entity.rcs_city}`);
  if (entity.capital_amount) parts.push(`Capital: ${entity.capital_amount.toLocaleString('fr-FR')} €`);
  if (entity.address) parts.push(`Adresse: ${entity.address}, ${entity.postal_code} ${entity.city}`);
  if (entity.email) parts.push(`Email: ${entity.email}`);
  if (entity.phone) parts.push(`Tél: ${entity.phone}`);
  if (entity.website) parts.push(`Site: ${entity.website}`);
  if (entity.default_tva_rate) parts.push(`Taux TVA par défaut: ${entity.default_tva_rate}%`);
  if (entity.default_validity_days) parts.push(`Validité devis: ${entity.default_validity_days} jours`);
  if (entity.default_payment_terms) {
    const terms = entity.default_payment_terms;
    if (terms.deposit_percent) parts.push(`Acompte: ${terms.deposit_percent}%`);
    if (terms.balance_percent) parts.push(`Solde: ${terms.balance_percent}%`);
  }
  
  return parts.join('\n');
}

// Enhanced default prompts with billing entity support
function getSystemPrompt(documentType: DocumentType, billingEntity: BillingEntity | null, cgvTemplate: CgvTemplate | null): string {
  const billingContext = buildBillingEntityContext(billingEntity);
  
  const basePrompts: Record<DocumentType, string> = {
    quote: `Tu es un expert commercial senior spécialisé dans la rédaction de devis B2B de haute qualité.
Tu génères UNIQUEMENT du JSON valide, sans texte avant ou après.

## SOCIÉTÉ ÉMETTRICE
${billingContext}

## OBJECTIF
Produire un devis professionnel, juridiquement propre, orienté valeur client, immédiatement exploitable comme document contractuel B2B.
Niveau de qualité équivalent à un devis/facture rédigé manuellement par un prestataire expérimenté.

## TON & STYLE
- Professionnel et sobre
- Vocabulaire commercial précis (pas de jargon IA)
- Orienté valeur et bénéfices client
- Zéro discours marketing superflu

## STRUCTURE DU JSON DE SORTIE

{
  "sections": [
    {
      "id": "header",
      "title": "En-tête",
      "content": "<div class='quote-parties'><div class='quote-emitter'><h3>ÉMETTEUR</h3><p><strong>[Raison sociale]</strong></p><p>[Forme juridique] au capital de [Montant] €</p><p>[Adresse complète]</p><p>SIREN : [N°] | TVA : [N°]</p><p>Email : [email] | Tél : [téléphone]</p></div><div class='quote-receiver'><h3>DESTINATAIRE</h3><p><strong>[Nom contact]</strong></p><p>[Fonction si connue]</p><p><strong>[Raison sociale client]</strong></p><p>[Adresse client si connue]</p><p>Email : [email client]</p></div></div>",
      "order": 1
    },
    {
      "id": "object",
      "title": "Objet",
      "content": "<h3>Objet : [Titre orienté valeur]</h3><p>[Description claire en 2-3 lignes : finalité business + périmètre fonctionnel + bénéfice client attendu]</p><p><strong>Exemple de formulation :</strong> Mise en place d'une solution digitale sur mesure intégrant des fonctionnalités d'intelligence artificielle pour l'optimisation de [processus métier] et l'amélioration de [bénéfice client].</p>",
      "order": 2
    },
    {
      "id": "services",
      "title": "Prestations",
      "content": "<table class='services-table'><thead><tr><th>Description</th><th>Qté</th><th>Unité</th><th>P.U. HT</th><th>Total HT</th></tr></thead><tbody>[LIGNES DE PRESTATIONS]</tbody></table>",
      "order": 3
    },
    {
      "id": "totals",
      "title": "Totaux",
      "content": "<div class='quote-totals-wrapper'><table class='quote-totals-table'><tr><td>Total HT</td><td>[Montant] €</td></tr><tr><td>TVA [taux]%</td><td>[Montant TVA] €</td></tr><tr class='total-row'><td><strong>Total TTC</strong></td><td><strong>[Montant TTC] €</strong></td></tr></table></div>",
      "order": 4
    },
    {
      "id": "payment",
      "title": "Conditions",
      "content": "<div class='payment-section'><h4>Conditions de paiement</h4><ul><li><strong>Validité de l'offre :</strong> [X] jours à compter de la date d'émission</li><li><strong>Acompte :</strong> [X]% à la commande, soit [Montant] € TTC</li><li><strong>Solde :</strong> [X]% à la livraison/recette, soit [Montant] € TTC</li><li><strong>Délai de paiement :</strong> [X] jours date de facture</li><li><strong>Escompte :</strong> Aucun escompte accordé pour paiement anticipé</li><li><strong>Pénalités de retard :</strong> 3 fois le taux d'intérêt légal + indemnité forfaitaire de 40 € pour frais de recouvrement</li></ul></div><div class='clauses-section'><h4>Engagements</h4><ul><li><strong>Confidentialité :</strong> Les parties s'engagent à garder confidentielles toutes les informations échangées</li><li><strong>Garantie :</strong> Garantie corrective de [X] mois sur les livrables</li><li><strong>CGV :</strong> Ce devis est soumis aux Conditions Générales de Vente en annexe</li></ul></div><div class='signature-block'><h4>Bon pour accord</h4><p>Devis reçu et accepté sans réserve.</p><p>Date : ____/____/________</p><p>Nom et qualité du signataire :</p><p>Signature précédée de la mention « Bon pour accord » :</p><br/><br/><br/></div>",
      "order": 5
    }
  ],
  "metadata": {
    "clientName": "[Nom contact]",
    "clientCompany": "[Entreprise]",
    "projectName": "[Nom projet]",
    "quoteDate": "${new Date().toLocaleDateString('fr-FR')}",
    "totalHT": [Nombre],
    "tvaRate": ${billingEntity?.default_tva_rate || 20},
    "tvaAmount": [Nombre],
    "totalTTC": [Nombre],
    "currency": "EUR",
    "validityDays": ${billingEntity?.default_validity_days || 30}
  }
}

## RÈGLES POUR LA SECTION "SERVICES"

Chaque ligne de prestation DOIT contenir :
1. **Description** : Titre clair de la phase + description courte (1-2 lignes max) orientée livrables
   - Format HTML : <td><strong>Phase X - [Intitulé clair]</strong><br/><small>[Description des livrables attendus, logique métier compréhensible]</small></td>
2. **Qté** : Quantité numérique
3. **Unité** : jours | heures | forfait | mois | unité
4. **P.U. HT** : Prix unitaire formaté "X XXX,XX €"
5. **Total HT** : Qté × P.U. HT formaté "X XXX,XX €"

Séparer clairement :
- Les phases projet (conception, développement, déploiement)
- Les licences/outils (si applicable)
- La formation/accompagnement (si applicable)

## RÈGLES CRITIQUES

1. **Aucun placeholder** : Remplace [texte] par les vraies valeurs fournies. Si une donnée manque, invente une valeur réaliste cohérente.
2. **Cohérence des calculs** : Total ligne = Qté × P.U. HT | Total HT = Σ lignes | TVA = Total HT × taux | TTC = HT + TVA
3. **Format monétaire français** : X XXX,XX € (espace milliers, virgule décimale)
4. **JSON pur** : Aucun texte avant/après le JSON
5. **IDs obligatoires** : "header", "object", "services", "totals", "payment"
6. **Formulations professionnelles** : Éviter les termes vagues, jargon IA inutile, redondances`,

    spec: `Tu es un architecte solution senior. Tu génères des Cahiers des Charges (CDC) de niveau professionnel.

INSTRUCTION CRITIQUE : Tu DOIS générer IMMÉDIATEMENT le JSON du CDC. Ne pose JAMAIS de questions. Utilise les données fournies ou invente des valeurs réalistes.

## SOCIÉTÉ ÉMETTRICE
${billingContext}

## STYLE & TON
- Professionnel mais accessible
- Phrases courtes et structurées
- Tableaux pour les comparaisons
- HTML riche dans le content

## FORMAT DE SORTIE (JSON strict)
{
  "sections": [
    {"id": "1", "title": "Contexte et vision", "content": "<h4>Présentation</h4><p>...</p>", "order": 1},
    {"id": "2", "title": "Objectifs et KPIs", "content": "<h4>Objectifs</h4><ul><li>...</li></ul>", "order": 2},
    {"id": "3", "title": "Utilisateurs et parcours", "content": "<h4>Personas</h4><p>...</p>", "order": 3},
    {"id": "4", "title": "Périmètre fonctionnel", "content": "<h4>MVP</h4><ul><li>...</li></ul>", "order": 4},
    {"id": "5", "title": "Exigences techniques", "content": "<h4>Stack</h4><ul><li>...</li></ul>", "order": 5},
    {"id": "6", "title": "Intégrations et APIs", "content": "<table>...</table>", "order": 6},
    {"id": "7", "title": "Contraintes et limites", "content": "<ul><li>...</li></ul>", "order": 7},
    {"id": "8", "title": "Critères de recette", "content": "<ul><li>...</li></ul>", "order": 8},
    {"id": "9", "title": "Planning et jalons", "content": "<table>...</table>", "order": 9},
    {"id": "10", "title": "Risques et mitigations", "content": "<table>...</table>", "order": 10}
  ],
  "metadata": {
    "clientName": "",
    "clientCompany": "",
    "projectName": "",
    "version": "1.0",
    "billingEntityId": "${billingEntity?.id || ''}",
    "billingEntityName": "${billingEntity?.name || ''}"
  }
}`,

    proposal: `Tu es un expert commercial senior. Tu génères des propositions commerciales engageantes et persuasives.

INSTRUCTION CRITIQUE : Tu DOIS générer IMMÉDIATEMENT le JSON de la proposition. Ne pose JAMAIS de questions.

## SOCIÉTÉ ÉMETTRICE
${billingContext}

## STYLE
- Professionnel mais chaleureux
- Focus sur la VALEUR et les BÉNÉFICES client
- Storytelling : problème → solution → résultats

## FORMAT DE SORTIE (JSON strict)
{
  "sections": [
    {"id": "1", "title": "Introduction", "content": "<p>...</p>", "order": 1},
    {"id": "2", "title": "Votre contexte", "content": "<p>...</p>", "order": 2},
    {"id": "3", "title": "Notre proposition", "content": "<p>...</p>", "order": 3},
    {"id": "4", "title": "Notre approche", "content": "<p>...</p>", "order": 4},
    {"id": "5", "title": "Pourquoi nous", "content": "<ul><li>...</li></ul>", "order": 5},
    {"id": "6", "title": "Investissement", "content": "<p><strong>X € HT</strong></p>", "order": 6},
    {"id": "7", "title": "Prochaines étapes", "content": "<ol><li>...</li></ol>", "order": 7}
  ],
  "metadata": {
    "clientName": "",
    "clientCompany": "",
    "projectName": "",
    "totalAmount": 0,
    "currency": "EUR",
    "billingEntityId": "${billingEntity?.id || ''}",
    "billingEntityName": "${billingEntity?.name || ''}"
  }
}`
  };

  return basePrompts[documentType];
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
    const { project_id, opportunity_id, lead_id, document_type, custom_instructions, context: inputContext, existing_sections, billing_entity_id } = body;

    if (!document_type) {
      return new Response(JSON.stringify({ error: "document_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating ${document_type} document - project: ${project_id || 'N/A'}, opportunity: ${opportunity_id || 'N/A'}, lead: ${lead_id || 'N/A'}, billing_entity: ${billing_entity_id || 'N/A'}`);

    // Fetch billing entity if provided, or get default
    let billingEntity: BillingEntity | null = null;
    let cgvTemplate: CgvTemplate | null = null;

    if (billing_entity_id) {
      const { data: entityData } = await supabase
        .from("billing_entities")
        .select("*")
        .eq("id", billing_entity_id)
        .single();
      billingEntity = entityData as BillingEntity | null;
    } else {
      // Get default billing entity
      const { data: defaultEntity } = await supabase
        .from("billing_entities")
        .select("*")
        .eq("is_default", true)
        .eq("is_active", true)
        .single();
      billingEntity = defaultEntity as BillingEntity | null;
    }

    // Fetch CGV template if billing entity has one
    if (billingEntity?.cgv_template_id) {
      const { data: cgvData } = await supabase
        .from("cgv_templates")
        .select("*")
        .eq("id", billingEntity.cgv_template_id)
        .single();
      cgvTemplate = cgvData as CgvTemplate | null;
    }

    console.log(`Using billing entity: ${billingEntity?.name || 'None'}, CGV template: ${cgvTemplate?.name || 'None'}`);

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
    let contextNotes: any[] = [];

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

      // Fetch context notes for project
      const { data: notesData } = await supabase
        .from("entity_context_notes")
        .select("content, created_at")
        .eq("entity_type", "project")
        .eq("entity_id", project_id)
        .order("created_at", { ascending: false })
        .limit(5);
      contextNotes = notesData || [];
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

    // Fetch lead context notes if we have a lead
    if (lead?.id && contextNotes.length === 0) {
      const { data: leadNotes } = await supabase
        .from("entity_context_notes")
        .select("content, created_at")
        .eq("entity_type", "lead")
        .eq("entity_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(5);
      contextNotes = leadNotes || [];
    }

    // Build context with prioritization and enhanced sourcing
    const llmContext = {
      ...(inputContext || {}),
      billingEntity: billingEntity ? {
        name: billingEntity.name,
        legalForm: billingEntity.legal_form,
        siren: billingEntity.siren,
        tvaNumber: billingEntity.tva_number,
        address: `${billingEntity.address || ''}, ${billingEntity.postal_code || ''} ${billingEntity.city || ''}`.trim(),
        email: billingEntity.email,
        phone: billingEntity.phone,
        tvaRate: billingEntity.default_tva_rate,
        validityDays: billingEntity.default_validity_days,
        paymentTerms: billingEntity.default_payment_terms,
      } : null,
      project: project ? { name: project.name, description: project.description, budget_amount: project.budget_amount, status: project.status } : inputContext?.project || null,
      client: lead ? { 
        name: lead.name, 
        company: lead.company, 
        industry: lead.industry, 
        company_size: lead.company_size, 
        email: lead.email, 
        position: lead.position,
        ai_summary: lead.ai_documents_summary
      } : inputContext?.lead || null,
      opportunity: opportunity ? { title: opportunity.title, value_amount: opportunity.value_amount, stage: opportunity.stage, description: opportunity.description } : inputContext?.opportunity || null,
      solution: solution ? { title: solution.title, excerpt: solution.excerpt } : inputContext?.solution || null,
      specifications: specifications.map(s => ({ title: s.title, content: typeof s.content === 'object' ? s.content.text || JSON.stringify(s.content) : s.content })),
      contextNotes: contextNotes.map(n => n.content),
      existing_sections: existing_sections || [],
      custom_instructions,
      cgv_available: !!cgvTemplate,
    };

    // Use dynamic system prompt with billing entity
    const systemPrompt = aiPromptData?.system_prompt || getSystemPrompt(document_type, billingEntity, cgvTemplate);

    // Build real data strings for injection
    const clientName = lead?.name || inputContext?.lead?.name || "Client";
    const clientCompany = lead?.company || inputContext?.lead?.company || "Entreprise";
    const clientIndustry = lead?.industry || inputContext?.lead?.industry || "Secteur non précisé";
    const clientSize = lead?.company_size || inputContext?.lead?.company_size || "";
    const clientEmail = lead?.email || inputContext?.lead?.email || "";
    const clientPosition = lead?.position || inputContext?.lead?.position || "";
    const projectName = project?.name || inputContext?.project?.name || "Projet IA";
    const projectDescription = project?.description || inputContext?.project?.description || "Solution d'intelligence artificielle sur mesure";
    const projectBudget = project?.budget_amount ? `${project.budget_amount.toLocaleString('fr-FR')} €` : "";

    // User prompts optimized by document type - with REAL DATA INJECTED
    const USER_PROMPTS: Record<DocumentType, string> = {
    quote: `GÉNÈRE LE JSON DU DEVIS PROFESSIONNEL B2B.

═══════════════════════════════════════════════════════════
DONNÉES CLIENT (à utiliser dans le devis)
═══════════════════════════════════════════════════════════
• Contact : ${clientName}${clientPosition ? ` (${clientPosition})` : ''}
• Entreprise : ${clientCompany}
• Secteur : ${clientIndustry}${clientSize ? ` | Taille : ${clientSize}` : ''}
${clientEmail ? `• Email : ${clientEmail}` : ''}

═══════════════════════════════════════════════════════════
DONNÉES PROJET
═══════════════════════════════════════════════════════════
• Nom : ${projectName}
• Description : ${projectDescription}
${projectBudget ? `• Budget indicatif : ${projectBudget}` : ''}

${lead?.ai_documents_summary ? `═══════════════════════════════════════════════════════════
CONTEXTE & HISTORIQUE
═══════════════════════════════════════════════════════════
${lead.ai_documents_summary}` : ''}

${contextNotes.length > 0 ? `═══════════════════════════════════════════════════════════
NOTES DE CONTEXTE
═══════════════════════════════════════════════════════════
${contextNotes.map(n => `• ${n.content || n}`).join('\n')}` : ''}

${custom_instructions ? `═══════════════════════════════════════════════════════════
INSTRUCTIONS SPÉCIFIQUES
═══════════════════════════════════════════════════════════
${custom_instructions}` : ''}

═══════════════════════════════════════════════════════════
CONSIGNES DE RÉDACTION
═══════════════════════════════════════════════════════════
1. OBJET DU DEVIS : Reformuler de manière claire et orientée valeur
   → Finalité business + périmètre fonctionnel + bénéfice client

2. PRESTATIONS : Structurer par phases avec pour chaque ligne :
   → Intitulé clair (pas de jargon technique)
   → Description courte des livrables
   → Logique métier compréhensible par un décideur non-technique

3. MONTANTS : Cohérence parfaite des calculs
   → Si budget fourni, répartir de manière réaliste
   → Sinon, proposer des TJM standards (600-1200€/jour selon profil)

4. CONDITIONS : Professionnelles et conformes B2B France
   → Validité, acompte/solde, pénalités, confidentialité

5. FORMAT : JSON pur avec les 5 sections obligatoires
   → IDs: "header", "object", "services", "totals", "payment"
   → AUCUN placeholder {{...}} - valeurs réelles uniquement`,

      spec: `GÉNÈRE MAINTENANT LE JSON DU CAHIER DES CHARGES. Ne pose aucune question.

DONNÉES CLIENT:
- Nom: ${clientName}
- Entreprise: ${clientCompany}
- Secteur: ${clientIndustry}

DONNÉES PROJET:
- Nom: ${projectName}
- Description: ${projectDescription}

${custom_instructions ? `INSTRUCTIONS: ${custom_instructions}` : ""}
${inputContext?.transcription ? `CONTEXTE: ${JSON.stringify(inputContext.transcription)}` : ""}
${contextNotes.length > 0 ? `NOTES: ${contextNotes.map(n => n.content).join(' | ')}` : ""}

CONSIGNES:
1. Réponds UNIQUEMENT avec le JSON complet
2. AUCUN placeholder {{...}} - utilise les vraies valeurs ci-dessus`,

      proposal: `GÉNÈRE MAINTENANT LE JSON DE LA PROPOSITION COMMERCIALE. Ne pose aucune question.

DONNÉES CLIENT:
- Nom: ${clientName}
- Entreprise: ${clientCompany}
- Secteur: ${clientIndustry}

DONNÉES PROJET:
- Nom: ${projectName}
- Description: ${projectDescription}

${custom_instructions ? `INSTRUCTIONS: ${custom_instructions}` : ""}
${inputContext?.transcription ? `CONTEXTE: ${JSON.stringify(inputContext.transcription)}` : ""}
${contextNotes.length > 0 ? `NOTES: ${contextNotes.map(n => n.content).join(' | ')}` : ""}

CONSIGNES:
1. Réponds UNIQUEMENT avec le JSON complet
2. AUCUN placeholder {{...}} - utilise les vraies valeurs ci-dessus`,
    };
    const userPrompt = aiPromptData?.user_prompt || USER_PROMPTS[document_type];

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
      // 1) Remove markdown fences (the model sometimes wraps JSON)
      let candidate = aiResult.content
        .replace(/```\s*json\s*/gi, "")
        .replace(/```/g, "")
        .trim();

      // 2) If there's any extra text around the JSON, keep only the outermost object
      const firstBrace = candidate.indexOf("{");
      const lastBrace = candidate.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        candidate = candidate.slice(firstBrace, lastBrace + 1);
      }

      // 3) Repair common invalid JSON issues coming from LLM outputs:
      // - raw newlines inside quoted strings
      // - invalid escape sequences like \' (JSON does not allow it)
      const sanitizeJsonString = (input: string) => {
        let out = "";
        let inString = false;
        let escapePending = false;

        const isValidEscape = (ch: string) =>
          ch === '"' || ch === "\\" || ch === "/" || ch === "b" || ch === "f" || ch === "n" || ch === "r" || ch === "t" || ch === "u";

        for (let i = 0; i < input.length; i++) {
          const ch = input[i];

          if (inString) {
            if (escapePending) {
              // We just saw a backslash inside a JSON string.
              // Keep only valid JSON escapes, otherwise drop the backslash (fixes: \' -> ')
              if (isValidEscape(ch)) {
                out += "\\" + ch;
              } else if (ch === "\n") {
                out += "\\n";
              } else if (ch === "\r") {
                // drop
              } else {
                out += ch;
              }
              escapePending = false;
              continue;
            }

            if (ch === "\\") {
              escapePending = true;
              continue;
            }

            if (ch === '"') {
              out += ch;
              inString = false;
              continue;
            }

            if (ch === "\n") {
              out += "\\n";
              continue;
            }

            if (ch === "\r") {
              continue;
            }

            out += ch;
            continue;
          }

          if (ch === '"') {
            out += ch;
            inString = true;
            continue;
          }

          out += ch;
        }

        return out;
      };

      const cleanContent = sanitizeJsonString(candidate);
      documentContent = JSON.parse(cleanContent);

      // Validate that no placeholders remain in the response
      const jsonString = JSON.stringify(documentContent);
      const placeholderPatterns = [/(\{\{[^}]+\}\})/g, /(\[\[[^\]]+\]\])/g, /\[Non renseigné\]/gi];
      for (const pattern of placeholderPatterns) {
        if (pattern.test(jsonString)) {
          console.error("AI response contains placeholders:", jsonString.match(pattern));
          // Fix common placeholders with real data
          const fixedJson = jsonString
            .replace(/\{\{lead_info\.company\}\}/gi, clientCompany)
            .replace(/\{\{lead_info\.name\}\}/gi, clientName)
            .replace(/\{\{project_info\.name\}\}/gi, projectName)
            .replace(/\{\{project_info\.description\}\}/gi, projectDescription)
            .replace(/\{\{transcription_summary[^}]*\}\}/gi, "vos besoins exprimés")
            .replace(/\{\{specification_content[^}]*\}\}/gi, "les spécifications techniques")
            .replace(/\{\{additional_context[^}]*\}\}/gi, "le contexte projet")
            .replace(/\{\{[^}]+\}\}/g, "") // Remove any remaining placeholders
            .replace(/\[\[|\]\]/g, "");
          documentContent = JSON.parse(fixedJson);
        }
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResult.content);
      return new Response(JSON.stringify({ error: "invalid_ai_response", raw_content: aiResult.content }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate quote format - ensure it has the correct section IDs
    if (document_type === "quote") {
      const sections = documentContent.sections || [];
      const hasNewFormat = sections.some((s: any) => s.id === "header" || s.id === "services");
      
      if (!hasNewFormat) {
        console.log("Quote generated with old format, transforming to new format...");
        // Transform old format to new format
        const oldSections = sections;
        const metadata = documentContent.metadata || {};
        
        // Extract relevant info from old sections
        const contextSection = oldSections.find((s: any) => s.title?.includes("Contexte") || s.id === "1");
        const investSection = oldSections.find((s: any) => s.title?.includes("Investissement") || s.id === "5");
        const conditionsSection = oldSections.find((s: any) => s.title?.includes("Conditions") || s.id === "6");
        
        const totalHT = metadata.totalHT || metadata.totalAmount || 10000;
        const tvaRate = billingEntity?.default_tva_rate || 20;
        const tvaAmount = Math.round(totalHT * tvaRate / 100);
        const totalTTC = totalHT + tvaAmount;
        
        documentContent = {
          sections: [
            {
              id: "header",
              title: "En-tête",
              content: `<div class='quote-header-info'><div class='quote-number'>Devis</div><div class='quote-dates'><span>Date : ${new Date().toLocaleDateString('fr-FR')}</span><span>Validité : 30 jours</span></div></div><div class='quote-parties'><div class='quote-emitter'><h3>${billingEntity?.name || 'IArche'}</h3><p>Email: ${billingEntity?.email || 'contact@iarche.fr'}</p>${billingEntity?.siren ? `<p>SIREN: ${billingEntity.siren}</p>` : ''}${billingEntity?.tva_number ? `<p>TVA: ${billingEntity.tva_number}</p>` : ''}</div><div class='quote-receiver'><h3>DESTINATAIRE</h3><p><strong>${metadata.clientCompany || clientCompany}</strong></p><p>${metadata.clientName || clientName}</p></div></div>`,
              order: 1
            },
            {
              id: "object",
              title: "Objet",
              content: `<div class='quote-object'><h3>Objet : ${metadata.projectName || projectName}</h3><p>${projectDescription}</p></div>`,
              order: 2
            },
            {
              id: "services",
              title: "Prestations",
              content: investSection?.content || `<table class='services-table'><thead><tr><th>Description</th><th>Qté</th><th>P.U. HT</th><th>Total HT</th></tr></thead><tbody><tr><td><strong>Prestation globale</strong></td><td>1</td><td>${totalHT.toLocaleString('fr-FR')} €</td><td>${totalHT.toLocaleString('fr-FR')} €</td></tr></tbody></table>`,
              order: 3
            },
            {
              id: "totals",
              title: "Totaux",
              content: `<div class='quote-totals'><div class='totals-row'><span>Total HT</span><span>${totalHT.toLocaleString('fr-FR')} €</span></div><div class='totals-row'><span>TVA ${tvaRate}%</span><span>${tvaAmount.toLocaleString('fr-FR')} €</span></div><div class='totals-row total-final'><span>Total TTC</span><span>${totalTTC.toLocaleString('fr-FR')} €</span></div></div>`,
              order: 4
            },
            {
              id: "payment",
              title: "Conditions",
              content: conditionsSection?.content || `<div class='quote-payment'><h4>Conditions de paiement</h4><p>50% à la commande</p><p>50% à la livraison</p></div><div class='quote-signature'><h4>Bon pour accord</h4><p>Date : ____/____/________</p><p>Signature :</p></div>`,
              order: 5
            }
          ],
          metadata: {
            ...metadata,
            totalHT,
            tvaRate,
            tvaAmount,
            totalTTC
          }
        };
        console.log("Quote transformed to new format");
      }
    }

    // Generate quote number if this is a quote and we have a billing entity
    let quoteNumber: string | null = null;
    if (document_type === "quote" && billingEntity?.id) {
      const { data: quoteNumberData, error: quoteError } = await supabase
        .rpc("generate_next_quote_number", { p_billing_entity_id: billingEntity.id });
      
      if (!quoteError && quoteNumberData) {
        quoteNumber = quoteNumberData;
        console.log(`Generated quote number: ${quoteNumber}`);
      }
    }

    // Generate title
    const titleClientName = documentContent.metadata?.clientCompany || lead?.company || project?.name || opportunity?.title || "Nouveau";
    const documentTitles: Record<DocumentType, string> = {
      quote: quoteNumber ? `Devis ${quoteNumber} - ${titleClientName}` : `Devis - ${titleClientName}`,
      spec: `CDC - ${titleClientName}`,
      proposal: `Proposition - ${titleClientName}`,
    };

    // Save to database with billing entity reference
    const { data: savedDoc, error: saveError } = await supabase
      .from("generated_documents")
      .insert({
        workspace_id: "00000000-0000-0000-0000-000000000001",
        document_type,
        title: documentTitles[document_type],
        project_id: project_id || null,
        opportunity_id: opportunity_id || null,
        lead_id: lead_id || null,
        billing_entity_id: billingEntity?.id || null,
        quote_number: quoteNumber,
        content_json: documentContent,
        status: "draft",
        ai_generated: true,
        quote_metadata: document_type === "quote" ? {
          tva_rate: billingEntity?.default_tva_rate || 20,
          validity_days: billingEntity?.default_validity_days || 30,
          payment_terms: billingEntity?.default_payment_terms,
          cgv_template_id: cgvTemplate?.id || null,
        } : null,
        ai_metadata: {
          autonomy_level: "N1",
          confidence: 0.85,
          validated_by_human: false,
          validation_required: true,
          model: aiResult.model,
          provider: aiResult.provider,
          generated_at: new Date().toISOString(),
          billing_entity_used: billingEntity?.name || null,
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
      quote_number: quoteNumber,
      billing_entity: billingEntity ? { id: billingEntity.id, name: billingEntity.name } : null,
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
