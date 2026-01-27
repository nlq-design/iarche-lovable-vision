-- =====================================================
-- PHASE 2.3: Fix Security Definer View
-- =====================================================

-- Fix partner_activity_feed view - Add security_invoker
ALTER VIEW public.partner_activity_feed SET (security_invoker = on);