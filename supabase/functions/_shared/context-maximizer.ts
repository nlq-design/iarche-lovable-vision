/**
 * Context Maximizer - Intelligent context assembly for 128k token window
 * 
 * Builds the richest possible context for LLM calls by:
 * 1. Fetching ALL available data for an entity (cross-entity cascade)
 * 2. Prioritizing by relevance (notes > meetings > transcriptions > activities)
 * 3. Respecting a configurable token budget
 * 4. Providing token counting for monitoring
 * 
 * Usage:
 *   import { buildMaxContext } from "../_shared/context-maximizer.ts";
 *   const ctx = await buildMaxContext(supabase, { entityType: 'lead', entityId: '...' });
 *   // ctx.blocks = assembled markdown blocks
 *   // ctx.estimatedTokens = approximate token count
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  fetchContextNotes,
  fetchVocabulary,
  fetchMeetingNotes,
  fetchActivityLog,
  fetchLeadContacts,
  fetchParticipantMappings,
  buildContextNotesBlock,
  buildVocabularyBlock,
  buildMeetingNotesBlock,
  buildActivityLogBlock,
  buildLeadContactsBlock,
  buildMappingsBlock,
  formatDateFR,
} from "./consulte-helpers.ts";

// ============= TOKEN ESTIMATION =============

/** Rough token estimation: ~4 chars per token for French text */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ============= TYPES =============

export interface MaxContextOptions {
  entityType: string;
  entityId: string;
  /** Max tokens for the context block (default: 80000, leaving room for system prompt + output) */
  tokenBudget?: number;
  /** Include cross-entity data (related leads, projects, etc.) */
  crossEntity?: boolean;
  /** Include full transcription summaries */
  includeTranscriptions?: boolean;
  /** Include document summaries */
  includeDocuments?: boolean;
  /** Include email history */
  includeEmails?: boolean;
  /** Workspace ID for participant mappings */
  workspaceId?: string;
}

export interface MaxContextResult {
  /** Assembled markdown context blocks */
  blocks: string;
  /** Estimated token count */
  estimatedTokens: number;
  /** Breakdown by section */
  breakdown: Record<string, number>;
  /** Warnings (e.g., truncated sections) */
  warnings: string[];
}

// ============= CONTEXT BUILDER =============

export async function buildMaxContext(
  supabase: SupabaseClient,
  options: MaxContextOptions
): Promise<MaxContextResult> {
  const {
    entityType,
    entityId,
    tokenBudget = 80000,
    crossEntity = true,
    includeTranscriptions = true,
    includeDocuments = true,
    includeEmails = true,
    workspaceId = '00000000-0000-0000-0000-000000000001',
  } = options;

  const sections: Array<{ name: string; content: string; priority: number }> = [];
  const warnings: string[] = [];

  // ===== PRIORITY 1: Context Notes (highest signal) =====
  const contextNotes = await fetchContextNotes(supabase, entityType, entityId);
  if (contextNotes.length) {
    sections.push({
      name: 'context_notes',
      content: buildContextNotesBlock(contextNotes),
      priority: 1,
    });
  }

  // ===== PRIORITY 2: Vocabulary =====
  const vocab = await fetchVocabulary(supabase, entityType, entityId);
  if (vocab.length) {
    sections.push({
      name: 'vocabulary',
      content: buildVocabularyBlock(vocab),
      priority: 2,
    });
  }

  // ===== PRIORITY 3: Lead contacts (if lead) =====
  if (entityType === 'lead') {
    const contacts = await fetchLeadContacts(supabase, entityId);
    if (contacts.length) {
      sections.push({
        name: 'contacts',
        content: buildLeadContactsBlock(contacts),
        priority: 3,
      });
    }
  }

  // ===== PRIORITY 4: Meeting notes =====
  const meetingNotes = await fetchMeetingNotes(supabase, entityType, entityId);
  if (meetingNotes.length) {
    sections.push({
      name: 'meeting_notes',
      content: buildMeetingNotesBlock(meetingNotes),
      priority: 4,
    });
  }

  // ===== PRIORITY 5: Transcription summaries =====
  if (includeTranscriptions) {
    const transcriptions = await fetchTranscriptionSummaries(supabase, entityType, entityId);
    if (transcriptions) {
      sections.push({
        name: 'transcriptions',
        content: transcriptions,
        priority: 5,
      });
    }
  }

  // ===== PRIORITY 6: Activity log =====
  const activities = await fetchActivityLog(supabase, entityType, entityId);
  if (activities.length) {
    sections.push({
      name: 'activity_log',
      content: buildActivityLogBlock(activities),
      priority: 6,
    });
  }

  // ===== PRIORITY 7: Document summaries =====
  if (includeDocuments) {
    const docs = await fetchDocumentSummaries(supabase, entityType, entityId);
    if (docs) {
      sections.push({
        name: 'documents',
        content: docs,
        priority: 7,
      });
    }
  }

  // ===== PRIORITY 8: Email history =====
  if (includeEmails) {
    const emails = await fetchEmailHistory(supabase, entityType, entityId);
    if (emails) {
      sections.push({
        name: 'emails',
        content: emails,
        priority: 8,
      });
    }
  }

  // ===== PRIORITY 9: Cross-entity enrichment =====
  if (crossEntity) {
    const crossData = await fetchCrossEntityData(supabase, entityType, entityId);
    if (crossData) {
      sections.push({
        name: 'cross_entity',
        content: crossData,
        priority: 9,
      });
    }
  }

  // ===== PRIORITY 10: Participant mappings =====
  const mappings = await fetchParticipantMappings(supabase, workspaceId);
  if (mappings.length) {
    sections.push({
      name: 'participant_mappings',
      content: buildMappingsBlock(mappings),
      priority: 10,
    });
  }

  // ===== ASSEMBLE WITH TOKEN BUDGET =====
  sections.sort((a, b) => a.priority - b.priority);

  let totalTokens = 0;
  const includedBlocks: string[] = [];
  const breakdown: Record<string, number> = {};

  for (const section of sections) {
    const sectionTokens = estimateTokens(section.content);
    
    if (totalTokens + sectionTokens <= tokenBudget) {
      includedBlocks.push(section.content);
      breakdown[section.name] = sectionTokens;
      totalTokens += sectionTokens;
    } else {
      // Try to include a truncated version
      const remainingBudget = tokenBudget - totalTokens;
      if (remainingBudget > 500) { // At least 500 tokens worth
        const truncatedChars = remainingBudget * 4;
        const truncated = section.content.substring(0, truncatedChars) + '\n\n> ⚠️ Section tronquée (budget tokens atteint)\n';
        includedBlocks.push(truncated);
        breakdown[section.name] = remainingBudget;
        totalTokens += remainingBudget;
        warnings.push(`Section "${section.name}" tronquée (${sectionTokens} → ${remainingBudget} tokens)`);
      } else {
        warnings.push(`Section "${section.name}" omise (${sectionTokens} tokens, budget insuffisant)`);
      }
      break; // Stop adding sections
    }
  }

  return {
    blocks: includedBlocks.join('\n'),
    estimatedTokens: totalTokens,
    breakdown,
    warnings,
  };
}

// ============= SPECIALIZED FETCHERS =============

async function fetchTranscriptionSummaries(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string
): Promise<string | null> {
  try {
    let query = supabase
      .from('voice_transcriptions')
      .select('id, title, transcription_date, ai_summary, action_items, key_decisions, duration_seconds, participants_count')
      .eq('status', 'done')
      .order('transcription_date', { ascending: false })
      .limit(30);

    if (entityType === 'lead') {
      query = query.eq('lead_id', entityId);
    } else if (entityType === 'project') {
      query = query.eq('project_id', entityId);
    } else if (entityType === 'partner') {
      // Get via transcription_partners
      const { data: tpIds } = await supabase
        .from('transcription_partners')
        .select('transcription_id')
        .eq('partner_id', entityId);
      if (!tpIds?.length) return null;
      query = query.in('id', tpIds.map((t: any) => t.transcription_id));
    } else {
      return null;
    }

    const { data } = await query;
    if (!data?.length) return null;

    let block = '\n## 🎙️ Transcriptions de réunions\n';
    for (const t of data) {
      block += `\n### ${t.title || 'Réunion'} — ${formatDateFR(t.transcription_date || '')}`;
      if (t.duration_seconds) block += ` (${Math.round(t.duration_seconds / 60)} min)`;

      // Fetch confirmed participant names from transcription_participants
      try {
        const { data: participants } = await supabase
          .from('transcription_participants')
          .select('name, linked_entity_type, role_in_meeting')
          .eq('transcription_id', t.id)
          .eq('presence_status', 'present');
        if (participants?.length) {
          const names = participants.map((p: any) => {
            let label = p.name;
            if (p.linked_entity_type) label += ` [${p.linked_entity_type}]`;
            return label;
          }).join(', ');
          block += ` — Participants: ${names}`;
        } else if (t.participants_count) {
          block += ` — ${t.participants_count} participants`;
        }
      } catch {
        if (t.participants_count) block += ` — ${t.participants_count} participants`;
      }

      if (t.ai_summary) block += `\n**Résumé:** ${t.ai_summary}`;
      if (t.key_decisions) {
        const decisions = Array.isArray(t.key_decisions) ? t.key_decisions : [];
        if (decisions.length) block += `\n**Décisions clés:** ${decisions.join(' | ')}`;
      }
      if (t.action_items) {
        const actions = Array.isArray(t.action_items) ? t.action_items : [];
        if (actions.length) block += `\n**Actions:** ${actions.join(' | ')}`;
      }
      block += '\n';
    }

    return block;
  } catch (e) {
    console.warn('[context-maximizer] Transcription fetch error:', e);
    return null;
  }
}

async function fetchDocumentSummaries(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string
): Promise<string | null> {
  try {
    // Fetch articles/resources linked to the entity
    let articleIds: string[] = [];
    
    if (entityType === 'lead' || entityType === 'project') {
      // Check if entity has ai_documents_summary
      const table = entityType === 'lead' ? 'leads' : 'projects';
      const { data: entity } = await supabase
        .from(table)
        .select('ai_documents_summary')
        .eq('id', entityId)
        .maybeSingle();
      
      if (entity?.ai_documents_summary) {
        return `\n## 📄 Synthèse documentaire\n${entity.ai_documents_summary}\n`;
      }
    }

    // Fetch generated documents (quotes, proposals, etc.)
    const { data: docs } = await supabase
      .from('generated_documents')
      .select('title, document_type, status, total_ht, total_ttc, created_at')
      .or(`lead_id.eq.${entityId},project_id.eq.${entityId}`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!docs?.length) return null;

    let block = '\n## 📄 Documents générés\n';
    for (const d of docs) {
      block += `- **${d.title || d.document_type}** (${d.document_type}) — ${formatDateFR(d.created_at)}`;
      if (d.status) block += ` [${d.status}]`;
      if (d.total_ttc) block += ` — ${d.total_ttc.toLocaleString('fr-FR')}€ TTC`;
      block += '\n';
    }

    return block;
  } catch (e) {
    console.warn('[context-maximizer] Document fetch error:', e);
    return null;
  }
}

async function fetchEmailHistory(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string
): Promise<string | null> {
  try {
    const { data: emails } = await supabase
      .from('email_logs')
      .select('subject, recipient_email, email_type, status, sent_at, created_at')
      .eq('source_type', entityType)
      .eq('source_id', entityId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!emails?.length) return null;

    let block = '\n## 📧 Historique emails\n';
    for (const e of emails) {
      block += `- [${formatDateFR(e.sent_at || e.created_at)}] **${e.subject}** → ${e.recipient_email}`;
      block += ` (${e.email_type}, ${e.status})`;
      block += '\n';
    }

    return block;
  } catch (err) {
    console.warn('[context-maximizer] Email fetch error:', err);
    return null;
  }
}

async function fetchCrossEntityData(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string
): Promise<string | null> {
  try {
    let block = '\n## 🔗 Entités liées\n';
    let hasData = false;

    if (entityType === 'lead') {
      // Fetch projects linked to this lead
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status, health_status, budget_total, start_date, end_date, ai_documents_summary')
        .eq('lead_id', entityId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (projects?.length) {
        hasData = true;
        block += '\n### Projets associés\n';
        for (const p of projects) {
          block += `- **${p.name}** — ${p.status || 'N/A'}`;
          if (p.health_status) block += ` [${p.health_status}]`;
          if (p.budget_total) block += ` — Budget: ${p.budget_total.toLocaleString('fr-FR')}€`;
          if (p.start_date) block += ` — Début: ${formatDateFR(p.start_date)}`;
          block += '\n';
          if (p.ai_documents_summary) {
            block += `  > Synthèse: ${p.ai_documents_summary.substring(0, 500)}\n`;
          }
        }
      }

      // Fetch opportunities
      const { data: opps } = await supabase
        .from('opportunities')
        .select('title, status, amount, probability, expected_close_date, current_stage')
        .eq('lead_id', entityId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (opps?.length) {
        hasData = true;
        block += '\n### Opportunités commerciales\n';
        for (const o of opps) {
          block += `- **${o.title}** — ${o.status || 'N/A'}`;
          if (o.current_stage) block += ` (étape: ${o.current_stage})`;
          if (o.amount) block += ` — ${o.amount.toLocaleString('fr-FR')}€`;
          if (o.probability) block += ` (proba: ${o.probability}%)`;
          if (o.expected_close_date) block += ` — Clôture prévue: ${formatDateFR(o.expected_close_date)}`;
          block += '\n';
        }
      }

      // Fetch entity name references (bidirectional links)
      const { data: refs } = await supabase
        .from('entity_name_references')
        .select('target_entity_type, target_entity_id, reference_type, confidence_score, context')
        .eq('source_entity_type', entityType)
        .eq('source_entity_id', entityId)
        .gte('confidence_score', 0.6)
        .order('confidence_score', { ascending: false })
        .limit(20);

      if (refs?.length) {
        hasData = true;
        block += '\n### Références croisées détectées\n';
        for (const r of refs) {
          block += `- ${r.target_entity_type}:${r.target_entity_id.substring(0, 8)} — ${r.reference_type} (confiance: ${Math.round(r.confidence_score * 100)}%)`;
          if (r.context) block += ` — "${r.context.substring(0, 200)}"`;
          block += '\n';
        }
      }
    } else if (entityType === 'project') {
      // Fetch lead info for the project
      const { data: project } = await supabase
        .from('projects')
        .select('lead_id')
        .eq('id', entityId)
        .maybeSingle();

      if (project?.lead_id) {
        const { data: lead } = await supabase
          .from('leads')
          .select('company, status, score, sector, source, budget_min, budget_max, ai_documents_summary')
          .eq('id', project.lead_id)
          .maybeSingle();

        if (lead) {
          hasData = true;
          block += `\n### Lead parent\n`;
          block += `- **${lead.company}** — ${lead.status || 'N/A'}`;
          if (lead.score) block += ` (score: ${lead.score})`;
          if (lead.sector) block += ` — Secteur: ${lead.sector}`;
          if (lead.budget_min || lead.budget_max) {
            block += ` — Budget: ${lead.budget_min || '?'}€ - ${lead.budget_max || '?'}€`;
          }
          block += '\n';
          if (lead.ai_documents_summary) {
            block += `  > Synthèse lead: ${lead.ai_documents_summary.substring(0, 1000)}\n`;
          }
        }
      }

      // Fetch tasks for the project
      const { data: tasks } = await supabase
        .from('tasks')
        .select('title, status, priority, due_date, assignee_name')
        .eq('project_id', entityId)
        .order('due_date', { ascending: true })
        .limit(30);

      if (tasks?.length) {
        hasData = true;
        block += '\n### Tâches du projet\n';
        const statusGroups: Record<string, typeof tasks> = {};
        for (const t of tasks) {
          const s = t.status || 'sans_statut';
          if (!statusGroups[s]) statusGroups[s] = [];
          statusGroups[s].push(t);
        }
        for (const [status, group] of Object.entries(statusGroups)) {
          block += `\n**${status}** (${group.length}):\n`;
          for (const t of group.slice(0, 10)) {
            block += `- ${t.title}`;
            if (t.priority) block += ` [${t.priority}]`;
            if (t.due_date) block += ` — Échéance: ${formatDateFR(t.due_date)}`;
            if (t.assignee_name) block += ` — ${t.assignee_name}`;
            block += '\n';
          }
        }
      }
    }

    return hasData ? block : null;
  } catch (e) {
    console.warn('[context-maximizer] Cross-entity fetch error:', e);
    return null;
  }
}

// ============= CONVENIENCE: Token budget summary for logging =============

export function formatContextSummary(result: MaxContextResult): string {
  const lines = [`📊 Contexte injecté: ~${result.estimatedTokens.toLocaleString()} tokens`];
  for (const [name, tokens] of Object.entries(result.breakdown)) {
    lines.push(`  - ${name}: ~${tokens.toLocaleString()} tokens`);
  }
  if (result.warnings.length) {
    lines.push(`⚠️ Avertissements:`);
    for (const w of result.warnings) {
      lines.push(`  - ${w}`);
    }
  }
  return lines.join('\n');
}
