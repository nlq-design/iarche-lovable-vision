
-- Add RLS policies for telegram_processed_updates table
-- This table tracks processed Telegram message IDs to prevent duplicates
-- It should only be accessible by authenticated admin/cockpit users and service role

-- Policy: Allow authenticated admins to read the table (for debugging/monitoring)
CREATE POLICY "Admins can read telegram processed updates"
ON public.telegram_processed_updates
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Policy: Deny all other operations from regular users
-- Service role (used by edge functions) bypasses RLS automatically
-- This ensures only edge functions can insert/update/delete records
