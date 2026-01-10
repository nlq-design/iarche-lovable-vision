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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeSummary(rawSummary: any): NormalizedSummary | null {
  if (!rawSummary) return null;

  const raw = rawSummary;

  return {
    title: raw?.title,
    // executive_summary: prioritize explicit field, fallback to 'summary' text
    executive_summary: raw?.executive_summary || raw?.summary || '',
    // topics: from topics array or extract from key_points/technical_recommendations titles
    topics: raw?.topics?.length 
      ? raw.topics 
      : (raw?.ai_technologies?.length 
          ? raw.ai_technologies.map((t: { name?: string } | string) => 
              typeof t === 'string' ? t : t.name
            ).filter(Boolean) 
          : []),
    // key_points: can come from key_points, highlights, or technical_recommendations
    key_points: raw?.key_points?.length 
      ? raw.key_points 
      : (raw?.highlights?.length 
          ? raw.highlights 
          : (raw?.technical_recommendations?.length 
              ? raw.technical_recommendations 
              : [])),
    // decisions: from decisions array (normalize to strings)
    decisions: raw?.decisions?.length 
      ? raw.decisions.map((d: { content?: string } | string) => 
          typeof d === 'string' ? d : d.content
        ).filter(Boolean) 
      : [],
    // next_steps: from next_steps array
    next_steps: raw?.next_steps?.length ? raw.next_steps : [],
    // action_items: from action_items, tasks, or next_steps
    action_items: raw?.action_items?.length 
      ? raw.action_items 
      : (raw?.tasks?.length ? raw.tasks : []),
    // risks_blockers: from risks_blockers or risks_limitations
    risks_blockers: raw?.risks_blockers?.length 
      ? raw.risks_blockers 
      : (raw?.risks_limitations?.length ? raw.risks_limitations : []),
    // questions_open: keep as is
    questions_open: raw?.questions_open || [],
    // extraction_quality
    extraction_quality: raw?.extraction_quality,
  };
}
