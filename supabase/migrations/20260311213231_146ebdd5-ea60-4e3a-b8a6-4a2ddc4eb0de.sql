
-- Fix 1: login_attempts — restrict to service_role only (was roles:{public} qual:true)
DROP POLICY IF EXISTS "Service role can manage login attempts" ON public.login_attempts;
CREATE POLICY "Service role can manage login attempts"
ON public.login_attempts FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- Fix 2: transcription_participants — scope to workspace instead of any authenticated user
DROP POLICY IF EXISTS "Authenticated users can view transcription participants" ON public.transcription_participants;
DROP POLICY IF EXISTS "Authenticated users can insert transcription participants" ON public.transcription_participants;
DROP POLICY IF EXISTS "Authenticated users can update transcription participants" ON public.transcription_participants;
DROP POLICY IF EXISTS "Authenticated users can delete transcription participants" ON public.transcription_participants;

CREATE POLICY "Cockpit users can view transcription participants"
ON public.transcription_participants FOR SELECT
TO authenticated
USING (has_cockpit_access(auth.uid()) OR is_partner_user());

CREATE POLICY "Cockpit users can insert transcription participants"
ON public.transcription_participants FOR INSERT
TO authenticated
WITH CHECK (has_cockpit_access(auth.uid()));

CREATE POLICY "Cockpit users can update transcription participants"
ON public.transcription_participants FOR UPDATE
TO authenticated
USING (has_cockpit_access(auth.uid()));

CREATE POLICY "Cockpit users can delete transcription participants"
ON public.transcription_participants FOR DELETE
TO authenticated
USING (has_cockpit_access(auth.uid()));

-- Fix 3: telegram_reminders — restrict management to service_role only
DROP POLICY IF EXISTS "Service role can manage telegram reminders" ON public.telegram_reminders;
CREATE POLICY "Service role can manage telegram reminders"
ON public.telegram_reminders FOR ALL
TO service_role
USING (true) WITH CHECK (true);
