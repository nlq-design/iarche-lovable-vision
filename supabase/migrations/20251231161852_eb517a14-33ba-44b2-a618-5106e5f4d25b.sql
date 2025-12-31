-- Ajouter lead_id à generated_documents pour lier les documents aux leads
ALTER TABLE public.generated_documents
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- Index pour améliorer les performances de recherche par lead
CREATE INDEX IF NOT EXISTS idx_generated_documents_lead_id ON public.generated_documents(lead_id);

-- RLS pour permettre l'accès via lead (cockpit users peuvent voir les documents liés aux leads)
CREATE POLICY "generated_documents_select_by_lead" ON public.generated_documents
FOR SELECT USING (
  can_access_entity_workspace(workspace_id, auth.uid())
  OR (lead_id IS NOT NULL AND has_cockpit_access(auth.uid()))
);