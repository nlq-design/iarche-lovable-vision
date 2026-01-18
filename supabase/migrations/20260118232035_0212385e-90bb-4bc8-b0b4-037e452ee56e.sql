
-- Fix get_current_partner_id to exclude soft-deleted partners
CREATE OR REPLACE FUNCTION public.get_current_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT id FROM public.partners 
  WHERE user_id = auth.uid() 
    AND deleted_at IS NULL 
  LIMIT 1;
$$;
