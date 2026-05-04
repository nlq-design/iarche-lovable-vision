-- 1. Extend partners
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS scope jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
DO $$ BEGIN
  ALTER TABLE public.partners ADD CONSTRAINT partners_status_check CHECK (status IN ('active','suspended'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS suspended_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_partners_scope_gin ON public.partners USING gin(scope);

-- 2. partner_digests
CREATE TABLE IF NOT EXISTS public.partner_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  partner_id uuid NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_digests_workspace ON public.partner_digests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_partner_digests_partner ON public.partner_digests(partner_id);
ALTER TABLE public.partner_digests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partner_digests_all" ON public.partner_digests;
CREATE POLICY "partner_digests_all" ON public.partner_digests
  FOR ALL USING (
    public.has_workspace_role(workspace_id, auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'cockpit_admin'::app_role)
  ) WITH CHECK (
    public.has_workspace_role(workspace_id, auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'cockpit_admin'::app_role)
  );

-- 3. workspace_partner_settings
CREATE TABLE IF NOT EXISTS public.workspace_partner_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  digest_enabled boolean NOT NULL DEFAULT false,
  digest_day text NOT NULL DEFAULT 'monday',
  updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE public.workspace_partner_settings ADD CONSTRAINT wps_digest_day_check
    CHECK (digest_day IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.workspace_partner_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wps_all" ON public.workspace_partner_settings;
CREATE POLICY "wps_all" ON public.workspace_partner_settings
  FOR ALL USING (
    public.has_workspace_role(workspace_id, auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'cockpit_admin'::app_role)
  ) WITH CHECK (
    public.has_workspace_role(workspace_id, auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'cockpit_admin'::app_role)
  );