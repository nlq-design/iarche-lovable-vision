-- Drop the old check constraint first
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_meeting_type_check;