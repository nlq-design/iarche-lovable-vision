import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.86.0";
import { callLLM } from "../_shared/ai-client.ts";
import {
  fetchContextNotes,
  fetchVocabulary,
  fetchParticipantMappings,
  fetchTranscriptionParticipants,
  buildRelationalNetwork,
  fetchLeadContacts,
  fetchMeetingNotes,
  fetchActivityLog,
  formatDateFR,
  FRENCH_INSTRUCTION,
  buildContextNotesBlock,
  buildVocabularyBlock,
  buildMappingsBlock,
  buildNetworkBlock,
  buildLeadContactsBlock,
  buildMeetingNotesBlock,
  buildActivityLogBlock,
  type RelationalNode,
  type ParticipantMapping,
} from "../_shared/consulte-helpers.ts";

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
    contextNotes: string[];
    vocabulary: string[];
    leadContacts: Awaited<ReturnType<typeof fetchLeadContacts>>;
    meetingNotes: Awaited<ReturnType<typeof fetchMeetingNotes>>;
    transcriptions: Array<{
      title: string;
      date: string;
      summary?: string;
      participants?: string[];
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
    contextNotes: string[];
    vocabulary: string[];
    leadContacts: Awaited<ReturnType<typeof fetchLeadContacts>>;
    transcriptions: Array<{
      title: string;
      date: string;
      summary?: string;
      participants?: string[];
    }>;
  }>;
  partnerContextNotes: string[];
  partnerVocabulary: string[];
  partnerActivityLog: Awaited<ReturnType<typeof fetchActivityLog>>;
  knownParticipantMappings: ParticipantMapping[];
  relationalNetwork: RelationalNode[];
  totalTranscriptions: number;
  totalDocuments: number;
}

// ---- Main context collector ----

async function collectPartnerContext(
  supabase: any,
  partnerId: string
): Promise<PartnerContext> {
  console.log(`[partner-consulte] Collecting enriched context for partner ${partnerId}`);

  // 1. Partner info
  const { data: partner } = await supabase
    .from('partners')
    .select('id, name, partner_type, company')
    .eq('id', partnerId)
    .single();

  if (!partner) throw new Error('Partner not found');

  // 2. Partner-level enrichment (parallel)
  const [partnerContextNotes, partnerVocabulary, partnerActivityLog] = await Promise.all([
    fetchContextNotes(supabase, 'partner', partnerId),
    fetchVocabulary(supabase, 'partner', partnerId),
    fetchActivityLog(supabase, 'partner', partnerId),
  ]);

  // 3. Linked projects
  const { data: projectLinks } = await supabase
    .from('project_partners')
    .select(`
      role,
      project:projects(
        id, name, status, budget_amount,
        opportunity:opportunities(lead:leads(id, name, company))
      )
    `)
    .eq('partner_id', partnerId);

  const projects: PartnerContext['projects'] = [];
  let totalTranscriptions = 0;
  let totalDocuments = 0;
  const allTranscriptionIds: string[] = [];
  const projectNameMap = new Map<string, string>();

  // Process all projects in parallel
  const projectPromises = (projectLinks || [])
    .filter((link: any) => link.project)
    .map(async (link: any) => {
      const project = link.project as any;
      projectNameMap.set(project.id, project.name);
      const leadInfo = project.opportunity?.lead;
      const leadId = leadInfo?.id;

      const [transcriptionsRes, documentsRes, projNotes, projVocab, projContacts, projMeetingNotes] = await Promise.all([
        supabase.from('voice_transcriptions')
          .select('id, title, transcription_date, ai_summary')
          .eq('project_id', project.id).eq('status', 'done')
          .order('transcription_date', { ascending: false }).limit(10),
        supabase.from('generated_documents')
          .select('id, title, document_type, created_at')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false }).limit(5),
        fetchContextNotes(supabase, 'project', project.id),
        fetchVocabulary(supabase, 'project', project.id),
        leadId ? fetchLeadContacts(supabase, leadId) : Promise.resolve([]),
        fetchMeetingNotes(supabase, 'project', project.id),
      ]);

      const transcriptions = transcriptionsRes.data || [];
      const documents = documentsRes.data || [];

      // Enrich transcriptions with participants (parallel)
      const enriched = await Promise.all(transcriptions.map(async (t: any) => {
        allTranscriptionIds.push(t.id);
        const participants = await fetchTranscriptionParticipants(supabase, t.id);
        return {
          title: t.title || 'Transcription',
          date: formatDateFR(t.transcription_date || t.created_at),
          summary: t.ai_summary?.substring(0, 1000) || undefined,
          participants,
        };
      }));

      totalTranscriptions += enriched.length;
      totalDocuments += documents.length;

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        budget: project.budget_amount,
        client: leadInfo?.company || leadInfo?.name,
        role: link.role,
        contextNotes: projNotes,
        vocabulary: projVocab,
        leadContacts: projContacts,
        meetingNotes: projMeetingNotes,
        transcriptions: enriched,
        documents: documents.map((d: any) => ({
          title: d.title, type: d.document_type, date: formatDateFR(d.created_at)
        })),
      };
    });

  projects.push(...await Promise.all(projectPromises));

  // 4. Linked leads
  const { data: leadLinks } = await supabase
    .from('lead_partners')
    .select('role, lead:leads(id, name, company)')
    .eq('partner_id', partnerId);

  const leads: PartnerContext['leads'] = [];

  const leadPromises = (leadLinks || [])
    .filter((link: any) => link.lead)
    .filter((link: any) => !projects.some(p => p.client === ((link.lead as any).company || (link.lead as any).name)))
    .map(async (link: any) => {
      const lead = link.lead as any;

      const [transcriptionsRes, leadNotes, leadVocab, leadContacts] = await Promise.all([
        supabase.from('voice_transcriptions')
          .select('id, title, transcription_date, ai_summary')
          .eq('lead_id', lead.id).eq('status', 'done')
          .order('transcription_date', { ascending: false }).limit(5),
        fetchContextNotes(supabase, 'lead', lead.id),
        fetchVocabulary(supabase, 'lead', lead.id),
        fetchLeadContacts(supabase, lead.id),
      ]);

      const transcriptions = transcriptionsRes.data || [];

      const enriched = await Promise.all(transcriptions.map(async (t: any) => {
        allTranscriptionIds.push(t.id);
        const participants = await fetchTranscriptionParticipants(supabase, t.id);
        return {
          title: t.title || 'Transcription',
          date: formatDateFR(t.transcription_date || t.created_at),
          summary: t.ai_summary?.substring(0, 1000) || undefined,
          participants,
        };
      }));

      totalTranscriptions += enriched.length;

      return {
        id: lead.id,
        name: lead.name,
        company: lead.company,
        role: link.role,
        contextNotes: leadNotes,
        vocabulary: leadVocab,
        leadContacts: leadContacts,
        transcriptions: enriched,
      };
    });

  leads.push(...await Promise.all(leadPromises));

  // 5. Known participant mappings + relational network (parallel)
  const [knownParticipantMappings, relationalNetwork] = await Promise.all([
    fetchParticipantMappings(supabase),
    buildRelationalNetwork(supabase, allTranscriptionIds, projectNameMap),
  ]);

  console.log(`[partner-consulte] Context: ${projects.length} projects, ${leads.length} leads, ${totalTranscriptions} transcriptions, ${relationalNetwork.length} network nodes`);

  return {
    partnerId: partner.id,
    partnerName: partner.name,
    partnerType: partner.partner_type || 'partner',
    projects,
    leads,
    partnerContextNotes,
    partnerVocabulary,
    partnerActivityLog,
    knownParticipantMappings,
    relationalNetwork,
    totalTranscriptions,
    totalDocuments,
  };
}

// ---- Prompts ----

function getPartnerSystemPrompt(partnerType: string): string {
  const typeContext = partnerType === 'expert_ia'
    ? "Expert IA intervenant sur des missions techniques d'IA."
    : partnerType === 'independant'
    ? "Indépendant réalisant des missions en sous-traitance."
    : partnerType === 'apporteur'
    ? "Apporteur d'affaires recommandant des clients."
    : "Partenaire externe.";

  return `Tu es l'assistant IA contextuel de l'espace partenaire IArche.
${FRENCH_INSTRUCTION}
## PROFIL PARTENAIRE
${typeContext}

## MISSION
Fournir une synthèse 360° claire, précise et actionable de l'activité de ce partenaire avec IArche.
Tu combines les données de projets, leads, transcriptions, documents, notes de contexte, vocabulaire métier, contacts et comptes-rendus de réunion.

## ⛔ RÈGLE ANTI-HALLUCINATION ABSOLUE
**INTERDICTION FORMELLE D'INVENTER** :
- NE JAMAIS inventer de noms de personnes, entreprises, montants, dates
- Si une information manque, écrire : "[Non spécifié dans les sources]"

## HIÉRARCHIE DES SOURCES (par poids décroissant)
1. **Notes de contexte** (rédigées manuellement par l'équipe, fiabilité maximale)
2. **Comptes-rendus de réunion** (objectifs, décisions, prochaines étapes)
3. **Résumés de transcriptions** (synthèses IA validées)
4. **Contacts identifiés** (interlocuteurs clés avec rôles)
5. **Participants identifiés** (liens CRM confirmés speaker → entité)
6. **Documents et métadonnées projet** (budgets, statuts, rôles)
7. **Historique d'activité** (actions récentes tracées)

## INTELLIGENCE RELATIONNELLE
Tu disposes d'un historique de **correspondances speaker ↔ entité CRM** issues de transcriptions précédentes.
Utilise-les pour enrichir ta compréhension des interlocuteurs récurrents et de leur rôle dans l'écosystème.

## VOCABULAIRE MÉTIER
Des termes techniques, acronymes et jargon propres à chaque entité te sont fournis.
Utilise-les naturellement dans ta synthèse pour montrer ta compréhension du contexte métier.

## TRAÇABILITÉ OBLIGATOIRE
Chaque information clé DOIT porter sa source :
- Exemple : "Budget : 15 000€ HT (source: CR réunion 15/01/2026)"

## FORMAT DE SORTIE

### 📊 Vue d'ensemble
Résumé en 2-3 phrases de l'activité du partenaire et de sa dynamique actuelle.

### 🎯 Missions en cours
Pour chaque projet actif :
- Nom du projet et client
- Rôle du partenaire
- **Interlocuteurs clés** (issus des contacts et participants)
- **Contexte clé** (issu des notes de contexte si disponibles)
- Points saillants des dernières interactions
- Prochaines étapes identifiées (issues des CR de réunion)

### 💼 Leads associés
Pour chaque lead :
- Nom, entreprise et contacts
- Historique relationnel
- Actions récentes

### 🔗 Réseau relationnel
Interlocuteurs récurrents identifiés :
- Qui intervient dans quels projets
- Rôles et patterns de collaboration

### 📅 Événements récents
Timeline des 5 dernières interactions significatives.

### ⚠️ Points d'attention
Éléments nécessitant une action, un suivi ou signalant un risque.

## STYLE
- Professionnel mais accessible
- Bullet points clairs
- Dates au format français (DD/MM/YYYY)
- Montants formatés (15 000 €)
- Utiliser le vocabulaire métier fourni
`;
}

function buildUserPrompt(context: PartnerContext): string {
  const partnerNotesBlock = buildContextNotesBlock(context.partnerContextNotes);
  const partnerVocabBlock = buildVocabularyBlock(context.partnerVocabulary);
  const mappingsBlock = buildMappingsBlock(context.knownParticipantMappings);
  const networkBlock = buildNetworkBlock(context.relationalNetwork);
  const activityBlock = buildActivityLogBlock(context.partnerActivityLog);

  // ---- Projects ----
  const projectsSection = context.projects.length > 0
    ? context.projects.map(p => {
        const notesBlock = p.contextNotes.length > 0
          ? `\n**Notes de contexte:**\n${p.contextNotes.map(n => `> ${n}`).join('\n')}`
          : '';

        const vocabBlock = p.vocabulary.length > 0
          ? `\n**Vocabulaire:** ${p.vocabulary.join(', ')}`
          : '';

        const contactsBlock = buildLeadContactsBlock(p.leadContacts);
        const meetingBlock = buildMeetingNotesBlock(p.meetingNotes);

        const transcriptionsText = p.transcriptions.length > 0
          ? p.transcriptions.map(t => {
              let line = `  - [${t.date}] ${t.title}`;
              if (t.participants?.length) line += `\n    👥 ${t.participants.join(', ')}`;
              if (t.summary) line += `\n    Résumé: ${t.summary}`;
              return line;
            }).join('\n')
          : '  Aucune transcription récente';

        const documentsText = p.documents.length > 0
          ? p.documents.map(d => `  - [${d.date}] ${d.title} (${d.type})`).join('\n')
          : '  Aucun document récent';

        return `### Projet: ${p.name}
- Client: ${p.client || 'Non spécifié'}
- Statut: ${p.status}
- Rôle partenaire: ${p.role || 'Non défini'}
${p.budget ? `- Budget: ${p.budget.toLocaleString('fr-FR')} €` : ''}
${notesBlock}${vocabBlock}${contactsBlock}${meetingBlock}

**Transcriptions récentes:**
${transcriptionsText}

**Documents récents:**
${documentsText}`;
      }).join('\n\n---\n\n')
    : 'Aucun projet assigné';

  // ---- Leads ----
  const leadsSection = context.leads.length > 0
    ? context.leads.map(l => {
        const notesBlock = l.contextNotes.length > 0
          ? `\n**Notes de contexte:**\n${l.contextNotes.map(n => `> ${n}`).join('\n')}`
          : '';

        const vocabBlock = l.vocabulary.length > 0
          ? `\n**Vocabulaire:** ${l.vocabulary.join(', ')}`
          : '';

        const contactsBlock = buildLeadContactsBlock(l.leadContacts);

        const transcriptionsText = l.transcriptions.length > 0
          ? l.transcriptions.map(t => {
              let line = `  - [${t.date}] ${t.title}`;
              if (t.participants?.length) line += `\n    👥 ${t.participants.join(', ')}`;
              if (t.summary) line += `\n    Résumé: ${t.summary}`;
              return line;
            }).join('\n')
          : '  Aucune transcription';

        return `### Lead: ${l.name}${l.company ? ` (${l.company})` : ''}
- Rôle: ${l.role || 'Non défini'}
${notesBlock}${vocabBlock}${contactsBlock}

**Transcriptions:**
${transcriptionsText}`;
      }).join('\n\n')
    : 'Aucun lead directement associé';

  const synthesisDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return `# Synthèse contextuelle enrichie pour ${context.partnerName}
*Générée le ${synthesisDate}*
*${context.projects.length} projets | ${context.leads.length} leads | ${context.totalTranscriptions} transcriptions | ${context.totalDocuments} documents*

---
${partnerNotesBlock}${partnerVocabBlock}${mappingsBlock}${networkBlock}${activityBlock}
## Projets assignés

${projectsSection}

---

## Leads associés

${leadsSection}

---

## Instructions

Génère une synthèse complète et structurée de l'activité de ce partenaire en suivant le format défini dans les instructions système.
Exploite les notes de contexte (priorité haute), le vocabulaire métier, les contacts, les CR de réunion et les correspondances speaker-CRM pour une synthèse riche et précise.
Mets en avant les connexions relationnelles entre interlocuteurs et projets.`;
}

// ---- Main handler ----

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.warn('[partner-consulte] JWT verification failed', { message: claimsError?.message });
      return new Response(
        JSON.stringify({ error: 'Non autorisé', details: claimsError?.message || 'invalid_token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    const userEmail = (claimsData.claims as any)?.email;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[partner-consulte] User authenticated: ${userId}, email: ${userEmail}`);

    // Try DB prompt first, fallback to hardcoded
    const { data: promptData } = await supabase
      .from('ai_prompts')
      .select('system_prompt, user_prompt, model_config')
      .eq('slug', 'consulte-partner')
      .single();

    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, partner_type')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (!partner) {
      console.error(`[partner-consulte] Partner not found for user ${userId}.`, partnerError);
      return new Response(
        JSON.stringify({ error: 'Partenaire non trouvé', details: partnerError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[partner-consulte] Generating enriched synthesis for ${partner.name} (${partner.id})`);

    const context = await collectPartnerContext(supabase, partner.id);

    if (context.projects.length === 0 && context.leads.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Aucune donnée disponible pour générer une synthèse' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use DB prompt if available (upgraded), otherwise hardcoded
    const systemPrompt = promptData?.system_prompt || getPartnerSystemPrompt(partner.partner_type || 'partner');
    const userPrompt = buildUserPrompt(context);

    console.log(`[partner-consulte] Calling AI: ${context.totalTranscriptions} transcriptions, ${context.partnerContextNotes.length} notes, ${context.knownParticipantMappings.length} mappings, ${context.partnerActivityLog.length} activities`);

    const synthesis = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { functionName: 'partner-consulte' }
    );

    if (!synthesis) throw new Error('No synthesis generated');

    console.log(`[partner-consulte] Generated enriched synthesis (${synthesis.length} chars)`);

    await supabase.from('activity_log').insert({
      workspace_id: '00000000-0000-0000-0000-000000000001',
      entity_type: 'partner',
      entity_id: partner.id,
      activity_type: 'partner_consulte_generated',
      title: `Synthèse Partner-Consulte enrichie pour ${partner.name}`,
      content: `Synthèse de ${context.projects.length} projets, ${context.leads.length} leads, ${context.totalTranscriptions} transcriptions, ${context.partnerContextNotes.length} notes contexte`,
      is_ai_generated: true,
      ai_metadata: {
        version: 'v4-unified',
        projects_count: context.projects.length,
        leads_count: context.leads.length,
        transcriptions_count: context.totalTranscriptions,
        documents_count: context.totalDocuments,
        context_notes_count: context.partnerContextNotes.length,
        vocabulary_terms: context.partnerVocabulary.length,
        participant_mappings: context.knownParticipantMappings.length,
        relational_network_nodes: context.relationalNetwork.length,
        activity_log_count: context.partnerActivityLog.length,
        synthesis_length: synthesis.length,
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
      JSON.stringify({ error: 'Erreur serveur', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
