-- Create storage bucket for generated documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-documents', 'generated-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload generated documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-documents');

-- Allow authenticated users to read their documents
CREATE POLICY "Authenticated users can read generated documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'generated-documents');

-- Allow authenticated users to update their documents
CREATE POLICY "Authenticated users can update generated documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'generated-documents');

-- Allow public read access for shared PDFs
CREATE POLICY "Public can read generated documents"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'generated-documents');