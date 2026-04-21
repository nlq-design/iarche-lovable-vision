-- =====================================================
-- PHASE 3 M1 — Billing/Subscriptions Schema
-- =====================================================

-- Ensure update_updated_at_column() exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- (A) TABLE: plans
-- =====================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  tier text NOT NULL CHECK (tier IN ('starter','pro','enterprise')),
  price_monthly_eur integer NOT NULL DEFAULT 0,
  stripe_price_id text,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plans_select_public ON public.plans;
CREATE POLICY plans_select_public ON public.plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS plans_admin_all ON public.plans;
CREATE POLICY plans_admin_all ON public.plans
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS set_plans_updated_at ON public.plans;
CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- (B) TABLE: subscriptions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing','active','past_due','canceled','incomplete','incomplete_expired','paused')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id ON public.subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_active ON public.subscriptions(status)
  WHERE status IN ('active','trialing','past_due');

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_select_workspace ON public.subscriptions;
CREATE POLICY subscriptions_select_workspace ON public.subscriptions
  FOR SELECT
  USING (public.can_access_workspace(workspace_id, auth.uid()));

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- (C) TABLE: stripe_events
-- =====================================================
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON public.stripe_events(type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_unprocessed ON public.stripe_events(processed_at)
  WHERE processed_at IS NULL;

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
-- No policies : service_role only

-- =====================================================
-- (D) ALTER workspaces — billing columns
-- =====================================================
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS billing_owner_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS subscription_tier text
    CHECK (subscription_tier IS NULL OR subscription_tier IN ('starter','pro','enterprise')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS billing_status text DEFAULT 'none'
    CHECK (billing_status IN ('none','trialing','active','past_due','canceled')),
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_workspaces_billing_owner_id ON public.workspaces(billing_owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_stripe_customer_id ON public.workspaces(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- =====================================================
-- (E) SEED — 3 plans inactifs
-- =====================================================
INSERT INTO public.plans (name, slug, tier, price_monthly_eur, features, limits, active)
VALUES
  (
    'Starter',
    'starter',
    'starter',
    99,
    '["1 workspace","Cockpit complet","Sentinel alerts","Transcription IA","Solutions module","Email chartée"]'::jsonb,
    '{"max_users":1,"max_leads_per_month":50,"max_transcriptions_per_month":10,"max_solutions_per_month":3}'::jsonb,
    false
  ),
  (
    'Pro',
    'pro',
    'pro',
    299,
    '["5 users","Cockpit complet","Sentinel alerts","Transcription IA","Solutions module","API access","White-label léger"]'::jsonb,
    '{"max_users":5,"max_leads_per_month":500,"max_transcriptions_per_month":100,"max_solutions_per_month":20}'::jsonb,
    false
  ),
  (
    'Enterprise',
    'enterprise',
    'enterprise',
    0,
    '["Unlimited users","Multi-workspace","SSO","Dedicated CSM","Custom integrations","SLA"]'::jsonb,
    '{"max_users":null,"max_leads_per_month":null,"max_transcriptions_per_month":null,"max_solutions_per_month":null}'::jsonb,
    false
  )
ON CONFLICT (slug) DO NOTHING;