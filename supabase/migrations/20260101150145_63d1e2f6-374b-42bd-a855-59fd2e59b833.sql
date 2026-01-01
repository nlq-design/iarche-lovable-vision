-- Ajouter colonne document_id pour lier les uploads aux documents générés
ALTER TABLE public.uploaded_files 
ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.generated_documents(id) ON DELETE SET NULL;

-- Créer un index pour les recherches par document
CREATE INDEX IF NOT EXISTS idx_uploaded_files_document_id ON public.uploaded_files(document_id);