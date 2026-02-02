/**
 * AI Resilience Module
 * Implements Circuit Breaker, Rate Limiting, and Retry with Exponential Backoff
 * 
 * This module provides enterprise-grade resilience patterns for AI provider calls:
 * - Circuit Breaker: Temporarily disables failing providers
 * - Rate Limiter: Enforces RPM limits per provider
 * - Retry Manager: Implements exponential backoff with jitter
 */

import { AIProviderName, AIProviderError, AIRateLimitError } from "./ai-types.ts";

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Failures before opening circuit
  resetTimeoutMs: number;        // Time before trying again (half-open)
  halfOpenMaxAttempts: number;   // Attempts allowed in half-open state
}

export type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number | null;
  lastSuccess: number | null;
  openedAt: number | null;
  halfOpenAttempts: number;
}

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 5 * 60 * 1000, // 5 minutes
  halfOpenMaxAttempts: 2,
};

// In-memory circuit state (shared across requests in same isolate)
const circuitStates = new Map<AIProviderName, CircuitStats>();

function getCircuitStats(provider: AIProviderName): CircuitStats {
  if (!circuitStates.has(provider)) {
    circuitStates.set(provider, {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailure: null,
      lastSuccess: null,
      openedAt: null,
      halfOpenAttempts: 0,
    });
  }
  return circuitStates.get(provider)!;
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
  }

  /**
   * Check if a provider is available (circuit not open)
   */
  isAvailable(provider: AIProviderName): boolean {
    const stats = getCircuitStats(provider);
    
    if (stats.state === 'closed') {
      return true;
    }

    if (stats.state === 'open') {
      // Check if reset timeout has elapsed
      if (stats.openedAt && Date.now() - stats.openedAt >= this.config.resetTimeoutMs) {
        this.transitionToHalfOpen(provider);
        return true;
      }
      return false;
    }

    // Half-open: allow limited attempts
    return stats.halfOpenAttempts < this.config.halfOpenMaxAttempts;
  }

  /**
   * Record a successful call
   */
  recordSuccess(provider: AIProviderName): void {
    const stats = getCircuitStats(provider);
    stats.successes++;
    stats.lastSuccess = Date.now();

    if (stats.state === 'half-open') {
      // Recovery confirmed, close circuit
      stats.state = 'closed';
      stats.failures = 0;
      stats.halfOpenAttempts = 0;
      stats.openedAt = null;
      console.log(`[CircuitBreaker] ${provider}: Recovered, circuit CLOSED`);
    }
  }

  /**
   * Record a failed call
   */
  recordFailure(provider: AIProviderName, error: Error): void {
    const stats = getCircuitStats(provider);
    stats.failures++;
    stats.lastFailure = Date.now();

    if (stats.state === 'half-open') {
      stats.halfOpenAttempts++;
      // Immediate re-open on failure in half-open state
      stats.state = 'open';
      stats.openedAt = Date.now();
      console.warn(`[CircuitBreaker] ${provider}: Failed in half-open, circuit RE-OPENED`);
      return;
    }

    if (stats.state === 'closed' && stats.failures >= this.config.failureThreshold) {
      stats.state = 'open';
      stats.openedAt = Date.now();
      console.warn(`[CircuitBreaker] ${provider}: Threshold reached (${stats.failures}), circuit OPENED for ${this.config.resetTimeoutMs / 1000}s`);
    }
  }

  /**
   * Transition to half-open state
   */
  private transitionToHalfOpen(provider: AIProviderName): void {
    const stats = getCircuitStats(provider);
    stats.state = 'half-open';
    stats.halfOpenAttempts = 0;
    console.log(`[CircuitBreaker] ${provider}: Reset timeout elapsed, circuit HALF-OPEN`);
  }

  /**
   * Get current circuit state for monitoring
   */
  getState(provider: AIProviderName): CircuitStats {
    return { ...getCircuitStats(provider) };
  }

  /**
   * Get all circuit states for health check
   */
  getAllStates(): Record<AIProviderName, CircuitStats> {
    const providers: AIProviderName[] = ['lovable_ai', 'openai', 'anthropic', 'openrouter'];
    const result: Record<string, CircuitStats> = {};
    for (const p of providers) {
      result[p] = this.getState(p);
    }
    return result as Record<AIProviderName, CircuitStats>;
  }

  /**
   * Manually reset a circuit (for admin use)
   */
  reset(provider: AIProviderName): void {
    circuitStates.set(provider, {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailure: null,
      lastSuccess: null,
      openedAt: null,
      halfOpenAttempts: 0,
    });
    console.log(`[CircuitBreaker] ${provider}: Manually reset to CLOSED`);
  }
}

// =============================================================================
// RATE LIMITER (Token Bucket Algorithm)
// =============================================================================

export interface RateLimitConfig {
  requestsPerMinute: number;
  burstSize?: number; // Max concurrent requests
}

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
  rpm: number;
}

// In-memory rate limit buckets
const rateLimitBuckets = new Map<AIProviderName, RateLimitBucket>();

// Default RPM limits (conservative estimates)
const DEFAULT_RPM_LIMITS: Record<AIProviderName, number> = {
  lovable_ai: 60,    // Lovable gateway limit
  openai: 500,       // OpenAI tier 1
  anthropic: 60,     // Anthropic tier 1
  openrouter: 200,   // OpenRouter standard
};

export class RateLimiter {
  /**
   * Check if a request can proceed (without consuming)
   */
  canProceed(provider: AIProviderName, rpm?: number): boolean {
    this.refillIfNeeded(provider, rpm);
    const bucket = this.getBucket(provider, rpm);
    return bucket.tokens > 0;
  }

  /**
   * Consume a token and proceed with request
   * @returns true if allowed, false if rate limited
   */
  consume(provider: AIProviderName, rpm?: number): boolean {
    this.refillIfNeeded(provider, rpm);
    const bucket = this.getBucket(provider, rpm);
    
    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }
    
    return false;
  }

  /**
   * Get estimated wait time until next available slot (ms)
   */
  getWaitTimeMs(provider: AIProviderName): number {
    const bucket = rateLimitBuckets.get(provider);
    if (!bucket || bucket.tokens > 0) return 0;
    
    const msPerToken = 60000 / bucket.rpm;
    const msSinceRefill = Date.now() - bucket.lastRefill;
    const tokensGenerated = Math.floor(msSinceRefill / msPerToken);
    
    if (tokensGenerated >= 1) return 0;
    return msPerToken - msSinceRefill;
  }

  /**
   * Update RPM limit for a provider (from DB config)
   */
  updateLimit(provider: AIProviderName, rpm: number): void {
    const bucket = this.getBucket(provider, rpm);
    bucket.rpm = rpm;
    console.log(`[RateLimiter] ${provider}: Updated RPM limit to ${rpm}`);
  }

  /**
   * Get current state for monitoring
   */
  getState(provider: AIProviderName): RateLimitBucket | null {
    return rateLimitBuckets.get(provider) || null;
  }

  private getBucket(provider: AIProviderName, rpm?: number): RateLimitBucket {
    if (!rateLimitBuckets.has(provider)) {
      const defaultRpm = rpm || DEFAULT_RPM_LIMITS[provider] || 60;
      rateLimitBuckets.set(provider, {
        tokens: defaultRpm,
        lastRefill: Date.now(),
        rpm: defaultRpm,
      });
    }
    return rateLimitBuckets.get(provider)!;
  }

  private refillIfNeeded(provider: AIProviderName, rpm?: number): void {
    const bucket = this.getBucket(provider, rpm);
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    
    // Refill tokens based on time elapsed
    const tokensToAdd = Math.floor(elapsed / (60000 / bucket.rpm));
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(bucket.rpm, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
  }
}

// =============================================================================
// RETRY MANAGER (Exponential Backoff with Jitter)
// =============================================================================

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number; // 0-1, adds randomness to prevent thundering herd
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFactor: 0.3,
};

export class RetryManager {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    options: {
      provider: AIProviderName;
      onRetry?: (attempt: number, error: Error, delayMs: number) => void;
    }
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry non-retryable errors
        if (!this.isRetryable(error as Error)) {
          throw error;
        }

        // Don't retry if we've exhausted attempts
        if (attempt >= this.config.maxRetries) {
          throw error;
        }

        const delayMs = this.calculateDelay(attempt);
        
        if (options.onRetry) {
          options.onRetry(attempt + 1, error as Error, delayMs);
        }

        console.log(`[RetryManager] ${options.provider}: Attempt ${attempt + 1} failed, retrying in ${delayMs}ms`);
        await this.sleep(delayMs);
      }
    }

    throw lastError || new Error('Retry failed without error');
  }

  /**
   * Calculate delay for a given attempt using exponential backoff with jitter
   */
  calculateDelay(attempt: number): number {
    // Exponential: base * 2^attempt
    const exponentialDelay = this.config.baseDelayMs * Math.pow(2, attempt);
    
    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs);
    
    // Add jitter
    const jitter = cappedDelay * this.config.jitterFactor * Math.random();
    
    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Determine if an error is retryable
   */
  isRetryable(error: Error): boolean {
    // AIProviderError has retryable flag
    if (error instanceof AIProviderError) {
      return error.retryable;
    }

    // Rate limit errors are retryable
    if (error instanceof AIRateLimitError) {
      return true;
    }

    // Network errors are retryable
    const message = error.message.toLowerCase();
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('socket hang up')
    ) {
      return true;
    }

    // HTTP 5xx errors are retryable
    if (error instanceof AIProviderError && error.statusCode && error.statusCode >= 500) {
      return true;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// UNIFIED RESILIENCE MANAGER
// =============================================================================

export interface ResilienceConfig {
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  rateLimiter?: boolean;
  retry?: Partial<RetryConfig>;
}

/**
 * Unified manager combining all resilience patterns
 */
export class ResilienceManager {
  public readonly circuitBreaker: CircuitBreaker;
  public readonly rateLimiter: RateLimiter;
  public readonly retryManager: RetryManager;
  private enabled: {
    circuitBreaker: boolean;
    rateLimiter: boolean;
    retry: boolean;
  };

  constructor(config: ResilienceConfig = {}) {
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
    this.rateLimiter = new RateLimiter();
    this.retryManager = new RetryManager(config.retry);
    this.enabled = {
      circuitBreaker: true,
      rateLimiter: config.rateLimiter !== false,
      retry: true,
    };
  }

  /**
   * Check if a provider is available for requests
   */
  isProviderAvailable(provider: AIProviderName, rpm?: number): {
    available: boolean;
    reason?: string;
  } {
    // Check circuit breaker
    if (this.enabled.circuitBreaker && !this.circuitBreaker.isAvailable(provider)) {
      const state = this.circuitBreaker.getState(provider);
      return {
        available: false,
        reason: `Circuit open since ${state.openedAt ? new Date(state.openedAt).toISOString() : 'unknown'}`,
      };
    }

    // Check rate limiter
    if (this.enabled.rateLimiter && !this.rateLimiter.canProceed(provider, rpm)) {
      const waitMs = this.rateLimiter.getWaitTimeMs(provider);
      return {
        available: false,
        reason: `Rate limited, retry in ${waitMs}ms`,
      };
    }

    return { available: true };
  }

  /**
   * Execute a request with all resilience patterns
   */
  async execute<T>(
    provider: AIProviderName,
    fn: () => Promise<T>,
    options: {
      rpm?: number;
      onRetry?: (attempt: number, error: Error, delayMs: number) => void;
    } = {}
  ): Promise<T> {
    // Pre-flight checks
    const availability = this.isProviderAvailable(provider, options.rpm);
    if (!availability.available) {
      throw new AIProviderError(
        `Provider ${provider} unavailable: ${availability.reason}`,
        provider,
        503,
        true
      );
    }

    // Consume rate limit token
    if (this.enabled.rateLimiter) {
      this.rateLimiter.consume(provider, options.rpm);
    }

    // Execute with retry
    try {
      const result = await this.retryManager.execute(fn, {
        provider,
        onRetry: options.onRetry,
      });

      // Record success
      if (this.enabled.circuitBreaker) {
        this.circuitBreaker.recordSuccess(provider);
      }

      return result;
    } catch (error) {
      // Record failure
      if (this.enabled.circuitBreaker) {
        this.circuitBreaker.recordFailure(provider, error as Error);
      }

      throw error;
    }
  }

  /**
   * Get health status for all providers
   */
  getHealthStatus(): Record<AIProviderName, {
    circuitState: CircuitState;
    rateLimitTokens: number | null;
    available: boolean;
  }> {
    const providers: AIProviderName[] = ['lovable_ai', 'openai', 'anthropic', 'openrouter'];
    const result: Record<string, unknown> = {};

    for (const provider of providers) {
      const circuitState = this.circuitBreaker.getState(provider);
      const rateLimitState = this.rateLimiter.getState(provider);
      const availability = this.isProviderAvailable(provider);

      result[provider] = {
        circuitState: circuitState.state,
        rateLimitTokens: rateLimitState?.tokens ?? null,
        available: availability.available,
      };
    }

    return result as Record<AIProviderName, {
      circuitState: CircuitState;
      rateLimitTokens: number | null;
      available: boolean;
    }>;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let globalResilienceManager: ResilienceManager | null = null;

export function getResilienceManager(config?: ResilienceConfig): ResilienceManager {
  if (!globalResilienceManager) {
    globalResilienceManager = new ResilienceManager(config);
  }
  return globalResilienceManager;
}

export function resetResilienceManager(): void {
  globalResilienceManager = null;
}
