-- Fix deletion permissions for cockpit files + documents

-- uploaded_files: allow workspace-access users to delete (was cockpit_admin only)
DROP POLICY IF EXISTS uploaded_files_delete ON public.uploaded_files;
CREATE POLICY uploaded_files_delete
ON public.uploaded_files
FOR DELETE
USING (public.can_access_entity_workspace(workspace_id, auth.uid()));

-- generated_documents: allow workspace-access users to delete (was cockpit_admin only)
DROP POLICY IF EXISTS generated_documents_delete ON public.generated_documents;
CREATE POLICY generated_documents_delete
ON public.generated_documents
FOR DELETE
USING (public.can_access_entity_workspace(workspace_id, auth.uid()));

-- Storage: allow users to delete their own uploaded objects in cockpit-uploads bucket
-- (Paths are stored as: <user_id>/<timestamp>_<filename>)
DROP POLICY IF EXISTS cockpit_uploads_delete_own ON storage.objects;
CREATE POLICY cockpit_uploads_delete_own
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'cockpit-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
