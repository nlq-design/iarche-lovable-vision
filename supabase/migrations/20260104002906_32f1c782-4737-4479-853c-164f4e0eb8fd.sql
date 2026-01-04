-- Ajouter politique SELECT pour les utilisateurs cockpit sur leads
CREATE POLICY "Cockpit users can view leads"
ON public.leads
FOR SELECT
USING (
  has_role(auth.uid(), 'cockpit_user'::app_role) OR
  has_role(auth.uid(), 'cockpit_admin'::app_role)
);

-- Ajouter politique UPDATE pour les utilisateurs cockpit sur leads
CREATE POLICY "Cockpit users can update leads"
ON public.leads
FOR UPDATE
USING (
  has_role(auth.uid(), 'cockpit_user'::app_role) OR
  has_role(auth.uid(), 'cockpit_admin'::app_role)
);

-- Vérifier aussi les politiques sur generated_documents pour les liaisons
-- (déjà gérées via workspace)

-- Ajouter politique pour les projects si manquante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' 
    AND policyname = 'Cockpit users can view projects'
  ) THEN
    EXECUTE 'CREATE POLICY "Cockpit users can view projects" ON public.projects FOR SELECT USING (has_role(auth.uid(), ''cockpit_user''::app_role) OR has_role(auth.uid(), ''cockpit_admin''::app_role))';
  END IF;
END $$;