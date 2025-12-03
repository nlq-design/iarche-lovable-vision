-- ========================================
-- FIX: Rendre la politique publique PERMISSIVE
-- ========================================

-- Supprimer la politique restrictive existante
DROP POLICY IF EXISTS "Lecture publique forms actifs" ON public.forms;

-- Recréer en mode PERMISSIVE (par défaut)
CREATE POLICY "Lecture publique forms actifs"
ON public.forms
FOR SELECT
TO anon, authenticated
USING (is_active = true);