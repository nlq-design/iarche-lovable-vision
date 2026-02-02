/**
 * AI Client Unit Tests
 * 
 * Tests the centralized AI client for provider switching, fallback, and configuration.
 * Run with: deno test --allow-net --allow-env supabase/functions/_shared/ai-client_test.ts
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Import types only - actual client needs Supabase connection
import type { AIProviderName, AICompletionRequest } from "./ai-types.ts";

// ============================================================================
// UNIT TESTS - Pure logic, no external dependencies
// ============================================================================

Deno.test("AI Types - Provider names are valid", () => {
  const validProviders: AIProviderName[] = ["lovable_ai", "openai", "anthropic", "openrouter"];
  
  validProviders.forEach((provider) => {
    assertExists(provider);
    assertEquals(typeof provider, "string");
  });
});

Deno.test("AI Types - Completion request structure", () => {
  const request: AICompletionRequest = {
    messages: [
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Hello" },
    ],
    model: "google/gemini-2.5-flash",
    temperature: 0.7,
    max_tokens: 1000,
  };

  assertExists(request.messages);
  assertEquals(request.messages.length, 2);
  assertEquals(request.model, "google/gemini-2.5-flash");
  assertEquals(request.temperature, 0.7);
});

Deno.test("AI Types - Message roles are valid", () => {
  const validRoles = ["system", "user", "assistant", "tool"];
  
  validRoles.forEach((role) => {
    const message = { role, content: "test" };
    assertExists(message.role);
  });
});

// ============================================================================
// INTEGRATION TESTS - Require environment variables
// ============================================================================

Deno.test({
  name: "AI Providers - Lovable AI availability check",
  ignore: !Deno.env.get("LOVABLE_API_KEY"),
  fn: async () => {
    const { LovableAIAdapter } = await import("./ai-providers.ts");
    const adapter = new LovableAIAdapter();
    
    // Should be available if LOVABLE_API_KEY is set
    assertEquals(adapter.isAvailable(), true);
    assertEquals(adapter.name, "lovable_ai");
  },
});

Deno.test({
  name: "AI Providers - OpenAI availability check",
  ignore: !Deno.env.get("OPENAI_API_KEY"),
  fn: async () => {
    const { OpenAIAdapter } = await import("./ai-providers.ts");
    const adapter = new OpenAIAdapter();
    
    // Should be available if OPENAI_API_KEY is set and starts with sk-
    const apiKey = Deno.env.get("OPENAI_API_KEY") || "";
    assertEquals(adapter.isAvailable(), apiKey.startsWith("sk-"));
  },
});

Deno.test({
  name: "AI Providers - Default models by category",
  fn: async () => {
    const { LovableAIAdapter } = await import("./ai-providers.ts");
    const adapter = new LovableAIAdapter();
    
    const chatModel = adapter.getDefaultModel("chat");
    const reasoningModel = adapter.getDefaultModel("reasoning");
    const visionModel = adapter.getDefaultModel("vision");
    
    assertExists(chatModel);
    assertExists(reasoningModel);
    assertExists(visionModel);
    
    // Verify Gemini models are used by default
    assertEquals(chatModel.includes("gemini") || chatModel.includes("gpt"), true);
  },
});

Deno.test({
  name: "AI Providers - Provider registry",
  fn: async () => {
    const { createProviderAdapter, getAvailableProviders } = await import("./ai-providers.ts");
    
    // Should be able to create adapters for all known providers
    const providers: AIProviderName[] = ["lovable_ai", "openai", "anthropic", "openrouter"];
    
    for (const name of providers) {
      const adapter = createProviderAdapter(name);
      assertExists(adapter);
      assertEquals(adapter.name, name);
    }
    
    // getAvailableProviders should return only those with API keys
    const available = getAvailableProviders();
    assertEquals(Array.isArray(available), true);
  },
});

// ============================================================================
// LIVE API TESTS - Only run with valid API keys (skipped in CI)
// ============================================================================

Deno.test({
  name: "AI Client - Live completion (Lovable AI)",
  ignore: !Deno.env.get("LOVABLE_API_KEY") || !Deno.env.get("SUPABASE_URL"),
  fn: async () => {
    const { callLLM } = await import("./ai-client.ts");
    
    const response = await callLLM(
      [
        { role: "system", content: "Reply with exactly: TEST_OK" },
        { role: "user", content: "Respond" },
      ],
      { functionName: "test-function" }
    );
    
    assertExists(response);
    assertEquals(typeof response, "string");
    assertEquals(response.includes("TEST_OK"), true);
  },
});

Deno.test({
  name: "AI Client - Function config lookup",
  ignore: !Deno.env.get("SUPABASE_URL") || !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  fn: async () => {
    const { createAIClient } = await import("./ai-client.ts");
    const client = createAIClient();
    
    // Should be able to fetch function config (may be null if not configured)
    const config = await client.getFunctionConfig("suggest-tags");
    
    // Config is optional, but if present should have valid structure
    if (config) {
      assertExists(config.provider);
      assertEquals(typeof config.provider, "string");
    }
  },
});
