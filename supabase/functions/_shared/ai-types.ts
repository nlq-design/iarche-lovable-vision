/**
 * AI Provider System - Type Definitions
 * Phase 1: Shadow Mode - No existing functions modified
 */

export type AIProviderName = 'lovable_ai' | 'openai' | 'anthropic' | 'openrouter';

export type AIModelCategory = 'chat' | 'embedding' | 'vision' | 'reasoning';

export interface AIProviderConfig {
  id: string;
  provider_name: AIProviderName;
  is_active: boolean;
  is_default: boolean;
  priority: number; // Lower = higher priority for fallback
  api_key_env_var: string;
  base_url: string;
  rate_limit_rpm?: number;
  workspace_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AIModelConfig {
  id: string;
  provider_name: AIProviderName;
  model_id: string; // e.g., 'gpt-4o', 'claude-3-5-sonnet'
  display_name: string;
  category: AIModelCategory;
  context_window: number;
  max_output_tokens?: number;
  cost_per_1k_input?: number;
  cost_per_1k_output?: number;
  is_active: boolean;
  is_default_for_category: boolean;
  capabilities?: string[]; // ['vision', 'function_calling', 'streaming']
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: AIToolCall[];
}

export interface AIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface AITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AICompletionRequest {
  messages: AIMessage[];
  model?: string; // If not provided, uses default for provider
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: AITool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  response_format?: { type: 'json_object' | 'text' };
  // Provider routing
  provider?: AIProviderName; // Force specific provider
  fallback?: boolean; // Enable fallback chain (default: true)
  category?: AIModelCategory; // For model selection
}

export interface AICompletionResponse {
  id: string;
  provider: AIProviderName;
  model: string;
  content: string;
  tool_calls?: AIToolCall[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  latency_ms: number;
  fallback_used?: boolean;
  original_error?: string;
}

export interface AIEmbeddingRequest {
  input: string | string[];
  model?: string;
  provider?: AIProviderName;
  dimensions?: number;
}

export interface AIEmbeddingResponse {
  provider: AIProviderName;
  model: string;
  embeddings: number[][];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
}

export interface AIClientOptions {
  workspaceId?: string;
  userId?: string;
  sessionId?: string;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface AIProviderAdapter {
  name: AIProviderName;
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  embed?(request: AIEmbeddingRequest): Promise<AIEmbeddingResponse>;
  isAvailable(): boolean;
  getDefaultModel(category: AIModelCategory): string;
}

// Error types for better handling
export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: AIProviderName,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class AIRateLimitError extends AIProviderError {
  constructor(provider: AIProviderName, retryAfterMs?: number) {
    super(`Rate limit exceeded for ${provider}`, provider, 429, true);
    this.name = 'AIRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
  retryAfterMs?: number;
}

export class AIQuotaExceededError extends AIProviderError {
  constructor(provider: AIProviderName) {
    super(`Quota/credits exceeded for ${provider}`, provider, 402, false);
    this.name = 'AIQuotaExceededError';
  }
}
