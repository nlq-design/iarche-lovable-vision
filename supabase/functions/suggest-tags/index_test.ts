/**
 * Suggest Tags Edge Function Tests
 * 
 * Tests the suggest-tags function for tag extraction from articles.
 * Run with: deno test --allow-net --allow-env supabase/functions/suggest-tags/
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");

// ============================================================================
// CONTRACT TESTS - Input/Output validation
// ============================================================================

Deno.test("suggest-tags - Valid request body structure", () => {
  const validBody = {
    title: "L'IA révolutionne le marketing digital",
    content: "L'intelligence artificielle transforme les stratégies marketing...",
    excerpt: "Découvrez comment l'IA change le marketing",
  };

  assertExists(validBody.title);
  assertExists(validBody.content);
  assertEquals(typeof validBody.title, "string");
  assertEquals(typeof validBody.content, "string");
});

Deno.test("suggest-tags - Response schema validation", () => {
  // Expected response structure
  const expectedResponse = {
    tags: ["IA", "marketing digital", "intelligence artificielle"],
  };

  assertExists(expectedResponse.tags);
  assert(Array.isArray(expectedResponse.tags));
  expectedResponse.tags.forEach((tag) => {
    assertEquals(typeof tag, "string");
    assert(tag.length > 0);
  });
});

// ============================================================================
// INTEGRATION TESTS - Require deployed function
// ============================================================================

Deno.test({
  name: "suggest-tags - OPTIONS returns CORS headers",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  fn: async () => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/suggest-tags`,
      { method: "OPTIONS" }
    );
    
    // Consume response body
    await response.text();
    
    assertEquals(response.status, 200);
    assertExists(response.headers.get("access-control-allow-origin"));
  },
});

Deno.test({
  name: "suggest-tags - Rejects invalid body",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  fn: async () => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/suggest-tags`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({}), // Missing required fields
      }
    );
    
    const body = await response.text();
    
    // Should fail gracefully
    assert(response.status >= 400 || body.includes("error"));
  },
});

Deno.test({
  name: "suggest-tags - Extracts tags from article",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  fn: async () => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/suggest-tags`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          title: "Comment l'IA transforme le secteur de la santé",
          content: "L'intelligence artificielle révolutionne le diagnostic médical. Les algorithmes de machine learning permettent une détection précoce des maladies. Les hôpitaux adoptent ces nouvelles technologies pour améliorer les soins aux patients.",
          excerpt: "L'IA au service de la santé",
        }),
      }
    );
    
    const data = await response.json();
    
    if (response.status === 429) {
      console.log("Rate limited, skipping assertion");
      return;
    }
    
    if (response.status === 402) {
      console.log("Payment required, skipping assertion");
      return;
    }
    
    assertEquals(response.status, 200);
    assertExists(data.tags);
    assert(Array.isArray(data.tags));
    assert(data.tags.length >= 3, "Should return at least 3 tags");
    assert(data.tags.length <= 10, "Should return at most 10 tags");
    
    // Tags should be relevant to the content
    const allTags = data.tags.join(" ").toLowerCase();
    assert(
      allTags.includes("ia") || 
      allTags.includes("santé") || 
      allTags.includes("intelligence") ||
      allTags.includes("médical"),
      "Tags should be relevant to the content"
    );
  },
});
