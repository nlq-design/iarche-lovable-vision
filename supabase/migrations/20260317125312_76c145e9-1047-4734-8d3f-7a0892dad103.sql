CREATE TABLE IF NOT EXISTS page_sections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_slug text NOT NULL,
  section_key text NOT NULL,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(page_slug, section_key)
);

ALTER TABLE page_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access on page_sections"
ON page_sections FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admin write access on page_sections"
ON page_sections FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));