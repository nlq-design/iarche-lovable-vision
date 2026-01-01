-- Increase voice-transcriptions bucket file size limit to 100 MB
UPDATE storage.buckets 
SET file_size_limit = 104857600 
WHERE name = 'voice-transcriptions';