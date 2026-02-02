import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.86.0";
import { callLLM } from "../_shared/ai-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PartnerContext {
  partnerId: string;
  partnerName: string;
  partnerType: string;
  projects: Array<{
    id: string;
    name: string;
    status: string;
    budget?: number;
    client?: string;
    role?: string;
    transcriptions: Array<{
      title: string;
      date: string;
      summary?: string;
    }>;
    documents: Array<{
      title: string;
      type: string;
      date: string;
    }>;
  }>;
  leads: Array<{
    id: string;
    name: string;
    company?: string;
    role?: string;
    transcriptions: Array<{
      title: string;
      date: string;
      summary?: string;
    }>;
  }>;
  totalTranscriptions: number;
  totalDocuments: number;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function getPartnerSystemPrompt(partnerType: string): string {
  const typeContext = partnerType === 'expert_ia' 
    ? "Vous interagissez avec un Expert IA, qui intervient sur des missions techniques d'IA."
    : partnerType === 'independant'
    ? "Vous interagissez avec un Indépendant, qui réalise des missions en sous-traitance."
    : partnerType === 'apporteur'
    ? "Vous interagissez avec un Apporteur d'affaires, qui recommande des clients."
    : "Vous interagissez avec un partenaire externe.";

  return `Tu es l'assistant IA contextuel de l'espace partenaire IArche.

## CONTEXTE PARTENAIRE
${typeContext}

## MISSION
Fournir une synthèse claire et actionable des missions, leads et informations auxquelles ce partenaire a accès.
Ton rôle est d'aider le partenaire à avoir une vision 360° de son activité avec IArche.

## RÈGLES CRITIQUES
1. **CONFIDENTIALITÉ** : Ne jamais mentionner d'informations sur des projets/leads auxquels le partenaire n'est pas lié
2. **PRÉCISION** : Citer les sources (transcriptions, documents) pour chaque information
3. **STRUCTURE** : Organiser l'information par mission/projet pour faciliter la lecture
4. **PERTINENCE** : Prioriser les informations récentes et les actions en cours

## FORMAT DE SORTIE

### 📊 Vue d'ensemble
Résumé en 2-3 phrases de l'activité du partenaire.

### 🎯 Missions en cours
Pour chaque projet actif :
- Nom du projet et client
- Rôle du partenaire
- Points clés des dernières interactions
- Prochaines étapes identifiées

### 💼 Leads associés
Pour chaque lead :
- Nom et entreprise
- Contexte de la relation
- Actions récentes

### 📅 Événements récents
Timeline des dernières interactions (transcriptions, documents).

### ⚠️ Points d'attention
Éléments nécessitant une action ou un suivi.

## STYLE
- Professionnel mais accessible
- Bullet points clairs
- Dates au format français (DD/MM/YYYY)
`;
}

async function collectPartnerContext(
  supabase: any,
  partnerId: string
): Promise<PartnerContext> {
  console.log(`[partner-consulte] Collecting context for partner ${partnerId}`);

  // 1. Get partner info
  const { data: partner } = await supabase
    .from('partners')
    .select('id, name, partner_type, company')
    .eq('id', partnerId)
    .single();

  if (!partner) {
    throw new Error('Partner not found');
  }

  // 2. Get linked projects with transcriptions and documents
  const { data: projectLinks } = await supabase
    .from('project_partners')
    .select(`
      role,
      project:projects(
        id, 
        name, 
        status, 
        budget_amount,
        opportunity:opportunities(
          lead:leads(id, name, company)
        )
      )
    `)
    .eq('partner_id', partnerId);

  const projects: PartnerContext['projects'] = [];
  let totalTranscriptions = 0;
  let totalDocuments = 0;

  for (const link of projectLinks || []) {
    if (!link.project) continue;
    
    const project = link.project as any;
    
    // Get transcriptions for this project
    const { data: transcriptions } = await supabase
      .from('voice_transcriptions')
      .select('id, title, transcription_date, ai_summary')
      .eq('project_id', project.id)
      .eq('status', 'done')
      .order('transcription_date', { ascending: false })
      .limit(5);

    // Get documents for this project
    const { data: documents } = await supabase
      .from('generated_documents')
      .select('id, title, document_type, created_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const projectTranscriptions = (transcriptions || []).map((t: any) => ({
      title: t.title || 'Transcription',
      date: formatDate(t.transcription_date || t.created_at),
      summary: t.ai_summary?.substring(0, 500) || undefined
    }));

    const projectDocuments = (documents || []).map((d: any) => ({
      title: d.title,
      type: d.document_type,
      date: formatDate(d.created_at)
    }));

    totalTranscriptions += projectTranscriptions.length;
    totalDocuments += projectDocuments.length;

    const leadInfo = project.opportunity?.lead;

    projects.push({
      id: project.id,
      name: project.name,
      status: project.status,
      budget: project.budget_amount,
      client: leadInfo?.company || leadInfo?.name,
      role: link.role,
      transcriptions: projectTranscriptions,
      documents: projectDocuments
    });
  }

  // 3. Get linked leads with transcriptions
  const { data: leadLinks } = await supabase
    .from('lead_partners')
    .select(`
      role,
      lead:leads(id, name, company)
    `)
    .eq('partner_id', partnerId);

  const leads: PartnerContext['leads'] = [];

  for (const link of leadLinks || []) {
    if (!link.lead) continue;
    
    const lead = link.lead as any;

    // Get transcriptions for this lead
    const { data: transcriptions } = await supabase
      .from('voice_transcriptions')
      .select('id, title, transcription_date, ai_summary')
      .eq('lead_id', lead.id)
      .eq('status', 'done')
      .order('transcription_date', { ascending: false })
      .limit(3);

    const leadTranscriptions = (transcriptions || []).map((t: any) => ({
      title: t.title || 'Transcription',
      date: formatDate(t.transcription_date || t.created_at),
      summary: t.ai_summary?.substring(0, 300) || undefined
    }));

    // Only add leads not already covered by projects
    if (!projects.some(p => p.client === (lead.company || lead.name))) {
      totalTranscriptions += leadTranscriptions.length;
      leads.push({
        id: lead.id,
        name: lead.name,
        company: lead.company,
        role: link.role,
        transcriptions: leadTranscriptions
      });
    }
  }

  return {
    partnerId: partner.id,
    partnerName: partner.name,
    partnerType: partner.partner_type || 'partner',
    projects,
    leads,
    totalTranscriptions,
    totalDocuments
  };
}

function buildUserPrompt(context: PartnerContext): string {
  const projectsSection = context.projects.length > 0
    ? context.projects.map(p => {
        const transcriptionsText = p.transcriptions.length > 0
          ? p.transcriptions.map(t => `  - [${t.date}] ${t.title}${t.summary ? `\n    Résumé: ${t.summary}` : ''}`).join('\n')
          : '  Aucune transcription récente';
        
        const documentsText = p.documents.length > 0
          ? p.documents.map(d => `  - [${d.date}] ${d.title} (${d.type})`).join('\n')
          : '  Aucun document récent';

        return `### Projet: ${p.name}
- Client: ${p.client || 'Non spécifié'}
- Statut: ${p.status}
- Rôle partenaire: ${p.role || 'Non défini'}
${p.budget ? `- Budget: ${p.budget.toLocaleString('fr-FR')} €` : ''}

**Transcriptions récentes:**
${transcriptionsText}

**Documents récents:**
${documentsText}`;
      }).join('\n\n---\n\n')
    : 'Aucun projet assigné';

  const leadsSection = context.leads.length > 0
    ? context.leads.map(l => {
        const transcriptionsText = l.transcriptions.length > 0
          ? l.transcriptions.map(t => `  - [${t.date}] ${t.title}`).join('\n')
          : '  Aucune transcription';

        return `### Lead: ${l.name}${l.company ? ` (${l.company})` : ''}
- Rôle: ${l.role || 'Non défini'}

**Transcriptions:**
${transcriptionsText}`;
      }).join('\n\n')
    : 'Aucun lead directement associé';

  const synthesisDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return `# Synthèse contextuelle pour ${context.partnerName}
*Générée le ${synthesisDate}*
*${context.projects.length} projets | ${context.leads.length} leads | ${context.totalTranscriptions} transcriptions | ${context.totalDocuments} documents*

---

## Projets assignés

${projectsSection}

---

## Leads associés

${leadsSection}

---

## Instructions

Génère une synthèse complète et structurée de l'activité de ce partenaire en suivant le format défini dans les instructions système. 
Mets en avant les informations les plus récentes et les points nécessitant une attention particulière.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // API key validation is now handled by centralized ai-client

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    const apiKeyHeader = req.headers.get('apikey');

    if (!authHeader) {
      console.warn('[partner-consulte] Missing Authorization header', {
        hasApikeyHeader: Boolean(apiKeyHeader),
      });
      return new Response(
        JSON.stringify({ error: 'Non autorisé', details: 'missing_authorization_header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.warn('[partner-consulte] Invalid Authorization header format');
      return new Response(
        JSON.stringify({ error: 'Non autorisé', details: 'invalid_authorization_header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify JWT with signing keys and extract claims
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.warn('[partner-consulte] JWT verification failed', {
        message: claimsError?.message,
      });
      return new Response(
        JSON.stringify({ error: 'Non autorisé', details: claimsError?.message || 'invalid_token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    const userEmail = (claimsData.claims as any)?.email;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[partner-consulte] User authenticated: ${userId}, email: ${userEmail}`);

    // Get partner_id from user (exclude soft-deleted)
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, partner_type')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    console.log(`[partner-consulte] Partner lookup result:`, { partner, partnerError });

    if (!partner) {
      console.error(`[partner-consulte] Partner not found for user ${userId}. Error:`, partnerError);
      return new Response(
        JSON.stringify({ error: 'Partenaire non trouvé', details: partnerError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[partner-consulte] Generating synthesis for partner ${partner.name} (${partner.id})`);

    // Collect context
    const context = await collectPartnerContext(supabase, partner.id);

    if (context.projects.length === 0 && context.leads.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Aucune donnée disponible pour générer une synthèse' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build prompts
    const systemPrompt = getPartnerSystemPrompt(partner.partner_type || 'partner');
    const userPrompt = buildUserPrompt(context);

    console.log(`[partner-consulte] Calling centralized AI client with ${context.totalTranscriptions} transcriptions...`);

    // Use centralized AI client with automatic DB config lookup
    const synthesis = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { functionName: 'partner-consulte' }
    );

    if (!synthesis) {
      throw new Error('No synthesis generated');
    }

    console.log(`[partner-consulte] Generated synthesis (${synthesis.length} chars)`);

    // Log activity
    await supabase.from('activity_log').insert({
      workspace_id: '00000000-0000-0000-0000-000000000001',
      entity_type: 'partner',
      entity_id: partner.id,
      activity_type: 'partner_consulte_generated',
      title: `Synthèse Partner-Consulte générée pour ${partner.name}`,
      content: `Synthèse de ${context.projects.length} projets, ${context.leads.length} leads, ${context.totalTranscriptions} transcriptions`,
      is_ai_generated: true,
      ai_metadata: {
        version: 'v1',
        projects_count: context.projects.length,
        leads_count: context.leads.length,
        transcriptions_count: context.totalTranscriptions,
        documents_count: context.totalDocuments,
        synthesis_length: synthesis.length,
        model: 'google/gemini-2.5-flash'
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        synthesis,
        context: {
          projects_count: context.projects.length,
          leads_count: context.leads.length,
          transcriptions_count: context.totalTranscriptions,
          documents_count: context.totalDocuments
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[partner-consulte] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
