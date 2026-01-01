-- Add lead_contact_id column to voice_transcriptions
ALTER TABLE public.voice_transcriptions 
ADD COLUMN lead_contact_id uuid REFERENCES public.lead_contacts(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_voice_transcriptions_lead_contact_id ON public.voice_transcriptions(lead_contact_id);

-- Add comment for clarity
COMMENT ON COLUMN public.voice_transcriptions.lead_contact_id IS 'Optional link to a specific contact from lead_contacts table';