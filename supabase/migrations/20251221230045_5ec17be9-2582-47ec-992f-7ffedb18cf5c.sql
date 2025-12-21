-- Create storage bucket for specification files
INSERT INTO storage.buckets (id, name, public)
VALUES ('specifications', 'specifications', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for specifications bucket
CREATE POLICY "Cockpit users can upload specification files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'specifications' 
  AND public.has_cockpit_access(auth.uid())
);

CREATE POLICY "Cockpit users can view specification files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'specifications' 
  AND public.has_cockpit_access(auth.uid())
);

CREATE POLICY "Cockpit users can update specification files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'specifications' 
  AND public.has_cockpit_access(auth.uid())
);

CREATE POLICY "Cockpit admins can delete specification files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'specifications' 
  AND public.has_role(auth.uid(), 'cockpit_admin')
);

-- Add file-related columns to specifications table
ALTER TABLE public.specifications
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS solution_id UUID REFERENCES public.articles(id) ON DELETE SET NULL;

-- Add index for solution lookups
CREATE INDEX IF NOT EXISTS idx_specifications_solution_id ON public.specifications(solution_id);

COMMENT ON COLUMN public.specifications.file_url IS 'URL du fichier uploadé';
COMMENT ON COLUMN public.specifications.tags IS 'Tags personnalisables';
COMMENT ON COLUMN public.specifications.solution_id IS 'Lien vers la solution IArche concernée';