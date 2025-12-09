-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-codes', 'qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for qr-codes bucket
CREATE POLICY "Admins can upload QR codes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'qr-codes' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete QR codes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'qr-codes' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Public can view QR codes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'qr-codes');