/**
 * Unified API Tracking & Quota Management System
 * 
 * Tracks ALL API usage (AI, Enrichment, Email, Calendar, etc.) with:
 *   - Pre-request quota validation
 *   - Post-request usage recording
 *   - Multi-dimensional quotas (workspace, role, billing entity)
 *   - Automatic alerts at configurable thresholds
 *   - Cost estimation and tracking
 * 
 * Usage:
 *   import { APITracker, trackAPIUsage, checkAPIQuota } from "../_shared/api-tracker.ts";
 *   
 *   // Check quota before call
 *   const quotaCheck = await checkAPIQuota({ workspaceId, apiCategory: 'email' });
 *   if (!quotaCheck.allowed) throw new Error(quotaCheck.reason);
 *   
 *   // After successful call
 *   await trackAPIUsage({
 *     workspaceId,
 *     apiName: 'brevo',
 *     apiCategory: 'email',
 *     operationType: 'send_email',
 *     providerName: 'brevo',
 *     success: true,
 *     latencyMs: 250,
 *   });
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================================================
// TYPES
// =============================================================================

export type APICategory = 
  | 'ai'           // OpenAI, Anthropic, Lovable AI
  | 'enrichment'   // Pappers, Societeinfo
  | 'email'        // Brevo, Instantly
  | 'calendar'     // Google Calendar, Zoom
  | 'messaging'    // Telegram, SMS
  | 'storage'      // Supabase Storage, S3
  | 'transcription' // AssemblyAI
  | 'analytics'    // Internal analytics
  | 'other';

export interface APIUsageRecord {
  workspaceId: string;
  apiName: string;
  apiCategory: APICategory;
  operationType: string;
  providerName: string;
  
  // Optional metrics
  userId?: string;
  billingEntityId?: string;
  entityType?: string;
  entityId?: string;
  modelId?: string;
  
  // Token metrics (for AI)
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  
  // Request metrics
  requestCount?: number;
  latencyMs?: number;
  success?: boolean;
  errorCode?: string;
  errorMessage?: string;
  
  // Cost
  estimatedCostCents?: number;
  
  // Extra data
  metadata?: Record<string, unknown>;
}

export interface APIQuota {
  id: string;
  workspaceId: string | null;
  billingEntityId: string | null;
  userRole: string | null;
  apiCategory: APICategory | null;
  apiName: string | null;
  providerName: string | null;
  
  // Limits
  monthlyRequestsLimit: number | null;
  monthlyTokensLimit: number | null;
  monthlyCostLimitCents: number | null;
  dailyRequestsLimit: number | null;
  requestsPerMinute: number | null;
  
  // Alerting
  alertThresholdWarning: number;   // e.g., 80
  alertThresholdCritical: number;  // e.g., 95
  alertEmails: string[];
  alertChannels: string[];
  blockAtLimit: boolean;
  
  priority: number;
  isActive: boolean;
}

export interface APIUsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCostCents: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  usagePercent: number;
  quotaApplied: APIQuota | null;
  currentUsage: APIUsageStats;
  alerts: QuotaAlert[];
}

export interface QuotaAlert {
  type: 'warning' | 'critical' | 'blocked';
  message: string;
  thresholdPercent: number;
  currentPercent: number;
  apiCategory?: string;
  apiName?: string;
}

export interface CheckQuotaParams {
  workspaceId: string;
  userId?: string;
  userRole?: string;
  billingEntityId?: string;
  apiCategory?: APICategory;
  apiName?: string;
  providerName?: string;
}

// =============================================================================
// API PRICING REFERENCE
// =============================================================================

const DEFAULT_PRICING: Record<string, { perRequest?: number; per1kTokens?: number }> = {
  // AI providers (per 1k tokens in cents)
  'openai:gpt-4o': { per1kTokens: 0.5 },
  'openai:gpt-4o-mini': { per1kTokens: 0.03 },
  'openai:gpt-4': { per1kTokens: 3.0 },
  'anthropic:claude-3-opus': { per1kTokens: 1.5 },
  'anthropic:claude-3-sonnet': { per1kTokens: 0.3 },
  'anthropic:claude-3-haiku': { per1kTokens: 0.025 },
  'lovable_ai:gemini-flash': { per1kTokens: 0.01 },
  'lovable_ai:gemini-pro': { per1kTokens: 0.05 },
  'openai:text-embedding-3-small': { per1kTokens: 0.002 },
  
  // Enrichment (per request in cents)
  'pappers:search': { perRequest: 1.0 },
  'pappers:company': { perRequest: 2.0 },
  'societeinfo:search': { perRequest: 1.5 },
  
  // Email (per request in cents)
  'brevo:send': { perRequest: 0.1 },
  'brevo:campaign': { perRequest: 0.5 },
  'instantly:send': { perRequest: 0.2 },
  
  // Calendar (typically free or flat rate)
  'google_calendar:create': { perRequest: 0 },
  'google_calendar:sync': { perRequest: 0 },
  'zoom:create_meeting': { perRequest: 0 },
  
  // Messaging
  'telegram:send': { perRequest: 0 },
  
  // Transcription (AssemblyAI — ~$0.37/hour)
  'assemblyai:transcribe': { perRequest: 0.62 }, // ~$0.0062/min
  
  // Default for unknown
  'default': { perRequest: 0.1 },
};

// =============================================================================
// API TRACKER CLASS
// =============================================================================

export class APITracker {
  // deno-lint-ignore no-explicit-any
  private supabase: SupabaseClient<any>;
  private quotaCache: Map<string, { quotas: APIQuota[]; fetchedAt: number }> = new Map();
  private usageCache: Map<string, { stats: APIUsageStats; fetchedAt: number }> = new Map();
  private pricingCache: Map<string, { perRequest?: number; per1kTokens?: number }> = new Map();
  
  private readonly CACHE_TTL_MS = 30000; // 30 seconds
  private readonly DEFAULT_WARNING_THRESHOLD = 80;
  private readonly DEFAULT_CRITICAL_THRESHOLD = 95;

  constructor(supabaseClient?: SupabaseClient) {
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
  }

  // ===========================================================================
  // QUOTA CHECKING
  // ===========================================================================

  /**
   * Check if an API request is allowed based on quotas
   */
  async checkQuota(params: CheckQuotaParams): Promise<QuotaCheckResult> {
    const quotas = await this.getApplicableQuotas(params);
    const currentUsage = await this.getCurrentUsage(params);
    
    const alerts: QuotaAlert[] = [];
    let allowed = true;
    let reason: string | undefined;
    let usagePercent = 0;
    let quotaApplied: APIQuota | null = null;

    // Find the most restrictive applicable quota
    for (const quota of quotas) {
      const checkResult = this.evaluateQuota(quota, currentUsage);
      
      if (checkResult.percent > usagePercent) {
        usagePercent = checkResult.percent;
        quotaApplied = quota;
      }
      
      // Check thresholds
      if (checkResult.percent >= 100) {
        alerts.push({
          type: 'blocked',
          message: `Quota épuisé: ${checkResult.limitType} (${checkResult.percent}%)`,
          thresholdPercent: 100,
          currentPercent: checkResult.percent,
          apiCategory: quota.apiCategory || undefined,
          apiName: quota.apiName || undefined,
        });
        
        if (quota.blockAtLimit) {
          allowed = false;
          reason = `Quota ${checkResult.limitType} dépassé (${checkResult.percent}%). ${
            quota.apiName ? `API: ${quota.apiName}` : quota.apiCategory ? `Catégorie: ${quota.apiCategory}` : 'Global'
          }`;
        }
      } else if (checkResult.percent >= quota.alertThresholdCritical) {
        alerts.push({
          type: 'critical',
          message: `Seuil critique: ${checkResult.limitType} (${checkResult.percent}%)`,
          thresholdPercent: quota.alertThresholdCritical,
          currentPercent: checkResult.percent,
          apiCategory: quota.apiCategory || undefined,
          apiName: quota.apiName || undefined,
        });
      } else if (checkResult.percent >= quota.alertThresholdWarning) {
        alerts.push({
          type: 'warning',
          message: `Seuil d'alerte: ${checkResult.limitType} (${checkResult.percent}%)`,
          thresholdPercent: quota.alertThresholdWarning,
          currentPercent: checkResult.percent,
          apiCategory: quota.apiCategory || undefined,
          apiName: quota.apiName || undefined,
        });
      }
    }

    return {
      allowed,
      reason,
      usagePercent,
      quotaApplied,
      currentUsage,
      alerts,
    };
  }

  private evaluateQuota(
    quota: APIQuota, 
    usage: APIUsageStats
  ): { percent: number; limitType: string } {
    let maxPercent = 0;
    let limitType = 'requests';

    // Check requests limit
    if (quota.monthlyRequestsLimit && quota.monthlyRequestsLimit > 0) {
      const percent = Math.round((usage.totalRequests / quota.monthlyRequestsLimit) * 100);
      if (percent > maxPercent) {
        maxPercent = percent;
        limitType = 'requêtes mensuelles';
      }
    }

    // Check tokens limit
    if (quota.monthlyTokensLimit && quota.monthlyTokensLimit > 0) {
      const percent = Math.round((usage.totalTokens / quota.monthlyTokensLimit) * 100);
      if (percent > maxPercent) {
        maxPercent = percent;
        limitType = 'tokens mensuels';
      }
    }

    // Check cost limit
    if (quota.monthlyCostLimitCents && quota.monthlyCostLimitCents > 0) {
      const percent = Math.round((usage.totalCostCents / quota.monthlyCostLimitCents) * 100);
      if (percent > maxPercent) {
        maxPercent = percent;
        limitType = 'budget mensuel';
      }
    }

    return { percent: maxPercent, limitType };
  }

  // ===========================================================================
  // USAGE RECORDING
  // ===========================================================================

  /**
   * Record API usage after a request
   */
  async recordUsage(record: APIUsageRecord): Promise<void> {
    try {
      // Calculate cost if not provided
      const costCents = record.estimatedCostCents ?? 
        this.estimateCost(record);

      // Try RPC first for atomic operation
      const { error: rpcError } = await this.supabase.rpc('record_api_usage', {
        p_workspace_id: record.workspaceId,
        p_api_name: record.apiName,
        p_api_category: record.apiCategory,
        p_operation_type: record.operationType,
        p_provider_name: record.providerName,
        p_user_id: record.userId || null,
        p_billing_entity_id: record.billingEntityId || null,
        p_entity_type: record.entityType || null,
        p_entity_id: record.entityId || null,
        p_model_id: record.modelId || null,
        p_input_tokens: record.inputTokens || 0,
        p_output_tokens: record.outputTokens || 0,
        p_total_tokens: record.totalTokens || (record.inputTokens || 0) + (record.outputTokens || 0),
        p_request_count: record.requestCount || 1,
        p_latency_ms: record.latencyMs || null,
        p_success: record.success ?? true,
        p_error_code: record.errorCode || null,
        p_error_message: record.errorMessage || null,
        p_estimated_cost_cents: costCents,
        p_metadata: record.metadata || null,
      });

      if (rpcError) {
        console.warn('[APITracker] RPC failed, falling back to direct insert:', rpcError.message);
        await this.recordUsageDirectly(record, costCents);
      }

      // Invalidate cache for this workspace
      this.invalidateUsageCache(record.workspaceId, record.apiCategory, record.apiName);

      // Check and create alerts if thresholds crossed
      await this.checkAndCreateAlerts(record.workspaceId, record.apiCategory, record.apiName);

    } catch (e) {
      console.error('[APITracker] Error recording usage:', e);
      // Non-blocking - don't fail the main request
    }
  }

  /**
   * Direct insert fallback if RPC not available
   */
  private async recordUsageDirectly(record: APIUsageRecord, costCents: number): Promise<void> {
    await this.supabase.from('api_usage_metrics').insert({
      workspace_id: record.workspaceId,
      api_name: record.apiName,
      api_category: record.apiCategory,
      operation_type: record.operationType,
      provider_name: record.providerName,
      user_id: record.userId,
      billing_entity_id: record.billingEntityId,
      entity_type: record.entityType,
      entity_id: record.entityId,
      model_id: record.modelId,
      input_tokens: record.inputTokens || 0,
      output_tokens: record.outputTokens || 0,
      total_tokens: record.totalTokens || (record.inputTokens || 0) + (record.outputTokens || 0),
      request_count: record.requestCount || 1,
      latency_ms: record.latencyMs,
      success: record.success ?? true,
      error_code: record.errorCode,
      error_message: record.errorMessage,
      estimated_cost_cents: costCents,
      metadata: record.metadata,
    });
  }

  // ===========================================================================
  // COST ESTIMATION
  // ===========================================================================

  /**
   * Estimate cost based on pricing rules
   */
  estimateCost(record: APIUsageRecord): number {
    const key = `${record.providerName}:${record.modelId || record.operationType}`;
    let pricing = this.pricingCache.get(key);
    
    if (!pricing) {
      pricing = DEFAULT_PRICING[key] || DEFAULT_PRICING[record.providerName] || DEFAULT_PRICING['default'];
      this.pricingCache.set(key, pricing);
    }

    let cost = 0;

    // Token-based pricing (AI)
    if (pricing.per1kTokens && record.totalTokens) {
      cost = (record.totalTokens / 1000) * pricing.per1kTokens;
    }
    // Request-based pricing
    else if (pricing.perRequest) {
      cost = pricing.perRequest * (record.requestCount || 1);
    }

    return Math.ceil(cost * 100) / 100; // Round to 2 decimal cents
  }

  /**
   * Load pricing from database (call periodically or on startup)
   */
  async loadPricingFromDB(): Promise<void> {
    try {
      const { data } = await this.supabase
        .from('api_pricing')
        .select('*')
        .eq('is_active', true);

      if (data) {
        for (const row of data) {
          const key = row.model_id 
            ? `${row.provider_name}:${row.model_id}`
            : `${row.provider_name}:${row.api_name}`;
          
          this.pricingCache.set(key, {
            perRequest: row.cost_per_request_cents || undefined,
            per1kTokens: row.cost_per_1k_input_tokens || row.cost_per_1k_output_tokens || undefined,
          });
        }
        console.log(`[APITracker] Loaded ${data.length} pricing rules from DB`);
      }
    } catch (e) {
      console.warn('[APITracker] Failed to load pricing from DB, using defaults:', e);
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Get applicable quotas for the given parameters (ordered by priority)
   */
  private async getApplicableQuotas(params: CheckQuotaParams): Promise<APIQuota[]> {
    const cacheKey = `${params.workspaceId}:${params.apiCategory || ''}:${params.apiName || ''}`;
    const cached = this.quotaCache.get(cacheKey);
    
    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL_MS) {
      return cached.quotas;
    }

    try {
      let query = this.supabase
        .from('api_quotas')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true });

      // Filter by workspace or global
      query = query.or(`workspace_id.eq.${params.workspaceId},workspace_id.is.null`);
      
      // Filter by category or global
      if (params.apiCategory) {
        query = query.or(`api_category.eq.${params.apiCategory},api_category.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[APITracker] Failed to fetch quotas:', error.message);
        return [];
      }

      const quotas: APIQuota[] = (data || []).map(row => ({
        id: row.id,
        workspaceId: row.workspace_id,
        billingEntityId: row.billing_entity_id,
        userRole: row.user_role,
        apiCategory: row.api_category as APICategory,
        apiName: row.api_name,
        providerName: row.provider_name,
        monthlyRequestsLimit: row.monthly_requests_limit,
        monthlyTokensLimit: row.monthly_tokens_limit,
        monthlyCostLimitCents: row.monthly_cost_limit_cents,
        dailyRequestsLimit: row.daily_requests_limit,
        requestsPerMinute: row.requests_per_minute,
        alertThresholdWarning: row.alert_threshold_warning ?? this.DEFAULT_WARNING_THRESHOLD,
        alertThresholdCritical: row.alert_threshold_critical ?? this.DEFAULT_CRITICAL_THRESHOLD,
        alertEmails: row.alert_emails || [],
        alertChannels: row.alert_channels || [],
        blockAtLimit: row.block_at_limit ?? false,
        priority: row.priority ?? 100,
        isActive: row.is_active ?? true,
      }));

      this.quotaCache.set(cacheKey, { quotas, fetchedAt: Date.now() });
      return quotas;

    } catch (e) {
      console.warn('[APITracker] Error fetching quotas:', e);
      return [];
    }
  }

  /**
   * Get current usage stats for the billing period
   */
  private async getCurrentUsage(params: CheckQuotaParams): Promise<APIUsageStats> {
    const cacheKey = `usage:${params.workspaceId}:${params.apiCategory || 'all'}:${params.apiName || 'all'}`;
    const cached = this.usageCache.get(cacheKey);
    
    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL_MS) {
      return cached.stats;
    }

    try {
      // Get start of current month
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      let query = this.supabase
        .from('api_usage_metrics')
        .select('request_count, total_tokens, estimated_cost_cents, success, latency_ms')
        .eq('workspace_id', params.workspaceId)
        .gte('created_at', periodStart);

      if (params.apiCategory) {
        query = query.eq('api_category', params.apiCategory);
      }
      if (params.apiName) {
        query = query.eq('api_name', params.apiName);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[APITracker] Failed to fetch usage:', error.message);
        return this.emptyStats();
      }

      const stats: APIUsageStats = {
        totalRequests: 0,
        totalTokens: 0,
        totalCostCents: 0,
        successCount: 0,
        errorCount: 0,
        avgLatencyMs: 0,
      };

      let totalLatency = 0;
      let latencyCount = 0;

      for (const row of data || []) {
        stats.totalRequests += row.request_count || 1;
        stats.totalTokens += row.total_tokens || 0;
        stats.totalCostCents += Number(row.estimated_cost_cents) || 0;
        
        if (row.success) {
          stats.successCount++;
        } else {
          stats.errorCount++;
        }
        
        if (row.latency_ms) {
          totalLatency += row.latency_ms;
          latencyCount++;
        }
      }

      stats.avgLatencyMs = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;

      this.usageCache.set(cacheKey, { stats, fetchedAt: Date.now() });
      return stats;

    } catch (e) {
      console.warn('[APITracker] Error fetching usage:', e);
      return this.emptyStats();
    }
  }

  private emptyStats(): APIUsageStats {
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCostCents: 0,
      successCount: 0,
      errorCount: 0,
      avgLatencyMs: 0,
    };
  }

  private invalidateUsageCache(workspaceId: string, category?: string, apiName?: string): void {
    // Invalidate all related cache entries
    const keysToDelete: string[] = [];
    for (const key of this.usageCache.keys()) {
      if (key.startsWith(`usage:${workspaceId}`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(k => this.usageCache.delete(k));
  }

  /**
   * Check if any thresholds were crossed and create alerts
   */
  private async checkAndCreateAlerts(
    workspaceId: string, 
    apiCategory?: string, 
    apiName?: string
  ): Promise<void> {
    try {
      const quotaCheck = await this.checkQuota({ 
        workspaceId, 
        apiCategory: apiCategory as APICategory,
        apiName,
      });

      for (const alert of quotaCheck.alerts) {
        // Only create alert if it's warning or higher
        if (alert.type === 'warning' || alert.type === 'critical' || alert.type === 'blocked') {
          await this.supabase.from('api_quota_alerts').insert({
            workspace_id: workspaceId,
            quota_id: quotaCheck.quotaApplied?.id,
            alert_type: alert.type,
            metric_type: 'combined',
            current_value: quotaCheck.currentUsage.totalRequests,
            limit_value: quotaCheck.quotaApplied?.monthlyRequestsLimit || 0,
            current_usage_percent: alert.currentPercent,
            api_category: alert.apiCategory,
            api_name: alert.apiName,
            metadata: {
              message: alert.message,
              threshold: alert.thresholdPercent,
            },
          });
        }
      }
    } catch (e) {
      // Non-blocking
      console.warn('[APITracker] Failed to create alerts:', e);
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.quotaCache.clear();
    this.usageCache.clear();
    this.pricingCache.clear();
  }
}

// =============================================================================
// SINGLETON & CONVENIENCE FUNCTIONS
// =============================================================================

let trackerInstance: APITracker | null = null;

export function getAPITracker(supabaseClient?: SupabaseClient): APITracker {
  if (!trackerInstance) {
    trackerInstance = new APITracker(supabaseClient);
  }
  return trackerInstance;
}

/**
 * Quick quota check before making an API request
 */
export async function checkAPIQuota(params: CheckQuotaParams): Promise<QuotaCheckResult> {
  const tracker = getAPITracker();
  return tracker.checkQuota(params);
}

/**
 * Record API usage after a request
 */
export async function trackAPIUsage(record: APIUsageRecord): Promise<void> {
  const tracker = getAPITracker();
  return tracker.recordUsage(record);
}

/**
 * Convenience wrapper for tracking with automatic timing
 */
export function createAPICallTracker(
  baseParams: Pick<APIUsageRecord, 'workspaceId' | 'apiName' | 'apiCategory' | 'providerName'>
) {
  const startTime = Date.now();
  
  return {
    async success(
      operationType: string, 
      extra?: Partial<APIUsageRecord>
    ): Promise<void> {
      await trackAPIUsage({
        ...baseParams,
        operationType,
        latencyMs: Date.now() - startTime,
        success: true,
        ...extra,
      });
    },
    
    async error(
      operationType: string,
      errorCode: string,
      errorMessage: string,
      extra?: Partial<APIUsageRecord>
    ): Promise<void> {
      await trackAPIUsage({
        ...baseParams,
        operationType,
        latencyMs: Date.now() - startTime,
        success: false,
        errorCode,
        errorMessage,
        ...extra,
      });
    },
  };
}

// =============================================================================
// QUOTA EXCEEDED ERROR
// =============================================================================

export class APIQuotaExceededError extends Error {
  constructor(
    message: string,
    public readonly usagePercent: number,
    public readonly workspaceId: string,
    public readonly apiCategory?: string,
    public readonly apiName?: string
  ) {
    super(message);
    this.name = 'APIQuotaExceededError';
  }
}
