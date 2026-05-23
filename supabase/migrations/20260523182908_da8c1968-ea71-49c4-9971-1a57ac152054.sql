
-- Branding table
CREATE TABLE public.workspace_branding (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  brand_name text,
  tagline text,
  logo_url text,
  logo_dark_url text,
  favicon_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  background_color text,
  text_color text,
  heading_font text,
  body_font text,
  footer_text text,
  email_signature_html text,
  document_header_html text,
  document_footer_html text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read branding"
ON public.workspace_branding FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners write branding"
ON public.workspace_branding FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.billing_owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id = workspace_branding.workspace_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin'))
);

CREATE POLICY "Owners update branding"
ON public.workspace_branding FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.billing_owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id = workspace_branding.workspace_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin'))
);

CREATE POLICY "Owners delete branding"
ON public.workspace_branding FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.billing_owner_id = auth.uid())
);

CREATE TRIGGER set_workspace_branding_updated_at
BEFORE UPDATE ON public.workspace_branding
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket (public for logo display)
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-branding', 'workspace-branding', true)
ON CONFLICT (id) DO NOTHING;

-- Files are stored under {workspace_id}/...
CREATE POLICY "Branding assets public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'workspace-branding');

CREATE POLICY "Branding assets workspace upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'workspace-branding'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_workspace_member(
      (regexp_split_to_array(name, '/'))[1]::uuid,
      auth.uid()
    )
  )
);

CREATE POLICY "Branding assets workspace update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'workspace-branding'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_workspace_member(
      (regexp_split_to_array(name, '/'))[1]::uuid,
      auth.uid()
    )
  )
);

CREATE POLICY "Branding assets workspace delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'workspace-branding'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_workspace_member(
      (regexp_split_to_array(name, '/'))[1]::uuid,
      auth.uid()
    )
  )
);
