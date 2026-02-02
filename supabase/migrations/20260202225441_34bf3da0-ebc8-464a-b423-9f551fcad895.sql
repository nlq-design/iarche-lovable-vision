-- ==============================================
-- API GOVERNANCE: Unified Usage & Quota System
-- ==============================================

-- 1. Table unifiée pour TOUTES les APIs (IA + Externes)
CREATE TABLE public.api_usage_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- API identification
  api_name TEXT NOT NULL, -- 'suggest-tags', 'pappers-lookup', 'send-brevo-campaign', etc.
  api_category TEXT NOT NULL, -- 'ai', 'enrichment', 'email', 'calendar', 'messaging'
  provider_name TEXT NOT NULL, -- 'lovable_ai', 'openai', 'pappers', 'brevo', 'instantly', 'google', 'telegram'
  
  -- Multi-tenant
  workspace_id UUID NOT NULL,
  user_id UUID,
  billing_entity_id UUID,
  
  -- Request details
  operation_type TEXT NOT NULL, -- 'chat', 'embedding', 'lookup', 'send', 'sync'
  model_id TEXT, -- For AI: 'gpt-4o', 'gemini-2.5-flash', etc.
  
  -- Metrics
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  request_count INTEGER DEFAULT 1,
  latency_ms INTEGER,
  
  -- Cost tracking
  estimated_cost_cents NUMERIC(10,4) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  
  -- Status
  success BOOLEAN DEFAULT true,
  error_code TEXT,
  error_message TEXT,
  
  -- Context
  entity_type TEXT, -- 'lead', 'opportunity', 'article', etc.
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_api_usage_workspace_date ON api_usage_metrics(workspace_id, created_at DESC);
CREATE INDEX idx_api_usage_api_name ON api_usage_metrics(api_name, created_at DESC);
CREATE INDEX idx_api_usage_provider ON api_usage_metrics(provider_name, created_at DESC);
CREATE INDEX idx_api_usage_billing_entity ON api_usage_metrics(billing_entity_id, created_at DESC) WHERE billing_entity_id IS NOT NULL;
CREATE INDEX idx_api_usage_user ON api_usage_metrics(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- RLS
ALTER TABLE api_usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all usage metrics"
  ON api_usage_metrics FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can view their workspace usage"
  ON api_usage_metrics FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can insert usage metrics"
  ON api_usage_metrics FOR INSERT
  WITH CHECK (true);

-- 2. Quotas multi-dimensionnels
CREATE TABLE public.api_quotas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Scope (au moins un doit être renseigné)
  workspace_id UUID,
  user_role TEXT, -- 'admin', 'partner', 'user'
  billing_entity_id UUID,
  
  -- API scope
  api_name TEXT, -- NULL = toutes les APIs
  api_category TEXT, -- NULL = toutes les catégories, sinon 'ai', 'enrichment', 'email'
  provider_name TEXT, -- NULL = tous les providers
  
  -- Limites
  monthly_requests_limit INTEGER,
  monthly_tokens_limit INTEGER,
  monthly_cost_limit_cents INTEGER,
  daily_requests_limit INTEGER,
  
  -- Rate limiting
  requests_per_minute INTEGER DEFAULT 60,
  
  -- Alertes (pourcentages)
  alert_threshold_warning INTEGER DEFAULT 80,
  alert_threshold_critical INTEGER DEFAULT 95,
  block_at_limit BOOLEAN DEFAULT false,
  
  -- Configuration alertes
  alert_channels TEXT[] DEFAULT ARRAY['in_app']::TEXT[], -- 'in_app', 'email', 'telegram'
  alert_emails TEXT[],
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Priorité (plus haut = prioritaire)
  priority INTEGER DEFAULT 0,
  
  CONSTRAINT api_quotas_scope_check CHECK (
    workspace_id IS NOT NULL OR user_role IS NOT NULL OR billing_entity_id IS NOT NULL
  )
);

CREATE INDEX idx_api_quotas_workspace ON api_quotas(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_api_quotas_role ON api_quotas(user_role) WHERE user_role IS NOT NULL;
CREATE INDEX idx_api_quotas_billing ON api_quotas(billing_entity_id) WHERE billing_entity_id IS NOT NULL;

ALTER TABLE api_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage quotas"
  ON api_quotas FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 3. Historique des alertes
CREATE TABLE public.api_quota_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  quota_id UUID REFERENCES api_quotas(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  
  alert_type TEXT NOT NULL, -- 'warning', 'critical', 'blocked'
  api_name TEXT,
  api_category TEXT,
  
  -- Metrics au moment de l'alerte
  current_usage_percent INTEGER NOT NULL,
  current_value NUMERIC NOT NULL,
  limit_value NUMERIC NOT NULL,
  metric_type TEXT NOT NULL, -- 'requests', 'tokens', 'cost'
  
  -- Channels notifiés
  channels_notified TEXT[],
  notification_sent_at TIMESTAMPTZ,
  
  -- Acknowledgement
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_quota_alerts_workspace ON api_quota_alerts(workspace_id, created_at DESC);
CREATE INDEX idx_quota_alerts_unacked ON api_quota_alerts(workspace_id) WHERE acknowledged_at IS NULL;

ALTER TABLE api_quota_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all alerts"
  ON api_quota_alerts FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 4. Coûts de référence par API
CREATE TABLE public.api_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  api_name TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  model_id TEXT, -- Pour les APIs IA avec plusieurs modèles
  
  -- Pricing
  cost_per_request_cents NUMERIC(10,6) DEFAULT 0,
  cost_per_1k_input_tokens NUMERIC(10,6),
  cost_per_1k_output_tokens NUMERIC(10,6),
  cost_per_unit_cents NUMERIC(10,6), -- Pour les APIs facturées à l'unité (emails, lookups)
  
  -- Included quota (forfait)
  free_tier_requests INTEGER DEFAULT 0,
  free_tier_tokens INTEGER DEFAULT 0,
  
  currency TEXT DEFAULT 'EUR',
  effective_from TIMESTAMPTZ DEFAULT now(),
  effective_until TIMESTAMPTZ,
  
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(api_name, provider_name, model_id, effective_from)
);

ALTER TABLE api_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pricing"
  ON api_pricing FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Anyone can view pricing"
  ON api_pricing FOR SELECT
  USING (true);

-- 5. Vue agrégée pour le dashboard
CREATE OR REPLACE VIEW api_usage_summary AS
SELECT 
  workspace_id,
  api_category,
  provider_name,
  api_name,
  DATE_TRUNC('day', created_at) as usage_date,
  DATE_TRUNC('month', created_at) as usage_month,
  COUNT(*) as request_count,
  SUM(total_tokens) as total_tokens,
  SUM(estimated_cost_cents) as total_cost_cents,
  AVG(latency_ms)::INTEGER as avg_latency_ms,
  COUNT(*) FILTER (WHERE success = true) as success_count,
  COUNT(*) FILTER (WHERE success = false) as error_count
FROM api_usage_metrics
GROUP BY 
  workspace_id, 
  api_category, 
  provider_name, 
  api_name,
  DATE_TRUNC('day', created_at),
  DATE_TRUNC('month', created_at);

-- 6. Fonction pour calculer l'usage courant vs quotas
CREATE OR REPLACE FUNCTION get_api_usage_status(
  p_workspace_id UUID,
  p_api_name TEXT DEFAULT NULL,
  p_period TEXT DEFAULT 'month' -- 'day' or 'month'
)
RETURNS TABLE (
  api_name TEXT,
  api_category TEXT,
  provider_name TEXT,
  request_count BIGINT,
  total_tokens BIGINT,
  total_cost_cents NUMERIC,
  quota_requests INTEGER,
  quota_tokens INTEGER,
  quota_cost INTEGER,
  usage_percent_requests NUMERIC,
  usage_percent_tokens NUMERIC,
  usage_percent_cost NUMERIC,
  status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH period_usage AS (
    SELECT 
      u.api_name,
      u.api_category,
      u.provider_name,
      COUNT(*)::BIGINT as req_count,
      COALESCE(SUM(u.total_tokens), 0)::BIGINT as tok_count,
      COALESCE(SUM(u.estimated_cost_cents), 0)::NUMERIC as cost_sum
    FROM api_usage_metrics u
    WHERE u.workspace_id = p_workspace_id
      AND (p_api_name IS NULL OR u.api_name = p_api_name)
      AND u.created_at >= CASE 
        WHEN p_period = 'day' THEN DATE_TRUNC('day', NOW())
        ELSE DATE_TRUNC('month', NOW())
      END
    GROUP BY u.api_name, u.api_category, u.provider_name
  ),
  applicable_quotas AS (
    SELECT DISTINCT ON (q.api_name, q.api_category)
      q.api_name,
      q.api_category,
      CASE WHEN p_period = 'day' THEN q.daily_requests_limit ELSE q.monthly_requests_limit END as req_limit,
      q.monthly_tokens_limit as tok_limit,
      q.monthly_cost_limit_cents as cost_limit
    FROM api_quotas q
    WHERE q.is_active = true
      AND (q.workspace_id = p_workspace_id OR q.workspace_id IS NULL)
    ORDER BY q.api_name, q.api_category, q.priority DESC
  )
  SELECT 
    pu.api_name,
    pu.api_category,
    pu.provider_name,
    pu.req_count,
    pu.tok_count,
    pu.cost_sum,
    aq.req_limit,
    aq.tok_limit,
    aq.cost_limit,
    CASE WHEN aq.req_limit > 0 THEN ROUND((pu.req_count::NUMERIC / aq.req_limit) * 100, 1) ELSE 0 END,
    CASE WHEN aq.tok_limit > 0 THEN ROUND((pu.tok_count::NUMERIC / aq.tok_limit) * 100, 1) ELSE 0 END,
    CASE WHEN aq.cost_limit > 0 THEN ROUND((pu.cost_sum / aq.cost_limit) * 100, 1) ELSE 0 END,
    CASE 
      WHEN GREATEST(
        CASE WHEN aq.req_limit > 0 THEN (pu.req_count::NUMERIC / aq.req_limit) * 100 ELSE 0 END,
        CASE WHEN aq.tok_limit > 0 THEN (pu.tok_count::NUMERIC / aq.tok_limit) * 100 ELSE 0 END,
        CASE WHEN aq.cost_limit > 0 THEN (pu.cost_sum / aq.cost_limit) * 100 ELSE 0 END
      ) >= 100 THEN 'blocked'
      WHEN GREATEST(
        CASE WHEN aq.req_limit > 0 THEN (pu.req_count::NUMERIC / aq.req_limit) * 100 ELSE 0 END,
        CASE WHEN aq.tok_limit > 0 THEN (pu.tok_count::NUMERIC / aq.tok_limit) * 100 ELSE 0 END,
        CASE WHEN aq.cost_limit > 0 THEN (pu.cost_sum / aq.cost_limit) * 100 ELSE 0 END
      ) >= 95 THEN 'critical'
      WHEN GREATEST(
        CASE WHEN aq.req_limit > 0 THEN (pu.req_count::NUMERIC / aq.req_limit) * 100 ELSE 0 END,
        CASE WHEN aq.tok_limit > 0 THEN (pu.tok_count::NUMERIC / aq.tok_limit) * 100 ELSE 0 END,
        CASE WHEN aq.cost_limit > 0 THEN (pu.cost_sum / aq.cost_limit) * 100 ELSE 0 END
      ) >= 80 THEN 'warning'
      ELSE 'ok'
    END
  FROM period_usage pu
  LEFT JOIN applicable_quotas aq ON (aq.api_name = pu.api_name OR aq.api_name IS NULL)
    AND (aq.api_category = pu.api_category OR aq.api_category IS NULL);
END;
$$;

-- 7. Fonction atomique pour incrémenter l'usage
CREATE OR REPLACE FUNCTION record_api_usage(
  p_api_name TEXT,
  p_api_category TEXT,
  p_provider_name TEXT,
  p_workspace_id UUID,
  p_operation_type TEXT,
  p_input_tokens INTEGER DEFAULT 0,
  p_output_tokens INTEGER DEFAULT 0,
  p_latency_ms INTEGER DEFAULT NULL,
  p_estimated_cost_cents NUMERIC DEFAULT 0,
  p_success BOOLEAN DEFAULT true,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_billing_entity_id UUID DEFAULT NULL,
  p_model_id TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage_id UUID;
BEGIN
  INSERT INTO api_usage_metrics (
    api_name, api_category, provider_name, workspace_id, operation_type,
    input_tokens, output_tokens, latency_ms, estimated_cost_cents,
    success, error_code, error_message, user_id, billing_entity_id,
    model_id, entity_type, entity_id, metadata
  ) VALUES (
    p_api_name, p_api_category, p_provider_name, p_workspace_id, p_operation_type,
    p_input_tokens, p_output_tokens, p_latency_ms, p_estimated_cost_cents,
    p_success, p_error_code, p_error_message, p_user_id, p_billing_entity_id,
    p_model_id, p_entity_type, p_entity_id, p_metadata
  )
  RETURNING id INTO v_usage_id;
  
  RETURN v_usage_id;
END;
$$;

-- 8. Données initiales de pricing
INSERT INTO api_pricing (api_name, provider_name, model_id, cost_per_1k_input_tokens, cost_per_1k_output_tokens, cost_per_request_cents) VALUES
-- AI - Lovable AI (via gateway)
('suggest-tags', 'lovable_ai', 'gemini-2.5-flash', 0.0375, 0.15, 0),
('search-embeddings', 'openai', 'text-embedding-3-small', 0.02, 0, 0),
('generate-embeddings', 'openai', 'text-embedding-3-small', 0.02, 0, 0),
('generate-document', 'lovable_ai', 'gemini-2.5-flash', 0.0375, 0.15, 0),
('vivier-ai-search', 'lovable_ai', 'gemini-2.5-flash', 0.0375, 0.15, 0),
('ai-agent-orchestrator', 'lovable_ai', 'gemini-2.5-pro', 1.25, 5.0, 0),
-- External APIs
('pappers-lookup', 'pappers', NULL, NULL, NULL, 1.0), -- ~1 centime par lookup
('send-brevo-campaign', 'brevo', NULL, NULL, NULL, 0.5), -- ~0.5 centime par email
('send-instantly-campaign', 'instantly', NULL, NULL, NULL, 0.3), -- ~0.3 centime par email
('push-to-google-calendar', 'google', NULL, NULL, NULL, 0), -- Gratuit
('sync-google-calendar', 'google', NULL, NULL, NULL, 0); -- Gratuit

-- 9. Quotas par défaut
INSERT INTO api_quotas (workspace_id, user_role, api_category, monthly_requests_limit, monthly_tokens_limit, monthly_cost_limit_cents, alert_channels) VALUES
-- Quotas globaux par rôle
(NULL, 'admin', NULL, NULL, NULL, NULL, ARRAY['in_app']), -- Admins illimités
(NULL, 'partner', 'ai', 1000, 500000, 5000, ARRAY['in_app', 'email']), -- Partners: 1k requêtes IA, 500k tokens, 50€
(NULL, 'user', 'ai', 100, 50000, 500, ARRAY['in_app']); -- Users: 100 requêtes, 50k tokens, 5€