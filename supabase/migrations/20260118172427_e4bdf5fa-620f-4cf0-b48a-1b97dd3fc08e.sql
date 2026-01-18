-- Recreate RLS policies for partner_comments with correct function calls

-- Cockpit users can read all comments
CREATE POLICY "Cockpit reads all comments"
ON public.partner_comments
FOR SELECT
TO authenticated
USING (public.has_cockpit_access(auth.uid()));

-- Admin/Cockpit can manage all comments
CREATE POLICY "Cockpit manages all comments"
ON public.partner_comments
FOR ALL
TO authenticated
USING (public.has_cockpit_access(auth.uid()))
WITH CHECK (public.has_cockpit_access(auth.uid()));