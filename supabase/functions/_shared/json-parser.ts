/**
 * Shared JSON parsing utilities for LLM responses
 * Used by: process-voice-transcription, generate-document, ai-agent-orchestrator
 */

function tryParseJson(s: string): Record<string, unknown> | null {
  try { return JSON.parse(s); } catch { return null; }
}

function stripOuterBackticks(s: string): string {
  let out = s.trim();
  while (out.startsWith("`")) out = out.slice(1).trimStart();
  while (out.endsWith("`")) out = out.slice(0, -1).trimEnd();
  return out;
}

function extractFromFences(s: string): string | null {
  const lower = s.toLowerCase();
  const start = lower.indexOf("```json");
  if (start !== -1) {
    const after = s.indexOf("\n", start);
    if (after !== -1) {
      const end = s.indexOf("```", after + 1);
      if (end !== -1) return s.slice(after + 1, end).trim();
    }
  }
  const s2 = s.indexOf("```");
  if (s2 !== -1) {
    const after = s.indexOf("\n", s2);
    if (after !== -1) {
      const end = s.indexOf("```", after + 1);
      if (end !== -1) return s.slice(after + 1, end).trim();
    }
  }
  return null;
}

function extractBetweenOuterBraces(s: string): string | null {
  const first = s.indexOf("{");
  if (first === -1) return null;
  const last = s.lastIndexOf("}");
  if (last <= first) return null;
  return s.slice(first, last + 1).trim();
}

function nextNonWhitespace(s: string, from: number): string | null {
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (c !== " " && c !== "\n" && c !== "\r" && c !== "\t") return c;
  }
  return null;
}

function collapseSpaces(s: string): string {
  let out = "";
  let prevSpace = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const isSpace = c === " ";
    if (isSpace) {
      if (!prevSpace) out += " ";
      prevSpace = true;
    } else {
      out += c;
      prevSpace = false;
    }
  }
  return out;
}

function minimalJsonRepair(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\n" || ch === "\r" || ch === "\t") {
      out += " ";
      continue;
    }
    if (ch === ",") {
      const nextChar = nextNonWhitespace(s, i + 1);
      if (nextChar === "}" || nextChar === "]") continue;
    }
    out += ch;
  }
  return collapseSpaces(out).trim();
}

/**
 * Extract JSON from text - O(n) without heavy regex
 * Handles:
 * - Direct JSON
 * - JSON in markdown code fences
 * - JSON between first { and last }
 * - Basic repairs for trailing commas and newlines
 */
export function extractJsonFromText(content: string): Record<string, unknown> {
  const cleaned = (content ?? "").trim();
  
  // Log preview for debugging
  const preview = cleaned.slice(0, 200);
  console.log(`[JSON_Extract] len=${cleaned.length} preview=${preview}`);

  // 1) Direct parse
  const direct = tryParseJson(cleaned);
  if (direct) return direct;

  // 2) Strip backticks
  const stripped = stripOuterBackticks(cleaned);
  const strippedParsed = tryParseJson(stripped);
  if (strippedParsed) return strippedParsed;

  // 3) Extract from fences
  const fenced = extractFromFences(stripped);
  if (fenced) {
    const fencedParsed = tryParseJson(fenced);
    if (fencedParsed) return fencedParsed;
  }

  // 4) First { ... last }
  const braceCandidate = extractBetweenOuterBraces(stripped);
  if (braceCandidate) {
    const braceParsed = tryParseJson(braceCandidate);
    if (braceParsed) return braceParsed;

    // Minimal repairs
    const repaired = minimalJsonRepair(braceCandidate);
    const repairedParsed = tryParseJson(repaired);
    if (repairedParsed) return repairedParsed;
  }

  // Fallback
  console.warn(`[JSON] parse_failed; returning fallback summary`);
  return { 
    summary: stripped.slice(0, 5000), 
    action_items: [], 
    _parse_fallback: true 
  };
}

/**
 * Safe string converter - prevents rendering objects as React children
 */
export function safeStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
