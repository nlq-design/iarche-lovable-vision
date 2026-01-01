
-- Table lead_partners
CREATE TABLE public.lead_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, partner_id)
);

ALTER TABLE public.lead_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_partners_select" ON public.lead_partners
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'cockpit_user'::app_role) OR 
    has_role(auth.uid(), 'cockpit_admin'::app_role)
  );

CREATE POLICY "lead_partners_insert" ON public.lead_partners
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'cockpit_user'::app_role) OR 
    has_role(auth.uid(), 'cockpit_admin'::app_role)
  );

CREATE POLICY "lead_partners_delete" ON public.lead_partners
  FOR DELETE USING (
    has_role(auth.uid(), 'cockpit_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Table opportunity_partners
CREATE TABLE public.opportunity_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(opportunity_id, partner_id)
);

ALTER TABLE public.opportunity_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opportunity_partners_select" ON public.opportunity_partners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM opportunities o 
      WHERE o.id = opportunity_partners.opportunity_id 
      AND can_access_entity_workspace(o.workspace_id, auth.uid())
    )
  );

CREATE POLICY "opportunity_partners_insert" ON public.opportunity_partners
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM opportunities o 
      WHERE o.id = opportunity_partners.opportunity_id 
      AND can_access_entity_workspace(o.workspace_id, auth.uid())
    )
  );

CREATE POLICY "opportunity_partners_delete" ON public.opportunity_partners
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM opportunities o 
      WHERE o.id = opportunity_partners.opportunity_id 
      AND can_access_entity_workspace(o.workspace_id, auth.uid())
    )
  );

-- Table task_partners
CREATE TABLE public.task_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, partner_id)
);

ALTER TABLE public.task_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_partners_select" ON public.task_partners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t 
      WHERE t.id = task_partners.task_id 
      AND can_access_entity_workspace(t.workspace_id, auth.uid())
    )
  );

CREATE POLICY "task_partners_insert" ON public.task_partners
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t 
      WHERE t.id = task_partners.task_id 
      AND can_access_entity_workspace(t.workspace_id, auth.uid())
    )
  );

CREATE POLICY "task_partners_delete" ON public.task_partners
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks t 
      WHERE t.id = task_partners.task_id 
      AND can_access_entity_workspace(t.workspace_id, auth.uid())
    )
  );

-- Table booking_partners
CREATE TABLE public.booking_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(booking_id, partner_id)
);

ALTER TABLE public.booking_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_partners_select" ON public.booking_partners
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'cockpit_user'::app_role) OR 
    has_role(auth.uid(), 'cockpit_admin'::app_role)
  );

CREATE POLICY "booking_partners_insert" ON public.booking_partners
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'cockpit_user'::app_role) OR 
    has_role(auth.uid(), 'cockpit_admin'::app_role)
  );

CREATE POLICY "booking_partners_delete" ON public.booking_partners
  FOR DELETE USING (
    has_role(auth.uid(), 'cockpit_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Table transcription_partners
CREATE TABLE public.transcription_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES public.voice_transcriptions(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(transcription_id, partner_id)
);

ALTER TABLE public.transcription_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transcription_partners_select" ON public.transcription_partners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM voice_transcriptions vt 
      WHERE vt.id = transcription_partners.transcription_id 
      AND can_access_entity_workspace(vt.workspace_id, auth.uid())
    )
  );

CREATE POLICY "transcription_partners_insert" ON public.transcription_partners
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM voice_transcriptions vt 
      WHERE vt.id = transcription_partners.transcription_id 
      AND can_access_entity_workspace(vt.workspace_id, auth.uid())
    )
  );

CREATE POLICY "transcription_partners_delete" ON public.transcription_partners
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM voice_transcriptions vt 
      WHERE vt.id = transcription_partners.transcription_id 
      AND can_access_entity_workspace(vt.workspace_id, auth.uid())
    )
  );
