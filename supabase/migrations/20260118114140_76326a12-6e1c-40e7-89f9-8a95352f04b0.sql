-- Create partner_login_history table for tracking partner connections
CREATE TABLE public.partner_login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  session_duration_minutes INTEGER, -- filled on logout if tracked
  logout_at TIMESTAMPTZ
);

-- Add last_login_at to partners table for quick access
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.partner_login_history ENABLE ROW LEVEL SECURITY;

-- Cockpit users can view all partner login history
CREATE POLICY "Cockpit users can view partner login history"
ON public.partner_login_history
FOR SELECT
USING (public.has_cockpit_access(auth.uid()));

-- Partners can view their own login history
CREATE POLICY "Partners can view own login history"
ON public.partner_login_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = partner_login_history.partner_id
    AND p.user_id = auth.uid()
  )
);

-- System can insert login records (via edge function with service key)
CREATE POLICY "System can insert login history"
ON public.partner_login_history
FOR INSERT
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_partner_login_history_partner_id ON public.partner_login_history(partner_id);
CREATE INDEX idx_partner_login_history_logged_in_at ON public.partner_login_history(logged_in_at DESC);

-- Function to log partner login and update stats
CREATE OR REPLACE FUNCTION public.log_partner_login(
  p_partner_id UUID,
  p_user_id UUID,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_login_id UUID;
  v_device_type TEXT;
BEGIN
  -- Detect device type from user agent
  IF p_user_agent IS NOT NULL THEN
    IF p_user_agent ILIKE '%mobile%' OR p_user_agent ILIKE '%android%' OR p_user_agent ILIKE '%iphone%' THEN
      v_device_type := 'mobile';
    ELSIF p_user_agent ILIKE '%tablet%' OR p_user_agent ILIKE '%ipad%' THEN
      v_device_type := 'tablet';
    ELSE
      v_device_type := 'desktop';
    END IF;
  END IF;

  -- Insert login record
  INSERT INTO public.partner_login_history (partner_id, user_id, ip_address, user_agent, device_type)
  VALUES (p_partner_id, p_user_id, p_ip_address, p_user_agent, v_device_type)
  RETURNING id INTO v_login_id;

  -- Update partner stats
  UPDATE public.partners
  SET 
    last_login_at = now(),
    login_count = COALESCE(login_count, 0) + 1
  WHERE id = p_partner_id;

  RETURN v_login_id;
END;
$$;