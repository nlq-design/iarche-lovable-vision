-- 1. Table des contacts liés aux leads (plusieurs interlocuteurs par lead)
CREATE TABLE public.lead_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_lead_contacts_lead_id ON public.lead_contacts(lead_id);

-- RLS
ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_contacts_select" ON public.lead_contacts
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'cockpit_user'::app_role) OR 
    has_role(auth.uid(), 'cockpit_admin'::app_role)
  );

CREATE POLICY "lead_contacts_insert" ON public.lead_contacts
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'cockpit_user'::app_role) OR 
    has_role(auth.uid(), 'cockpit_admin'::app_role)
  );

CREATE POLICY "lead_contacts_update" ON public.lead_contacts
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'cockpit_user'::app_role) OR 
    has_role(auth.uid(), 'cockpit_admin'::app_role)
  );

CREATE POLICY "lead_contacts_delete" ON public.lead_contacts
  FOR DELETE USING (
    has_role(auth.uid(), 'cockpit_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 2. Table des partenaires
CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.workspaces(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('expert_ia', 'independant', 'apport_affaires')),
  bio TEXT,
  linkedin_url TEXT,
  website TEXT,
  specialties TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  commission_rate NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_select" ON public.partners
  FOR SELECT USING (can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "partners_insert" ON public.partners
  FOR INSERT WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "partners_update" ON public.partners
  FOR UPDATE USING (can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "partners_delete" ON public.partners
  FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'::app_role));

-- 3. Tables de liaison partenaires
CREATE TABLE public.project_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, partner_id)
);

ALTER TABLE public.project_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_partners_select" ON public.project_partners
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND can_access_entity_workspace(p.workspace_id, auth.uid()))
  );

CREATE POLICY "project_partners_insert" ON public.project_partners
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND can_access_entity_workspace(p.workspace_id, auth.uid()))
  );

CREATE POLICY "project_partners_delete" ON public.project_partners
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND can_access_entity_workspace(p.workspace_id, auth.uid()))
  );

-- Liaison documents-partenaires
CREATE TABLE public.document_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.generated_documents(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(document_id, partner_id)
);

ALTER TABLE public.document_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_partners_select" ON public.document_partners
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM generated_documents d WHERE d.id = document_id AND can_access_entity_workspace(d.workspace_id, auth.uid()))
  );

CREATE POLICY "document_partners_insert" ON public.document_partners
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM generated_documents d WHERE d.id = document_id AND can_access_entity_workspace(d.workspace_id, auth.uid()))
  );

CREATE POLICY "document_partners_delete" ON public.document_partners
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM generated_documents d WHERE d.id = document_id AND can_access_entity_workspace(d.workspace_id, auth.uid()))
  );

-- Liaison solutions-partenaires (via articles)
CREATE TABLE public.solution_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solution_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(solution_id, partner_id)
);

ALTER TABLE public.solution_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "solution_partners_select" ON public.solution_partners
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'cockpit_user'::app_role) OR 
    has_role(auth.uid(), 'cockpit_admin'::app_role)
  );

CREATE POLICY "solution_partners_insert" ON public.solution_partners
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'cockpit_user'::app_role) OR 
    has_role(auth.uid(), 'cockpit_admin'::app_role)
  );

CREATE POLICY "solution_partners_delete" ON public.solution_partners
  FOR DELETE USING (
    has_role(auth.uid(), 'cockpit_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Trigger updated_at
CREATE TRIGGER set_lead_contacts_updated_at
  BEFORE UPDATE ON public.lead_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();