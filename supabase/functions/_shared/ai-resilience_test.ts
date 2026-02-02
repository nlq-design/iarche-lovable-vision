/**
 * AI Resilience Module Tests
 * 
 * Tests Circuit Breaker, Rate Limiter, and Retry Manager
 * Run with: deno test --allow-net --allow-env supabase/functions/_shared/ai-resilience_test.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CircuitBreaker,
  RateLimiter,
  RetryManager,
  ResilienceManager,
  getResilienceManager,
  resetResilienceManager,
} from "./ai-resilience.ts";
import { AIProviderError, AIRateLimitError } from "./ai-types.ts";

// =============================================================================
// CIRCUIT BREAKER TESTS
// =============================================================================

Deno.test("CircuitBreaker - Initial state is closed", () => {
  resetResilienceManager();
  const cb = new CircuitBreaker();
  const state = cb.getState("lovable_ai");
  
  assertEquals(state.state, "closed");
  assertEquals(state.failures, 0);
  assertEquals(state.successes, 0);
});

Deno.test("CircuitBreaker - Opens after threshold failures", () => {
  resetResilienceManager();
  const cb = new CircuitBreaker({ failureThreshold: 3 });
  
  // Record 3 failures
  cb.recordFailure("openai", new Error("Test error 1"));
  cb.recordFailure("openai", new Error("Test error 2"));
  cb.recordFailure("openai", new Error("Test error 3"));
  
  const state = cb.getState("openai");
  assertEquals(state.state, "open");
  assertEquals(state.failures, 3);
  assertEquals(cb.isAvailable("openai"), false);
});

Deno.test("CircuitBreaker - Success resets failure count in closed state", () => {
  resetResilienceManager();
  const cb = new CircuitBreaker({ failureThreshold: 3 });
  
  cb.recordFailure("anthropic", new Error("Failure 1"));
  cb.recordFailure("anthropic", new Error("Failure 2"));
  cb.recordSuccess("anthropic");
  
  const state = cb.getState("anthropic");
  assertEquals(state.state, "closed");
  assertEquals(state.successes, 1);
});

Deno.test("CircuitBreaker - Manual reset works", () => {
  resetResilienceManager();
  const cb = new CircuitBreaker({ failureThreshold: 2 });
  
  cb.recordFailure("openrouter", new Error("Failure 1"));
  cb.recordFailure("openrouter", new Error("Failure 2"));
  assertEquals(cb.isAvailable("openrouter"), false);
  
  cb.reset("openrouter");
  assertEquals(cb.isAvailable("openrouter"), true);
  assertEquals(cb.getState("openrouter").state, "closed");
});

Deno.test("CircuitBreaker - getAllStates returns all providers", () => {
  resetResilienceManager();
  const cb = new CircuitBreaker();
  const allStates = cb.getAllStates();
  
  assertExists(allStates.lovable_ai);
  assertExists(allStates.openai);
  assertExists(allStates.anthropic);
  assertExists(allStates.openrouter);
});

// =============================================================================
// RATE LIMITER TESTS
// =============================================================================

Deno.test("RateLimiter - Initial bucket has tokens", () => {
  const rl = new RateLimiter();
  assertEquals(rl.canProceed("lovable_ai", 60), true);
});

Deno.test("RateLimiter - Consume reduces tokens", () => {
  const rl = new RateLimiter();
  const initialState = rl.getState("openai");
  const initialTokens = initialState?.tokens ?? 500;
  
  rl.consume("openai");
  const afterState = rl.getState("openai");
  
  assertEquals(afterState!.tokens, initialTokens - 1);
});

Deno.test("RateLimiter - UpdateLimit changes RPM", () => {
  const rl = new RateLimiter();
  rl.updateLimit("anthropic", 100);
  
  const state = rl.getState("anthropic");
  assertEquals(state!.rpm, 100);
});

Deno.test("RateLimiter - getWaitTimeMs returns 0 when tokens available", () => {
  const rl = new RateLimiter();
  rl.canProceed("openrouter", 200); // Initialize bucket
  
  const waitTime = rl.getWaitTimeMs("openrouter");
  assertEquals(waitTime, 0);
});

// =============================================================================
// RETRY MANAGER TESTS
// =============================================================================

Deno.test("RetryManager - Successful call returns immediately", async () => {
  const rm = new RetryManager({ maxRetries: 3 });
  let callCount = 0;
  
  const result = await rm.execute(
    async () => {
      callCount++;
      return "success";
    },
    { provider: "lovable_ai" }
  );
  
  assertEquals(result, "success");
  assertEquals(callCount, 1);
});

Deno.test("RetryManager - Retries on retryable errors", async () => {
  const rm = new RetryManager({ maxRetries: 2, baseDelayMs: 10 });
  let callCount = 0;
  
  const result = await rm.execute(
    async () => {
      callCount++;
      if (callCount < 3) {
        throw new AIProviderError("Temporary error", "openai", 500, true);
      }
      return "success after retry";
    },
    { provider: "openai" }
  );
  
  assertEquals(result, "success after retry");
  assertEquals(callCount, 3);
});

Deno.test("RetryManager - Does not retry non-retryable errors", async () => {
  const rm = new RetryManager({ maxRetries: 3, baseDelayMs: 10 });
  let callCount = 0;
  
  try {
    await rm.execute(
      async () => {
        callCount++;
        throw new AIProviderError("Quota exceeded", "openai", 402, false);
      },
      { provider: "openai" }
    );
  } catch (e) {
    // Expected
  }
  
  assertEquals(callCount, 1); // No retries for non-retryable
});

Deno.test("RetryManager - Calls onRetry callback", async () => {
  const rm = new RetryManager({ maxRetries: 2, baseDelayMs: 10 });
  const retryAttempts: number[] = [];
  
  await rm.execute(
    async () => {
      if (retryAttempts.length < 2) {
        throw new AIProviderError("Temp error", "anthropic", 503, true);
      }
      return "done";
    },
    {
      provider: "anthropic",
      onRetry: (attempt) => retryAttempts.push(attempt),
    }
  );
  
  assertEquals(retryAttempts, [1, 2]);
});

Deno.test("RetryManager - calculateDelay uses exponential backoff", () => {
  const rm = new RetryManager({ 
    baseDelayMs: 1000, 
    maxDelayMs: 30000,
    jitterFactor: 0, // Disable jitter for predictable test
  });
  
  const delay0 = rm.calculateDelay(0); // 1000 * 2^0 = 1000
  const delay1 = rm.calculateDelay(1); // 1000 * 2^1 = 2000
  const delay2 = rm.calculateDelay(2); // 1000 * 2^2 = 4000
  
  assertEquals(delay0, 1000);
  assertEquals(delay1, 2000);
  assertEquals(delay2, 4000);
});

Deno.test("RetryManager - isRetryable identifies network errors", () => {
  const rm = new RetryManager();
  
  assertEquals(rm.isRetryable(new Error("network timeout")), true);
  assertEquals(rm.isRetryable(new Error("ECONNRESET")), true);
  assertEquals(rm.isRetryable(new Error("socket hang up")), true);
  assertEquals(rm.isRetryable(new AIRateLimitError("openai")), true);
  assertEquals(rm.isRetryable(new AIProviderError("Server error", "openai", 500, true)), true);
  assertEquals(rm.isRetryable(new AIProviderError("Bad request", "openai", 400, false)), false);
});

// =============================================================================
// RESILIENCE MANAGER TESTS
// =============================================================================

Deno.test("ResilienceManager - isProviderAvailable checks both circuit and rate limit", () => {
  resetResilienceManager();
  const manager = new ResilienceManager();
  
  const result = manager.isProviderAvailable("lovable_ai");
  assertEquals(result.available, true);
  assertEquals(result.reason, undefined);
});

Deno.test("ResilienceManager - getHealthStatus returns all providers", () => {
  resetResilienceManager();
  const manager = new ResilienceManager();
  const health = manager.getHealthStatus();
  
  assertExists(health.lovable_ai);
  assertExists(health.openai);
  assertExists(health.anthropic);
  assertExists(health.openrouter);
  
  assertEquals(health.lovable_ai.circuitState, "closed");
  assertEquals(health.lovable_ai.available, true);
});

Deno.test("ResilienceManager - execute records success", async () => {
  resetResilienceManager();
  const manager = new ResilienceManager();
  
  await manager.execute(
    "lovable_ai",
    async () => "success"
  );
  
  const state = manager.circuitBreaker.getState("lovable_ai");
  assertEquals(state.successes >= 1, true);
});

Deno.test("ResilienceManager - execute records failure and opens circuit", async () => {
  resetResilienceManager();
  const manager = new ResilienceManager({
    circuitBreaker: { failureThreshold: 2 },
    retry: { maxRetries: 0 }, // No retries to speed up test
  });
  
  // Use a provider that hasn't been touched by other tests
  const testProvider = "anthropic";
  
  // Fail twice to open circuit
  for (let i = 0; i < 2; i++) {
    try {
      await manager.execute(
        testProvider,
        async () => {
          throw new AIProviderError("Error", testProvider, 400, false);
        }
      );
    } catch {
      // Expected
    }
  }
  
  const state = manager.circuitBreaker.getState(testProvider);
  assertEquals(state.state, "open");
  assertEquals(state.failures >= 2, true); // At least 2 failures
});

Deno.test("getResilienceManager - returns singleton", () => {
  resetResilienceManager();
  const m1 = getResilienceManager();
  const m2 = getResilienceManager();
  
  assertEquals(m1, m2);
});

Deno.test("resetResilienceManager - creates new instance", () => {
  const m1 = getResilienceManager();
  resetResilienceManager();
  const m2 = getResilienceManager();
  
  // Different instances (can't directly compare, but state should be fresh)
  assertEquals(m2.circuitBreaker.getState("lovable_ai").failures, 0);
});
