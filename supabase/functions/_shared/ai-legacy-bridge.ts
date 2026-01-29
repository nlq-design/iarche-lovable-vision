/**
 * AI Legacy Bridge - Drop-in replacement for inline callLLM functions
 * 
 * This module provides backward-compatible wrappers that use the centralized
 * AI client internally, enabling seamless migration of legacy functions.
 * 
 * Usage in legacy functions:
 *   import { callLLMWithFallback } from "../_shared/ai-legacy-bridge.ts";
 *   const result = await callLLMWithFallback(systemPrompt, userPrompt, outputSchema);
 */

import { createAIClient } from "./ai-client.ts";
import { AICompletionRequest, AIMessage, AITool } from "./ai-types.ts";

// Re-export types for legacy compatibility
export type LLMProvider = "lovable" | "openai" | "anthropic" | "openrouter";

const LLM_TIMEOUT_MS = 55_000;

// =============================================================================
// JSON EXTRACTION UTILITIES (from legacy code)
// =============================================================================

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

function extractJsonFromText(text: string): Record<string, unknown> {
  // Try direct parse
  const direct = tryParseJson(text);
  if (direct) return direct;

  // Strip backticks
  const stripped = stripOuterBackticks(text);
  const strippedParsed = tryParseJson(stripped);
  if (strippedParsed) return strippedParsed;

  // Extract from fences
  const fenced = extractFromFences(text);
  if (fenced) {
    const fencedParsed = tryParseJson(fenced);
    if (fencedParsed) return fencedParsed;
  }

  // Extract between braces
  const braced = extractBetweenOuterBraces(text);
  if (braced) {
    const bracedParsed = tryParseJson(braced);
    if (bracedParsed) return bracedParsed;
  }

  // Fallback
  return { _raw: text, _parse_fallback: true };
}

// =============================================================================
// LEGACY BRIDGE FUNCTIONS
// =============================================================================

/**
 * Drop-in replacement for legacy callLLM functions.
 * Uses centralized AI client with automatic provider fallback.
 * Now supports function-specific model configuration from database.
 * 
 * @param systemPrompt - System message for the LLM
 * @param userPrompt - User message/content
 * @param outputSchema - Optional JSON schema for structured output (via tool calling)
 * @param options - Additional options (model, provider, timeout, functionName)
 */
export async function callLLMWithFallback(
  systemPrompt: string,
  userPrompt: string,
  outputSchema?: Record<string, unknown> | null,
  options: {
    model?: string;
    category?: 'chat' | 'reasoning' | 'vision' | 'embedding';
    workspaceId?: string;
    timeoutMs?: number;
    maxTokens?: number;
    functionName?: string; // Edge function name to look up config
  } = {}
): Promise<Record<string, unknown>> {
  const client = createAIClient({
    workspaceId: options.workspaceId,
    enableLogging: true,
    enableMetrics: true,
  });

  // Get function-specific config if functionName provided
  let model = options.model;
  let provider: 'lovable_ai' | 'openai' | 'anthropic' | 'openrouter' | undefined;
  
  if (options.functionName && !options.model) {
    const fnConfig = await client.getFunctionConfig(options.functionName);
    if (fnConfig) {
      provider = fnConfig.provider;
      model = fnConfig.model || undefined;
      console.log(`[AILegacyBridge] Using config for ${options.functionName}: provider=${provider}, model=${model || 'default'}`);
    }
  }

  const jsonStrictSuffix = `

CRITICAL OUTPUT RULES:
- Output ONLY valid JSON, nothing else.
- No markdown, no code fences, no extra text.
- If you cannot comply, output: {"error":"invalid_output"}.
- Respect exact keys and structure requested.`;

  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt + jsonStrictSuffix },
    { role: "user", content: userPrompt },
  ];

  const request: AICompletionRequest = {
    messages,
    model,
    provider,
    category: options.category || 'reasoning',
    max_tokens: options.maxTokens || 4096,
    fallback: true, // Enable provider fallback
  };

  // Use tool calling for structured output if schema provided
  if (outputSchema) {
    request.tools = [{
      type: 'function',
      function: {
        name: 'submit_structured_output',
        description: 'Submit the structured output',
        parameters: outputSchema,
      },
    }];
    request.tool_choice = { type: 'function', function: { name: 'submit_structured_output' } };
  } else {
    request.response_format = { type: 'json_object' };
  }

  // Execute with timeout
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort("timeout"),
    options.timeoutMs || LLM_TIMEOUT_MS
  );

  try {
    const response = await client.complete(request);

    // Parse tool call response
    if (response.tool_calls?.[0]?.function?.arguments) {
      try {
        return JSON.parse(response.tool_calls[0].function.arguments);
      } catch {
        return extractJsonFromText(response.tool_calls[0].function.arguments);
      }
    }

    // Parse content response
    if (response.content) {
      return extractJsonFromText(response.content);
    }

    return { error: "empty_response" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("timeout") || msg.includes("abort")) {
      throw new Error(`LLM_TIMEOUT: Analysis took too long (>${(options.timeoutMs || LLM_TIMEOUT_MS) / 1000}s).`);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Simple text completion without structured output.
 * Uses centralized AI client with automatic provider fallback.
 * Supports function-specific model configuration from database.
 */
export async function completeLLM(
  systemPrompt: string,
  userPrompt: string,
  options: {
    model?: string;
    category?: 'chat' | 'reasoning' | 'vision' | 'embedding';
    workspaceId?: string;
    maxTokens?: number;
    temperature?: number;
    functionName?: string; // Edge function name to look up config
  } = {}
): Promise<string> {
  const client = createAIClient({
    workspaceId: options.workspaceId,
    enableLogging: true,
    enableMetrics: true,
  });

  // Get function-specific config if functionName provided
  let model = options.model;
  let provider: 'lovable_ai' | 'openai' | 'anthropic' | 'openrouter' | undefined;
  
  if (options.functionName && !options.model) {
    const fnConfig = await client.getFunctionConfig(options.functionName);
    if (fnConfig) {
      provider = fnConfig.provider;
      model = fnConfig.model || undefined;
      console.log(`[AILegacyBridge] Using config for ${options.functionName}: provider=${provider}, model=${model || 'default'}`);
    }
  }

  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const response = await client.complete({
    messages,
    model,
    provider,
    category: options.category || 'chat',
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature,
    fallback: true,
  });

  return response.content;
}

/**
 * Chat completion with tool calling support (for agent-style functions).
 * Uses centralized AI client with automatic provider fallback.
 * Supports function-specific model configuration from database.
 */
export async function chatWithTools(
  messages: AIMessage[],
  tools: AITool[],
  options: {
    model?: string;
    workspaceId?: string;
    maxTokens?: number;
    functionName?: string; // Edge function name to look up config
  } = {}
): Promise<{
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  finish_reason: string;
}> {
  const client = createAIClient({
    workspaceId: options.workspaceId,
    enableLogging: true,
    enableMetrics: true,
  });

  // Get function-specific config if functionName provided
  let model = options.model;
  let provider: 'lovable_ai' | 'openai' | 'anthropic' | 'openrouter' | undefined;
  
  if (options.functionName && !options.model) {
    const fnConfig = await client.getFunctionConfig(options.functionName);
    if (fnConfig) {
      provider = fnConfig.provider;
      model = fnConfig.model || undefined;
      console.log(`[AILegacyBridge] Using config for ${options.functionName}: provider=${provider}, model=${model || 'default'}`);
    }
  }

  const response = await client.complete({
    messages,
    tools,
    model,
    provider,
    category: 'reasoning',
    max_tokens: options.maxTokens || 4096,
    fallback: true,
  });

  return {
    content: response.content,
    tool_calls: response.tool_calls,
    finish_reason: response.finish_reason,
  };
}
