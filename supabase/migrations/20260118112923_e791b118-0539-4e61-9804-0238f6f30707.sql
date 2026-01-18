-- Add public SELECT policy for token validation (no auth required)
CREATE POLICY "Public can validate invitation tokens"
ON public.partner_invitations
FOR SELECT
USING (true);

-- Note: The existing "Admins manage invitations" policy handles INSERT/UPDATE/DELETE