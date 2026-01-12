-- Add unsubscribed_at column to viviers if not exists
ALTER TABLE viviers ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;