/**
 * Centralized AI Client with Provider Switching & Fallback
 * Phase 2: Production Mode - Full resilience with Circuit Breaker, Rate Limiting, and Retry
 * 
 * Features:
 *   - Automatic provider fallback chain
 *   - Circuit breaker to isolate failing providers
 *   - Rate limiting (configurable per provider via DB)
 *   - Exponential backoff with jitter
 *   - Usage metrics logging
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
  AIWorkspaceQuotaExceededError,
} from "./ai-types.ts";
import { getQuotaManager, QuotaManager, QuotaCheckResult } from "./ai-quota.ts";
import {
  createProviderAdapter,
  getAvailableProviders,
  OpenAIAdapter,
} from "./ai-providers.ts";
import {
  getResilienceManager,
  ResilienceManager,
  CircuitState,
} from "./ai-resilience.ts";

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
  private resilience: ResilienceManager;
  private quotaManager: QuotaManager;

  constructor(options: AIClientOptions = {}) {
    this.options = {
      enableLogging: true,
      enableMetrics: true,
      enableResilience: true,
      enableQuotaCheck: true, // NEW: Quota enforcement enabled by default
      maxRetries: 3,
      timeoutMs: 60000,
      ...options,
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Initialize resilience manager with configured retry count
    this.resilience = getResilienceManager({
      retry: { maxRetries: this.options.maxRetries },
    });
    
    // Initialize quota manager
    this.quotaManager = getQuotaManager(this.supabase);
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
   * Main completion method with automatic fallback, resilience, and quota enforcement
   */
  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const enableFallback = request.fallback !== false;
    const useResilience = this.options.enableResilience !== false;
    const enableQuotaCheck = this.options.enableQuotaCheck !== false;

    // Pre-request quota check (if workspace is specified)
    let quotaResult: QuotaCheckResult | null = null;
    if (enableQuotaCheck && this.options.workspaceId) {
      quotaResult = await this.quotaManager.checkQuota(this.options.workspaceId);
      
      // Log alerts for monitoring
      for (const alert of quotaResult.alerts) {
        console.log(`[AIClient] Quota ${alert.type}: ${alert.message}`);
      }
      
      // Block request if quota exceeded and hard limit is enabled
      if (!quotaResult.allowed) {
        throw new AIWorkspaceQuotaExceededError(
          quotaResult.reason || 'Quota exceeded',
          quotaResult.percentage_used,
          this.options.workspaceId
        );
      }
    }

    // If specific provider requested, use only that
    if (request.provider) {
      const adapter = createProviderAdapter(request.provider);
      if (!adapter.isAvailable()) {
        throw new AIProviderError(
          `Provider ${request.provider} is not available (missing API key)`,
          request.provider
        );
      }
      
      // Execute with resilience if enabled
      if (useResilience) {
        const config = (await this.getProviderConfigs()).find(c => c.provider_name === request.provider);
        const response = await this.resilience.execute(
          request.provider,
          () => adapter.complete(request),
          {
            rpm: config?.rate_limit_rpm,
            onRetry: (attempt, error, delayMs) => {
              if (this.options.enableLogging) {
                console.log(`[AIClient] ${request.provider}: Retry ${attempt} in ${delayMs}ms - ${error.message}`);
              }
            },
          }
        );
        await this.logMetrics(request, response);
        return response;
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
            console.log(`[AIClient] Skipping ${config.provider_name} - not available (missing API key)`);
          }
          continue;
        }

        // Check resilience availability (circuit breaker + rate limit)
        if (useResilience) {
          const availability = this.resilience.isProviderAvailable(config.provider_name, config.rate_limit_rpm);
          if (!availability.available) {
            if (this.options.enableLogging) {
              console.log(`[AIClient] Skipping ${config.provider_name} - ${availability.reason}`);
            }
            errors.push(`${config.provider_name}: ${availability.reason}`);
            continue;
          }
        }

        if (this.options.enableLogging) {
          console.log(`[AIClient] Trying ${config.provider_name}...`);
        }

        // Execute with or without resilience
        let response: AICompletionResponse;
        if (useResilience) {
          response = await this.resilience.execute(
            config.provider_name,
            () => adapter.complete(request),
            {
              rpm: config.rate_limit_rpm,
              onRetry: (attempt, error, delayMs) => {
                if (this.options.enableLogging) {
                  console.log(`[AIClient] ${config.provider_name}: Retry ${attempt} in ${delayMs}ms - ${error.message}`);
                }
              },
            }
          );
        } else {
          response = await adapter.complete(request);
        }
        
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
   * Embedding method with resilience support
   */
  async embed(request: AIEmbeddingRequest): Promise<AIEmbeddingResponse> {
    const useResilience = this.options.enableResilience !== false;
    // For embeddings, prefer OpenAI due to quality
    const preferredOrder: AIProviderName[] = ['openai', 'openrouter'];
    const errors: string[] = [];
    
    for (const providerName of preferredOrder) {
      const adapter = createProviderAdapter(providerName);
      if (!adapter.isAvailable() || !adapter.embed) {
        continue;
      }

      // Check resilience availability
      if (useResilience) {
        const availability = this.resilience.isProviderAvailable(providerName);
        if (!availability.available) {
          if (this.options.enableLogging) {
            console.log(`[AIClient] Skipping ${providerName} for embedding - ${availability.reason}`);
          }
          errors.push(`${providerName}: ${availability.reason}`);
          continue;
        }
      }

      try {
        if (useResilience) {
          return await this.resilience.execute(
            providerName,
            () => adapter.embed!(request),
            {
              onRetry: (attempt, error, delayMs) => {
                if (this.options.enableLogging) {
                  console.log(`[AIClient] ${providerName}: Embedding retry ${attempt} in ${delayMs}ms`);
                }
              },
            }
          );
        }
        return await adapter.embed(request);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${providerName}: ${errorMsg}`);
        if (this.options.enableLogging) {
          console.warn(`[AIClient] ${providerName} embedding failed:`, error);
        }
      }
    }

    throw new AIProviderError(
      errors.length > 0 
        ? `All embedding providers failed: ${errors.join('; ')}`
        : 'No embedding provider available',
      'openai',
      503
    );
  }

  /**
   * Log usage metrics to database and update workspace quota usage
   * Now uses the unified API tracker for consistent metrics across all APIs
   */
  private async logMetrics(
    request: AICompletionRequest,
    response: AICompletionResponse
  ): Promise<void> {
    if (!this.options.enableMetrics) return;

    try {
      const estimatedCostCents = this.estimateCostCents(response);
      
      // Log to BOTH ai_usage_metrics (legacy) AND api_usage_metrics (unified)
      await Promise.all([
        // Legacy AI metrics table (for backward compatibility)
        this.supabase.from('ai_usage_metrics').insert({
          workspace_id: this.options.workspaceId,
          user_id: this.options.userId,
          operation_type: 'completion',
          model_provider: response.provider,
          model_id: response.model,
          input_tokens: response.usage.prompt_tokens,
          output_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
          latency_ms: response.latency_ms,
          estimated_cost_cents: estimatedCostCents,
          success: true,
          metadata: {
            fallback_used: response.fallback_used,
            category: request.category,
            has_tools: !!request.tools,
          },
        }),
        
        // NEW: Unified API metrics table for cross-API governance
        this.supabase.from('api_usage_metrics').insert({
          workspace_id: this.options.workspaceId,
          user_id: this.options.userId,
          api_name: response.provider,
          api_category: 'ai',
          operation_type: 'completion',
          provider_name: response.provider,
          model_id: response.model,
          input_tokens: response.usage.prompt_tokens,
          output_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
          request_count: 1,
          latency_ms: response.latency_ms,
          success: true,
          estimated_cost_cents: estimatedCostCents,
          metadata: {
            fallback_used: response.fallback_used,
            category: request.category,
            has_tools: !!request.tools,
            function_name: request.category,
          },
        }),
      ]);
      
      // Update workspace quota usage
      if (this.options.workspaceId && this.options.enableQuotaCheck !== false) {
        await this.quotaManager.recordUsage(
          this.options.workspaceId,
          response.usage.total_tokens,
          estimatedCostCents,
          {
            provider: response.provider,
            model: response.model,
            operation_type: 'completion',
          }
        );
      }
    } catch (e) {
      // Non-blocking error
      console.warn('[AIClient] Failed to log metrics:', e);
    }
  }

  /**
   * Estimate cost in cents based on model and token usage
   * Uses approximate pricing (can be refined with DB lookup later)
   */
  private estimateCostCents(response: AICompletionResponse): number {
    // Approximate pricing per 1K tokens (input/output averaged)
    const pricingPerMille: Record<string, number> = {
      'gpt-4o': 0.5,      // ~$5/1M tokens avg
      'gpt-4o-mini': 0.03, // ~$0.3/1M tokens avg
      'gpt-4': 3.0,        // ~$30/1M tokens avg
      'gpt-3.5-turbo': 0.1,
      'claude-3-opus': 1.5,
      'claude-3-sonnet': 0.3,
      'claude-3-haiku': 0.025,
      'gemini-pro': 0.05,
      'gemini-flash': 0.01,
    };
    
    // Find matching model or use default
    const modelKey = Object.keys(pricingPerMille).find(k => 
      response.model.toLowerCase().includes(k.toLowerCase())
    );
    const pricePerMille = modelKey ? pricingPerMille[modelKey] : 0.1; // Default conservative estimate
    
    return Math.ceil((response.usage.total_tokens / 1000) * pricePerMille * 100); // Convert to cents
  }

  /**
   * Get current provider status including resilience state
   */
  async getProviderStatus(): Promise<Array<{
    name: AIProviderName;
    available: boolean;
    priority: number;
    circuitState?: CircuitState;
    rateLimited?: boolean;
  }>> {
    const configs = await this.getProviderConfigs();
    const resilienceHealth = this.resilience.getHealthStatus();
    
    return configs.map(config => {
      const health = resilienceHealth[config.provider_name];
      return {
        name: config.provider_name,
        available: createProviderAdapter(config.provider_name).isAvailable() && health.available,
        priority: config.priority,
        circuitState: health.circuitState,
        rateLimited: health.rateLimitTokens !== null && health.rateLimitTokens <= 0,
      };
    });
  }

  /**
   * Get detailed resilience health status
   */
  getResilienceHealth(): Record<AIProviderName, {
    circuitState: CircuitState;
    rateLimitTokens: number | null;
    available: boolean;
  }> {
    return this.resilience.getHealthStatus();
  }

  /**
   * Manually reset a provider's circuit breaker (for admin use)
   */
  resetProviderCircuit(provider: AIProviderName): void {
    this.resilience.circuitBreaker.reset(provider);
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
 * 
 * IMPORTANT: Pass `functionName` to automatically use the model/provider
 * configured in the `edge_function_model_config` table.
 * If no config exists, falls back to the global provider chain.
 */
export async function callLLM(
  messages: Array<{ role: string; content: string }>,
  options: {
    functionName?: string; // <-- NEW: Auto-lookup config from DB
    model?: string;
    provider?: AIProviderName;
    temperature?: number;
    maxTokens?: number;
    workspaceId?: string;
  } = {}
): Promise<string> {
  const client = createAIClient({ workspaceId: options.workspaceId });
  
  // Auto-fetch function-specific config if functionName provided
  let resolvedProvider = options.provider;
  let resolvedModel = options.model;
  
  if (options.functionName) {
    const functionConfig = await client.getFunctionConfig(options.functionName);
    if (functionConfig) {
      console.log(`[callLLM] Using DB config for ${options.functionName}: ${functionConfig.provider}/${functionConfig.model || 'default'}`);
      resolvedProvider = functionConfig.provider;
      resolvedModel = functionConfig.model || resolvedModel;
    } else {
      console.log(`[callLLM] No DB config for ${options.functionName}, using fallback chain`);
    }
  }
  
  const response = await client.complete({
    messages: messages as AICompletionRequest['messages'],
    model: resolvedModel,
    provider: resolvedProvider,
    temperature: options.temperature,
    max_tokens: options.maxTokens,
  });

  return response.content;
}

/**
 * Generate embeddings - drop-in replacement
 * 
 * IMPORTANT: Pass `functionName` to automatically use the model/provider
 * configured in the `edge_function_model_config` table.
 */
export async function generateEmbedding(
  text: string,
  options: {
    functionName?: string; // <-- NEW: Auto-lookup config from DB
    model?: string;
    provider?: AIProviderName;
  } = {}
): Promise<number[]> {
  const client = createAIClient();
  
  // Auto-fetch function-specific config if functionName provided
  let resolvedProvider = options.provider;
  let resolvedModel = options.model;
  
  if (options.functionName) {
    const functionConfig = await client.getFunctionConfig(options.functionName);
    if (functionConfig) {
      console.log(`[generateEmbedding] Using DB config for ${options.functionName}: ${functionConfig.provider}/${functionConfig.model || 'default'}`);
      resolvedProvider = functionConfig.provider;
      resolvedModel = functionConfig.model || resolvedModel;
    }
  }
  
  const response = await client.embed({
    input: text,
    model: resolvedModel,
    provider: resolvedProvider,
  });

  return response.embeddings[0];
}

/**
 * Structured output extraction with tool calling
 * 
 * IMPORTANT: Pass `functionName` to automatically use the model/provider
 * configured in the `edge_function_model_config` table.
 */
export async function extractStructured<T>(
  messages: Array<{ role: string; content: string }>,
  schema: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  },
  options: {
    functionName?: string; // <-- NEW: Auto-lookup config from DB
    provider?: AIProviderName;
    workspaceId?: string;
  } = {}
): Promise<T | null> {
  const client = createAIClient({ workspaceId: options.workspaceId });
  
  // Auto-fetch function-specific config if functionName provided
  let resolvedProvider = options.provider;
  
  if (options.functionName) {
    const functionConfig = await client.getFunctionConfig(options.functionName);
    if (functionConfig) {
      console.log(`[extractStructured] Using DB config for ${options.functionName}: ${functionConfig.provider}`);
      resolvedProvider = functionConfig.provider;
    }
  }
  
  const response = await client.complete({
    messages: messages as AICompletionRequest['messages'],
    provider: resolvedProvider,
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
