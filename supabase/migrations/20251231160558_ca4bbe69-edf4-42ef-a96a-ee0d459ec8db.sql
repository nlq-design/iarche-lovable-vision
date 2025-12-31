-- Table pour stocker les documents générés (devis, CDC, propositions)
CREATE TABLE public.generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  document_type TEXT NOT NULL CHECK (document_type IN ('quote', 'proposal', 'spec', 'report', 'email', 'contract')),
  title TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  specification_id UUID REFERENCES specifications(id) ON DELETE SET NULL,
  content_json JSONB NOT NULL DEFAULT '{}',
  version TEXT DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'final', 'sent', 'cancelled')),
  supersedes_document_id UUID REFERENCES generated_documents(id),
  output_format TEXT,
  output_storage_path TEXT,
  ai_generated BOOLEAN DEFAULT true,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_generated_documents_project ON public.generated_documents(project_id);
CREATE INDEX idx_generated_documents_opportunity ON public.generated_documents(opportunity_id);
CREATE INDEX idx_generated_documents_type ON public.generated_documents(document_type);

-- Enable RLS
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "generated_documents_select" ON public.generated_documents
  FOR SELECT USING (can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "generated_documents_insert" ON public.generated_documents
  FOR INSERT WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "generated_documents_update" ON public.generated_documents
  FOR UPDATE USING (can_access_entity_workspace(workspace_id, auth.uid()))
  WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "generated_documents_delete" ON public.generated_documents
  FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER set_updated_at_generated_documents
  BEFORE UPDATE ON public.generated_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();