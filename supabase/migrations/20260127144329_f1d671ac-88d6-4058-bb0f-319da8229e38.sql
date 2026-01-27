
-- ============================================
-- PHASE 2: MULTI-TENANT HARDENING
-- Sécurisation des 4 tables critiques
-- ============================================

-- 1. VIVIER_LISTS: Déjà workspace_id, juste corriger RLS
-- Supprimer l'ancienne politique permissive
DROP POLICY IF EXISTS "Authenticated users can view vivier lists" ON public.vivier_lists;

-- Nouvelle politique avec isolation workspace
CREATE POLICY "Workspace users can view vivier lists" 
ON public.vivier_lists FOR SELECT TO authenticated
USING (
  has_cockpit_access(auth.uid()) 
  AND (workspace_id IS NULL OR can_access_workspace(workspace_id, auth.uid()))
);

-- Corriger INSERT pour exiger workspace_id
DROP POLICY IF EXISTS "Cockpit users can create vivier lists" ON public.vivier_lists;
CREATE POLICY "Cockpit users can create vivier lists" 
ON public.vivier_lists FOR INSERT TO authenticated
WITH CHECK (
  has_cockpit_access(auth.uid()) 
  AND workspace_id IS NOT NULL 
  AND can_access_workspace(workspace_id, auth.uid())
);

-- Corriger UPDATE/DELETE
DROP POLICY IF EXISTS "Cockpit users can update vivier lists" ON public.vivier_lists;
DROP POLICY IF EXISTS "Cockpit users can delete vivier lists" ON public.vivier_lists;

CREATE POLICY "Cockpit users can update vivier lists" 
ON public.vivier_lists FOR UPDATE TO authenticated
USING (has_cockpit_access(auth.uid()) AND can_access_workspace(workspace_id, auth.uid()))
WITH CHECK (has_cockpit_access(auth.uid()) AND can_access_workspace(workspace_id, auth.uid()));

CREATE POLICY "Cockpit users can delete vivier lists" 
ON public.vivier_lists FOR DELETE TO authenticated
USING (has_cockpit_access(auth.uid()) AND can_access_workspace(workspace_id, auth.uid()));

-- 2. VIVIER_CAMPAIGN_EVENTS: Ajouter workspace_id + RLS
ALTER TABLE public.vivier_campaign_events 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);

-- Backfill avec workspace interne
UPDATE public.vivier_campaign_events 
SET workspace_id = '00000000-0000-0000-0000-000000000001'
WHERE workspace_id IS NULL;

-- Index performance
CREATE INDEX IF NOT EXISTS idx_vivier_campaign_events_workspace 
ON public.vivier_campaign_events(workspace_id, created_at DESC);

-- Corriger RLS
DROP POLICY IF EXISTS "Authenticated users can view campaign events" ON public.vivier_campaign_events;
DROP POLICY IF EXISTS "Cockpit users can insert campaign events" ON public.vivier_campaign_events;

CREATE POLICY "Workspace users can view campaign events" 
ON public.vivier_campaign_events FOR SELECT TO authenticated
USING (has_cockpit_access(auth.uid()) AND can_access_workspace(workspace_id, auth.uid()));

CREATE POLICY "Cockpit users can insert campaign events" 
ON public.vivier_campaign_events FOR INSERT TO authenticated
WITH CHECK (
  has_cockpit_access(auth.uid()) 
  AND workspace_id IS NOT NULL 
  AND can_access_workspace(workspace_id, auth.uid())
);

-- 3. KEYWORD_ALIAS_SUGGESTIONS: Ajouter workspace_id + RLS
ALTER TABLE public.keyword_alias_suggestions 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);

UPDATE public.keyword_alias_suggestions 
SET workspace_id = '00000000-0000-0000-0000-000000000001'
WHERE workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_keyword_alias_suggestions_workspace 
ON public.keyword_alias_suggestions(workspace_id, created_at DESC);

-- Corriger RLS
DROP POLICY IF EXISTS "Authenticated users can manage suggestions" ON public.keyword_alias_suggestions;
DROP POLICY IF EXISTS "Authenticated users can view suggestions" ON public.keyword_alias_suggestions;

CREATE POLICY "Workspace users can view suggestions" 
ON public.keyword_alias_suggestions FOR SELECT TO authenticated
USING (has_cockpit_access(auth.uid()) AND can_access_workspace(workspace_id, auth.uid()));

CREATE POLICY "Workspace users can manage suggestions" 
ON public.keyword_alias_suggestions FOR ALL TO authenticated
USING (has_cockpit_access(auth.uid()) AND can_access_workspace(workspace_id, auth.uid()))
WITH CHECK (has_cockpit_access(auth.uid()) AND can_access_workspace(workspace_id, auth.uid()));

-- 4. KEYWORD_SYNONYMS: Ajouter workspace_id + RLS
ALTER TABLE public.keyword_synonyms 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);

UPDATE public.keyword_synonyms 
SET workspace_id = '00000000-0000-0000-0000-000000000001'
WHERE workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_keyword_synonyms_workspace 
ON public.keyword_synonyms(workspace_id, created_at DESC);

-- Corriger RLS
DROP POLICY IF EXISTS "Authenticated users can manage synonyms" ON public.keyword_synonyms;
DROP POLICY IF EXISTS "Authenticated users can view synonyms" ON public.keyword_synonyms;

CREATE POLICY "Workspace users can view synonyms" 
ON public.keyword_synonyms FOR SELECT TO authenticated
USING (has_cockpit_access(auth.uid()) AND can_access_workspace(workspace_id, auth.uid()));

CREATE POLICY "Workspace users can manage synonyms" 
ON public.keyword_synonyms FOR ALL TO authenticated
USING (has_cockpit_access(auth.uid()) AND can_access_workspace(workspace_id, auth.uid()))
WITH CHECK (has_cockpit_access(auth.uid()) AND can_access_workspace(workspace_id, auth.uid()));
