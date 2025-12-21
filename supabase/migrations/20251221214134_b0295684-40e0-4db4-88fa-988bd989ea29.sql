-- Ajouter lead_id à projects pour lier un projet à un contact/lead
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- Table pour les documents de projet
CREATE TABLE public.project_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.workspaces(id),
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT,
  file_size_bytes BIGINT,
  category TEXT DEFAULT 'document',
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour les notes/synthèses de projet
CREATE TABLE public.project_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.workspaces(id),
  title TEXT NOT NULL,
  content TEXT,
  note_type TEXT DEFAULT 'synthesis',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_documents
CREATE POLICY "project_documents_select" ON public.project_documents
  FOR SELECT USING (can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "project_documents_insert" ON public.project_documents
  FOR INSERT WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "project_documents_update" ON public.project_documents
  FOR UPDATE USING (can_access_entity_workspace(workspace_id, auth.uid()))
  WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "project_documents_delete" ON public.project_documents
  FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'::app_role));

-- RLS policies for project_notes
CREATE POLICY "project_notes_select" ON public.project_notes
  FOR SELECT USING (can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "project_notes_insert" ON public.project_notes
  FOR INSERT WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "project_notes_update" ON public.project_notes
  FOR UPDATE USING (can_access_entity_workspace(workspace_id, auth.uid()))
  WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "project_notes_delete" ON public.project_notes
  FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'::app_role));

-- Triggers pour updated_at
CREATE TRIGGER set_project_documents_updated_at
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_project_notes_updated_at
  BEFORE UPDATE ON public.project_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();