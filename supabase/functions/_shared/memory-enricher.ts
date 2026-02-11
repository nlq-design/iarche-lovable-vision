/**
 * Memory Enricher - Systematically enriches ai_agent_memory
 * 
 * Extracts and stores user preferences, confirmed decisions, and key facts
 * from conversations. Used by orchestrator and cockpit chatbot.
 * 
 * Memory types:
 * - preference: User preferences (e.g., "prefers morning meetings")
 * - decision: Confirmed decisions (e.g., "budget approved at 15k€")
 * - fact: Key business facts (e.g., "client uses React + Node")
 * - insight: AI-derived insights (e.g., "lead responds faster on Tuesdays")
 * - feedback: User feedback on AI suggestions
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { estimateTokens } from "./context-maximizer.ts";

export type MemoryType = 'preference' | 'decision' | 'fact' | 'insight' | 'feedback';

export interface MemoryEntry {
  content: string;
  memoryType: MemoryType;
  category?: string;
  entityType?: string;
  entityId?: string;
  importanceScore?: number; // 0.0 - 1.0
  expiresInDays?: number;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryStats {
  totalMemories: number;
  totalTokens: number;
  byType: Record<string, number>;
  oldestMemory?: string;
  newestMemory?: string;
}

/**
 * Store a memory entry in ai_agent_memory
 */
export async function storeMemory(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string | null,
  entry: MemoryEntry
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Check for duplicates (similar content in same category)
    const { data: existing } = await supabase
      .from('ai_agent_memory')
      .select('id, content')
      .eq('workspace_id', workspaceId)
      .eq('memory_type', entry.memoryType)
      .eq('category', entry.category || '')
      .ilike('content', `%${entry.content.substring(0, 50)}%`)
      .limit(1);

    if (existing?.length) {
      // Update existing memory instead of creating duplicate
      const { error } = await supabase
        .from('ai_agent_memory')
        .update({
          content: entry.content,
          importance_score: entry.importanceScore ?? 0.5,
          metadata: entry.metadata || {},
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id);

      if (error) return { success: false, error: error.message };
      return { success: true, id: existing[0].id };
    }

    // Calculate expiry
    let expiresAt: string | null = null;
    if (entry.expiresInDays) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + entry.expiresInDays);
      expiresAt = expiry.toISOString();
    }

    const { data, error } = await supabase
      .from('ai_agent_memory')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        content: entry.content,
        memory_type: entry.memoryType,
        category: entry.category || null,
        entity_type: entry.entityType || null,
        entity_id: entry.entityId || null,
        importance_score: entry.importanceScore ?? 0.5,
        expires_at: expiresAt,
        session_id: entry.sessionId || null,
        metadata: entry.metadata || {},
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, id: data.id };
  } catch (e) {
    console.error('[memory-enricher] Store error:', e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Store multiple memories at once
 */
export async function storeMemories(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string | null,
  entries: MemoryEntry[]
): Promise<{ stored: number; errors: number }> {
  let stored = 0;
  let errors = 0;

  for (const entry of entries) {
    const result = await storeMemory(supabase, workspaceId, userId, entry);
    if (result.success) stored++;
    else errors++;
  }

  return { stored, errors };
}

/**
 * Retrieve relevant memories for a context
 */
export async function retrieveMemories(
  supabase: SupabaseClient,
  workspaceId: string,
  options: {
    entityType?: string;
    entityId?: string;
    memoryTypes?: MemoryType[];
    category?: string;
    limit?: number;
    minImportance?: number;
  } = {}
): Promise<Array<{ id: string; content: string; memory_type: string; category: string | null; importance_score: number; created_at: string }>> {
  try {
    let query = supabase
      .from('ai_agent_memory')
      .select('id, content, memory_type, category, importance_score, created_at, entity_type, entity_id')
      .eq('workspace_id', workspaceId)
      .order('importance_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(options.limit || 50);

    // Filter by active (not expired)
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (options.entityType && options.entityId) {
      // Include both entity-specific and general memories
      query = query.or(`and(entity_type.eq.${options.entityType},entity_id.eq.${options.entityId}),entity_type.is.null`);
    }

    if (options.memoryTypes?.length) {
      query = query.in('memory_type', options.memoryTypes);
    }

    if (options.category) {
      query = query.eq('category', options.category);
    }

    if (options.minImportance) {
      query = query.gte('importance_score', options.minImportance);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[memory-enricher] Retrieve error:', error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('[memory-enricher] Retrieve error:', e);
    return [];
  }
}

/**
 * Build a memory context block for LLM injection
 */
export function buildMemoryBlock(
  memories: Array<{ content: string; memory_type: string; category: string | null; importance_score: number }>
): string {
  if (!memories.length) return '';

  const grouped: Record<string, string[]> = {};
  for (const m of memories) {
    const key = m.memory_type;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m.content);
  }

  const typeLabels: Record<string, string> = {
    preference: '⚙️ Préférences utilisateur',
    decision: '✅ Décisions confirmées',
    fact: '📌 Faits clés',
    insight: '💡 Insights IA',
    feedback: '📝 Feedback utilisateur',
  };

  let block = '\n## 🧠 Mémoire contextuelle\n';
  for (const [type, items] of Object.entries(grouped)) {
    block += `\n### ${typeLabels[type] || type}\n`;
    for (const item of items) {
      block += `- ${item}\n`;
    }
  }

  return block;
}

/**
 * Get memory statistics for the workspace (for context bar UI)
 */
export async function getMemoryStats(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<MemoryStats> {
  try {
    const { data, error } = await supabase
      .from('ai_agent_memory')
      .select('id, content, memory_type, created_at')
      .eq('workspace_id', workspaceId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: true });

    if (error || !data?.length) {
      return { totalMemories: 0, totalTokens: 0, byType: {} };
    }

    const byType: Record<string, number> = {};
    let totalTokens = 0;

    for (const m of data) {
      const type = m.memory_type as string;
      byType[type] = (byType[type] || 0) + 1;
      totalTokens += estimateTokens(m.content as string);
    }

    return {
      totalMemories: data.length,
      totalTokens,
      byType,
      oldestMemory: data[0]?.created_at as string,
      newestMemory: data[data.length - 1]?.created_at as string,
    };
  } catch (e) {
    console.error('[memory-enricher] Stats error:', e);
    return { totalMemories: 0, totalTokens: 0, byType: {} };
  }
}

/**
 * Extract memories from an AI conversation exchange
 * Call this after each orchestrator response to auto-detect storable info
 */
export function extractMemoriesFromConversation(
  userMessage: string,
  aiResponse: string,
  entityContext?: { entityType: string; entityId: string }
): MemoryEntry[] {
  const memories: MemoryEntry[] = [];

  // Detect preferences
  const prefPatterns = [
    /je préfère\s+(.+?)(?:\.|$)/gi,
    /j'aime\s+(?:mieux|bien)\s+(.+?)(?:\.|$)/gi,
    /plutôt\s+(.+?)(?:\.|$)/gi,
    /toujours\s+(.+?)(?:\.|$)/gi,
  ];
  for (const pattern of prefPatterns) {
    const match = pattern.exec(userMessage);
    if (match) {
      memories.push({
        content: match[0].trim(),
        memoryType: 'preference',
        category: 'user_stated',
        importanceScore: 0.7,
        ...entityContext,
      });
    }
  }

  // Detect confirmed decisions
  const decisionPatterns = [
    /(?:oui|ok|d'accord|validé|on fait|c'est bon|parfait|go)[,.\s]+(.+?)(?:\.|$)/gi,
    /je confirme\s+(.+?)(?:\.|$)/gi,
    /on part sur\s+(.+?)(?:\.|$)/gi,
  ];
  for (const pattern of decisionPatterns) {
    const match = pattern.exec(userMessage);
    if (match && match[1]?.length > 10) {
      memories.push({
        content: match[0].trim(),
        memoryType: 'decision',
        category: 'user_confirmed',
        importanceScore: 0.8,
        ...entityContext,
      });
    }
  }

  // Detect facts from AI response (budget mentions, dates, etc.)
  const factPatterns = [
    /budget\s*(?:de|:)?\s*(\d[\d\s]*(?:€|euros?))/gi,
    /deadline\s*(?::|le)?\s*(\d{1,2}[\s/]\w+[\s/]?\d{0,4})/gi,
    /(?:utilise|stack|techno)\s*(?::|=)?\s*(.+?)(?:\.|$)/gi,
  ];
  for (const pattern of factPatterns) {
    const match = pattern.exec(userMessage) || pattern.exec(aiResponse);
    if (match) {
      memories.push({
        content: match[0].trim(),
        memoryType: 'fact',
        category: 'extracted',
        importanceScore: 0.6,
        ...entityContext,
      });
    }
  }

  return memories;
}

/**
 * Prune old/low-importance memories to stay within token budget
 */
export async function pruneMemories(
  supabase: SupabaseClient,
  workspaceId: string,
  maxTokenBudget: number = 10000
): Promise<{ pruned: number }> {
  try {
    const stats = await getMemoryStats(supabase, workspaceId);
    if (stats.totalTokens <= maxTokenBudget) return { pruned: 0 };

    // Delete expired memories first
    await supabase
      .from('ai_agent_memory')
      .delete()
      .eq('workspace_id', workspaceId)
      .lt('expires_at', new Date().toISOString());

    // Then delete lowest importance oldest memories
    const excess = stats.totalTokens - maxTokenBudget;
    const charsToRemove = excess * 4;

    const { data: candidates } = await supabase
      .from('ai_agent_memory')
      .select('id, content')
      .eq('workspace_id', workspaceId)
      .order('importance_score', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(50);

    if (!candidates?.length) return { pruned: 0 };

    let removedChars = 0;
    const idsToDelete: string[] = [];
    for (const c of candidates) {
      if (removedChars >= charsToRemove) break;
      idsToDelete.push(c.id);
      removedChars += (c.content as string).length;
    }

    if (idsToDelete.length) {
      await supabase
        .from('ai_agent_memory')
        .delete()
        .in('id', idsToDelete);
    }

    return { pruned: idsToDelete.length };
  } catch (e) {
    console.error('[memory-enricher] Prune error:', e);
    return { pruned: 0 };
  }
}
