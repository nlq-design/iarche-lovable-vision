
-- =============================================
-- RLS HARDENING: AI Infrastructure Tables
-- =============================================

-- 1. ai_usage_metrics: restrict INSERT to service_role, SELECT to workspace members/admins
DROP POLICY IF EXISTS "Authenticated users can insert AI usage metrics" ON public.ai_usage_metrics;
DROP POLICY IF EXISTS "Authenticated users can view AI usage metrics" ON public.ai_usage_metrics;

CREATE POLICY "Only service_role can insert AI usage metrics"
ON public.ai_usage_metrics FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Admins can view all AI usage metrics"
ON public.ai_usage_metrics FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. api_usage_metrics: restrict INSERT to service_role, SELECT to admins
DROP POLICY IF EXISTS "Authenticated users can insert API usage metrics" ON public.api_usage_metrics;
DROP POLICY IF EXISTS "Authenticated users can view API usage metrics" ON public.api_usage_metrics;
DROP POLICY IF EXISTS "Users can view their own API usage metrics" ON public.api_usage_metrics;

CREATE POLICY "Only service_role can insert API usage metrics"
ON public.api_usage_metrics FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Admins can view all API usage metrics"
ON public.api_usage_metrics FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. ai_feedback: add admin global SELECT
DROP POLICY IF EXISTS "Admins can view all AI feedback" ON public.ai_feedback;

CREATE POLICY "Admins can view all AI feedback"
ON public.ai_feedback FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. ai_models: explicit admin CRUD policies
DROP POLICY IF EXISTS "Admins can manage AI models" ON public.ai_models;
DROP POLICY IF EXISTS "Authenticated users can view active AI models" ON public.ai_models;

CREATE POLICY "Authenticated users can view active AI models"
ON public.ai_models FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can insert AI models"
ON public.ai_models FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update AI models"
ON public.ai_models FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete AI models"
ON public.ai_models FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
