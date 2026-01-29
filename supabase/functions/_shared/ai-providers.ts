/**
 * AI Provider Adapters
 * Phase 1: Shadow Mode - Implements adapters for each provider
 */

import {
  AIProviderAdapter,
  AIProviderName,
  AICompletionRequest,
  AICompletionResponse,
  AIEmbeddingRequest,
  AIEmbeddingResponse,
  AIModelCategory,
  AIProviderError,
  AIRateLimitError,
  AIQuotaExceededError,
} from "./ai-types.ts";

// =============================================================================
// LOVABLE AI ADAPTER (Gateway to Gemini/GPT)
// =============================================================================

export class LovableAIAdapter implements AIProviderAdapter {
  name: AIProviderName = 'lovable_ai';
  private baseUrl = 'https://ai.gateway.lovable.dev/v1';
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = Deno.env.get('LOVABLE_API_KEY');
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getDefaultModel(category: AIModelCategory): string {
    switch (category) {
      case 'reasoning':
        return 'google/gemini-2.5-pro';
      case 'vision':
        return 'google/gemini-2.5-flash';
      case 'embedding':
        return 'text-embedding-3-small'; // Via OpenAI
      default:
        return 'google/gemini-2.5-flash';
    }
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const model = request.model || this.getDefaultModel(request.category || 'chat');

    const body: Record<string, unknown> = {
      model,
      messages: request.messages,
      stream: request.stream || false,
    };

    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.max_tokens !== undefined) body.max_tokens = request.max_tokens;
    if (request.tools) body.tools = request.tools;
    if (request.tool_choice) body.tool_choice = request.tool_choice;
    if (request.response_format) body.response_format = request.response_format;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        throw new AIRateLimitError('lovable_ai');
      }
      if (response.status === 402) {
        throw new AIQuotaExceededError('lovable_ai');
      }
      throw new AIProviderError(
        `Lovable AI error: ${response.status} - ${errorText}`,
        'lovable_ai',
        response.status,
        response.status >= 500
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      id: data.id || crypto.randomUUID(),
      provider: 'lovable_ai',
      model,
      content: choice?.message?.content || '',
      tool_calls: choice?.message?.tool_calls,
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      finish_reason: choice?.finish_reason || 'stop',
      latency_ms: Date.now() - startTime,
    };
  }
}

// =============================================================================
// OPENAI ADAPTER
// =============================================================================

export class OpenAIAdapter implements AIProviderAdapter {
  name: AIProviderName = 'openai';
  private baseUrl = 'https://api.openai.com/v1';
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = Deno.env.get('OPENAI_API_KEY');
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey.startsWith('sk-');
  }

  getDefaultModel(category: AIModelCategory): string {
    switch (category) {
      case 'reasoning':
        return 'gpt-4o';
      case 'vision':
        return 'gpt-4o';
      case 'embedding':
        return 'text-embedding-3-small';
      default:
        return 'gpt-4o-mini';
    }
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const model = request.model || this.getDefaultModel(request.category || 'chat');

    const body: Record<string, unknown> = {
      model,
      messages: request.messages,
      stream: request.stream || false,
    };

    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.max_tokens !== undefined) body.max_tokens = request.max_tokens;
    if (request.tools) body.tools = request.tools;
    if (request.tool_choice) body.tool_choice = request.tool_choice;
    if (request.response_format) body.response_format = request.response_format;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        throw new AIRateLimitError('openai');
      }
      if (response.status === 402 || errorText.includes('insufficient_quota')) {
        throw new AIQuotaExceededError('openai');
      }
      throw new AIProviderError(
        `OpenAI error: ${response.status} - ${errorText}`,
        'openai',
        response.status,
        response.status >= 500
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      id: data.id,
      provider: 'openai',
      model: data.model,
      content: choice?.message?.content || '',
      tool_calls: choice?.message?.tool_calls,
      usage: data.usage,
      finish_reason: choice?.finish_reason || 'stop',
      latency_ms: Date.now() - startTime,
    };
  }

  async embed(request: AIEmbeddingRequest): Promise<AIEmbeddingResponse> {
    const startTime = Date.now();
    const model = request.model || 'text-embedding-3-small';

    const body: Record<string, unknown> = {
      model,
      input: request.input,
    };

    if (request.dimensions) body.dimensions = request.dimensions;

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AIProviderError(
        `OpenAI embedding error: ${response.status} - ${errorText}`,
        'openai',
        response.status
      );
    }

    const data = await response.json();

    return {
      provider: 'openai',
      model: data.model,
      embeddings: data.data.map((d: { embedding: number[] }) => d.embedding),
      usage: data.usage,
      latency_ms: Date.now() - startTime,
    };
  }
}

// =============================================================================
// ANTHROPIC ADAPTER
// =============================================================================

export class AnthropicAdapter implements AIProviderAdapter {
  name: AIProviderName = 'anthropic';
  private baseUrl = 'https://api.anthropic.com/v1';
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getDefaultModel(category: AIModelCategory): string {
    switch (category) {
      case 'reasoning':
        return 'claude-sonnet-4-20250514';
      case 'vision':
        return 'claude-sonnet-4-20250514';
      default:
        return 'claude-sonnet-4-20250514';
    }
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const model = request.model || this.getDefaultModel(request.category || 'chat');

    // Convert OpenAI format to Anthropic format
    const systemMessage = request.messages.find(m => m.role === 'system');
    const otherMessages = request.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const body: Record<string, unknown> = {
      model,
      messages: otherMessages,
      max_tokens: request.max_tokens || 4096,
    };

    if (systemMessage) body.system = systemMessage.content;
    if (request.temperature !== undefined) body.temperature = request.temperature;

    // Convert tools to Anthropic format if present
    if (request.tools) {
      body.tools = request.tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      }));
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        throw new AIRateLimitError('anthropic');
      }
      throw new AIProviderError(
        `Anthropic error: ${response.status} - ${errorText}`,
        'anthropic',
        response.status,
        response.status >= 500
      );
    }

    const data = await response.json();

    // Extract text content
    const textContent = data.content?.find((c: { type: string }) => c.type === 'text');
    const toolUseContent = data.content?.filter((c: { type: string }) => c.type === 'tool_use');

    // Convert tool_use to OpenAI format
    const toolCalls = toolUseContent?.map((t: { id: string; name: string; input: unknown }) => ({
      id: t.id,
      type: 'function' as const,
      function: {
        name: t.name,
        arguments: JSON.stringify(t.input),
      },
    }));

    return {
      id: data.id,
      provider: 'anthropic',
      model: data.model,
      content: textContent?.text || '',
      tool_calls: toolCalls?.length ? toolCalls : undefined,
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      finish_reason: data.stop_reason === 'tool_use' ? 'tool_calls' : 'stop',
      latency_ms: Date.now() - startTime,
    };
  }
}

// =============================================================================
// OPENROUTER ADAPTER
// =============================================================================

export class OpenRouterAdapter implements AIProviderAdapter {
  name: AIProviderName = 'openrouter';
  private baseUrl = 'https://openrouter.ai/api/v1';
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = Deno.env.get('OPENROUTER_API_KEY');
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getDefaultModel(category: AIModelCategory): string {
    switch (category) {
      case 'reasoning':
        return 'anthropic/claude-sonnet-4';
      case 'vision':
        return 'google/gemini-2.5-flash-preview';
      case 'embedding':
        return 'openai/text-embedding-3-small';
      default:
        return 'google/gemini-2.5-flash-preview';
    }
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const model = request.model || this.getDefaultModel(request.category || 'chat');

    const body: Record<string, unknown> = {
      model,
      messages: request.messages,
      stream: request.stream || false,
    };

    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.max_tokens !== undefined) body.max_tokens = request.max_tokens;
    if (request.tools) body.tools = request.tools;
    if (request.tool_choice) body.tool_choice = request.tool_choice;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://iarche.com',
        'X-Title': 'IArche Platform',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        throw new AIRateLimitError('openrouter');
      }
      if (response.status === 402) {
        throw new AIQuotaExceededError('openrouter');
      }
      throw new AIProviderError(
        `OpenRouter error: ${response.status} - ${errorText}`,
        'openrouter',
        response.status,
        response.status >= 500
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      id: data.id,
      provider: 'openrouter',
      model: data.model,
      content: choice?.message?.content || '',
      tool_calls: choice?.message?.tool_calls,
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      finish_reason: choice?.finish_reason || 'stop',
      latency_ms: Date.now() - startTime,
    };
  }
}

// =============================================================================
// PROVIDER REGISTRY
// =============================================================================

export function createProviderAdapter(name: AIProviderName): AIProviderAdapter {
  switch (name) {
    case 'lovable_ai':
      return new LovableAIAdapter();
    case 'openai':
      return new OpenAIAdapter();
    case 'anthropic':
      return new AnthropicAdapter();
    case 'openrouter':
      return new OpenRouterAdapter();
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

export function getAvailableProviders(): AIProviderName[] {
  const providers: AIProviderName[] = ['lovable_ai', 'openai', 'anthropic', 'openrouter'];
  return providers.filter(name => createProviderAdapter(name).isAvailable());
}
