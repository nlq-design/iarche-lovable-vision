-- Create SECURITY DEFINER helper function to check if user is a document partner
-- This function bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_document_partner(p_document_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM document_partners dp
    JOIN partners p ON p.id = dp.partner_id
    WHERE dp.document_id = p_document_id
    AND p.user_id = p_user_id
    AND p.deleted_at IS NULL
  )
$$;

-- Create helper to get document workspace without recursion
CREATE OR REPLACE FUNCTION public.get_document_workspace_id(p_document_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM generated_documents WHERE id = p_document_id
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "document_partners_select" ON public.document_partners;
DROP POLICY IF EXISTS "document_partners_insert" ON public.document_partners;
DROP POLICY IF EXISTS "document_partners_delete" ON public.document_partners;

-- Recreate SELECT policy: cockpit users OR linked partners can view
CREATE POLICY "document_partners_select" ON public.document_partners
FOR SELECT USING (
  public.has_cockpit_access(auth.uid())
  OR public.is_document_partner(document_id, auth.uid())
);

-- Recreate INSERT policy: only cockpit users can link partners
CREATE POLICY "document_partners_insert" ON public.document_partners
FOR INSERT WITH CHECK (
  public.has_cockpit_access(auth.uid())
);

-- Recreate DELETE policy: only cockpit users can unlink partners
CREATE POLICY "document_partners_delete" ON public.document_partners
FOR DELETE USING (
  public.has_cockpit_access(auth.uid())
);