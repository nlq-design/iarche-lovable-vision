-- =====================================================
-- Partner Append-Only: Leads, Projects, Transcriptions
-- v14.0 - Création autorisée pour les partenaires
-- =====================================================

-- 1. Ajouter colonne created_by_partner_id aux tables concernées
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS created_by_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS created_by_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;

ALTER TABLE public.voice_transcriptions 
ADD COLUMN IF NOT EXISTS created_by_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;

-- 2. Index pour performance
CREATE INDEX IF NOT EXISTS idx_leads_created_by_partner ON public.leads(created_by_partner_id) WHERE created_by_partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_created_by_partner ON public.projects(created_by_partner_id) WHERE created_by_partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_created_by_partner ON public.voice_transcriptions(created_by_partner_id) WHERE created_by_partner_id IS NOT NULL;

-- 3. Helper: vérifier si partenaire est lié à un lead (SECURITY DEFINER pour éviter récursion)
CREATE OR REPLACE FUNCTION public.is_lead_partner(p_lead_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lead_partners lp
    JOIN public.partners p ON p.id = lp.partner_id
    WHERE lp.lead_id = p_lead_id
      AND p.user_id = p_user_id
  );
$$;

-- 4. Helper: vérifier si partenaire est lié à une solution (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_solution_partner(p_solution_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.solution_partners sp
    JOIN public.partners p ON p.id = sp.partner_id
    WHERE sp.solution_id = p_solution_id
      AND p.user_id = p_user_id
  );
$$;

-- 5. Helper: vérifier si user a créé un lead en tant que partenaire
CREATE OR REPLACE FUNCTION public.is_lead_creator_partner(p_lead_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leads l
    JOIN public.partners p ON p.id = l.created_by_partner_id
    WHERE l.id = p_lead_id
      AND p.user_id = p_user_id
  );
$$;

-- 6. Helper: vérifier si user a créé un projet en tant que partenaire
CREATE OR REPLACE FUNCTION public.is_project_creator_partner(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects pr
    JOIN public.partners p ON p.id = pr.created_by_partner_id
    WHERE pr.id = p_project_id
      AND p.user_id = p_user_id
  );
$$;

-- 7. Helper: vérifier si user a créé une transcription en tant que partenaire
CREATE OR REPLACE FUNCTION public.is_transcription_creator_partner(p_transcription_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.voice_transcriptions vt
    JOIN public.partners p ON p.id = vt.created_by_partner_id
    WHERE vt.id = p_transcription_id
      AND p.user_id = p_user_id
  );
$$;

-- =====================================================
-- LEADS: Partner INSERT / UPDATE / DELETE policies
-- =====================================================

-- Partner peut créer des leads
CREATE POLICY "Partner can create leads"
ON public.leads
FOR INSERT
WITH CHECK (
  public.is_partner_user()
  AND created_by_partner_id = public.get_current_partner_id()
);

-- Partner peut voir ses propres leads créés (en plus des leads liés)
DROP POLICY IF EXISTS "Partner sees linked leads" ON public.leads;
CREATE POLICY "Partner sees linked leads"
ON public.leads
FOR SELECT
USING (
  public.is_partner_user()
  AND (
    public.is_lead_partner(id, auth.uid())
    OR public.is_lead_creator_partner(id, auth.uid())
  )
);

-- Partner peut modifier ses propres leads créés uniquement
CREATE POLICY "Partner can update own leads"
ON public.leads
FOR UPDATE
USING (
  public.is_partner_user()
  AND public.is_lead_creator_partner(id, auth.uid())
)
WITH CHECK (
  public.is_partner_user()
  AND public.is_lead_creator_partner(id, auth.uid())
);

-- Partner peut supprimer ses propres leads créés uniquement
CREATE POLICY "Partner can delete own leads"
ON public.leads
FOR DELETE
USING (
  public.is_partner_user()
  AND public.is_lead_creator_partner(id, auth.uid())
);

-- =====================================================
-- PROJECTS: Partner INSERT / UPDATE / DELETE policies
-- =====================================================

-- Partner peut créer des projets
CREATE POLICY "Partner can create projects"
ON public.projects
FOR INSERT
WITH CHECK (
  public.is_partner_user()
  AND created_by_partner_id = public.get_current_partner_id()
  AND workspace_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Partner peut voir ses propres projets créés (en plus des projets liés)
DROP POLICY IF EXISTS "Partner sees linked projects" ON public.projects;
CREATE POLICY "Partner sees linked projects"
ON public.projects
FOR SELECT
USING (
  public.is_partner_user()
  AND (
    public.is_project_partner(id, auth.uid())
    OR public.is_project_creator_partner(id, auth.uid())
  )
);

-- Partner peut modifier ses propres projets créés uniquement
CREATE POLICY "Partner can update own projects"
ON public.projects
FOR UPDATE
USING (
  public.is_partner_user()
  AND public.is_project_creator_partner(id, auth.uid())
)
WITH CHECK (
  public.is_partner_user()
  AND public.is_project_creator_partner(id, auth.uid())
);

-- Partner peut supprimer ses propres projets créés uniquement
CREATE POLICY "Partner can delete own projects"
ON public.projects
FOR DELETE
USING (
  public.is_partner_user()
  AND public.is_project_creator_partner(id, auth.uid())
);

-- =====================================================
-- VOICE_TRANSCRIPTIONS: Partner INSERT / UPDATE / DELETE
-- =====================================================

-- Partner peut créer des transcriptions sur leads/projets/solutions liés
CREATE POLICY "Partner can create transcriptions"
ON public.voice_transcriptions
FOR INSERT
WITH CHECK (
  public.is_partner_user()
  AND created_by_partner_id = public.get_current_partner_id()
  AND workspace_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND (
    -- Lié à un lead du partenaire
    (lead_id IS NOT NULL AND public.is_lead_partner(lead_id, auth.uid()))
    -- OU lié à un projet du partenaire
    OR (project_id IS NOT NULL AND public.is_project_partner(project_id, auth.uid()))
    -- OU lié à une solution du partenaire
    OR (solution_id IS NOT NULL AND public.is_solution_partner(solution_id, auth.uid()))
  )
);

-- Partner peut voir ses propres transcriptions créées (en plus des transcriptions liées)
DROP POLICY IF EXISTS "Partner sees linked transcriptions" ON public.voice_transcriptions;
CREATE POLICY "Partner sees linked transcriptions"
ON public.voice_transcriptions
FOR SELECT
USING (
  public.is_partner_user()
  AND (
    public.is_transcription_creator_partner(id, auth.uid())
    OR (lead_id IS NOT NULL AND public.is_lead_partner(lead_id, auth.uid()))
    OR (project_id IS NOT NULL AND public.is_project_partner(project_id, auth.uid()))
  )
);

-- Partner peut modifier ses propres transcriptions uniquement
CREATE POLICY "Partner can update own transcriptions"
ON public.voice_transcriptions
FOR UPDATE
USING (
  public.is_partner_user()
  AND public.is_transcription_creator_partner(id, auth.uid())
)
WITH CHECK (
  public.is_partner_user()
  AND public.is_transcription_creator_partner(id, auth.uid())
);

-- Partner peut supprimer ses propres transcriptions uniquement
CREATE POLICY "Partner can delete own transcriptions"
ON public.voice_transcriptions
FOR DELETE
USING (
  public.is_partner_user()
  AND public.is_transcription_creator_partner(id, auth.uid())
);

-- =====================================================
-- JUNCTION TABLES: Auto-link partner lors de création
-- =====================================================

-- Fonction trigger pour auto-lier le partenaire au lead créé
CREATE OR REPLACE FUNCTION public.auto_link_partner_to_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by_partner_id IS NOT NULL THEN
    INSERT INTO public.lead_partners (lead_id, partner_id, role)
    VALUES (NEW.id, NEW.created_by_partner_id, 'creator')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger pour leads
DROP TRIGGER IF EXISTS trigger_auto_link_partner_lead ON public.leads;
CREATE TRIGGER trigger_auto_link_partner_lead
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_partner_to_lead();

-- Fonction trigger pour auto-lier le partenaire au projet créé
CREATE OR REPLACE FUNCTION public.auto_link_partner_to_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by_partner_id IS NOT NULL THEN
    INSERT INTO public.project_partners (project_id, partner_id, role)
    VALUES (NEW.id, NEW.created_by_partner_id, 'creator')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger pour projects
DROP TRIGGER IF EXISTS trigger_auto_link_partner_project ON public.projects;
CREATE TRIGGER trigger_auto_link_partner_project
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_partner_to_project();