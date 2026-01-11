-- Add click tracking columns to vivier_campaigns
ALTER TABLE public.vivier_campaigns 
ADD COLUMN IF NOT EXISTS click_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_rate numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone;