-- Fix RLS for partner_comments: partners can read comments on linked entities, and manage only their own.

-- Clean existing policies
DROP POLICY IF EXISTS "Partner manages own comments" ON public.partner_comments;
DROP POLICY IF EXISTS "Partners read comments on linked entities" ON public.partner_comments;
DROP POLICY IF EXISTS "Partners insert own comments" ON public.partner_comments;
DROP POLICY IF EXISTS "Partners update own comments" ON public.partner_comments;
DROP POLICY IF EXISTS "Partners delete own comments" ON public.partner_comments;
DROP POLICY IF EXISTS "Admin sees all comments" ON public.partner_comments;
DROP POLICY IF EXISTS "Cockpit reads all comments" ON public.partner_comments;
DROP POLICY IF EXISTS "Cockpit manages all comments" ON public.partner_comments;

-- Partners can SELECT all comments on entities they are linked to
CREATE POLICY "Partners read comments on linked entities"
ON public.partner_comments
FOR SELECT
TO authenticated
USING (
  is_partner_user() AND (
    (entity_type = 'project' AND EXISTS (
      SELECT 1
      FROM public.project_partners pp
      JOIN public.partners p ON p.id = pp.partner_id
      WHERE pp.project_id = partner_comments.entity_id
        AND p.user_id = auth.uid()
    ))
    OR
    (entity_type = 'lead' AND EXISTS (
      SELECT 1
      FROM public.lead_partners lp
      JOIN public.partners p ON p.id = lp.partner_id
      WHERE lp.lead_id = partner_comments.entity_id
        AND p.user_id = auth.uid()
    ))
  )
);

-- Partners can INSERT their own comments
CREATE POLICY "Partners insert own comments"
ON public.partner_comments
FOR INSERT
TO authenticated
WITH CHECK (
  is_partner_user() AND EXISTS (
    SELECT 1
    FROM public.partners p
    WHERE p.id = partner_comments.partner_id
      AND p.user_id = auth.uid()
  )
);

-- Partners can UPDATE their own comments
CREATE POLICY "Partners update own comments"
ON public.partner_comments
FOR UPDATE
TO authenticated
USING (
  is_partner_user() AND EXISTS (
    SELECT 1
    FROM public.partners p
    WHERE p.id = partner_comments.partner_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  is_partner_user() AND EXISTS (
    SELECT 1
    FROM public.partners p
    WHERE p.id = partner_comments.partner_id
      AND p.user_id = auth.uid()
  )
);

-- Partners can DELETE their own comments
CREATE POLICY "Partners delete own comments"
ON public.partner_comments
FOR DELETE
TO authenticated
USING (
  is_partner_user() AND EXISTS (
    SELECT 1
    FROM public.partners p
    WHERE p.id = partner_comments.partner_id
      AND p.user_id = auth.uid()
  )
);

-- Admin can read all comments
CREATE POLICY "Admin sees all comments"
ON public.partner_comments
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Cockpit users can manage all comments
CREATE POLICY "Cockpit manages all comments"
ON public.partner_comments
FOR ALL
TO authenticated
USING (public.has_cockpit_access(auth.uid()))
WITH CHECK (public.has_cockpit_access(auth.uid()));