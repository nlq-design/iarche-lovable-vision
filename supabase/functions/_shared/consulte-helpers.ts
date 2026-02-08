/**
 * Shared helpers for Consulte modules (synthesize-entity-documents & partner-consulte)
 * Extracted to avoid duplication across edge functions.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============= TYPES =============

export interface ContextNote {
  content: string;
  updated_at?: string;
}

export interface VocabularyTerm {
  term: string;
  category: string | null;
}

export interface ParticipantMapping {
  speakerLabel: string;
  entityName: string;
  entityType: string;
}

export interface RelationalNode {
  name: string;
  entityType: string | null;
  projects: string[];
  meetingCount: number;
  lastSeen: string;
  coParticipants: string[];
}

export interface TranscriptionParticipant {
  name: string;
  linked_entity_type?: string;
  role_in_meeting?: string;
}

// ============= DATE FORMAT =============

export function formatDateFR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// ============= CONTEXT NOTES =============

export async function fetchContextNotes(
  supabase: any, 
  entityType: string, 
  entityId: string
): Promise<string[]> {
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

// ============= VOCABULARY =============

export async function fetchVocabulary(
  supabase: any, 
  entityType: string, 
  entityId: string
): Promise<string[]> {
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

// ============= PARTICIPANT MAPPINGS =============

export async function fetchParticipantMappings(
  supabase: any,
  workspaceId: string = '00000000-0000-0000-0000-000000000001'
): Promise<ParticipantMapping[]> {
  try {
    const { data } = await supabase
      .from('participant_entity_mappings')
      .select('participant_name, linked_entity_name, linked_entity_type')
      .eq('workspace_id', workspaceId)
      .order('last_used_at', { ascending: false })
      .limit(50);
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

// ============= TRANSCRIPTION PARTICIPANTS =============

export async function fetchTranscriptionParticipants(
  supabase: any, 
  transcriptionId: string
): Promise<string[]> {
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

// ============= RELATIONAL NETWORK =============

export async function buildRelationalNetwork(
  supabase: any,
  transcriptionIds: string[],
  projectNames: Map<string, string>
): Promise<RelationalNode[]> {
  if (!transcriptionIds.length) return [];
  try {
    const { data: allParticipants } = await supabase
      .from('transcription_participants')
      .select('name, transcription_id, linked_entity_type, presence_status, updated_at')
      .in('transcription_id', transcriptionIds)
      .eq('presence_status', 'present');

    if (!allParticipants?.length) return [];

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

    const byTranscription = new Map<string, string[]>();
    for (const p of allParticipants) {
      const list = byTranscription.get(p.transcription_id) || [];
      list.push(p.name);
      byTranscription.set(p.transcription_id, list);
    }

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

      const projName = transcriptionProjectMap.get(p.transcription_id);
      if (projName && !existing.projects.includes(projName)) {
        existing.projects.push(projName);
      }

      const date = transcriptionDateMap.get(p.transcription_id) || p.updated_at || '';
      if (date > existing.lastSeen) existing.lastSeen = date;

      const coParticipants = byTranscription.get(p.transcription_id) || [];
      for (const co of coParticipants) {
        if (co !== p.name && !existing.coParticipants.includes(co)) {
          existing.coParticipants.push(co);
        }
      }

      nodeMap.set(p.name, existing);
    }

    return [...nodeMap.values()]
      .sort((a, b) => b.meetingCount - a.meetingCount)
      .slice(0, 20);
  } catch (e) {
    console.warn('[consulte-helpers] Relational network build failed:', e);
    return [];
  }
}

// ============= LEAD CONTACTS =============

export async function fetchLeadContacts(
  supabase: any,
  leadId: string
): Promise<Array<{ name: string; position: string | null; email: string | null; is_primary: boolean }>> {
  try {
    const { data } = await supabase
      .from('lead_contacts')
      .select('name, position, email, is_primary')
      .eq('lead_id', leadId)
      .order('is_primary', { ascending: false });
    return (data || []).map((c: any) => ({
      name: c.name,
      position: c.position,
      email: c.email,
      is_primary: c.is_primary || false,
    }));
  } catch { return []; }
}

// ============= MEETING NOTES =============

export async function fetchMeetingNotes(
  supabase: any,
  entityType: string,
  entityId: string
): Promise<Array<{ objectives: string | null; notes: string | null; ai_summary: string | null; next_steps: string | null; created_at: string }>> {
  try {
    let query = supabase
      .from('meeting_notes')
      .select('objectives, notes, ai_summary, next_steps, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (entityType === 'project') {
      query = query.eq('project_id', entityId);
    } else if (entityType === 'lead') {
      // meeting_notes links via opportunity → lead, or via project. 
      // Try via opportunity_id first
      const { data: opps } = await supabase
        .from('opportunities')
        .select('id')
        .eq('lead_id', entityId);
      if (opps?.length) {
        query = query.in('opportunity_id', opps.map((o: any) => o.id));
      } else {
        return [];
      }
    } else {
      return [];
    }

    const { data } = await query;
    return (data || []).map((m: any) => ({
      objectives: m.objectives,
      notes: m.notes,
      ai_summary: m.ai_summary,
      next_steps: m.next_steps,
      created_at: m.created_at,
    }));
  } catch { return []; }
}

// ============= ACTIVITY LOG =============

export async function fetchActivityLog(
  supabase: any,
  entityType: string,
  entityId: string
): Promise<Array<{ activity_type: string; title: string | null; content: string | null; created_at: string }>> {
  try {
    const { data } = await supabase
      .from('activity_log')
      .select('activity_type, title, content, created_at')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(15);
    return (data || []).map((a: any) => ({
      activity_type: a.activity_type,
      title: a.title,
      content: a.content?.substring(0, 500) || null,
      created_at: a.created_at,
    }));
  } catch { return []; }
}

// ============= FRENCH LANGUAGE INSTRUCTION =============

export const FRENCH_INSTRUCTION = `
## LANGUE
- RÉPONDS TOUJOURS EN FRANÇAIS. Tous les champs textuels, titres, analyses et recommandations DOIVENT être rédigés en français.
- Les noms propres (personnes, entreprises, produits) restent dans leur langue d'origine.
`;

// ============= PROMPT BUILDING HELPERS =============

export function buildContextNotesBlock(notes: string[]): string {
  if (!notes.length) return '';
  return `\n## 📝 Notes de contexte (priorité maximale)\n${notes.map((n, i) => `> **Note ${i + 1}:** ${n}`).join('\n')}\n`;
}

export function buildVocabularyBlock(vocab: string[]): string {
  if (!vocab.length) return '';
  return `\n## 📖 Vocabulaire métier\n${vocab.join(', ')}\n`;
}

export function buildMappingsBlock(mappings: ParticipantMapping[]): string {
  if (!mappings.length) return '';
  return `\n## 🔗 Correspondances speaker ↔ CRM connues\n${mappings.map(m => `- "${m.speakerLabel}" → ${m.entityName} (${m.entityType})`).join('\n')}\n`;
}

export function buildNetworkBlock(network: RelationalNode[]): string {
  if (!network.length) return '';
  return `\n## 🕸️ Réseau relationnel (graphe de contacts)\n${network.map(n => {
    let line = `- **${n.name}**`;
    if (n.entityType) line += ` [${n.entityType}]`;
    line += ` — ${n.meetingCount} réunion(s)`;
    if (n.projects.length) line += `, projets: ${n.projects.join(', ')}`;
    if (n.lastSeen) line += `, dernier: ${formatDateFR(n.lastSeen)}`;
    if (n.coParticipants.length > 0) {
      line += `\n  ↔ Co-participants fréquents: ${n.coParticipants.slice(0, 5).join(', ')}`;
    }
    return line;
  }).join('\n')}\n`;
}

export function buildLeadContactsBlock(contacts: Awaited<ReturnType<typeof fetchLeadContacts>>): string {
  if (!contacts.length) return '';
  return `\n## 👥 Contacts associés\n${contacts.map(c => {
    let line = `- **${c.name}**`;
    if (c.position) line += ` — ${c.position}`;
    if (c.is_primary) line += ' ⭐ Contact principal';
    if (c.email) line += ` (${c.email})`;
    return line;
  }).join('\n')}\n`;
}

export function buildMeetingNotesBlock(notes: Awaited<ReturnType<typeof fetchMeetingNotes>>): string {
  if (!notes.length) return '';
  return `\n## 📋 Comptes-rendus de réunion\n${notes.map(n => {
    let block = `### CR du ${formatDateFR(n.created_at)}`;
    if (n.objectives) block += `\n**Objectifs:** ${n.objectives}`;
    if (n.ai_summary) block += `\n**Résumé:** ${n.ai_summary}`;
    else if (n.notes) block += `\n**Notes:** ${n.notes.substring(0, 500)}`;
    if (n.next_steps) block += `\n**Prochaines étapes:** ${n.next_steps}`;
    return block;
  }).join('\n\n')}\n`;
}

export function buildActivityLogBlock(activities: Awaited<ReturnType<typeof fetchActivityLog>>): string {
  if (!activities.length) return '';
  return `\n## 📊 Historique d'activité récent\n${activities.map(a => {
    let line = `- [${formatDateFR(a.created_at)}] **${a.activity_type}**`;
    if (a.title) line += `: ${a.title}`;
    if (a.content) line += `\n  ${a.content.substring(0, 200)}`;
    return line;
  }).join('\n')}\n`;
}
