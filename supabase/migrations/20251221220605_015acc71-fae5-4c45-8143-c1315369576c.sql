-- Create solution_leads table for linking leads to solutions
CREATE TABLE public.solution_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  interest_level text DEFAULT 'interested',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(solution_id, lead_id)
);

-- Enable RLS
ALTER TABLE public.solution_leads ENABLE ROW LEVEL SECURITY;

-- Cockpit users can view solution leads
CREATE POLICY "cockpit_solution_leads_select" ON public.solution_leads
  FOR SELECT USING (
    public.has_role(auth.uid(), 'cockpit_user') OR 
    public.has_role(auth.uid(), 'cockpit_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Cockpit users can insert solution leads  
CREATE POLICY "cockpit_solution_leads_insert" ON public.solution_leads
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'cockpit_user') OR 
    public.has_role(auth.uid(), 'cockpit_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Cockpit users can update solution leads
CREATE POLICY "cockpit_solution_leads_update" ON public.solution_leads
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'cockpit_user') OR 
    public.has_role(auth.uid(), 'cockpit_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Cockpit admins can delete solution leads
CREATE POLICY "cockpit_solution_leads_delete" ON public.solution_leads
  FOR DELETE USING (
    public.has_role(auth.uid(), 'cockpit_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Index for performance
CREATE INDEX idx_solution_leads_solution ON public.solution_leads(solution_id);
CREATE INDEX idx_solution_leads_lead ON public.solution_leads(lead_id);