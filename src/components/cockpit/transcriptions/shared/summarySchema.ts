/**
 * Zod validation schema for transcription summaries.
 *
 * LLM outputs are notoriously inconsistent: arrays sometimes come back as
 * strings, objects, or null. This schema validates AND coerces to a
 * guaranteed-safe shape so consumers can iterate without defensive code.
 *
 * Use `safeParseSummary(raw)` everywhere a raw summary is consumed.
 */
import { z } from 'zod';

// --- Primitive coercers ---------------------------------------------------

/** Accept anything, return [] if not an array. */
const arrayOf = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(schema));

/** Accept string | null | undefined, return string | undefined. */
const optStr = z.preprocess(
  (v) => (typeof v === 'string' && v.length > 0 ? v : undefined),
  z.string().optional()
);

/** Accept string or object {content,text,...}, return string. */
const flexibleString = z.preprocess((v) => {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    for (const k of ['content', 'text', 'description', 'issue', 'decision', 'point', 'item', 'name', 'action', 'task', 'step']) {
      if (typeof obj[k] === 'string') return obj[k];
    }
  }
  return undefined;
}, z.string().optional());

// --- Sub-schemas ----------------------------------------------------------

export const actionItemSchema = z.object({
  task: optStr,
  title: optStr,
  owner: optStr.nullable().optional(),
  assignee: optStr.nullable().optional(),
  due_date: optStr.nullable().optional(),
  deadline: optStr.nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
}).passthrough();

export const nextStepSchema = z.object({
  action: optStr,
  owner: optStr.nullable().optional(),
  deadline: optStr.nullable().optional(),
}).passthrough();

export const participantSchema = z.object({
  name: optStr,
  role: optStr,
  company: optStr,
}).passthrough();

// --- Main summary schema --------------------------------------------------

export const transcriptionSummarySchema = z.object({
  title: optStr,
  executive_summary: z.preprocess(
    (v) => (typeof v === 'string' ? v : ''),
    z.string()
  ),
  topics: arrayOf(flexibleString),
  key_points: arrayOf(flexibleString),
  decisions: arrayOf(flexibleString),
  risks_blockers: arrayOf(flexibleString),
  questions_open: arrayOf(flexibleString),
  action_items: arrayOf(actionItemSchema),
  next_steps: arrayOf(nextStepSchema),
  participants: arrayOf(participantSchema),
}).passthrough();

export type SafeTranscriptionSummary = z.infer<typeof transcriptionSummarySchema>;

/**
 * Validates and normalizes a raw summary. Never throws — always returns a
 * usable object (empty arrays / empty strings where data is missing).
 */
export function safeParseSummary(raw: unknown): SafeTranscriptionSummary {
  const result = transcriptionSummarySchema.safeParse(raw ?? {});
  if (result.success) return result.data;
  // Last-resort fallback: return an empty-but-valid shape.
  return {
    title: undefined,
    executive_summary: '',
    topics: [],
    key_points: [],
    decisions: [],
    risks_blockers: [],
    questions_open: [],
    action_items: [],
    next_steps: [],
    participants: [],
  };
}

// --- ai_metadata (lightweight, used by search) ---------------------------

export const aiMetadataSchema = z.object({
  expected_participants: arrayOf(
    z.object({ name: optStr, company: optStr }).passthrough()
  ),
}).passthrough();

export type SafeAiMetadata = z.infer<typeof aiMetadataSchema>;

export function safeParseAiMetadata(raw: unknown): SafeAiMetadata {
  const result = aiMetadataSchema.safeParse(raw ?? {});
  return result.success
    ? result.data
    : { expected_participants: [] };
}
