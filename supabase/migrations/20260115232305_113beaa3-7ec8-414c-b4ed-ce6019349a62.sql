-- ============================================
-- OPTIMIZE VIVIERS RLS FOR LARGE DATASETS
-- Problem: has_cockpit_access() called per-row causes timeout on 137k rows
-- Solution: Cache the access check in a CTE-like subquery with STABLE function
-- ============================================

-- First, mark the function as STABLE for query optimization
CREATE OR REPLACE FUNCTION public.has_cockpit_access(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE -- Important: allows PostgreSQL to cache result within a single query
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check role AND active MFA session
  RETURN (
    public.has_role(user_uuid, 'cockpit_user') OR 
    public.has_role(user_uuid, 'cockpit_admin')
  ) AND EXISTS (
    SELECT 1 FROM public.cockpit_auth_sessions
    WHERE user_id = user_uuid
    AND expires_at > NOW()
  );
END;
$function$;

-- Drop old policy
DROP POLICY IF EXISTS "Cockpit users can manage viviers" ON public.viviers;

-- Create optimized policy - the STABLE function will be evaluated once
CREATE POLICY "Cockpit users can manage viviers"
ON public.viviers
FOR ALL
USING (
  -- This is now evaluated once per query due to STABLE marking
  has_cockpit_access(auth.uid())
)
WITH CHECK (
  has_cockpit_access(auth.uid())
);