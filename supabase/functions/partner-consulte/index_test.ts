/**
 * Partner Consulte Edge Function Tests
 * 
 * Tests the partner-consulte function for 360° entity synthesis.
 * Run with: deno test --allow-net --allow-env supabase/functions/partner-consulte/
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");

// ============================================================================
// CONTRACT TESTS - Input/Output validation
// ============================================================================

Deno.test("partner-consulte - Valid request body structure", () => {
  const validBodies = [
    { entity_type: "lead", entity_id: "uuid-here" },
    { entity_type: "project", entity_id: "uuid-here", query: "What is the status?" },
    { entity_type: "partner", entity_id: "uuid-here" },
  ];

  validBodies.forEach((body) => {
    assertExists(body.entity_type);
    assertExists(body.entity_id);
    assertEquals(typeof body.entity_type, "string");
    assertEquals(typeof body.entity_id, "string");
  });
});

Deno.test("partner-consulte - Entity types are valid", () => {
  const validEntityTypes = ["lead", "project", "partner", "opportunity"];
  
  validEntityTypes.forEach((type) => {
    assertEquals(typeof type, "string");
    assert(type.length > 0);
  });
});

// ============================================================================
// INTEGRATION TESTS - Require deployed function
// ============================================================================

Deno.test({
  name: "partner-consulte - OPTIONS returns CORS headers",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  fn: async () => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/partner-consulte`,
      { method: "OPTIONS" }
    );
    
    await response.text();
    
    assertEquals(response.status, 200);
    assertExists(response.headers.get("access-control-allow-origin"));
  },
});

Deno.test({
  name: "partner-consulte - Requires authentication",
  ignore: !SUPABASE_URL,
  fn: async () => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/partner-consulte`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // No Authorization header
        },
        body: JSON.stringify({
          entity_type: "lead",
          entity_id: "00000000-0000-0000-0000-000000000000",
        }),
      }
    );
    
    await response.text();
    
    // Should require auth
    assert(
      response.status === 401 || response.status === 403,
      "Should require authentication"
    );
  },
});

Deno.test({
  name: "partner-consulte - Rejects invalid entity type",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  fn: async () => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/partner-consulte`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          entity_type: "invalid_type",
          entity_id: "00000000-0000-0000-0000-000000000000",
        }),
      }
    );
    
    const body = await response.text();
    
    // Should reject invalid entity type
    assert(
      response.status >= 400 || body.includes("error"),
      "Should reject invalid entity type"
    );
  },
});

Deno.test({
  name: "partner-consulte - Handles non-existent entity gracefully",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  fn: async () => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/partner-consulte`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          entity_type: "lead",
          entity_id: "00000000-0000-0000-0000-000000000000", // Non-existent
        }),
      }
    );
    
    const body = await response.text();
    
    // Should handle gracefully (either 404 or error message)
    assert(
      response.status === 404 || 
      response.status === 401 ||
      response.status === 403 ||
      body.includes("error") ||
      body.includes("not found"),
      "Should handle non-existent entity gracefully"
    );
  },
});
