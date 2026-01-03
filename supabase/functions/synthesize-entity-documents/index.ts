import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types d'entités supportés - Graphe complet bidirectionnel
type EntityType = 'lead' | 'project' | 'solution' | 'partner' | 'transcription' | 'document';

interface SynthesizeRequest {
  entity_type: EntityType;
  entity_id: string;
  cascade?: boolean;
}

interface ChronologicalEvent {
  date: string;
  dateObj: Date;
  type: string;
  title: string;
  content: string;
  source_entity?: { type: EntityType; id: string; name: string };
}

interface LinkedEntity {
  type: EntityType;
  id: string;
  name: string;
  role?: string;
  context?: string;
}

interface GraphData {
  entityName: string;
  entityInfo: Record<string, any>;
  events: ChronologicalEvent[];
  linkedEntities: LinkedEntity[];
  provenance: { type: EntityType; id: string; name: string; date: string }[];
  contextNotes: string[]; // User-provided context notes for synthesis enrichment
}

// ============= HELPERS (defined first) =============

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function countSources(events: ChronologicalEvent[]): Record<string, number> {
  const counts: Record<string, number> = {};
  events.forEach(e => {
    const type = e.type.toLowerCase().replace(/\s+/g, '_');
    counts[type] = (counts[type] || 0) + 1;
  });
  return counts;
}

function getDefaultSystemPrompt(): string {
  return `Tu es un assistant expert en synthèse commerciale pour IArche, cabinet de conseil en transformation digitale.

Ta mission : produire une SYNTHÈSE TRANSVERSALE COMPLÈTE de toutes les informations liées à une entité du CRM.

Cette synthèse doit servir de "mémoire contextuelle" pour le suivi commercial et les interactions futures.

## Règles de synthèse :
1. Respecter strictement l'ordre chronologique des événements
2. Ne jamais perdre d'information clé (dates, noms, décisions, montants)
3. Identifier les RELATIONS entre entités (qui est lié à qui, pourquoi)
4. Mettre en évidence les ACTIONS EN COURS et À VENIR
5. Distinguer les types de partenaires (Expert IA = collab technique, Indépendant = sous-traitance, Apporteur = commission)

## Format de sortie :
- Commencer par un résumé exécutif (3-5 phrases)
- Puis détailler chronologiquement par section thématique
- Terminer par les points d'attention et prochaines actions

## Style :
- Professionnel mais accessible
- Bullet points pour les listes
- Dates au format DD/MM/YYYY
- Montants en euros avec séparateurs
`;
}

function getDefaultUserPrompt(): string {
  return `# Synthèse transversale pour {{entity_type}} : {{entity_name}}

**Date de synthèse** : {{synthesis_date}}

## Informations de base
{{entity_info}}

## Historique chronologique ({{events_count}} événements)
{{chronological_context}}

---

Génère une synthèse complète de cette entité en incluant :
1. **Résumé exécutif** : situation actuelle en 3-5 phrases
2. **Historique des interactions** : timeline des événements clés
3. **Entités liées** : qui est impliqué et comment ({{linked_count}} entités)
4. **Documents et transcriptions** : synthèse du contenu clé
5. **Points d'attention** : risques, opportunités, urgences
6. **Prochaines actions** : ce qui doit être fait

La synthèse doit permettre à quelqu'un de comprendre IMMÉDIATEMENT le contexte complet de cette entité.`;
}

// ============= STORAGE FUNCTIONS =============

async function storeSynthesis(supabase: any, entityType: EntityType, entityId: string, synthesis: string) {
  const updateData = { 
    ai_documents_summary: synthesis, 
    synthesis_stale: false 
  };

  let error = null;

  switch (entityType) {
    case 'lead':
      ({ error } = await supabase.from('leads').update(updateData).eq('id', entityId));
      break;
    case 'project':
      ({ error } = await supabase.from('projects').update(updateData).eq('id', entityId));
      break;
    case 'solution':
      ({ error } = await supabase.from('articles').update(updateData).eq('id', entityId));
      break;
    case 'partner':
      ({ error } = await supabase.from('partners').update(updateData).eq('id', entityId));
      break;
    case 'transcription':
      ({ error } = await supabase.from('voice_transcriptions').update(updateData).eq('id', entityId));
      break;
    case 'document':
      ({ error } = await supabase.from('generated_documents').update(updateData).eq('id', entityId));
      break;
  }

  if (error) {
    console.error('[synthesize-v2] Storage error:', error);
    throw error;
  }
}

async function clearStaleFlag(supabase: any, entityType: EntityType, entityId: string) {
  const tables: Record<EntityType, string> = {
    lead: 'leads',
    project: 'projects',
    solution: 'articles',
    partner: 'partners',
    transcription: 'voice_transcriptions',
    document: 'generated_documents'
  };

  await supabase
    .from(tables[entityType])
    .update({ synthesis_stale: false })
    .eq('id', entityId);
}

async function markEntityStale(supabase: any, entityType: EntityType, entityId: string) {
  const tables: Record<EntityType, string> = {
    lead: 'leads',
    project: 'projects',
    solution: 'articles',
    partner: 'partners',
    transcription: 'voice_transcriptions',
    document: 'generated_documents'
  };

  await supabase
    .from(tables[entityType])
    .update({ synthesis_stale: true })
    .eq('id', entityId);
}

// ============= COLLECTORS =============

async function fetchEntityBase(supabase: any, entityType: EntityType, entityId: string) {
  let entityData: any = null;
  let name = '';
  let info: Record<string, any> = {};

  switch (entityType) {
    case 'lead': {
      const { data } = await supabase
        .from('leads')
        .select('*, opportunities(id, title, stage)')
        .eq('id', entityId)
        .single();
      entityData = data;
      name = data?.company || data?.name || 'Lead';
      info = { name: data?.name, company: data?.company, email: data?.email, phone: data?.phone, source: data?.source, qualification_status: data?.qualification_status, lead_score: data?.lead_score };
      break;
    }
    case 'project': {
      const { data } = await supabase
        .from('projects')
        .select('*, opportunity:opportunities(id, title, lead:leads(id, name, company))')
        .eq('id', entityId)
        .single();
      entityData = data;
      name = data?.name || 'Projet';
      info = { name: data?.name, status: data?.status, health_status: data?.health_status, budget_amount: data?.budget_amount };
      break;
    }
    case 'solution': {
      const { data } = await supabase.from('articles').select('*').eq('id', entityId).eq('resource_type', 'solution').single();
      entityData = data;
      name = data?.title || 'Solution';
      info = { title: data?.title, slug: data?.slug, excerpt: data?.excerpt };
      break;
    }
    case 'partner': {
      const { data } = await supabase.from('partners').select('*').eq('id', entityId).single();
      entityData = data;
      name = data?.name || 'Partenaire';
      info = { name: data?.name, type: data?.type, company: data?.company, expertise: data?.expertise, status: data?.status };
      break;
    }
    case 'transcription': {
      const { data } = await supabase.from('voice_transcriptions').select('*, lead:leads(id, name, company), project:projects(id, name)').eq('id', entityId).single();
      entityData = data;
      name = data?.title || 'Transcription';
      info = { title: data?.title, status: data?.status, transcription_date: data?.transcription_date };
      break;
    }
    case 'document': {
      const { data } = await supabase.from('generated_documents').select('*, lead:leads(id, name, company), project:projects(id, name)').eq('id', entityId).single();
      entityData = data;
      name = data?.title || 'Document';
      info = { title: data?.title, document_type: data?.document_type, status: data?.status, version: data?.version };
      break;
    }
  }

  return { entityData, name, info };
}

async function collectUploadedFiles(supabase: any, entityType: EntityType, entityId: string, events: ChronologicalEvent[], linkedEntities: LinkedEntity[]) {
  let linkedFiles: any[] = [];
  
  if (entityType === 'lead') {
    const { data } = await supabase.from('uploaded_files').select('*').contains('lead_ids', [entityId]);
    linkedFiles = data || [];
  } else if (entityType === 'project') {
    const { data } = await supabase.from('uploaded_files').select('*').contains('project_ids', [entityId]);
    linkedFiles = data || [];
  } else if (entityType === 'solution') {
    const { data } = await supabase.from('uploaded_files').select('*').contains('solution_ids', [entityId]);
    linkedFiles = data || [];
  } else if (entityType === 'document') {
    const { data } = await supabase.from('uploaded_files').select('*').eq('generated_document_id', entityId);
    linkedFiles = data || [];
  } else if (entityType === 'partner') {
    const { data } = await supabase.from('uploaded_files').select('*').contains('partner_ids', [entityId]);
    linkedFiles = data || [];
  }

  linkedFiles.forEach(file => {
    const content = file.ai_summary || file.extracted_content?.substring(0, 2000) || 'Contenu non disponible';
    events.push({
      date: formatDate(file.created_at),
      dateObj: new Date(file.created_at),
      type: 'Document uploadé',
      title: file.original_filename,
      content: `[${file.file_type || 'fichier'}] ${content}`
    });
  });
}

async function collectTranscriptions(supabase: any, entityType: EntityType, entityId: string, events: ChronologicalEvent[], linkedEntities: LinkedEntity[]) {
  let transcriptions: any[] = [];

  if (entityType === 'lead') {
    const { data } = await supabase.from('voice_transcriptions').select('*').eq('lead_id', entityId).eq('status', 'done');
    transcriptions = data || [];
  } else if (entityType === 'project') {
    const { data } = await supabase.from('voice_transcriptions').select('*').eq('project_id', entityId).eq('status', 'done');
    transcriptions = data || [];
  } else if (entityType === 'solution') {
    const { data } = await supabase.from('voice_transcriptions').select('*').eq('solution_id', entityId).eq('status', 'done');
    transcriptions = data || [];
  } else if (entityType === 'partner') {
    const { data: links } = await supabase.from('transcription_partners').select('transcription_id').eq('partner_id', entityId);
    if (links?.length > 0) {
      const { data } = await supabase.from('voice_transcriptions').select('*').in('id', links.map((l: any) => l.transcription_id)).eq('status', 'done');
      transcriptions = data || [];
    }
  } else if (entityType === 'document') {
    // For documents, get transcriptions via lead_id and project_id
    const { data: doc } = await supabase.from('generated_documents').select('lead_id, project_id').eq('id', entityId).single();
    if (doc) {
      const allTrans: any[] = [];
      if (doc.lead_id) {
        const { data } = await supabase.from('voice_transcriptions').select('*').eq('lead_id', doc.lead_id).eq('status', 'done');
        if (data) allTrans.push(...data);
      }
      if (doc.project_id) {
        const { data } = await supabase.from('voice_transcriptions').select('*').eq('project_id', doc.project_id).eq('status', 'done');
        if (data) {
          data.forEach((t: any) => {
            if (!allTrans.find(x => x.id === t.id)) allTrans.push(t);
          });
        }
      }
      transcriptions = allTrans;
    }
  }

  transcriptions.forEach(t => {
    const eventDate = t.transcription_date || t.created_at;
    const content = t.ai_summary || t.content?.substring(0, 2000) || '';
    events.push({
      date: formatDate(eventDate),
      dateObj: new Date(eventDate),
      type: 'Transcription',
      title: t.title || 'Transcription audio',
      content
    });
  });
}

async function collectPartners(supabase: any, entityType: EntityType, entityId: string, events: ChronologicalEvent[], linkedEntities: LinkedEntity[]) {
  if (entityType === 'partner') return;

  const partnerTableMap: Record<string, string> = { lead: 'lead_partners', project: 'project_partners', solution: 'solution_partners', document: 'document_partners', transcription: 'transcription_partners' };
  const table = partnerTableMap[entityType];
  if (!table) return;

  const idColumn = `${entityType}_id`;
  
  try {
    const { data } = await supabase.from(table).select(`created_at, role, partner:partners(id, name, type, company, expertise)`).eq(idColumn, entityId);

    (data || []).forEach((p: any) => {
      if (p.partner) {
        const partnerType = p.partner.type === 'expert_ia' ? 'Expert IA' : p.partner.type === 'independant' ? 'Indépendant' : p.partner.type === 'apporteur' ? 'Apporteur d\'affaires' : p.partner.type || 'Partenaire';
        events.push({
          date: formatDate(p.created_at),
          dateObj: new Date(p.created_at),
          type: 'Partenaire',
          title: `${p.partner.name}${p.partner.company ? ` (${p.partner.company})` : ''}`,
          content: `Type: ${partnerType}, Rôle: ${p.role || 'non défini'}`
        });
        if (!linkedEntities.find(e => e.type === 'partner' && e.id === p.partner.id)) {
          linkedEntities.push({ type: 'partner', id: p.partner.id, name: p.partner.name, role: p.role, context: partnerType });
        }
      }
    });
  } catch (e) {
    console.log(`[synthesize-v2] No partner table for ${entityType}`);
  }
}

async function collectTasks(supabase: any, entityType: EntityType, entityId: string, events: ChronologicalEvent[]) {
  let tasks: any[] = [];
  if (entityType === 'lead') {
    const { data } = await supabase.from('tasks').select('*').eq('lead_id', entityId);
    tasks = data || [];
  } else if (entityType === 'project') {
    const { data } = await supabase.from('tasks').select('*').eq('project_id', entityId);
    tasks = data || [];
  }
  tasks.forEach(t => {
    events.push({
      date: formatDate(t.due_date || t.created_at),
      dateObj: new Date(t.due_date || t.created_at),
      type: 'Tâche',
      title: t.title,
      content: `Statut: ${t.status}, Priorité: ${t.priority}${t.description ? `. ${t.description}` : ''}`
    });
  });
}

async function collectBookings(supabase: any, entityType: EntityType, entityId: string, events: ChronologicalEvent[]) {
  if (entityType !== 'lead') return;
  const { data } = await supabase.from('bookings').select('*').eq('lead_id', entityId);
  (data || []).forEach((b: any) => {
    events.push({
      date: formatDate(b.start_time),
      dateObj: new Date(b.start_time),
      type: 'RDV',
      title: `RDV avec ${b.name}`,
      content: `Statut: ${b.status}${b.message ? `. ${b.message}` : ''}`
    });
  });
}

async function collectGeneratedDocuments(supabase: any, entityType: EntityType, entityId: string, events: ChronologicalEvent[], linkedEntities: LinkedEntity[]) {
  if (entityType === 'document') return;
  let docs: any[] = [];
  if (entityType === 'lead') {
    const { data } = await supabase.from('generated_documents').select('*').eq('lead_id', entityId);
    docs = data || [];
  } else if (entityType === 'project') {
    const { data } = await supabase.from('generated_documents').select('*').eq('project_id', entityId);
    docs = data || [];
  }
  docs.forEach(d => {
    events.push({
      date: formatDate(d.created_at),
      dateObj: new Date(d.created_at),
      type: 'Document généré',
      title: d.title,
      content: `Type: ${d.document_type}, Version: ${d.version || '1.0'}, Statut: ${d.status}`
    });
    if (!linkedEntities.find(e => e.type === 'document' && e.id === d.id)) {
      linkedEntities.push({ type: 'document', id: d.id, name: d.title, context: d.document_type });
    }
  });
}

async function collectOpportunities(supabase: any, entityType: EntityType, entityId: string, events: ChronologicalEvent[], linkedEntities: LinkedEntity[]) {
  if (entityType !== 'lead') return;
  const { data } = await supabase.from('opportunities').select('*, projects(id, name, status)').eq('lead_id', entityId);
  (data || []).forEach((o: any) => {
    events.push({
      date: formatDate(o.created_at),
      dateObj: new Date(o.created_at),
      type: 'Opportunité',
      title: o.title,
      content: `Stage: ${o.stage}, Valeur: ${o.value_amount ? `${o.value_amount}€` : 'non définie'}, Probabilité: ${o.probability}%`
    });
    if (o.projects?.length > 0) {
      o.projects.forEach((p: any) => {
        if (!linkedEntities.find(e => e.type === 'project' && e.id === p.id)) {
          linkedEntities.push({ type: 'project', id: p.id, name: p.name, context: `via opportunité "${o.title}"` });
        }
      });
    }
  });
}

async function collectProjects(supabase: any, entityType: EntityType, entityId: string, events: ChronologicalEvent[], linkedEntities: LinkedEntity[]) {
  if (entityType === 'lead' || entityType === 'project') return;
  if (entityType === 'partner') {
    const { data: links } = await supabase.from('project_partners').select('project_id, role').eq('partner_id', entityId);
    if (links?.length > 0) {
      const { data: projects } = await supabase.from('projects').select('*').in('id', links.map((l: any) => l.project_id));
      (projects || []).forEach((p: any) => {
        const link = links.find((l: any) => l.project_id === p.id);
        events.push({
          date: formatDate(p.created_at),
          dateObj: new Date(p.created_at),
          type: 'Projet collaboratif',
          title: p.name,
          content: `Statut: ${p.status}, Rôle: ${link?.role || 'non défini'}`
        });
        if (!linkedEntities.find(e => e.type === 'project' && e.id === p.id)) {
          linkedEntities.push({ type: 'project', id: p.id, name: p.name, role: link?.role });
        }
      });
    }
  }
}

async function collectSolutions(supabase: any, entityType: EntityType, entityId: string, events: ChronologicalEvent[], linkedEntities: LinkedEntity[]) {
  if (entityType === 'solution') return;
  if (entityType === 'lead') {
    const { data: links } = await supabase.from('solution_leads').select('solution_id, interest_level, notes, created_at').eq('lead_id', entityId);
    if (links?.length > 0) {
      const { data: solutions } = await supabase.from('articles').select('*').in('id', links.map((l: any) => l.solution_id)).eq('resource_type', 'solution');
      (solutions || []).forEach((s: any) => {
        const link = links.find((l: any) => l.solution_id === s.id);
        events.push({
          date: formatDate(link?.created_at || s.created_at),
          dateObj: new Date(link?.created_at || s.created_at),
          type: 'Solution d\'intérêt',
          title: s.title,
          content: `Niveau d'intérêt: ${link?.interest_level || 'non défini'}`
        });
        if (!linkedEntities.find(e => e.type === 'solution' && e.id === s.id)) {
          linkedEntities.push({ type: 'solution', id: s.id, name: s.title, context: `Intérêt: ${link?.interest_level}` });
        }
      });
    }
  }
  if (entityType === 'partner') {
    const { data: links } = await supabase.from('solution_partners').select('solution_id, role').eq('partner_id', entityId);
    if (links?.length > 0) {
      const { data: solutions } = await supabase.from('articles').select('*').in('id', links.map((l: any) => l.solution_id)).eq('resource_type', 'solution');
      (solutions || []).forEach((s: any) => {
        const link = links.find((l: any) => l.solution_id === s.id);
        events.push({
          date: formatDate(s.created_at),
          dateObj: new Date(s.created_at),
          type: 'Solution maîtrisée',
          title: s.title,
          content: `Rôle: ${link?.role || 'Expert'}`
        });
        if (!linkedEntities.find(e => e.type === 'solution' && e.id === s.id)) {
          linkedEntities.push({ type: 'solution', id: s.id, name: s.title, role: link?.role });
        }
      });
    }
  }
}

async function collectLeads(supabase: any, entityType: EntityType, entityId: string, events: ChronologicalEvent[], linkedEntities: LinkedEntity[]) {
  if (entityType === 'lead') return;
  if (entityType === 'project') {
    const { data: project } = await supabase.from('projects').select('opportunity:opportunities(lead:leads(id, name, company))').eq('id', entityId).single();
    if (project?.opportunity?.lead) {
      const lead = project.opportunity.lead;
      if (!linkedEntities.find(e => e.type === 'lead' && e.id === lead.id)) {
        linkedEntities.push({ type: 'lead', id: lead.id, name: lead.company || lead.name, context: 'Client principal' });
      }
    }
  }
  if (entityType === 'partner') {
    const { data: links } = await supabase.from('lead_partners').select('lead_id, role').eq('partner_id', entityId);
    if (links?.length > 0) {
      const { data: leads } = await supabase.from('leads').select('*').in('id', links.map((l: any) => l.lead_id));
      (leads || []).forEach((l: any) => {
        const link = links.find((lk: any) => lk.lead_id === l.id);
        events.push({
          date: formatDate(l.created_at),
          dateObj: new Date(l.created_at),
          type: 'Lead introduit',
          title: l.company || l.name,
          content: `Rôle: ${link?.role || 'Apporteur'}`
        });
        if (!linkedEntities.find(e => e.type === 'lead' && e.id === l.id)) {
          linkedEntities.push({ type: 'lead', id: l.id, name: l.company || l.name, role: link?.role });
        }
      });
    }
  }
  if (entityType === 'solution') {
    const { data: links } = await supabase.from('solution_leads').select('lead_id, interest_level').eq('solution_id', entityId);
    if (links?.length > 0) {
      const { data: leads } = await supabase.from('leads').select('*').in('id', links.map((l: any) => l.lead_id));
      (leads || []).forEach((l: any) => {
        const link = links.find((lk: any) => lk.lead_id === l.id);
        events.push({
          date: formatDate(l.created_at),
          dateObj: new Date(l.created_at),
          type: 'Lead intéressé',
          title: l.company || l.name,
          content: `Niveau d'intérêt: ${link?.interest_level || 'non défini'}`
        });
        if (!linkedEntities.find(e => e.type === 'lead' && e.id === l.id)) {
          linkedEntities.push({ type: 'lead', id: l.id, name: l.company || l.name, context: `Intérêt: ${link?.interest_level}` });
        }
      });
    }
  }
}

// Collect context notes (user-provided context for AI synthesis)
async function collectContextNotes(supabase: any, entityType: EntityType, entityId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('entity_context_notes')
    .select('content, created_at')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true });

  if (error || !data || data.length === 0) {
    return [];
  }

  return data.map((note: any) => note.content);
}

// ============= GRAPH DATA COLLECTION =============

async function collectGraphData(supabase: any, entityType: EntityType, entityId: string): Promise<GraphData> {
  const events: ChronologicalEvent[] = [];
  const linkedEntities: LinkedEntity[] = [];
  const provenance: GraphData['provenance'] = [];

  const { entityData, name, info } = await fetchEntityBase(supabase, entityType, entityId);
  const entityName = name;
  const entityInfo = info;

  if (entityData?.created_at) {
    events.push({
      date: formatDate(entityData.created_at),
      dateObj: new Date(entityData.created_at),
      type: capitalizeFirst(entityType),
      title: 'Création',
      content: `${capitalizeFirst(entityType)} "${entityName}" créé(e)`
    });
    provenance.push({ type: entityType, id: entityId, name: entityName, date: formatDate(entityData.created_at) });
  }

  // Collect all data in parallel
  const [, , , , , , , , , , contextNotes] = await Promise.all([
    collectUploadedFiles(supabase, entityType, entityId, events, linkedEntities),
    collectTranscriptions(supabase, entityType, entityId, events, linkedEntities),
    collectPartners(supabase, entityType, entityId, events, linkedEntities),
    collectTasks(supabase, entityType, entityId, events),
    collectBookings(supabase, entityType, entityId, events),
    collectGeneratedDocuments(supabase, entityType, entityId, events, linkedEntities),
    collectOpportunities(supabase, entityType, entityId, events, linkedEntities),
    collectProjects(supabase, entityType, entityId, events, linkedEntities),
    collectSolutions(supabase, entityType, entityId, events, linkedEntities),
    collectLeads(supabase, entityType, entityId, events, linkedEntities),
    collectContextNotes(supabase, entityType, entityId),
  ]);

  return { entityName, entityInfo, events, linkedEntities, provenance, contextNotes };
}

// ============= MAIN HANDLER =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { entity_type, entity_id, cascade = false, use_consulte_prompt = false }: SynthesizeRequest & { use_consulte_prompt?: boolean } = await req.json();

    console.log(`[synthesize-v2] Starting for ${entity_type}:${entity_id} (cascade=${cascade}, consulte=${use_consulte_prompt})`);

    // 1. Load dynamic prompt from ai_prompts
    // Use entity-specific prompts for Consulte tab, fallback to generic entity-synthesis
    const promptSlug = use_consulte_prompt ? `consulte-${entity_type}` : 'entity-synthesis';
    
    const { data: promptData } = await supabase
      .from('ai_prompts')
      .select('system_prompt, user_prompt, model_config')
      .eq('slug', promptSlug)
      .single();

    // Fallback to entity-synthesis if specific prompt not found
    let finalPromptData = promptData;
    if (!promptData && use_consulte_prompt) {
      const { data: fallbackPrompt } = await supabase
        .from('ai_prompts')
        .select('system_prompt, user_prompt, model_config')
        .eq('slug', 'entity-synthesis')
        .single();
      finalPromptData = fallbackPrompt;
    }

    const systemPrompt = finalPromptData?.system_prompt || getDefaultSystemPrompt();
    const userPromptTemplate = finalPromptData?.user_prompt || getDefaultUserPrompt();
    const modelConfig = finalPromptData?.model_config || { model: 'google/gemini-2.5-flash' };

    // 2. Collect full graph data for the entity
    const graphData = await collectGraphData(supabase, entity_type, entity_id);

    console.log(`[synthesize-v2] Collected ${graphData.events.length} events, ${graphData.linkedEntities.length} linked entities`);

    if (graphData.events.length <= 1 && graphData.linkedEntities.length === 0) {
      await clearStaleFlag(supabase, entity_type, entity_id);
      return new Response(
        JSON.stringify({ success: false, message: 'Pas assez de données liées pour générer une synthèse' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Sort events chronologically
    graphData.events.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // 4. Build rich context
    const chronologicalContext = graphData.events.map((e, idx) => {
      let entry = `### ${idx + 1}. [${e.date}] ${e.type}: ${e.title}\n${e.content}`;
      if (e.source_entity) {
        entry += `\n_Source: ${e.source_entity.type} "${e.source_entity.name}"_`;
      }
      return entry;
    }).join('\n\n---\n\n');

    const linkedEntitiesContext = graphData.linkedEntities.length > 0
      ? `\n\n## Entités liées:\n${graphData.linkedEntities.map(e => 
          `- **${e.type}**: ${e.name}${e.role ? ` (${e.role})` : ''}${e.context ? ` - ${e.context}` : ''}`
        ).join('\n')}`
      : '';

    // Context notes from user (added as final enrichment source)
    const contextNotesSection = graphData.contextNotes.length > 0
      ? `\n\n## Contexte additionnel (notes utilisateur):\n_Ces notes sont fournies par l'utilisateur pour enrichir la synthèse. Elles représentent des informations non capturées ailleurs (rencontres, impressions, contexte oral...)._\n\n${graphData.contextNotes.map((note, idx) => `**Note ${idx + 1}:** ${note}`).join('\n\n')}`
      : '';

    const synthesisDate = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const userPrompt = userPromptTemplate
      .replace('{{synthesis_date}}', synthesisDate)
      .replace('{{entity_name}}', graphData.entityName)
      .replace('{{entity_type}}', entity_type)
      .replace('{{entity_info}}', JSON.stringify(graphData.entityInfo, null, 2))
      .replace('{{chronological_context}}', chronologicalContext + linkedEntitiesContext + contextNotesSection)
      .replace('{{linked_count}}', String(graphData.linkedEntities.length))
      .replace('{{events_count}}', String(graphData.events.length))
      .replace('{{context_notes_count}}', String(graphData.contextNotes.length));

    console.log(`[synthesize-v2] Calling Lovable AI with ${graphData.contextNotes.length} context notes...`);

    // 5. Generate synthesis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelConfig.model || 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[synthesize-v2] AI error:', aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requêtes atteinte.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Crédits IA insuffisants.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const synthesis = aiData.choices?.[0]?.message?.content;

    if (!synthesis) {
      throw new Error('No synthesis generated');
    }

    console.log(`[synthesize-v2] Generated synthesis (${synthesis.length} chars)`);

    // 6. Store synthesis
    await storeSynthesis(supabase, entity_type, entity_id, synthesis);

    const sourceCounts = countSources(graphData.events);

    // 7. Log activity
    await supabase.from('activity_log').insert({
      workspace_id: '00000000-0000-0000-0000-000000000001',
      entity_type: entity_type === 'document' ? 'specification' : entity_type,
      entity_id: entity_id,
      activity_type: 'synthesis_generated',
      title: `Synthèse IA transversale générée pour ${graphData.entityName}`,
      content: `Synthèse de ${graphData.events.length} événements, ${graphData.linkedEntities.length} entités liées`,
      is_ai_generated: true,
      ai_metadata: {
        version: 'v2',
        events_count: graphData.events.length,
        linked_entities_count: graphData.linkedEntities.length,
        source_counts: sourceCounts,
        synthesis_length: synthesis.length,
        model: modelConfig.model || 'google/gemini-2.5-flash',
        synthesis_date: synthesisDate,
        provenance: graphData.provenance
      }
    });

    // 8. Cascade to linked entities if requested
    let cascadeResults: { entity: string; success: boolean }[] = [];
    if (cascade && graphData.linkedEntities.length > 0) {
      console.log(`[synthesize-v2] Cascading to ${graphData.linkedEntities.length} linked entities...`);
      for (const linked of graphData.linkedEntities) {
        try {
          await markEntityStale(supabase, linked.type, linked.id);
          cascadeResults.push({ entity: `${linked.type}:${linked.id}`, success: true });
        } catch (e) {
          cascadeResults.push({ entity: `${linked.type}:${linked.id}`, success: false });
        }
      }
    }

    console.log(`[synthesize-v2] Complete for ${entity_type}:${entity_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        events_count: graphData.events.length,
        linked_entities_count: graphData.linkedEntities.length,
        source_counts: sourceCounts,
        synthesis_length: synthesis.length,
        cascade_results: cascadeResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[synthesize-v2] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
