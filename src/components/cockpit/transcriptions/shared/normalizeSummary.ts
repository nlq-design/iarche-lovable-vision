/**
 * Normalize LLM output fields to frontend expected fields
 * LLM may return different field names depending on prompt version
 */
export interface NormalizedSummary {
  title?: string;
  executive_summary: string;
  topics: string[];
  key_points: (string | object)[];
  decisions: string[];
  next_steps: ({ action?: string } | string)[];
  action_items: Record<string, unknown>[];
  risks_blockers: (string | object)[];
  questions_open: (string | object)[];
  extraction_quality?: {
    confidence?: number;
    uncertainties?: string[];
  };
}

// Helper to ensure a value is an array
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ensureArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value == null) return [];
  // If it's a non-null object or primitive, return empty (rare edge case)
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeSummary(rawSummary: any): NormalizedSummary | null {
  if (!rawSummary) return null;

  const raw = rawSummary;

  // Ensure arrays are actually arrays before using .map/.length
  const rawTopics = ensureArray<string>(raw?.topics);
  const rawAiTechnologies = ensureArray<{ name?: string } | string>(raw?.ai_technologies);
  const rawKeyPoints = ensureArray<string | object>(raw?.key_points);
  const rawHighlights = ensureArray<string | object>(raw?.highlights);
  const rawTechRecommendations = ensureArray<string | object>(raw?.technical_recommendations);
  const rawDecisions = ensureArray<{ content?: string } | string>(raw?.decisions);
  const rawNextSteps = ensureArray<{ action?: string } | string>(raw?.next_steps);
  const rawActionItems = ensureArray<Record<string, unknown>>(raw?.action_items);
  const rawTasks = ensureArray<Record<string, unknown>>(raw?.tasks);
  const rawRisksBlockers = ensureArray<string | object>(raw?.risks_blockers);
  const rawRisksLimitations = ensureArray<string | object>(raw?.risks_limitations);
  const rawQuestionsOpen = ensureArray<string | object>(raw?.questions_open);

  return {
    title: raw?.title,
    // executive_summary: prioritize explicit field, fallback to 'summary' text
    executive_summary: raw?.executive_summary || raw?.summary || '',
    // topics: from topics array or extract from key_points/technical_recommendations titles
    topics: rawTopics.length 
      ? rawTopics 
      : (rawAiTechnologies.length 
          ? rawAiTechnologies.map((t) => 
              typeof t === 'string' ? t : t.name
            ).filter(Boolean) as string[]
          : []),
    // key_points: can come from key_points, highlights, or technical_recommendations
    key_points: rawKeyPoints.length 
      ? rawKeyPoints 
      : (rawHighlights.length 
          ? rawHighlights 
          : (rawTechRecommendations.length 
              ? rawTechRecommendations 
              : [])),
    // decisions: from decisions array (normalize to strings)
    decisions: rawDecisions.length 
      ? rawDecisions.map((d) => 
          typeof d === 'string' ? d : d.content
        ).filter(Boolean) as string[]
      : [],
    // next_steps: from next_steps array
    next_steps: rawNextSteps.length ? rawNextSteps : [],
    // action_items: from action_items, tasks, or next_steps
    action_items: rawActionItems.length 
      ? rawActionItems 
      : (rawTasks.length ? rawTasks : []),
    // risks_blockers: from risks_blockers or risks_limitations
    risks_blockers: rawRisksBlockers.length 
      ? rawRisksBlockers 
      : (rawRisksLimitations.length ? rawRisksLimitations : []),
    // questions_open: keep as is
    questions_open: rawQuestionsOpen,
    // extraction_quality
    extraction_quality: raw?.extraction_quality,
  };
}
