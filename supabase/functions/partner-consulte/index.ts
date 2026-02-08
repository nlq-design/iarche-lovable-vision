import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.86.0";
import { callLLM } from "../_shared/ai-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RelationalNode {
  name: string;
  entityType: string | null;
  projects: string[];
  meetingCount: number;
  lastSeen: string;
  coParticipants: string[];
}

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
    transcriptions: Array<{
      title: string;
      date: string;
      summary?: string;
      participants?: string[];
    }>;
  }>;
  partnerContextNotes: string[];
  partnerVocabulary: string[];
  knownParticipantMappings: Array<{
    speakerLabel: string;
    entityName: string;
    entityType: string;
  }>;
  relationalNetwork: RelationalNode[];
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

// ---- Helper fetchers ----

async function fetchContextNotes(supabase: any, entityType: string, entityId: string): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('entity_context_notes')
      .select('content, updated_at')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('updated_at', { ascending: false })
      .limit(10);
    return (data || []).map((n: any) => n.content);
  } catch { return []; }
}

async function fetchVocabulary(supabase: any, entityType: string, entityId: string): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('entity_vocabulary')
      .select('term, category')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('category');
    return (data || []).map((v: any) => `${v.term} (${v.category || 'général'})`);
  } catch { return []; }
}

async function fetchParticipantMappings(supabase: any, _workspaceTranscriptionIds: string[]): Promise<PartnerContext['knownParticipantMappings']> {
  try {
    const { data } = await supabase
      .from('participant_entity_mappings')
      .select('participant_name, linked_entity_name, linked_entity_type')
      .eq('workspace_id', '00000000-0000-0000-0000-000000000001')
      .order('last_used_at', { ascending: false })
      .limit(50);
    // Deduplicate by participant_name+linked_entity_type
    const seen = new Set<string>();
    return (data || []).filter((m: any) => {
      const key = `${m.participant_name}::${m.linked_entity_type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((m: any) => ({
      speakerLabel: m.participant_name,
      entityName: m.linked_entity_name || m.participant_name,
      entityType: m.linked_entity_type,
    }));
  } catch { return []; }
}

async function fetchTranscriptionParticipants(supabase: any, transcriptionId: string): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('transcription_participants')
      .select('name, linked_entity_type, role_in_meeting')
      .eq('transcription_id', transcriptionId)
      .eq('presence_status', 'present');
    return (data || []).map((p: any) => {
      let label = p.name;
      if (p.linked_entity_type) label += ` [${p.linked_entity_type}]`;
      if (p.role_in_meeting) label += ` (${p.role_in_meeting})`;
      return label;
    });
  } catch { return []; }
}

// Build relational network: who meets whom across transcriptions
async function buildRelationalNetwork(supabase: any, transcriptionIds: string[], projectNames: Map<string, string>): Promise<RelationalNode[]> {
  if (!transcriptionIds.length) return [];
  try {
    // Fetch all participants across all relevant transcriptions
    const { data: allParticipants } = await supabase
      .from('transcription_participants')
      .select('name, transcription_id, linked_entity_type, presence_status, updated_at')
      .in('transcription_id', transcriptionIds)
      .eq('presence_status', 'present');

    if (!allParticipants?.length) return [];

    // Fetch transcription→project mapping
    const { data: transcriptions } = await supabase
      .from('voice_transcriptions')
      .select('id, project_id, transcription_date')
      .in('id', transcriptionIds);

    const transcriptionProjectMap = new Map<string, string>();
    const transcriptionDateMap = new Map<string, string>();
    for (const t of transcriptions || []) {
      if (t.project_id && projectNames.has(t.project_id)) {
        transcriptionProjectMap.set(t.id, projectNames.get(t.project_id)!);
      }
      transcriptionDateMap.set(t.id, t.transcription_date || '');
    }

    // Group participants by transcription for co-participant detection
    const byTranscription = new Map<string, string[]>();
    for (const p of allParticipants) {
      const list = byTranscription.get(p.transcription_id) || [];
      list.push(p.name);
      byTranscription.set(p.transcription_id, list);
    }

    // Build per-person nodes
    const nodeMap = new Map<string, RelationalNode>();
    for (const p of allParticipants) {
      const existing = nodeMap.get(p.name) || {
        name: p.name,
        entityType: p.linked_entity_type || null,
        projects: [],
        meetingCount: 0,
        lastSeen: '',
        coParticipants: [],
      };

      existing.meetingCount++;

      // Track projects
      const projName = transcriptionProjectMap.get(p.transcription_id);
      if (projName && !existing.projects.includes(projName)) {
        existing.projects.push(projName);
      }

      // Track last seen
      const date = transcriptionDateMap.get(p.transcription_id) || p.updated_at || '';
      if (date > existing.lastSeen) existing.lastSeen = date;

      // Track co-participants
      const coParticipants = byTranscription.get(p.transcription_id) || [];
      for (const co of coParticipants) {
        if (co !== p.name && !existing.coParticipants.includes(co)) {
          existing.coParticipants.push(co);
        }
      }

      nodeMap.set(p.name, existing);
    }

    // Sort by meeting count descending, limit to top 20
    return [...nodeMap.values()]
      .sort((a, b) => b.meetingCount - a.meetingCount)
      .slice(0, 20);
  } catch (e) {
    console.warn('[partner-consulte] Relational network build failed:', e);
    return [];
  }
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

  // 2. Partner-level context notes & vocabulary (parallel)
  const [partnerContextNotes, partnerVocabulary] = await Promise.all([
    fetchContextNotes(supabase, 'partner', partnerId),
    fetchVocabulary(supabase, 'partner', partnerId),
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
  const projectNameMap = new Map<string, string>(); // id → name for relational network

  for (const link of projectLinks || []) {
    if (!link.project) continue;
    const project = link.project as any;
    projectNameMap.set(project.id, project.name);

    // Parallel: transcriptions, documents, context notes, vocabulary
    const [transcriptionsRes, documentsRes, projNotes, projVocab] = await Promise.all([
      supabase.from('voice_transcriptions')
        .select('id, title, transcription_date, ai_summary')
        .eq('project_id', project.id).eq('status', 'done')
        .order('transcription_date', { ascending: false }).limit(5),
      supabase.from('generated_documents')
        .select('id, title, document_type, created_at')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false }).limit(5),
      fetchContextNotes(supabase, 'project', project.id),
      fetchVocabulary(supabase, 'project', project.id),
    ]);

    const transcriptions = transcriptionsRes.data || [];
    const documents = documentsRes.data || [];

    // Enrich transcriptions with participants (parallel)
    const enriched = await Promise.all(transcriptions.map(async (t: any) => {
      allTranscriptionIds.push(t.id);
      const participants = await fetchTranscriptionParticipants(supabase, t.id);
      return {
        title: t.title || 'Transcription',
        date: formatDate(t.transcription_date || t.created_at),
        summary: t.ai_summary?.substring(0, 500) || undefined,
        participants,
      };
    }));

    totalTranscriptions += enriched.length;
    totalDocuments += documents.length;

    const leadInfo = project.opportunity?.lead;

    projects.push({
      id: project.id,
      name: project.name,
      status: project.status,
      budget: project.budget_amount,
      client: leadInfo?.company || leadInfo?.name,
      role: link.role,
      contextNotes: projNotes,
      vocabulary: projVocab,
      transcriptions: enriched,
      documents: documents.map((d: any) => ({
        title: d.title, type: d.document_type, date: formatDate(d.created_at)
      })),
    });
  }

  // 4. Linked leads
  const { data: leadLinks } = await supabase
    .from('lead_partners')
    .select('role, lead:leads(id, name, company)')
    .eq('partner_id', partnerId);

  const leads: PartnerContext['leads'] = [];

  for (const link of leadLinks || []) {
    if (!link.lead) continue;
    const lead = link.lead as any;

    // Skip leads already covered by projects
    if (projects.some(p => p.client === (lead.company || lead.name))) continue;

    const [transcriptionsRes, leadNotes, leadVocab] = await Promise.all([
      supabase.from('voice_transcriptions')
        .select('id, title, transcription_date, ai_summary')
        .eq('lead_id', lead.id).eq('status', 'done')
        .order('transcription_date', { ascending: false }).limit(3),
      fetchContextNotes(supabase, 'lead', lead.id),
      fetchVocabulary(supabase, 'lead', lead.id),
    ]);

    const transcriptions = transcriptionsRes.data || [];

    const enriched = await Promise.all(transcriptions.map(async (t: any) => {
      allTranscriptionIds.push(t.id);
      const participants = await fetchTranscriptionParticipants(supabase, t.id);
      return {
        title: t.title || 'Transcription',
        date: formatDate(t.transcription_date || t.created_at),
        summary: t.ai_summary?.substring(0, 500) || undefined,
        participants,
      };
    }));

    totalTranscriptions += enriched.length;

    leads.push({
      id: lead.id,
      name: lead.name,
      company: lead.company,
      role: link.role,
      contextNotes: leadNotes,
      vocabulary: leadVocab,
      transcriptions: enriched,
    });
  }

  // 5. Known participant mappings + relational network (parallel)
  const [knownParticipantMappings, relationalNetwork] = await Promise.all([
    fetchParticipantMappings(supabase, allTranscriptionIds),
    buildRelationalNetwork(supabase, allTranscriptionIds, projectNameMap),
  ]);

  console.log(`[partner-consulte] Relational network: ${relationalNetwork.length} nodes from ${allTranscriptionIds.length} transcriptions`);

  return {
    partnerId: partner.id,
    partnerName: partner.name,
    partnerType: partner.partner_type || 'partner',
    projects,
    leads,
    partnerContextNotes: partnerContextNotes,
    partnerVocabulary: partnerVocabulary,
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

## PROFIL PARTENAIRE
${typeContext}

## MISSION
Fournir une synthèse 360° claire, précise et actionable de l'activité de ce partenaire avec IArche.
Tu combines les données de projets, leads, transcriptions, documents, notes de contexte et vocabulaire métier.

## HIÉRARCHIE DES SOURCES (par poids décroissant)
1. **Notes de contexte** (rédigées manuellement par l'équipe, fiabilité maximale)
2. **Résumés de transcriptions** (synthèses IA validées)
3. **Participants identifiés** (liens CRM confirmés speaker → entité)
4. **Documents et métadonnées projet** (budgets, statuts, rôles)

## INTELLIGENCE RELATIONNELLE
Tu disposes d'un historique de **correspondances speaker ↔ entité CRM** issues de transcriptions précédentes.
Utilise-les pour enrichir ta compréhension des interlocuteurs récurrents et de leur rôle dans l'écosystème.

## VOCABULAIRE MÉTIER
Des termes techniques, acronymes et jargon propres à chaque entité te sont fournis.
Utilise-les naturellement dans ta synthèse pour montrer ta compréhension du contexte métier.

## RÈGLES CRITIQUES
1. **CONFIDENTIALITÉ** : Ne jamais mentionner d'informations sur des projets/leads auxquels le partenaire n'est pas lié
2. **SOURCING** : Citer les sources (transcriptions, documents, notes) pour chaque insight
3. **STRUCTURE** : Organiser par mission/projet pour faciliter la lecture
4. **RÉCENCE** : Prioriser les informations récentes ; signaler les données obsolètes
5. **CONNEXIONS** : Mettre en évidence les liens entre projets, leads et interlocuteurs

## FORMAT DE SORTIE

### 📊 Vue d'ensemble
Résumé en 2-3 phrases de l'activité du partenaire et de sa dynamique actuelle.

### 🎯 Missions en cours
Pour chaque projet actif :
- Nom du projet et client
- Rôle du partenaire
- **Contexte clé** (issu des notes de contexte si disponibles)
- Points saillants des dernières interactions
- Prochaines étapes identifiées

### 💼 Leads associés
Pour chaque lead :
- Nom et entreprise
- Historique relationnel (interlocuteurs récurrents)
- Actions récentes et statut

### 🔗 Réseau relationnel
Interlocuteurs récurrents identifiés à travers les transcriptions :
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
- Utiliser le vocabulaire métier fourni quand pertinent
`;
}

function buildUserPrompt(context: PartnerContext): string {
  // ---- Partner-level enrichment ----
  const partnerNotesBlock = context.partnerContextNotes.length > 0
    ? `\n## 📝 Notes de contexte (Partenaire)\n${context.partnerContextNotes.map(n => `> ${n}`).join('\n')}\n`
    : '';

  const partnerVocabBlock = context.partnerVocabulary.length > 0
    ? `\n## 📖 Vocabulaire métier (Partenaire)\n${context.partnerVocabulary.join(', ')}\n`
    : '';

  // ---- Participant mappings ----
  const mappingsBlock = context.knownParticipantMappings.length > 0
    ? `\n## 🔗 Correspondances speaker ↔ CRM connues\n${context.knownParticipantMappings.map(m => `- "${m.speakerLabel}" → ${m.entityName} (${m.entityType})`).join('\n')}\n`
    : '';

  // ---- Relational network ----
  const networkBlock = context.relationalNetwork.length > 0
    ? `\n## 🕸️ Réseau relationnel (graphe de contacts)\n${context.relationalNetwork.map(n => {
        let line = `- **${n.name}**`;
        if (n.entityType) line += ` [${n.entityType}]`;
        line += ` — ${n.meetingCount} réunion(s)`;
        if (n.projects.length) line += `, projets: ${n.projects.join(', ')}`;
        if (n.lastSeen) line += `, dernier: ${formatDate(n.lastSeen)}`;
        if (n.coParticipants.length > 0) {
          line += `\n  ↔ Co-participants fréquents: ${n.coParticipants.slice(0, 5).join(', ')}`;
        }
        return line;
      }).join('\n')}\n`
    : '';

  // ---- Projects ----
  const projectsSection = context.projects.length > 0
    ? context.projects.map(p => {
        const notesBlock = p.contextNotes.length > 0
          ? `\n**Notes de contexte:**\n${p.contextNotes.map(n => `> ${n}`).join('\n')}`
          : '';

        const vocabBlock = p.vocabulary.length > 0
          ? `\n**Vocabulaire:** ${p.vocabulary.join(', ')}`
          : '';

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
${notesBlock}${vocabBlock}

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
${notesBlock}${vocabBlock}

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
${partnerNotesBlock}${partnerVocabBlock}${mappingsBlock}${networkBlock}
## Projets assignés

${projectsSection}

---

## Leads associés

${leadsSection}

---

## Instructions

Génère une synthèse complète et structurée de l'activité de ce partenaire en suivant le format défini dans les instructions système.
Exploite les notes de contexte (priorité haute), le vocabulaire métier et les correspondances speaker-CRM pour une synthèse riche et précise.
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

    const systemPrompt = getPartnerSystemPrompt(partner.partner_type || 'partner');
    const userPrompt = buildUserPrompt(context);

    console.log(`[partner-consulte] Calling AI with enriched context: ${context.totalTranscriptions} transcriptions, ${context.partnerContextNotes.length} partner notes, ${context.knownParticipantMappings.length} mappings`);

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
      content: `Synthèse de ${context.projects.length} projets, ${context.leads.length} leads, ${context.totalTranscriptions} transcriptions, ${context.partnerContextNotes.length} notes contexte, ${context.knownParticipantMappings.length} mappings participants`,
      is_ai_generated: true,
      ai_metadata: {
        version: 'v3-relational',
        projects_count: context.projects.length,
        leads_count: context.leads.length,
        transcriptions_count: context.totalTranscriptions,
        documents_count: context.totalDocuments,
        context_notes_count: context.partnerContextNotes.length,
        vocabulary_terms: context.partnerVocabulary.length,
        participant_mappings: context.knownParticipantMappings.length,
        relational_network_nodes: context.relationalNetwork.length,
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
