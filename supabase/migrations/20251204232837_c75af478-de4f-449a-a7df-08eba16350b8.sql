-- Create storage bucket for brochure images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('brochure-images', 'brochure-images', true);

-- Create storage policies for brochure images
CREATE POLICY "Admins can upload brochure images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brochure-images' 
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update brochure images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brochure-images'
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete brochure images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'brochure-images'
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Public can view brochure images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'brochure-images');