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
    quote: `Tu es un expert commercial senior chez IArche. Tu génères des devis commerciaux professionnels de niveau cabinet de conseil.

## SOCIÉTÉ ÉMETTRICE
${billingContext}

## CONTEXTE MÉTIER
- Agence spécialisée en solutions IA pour entreprises (TPE/PME/ETI)
- Tarifs journaliers : 700€ (junior) à 1200€ (expert/fondateur)
- Garantie : 3 mois maintenance corrective incluse
- TVA : ${billingEntity?.default_tva_rate || 20}%
- Conditions : ${billingEntity?.default_payment_terms?.deposit_percent || 30}% à la commande, ${billingEntity?.default_payment_terms?.balance_percent || 70}% à livraison

## STYLE DE RÉDACTION
- Style narratif fluide et professionnel
- PAS de sommaire/table des matières
- Contenu dense et structuré avec des titres de sections clairs
- Format adapté aux documents commerciaux haut de gamme
- Utiliser le markdown dans le content (##, **, -, etc.)

## STRUCTURE OBLIGATOIRE DU DEVIS

### Section 1 : Contexte et objectifs
- Résumé du besoin client et de la problématique
- Vision du projet et objectifs business
- Bénéfices attendus de la solution

### Section 2 : Périmètre de la prestation  
- Ce qui est INCLUS (liste détaillée)
- Ce qui est EXCLUS (clarté contractuelle)

### Section 3 : Détail des phases
Pour chaque phase :
- Titre de la phase avec durée (ex: "Phase 1 : Cadrage (5 jours)")
- Objectif de la phase
- Activités principales
- Livrables

### Section 4 : Planning prévisionnel
- Tableau synthétique des phases
- Durée totale estimée
- Jalons clés

### Section 5 : Investissement
- Tableau détaillé : Phase | Profil | Jours | Tarif/jour | Total HT
- Total HT, TVA, Total TTC

### Section 6 : Conditions
- Validité du devis
- Modalités de paiement
- Garantie
- Confidentialité

## RÈGLES CRITIQUES
1. JAMAIS de placeholders type {{...}} ou [...] - utiliser les vraies données
2. PAS de section "Sommaire" ni "Table des matières"
3. Chaque section a un content riche et détaillé
4. Les montants doivent être cohérents et réalistes

## FORMAT DE SORTIE (JSON strict)
{
  "sections": [
    {"id": "1", "title": "Contexte et objectifs", "content": "Contenu détaillé...", "order": 1},
    {"id": "2", "title": "Périmètre de la prestation", "content": "**Inclus :**\\n- ...\\n\\n**Exclus :**\\n- ...", "order": 2},
    {"id": "3", "title": "Détail des phases", "content": "## Phase 1 : Cadrage (X jours)\\n**Objectif :** ...\\n**Activités :**\\n- ...\\n**Livrables :** ...\\n\\n## Phase 2 : ...", "order": 3},
    {"id": "4", "title": "Planning prévisionnel", "content": "| Phase | Durée | Jalon |\\n|---|---|---|\\n| ... |", "order": 4},
    {"id": "5", "title": "Investissement", "content": "| Poste | Jours | Tarif | Total HT |\\n|---|---|---|---|\\n| ... |\\n\\n**Total HT :** X €\\n**TVA ${billingEntity?.default_tva_rate || 20}% :** X €\\n**Total TTC :** X €", "order": 5},
    {"id": "6", "title": "Conditions", "content": "**Validité :** ${billingEntity?.default_validity_days || 30} jours\\n**Paiement :** ${billingEntity?.default_payment_terms?.deposit_percent || 30}% commande, ${billingEntity?.default_payment_terms?.balance_percent || 70}% livraison\\n**Garantie :** 3 mois maintenance corrective", "order": 6}
  ],
  "metadata": {
    "clientName": "Nom du contact",
    "clientCompany": "Nom entreprise",
    "projectName": "Nom du projet",
    "totalAmount": 0,
    "currency": "EUR",
    "billingEntityId": "${billingEntity?.id || ''}",
    "billingEntityName": "${billingEntity?.name || ''}",
    "tvaRate": ${billingEntity?.default_tva_rate || 20},
    "validityDays": ${billingEntity?.default_validity_days || 30}
  }
}`,

    spec: `Tu es un architecte solution senior. Tu génères des Cahiers des Charges (CDC) de niveau professionnel.

## SOCIÉTÉ ÉMETTRICE
${billingContext}

## MÉTHODOLOGIE DE RÉDACTION

### 1. CONTEXTUALISATION INCARNÉE
- Commence TOUJOURS par un cas d'usage concret (client, situation réelle)
- Décris les problèmes vécus, pas des généralités
- Utilise des verbes d'action et des exemples chiffrés

### 2. STRUCTURE NARRATIVE OBLIGATOIRE
Chaque section majeure DOIT contenir :
- **Description** : explication fonctionnelle claire
- **Exemple d'usage** : scénario concret avec acteurs nommés
- **Valeur ajoutée** : bénéfice explicite (préfixé par 👉)

### 3. PATTERN "AVANT/APRÈS"
Inclure systématiquement des encadrés comparatifs dans le contexte :
> **Aujourd'hui** : [problème vécu]
> **Avec la solution** : [bénéfice concret + chiffres estimés]

### 4. FONCTIONNALITÉS
Structure obligatoire pour chaque module/fonctionnalité :
- Titre du module
- Description (liste des capacités)
- Exemple d'usage (scénario narratif)

### 5. EXIGENCES TECHNIQUES
Pour chaque exigence :
- Critère testable (vérifiable objectivement)
- Priorité (Must/Should/Could)
- Dépendances éventuelles

### 6. GARDE-FOUS & LIMITES
Section explicite sur :
- Ce que le système NE FAIT PAS
- Validations humaines obligatoires
- Contraintes techniques ou réglementaires

### 7. INDICATEURS DE SUCCÈS
KPIs mesurables par profil utilisateur :
- Quantitatifs (temps gagné, taux, volumes)
- Qualitatifs (satisfaction, adoption)

## STYLE & TON
- Professionnel mais accessible
- Phrases courtes et structurées
- Tableaux pour les comparaisons et matrices
- Listes à puces pour l'exhaustivité
- HTML riche dans le content (h3, h4, ul, ol, table, blockquote)

## FORMAT DE SORTIE (JSON strict)
{
  "sections": [
    {"id": "1", "title": "Contexte et vision", "content": "<h4>Présentation</h4><p>...</p><h4>Problématiques actuelles</h4><ul><li>...</li></ul><blockquote><strong>Aujourd'hui :</strong> ...<br/><strong>Demain :</strong> ...</blockquote>", "order": 1},
    {"id": "2", "title": "Objectifs et indicateurs de succès", "content": "<h4>Objectifs</h4><ul><li>...</li></ul><h4>KPIs cibles</h4><table><tr><th>Indicateur</th><th>Cible</th><th>Mesure</th></tr>...</table>", "order": 2},
    {"id": "3", "title": "Utilisateurs et parcours", "content": "<h4>Personas</h4><p><strong>Utilisateur 1 :</strong> Rôle, besoins, parcours type</p><p>👉 Valeur ajoutée : ...</p>", "order": 3},
    {"id": "4", "title": "Périmètre fonctionnel", "content": "<h4>MVP (Phase 1)</h4><ul><li>F1 : Description + Exemple d'usage</li></ul><h4>V2 (évolutions)</h4><ul><li>...</li></ul>", "order": 4},
    {"id": "5", "title": "Exigences techniques", "content": "<h4>Stack technique</h4><ul><li>...</li></ul><h4>Sécurité</h4><ul><li>...</li></ul><h4>Performances</h4><ul><li>...</li></ul>", "order": 5},
    {"id": "6", "title": "Intégrations et APIs", "content": "<table><tr><th>Service</th><th>Usage</th><th>Priorité</th></tr>...</table>", "order": 6},
    {"id": "7", "title": "Contraintes et limites", "content": "<h4>Ce que le système ne fait PAS</h4><ul><li>...</li></ul><h4>Prérequis</h4><ul><li>...</li></ul>", "order": 7},
    {"id": "8", "title": "Critères de recette", "content": "<ul><li>☐ Critère 1 : condition de validation</li><li>☐ Critère 2 : ...</li></ul>", "order": 8},
    {"id": "9", "title": "Planning et jalons", "content": "<table><tr><th>Phase</th><th>Durée</th><th>Livrables</th></tr>...</table>", "order": 9},
    {"id": "10", "title": "Risques et mitigations", "content": "<table><tr><th>Risque</th><th>Impact</th><th>Probabilité</th><th>Mitigation</th></tr>...</table>", "order": 10}
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

    proposal: `Tu es un expert commercial senior. Tu génères des propositions commerciales engageantes et persuasives de niveau cabinet de conseil.

## SOCIÉTÉ ÉMETTRICE
${billingContext}

## TON ET STYLE
- Professionnel mais chaleureux et humain
- Focus sur la VALEUR et les BÉNÉFICES client (pas les features techniques)
- Storytelling : problème → compréhension → solution → résultats attendus
- Personnalisation maximale avec les données du contexte

## MÉTHODOLOGIE

### 1. ACCROCHE PERSONNALISÉE
- Mentionner un élément spécifique du contexte client
- Montrer qu'on a écouté et compris
- Créer une connexion émotionnelle

### 2. REFORMULATION EMPATHIQUE
- Résumer les enjeux du client avec SES mots
- Valider la légitimité de ses préoccupations
- Pattern : "Vous nous avez partagé que..." / "Nous comprenons que..."

### 3. PROPOSITION DE VALEUR
- Bénéfices AVANT fonctionnalités
- Chiffrer les gains attendus quand possible
- Pattern "Avant/Après" avec impact business

### 4. DIFFÉRENCIATEURS
- Expertise IA appliquée au métier
- Accompagnement humain (pas que technique)
- Approche itérative et collaborative
- Références et cas similaires si disponibles

### 5. INVESTISSEMENT (valeur avant prix)
- Rappeler la valeur créée
- Présenter l'investissement comme un ROI
- Détailler les garanties

### 6. PROCHAINES ÉTAPES
- Actions concrètes et datées
- Faciliter la prise de décision
- Call-to-action clair

## FORMAT DE SORTIE (JSON strict)
{
  "sections": [
    {"id": "1", "title": "Cher [Prénom]", "content": "<p>Introduction personnalisée montrant l'écoute...</p><p>Suite à notre échange du [date], nous avons le plaisir de vous présenter notre proposition.</p>", "order": 1},
    {"id": "2", "title": "Votre contexte, nos observations", "content": "<p>Vous nous avez partagé que...</p><blockquote><strong>Vos enjeux :</strong><ul><li>...</li></ul></blockquote><p>Nous comprenons parfaitement ces défis car...</p>", "order": 2},
    {"id": "3", "title": "Notre proposition", "content": "<p>Pour répondre à vos enjeux, nous proposons...</p><h4>Bénéfices attendus</h4><ul><li>👉 ...</li></ul><blockquote><strong>Avant :</strong> ...<br/><strong>Après :</strong> ...</blockquote>", "order": 3},
    {"id": "4", "title": "Notre approche", "content": "<h4>Méthodologie</h4><p>...</p><h4>Phases clés</h4><ol><li>...</li></ol>", "order": 4},
    {"id": "5", "title": "Pourquoi nous", "content": "<ul><li><strong>Expertise :</strong> ...</li><li><strong>Accompagnement :</strong> ...</li><li><strong>Garanties :</strong> ...</li></ul>", "order": 5},
    {"id": "6", "title": "Investissement", "content": "<p>Pour cet accompagnement complet, l'investissement s'élève à :</p><p><strong>X € HT</strong></p><p>Incluant : ...</p><p>Conditions : ${billingEntity?.default_payment_terms?.deposit_percent || 30}% à la commande, ${billingEntity?.default_payment_terms?.balance_percent || 70}% à livraison</p>", "order": 6},
    {"id": "7", "title": "Prochaines étapes", "content": "<ol><li>Validation de cette proposition</li><li>Cadrage détaillé (semaine X)</li><li>Démarrage opérationnel</li></ol><p>Nous restons à votre disposition pour échanger.</p><p>Cordialement,</p>", "order": 7}
  ],
  "metadata": {
    "clientName": "Prénom du contact",
    "clientCompany": "Nom entreprise",
    "projectName": "Nom du projet",
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
    quote: `Génère un DEVIS COMMERCIAL professionnel pour le client suivant.

## ⚠️ RÈGLE ABSOLUE - LECTURE OBLIGATOIRE ⚠️
Tu dois utiliser les VRAIES VALEURS ci-dessous. 
INTERDICTION TOTALE d'écrire {{...}}, [...], ou "Non renseigné" dans ta réponse.
Si une info manque, invente un texte générique adapté au contexte métier.

## DONNÉES RÉELLES À UTILISER
CLIENT:
- Nom: ${clientName}
- Entreprise: ${clientCompany}
- Secteur: ${clientIndustry}
- Taille: ${clientSize || "PME"}
- Email: ${clientEmail || "contact@" + clientCompany.toLowerCase().replace(/\s+/g, '') + ".fr"}
- Poste: ${clientPosition || "Responsable projet"}

PROJET:
- Nom: ${projectName}
- Description: ${projectDescription}
- Budget indicatif: ${projectBudget || "À définir selon périmètre"}

## SOURCES CONTEXTUELLES
${custom_instructions ? `Instructions client: ${custom_instructions}` : ""}
${inputContext?.transcription ? `Transcription: ${JSON.stringify(inputContext.transcription)}` : ""}
${contextNotes.length > 0 ? `Notes: ${contextNotes.map(n => n.content).join(' | ')}` : ""}
${lead?.ai_documents_summary ? `Synthèse lead: ${lead.ai_documents_summary}` : ""}

## RAPPEL FINAL
Dans le JSON de sortie:
- metadata.clientName = "${clientName}"
- metadata.clientCompany = "${clientCompany}" 
- metadata.projectName = "${projectName}"
- Le titre de la première section NE DOIT PAS contenir de placeholder

Réponds UNIQUEMENT en JSON valide, sans balises markdown.`,

      spec: `Génère un CAHIER DES CHARGES professionnel.

## ⚠️ RÈGLE ABSOLUE - LECTURE OBLIGATOIRE ⚠️
Tu dois utiliser les VRAIES VALEURS ci-dessous.
INTERDICTION TOTALE d'écrire {{...}}, [...], ou "Non renseigné" dans ta réponse.

## DONNÉES RÉELLES À UTILISER
CLIENT:
- Nom: ${clientName}
- Entreprise: ${clientCompany}
- Secteur: ${clientIndustry}

PROJET:
- Nom: ${projectName}
- Description: ${projectDescription}

## SOURCES CONTEXTUELLES
${custom_instructions ? `Instructions: ${custom_instructions}` : ""}
${inputContext?.transcription ? `Transcription: ${JSON.stringify(inputContext.transcription)}` : ""}
${contextNotes.length > 0 ? `Notes: ${contextNotes.map(n => n.content).join(' | ')}` : ""}

## RAPPEL FINAL
metadata.clientCompany = "${clientCompany}"
metadata.projectName = "${projectName}"

Réponds UNIQUEMENT en JSON valide, sans balises markdown.`,

      proposal: `Génère une PROPOSITION COMMERCIALE engageante.

## ⚠️ RÈGLE ABSOLUE - LECTURE OBLIGATOIRE ⚠️
Tu dois utiliser les VRAIES VALEURS ci-dessous.
INTERDICTION TOTALE d'écrire {{...}}, [...], ou "Non renseigné" dans ta réponse.

## DONNÉES RÉELLES À UTILISER
CLIENT:
- Prénom/Nom: ${clientName}
- Entreprise: ${clientCompany}
- Secteur: ${clientIndustry}

PROJET:
- Nom: ${projectName}
- Description: ${projectDescription}

## SOURCES CONTEXTUELLES
${custom_instructions ? `Instructions: ${custom_instructions}` : ""}
${inputContext?.transcription ? `Échanges: ${JSON.stringify(inputContext.transcription)}` : ""}
${contextNotes.length > 0 ? `Notes: ${contextNotes.map(n => n.content).join(' | ')}` : ""}

## RAPPEL FINAL
metadata.clientName = "${clientName}"
metadata.clientCompany = "${clientCompany}"

Réponds UNIQUEMENT en JSON valide, sans balises markdown.`,
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
      const cleanContent = aiResult.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      documentContent = JSON.parse(cleanContent);
      
      // Validate that no placeholders remain in the response
      const jsonString = JSON.stringify(documentContent);
      const placeholderPatterns = [/\{\{[^}]+\}\}/g, /\[\[[^\]]+\]\]/g, /\[Non renseigné\]/gi];
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
