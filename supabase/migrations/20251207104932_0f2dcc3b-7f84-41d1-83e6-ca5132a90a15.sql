-- Fix bookings table: ensure no public SELECT access
-- Drop any potentially conflicting policies
DROP POLICY IF EXISTS "Public can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public can read bookings" ON public.bookings;

-- Verify existing policies are correct (admin-only access)
-- These should already exist, but recreate to be sure
DROP POLICY IF EXISTS "Admins can manage bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public can create bookings" ON public.bookings;

-- Recreate proper admin-only policies
CREATE POLICY "Admins can view all bookings" 
ON public.bookings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update bookings" 
ON public.bookings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete bookings" 
ON public.bookings 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can only INSERT (for booking creation)
CREATE POLICY "Public can create bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (true);