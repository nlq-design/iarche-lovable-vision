-- Allow service role uploads from Telegram webhook (folder: telegram-audio, telegram-documents, telegram-images)
-- The service role key should bypass RLS, but we add an explicit policy for telegram folders

CREATE POLICY "telegram_service_uploads" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'cockpit-uploads' 
  AND (
    (storage.foldername(name))[1] = 'telegram-audio'
    OR (storage.foldername(name))[1] = 'telegram-documents' 
    OR (storage.foldername(name))[1] = 'telegram-images'
  )
);

-- Also allow reading these files for transcription processing
CREATE POLICY "telegram_service_read" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'cockpit-uploads' 
  AND (
    (storage.foldername(name))[1] = 'telegram-audio'
    OR (storage.foldername(name))[1] = 'telegram-documents' 
    OR (storage.foldername(name))[1] = 'telegram-images'
  )
);