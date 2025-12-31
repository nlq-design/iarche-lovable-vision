-- Add google_event_id column to tasks table for Google Calendar sync
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_google_event_id 
ON public.tasks(google_event_id) 
WHERE google_event_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.tasks.google_event_id IS 'Google Calendar event ID for bidirectional sync';