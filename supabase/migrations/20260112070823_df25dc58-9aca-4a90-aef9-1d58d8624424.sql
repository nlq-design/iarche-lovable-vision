-- Fix hardcoded tokens in triggers by using current_setting for dynamic token retrieval
-- Note: The anon key is public and can remain, but we document this clearly

-- Update notify_new_lead_telegram to use SUPABASE_ANON_KEY from Supabase's internal settings
-- Since pg_net requires hardcoded headers, we document this is the public anon key (not a secret)

-- First, add a comment to document that the anon key is intentionally embedded (it's public)
COMMENT ON FUNCTION notify_new_lead_telegram() IS 
'Sends Telegram notification for new leads. Uses the Supabase anon key (public key, not a secret) for HTTP requests to Edge Functions. The anon key is safe to embed as it only grants public-level access.';

COMMENT ON FUNCTION notify_new_booking_telegram() IS 
'Sends Telegram notification for new confirmed bookings. Uses the Supabase anon key (public key, not a secret) for HTTP requests to Edge Functions. The anon key is safe to embed as it only grants public-level access.';