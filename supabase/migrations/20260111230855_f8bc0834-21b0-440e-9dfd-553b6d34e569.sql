-- Add missing launched_at column for Instantly integration
ALTER TABLE public.vivier_campaigns 
ADD COLUMN IF NOT EXISTS launched_at TIMESTAMP WITH TIME ZONE;