
-- Table des participants enrichis par transcription
CREATE TABLE public.transcription_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transcription_id UUID NOT NULL REFERENCES public.voice_transcriptions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  presence_status TEXT NOT NULL DEFAULT 'present' CHECK (presence_status IN ('present', 'mentioned', 'observer')),
  role_in_meeting TEXT CHECK (role_in_meeting IN ('animator', 'decision_maker', 'technical_expert', 'commercial', 'support', NULL)),
  speaker_label TEXT, -- e.g. "Speaker A" from diarization
  linked_entity_type TEXT CHECK (linked_entity_type IN ('partner', 'lead_contact', 'lead', 'project', NULL)),
  linked_entity_id UUID,
  ai_suggested_match JSONB DEFAULT NULL, -- { type, id, name, confidence }
  confidence_score NUMERIC(3,2) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX idx_transcription_participants_transcription ON public.transcription_participants(transcription_id);
CREATE INDEX idx_transcription_participants_entity ON public.transcription_participants(linked_entity_type, linked_entity_id) WHERE linked_entity_id IS NOT NULL;

-- Unique constraint: one participant name per transcription
CREATE UNIQUE INDEX idx_transcription_participants_unique ON public.transcription_participants(transcription_id, name);

-- Enable RLS
ALTER TABLE public.transcription_participants ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can manage
CREATE POLICY "Authenticated users can view transcription participants"
  ON public.transcription_participants FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert transcription participants"
  ON public.transcription_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update transcription participants"
  ON public.transcription_participants FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete transcription participants"
  ON public.transcription_participants FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_transcription_participants_updated_at
  BEFORE UPDATE ON public.transcription_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
