-- Revert overly-permissive Telegram storage policies (they were unintentionally public)
DROP POLICY IF EXISTS "telegram_service_uploads" ON storage.objects;
DROP POLICY IF EXISTS "telegram_service_read" ON storage.objects;