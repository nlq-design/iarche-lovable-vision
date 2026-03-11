import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callLLM } from "../_shared/ai-client.ts";
import {
  fetchContextNotes,
  fetchVocabulary,
  fetchParticipantMappings,
  fetchLeadContacts,
  fetchMeetingNotes,
  fetchActivityLog,
  buildRelationalNetwork,
  formatDateFR,
  FRENCH_INSTRUCTION,
  buildLeadContactsBlock,
  buildMeetingNotesBlock,
  buildActivityLogBlock,
} from "../_shared/consulte-helpers.ts";

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
  contextNotes: string[];
  vocabulary: string[];
  participantMappings: Array<{ name: string; entityName: string; entityType: string }>;
  relationalNetwork: Array<{ name: string; entityType: string | null; projects: string[]; meetingCount: number; coParticipants: string[] }>;
  leadContacts: Array<{ name: string; position: string | null; email: string | null; is_primary: boolean }>;
  meetingNotes: Array<{ objectives: string | null; notes: string | null; ai_summary: string | null; next_steps: string | null; created_at: string }>;
  activityLog: Array<{ activity_type: string; title: string | null; content: string | null; created_at: string }>;
  // Phase 1: Cross-enrichissement
  linkedSyntheses: Array<{ type: string; name: string; summary: string }>;
  crossContextNotes: Array<{ type: string; name: string; notes: string[] }>;
}

// ============= HELPERS =============

// Alias for backward compat — delegates to shared helper
const formatDate = formatDateFR;

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
  return `{{owner_context}}
Tu es un expert en synthèse commerciale pour IArche (conseil IA B2B).
${FRENCH_INSTRUCTION}

## MISSION CRITIQUE
Produire une MÉMOIRE CONTEXTUELLE EXHAUSTIVE pour le suivi commercial.
Cette synthèse est le document de référence pour toute interaction future.

## ⛔ RÈGLE ANTI-HALLUCINATION ABSOLUE
**INTERDICTION FORMELLE D'INVENTER** :
- NE JAMAIS inventer de noms de personnes (utilisez uniquement ceux présents dans les sources)
- NE JAMAIS inventer de noms d'entreprises 
- NE JAMAIS inventer de montants, dates ou pourcentages
- NE JAMAIS créer de "responsables" fictifs pour les tâches
- Si une information manque, écrire explicitement : "[Non spécifié dans les sources]"

**EXEMPLE D'ERREUR À NE PAS FAIRE** :
❌ "Action → @Sophie Martin (deadline: 15/01)" ← SI Sophie Martin n'est JAMAIS mentionnée dans les sources
✅ "Action → [Responsable à définir]" ← SI aucun responsable n'est mentionné

## RÈGLES ABSOLUES DE PRÉSERVATION

### 1. ZÉRO PERTE D'INFORMATION
- **CITE TEXTUELLEMENT** tous les montants (€, %, jours) avec leur source
- **CONSERVE TOUTES** les dates mentionnées (format DD/MM/YYYY)
- **NOMME EXPLICITEMENT** chaque personne et entreprise UNIQUEMENT SI PRÉSENTES DANS LES SOURCES
- **CAPTURE CHAQUE** décision, même implicite

### 2. HIÉRARCHIE DES SOURCES (poids décroissant)
1. **Notes contexte utilisateur** : poids MAXIMUM (infos humaines exclusives)
2. **Transcriptions <30 jours** : haute valeur (échanges récents)
3. **Documents générés** : engagements formels (devis, CDC)
4. **Transcriptions anciennes** : contexte historique
5. **Fichiers uploadés** : documentation annexe
6. **Tâches/RDV** : métadonnées

### 3. TRAÇABILITÉ OBLIGATOIRE
Chaque information clé DOIT porter sa source :
- Exemple : "Budget : 15 000€ HT (source: Transcription RDV 15/01/2026)"
- Exemple : "Décision POC validée (source: Note contexte #1)"

### 4. GRAPHE RELATIONNEL
Pour chaque entité liée, précise :
- Type (Lead, Partner, Project, Solution)
- Nature de la relation
- Confiance : ✅ Confirmé | 🔶 Détecté | ❓ À vérifier

### 5. DISTINCTION PARTENAIRES
- Expert IA = collaboration technique
- Indépendant = sous-traitance
- Apporteur = commission/recommandation

## FORMAT DE SORTIE STRUCTURÉ

1. **Résumé exécutif** (3-5 phrases, points CRITIQUES uniquement)
2. **Graphe relationnel** (tableau des entités liées)
3. **Timeline clé** (chronologique, par mois, avec sources)
4. **Données financières** (tableau si montants présents)
5. **Points d'attention** (urgences, risques, opportunités)
6. **Prochaines actions** (TODO avec responsables ISSUS DES SOURCES ou "[À définir]")
7. **Sources utilisées** (récapitulatif des inputs)

## STYLE
- Professionnel et dense
- Bullet points structurés
- Dates : DD/MM/YYYY
- Montants : formatés (15 000 €)
`;
}

function getDefaultUserPrompt(): string {
  return `# Synthèse 360° : {{entity_type}} – {{entity_name}}
*Générée le {{synthesis_date}} | {{events_count}} sources | {{linked_count}} entités liées*

---

## Données de base
{{entity_info}}

## Historique chronologique
{{chronological_context}}

---

## INSTRUCTIONS DE SYNTHÈSE

### Checklist anti-perte (vérifie AVANT de répondre) :
- [ ] Ai-je cité TOUS les montants présents dans les sources ?
- [ ] Ai-je capturé TOUTES les dates mentionnées ?
- [ ] Ai-je nommé TOUTES les personnes/entreprises ?
- [ ] Ai-je listé TOUTES les décisions prises ?
- [ ] Chaque info clé porte-t-elle sa source ?

### Structure de réponse OBLIGATOIRE :

**1. Résumé exécutif** (3-5 phrases max)
Points critiques uniquement, pas de généralités.

**2. Graphe relationnel**
| Entité | Type | Relation | Confiance | Source |
|--------|------|----------|-----------|--------|

**3. Timeline clé** (regroupée par mois)
Pour chaque événement important :
- Date + Type + Titre
- Détails clés (montants, décisions)
- Source entre parenthèses

**4. Données financières** (si applicable)
| Montant | Contexte | Source | Date |
|---------|----------|--------|------|

**5. Points d'attention**
- 🔴 Urgent : ...
- 🟠 Risque : ...
- 🟢 Opportunité : ...

**6. Prochaines actions**
- [ ] Action → @Responsable (deadline: DD/MM)

**7. Sources utilisées**
Liste des inputs analysés avec leur poids.`;
}

// ============= STORAGE & STALE HELPERS =============

const ENTITY_TABLE_MAP: Record<EntityType, string> = {
  lead: 'leads',
  project: 'projects',
  solution: 'articles',
  partner: 'partners',
  transcription: 'voice_transcriptions',
  document: 'generated_documents'
};

async function storeSynthesis(supabase: any, entityType: EntityType, entityId: string, synthesis: string) {
  const { error } = await supabase
    .from(ENTITY_TABLE_MAP[entityType])
    .update({ ai_documents_summary: synthesis, synthesis_stale: false })
    .eq('id', entityId);
  if (error) {
    console.error('[synthesize-v2] Storage error:', error);
    throw error;
  }
}

async function setStaleFlag(supabase: any, entityType: EntityType, entityId: string, stale: boolean) {
  await supabase
    .from(ENTITY_TABLE_MAP[entityType])
    .update({ synthesis_stale: stale })
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
  const collectedIds = new Set<string>();

  // --- A. Direct FK-based collection ---
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

  // Track collected IDs to avoid duplicates from bidirectional search
  for (const t of transcriptions) collectedIds.add(t.id);

  // --- B. Bidirectional: transcriptions where a participant is linked to this entity ---
  if (['lead', 'project', 'partner', 'solution'].includes(entityType)) {
    try {
      const { data: participantLinks } = await supabase
        .from('transcription_participants')
        .select('transcription_id')
        .eq('linked_entity_type', entityType)
        .eq('linked_entity_id', entityId)
        .eq('presence_status', 'present');
      
      if (participantLinks?.length) {
        const newIds = participantLinks
          .map((p: any) => p.transcription_id)
          .filter((id: string) => !collectedIds.has(id));
        
        if (newIds.length > 0) {
          const uniqueIds = [...new Set(newIds)];
          const { data: biTranscriptions } = await supabase
            .from('voice_transcriptions')
            .select('*')
            .in('id', uniqueIds)
            .eq('status', 'done');
          
          for (const t of biTranscriptions || []) {
            if (!collectedIds.has(t.id)) {
              collectedIds.add(t.id);
              transcriptions.push(t);
            }
          }
        }
      }
    } catch (e) { console.warn('[collectTranscriptions] Bidirectional search failed:', e); }
  }

  // Enrich transcriptions with participant data
  for (const t of transcriptions) {
    const eventDate = t.transcription_date || t.created_at;
    const summaryText = t.summary ? (typeof t.summary === 'string' ? t.summary : JSON.stringify(t.summary)) : '';
    let content = summaryText || t.content?.substring(0, 2000) || '';
    
    // Fetch participants for this transcription
    try {
      const { data: participants } = await supabase
        .from('transcription_participants')
        .select('name, presence_status, linked_entity_type, linked_entity_id, role_in_meeting')
        .eq('transcription_id', t.id)
        .eq('presence_status', 'present');
      
      if (participants?.length) {
        const participantsList = participants.map((p: any) => {
          let label = p.name;
          if (p.linked_entity_type) label += ` (${p.linked_entity_type})`;
          if (p.role_in_meeting) label += ` [${p.role_in_meeting}]`;
          return label;
        }).join(', ');
        content = `**Participants**: ${participantsList}\n${content}`;
      }
    } catch { /* non-blocking */ }
    
    events.push({
      date: formatDate(eventDate),
      dateObj: new Date(eventDate),
      type: 'Transcription',
      title: t.title || 'Transcription audio',
      content
    });
  }
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
  } else if (entityType === 'partner') {
    // Partner: fetch tasks from all projects they're linked to
    try {
      const { data: links } = await supabase.from('project_partners').select('project_id').eq('partner_id', entityId);
      if (links?.length) {
        const { data } = await supabase.from('tasks').select('*').in('project_id', links.map((l: any) => l.project_id)).limit(30);
        tasks = data || [];
      }
    } catch { /* non-blocking */ }
  }
  tasks.forEach(t => {
    const sourceLabel = entityType === 'partner' ? ' (via Projet)' : '';
    events.push({
      date: formatDate(t.due_date || t.created_at),
      dateObj: new Date(t.due_date || t.created_at),
      type: `Tâche${sourceLabel}`,
      title: t.title,
      content: `Statut: ${t.status}, Priorité: ${t.priority}${t.description ? `. ${t.description}` : ''}`
    });
  });
}

async function collectBookings(supabase: any, entityType: EntityType, entityId: string, events: ChronologicalEvent[], enrichLeadId?: string | null) {
  const leadId = entityType === 'lead' ? entityId : enrichLeadId;
  if (!leadId) return;
  const { data } = await supabase.from('bookings').select('*').eq('lead_id', leadId);
  (data || []).forEach((b: any) => {
    const sourceLabel = entityType !== 'lead' ? ' (via Lead)' : '';
    events.push({
      date: formatDate(b.start_time),
      dateObj: new Date(b.start_time),
      type: `RDV${sourceLabel}`,
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
  } else if (entityType === 'partner') {
    // Partner: fetch documents via document_partners junction
    try {
      const { data: links } = await supabase.from('document_partners').select('document_id').eq('partner_id', entityId);
      if (links?.length) {
        const { data } = await supabase.from('generated_documents').select('*').in('id', links.map((l: any) => l.document_id));
        docs = data || [];
      }
    } catch { /* non-blocking */ }
  }
  docs.forEach(d => {
    const sourceLabel = entityType === 'partner' ? ' (via Partenaire)' : '';
    events.push({
      date: formatDate(d.created_at),
      dateObj: new Date(d.created_at),
      type: `Document généré${sourceLabel}`,
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

// Collect email communication history
async function collectEmailHistory(supabase: any, entityType: EntityType, entityId: string, events: ChronologicalEvent[], enrichLeadId?: string | null) {
  try {
    // Get lead email for matching
    const leadId = entityType === 'lead' ? entityId : enrichLeadId;
    if (!leadId) return;
    
    const { data: lead } = await supabase.from('leads').select('email').eq('id', leadId).maybeSingle();
    if (!lead?.email) return;

    const { data: emails } = await supabase
      .from('email_logs')
      .select('email_type, subject, status, sent_at, source_type, created_at')
      .eq('recipient_email', lead.email)
      .order('created_at', { ascending: false })
      .limit(15);

    for (const e of emails || []) {
      const sourceLabel = entityType !== 'lead' ? ' (via Lead)' : '';
      events.push({
        date: formatDate(e.sent_at || e.created_at),
        dateObj: new Date(e.sent_at || e.created_at),
        type: `Email${sourceLabel}`,
        title: e.subject,
        content: `Type: ${e.email_type}, Statut: ${e.status}, Source: ${e.source_type}`
      });
    }
  } catch { /* non-blocking */ }
}

// Wrapper: fetch transcription IDs for an entity, then delegate to shared buildRelationalNetwork
async function collectRelationalNetwork(supabase: any, entityType: EntityType, entityId: string): Promise<GraphData['relationalNetwork']> {
  try {
    let transcriptionIds: string[] = [];
    if (entityType === 'lead') {
      const { data } = await supabase.from('voice_transcriptions').select('id').eq('lead_id', entityId).eq('status', 'done');
      transcriptionIds = (data || []).map((t: any) => t.id);
    } else if (entityType === 'project') {
      const { data } = await supabase.from('voice_transcriptions').select('id').eq('project_id', entityId).eq('status', 'done');
      transcriptionIds = (data || []).map((t: any) => t.id);
    } else if (entityType === 'partner') {
      const { data: links } = await supabase.from('transcription_partners').select('transcription_id').eq('partner_id', entityId);
      transcriptionIds = (links || []).map((l: any) => l.transcription_id);
    } else if (entityType === 'transcription') {
      transcriptionIds = [entityId];
    }
    if (!transcriptionIds.length) return [];

    // Build projectNames map for shared helper
    const { data: transcriptions } = await supabase
      .from('voice_transcriptions')
      .select('id, project_id, project:projects(id, name)')
      .in('id', transcriptionIds);
    const projectNames = new Map<string, string>();
    for (const t of transcriptions || []) {
      if ((t as any).project?.id && (t as any).project?.name) {
        projectNames.set((t as any).project.id, (t as any).project.name);
      }
    }

    return await buildRelationalNetwork(supabase, transcriptionIds, projectNames);
  } catch (e) {
    console.warn('[synthesize-v2] Relational network failed:', e);
    return [];
  }
}

// Phase 2: Collect auto-detected entity links from entity_name_references
async function collectEntityNameReferences(supabase: any, entityType: EntityType, entityId: string, linkedEntities: LinkedEntity[]) {
  try {
    // Get references where this entity is source OR target
    const [{ data: asSource }, { data: asTarget }] = await Promise.all([
      supabase.from('entity_name_references')
        .select('target_entity_id, target_entity_type, confidence_score, context')
        .eq('source_entity_id', entityId)
        .eq('source_entity_type', entityType)
        .gte('confidence_score', 0.6)
        .limit(20),
      supabase.from('entity_name_references')
        .select('source_entity_id, source_entity_type, confidence_score, context')
        .eq('target_entity_id', entityId)
        .eq('target_entity_type', entityType)
        .gte('confidence_score', 0.6)
        .limit(20),
    ]);

    const refs = [
      ...(asSource || []).map((r: any) => ({ id: r.target_entity_id, type: r.target_entity_type, score: r.confidence_score, context: r.context })),
      ...(asTarget || []).map((r: any) => ({ id: r.source_entity_id, type: r.source_entity_type, score: r.confidence_score, context: r.context })),
    ];

    for (const ref of refs) {
      if (!linkedEntities.find(e => e.id === ref.id)) {
        const confidence = ref.score >= 0.9 ? '✅' : ref.score >= 0.7 ? '🔶' : '❓';
        linkedEntities.push({
          type: ref.type as EntityType,
          id: ref.id,
          name: ref.context || `[${ref.type}]`,
          context: `Détecté auto (${confidence} ${Math.round(ref.score * 100)}%)`
        });
      }
    }
  } catch (e) { console.warn('[collectEntityNameReferences] failed:', e); }
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

  // For transcription type: inject the transcript's own content + linked entity context
  if (entityType === 'transcription' && entityData) {
    // Add the transcription's own summary/content as a primary event
    const tDate = entityData.transcription_date || entityData.created_at;
    const rawSummary = entityData.summary ? (typeof entityData.summary === 'string' ? entityData.summary : JSON.stringify(entityData.summary)) : '';
    const tContent = rawSummary || entityData.content?.substring(0, 4000) || '';
    if (tContent) {
      events.push({
        date: formatDate(tDate),
        dateObj: new Date(tDate),
        type: 'Contenu transcription',
        title: entityName,
        content: tContent
      });
    }
    // Link lead & project as linked entities
    if (entityData.lead) {
      linkedEntities.push({ type: 'lead', id: entityData.lead.id, name: entityData.lead.company || entityData.lead.name, context: 'Lead lié à cette transcription' });
    }
    if (entityData.project) {
      linkedEntities.push({ type: 'project', id: entityData.project.id, name: entityData.project.name, context: 'Projet lié à cette transcription' });
    }
    // Fetch sibling transcriptions from the same lead/project for cross-context
    const siblingIds: string[] = [];
    if (entityData.lead_id) {
      const { data: siblings } = await supabase.from('voice_transcriptions').select('id, title, summary, transcription_date, created_at').eq('lead_id', entityData.lead_id).eq('status', 'done').neq('id', entityId).order('transcription_date', { ascending: false }).limit(10);
      for (const s of siblings || []) {
        if (!siblingIds.includes(s.id)) {
          siblingIds.push(s.id);
          const sDate = s.transcription_date || s.created_at;
          events.push({
            date: formatDate(sDate), dateObj: new Date(sDate), type: 'Transcription liée (Lead)',
            title: s.title || 'Transcription', content: (typeof s.summary === 'string' ? s.summary : JSON.stringify(s.summary || ''))?.substring(0, 1500) || '[pas de résumé]'
          });
        }
      }
    }
    if (entityData.project_id) {
      const { data: siblings } = await supabase.from('voice_transcriptions').select('id, title, summary, transcription_date, created_at').eq('project_id', entityData.project_id).eq('status', 'done').neq('id', entityId).order('transcription_date', { ascending: false }).limit(10);
      for (const s of siblings || []) {
        if (!siblingIds.includes(s.id)) {
          siblingIds.push(s.id);
          const sDate = s.transcription_date || s.created_at;
          events.push({
            date: formatDate(sDate), dateObj: new Date(sDate), type: 'Transcription liée (Projet)',
            title: s.title || 'Transcription', content: (typeof s.summary === 'string' ? s.summary : JSON.stringify(s.summary || ''))?.substring(0, 1500) || '[pas de résumé]'
          });
        }
      }
    }
  }

  // Determine enrichment entity for cross-references
  // Extended to project (via opportunity→lead) and document (via lead_id/project_id)
  let enrichLeadId: string | null = null;
  if (entityType === 'lead') {
    enrichLeadId = entityId;
  } else if (entityType === 'transcription') {
    enrichLeadId = entityData?.lead_id || null;
  } else if (entityType === 'project') {
    // Project → opportunity → lead
    enrichLeadId = entityData?.opportunity?.lead?.id || null;
  } else if (entityType === 'document') {
    enrichLeadId = entityData?.lead?.id || entityData?.lead_id || null;
  }
  const enrichProjectId = entityType === 'transcription' ? entityData?.project_id : (entityType === 'project' ? entityId : null);

  // Collect all data in parallel — uses shared helpers for context/vocab/mappings
  const [, , , , , , , , , , , , contextNotes, vocabulary, participantMappingsRaw, relationalNetwork, leadContacts, meetingNotes, projectMeetingNotes, activityLog, linkedActivityLog] = await Promise.all([
    collectUploadedFiles(supabase, entityType, entityId, events, linkedEntities),
    collectTranscriptions(supabase, entityType, entityId, events, linkedEntities),
    collectPartners(supabase, entityType, entityId, events, linkedEntities),
    collectTasks(supabase, entityType, entityId, events),
    collectBookings(supabase, entityType, entityId, events, enrichLeadId),
    collectGeneratedDocuments(supabase, entityType, entityId, events, linkedEntities),
    collectOpportunities(supabase, entityType, entityId, events, linkedEntities),
    collectProjects(supabase, entityType, entityId, events, linkedEntities),
    collectSolutions(supabase, entityType, entityId, events, linkedEntities),
    collectLeads(supabase, entityType, entityId, events, linkedEntities),
    collectEntityNameReferences(supabase, entityType, entityId, linkedEntities),
    collectEmailHistory(supabase, entityType, entityId, events, enrichLeadId),
    // Shared helpers — no more local duplicates
    fetchContextNotes(supabase, entityType, entityId),
    fetchVocabulary(supabase, entityType, entityId),
    fetchParticipantMappings(supabase),
    collectRelationalNetwork(supabase, entityType, entityId),
    enrichLeadId ? fetchLeadContacts(supabase, enrichLeadId) : Promise.resolve([]),
    // Phase 3: Meeting notes — fetch for lead AND project separately
    enrichLeadId ? fetchMeetingNotes(supabase, 'lead', enrichLeadId) : Promise.resolve([]),
    enrichProjectId ? fetchMeetingNotes(supabase, 'project', enrichProjectId) : Promise.resolve([]),
    fetchActivityLog(supabase, entityType, entityId),
    // Phase 3: Activity log for linked lead (if different from current entity)
    (enrichLeadId && entityType !== 'lead') ? fetchActivityLog(supabase, 'lead', enrichLeadId) : Promise.resolve([]),
  ]);

  // Merge meeting notes from lead + project (deduplicate by created_at)
  const allMeetingNotes = [...meetingNotes];
  for (const pn of projectMeetingNotes) {
    if (!allMeetingNotes.find(m => m.created_at === pn.created_at)) {
      allMeetingNotes.push(pn);
    }
  }

  // Merge activity logs (deduplicate by created_at + activity_type)
  const allActivityLog = [...activityLog];
  for (const la of linkedActivityLog) {
    if (!allActivityLog.find(a => a.created_at === la.created_at && a.activity_type === la.activity_type)) {
      allActivityLog.push(la);
    }
  }

  // ====== Phase 1: Cross-enrichissement des entités liées ======
  const linkedSyntheses: GraphData['linkedSyntheses'] = [];
  const crossContextNotes: GraphData['crossContextNotes'] = [];
  const crossVocabulary: string[] = [];

  if (linkedEntities.length > 0) {
    // Batch fetch by entity type to minimize queries
    const byType = new Map<string, LinkedEntity[]>();
    for (const le of linkedEntities) {
      const list = byType.get(le.type) || [];
      list.push(le);
      byType.set(le.type, list);
    }

    const crossPromises: Promise<void>[] = [];

    for (const [type, entities] of byType.entries()) {
      const table = ENTITY_TABLE_MAP[type as EntityType];
      if (!table) continue;
      const ids = entities.map(e => e.id);

      // 1. Fetch existing AI syntheses from linked entities
      crossPromises.push((async () => {
        try {
          const { data } = await supabase
            .from(table)
            .select('id, ai_documents_summary')
            .in('id', ids)
            .not('ai_documents_summary', 'is', null);
          for (const row of data || []) {
            const entity = entities.find(e => e.id === row.id);
            if (row.ai_documents_summary && entity) {
              // Truncate to avoid token explosion — keep first 1500 chars
              const summary = typeof row.ai_documents_summary === 'string'
                ? row.ai_documents_summary.substring(0, 1500)
                : JSON.stringify(row.ai_documents_summary).substring(0, 1500);
              linkedSyntheses.push({ type, name: entity.name, summary });
            }
          }
        } catch (e) { console.warn(`[cross-enrich] syntheses for ${type} failed:`, e); }
      })());

      // 2. Fetch context notes from linked entities
      crossPromises.push((async () => {
        try {
          const { data } = await supabase
            .from('entity_context_notes')
            .select('entity_id, content')
            .eq('entity_type', type)
            .in('entity_id', ids)
            .order('updated_at', { ascending: false })
            .limit(20);
          // Group by entity
          const grouped = new Map<string, string[]>();
          for (const row of data || []) {
            const list = grouped.get(row.entity_id) || [];
            list.push(row.content);
            grouped.set(row.entity_id, list);
          }
          for (const [eid, notes] of grouped.entries()) {
            const entity = entities.find(e => e.id === eid);
            if (entity) {
              crossContextNotes.push({ type, name: entity.name, notes });
            }
          }
        } catch (e) { console.warn(`[cross-enrich] context notes for ${type} failed:`, e); }
      })());

      // 3. Fetch vocabulary from linked entities
      crossPromises.push((async () => {
        try {
          const { data } = await supabase
            .from('entity_vocabulary')
            .select('term, category')
            .eq('entity_type', type)
            .in('entity_id', ids);
          for (const v of data || []) {
            const term = `${v.term} (${v.category || 'général'})`;
            if (!vocabulary.includes(term) && !crossVocabulary.includes(term)) {
              crossVocabulary.push(term);
            }
          }
        } catch (e) { console.warn(`[cross-enrich] vocabulary for ${type} failed:`, e); }
      })());
    }

    await Promise.all(crossPromises);
  }

  // Merge cross-vocabulary into main vocabulary
  const mergedVocabulary = [...vocabulary, ...crossVocabulary];

  // Map shared participantMappings (speakerLabel → name for GraphData compat)
  const participantMappings = participantMappingsRaw.map(m => ({
    name: m.speakerLabel,
    entityName: m.entityName,
    entityType: m.entityType,
  }));

  console.log(`[synthesize-v2] Enrichment: ${contextNotes.length} notes, ${mergedVocabulary.length} vocab (${crossVocabulary.length} croisé), ${participantMappings.length} mappings, ${relationalNetwork.length} network nodes, ${leadContacts.length} contacts, ${allMeetingNotes.length} meeting notes, ${allActivityLog.length} activities (${linkedActivityLog.length} liées), ${linkedSyntheses.length} synthèses liées, ${crossContextNotes.length} notes croisées`);

  return { entityName, entityInfo, events, linkedEntities, provenance, contextNotes, vocabulary: mergedVocabulary, participantMappings, relationalNetwork, leadContacts, meetingNotes: allMeetingNotes, activityLog: allActivityLog, linkedSyntheses, crossContextNotes };
}

// ============= MAIN HANDLER =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // API key validation is now handled by centralized ai-client

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

    let systemPrompt = finalPromptData?.system_prompt || getDefaultSystemPrompt();
    const userPromptTemplate = finalPromptData?.user_prompt || getDefaultUserPrompt();
    const modelConfig = (finalPromptData?.model_config as Record<string, any>) || { model: 'google/gemini-2.5-flash', max_tokens: 16384, temperature: 0.5 };

    // 2. Collect full graph data for the entity
    const graphData = await collectGraphData(supabase, entity_type, entity_id);

    console.log(`[synthesize-v2] Collected ${graphData.events.length} events, ${graphData.linkedEntities.length} linked entities`);

    // ====== Owner Context Injection ======
    let ownerContextBlock = '';
    try {
      const workspaceId = '00000000-0000-0000-0000-000000000001';
      const { data: ownerProfile } = await supabase
        .from('owner_profile')
        .select('id, user_id, display_name, role_label, avatar_url, primary_company_id')
        .eq('workspace_id', workspaceId)
        .limit(1)
        .maybeSingle();

      if (ownerProfile) {
        // Fetch company name
        let companyName = '';
        if (ownerProfile.primary_company_id) {
          const { data: be } = await supabase
            .from('billing_entities')
            .select('name')
            .eq('id', ownerProfile.primary_company_id)
            .maybeSingle();
          companyName = be?.name || '';
        }

        // Count owner participations on this entity
        let participationCount = 0;
        try {
          let query = supabase
            .from('transcription_participants')
            .select('id', { count: 'exact', head: true })
            .eq('linked_entity_type', 'owner')
            .eq('linked_entity_id', ownerProfile.id);

          // Filter transcriptions linked to this entity
          if (['lead', 'project'].includes(entity_type)) {
            const fkCol = entity_type === 'lead' ? 'lead_id' : 'project_id';
            const { data: tIds } = await supabase
              .from('voice_transcriptions')
              .select('id')
              .eq(fkCol, entity_id);
            if (tIds?.length) {
              query = query.in('transcription_id', tIds.map((t: any) => t.id));
            } else {
              query = query.eq('transcription_id', '00000000-0000-0000-0000-000000000000'); // no match
            }
          }

          const { count } = await query;
          participationCount = count || 0;
        } catch { /* non-blocking */ }

        // Check if owner is assigned to the entity
        let isAssigned = false;
        try {
          if (entity_type === 'lead') {
            const { data } = await supabase.from('leads').select('assigned_to').eq('id', entity_id).maybeSingle();
            isAssigned = data?.assigned_to === ownerProfile.user_id;
          } else if (entity_type === 'project') {
            const { data } = await supabase.from('projects').select('assigned_to').eq('id', entity_id).maybeSingle();
            isAssigned = data?.assigned_to === ownerProfile.user_id;
          }
        } catch { /* non-blocking */ }

        // Build the context block
        ownerContextBlock = `Cette analyse est demandée par ${ownerProfile.display_name}${ownerProfile.role_label ? `, ${ownerProfile.role_label}` : ''}${companyName ? ` — ${companyName}` : ''}. ${participationCount > 0 ? `Il a participé directement à ${participationCount} réunion(s) avec cette entité.` : "Il n'a pas participé directement aux réunions documentées."} ${isAssigned ? 'Il est le responsable assigné à ce dossier.' : ''} Tiens compte de son implication dans ta synthèse.`.trim();

        console.log(`[synthesize-v2] Owner context: ${ownerProfile.display_name}, ${participationCount} participations, assigned=${isAssigned}`);
      }
    } catch (e) {
      console.warn('[synthesize-v2] Owner context fetch failed (non-blocking):', e);
    }

    // Inject owner_context into system prompt
    systemPrompt = systemPrompt.replace('{{owner_context}}', ownerContextBlock);

    if (graphData.events.length <= 1 && graphData.linkedEntities.length === 0) {
      await setStaleFlag(supabase, entity_type, entity_id, false);
      const hints: Record<string, string> = {
        lead: 'Liez des transcriptions, créez des opportunités ou ajoutez des notes de contexte à ce lead.',
        project: 'Liez des transcriptions, des partenaires ou ajoutez des tâches à ce projet.',
        partner: 'Liez ce partenaire à des transcriptions, projets ou leads via les onglets dédiés.',
        solution: 'Liez des leads intéressés ou des partenaires experts à cette solution.',
        transcription: 'Rattachez cette transcription à un lead ou un projet pour enrichir le contexte.',
        document: 'Rattachez ce document à un lead ou un projet pour enrichir le contexte.',
      };
      const hint = hints[entity_type] || 'Ajoutez des liaisons ou des notes de contexte.';
      return new Response(
        JSON.stringify({ success: false, message: `Pas assez de données pour générer une synthèse. ${hint}` }),
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

    // Phase A-C enrichment blocks
    const contextNotesSection = graphData.contextNotes.length > 0
      ? graphData.contextNotes.map((note, idx) => `**Note ${idx + 1}:** ${note}`).join('\n\n')
      : 'Aucune note de contexte disponible.';

    const vocabularySection = graphData.vocabulary.length > 0
      ? graphData.vocabulary.join(', ')
      : 'Aucun vocabulaire spécifique.';

    const mappingsSection = graphData.participantMappings.length > 0
      ? graphData.participantMappings.map(m => `- "${m.name}" → ${m.entityName} (${m.entityType})`).join('\n')
      : 'Aucune correspondance connue.';

    const networkSection = graphData.relationalNetwork.length > 0
      ? graphData.relationalNetwork.map(n => {
          let line = `- **${n.name}**`;
          if (n.entityType) line += ` [${n.entityType}]`;
          line += ` — ${n.meetingCount} réunion(s)`;
          if (n.projects.length) line += `, projets: ${n.projects.join(', ')}`;
          if (n.coParticipants.length > 0) line += `\n  ↔ Co-participants: ${n.coParticipants.slice(0, 5).join(', ')}`;
          return line;
        }).join('\n')
      : 'Pas assez de données pour construire le réseau.';

    // New enrichment blocks
    const leadContactsSection = buildLeadContactsBlock(graphData.leadContacts);
    const meetingNotesSection = buildMeetingNotesBlock(graphData.meetingNotes);
    const activityLogSection = buildActivityLogBlock(graphData.activityLog);

    // Phase 1: Cross-enrichissement blocks
    const linkedSynthesesSection = graphData.linkedSyntheses.length > 0
      ? graphData.linkedSyntheses.map(ls => 
          `### ${capitalizeFirst(ls.type)} : ${ls.name}\n${ls.summary}`
        ).join('\n\n---\n\n')
      : 'Aucune synthèse liée disponible.';

    const crossContextNotesSection = graphData.crossContextNotes.length > 0
      ? graphData.crossContextNotes.map(cn =>
          `### ${capitalizeFirst(cn.type)} : ${cn.name}\n${cn.notes.map((n, i) => `> Note ${i + 1}: ${n}`).join('\n')}`
        ).join('\n\n')
      : 'Aucune note croisée disponible.';

    const synthesisDate = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const userPrompt = userPromptTemplate
      .replace('{{synthesis_date}}', synthesisDate)
      .replace('{{entity_name}}', graphData.entityName)
      .replace('{{entity_type}}', entity_type)
      .replace('{{entity_info}}', JSON.stringify(graphData.entityInfo, null, 2))
      .replace('{{context_notes}}', contextNotesSection)
      .replace('{{vocabulary}}', vocabularySection)
      .replace('{{participant_mappings}}', mappingsSection)
      .replace('{{relational_network}}', networkSection)
      .replace('{{lead_contacts}}', leadContactsSection || 'Aucun contact associé.')
      .replace('{{meeting_notes}}', meetingNotesSection || 'Aucun CR de réunion.')
      .replace('{{activity_log}}', activityLogSection || 'Aucune activité récente.')
      .replace('{{linked_syntheses}}', linkedSynthesesSection)
      .replace('{{cross_context_notes}}', crossContextNotesSection)
      .replace('{{chronological_context}}', chronologicalContext + linkedEntitiesContext)
      .replace('{{linked_count}}', String(graphData.linkedEntities.length))
      .replace('{{events_count}}', String(graphData.events.length))
      .replace('{{context_notes_count}}', String(graphData.contextNotes.length));

    console.log(`[synthesize-v2] Calling AI with enrichment: ${graphData.contextNotes.length} notes, ${graphData.vocabulary.length} vocab, ${graphData.participantMappings.length} mappings, ${graphData.relationalNetwork.length} network, ${graphData.linkedSyntheses.length} synthèses liées, ${graphData.crossContextNotes.length} notes croisées`);

    // 5. Generate synthesis - Use centralized AI client with automatic DB config lookup
    const synthesis = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { 
        functionName: 'synthesize-entity-documents',
        maxTokens: (modelConfig as any).max_tokens || 16384,
        temperature: (modelConfig as any).temperature ?? 0.5,
      }
    );

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
        version: 'v3-relational',
        events_count: graphData.events.length,
        linked_entities_count: graphData.linkedEntities.length,
        source_counts: sourceCounts,
        synthesis_length: synthesis.length,
        context_notes_count: graphData.contextNotes.length,
        vocabulary_count: graphData.vocabulary.length,
        participant_mappings_count: graphData.participantMappings.length,
        relational_network_nodes: graphData.relationalNetwork.length,
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
          await setStaleFlag(supabase, linked.type, linked.id, true);
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
