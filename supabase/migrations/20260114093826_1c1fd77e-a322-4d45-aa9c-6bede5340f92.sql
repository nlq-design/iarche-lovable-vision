-- Fix: Make 'generated-documents' bucket private and add proper RLS policies
-- This addresses the STORAGE_EXPOSURE security issue

-- Step 1: Make the bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'generated-documents';

-- Step 2: Drop the insecure anonymous read policy
DROP POLICY IF EXISTS "Public can read generated documents" ON storage.objects;

-- Step 3: Create secure workspace-based access policies

-- Authenticated users can read documents from their workspace
CREATE POLICY "Workspace members can read generated documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'generated-documents' AND
  EXISTS (
    SELECT 1 FROM public.generated_documents d
    WHERE d.output_storage_path = storage.objects.name
    AND public.can_access_entity_workspace(d.workspace_id, auth.uid())
  )
);

-- Cockpit users can upload documents to their workspace
CREATE POLICY "Cockpit users can upload generated documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'generated-documents' AND
  public.has_cockpit_access(auth.uid())
);

-- Cockpit users can update documents in their workspace
CREATE POLICY "Cockpit users can update generated documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'generated-documents' AND
  EXISTS (
    SELECT 1 FROM public.generated_documents d
    WHERE d.output_storage_path = storage.objects.name
    AND public.can_access_entity_workspace(d.workspace_id, auth.uid())
  )
);

-- Cockpit users can delete documents from their workspace
CREATE POLICY "Cockpit users can delete generated documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'generated-documents' AND
  EXISTS (
    SELECT 1 FROM public.generated_documents d
    WHERE d.output_storage_path = storage.objects.name
    AND public.can_access_entity_workspace(d.workspace_id, auth.uid())
  )
);