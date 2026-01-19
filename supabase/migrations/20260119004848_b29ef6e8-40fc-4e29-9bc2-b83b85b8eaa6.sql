-- Fix voice_transcriptions_select to exclude partners (they have dedicated policy)
DROP POLICY IF EXISTS "voice_transcriptions_select" ON public.voice_transcriptions;

CREATE POLICY "voice_transcriptions_select" ON public.voice_transcriptions
FOR SELECT USING (
  NOT is_partner_user() 
  AND can_access_entity_workspace(workspace_id, auth.uid())
);