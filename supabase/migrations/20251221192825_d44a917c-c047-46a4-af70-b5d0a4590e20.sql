-- ============================================
-- PHASE 2: COCKPIT BUSINESS TABLES
-- ============================================

-- 1. Create statuses reference table
CREATE TABLE IF NOT EXISTS public.statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_terminal BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  ui_variant TEXT DEFAULT 'default',
  allowed_transitions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, code)
);

CREATE INDEX IF NOT EXISTS idx_statuses_entity ON public.statuses(entity_type);

-- Insert default statuses
INSERT INTO public.statuses (entity_type, code, label, display_order, is_terminal, is_default, ui_variant, allowed_transitions) VALUES
  ('lead', 'new', 'Nouveau', 1, false, true, 'default', '["contacted"]'::jsonb),
  ('lead', 'contacted', 'Contacté', 2, false, false, 'info', '["qualified", "disqualified"]'::jsonb),
  ('lead', 'qualified', 'Qualifié', 3, false, false, 'success', '["disqualified"]'::jsonb),
  ('lead', 'disqualified', 'Disqualifié', 4, true, false, 'error', '[]'::jsonb),
  ('opportunity', 'lead', 'Lead', 1, false, true, 'default', '["qualified"]'::jsonb),
  ('opportunity', 'qualified', 'Qualifié', 2, false, false, 'info', '["proposal", "lost"]'::jsonb),
  ('opportunity', 'proposal', 'Proposition', 3, false, false, 'info', '["negotiation", "lost"]'::jsonb),
  ('opportunity', 'negotiation', 'Négociation', 4, false, false, 'warning', '["won", "lost"]'::jsonb),
  ('opportunity', 'won', 'Gagné', 5, true, false, 'success', '[]'::jsonb),
  ('opportunity', 'lost', 'Perdu', 6, true, false, 'error', '[]'::jsonb),
  ('project', 'scoping', 'Cadrage', 1, false, true, 'default', '["design", "cancelled"]'::jsonb),
  ('project', 'design', 'Conception', 2, false, false, 'info', '["development", "cancelled"]'::jsonb),
  ('project', 'development', 'Développement', 3, false, false, 'info', '["testing", "cancelled"]'::jsonb),
  ('project', 'testing', 'Tests', 4, false, false, 'warning', '["deployment", "development"]'::jsonb),
  ('project', 'deployment', 'Déploiement', 5, false, false, 'warning', '["maintenance", "completed"]'::jsonb),
  ('project', 'maintenance', 'Suivi', 6, false, false, 'info', '["completed"]'::jsonb),
  ('project', 'completed', 'Terminé', 7, true, false, 'success', '[]'::jsonb),
  ('project', 'cancelled', 'Annulé', 8, true, false, 'error', '[]'::jsonb),
  ('specification', 'draft', 'Brouillon', 1, false, true, 'default', '["review"]'::jsonb),
  ('specification', 'review', 'En revue', 2, false, false, 'warning', '["approved", "draft"]'::jsonb),
  ('specification', 'approved', 'Validé', 3, true, false, 'success', '[]'::jsonb)
ON CONFLICT (entity_type, code) DO NOTHING;

-- 2. Generic set_updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Extend leads table with cockpit fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS qualification_status TEXT DEFAULT 'new';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_score_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}'::jsonb;

-- 4. Create opportunities table
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  lead_id UUID REFERENCES public.leads(id),
  title TEXT NOT NULL,
  description TEXT,
  value_amount DECIMAL(12,2),
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  stage TEXT NOT NULL DEFAULT 'lead',
  expected_close_date DATE,
  source TEXT,
  lost_to TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  close_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_opportunities_workspace ON public.opportunities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON public.opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_lead ON public.opportunities(lead_id);

DROP TRIGGER IF EXISTS set_updated_at_opportunities ON public.opportunities;
CREATE TRIGGER set_updated_at_opportunities BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  opportunity_id UUID REFERENCES public.opportunities(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'scoping',
  health_status TEXT NOT NULL DEFAULT 'on_track' CHECK (health_status IN ('on_track', 'at_risk', 'blocked')),
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,
  budget_amount DECIMAL(12,2),
  consumed_amount DECIMAL(12,2) DEFAULT 0,
  assigned_to UUID REFERENCES auth.users(id),
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_workspace ON public.projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_opportunity ON public.projects(opportunity_id);

DROP TRIGGER IF EXISTS set_updated_at_projects ON public.projects;
CREATE TRIGGER set_updated_at_projects BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Create meeting_notes table
CREATE TABLE IF NOT EXISTS public.meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id),
  project_id UUID REFERENCES public.projects(id),
  objectives TEXT,
  notes TEXT,
  duration_minutes INTEGER,
  ai_summary TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  next_steps TEXT,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_workspace ON public.meeting_notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_project ON public.meeting_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_opportunity ON public.meeting_notes(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_booking ON public.meeting_notes(booking_id);

DROP TRIGGER IF EXISTS set_updated_at_meeting_notes ON public.meeting_notes;
CREATE TRIGGER set_updated_at_meeting_notes BEFORE UPDATE ON public.meeting_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'follow_up' CHECK (task_type IN ('follow_up', 'call', 'email', 'meeting', 'document', 'review', 'other')),
  entity_type TEXT,
  entity_id UUID,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  meeting_note_id UUID REFERENCES public.meeting_notes(id) ON DELETE CASCADE,
  due_date DATE,
  due_time TIME,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'snoozed')),
  completed_at TIMESTAMPTZ,
  snoozed_until DATE,
  assigned_to UUID REFERENCES auth.users(id),
  ai_generated BOOLEAN DEFAULT false,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  ai_suggested_action TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON public.tasks(due_date, status);
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON public.tasks(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_opportunity ON public.tasks(opportunity_id) WHERE opportunity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id) WHERE project_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_updated_at_tasks ON public.tasks;
CREATE TRIGGER set_updated_at_tasks BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. Create activity_log table
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  meeting_note_id UUID REFERENCES public.meeting_notes(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('note', 'email', 'call', 'meeting', 'status_change', 'ai_action', 'document', 'task', 'comment')),
  title TEXT,
  content TEXT,
  visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'team', 'partner', 'client')),
  related_entity_type TEXT,
  related_entity_id UUID,
  is_ai_generated BOOLEAN DEFAULT false,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_workspace ON public.activity_log(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON public.activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_lead ON public.activity_log(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_log_opportunity ON public.activity_log(opportunity_id) WHERE opportunity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_log_project ON public.activity_log(project_id) WHERE project_id IS NOT NULL;

-- 9. Create project_contacts table
CREATE TABLE IF NOT EXISTS public.project_contacts (
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'stakeholder' CHECK (role IN ('stakeholder', 'decision_maker', 'technical', 'sponsor')),
  PRIMARY KEY (project_id, lead_id)
);

-- 10. Create specifications table
CREATE TABLE IF NOT EXISTS public.specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'draft',
  content JSONB DEFAULT '{}'::jsonb,
  ai_generated BOOLEAN DEFAULT false,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_specifications_project ON public.specifications(project_id);
CREATE INDEX IF NOT EXISTS idx_specifications_workspace ON public.specifications(workspace_id);

DROP TRIGGER IF EXISTS set_updated_at_specifications ON public.specifications;
CREATE TRIGGER set_updated_at_specifications BEFORE UPDATE ON public.specifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 11. Enable RLS on all new tables
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specifications ENABLE ROW LEVEL SECURITY;

-- 12. Helper function for entity workspace access
CREATE OR REPLACE FUNCTION public.can_access_entity_workspace(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.can_access_workspace(p_workspace_id, p_user_id);
END;
$$;

-- 13. RLS Policies for statuses (public read, cockpit_admin write)
CREATE POLICY "statuses_select" ON public.statuses FOR SELECT USING (true);
CREATE POLICY "statuses_admin" ON public.statuses FOR ALL USING (public.has_role(auth.uid(), 'cockpit_admin'));

-- 14. RLS Policies for opportunities
CREATE POLICY "opportunities_select" ON public.opportunities FOR SELECT USING (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "opportunities_insert" ON public.opportunities FOR INSERT WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "opportunities_update" ON public.opportunities FOR UPDATE USING (public.can_access_entity_workspace(workspace_id, auth.uid())) WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "opportunities_delete" ON public.opportunities FOR DELETE USING (public.has_role(auth.uid(), 'cockpit_admin'));

-- 15. RLS Policies for projects
CREATE POLICY "projects_select" ON public.projects FOR SELECT USING (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "projects_insert" ON public.projects FOR INSERT WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "projects_update" ON public.projects FOR UPDATE USING (public.can_access_entity_workspace(workspace_id, auth.uid())) WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "projects_delete" ON public.projects FOR DELETE USING (public.has_role(auth.uid(), 'cockpit_admin'));

-- 16. RLS Policies for meeting_notes
CREATE POLICY "meeting_notes_select" ON public.meeting_notes FOR SELECT USING (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "meeting_notes_insert" ON public.meeting_notes FOR INSERT WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "meeting_notes_update" ON public.meeting_notes FOR UPDATE USING (public.can_access_entity_workspace(workspace_id, auth.uid())) WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "meeting_notes_delete" ON public.meeting_notes FOR DELETE USING (public.has_role(auth.uid(), 'cockpit_admin'));

-- 17. RLS Policies for tasks
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT USING (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE USING (public.can_access_entity_workspace(workspace_id, auth.uid())) WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE USING (public.has_role(auth.uid(), 'cockpit_admin'));

-- 18. RLS Policies for activity_log (append-only for users, full for admin)
CREATE POLICY "activity_log_select" ON public.activity_log FOR SELECT USING (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "activity_log_insert" ON public.activity_log FOR INSERT WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "activity_log_delete" ON public.activity_log FOR DELETE USING (public.has_role(auth.uid(), 'cockpit_admin'));

-- 19. RLS Policies for project_contacts
CREATE POLICY "project_contacts_select" ON public.project_contacts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_contacts.project_id AND public.can_access_entity_workspace(p.workspace_id, auth.uid()))
);
CREATE POLICY "project_contacts_insert" ON public.project_contacts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_contacts.project_id AND public.can_access_entity_workspace(p.workspace_id, auth.uid()))
);
CREATE POLICY "project_contacts_update" ON public.project_contacts FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_contacts.project_id AND public.can_access_entity_workspace(p.workspace_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_contacts.project_id AND public.can_access_entity_workspace(p.workspace_id, auth.uid())));
CREATE POLICY "project_contacts_delete" ON public.project_contacts FOR DELETE USING (public.has_role(auth.uid(), 'cockpit_admin'));

-- 20. RLS Policies for specifications
CREATE POLICY "specifications_select" ON public.specifications FOR SELECT USING (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "specifications_insert" ON public.specifications FOR INSERT WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "specifications_update" ON public.specifications FOR UPDATE USING (public.can_access_entity_workspace(workspace_id, auth.uid())) WITH CHECK (public.can_access_entity_workspace(workspace_id, auth.uid()));
CREATE POLICY "specifications_delete" ON public.specifications FOR DELETE USING (public.has_role(auth.uid(), 'cockpit_admin'));