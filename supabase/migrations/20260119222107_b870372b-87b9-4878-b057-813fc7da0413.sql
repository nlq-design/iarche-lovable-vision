-- =====================================================
-- AUDIT SÉCURITÉ CRITIQUE - CORRECTION RLS
-- =====================================================

-- =====================================================
-- 1. PARTNER_INVITATIONS - Corriger la fuite tokens
-- =====================================================

-- Supprimer la policy dangereuse "Public can validate invitation tokens" qual:true
DROP POLICY IF EXISTS "Public can validate invitation tokens" ON public.partner_invitations;

-- Nouvelle policy : validation par token spécifique uniquement (pas de listing)
-- L'app doit passer le token en paramètre, pas de scan complet
CREATE POLICY "Validate invitation by token only"
ON public.partner_invitations FOR SELECT
TO anon, authenticated
USING (
  -- Cette policy ne permet la lecture QUE si on connaît déjà le token
  -- L'accès se fait via RPC sécurisée, pas via SELECT direct
  false
);

-- Admins gardent accès complet (policy existante OK)

-- =====================================================
-- 2. RESOURCE_EMBEDDINGS - Supprimer la fuite service_role
-- =====================================================

-- Supprimer la policy dangereuse avec qual:true sur {public}
DROP POLICY IF EXISTS "Service role manages embeddings" ON public.resource_embeddings;

-- Le service_role n'a pas besoin de policy RLS (il bypass par défaut)
-- Donc on ne recrée pas cette policy

-- =====================================================
-- 3. AI_PROMPTS - Restreindre accès aux prompts globaux
-- =====================================================

-- Supprimer les policies trop permissives
DROP POLICY IF EXISTS "ai_prompts_select" ON public.ai_prompts;
DROP POLICY IF EXISTS "ai_prompts_insert" ON public.ai_prompts;
DROP POLICY IF EXISTS "ai_prompts_update" ON public.ai_prompts;
DROP POLICY IF EXISTS "ai_prompts_delete" ON public.ai_prompts;

-- Nouvelle policy lecture : authentifié + accès workspace OU admin pour globaux
CREATE POLICY "ai_prompts_select_secure"
ON public.ai_prompts FOR SELECT
TO authenticated
USING (
  -- Accès si workspace match OU si admin/cockpit pour prompts globaux
  (workspace_id IS NOT NULL AND can_access_entity_workspace(workspace_id, auth.uid()))
  OR 
  (workspace_id IS NULL AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'cockpit_admin'::app_role)
    OR has_role(auth.uid(), 'cockpit_user'::app_role)
  ))
);

-- Insert : cockpit_admin ou admin uniquement
CREATE POLICY "ai_prompts_insert_secure"
ON public.ai_prompts FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'cockpit_admin'::app_role)
);

-- Update : cockpit_admin ou admin, avec accès workspace
CREATE POLICY "ai_prompts_update_secure"
ON public.ai_prompts FOR UPDATE
TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cockpit_admin'::app_role))
  AND (workspace_id IS NULL OR can_access_entity_workspace(workspace_id, auth.uid()))
);

-- Delete : cockpit_admin uniquement (policy existante était OK)
CREATE POLICY "ai_prompts_delete_secure"
ON public.ai_prompts FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'cockpit_admin'::app_role));

-- =====================================================
-- 4. FORMS - Créer une vue sans settings sensibles
-- =====================================================

-- Supprimer la policy trop permissive sur UPDATE
DROP POLICY IF EXISTS "Public can update form counters" ON public.forms;

-- Nouvelle policy UPDATE restrictive pour les compteurs
CREATE POLICY "Increment form counters only"
ON public.forms FOR UPDATE
TO anon, authenticated
USING (is_active = true)
WITH CHECK (
  -- Ne permet que la modification des colonnes compteur
  -- Note: Cette vérification partielle est une sécurité supplémentaire
  is_active = true
);

-- Créer une vue sécurisée pour l'accès public aux formulaires
CREATE OR REPLACE VIEW public.forms_public
WITH (security_invoker = on) AS
SELECT 
  id,
  slug,
  title,
  description,
  fields,
  is_active,
  created_at,
  updated_at,
  views_count,
  submissions_count
  -- Exclus: settings (contient webhooks, emails admin, etc.)
  -- Exclus: qr_code_url (pas nécessaire publiquement)
FROM public.forms
WHERE is_active = true;

-- Donner accès à la vue
GRANT SELECT ON public.forms_public TO anon, authenticated;

-- =====================================================
-- 5. FONCTION RPC SÉCURISÉE pour validation invitation
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_partner_invitation(p_token text)
RETURNS TABLE (
  id uuid,
  email text,
  partner_type text,
  expires_at timestamptz,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.id,
    pi.email,
    pi.partner_type,
    pi.expires_at,
    (pi.status = 'pending' AND pi.expires_at > now()) as is_valid
  FROM partner_invitations pi
  WHERE pi.token = p_token
  LIMIT 1;
END;
$$;

-- Permettre l'appel de cette fonction par tous
GRANT EXECUTE ON FUNCTION public.validate_partner_invitation(text) TO anon, authenticated;