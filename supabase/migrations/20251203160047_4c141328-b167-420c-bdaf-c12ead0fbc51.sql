-- Add meeting type and additional guests columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS meeting_type text DEFAULT 'visio_meet',
ADD COLUMN IF NOT EXISTS additional_guests text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS zoom_meeting_id text,
ADD COLUMN IF NOT EXISTS zoom_join_url text;

-- Add meeting type constraint
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_meeting_type_check 
CHECK (meeting_type IN ('visio_meet', 'visio_zoom', 'telephone', 'presentiel'));

-- Add index for meeting type queries
CREATE INDEX IF NOT EXISTS idx_bookings_meeting_type ON public.bookings(meeting_type);