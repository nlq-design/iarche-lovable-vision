/**
 * Normalize LLM output fields to frontend expected fields
 * LLM may return different field names depending on prompt version
 * 
 * This utility maps all known variations from the 6 transcription prompts:
 * - transcription_rdv_commercial
 * - transcription_avec_expert_ia
 * - transcription_avec_referent
 * - transcription_interne
 * - transcription_reunion_projet
 * - transcription_support_client
 */

export interface ActionItem {
  task: string;
  owner?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
}

export interface Participant {
  name: string;
  role?: string;
  company?: string;
  crm_match?: { type: string; id: string; confidence: number } | null;
}

export interface FinancialItem {
  amount: number;
  currency?: string;
  context: string;
}

export interface DateMention {
  original: string;
  normalized: string;
  context: string;
}

export interface NextStep {
  action: string;
  owner?: string | null;
  deadline?: string | null;
}

export interface NormalizedSummary {
  title?: string;
  executive_summary: string;
  topics: string[];
  key_points: string[];
  decisions: string[];
  action_items: ActionItem[];
  risks_blockers: string[];
  questions_open: string[];
  participants: Participant[];
  financial_data: FinancialItem[];
  dates_mentioned: DateMention[];
  next_steps: NextStep[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  quality_score?: number;
  extraction_quality?: {
    confidence?: number;
    uncertainties?: string[];
  };
}

// Helper to ensure a value is an array
function ensureArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value == null) return [];
  return [];
}

// Helper to extract string from various object shapes
function extractString(item: unknown): string | null {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const obj = item as Record<string, unknown>;
    // Try common field names
    const fields = ['content', 'text', 'description', 'issue', 'decision', 'point', 'item', 'name', 'action', 'task', 'step'];
    for (const field of fields) {
      if (typeof obj[field] === 'string') return obj[field] as string;
    }
    // Fallback: stringify if has meaningful content
    const keys = Object.keys(obj);
    if (keys.length > 0 && typeof obj[keys[0]] === 'string') {
      return obj[keys[0]] as string;
    }
  }
  return null;
}

// Normalize any item to ActionItem format
function normalizeToActionItem(item: unknown): ActionItem | null {
  if (!item) return null;
  
  if (typeof item === 'string') {
    return { task: item };
  }
  
  if (typeof item === 'object') {
    const obj = item as Record<string, unknown>;
    
    // Map various field names to unified format
    const task = 
      (obj.task as string) || 
      (obj.action as string) || 
      (obj.step as string) || 
      (obj.description as string) ||
      (obj.issue as string) ||
      (obj.text as string) ||
      '';
    
    if (!task) return null;
    
    return {
      task,
      owner: (obj.owner as string) || (obj.assignee as string) || (obj.party as string) || undefined,
      due_date: (obj.due_date as string) || (obj.deadline as string) || undefined,
      priority: (['low', 'medium', 'high'].includes(obj.priority as string) 
        ? obj.priority as 'low' | 'medium' | 'high' 
        : undefined),
      category: (obj.category as string) || (obj.type as string) || undefined,
    };
  }
  
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeSummary(rawSummary: any): NormalizedSummary | null {
  if (!rawSummary) return null;

  const raw = rawSummary;

  // ========== EXECUTIVE SUMMARY ==========
  // Variations: executive_summary, summary
  const executive_summary = 
    (raw?.executive_summary as string) || 
    (raw?.summary as string) || 
    '';

  // ========== TITLE ==========
  const title = raw?.title as string | undefined;

  // ========== TOPICS ==========
  // Variations: topics, ai_technologies (expert_ia prompt)
  const rawTopics = ensureArray<string | { name?: string }>(raw?.topics);
  const rawAiTechnologies = ensureArray<{ name?: string } | string>(raw?.ai_technologies);
  
  let topics: string[] = [];
  if (rawTopics.length) {
    topics = rawTopics.map(t => typeof t === 'string' ? t : t.name).filter(Boolean) as string[];
  } else if (rawAiTechnologies.length) {
    topics = rawAiTechnologies.map(t => typeof t === 'string' ? t : t.name).filter(Boolean) as string[];
  }

  // ========== KEY POINTS ==========
  // Variations: key_points, highlights, technical_recommendations
  const rawKeyPoints = ensureArray(raw?.key_points);
  const rawHighlights = ensureArray(raw?.highlights);
  const rawTechRecommendations = ensureArray(raw?.technical_recommendations);
  
  let key_points: string[] = [];
  const keyPointsSource = rawKeyPoints.length ? rawKeyPoints 
    : rawHighlights.length ? rawHighlights 
    : rawTechRecommendations.length ? rawTechRecommendations 
    : [];
  key_points = keyPointsSource.map(extractString).filter(Boolean) as string[];

  // ========== DECISIONS ==========
  // Variations: decisions, technical_decisions
  const rawDecisions = ensureArray(raw?.decisions);
  const rawTechDecisions = ensureArray(raw?.technical_decisions);
  
  const decisionsSource = rawDecisions.length ? rawDecisions : rawTechDecisions;
  const decisions = decisionsSource.map(d => {
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object') {
      const obj = d as Record<string, unknown>;
      return (obj.decision as string) || (obj.content as string) || (obj.text as string) || null;
    }
    return null;
  }).filter(Boolean) as string[];

  // ========== ACTION ITEMS ==========
  // Variations: action_items, tasks, next_steps, mutual_commitments, blockers (as action with proposed_solution)
  const rawActionItems = ensureArray(raw?.action_items);
  const rawTasks = ensureArray(raw?.tasks);
  const rawNextSteps = ensureArray(raw?.next_steps);
  const rawMutualCommitments = ensureArray(raw?.mutual_commitments);
  const rawBlockers = ensureArray(raw?.blockers);
  
  // Merge all action sources into unified action_items
  const allActionSources = [
    ...rawActionItems,
    ...rawTasks,
    ...rawNextSteps,
    ...rawMutualCommitments,
    // Blockers with proposed_solution become actions
    ...rawBlockers.filter((b: unknown) => {
      if (b && typeof b === 'object') {
        return !!(b as Record<string, unknown>).proposed_solution;
      }
      return false;
    }).map((b: unknown) => ({
      task: `${(b as Record<string, unknown>).issue}: ${(b as Record<string, unknown>).proposed_solution}`,
      owner: (b as Record<string, unknown>).owner,
    })),
  ];
  
  const action_items = allActionSources
    .map(normalizeToActionItem)
    .filter(Boolean) as ActionItem[];

  // ========== RISKS / BLOCKERS ==========
  // Variations: risks_blockers, risks_limitations, risks, blockers (without solution)
  const rawRisksBlockers = ensureArray(raw?.risks_blockers);
  const rawRisksLimitations = ensureArray(raw?.risks_limitations);
  const rawRisks = ensureArray(raw?.risks);
  // Blockers without proposed_solution stay as risks
  const blockersAsRisks = rawBlockers.filter((b: unknown) => {
    if (b && typeof b === 'object') {
      return !(b as Record<string, unknown>).proposed_solution;
    }
    return true;
  });
  
  const risksSource = rawRisksBlockers.length ? rawRisksBlockers 
    : rawRisksLimitations.length ? rawRisksLimitations 
    : rawRisks.length ? rawRisks 
    : blockersAsRisks;
  const risks_blockers = risksSource.map(r => {
    if (typeof r === 'string') return r;
    if (r && typeof r === 'object') {
      const obj = r as Record<string, unknown>;
      return (obj.issue as string) || (obj.risk as string) || (obj.description as string) || (obj.text as string) || null;
    }
    return null;
  }).filter(Boolean) as string[];

  // ========== QUESTIONS OPEN ==========
  const rawQuestionsOpen = ensureArray(raw?.questions_open);
  const questions_open = rawQuestionsOpen.map(extractString).filter(Boolean) as string[];

  // ========== EXTRACTION QUALITY ==========
  const extraction_quality = raw?.extraction_quality;

  // ========== PARTICIPANTS ==========
  const rawParticipants = ensureArray(raw?.participants);
  const participants: Participant[] = rawParticipants
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .map(p => ({
      name: (p.name as string) || 'Inconnu',
      role: (p.role as string) || undefined,
      company: (p.company as string) || undefined,
      crm_match: p.crm_match as Participant['crm_match'] ?? null,
    }));

  // ========== FINANCIAL DATA ==========
  const rawFinancial = ensureArray(raw?.financial_data);
  const financial_data: FinancialItem[] = rawFinancial
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object' && typeof (f as any).amount === 'number')
    .map(f => ({
      amount: f.amount as number,
      currency: (f.currency as string) || '€',
      context: (f.context as string) || '',
    }));

  // ========== DATES MENTIONED ==========
  const rawDates = ensureArray(raw?.dates_mentioned);
  const dates_mentioned: DateMention[] = rawDates
    .filter((d): d is Record<string, unknown> => !!d && typeof d === 'object')
    .map(d => ({
      original: (d.original as string) || '',
      normalized: (d.normalized as string) || '',
      context: (d.context as string) || '',
    }));

  // ========== NEXT STEPS ==========
  const rawNextStepsOnly = ensureArray(raw?.next_steps);
  const next_steps: NextStep[] = rawNextStepsOnly
    .map(s => {
      if (typeof s === 'string') return { action: s };
      if (s && typeof s === 'object') {
        const obj = s as Record<string, unknown>;
        const action = (obj.action as string) || (obj.step as string) || (obj.text as string) || '';
        if (!action) return null;
        return { action, owner: (obj.owner as string) || null, deadline: (obj.deadline as string) || null };
      }
      return null;
    })
    .filter(Boolean) as NextStep[];

  // ========== SENTIMENT & QUALITY ==========
  const sentiment = ['positive', 'neutral', 'negative'].includes(raw?.sentiment) ? raw.sentiment : undefined;
  const quality_score = typeof raw?.quality_score === 'number' ? raw.quality_score : undefined;

  return {
    title,
    executive_summary,
    topics,
    key_points,
    decisions,
    action_items,
    risks_blockers,
    questions_open,
    participants,
    financial_data,
    dates_mentioned,
    next_steps,
    sentiment,
    quality_score,
    extraction_quality,
  };
}
