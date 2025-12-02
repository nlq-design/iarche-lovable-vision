-- ========================================
-- FIX TABLE FORMS - Policies RLS
-- ========================================

-- Supprimer TOUTES les policies existantes sur forms
DROP POLICY IF EXISTS "Admin full access forms" ON forms;
DROP POLICY IF EXISTS "Forms actifs lisibles publiquement" ON forms;
DROP POLICY IF EXISTS "Public peut lire forms actifs" ON forms;

-- 1. LECTURE PUBLIQUE (anon + authenticated) - formulaires actifs uniquement
CREATE POLICY "Lecture publique forms actifs" 
ON forms 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);

-- 2. LECTURE ADMIN - tous les formulaires (actifs ou non)
CREATE POLICY "Admin lecture forms" 
ON forms 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. INSERT ADMIN
CREATE POLICY "Admin insert forms" 
ON forms 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. UPDATE ADMIN
CREATE POLICY "Admin update forms" 
ON forms 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. DELETE ADMIN
CREATE POLICY "Admin delete forms" 
ON forms 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Vérifier RLS activé
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;