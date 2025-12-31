-- Update RLS policy to allow cockpit_user to delete their own transcriptions
DROP POLICY IF EXISTS "voice_transcriptions_delete" ON public.voice_transcriptions;

CREATE POLICY "voice_transcriptions_delete" ON public.voice_transcriptions
FOR DELETE
USING (
  has_role(auth.uid(), 'cockpit_admin'::app_role) 
  OR (created_by = auth.uid() AND has_role(auth.uid(), 'cockpit_user'::app_role))
);