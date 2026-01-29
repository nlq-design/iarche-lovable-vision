/**
 * Centralized AI Client with Provider Switching & Fallback
 * Phase 1: Shadow Mode - Can be imported without affecting existing functions
 * 
 * Usage:
 *   import { createAIClient } from "../_shared/ai-client.ts";
 *   const ai = createAIClient({ workspaceId });
 *   const response = await ai.complete({ messages: [...] });
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  AIProviderName,
  AICompletionRequest,
  AICompletionResponse,
  AIEmbeddingRequest,
  AIEmbeddingResponse,
  AIClientOptions,
  AIProviderConfig,
  AIModelCategory,
  AIProviderError,
  AIRateLimitError,
} from "./ai-types.ts";
import {
  createProviderAdapter,
  getAvailableProviders,
  OpenAIAdapter,
} from "./ai-providers.ts";

// =============================================================================
// AI CLIENT
// =============================================================================

export class AIClient {
  private options: AIClientOptions;
  // deno-lint-ignore no-explicit-any
  private supabase: SupabaseClient<any>;
  private configCache: AIProviderConfig[] | null = null;
  private configCacheTime: number = 0;
  private functionConfigCache: Map<string, { provider: string; model: string | null }> = new Map();
  private functionConfigCacheTime: number = 0;
  private readonly CONFIG_CACHE_TTL = 60000; // 1 minute

  constructor(options: AIClientOptions = {}) {
    this.options = {
      enableLogging: true,
      enableMetrics: true,
      maxRetries: 2,
      timeoutMs: 60000,
      ...options,
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Get provider configuration from database with caching
   */
  private async getProviderConfigs(): Promise<AIProviderConfig[]> {
    const now = Date.now();
    if (this.configCache && (now - this.configCacheTime) < this.CONFIG_CACHE_TTL) {
      return this.configCache;
    }

    try {
      const { data, error } = await this.supabase
        .from('ai_provider_config')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (error) {
        console.warn('[AIClient] Failed to fetch config, using defaults:', error.message);
        return this.getDefaultConfigs();
      }

      this.configCache = data || this.getDefaultConfigs();
      this.configCacheTime = now;
      return this.configCache;
    } catch (e) {
      console.warn('[AIClient] Config fetch error, using defaults:', e);
      return this.getDefaultConfigs();
    }
  }

  /**
   * Get function-specific model configuration
   */
  async getFunctionConfig(functionName: string): Promise<{ provider: AIProviderName; model: string | null } | null> {
    const now = Date.now();
    
    // Check cache
    if (this.functionConfigCache.has(functionName) && (now - this.functionConfigCacheTime) < this.CONFIG_CACHE_TTL) {
      const cached = this.functionConfigCache.get(functionName)!;
      return { provider: cached.provider as AIProviderName, model: cached.model };
    }

    try {
      // Refresh all function configs at once
      const { data, error } = await this.supabase
        .from('edge_function_model_config')
        .select('function_name, provider_name, model_id');

      if (error) {
        console.warn('[AIClient] Failed to fetch function config:', error.message);
        return null;
      }

      // Cache all configs
      this.functionConfigCache.clear();
      this.functionConfigCacheTime = now;
      
      for (const row of (data || [])) {
        this.functionConfigCache.set(row.function_name, {
          provider: row.provider_name,
          model: row.model_id,
        });
      }

      const config = this.functionConfigCache.get(functionName);
      if (config) {
        return { provider: config.provider as AIProviderName, model: config.model };
      }
      return null;
    } catch (e) {
      console.warn('[AIClient] Function config fetch error:', e);
      return null;
    }
  }

  /**
   * Default provider chain when database config unavailable
   */
  private getDefaultConfigs(): AIProviderConfig[] {
    const available = getAvailableProviders();
    return available.map((name, index) => ({
      id: crypto.randomUUID(),
      provider_name: name,
      is_active: true,
      is_default: index === 0,
      priority: index + 1,
      api_key_env_var: this.getEnvVarForProvider(name),
      base_url: this.getBaseUrlForProvider(name),
    }));
  }

  private getEnvVarForProvider(name: AIProviderName): string {
    const map: Record<AIProviderName, string> = {
      lovable_ai: 'LOVABLE_API_KEY',
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
    };
    return map[name];
  }

  private getBaseUrlForProvider(name: AIProviderName): string {
    const map: Record<AIProviderName, string> = {
      lovable_ai: 'https://ai.gateway.lovable.dev/v1',
      openai: 'https://api.openai.com/v1',
      anthropic: 'https://api.anthropic.com/v1',
      openrouter: 'https://openrouter.ai/api/v1',
    };
    return map[name];
  }

  /**
   * Main completion method with automatic fallback
   */
  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const enableFallback = request.fallback !== false;

    // If specific provider requested, use only that
    if (request.provider) {
      const adapter = createProviderAdapter(request.provider);
      if (!adapter.isAvailable()) {
        throw new AIProviderError(
          `Provider ${request.provider} is not available (missing API key)`,
          request.provider
        );
      }
      const response = await adapter.complete(request);
      await this.logMetrics(request, response);
      return response;
    }

    // Get provider chain for fallback
    const configs = await this.getProviderConfigs();
    const errors: string[] = [];

    for (const config of configs) {
      try {
        const adapter = createProviderAdapter(config.provider_name);
        if (!adapter.isAvailable()) {
          if (this.options.enableLogging) {
            console.log(`[AIClient] Skipping ${config.provider_name} - not available`);
          }
          continue;
        }

        if (this.options.enableLogging) {
          console.log(`[AIClient] Trying ${config.provider_name}...`);
        }

        const response = await adapter.complete(request);
        
        // Mark if fallback was used
        if (errors.length > 0) {
          response.fallback_used = true;
          response.original_error = errors.join('; ');
        }

        await this.logMetrics(request, response);
        return response;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${config.provider_name}: ${errorMsg}`);

        if (this.options.enableLogging) {
          console.warn(`[AIClient] ${config.provider_name} failed:`, errorMsg);
        }

        // Don't retry on quota errors
        if (error instanceof AIRateLimitError && !enableFallback) {
          throw error;
        }

        // Continue to next provider if fallback enabled
        if (!enableFallback) {
          throw error;
        }
      }
    }

    // All providers failed
    throw new AIProviderError(
      `All providers failed: ${errors.join('; ')}`,
      configs[0]?.provider_name || 'lovable_ai',
      500,
      true
    );
  }

  /**
   * Embedding method - currently uses OpenAI as primary
   */
  async embed(request: AIEmbeddingRequest): Promise<AIEmbeddingResponse> {
    // For embeddings, prefer OpenAI due to quality
    const preferredOrder: AIProviderName[] = ['openai', 'openrouter'];
    
    for (const providerName of preferredOrder) {
      const adapter = createProviderAdapter(providerName);
      if (adapter.isAvailable() && adapter.embed) {
        try {
          return await adapter.embed(request);
        } catch (error) {
          if (this.options.enableLogging) {
            console.warn(`[AIClient] ${providerName} embedding failed:`, error);
          }
        }
      }
    }

    throw new AIProviderError(
      'No embedding provider available',
      'openai',
      503
    );
  }

  /**
   * Log usage metrics to database
   */
  private async logMetrics(
    request: AICompletionRequest,
    response: AICompletionResponse
  ): Promise<void> {
    if (!this.options.enableMetrics) return;

    try {
      await this.supabase.from('ai_usage_metrics').insert({
        workspace_id: this.options.workspaceId,
        user_id: this.options.userId,
        operation_type: 'completion',
        model_provider: response.provider,
        model_id: response.model,
        input_tokens: response.usage.prompt_tokens,
        output_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
        latency_ms: response.latency_ms,
        success: true,
        metadata: {
          fallback_used: response.fallback_used,
          category: request.category,
          has_tools: !!request.tools,
        },
      });
    } catch (e) {
      // Non-blocking error
      console.warn('[AIClient] Failed to log metrics:', e);
    }
  }

  /**
   * Get current provider status
   */
  async getProviderStatus(): Promise<Array<{
    name: AIProviderName;
    available: boolean;
    priority: number;
  }>> {
    const configs = await this.getProviderConfigs();
    return configs.map(config => ({
      name: config.provider_name,
      available: createProviderAdapter(config.provider_name).isAvailable(),
      priority: config.priority,
    }));
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createAIClient(options?: AIClientOptions): AIClient {
  return new AIClient(options);
}

// =============================================================================
// HELPER FUNCTIONS (Drop-in replacements for existing code)
// =============================================================================

/**
 * Simple completion call - drop-in replacement for direct API calls
 */
export async function callLLM(
  messages: Array<{ role: string; content: string }>,
  options: {
    model?: string;
    provider?: AIProviderName;
    temperature?: number;
    maxTokens?: number;
    workspaceId?: string;
  } = {}
): Promise<string> {
  const client = createAIClient({ workspaceId: options.workspaceId });
  
  const response = await client.complete({
    messages: messages as AICompletionRequest['messages'],
    model: options.model,
    provider: options.provider,
    temperature: options.temperature,
    max_tokens: options.maxTokens,
  });

  return response.content;
}

/**
 * Generate embeddings - drop-in replacement
 */
export async function generateEmbedding(
  text: string,
  options: {
    model?: string;
    provider?: AIProviderName;
  } = {}
): Promise<number[]> {
  const client = createAIClient();
  
  const response = await client.embed({
    input: text,
    model: options.model,
    provider: options.provider,
  });

  return response.embeddings[0];
}

/**
 * Structured output extraction with tool calling
 */
export async function extractStructured<T>(
  messages: Array<{ role: string; content: string }>,
  schema: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  },
  options: {
    provider?: AIProviderName;
    workspaceId?: string;
  } = {}
): Promise<T | null> {
  const client = createAIClient({ workspaceId: options.workspaceId });
  
  const response = await client.complete({
    messages: messages as AICompletionRequest['messages'],
    provider: options.provider,
    tools: [{
      type: 'function',
      function: schema,
    }],
    tool_choice: { type: 'function', function: { name: schema.name } },
  });

  if (response.tool_calls?.[0]) {
    try {
      return JSON.parse(response.tool_calls[0].function.arguments) as T;
    } catch {
      return null;
    }
  }

  return null;
}
