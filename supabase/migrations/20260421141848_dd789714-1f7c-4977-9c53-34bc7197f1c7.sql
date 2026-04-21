-- Create public bucket for email assets (logo PNG, hero gradient PNG, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read policy
DROP POLICY IF EXISTS "Email assets public read" ON storage.objects;
CREATE POLICY "Email assets public read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'email-assets');

-- Admins can upload
DROP POLICY IF EXISTS "Email assets admin upload" ON storage.objects;
CREATE POLICY "Email assets admin upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'email-assets'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can update
DROP POLICY IF EXISTS "Email assets admin update" ON storage.objects;
CREATE POLICY "Email assets admin update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'email-assets'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can delete
DROP POLICY IF EXISTS "Email assets admin delete" ON storage.objects;
CREATE POLICY "Email assets admin delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'email-assets'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);