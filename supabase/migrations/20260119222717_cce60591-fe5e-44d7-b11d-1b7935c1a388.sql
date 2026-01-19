-- =====================================================
-- FIX COMMENTS - Restreindre lecture aux approuvés
-- =====================================================

-- Supprimer policy publique si elle existe
DROP POLICY IF EXISTS "Public can view comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;

-- Nouvelle policy : lecture publique UNIQUEMENT des commentaires approuvés
CREATE POLICY "Public view approved comments only"
ON public.comments FOR SELECT
TO anon, authenticated
USING (approved = true);

-- =====================================================
-- FIX FORMS - Renforcer la protection des settings
-- =====================================================

-- La table forms N'A PAS de workspace_id
-- Elle est publique par design (formulaires du site)
-- On garde la policy existante "Lecture publique forms actifs" 
-- mais on supprime la lecture publique directe et on force via la vue

-- Supprimer la policy de lecture publique directe
DROP POLICY IF EXISTS "Lecture publique forms actifs" ON public.forms;

-- Créer une policy qui bloque la lecture directe pour anon
-- Les utilisateurs anonymes doivent passer par forms_public
CREATE POLICY "Anon must use forms_public view"
ON public.forms FOR SELECT
TO anon
USING (false);

-- Les utilisateurs authentifiés peuvent lire les forms actifs
CREATE POLICY "Authenticated read active forms"
ON public.forms FOR SELECT
TO authenticated
USING (is_active = true);

-- =====================================================
-- VÉRIFICATION
-- =====================================================
-- Les settings sensibles sont maintenant protégés :
-- - anon : doit passer par forms_public (sans settings)
-- - authenticated : peut lire forms actifs directement
-- - admin : accès complet via policies existantes