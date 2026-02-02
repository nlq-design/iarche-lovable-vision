/**
 * Tests for AI Quota Tracking System
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { 
  QuotaManager, 
  WorkspaceQuota, 
  QuotaUsage, 
  QuotaCheckResult 
} from "./ai-quota.ts";
import { AIWorkspaceQuotaExceededError } from "./ai-types.ts";

// ============================================================================
// TYPE EXPORTS VALIDATION
// ============================================================================

Deno.test("ai-quota - QuotaManager class is exported", () => {
  assertExists(QuotaManager);
});

Deno.test("ai-quota - AIWorkspaceQuotaExceededError has correct structure", () => {
  const error = new AIWorkspaceQuotaExceededError(
    "Test quota exceeded",
    105,
    "workspace-123"
  );
  
  assertEquals(error.name, "AIWorkspaceQuotaExceededError");
  assertEquals(error.message, "Test quota exceeded");
  assertEquals(error.percentageUsed, 105);
  assertEquals(error.workspaceId, "workspace-123");
});

// ============================================================================
// QUOTA CHECK RESULT INTERFACE
// ============================================================================

Deno.test("ai-quota - QuotaCheckResult interface structure", () => {
  const mockResult: QuotaCheckResult = {
    allowed: true,
    usage: {
      workspace_id: "ws-1",
      total_tokens: 1000,
      total_cost_cents: 50,
      request_count: 10,
      period_start: "2026-02-01",
      period_end: "2026-02-28",
    },
    quota: {
      workspace_id: "ws-1",
      monthly_token_limit: 100000,
      monthly_cost_limit_cents: 5000,
      alert_threshold_percent: 80,
      hard_limit_enabled: false,
      current_period_start: "2026-02-01",
    },
    percentage_used: 1,
    alerts: [],
  };

  assertEquals(mockResult.allowed, true);
  assertEquals(mockResult.percentage_used, 1);
  assertEquals(mockResult.alerts.length, 0);
});

Deno.test("ai-quota - QuotaCheckResult with alerts", () => {
  const mockResult: QuotaCheckResult = {
    allowed: true,
    usage: {
      workspace_id: "ws-1",
      total_tokens: 85000,
      total_cost_cents: 4250,
      request_count: 100,
      period_start: "2026-02-01",
      period_end: "2026-02-28",
    },
    quota: {
      workspace_id: "ws-1",
      monthly_token_limit: 100000,
      monthly_cost_limit_cents: 5000,
      alert_threshold_percent: 80,
      hard_limit_enabled: false,
      current_period_start: "2026-02-01",
    },
    percentage_used: 85,
    alerts: [
      {
        type: "warning",
        message: "Seuil d'alerte atteint (85% utilisé)",
        threshold_percent: 80,
        current_percent: 85,
      },
    ],
  };

  assertEquals(mockResult.allowed, true);
  assertEquals(mockResult.percentage_used, 85);
  assertEquals(mockResult.alerts.length, 1);
  assertEquals(mockResult.alerts[0].type, "warning");
});

Deno.test("ai-quota - QuotaCheckResult with hard limit exceeded", () => {
  const mockResult: QuotaCheckResult = {
    allowed: false,
    reason: "Quota mensuel épuisé (105%). Contactez l'administrateur.",
    usage: {
      workspace_id: "ws-1",
      total_tokens: 105000,
      total_cost_cents: 5250,
      request_count: 150,
      period_start: "2026-02-01",
      period_end: "2026-02-28",
    },
    quota: {
      workspace_id: "ws-1",
      monthly_token_limit: 100000,
      monthly_cost_limit_cents: 5000,
      alert_threshold_percent: 80,
      hard_limit_enabled: true,
      current_period_start: "2026-02-01",
    },
    percentage_used: 105,
    alerts: [
      {
        type: "exceeded",
        message: "Quota dépassé (105% utilisé)",
        threshold_percent: 100,
        current_percent: 105,
      },
    ],
  };

  assertEquals(mockResult.allowed, false);
  assertEquals(mockResult.percentage_used, 105);
  assertEquals(mockResult.alerts.length, 1);
  assertEquals(mockResult.alerts[0].type, "exceeded");
});

// ============================================================================
// WORKSPACE QUOTA INTERFACE
// ============================================================================

Deno.test("ai-quota - WorkspaceQuota with unlimited tokens", () => {
  const quota: WorkspaceQuota = {
    workspace_id: "ws-unlimited",
    monthly_token_limit: null, // unlimited
    monthly_cost_limit_cents: 10000, // but limited by cost
    alert_threshold_percent: 90,
    hard_limit_enabled: true,
    current_period_start: "2026-02-01",
  };

  assertEquals(quota.monthly_token_limit, null);
  assertExists(quota.monthly_cost_limit_cents);
});

// ============================================================================
// USAGE TRACKING INTERFACE
// ============================================================================

Deno.test("ai-quota - QuotaUsage structure", () => {
  const usage: QuotaUsage = {
    workspace_id: "ws-1",
    total_tokens: 50000,
    total_cost_cents: 250,
    request_count: 75,
    period_start: "2026-02-01",
    period_end: "2026-02-28",
  };

  assertEquals(usage.total_tokens, 50000);
  assertEquals(usage.total_cost_cents, 250);
  assertEquals(usage.request_count, 75);
});
