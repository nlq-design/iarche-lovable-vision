-- (a) Table invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stripe_invoice_id text UNIQUE NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL CHECK (status IN ('draft','open','paid','uncollectible','void')),
  amount_total_cents int4,
  amount_paid_cents int4,
  currency text NOT NULL DEFAULT 'eur',
  invoice_pdf text,
  hosted_invoice_url text,
  period_start timestamptz,
  period_end timestamptz,
  due_date timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_workspace_id ON public.invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON public.invoices(stripe_invoice_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoices_select_workspace ON public.invoices;
CREATE POLICY invoices_select_workspace
ON public.invoices
FOR SELECT
TO authenticated
USING (public.can_access_workspace(workspace_id, auth.uid()));

DROP POLICY IF EXISTS invoices_modify_service_role ON public.invoices;
CREATE POLICY invoices_modify_service_role
ON public.invoices
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- (b) Table subscription_changes
CREATE TABLE IF NOT EXISTS public.subscription_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  change_type text NOT NULL CHECK (change_type IN (
    'created','upgraded','downgraded','canceled','reactivated',
    'payment_failed','payment_succeeded','trial_started','trial_ended',
    'payment_method_attached','payment_method_detached'
  )),
  from_plan_slug text,
  to_plan_slug text,
  stripe_event_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_changes_workspace_id ON public.subscription_changes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_created_at ON public.subscription_changes(created_at DESC);

ALTER TABLE public.subscription_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_changes_select_workspace ON public.subscription_changes;
CREATE POLICY subscription_changes_select_workspace
ON public.subscription_changes
FOR SELECT
TO authenticated
USING (public.can_access_workspace(workspace_id, auth.uid()));

DROP POLICY IF EXISTS subscription_changes_modify_service ON public.subscription_changes;
CREATE POLICY subscription_changes_modify_service
ON public.subscription_changes
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- (c) cancel_at_period_end
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

-- (d) Activer les 3 plans
UPDATE public.plans SET active = true
WHERE slug IN ('starter','pro','enterprise');