-- Add database-level rate limiting for contacts table
-- This is a defense-in-depth measure complementing edge function rate limiting

-- Create a function to check and enforce contact submission rate limits
CREATE OR REPLACE FUNCTION public.check_contact_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
  rate_limit_window INTERVAL := '5 minutes';
  max_submissions INTEGER := 3;
BEGIN
  -- Check recent submissions from the same email within the rate limit window
  SELECT COUNT(*)
  INTO recent_count
  FROM public.contacts
  WHERE email = NEW.email
    AND created_at > (NOW() - rate_limit_window);
  
  -- If too many recent submissions, reject the insert
  IF recent_count >= max_submissions THEN
    RAISE EXCEPTION 'Rate limit exceeded: Too many contact submissions from this email. Please wait before submitting again.';
  END IF;
  
  -- Also check by session if provided (secondary check)
  IF NEW.user_session IS NOT NULL THEN
    SELECT COUNT(*)
    INTO recent_count
    FROM public.contacts
    WHERE user_session = NEW.user_session
      AND created_at > (NOW() - rate_limit_window);
    
    IF recent_count >= max_submissions THEN
      RAISE EXCEPTION 'Rate limit exceeded: Too many contact submissions from this session. Please wait before submitting again.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce rate limiting on contact inserts
DROP TRIGGER IF EXISTS enforce_contact_rate_limit ON public.contacts;
CREATE TRIGGER enforce_contact_rate_limit
  BEFORE INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_contact_rate_limit();

-- Add index to optimize rate limit queries
CREATE INDEX IF NOT EXISTS idx_contacts_email_created_at 
  ON public.contacts(email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contacts_session_created_at 
  ON public.contacts(user_session, created_at DESC) 
  WHERE user_session IS NOT NULL;