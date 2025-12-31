-- Add meeting_note_id to voice_transcriptions to link transcriptions to meeting notes (CR)
ALTER TABLE public.voice_transcriptions 
ADD COLUMN meeting_note_id uuid REFERENCES public.meeting_notes(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_voice_transcriptions_meeting_note_id ON public.voice_transcriptions(meeting_note_id);

-- Comment for documentation
COMMENT ON COLUMN public.voice_transcriptions.meeting_note_id IS 'Optional link to meeting note (CR) for agenda integration';