-- Create partner_documents table for personal document space
CREATE TABLE public.partner_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'autre',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'actif',
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_documents ENABLE ROW LEVEL SECURITY;

-- Partners can view their own documents
CREATE POLICY "Partners can view own documents"
ON public.partner_documents FOR SELECT
USING (partner_id IN (
  SELECT id FROM public.partners WHERE user_id = auth.uid()
));

-- Partners can insert their own documents
CREATE POLICY "Partners can insert own documents"
ON public.partner_documents FOR INSERT
WITH CHECK (partner_id IN (
  SELECT id FROM public.partners WHERE user_id = auth.uid()
));

-- Partners can update their own documents
CREATE POLICY "Partners can update own documents"
ON public.partner_documents FOR UPDATE
USING (partner_id IN (
  SELECT id FROM public.partners WHERE user_id = auth.uid()
));

-- Partners can delete their own documents
CREATE POLICY "Partners can delete own documents"
ON public.partner_documents FOR DELETE
USING (partner_id IN (
  SELECT id FROM public.partners WHERE user_id = auth.uid()
));

-- Cockpit users can view all partner documents
CREATE POLICY "Cockpit users can view all partner documents"
ON public.partner_documents FOR SELECT
USING (
  public.has_role(auth.uid(), 'cockpit_user'::app_role)
  OR public.has_role(auth.uid(), 'cockpit_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Cockpit admins can manage all partner documents
CREATE POLICY "Cockpit admins can manage partner documents"
ON public.partner_documents FOR ALL
USING (
  public.has_role(auth.uid(), 'cockpit_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Create updated_at trigger
CREATE TRIGGER update_partner_documents_updated_at
BEFORE UPDATE ON public.partner_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for partner documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-documents', 'partner-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for partner-documents bucket
CREATE POLICY "Partners can upload own documents to storage"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'partner-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Partners can view own documents in storage"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'partner-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Partners can delete own documents in storage"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'partner-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Cockpit admins can access all partner documents in storage"
ON storage.objects FOR ALL
USING (
  bucket_id = 'partner-documents'
  AND (
    public.has_role(auth.uid(), 'cockpit_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Add indexes for performance
CREATE INDEX idx_partner_documents_partner_id ON public.partner_documents(partner_id);
CREATE INDEX idx_partner_documents_category ON public.partner_documents(category);
CREATE INDEX idx_partner_documents_status ON public.partner_documents(status);