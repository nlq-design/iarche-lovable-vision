-- Ajouter solution_id à projects (déplacé depuis specifications)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS solution_id uuid REFERENCES public.articles(id) ON DELETE SET NULL;

-- Créer un index pour les requêtes
CREATE INDEX IF NOT EXISTS idx_projects_solution_id ON public.projects(solution_id);

-- Ajouter colonne tags pour project_notes
ALTER TABLE public.project_notes
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Ajouter colonne tags pour project_documents  
ALTER TABLE public.project_documents
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Commentaires
COMMENT ON COLUMN public.projects.solution_id IS 'Solution IArche liée au projet';
COMMENT ON COLUMN public.project_notes.tags IS 'Tags personnalisables pour les notes';
COMMENT ON COLUMN public.project_documents.tags IS 'Tags personnalisables pour les documents';