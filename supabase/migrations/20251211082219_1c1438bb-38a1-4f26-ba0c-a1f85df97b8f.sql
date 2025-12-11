-- Create media-library bucket for centralized media storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-library',
  'media-library',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
);

-- Create storage policies for media-library bucket
CREATE POLICY "Admins can upload to media-library"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media-library' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update media-library files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'media-library' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete from media-library"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media-library' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Public can view media-library files"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-library');