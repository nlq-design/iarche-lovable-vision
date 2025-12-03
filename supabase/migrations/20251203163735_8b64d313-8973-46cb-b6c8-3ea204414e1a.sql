-- Add the new check constraint with updated meeting types
ALTER TABLE public.bookings ADD CONSTRAINT bookings_meeting_type_check 
CHECK (meeting_type IN ('visio', 'telephone', 'presentiel'));