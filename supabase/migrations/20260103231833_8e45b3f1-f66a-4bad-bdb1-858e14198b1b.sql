-- Table pour stocker les notes de contexte évolutives par entité
CREATE TABLE public.entity_context_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'project', 'solution', 'partner', 'document', 'transcription')),
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  workspace_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.workspaces(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour récupération rapide par entité
CREATE INDEX idx_entity_context_notes_entity ON public.entity_context_notes(entity_type, entity_id);
CREATE INDEX idx_entity_context_notes_workspace ON public.entity_context_notes(workspace_id);

-- Enable RLS
ALTER TABLE public.entity_context_notes ENABLE ROW LEVEL SECURITY;

-- Policies: cockpit users can CRUD on their workspace
CREATE POLICY "Cockpit users can view context notes" 
ON public.entity_context_notes FOR SELECT 
USING (public.can_access_workspace(workspace_id, auth.uid()));

CREATE POLICY "Cockpit users can create context notes" 
ON public.entity_context_notes FOR INSERT 
WITH CHECK (public.has_cockpit_access(auth.uid()));

CREATE POLICY "Cockpit users can update their own context notes" 
ON public.entity_context_notes FOR UPDATE 
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'cockpit_admin'));

CREATE POLICY "Cockpit users can delete their own context notes" 
ON public.entity_context_notes FOR DELETE 
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'cockpit_admin'));

-- Trigger pour updated_at
CREATE TRIGGER set_entity_context_notes_updated_at
  BEFORE UPDATE ON public.entity_context_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Trigger pour marquer l'entité comme stale quand on ajoute un contexte
CREATE OR REPLACE FUNCTION public.mark_entity_stale_on_context_note()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entity_type = 'lead' THEN
    UPDATE leads SET synthesis_stale = TRUE WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'project' THEN
    UPDATE projects SET synthesis_stale = TRUE WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'solution' THEN
    UPDATE articles SET synthesis_stale = TRUE WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'partner' THEN
    UPDATE partners SET synthesis_stale = TRUE WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'document' THEN
    UPDATE generated_documents SET synthesis_stale = TRUE WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'transcription' THEN
    UPDATE voice_transcriptions SET synthesis_stale = TRUE WHERE id = NEW.entity_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_mark_stale_on_context_note
  AFTER INSERT OR UPDATE ON public.entity_context_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_entity_stale_on_context_note();