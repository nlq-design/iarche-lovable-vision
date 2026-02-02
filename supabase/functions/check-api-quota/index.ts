/**
 * Check API Quota Edge Function
 * 
 * Pre-request validation endpoint to check if an API call is allowed
 * based on workspace quotas, user role, and billing entity limits.
 * 
 * Usage:
 *   POST /check-api-quota
 *   {
 *     "workspaceId": "uuid",
 *     "apiCategory": "ai",        // optional
 *     "apiName": "openai",        // optional
 *     "userId": "uuid",           // optional
 *     "userRole": "admin",        // optional
 *     "billingEntityId": "uuid"   // optional
 *   }
 * 
 * Response:
 *   {
 *     "allowed": true,
 *     "usagePercent": 65,
 *     "alerts": [...],
 *     "currentUsage": { totalRequests, totalTokens, totalCostCents, ... }
 *   }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAPIQuota, QuotaCheckResult } from "../_shared/api-tracker.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckQuotaRequest {
  workspaceId: string;
  apiCategory?: string;
  apiName?: string;
  userId?: string;
  userRole?: string;
  billingEntityId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', allowed: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    
    if (authError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token', allowed: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: CheckQuotaRequest = await req.json();
    
    if (!body.workspaceId) {
      return new Response(
        JSON.stringify({ error: 'workspaceId is required', allowed: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[check-api-quota] Checking quota for:', {
      workspaceId: body.workspaceId,
      apiCategory: body.apiCategory,
      apiName: body.apiName,
      userId: body.userId || claims.claims.sub,
    });

    // Check quota
    const result: QuotaCheckResult = await checkAPIQuota({
      workspaceId: body.workspaceId,
      apiCategory: body.apiCategory as any,
      apiName: body.apiName,
      userId: body.userId || claims.claims.sub as string,
      userRole: body.userRole,
      billingEntityId: body.billingEntityId,
    });

    console.log('[check-api-quota] Result:', {
      allowed: result.allowed,
      usagePercent: result.usagePercent,
      alertCount: result.alerts.length,
    });

    // Return result
    return new Response(
      JSON.stringify({
        allowed: result.allowed,
        reason: result.reason,
        usagePercent: result.usagePercent,
        alerts: result.alerts,
        currentUsage: result.currentUsage,
        quotaApplied: result.quotaApplied ? {
          id: result.quotaApplied.id,
          apiCategory: result.quotaApplied.apiCategory,
          apiName: result.quotaApplied.apiName,
          monthlyRequestsLimit: result.quotaApplied.monthlyRequestsLimit,
          monthlyTokensLimit: result.quotaApplied.monthlyTokensLimit,
          monthlyCostLimitCents: result.quotaApplied.monthlyCostLimitCents,
          blockAtLimit: result.quotaApplied.blockAtLimit,
        } : null,
      }),
      { 
        status: result.allowed ? 200 : 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[check-api-quota] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal error',
        allowed: true, // Fail open to avoid blocking legitimate requests
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
