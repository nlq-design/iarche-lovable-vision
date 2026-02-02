/**
 * AI Quota Tracking System
 * 
 * Real-time usage tracking per workspace with budget alerts and enforcement.
 * 
 * Features:
 *   - Pre-request quota check to prevent overspend
 *   - Configurable soft/hard limits per workspace
 *   - Automatic alerts at threshold (e.g., 80%, 90%, 100%)
 *   - Rolling window (monthly by default)
 *   - Cached quota lookups for performance
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================================================
// TYPES
// =============================================================================

export interface WorkspaceQuota {
  workspace_id: string;
  monthly_token_limit: number | null; // null = unlimited
  monthly_cost_limit_cents: number | null; // null = unlimited
  alert_threshold_percent: number; // e.g., 80
  hard_limit_enabled: boolean; // true = block requests when exceeded
  current_period_start: string; // ISO date of current billing period
}

export interface QuotaUsage {
  workspace_id: string;
  total_tokens: number;
  total_cost_cents: number;
  request_count: number;
  period_start: string;
  period_end: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  usage: QuotaUsage;
  quota: WorkspaceQuota;
  percentage_used: number;
  alerts: QuotaAlert[];
}

export interface QuotaAlert {
  type: 'warning' | 'critical' | 'exceeded';
  message: string;
  threshold_percent: number;
  current_percent: number;
}

export type QuotaMetricType = 'tokens' | 'cost';

// =============================================================================
// QUOTA MANAGER
// =============================================================================

export class QuotaManager {
  // deno-lint-ignore no-explicit-any
  private supabase: SupabaseClient<any>;
  private quotaCache: Map<string, { quota: WorkspaceQuota; fetchedAt: number }> = new Map();
  private usageCache: Map<string, { usage: QuotaUsage; fetchedAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 30000; // 30 seconds for real-time accuracy
  private readonly DEFAULT_ALERT_THRESHOLD = 80;

  constructor(supabaseClient?: SupabaseClient) {
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
  }

  /**
   * Check if a request is allowed based on workspace quota
   */
  async checkQuota(workspaceId: string): Promise<QuotaCheckResult> {
    const [quota, usage] = await Promise.all([
      this.getWorkspaceQuota(workspaceId),
      this.getWorkspaceUsage(workspaceId),
    ]);

    const alerts: QuotaAlert[] = [];
    let percentageUsed = 0;
    let allowed = true;
    let reason: string | undefined;

    // Calculate percentage based on which limit is set
    if (quota.monthly_token_limit !== null && quota.monthly_token_limit > 0) {
      percentageUsed = Math.round((usage.total_tokens / quota.monthly_token_limit) * 100);
    } else if (quota.monthly_cost_limit_cents !== null && quota.monthly_cost_limit_cents > 0) {
      percentageUsed = Math.round((usage.total_cost_cents / quota.monthly_cost_limit_cents) * 100);
    }

    // Check thresholds and generate alerts
    if (percentageUsed >= 100) {
      alerts.push({
        type: 'exceeded',
        message: `Quota dépassé (${percentageUsed}% utilisé)`,
        threshold_percent: 100,
        current_percent: percentageUsed,
      });

      if (quota.hard_limit_enabled) {
        allowed = false;
        reason = `Quota mensuel épuisé (${percentageUsed}%). Contactez l'administrateur.`;
      }
    } else if (percentageUsed >= 90) {
      alerts.push({
        type: 'critical',
        message: `Quota critique (${percentageUsed}% utilisé)`,
        threshold_percent: 90,
        current_percent: percentageUsed,
      });
    } else if (percentageUsed >= quota.alert_threshold_percent) {
      alerts.push({
        type: 'warning',
        message: `Seuil d'alerte atteint (${percentageUsed}% utilisé)`,
        threshold_percent: quota.alert_threshold_percent,
        current_percent: percentageUsed,
      });
    }

    return {
      allowed,
      reason,
      usage,
      quota,
      percentage_used: percentageUsed,
      alerts,
    };
  }

  /**
   * Record usage after a successful AI call
   */
  async recordUsage(
    workspaceId: string,
    tokens: number,
    costCents: number,
    metadata?: {
      provider?: string;
      model?: string;
      operation_type?: string;
    }
  ): Promise<void> {
    const periodStart = this.getCurrentPeriodStart();

    try {
      // Upsert usage record for current period
      const { error } = await this.supabase.rpc('increment_workspace_ai_usage', {
        p_workspace_id: workspaceId,
        p_tokens: tokens,
        p_cost_cents: costCents,
        p_period_start: periodStart,
      });

      if (error) {
        console.warn('[QuotaManager] Failed to record usage via RPC, falling back to direct insert:', error.message);
        // Fallback: try direct insert/update
        await this.recordUsageDirectly(workspaceId, tokens, costCents, periodStart);
      }

      // Invalidate cache
      this.usageCache.delete(workspaceId);
    } catch (e) {
      console.error('[QuotaManager] Error recording usage:', e);
    }
  }

  /**
   * Fallback direct usage recording if RPC is not available
   */
  private async recordUsageDirectly(
    workspaceId: string,
    tokens: number,
    costCents: number,
    periodStart: string
  ): Promise<void> {
    const periodEnd = this.getPeriodEnd(periodStart);

    // Try to get existing record
    const { data: existing } = await this.supabase
      .from('workspace_ai_usage')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('period_start', periodStart)
      .single();

    if (existing) {
      await this.supabase
        .from('workspace_ai_usage')
        .update({
          total_tokens: existing.total_tokens + tokens,
          total_cost_cents: existing.total_cost_cents + costCents,
          request_count: existing.request_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await this.supabase
        .from('workspace_ai_usage')
        .insert({
          workspace_id: workspaceId,
          total_tokens: tokens,
          total_cost_cents: costCents,
          request_count: 1,
          period_start: periodStart,
          period_end: periodEnd,
        });
    }
  }

  /**
   * Get workspace quota configuration with caching
   */
  private async getWorkspaceQuota(workspaceId: string): Promise<WorkspaceQuota> {
    const now = Date.now();
    const cached = this.quotaCache.get(workspaceId);

    if (cached && (now - cached.fetchedAt) < this.CACHE_TTL_MS) {
      return cached.quota;
    }

    try {
      const { data, error } = await this.supabase
        .from('workspace_ai_quotas')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single();

      if (error || !data) {
        // Return default unlimited quota
        const defaultQuota: WorkspaceQuota = {
          workspace_id: workspaceId,
          monthly_token_limit: null,
          monthly_cost_limit_cents: null,
          alert_threshold_percent: this.DEFAULT_ALERT_THRESHOLD,
          hard_limit_enabled: false,
          current_period_start: this.getCurrentPeriodStart(),
        };
        return defaultQuota;
      }

      const quota: WorkspaceQuota = {
        workspace_id: data.workspace_id,
        monthly_token_limit: data.monthly_token_limit,
        monthly_cost_limit_cents: data.monthly_cost_limit_cents,
        alert_threshold_percent: data.alert_threshold_percent ?? this.DEFAULT_ALERT_THRESHOLD,
        hard_limit_enabled: data.hard_limit_enabled ?? false,
        current_period_start: data.current_period_start ?? this.getCurrentPeriodStart(),
      };

      this.quotaCache.set(workspaceId, { quota, fetchedAt: now });
      return quota;
    } catch (e) {
      console.warn('[QuotaManager] Error fetching quota, using defaults:', e);
      return {
        workspace_id: workspaceId,
        monthly_token_limit: null,
        monthly_cost_limit_cents: null,
        alert_threshold_percent: this.DEFAULT_ALERT_THRESHOLD,
        hard_limit_enabled: false,
        current_period_start: this.getCurrentPeriodStart(),
      };
    }
  }

  /**
   * Get workspace usage for current period with caching
   */
  private async getWorkspaceUsage(workspaceId: string): Promise<QuotaUsage> {
    const now = Date.now();
    const cached = this.usageCache.get(workspaceId);

    if (cached && (now - cached.fetchedAt) < this.CACHE_TTL_MS) {
      return cached.usage;
    }

    const periodStart = this.getCurrentPeriodStart();
    const periodEnd = this.getPeriodEnd(periodStart);

    try {
      const { data, error } = await this.supabase
        .from('workspace_ai_usage')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('period_start', periodStart)
        .single();

      if (error || !data) {
        // No usage yet this period
        const emptyUsage: QuotaUsage = {
          workspace_id: workspaceId,
          total_tokens: 0,
          total_cost_cents: 0,
          request_count: 0,
          period_start: periodStart,
          period_end: periodEnd,
        };
        return emptyUsage;
      }

      const usage: QuotaUsage = {
        workspace_id: data.workspace_id,
        total_tokens: data.total_tokens ?? 0,
        total_cost_cents: data.total_cost_cents ?? 0,
        request_count: data.request_count ?? 0,
        period_start: data.period_start,
        period_end: data.period_end,
      };

      this.usageCache.set(workspaceId, { usage, fetchedAt: now });
      return usage;
    } catch (e) {
      console.warn('[QuotaManager] Error fetching usage:', e);
      return {
        workspace_id: workspaceId,
        total_tokens: 0,
        total_cost_cents: 0,
        request_count: 0,
        period_start: periodStart,
        period_end: periodEnd,
      };
    }
  }

  /**
   * Get the start of the current billing period (1st of current month)
   */
  private getCurrentPeriodStart(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }

  /**
   * Get the end of a billing period (last day of month)
   */
  private getPeriodEnd(periodStart: string): string {
    const start = new Date(periodStart);
    return new Date(start.getFullYear(), start.getMonth() + 1, 0).toISOString().split('T')[0];
  }

  /**
   * Clear caches (for testing or after manual updates)
   */
  clearCache(): void {
    this.quotaCache.clear();
    this.usageCache.clear();
  }

  /**
   * Get usage summary for display
   */
  async getUsageSummary(workspaceId: string): Promise<{
    tokens_used: number;
    tokens_limit: number | null;
    cost_cents: number;
    cost_limit_cents: number | null;
    percentage: number;
    requests: number;
    period: string;
  }> {
    const [quota, usage] = await Promise.all([
      this.getWorkspaceQuota(workspaceId),
      this.getWorkspaceUsage(workspaceId),
    ]);

    let percentage = 0;
    if (quota.monthly_token_limit) {
      percentage = Math.round((usage.total_tokens / quota.monthly_token_limit) * 100);
    } else if (quota.monthly_cost_limit_cents) {
      percentage = Math.round((usage.total_cost_cents / quota.monthly_cost_limit_cents) * 100);
    }

    return {
      tokens_used: usage.total_tokens,
      tokens_limit: quota.monthly_token_limit,
      cost_cents: usage.total_cost_cents,
      cost_limit_cents: quota.monthly_cost_limit_cents,
      percentage,
      requests: usage.request_count,
      period: `${usage.period_start} - ${usage.period_end}`,
    };
  }
}

// =============================================================================
// SINGLETON & FACTORY
// =============================================================================

let quotaManagerInstance: QuotaManager | null = null;

export function getQuotaManager(supabaseClient?: SupabaseClient): QuotaManager {
  if (!quotaManagerInstance) {
    quotaManagerInstance = new QuotaManager(supabaseClient);
  }
  return quotaManagerInstance;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Quick quota check before making an AI request
 */
export async function checkWorkspaceQuota(workspaceId: string): Promise<QuotaCheckResult> {
  const manager = getQuotaManager();
  return manager.checkQuota(workspaceId);
}

/**
 * Record AI usage after a successful request
 */
export async function recordAIUsage(
  workspaceId: string,
  tokens: number,
  costCents: number
): Promise<void> {
  const manager = getQuotaManager();
  return manager.recordUsage(workspaceId, tokens, costCents);
}
