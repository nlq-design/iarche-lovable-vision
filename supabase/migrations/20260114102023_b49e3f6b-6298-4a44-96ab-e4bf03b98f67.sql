-- =============================================================================
-- SECURITY FIX: Remaining always-true policies for internal tables
-- =============================================================================

-- Drop and recreate ai_usage_metrics INSERT policy to require authentication
DROP POLICY IF EXISTS "System can insert metrics" ON public.ai_usage_metrics;
CREATE POLICY "Authenticated users can insert AI metrics"
ON public.ai_usage_metrics FOR INSERT TO authenticated
WITH CHECK (true); -- Kept for metrics collection, requires auth

-- Drop and recreate vivier_campaign_events INSERT policy with cockpit restriction
DROP POLICY IF EXISTS "Authenticated users can insert campaign events" ON public.vivier_campaign_events;
CREATE POLICY "Cockpit users can insert campaign events"
ON public.vivier_campaign_events FOR INSERT TO authenticated
WITH CHECK (
  public.has_cockpit_access(auth.uid()) AND
  campaign_id IS NOT NULL AND
  event_type IS NOT NULL
);

-- Note: email_logs and telegram_stats are service-role only (Edge Functions)
-- These are acceptable as service_role bypasses RLS entirely and
-- policies serve as documentation. However, we can make them explicit:

DROP POLICY IF EXISTS "Service role can insert email logs" ON public.email_logs;
-- No replacement needed - service_role bypasses RLS

DROP POLICY IF EXISTS "Service role can insert telegram stats" ON public.telegram_stats;
-- No replacement needed - service_role bypasses RLS