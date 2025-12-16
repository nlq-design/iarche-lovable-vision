-- Nettoyage des politiques SELECT redondantes (ALL inclut déjà SELECT)

-- 1. articles: supprimer la politique SELECT dupliquée
DROP POLICY IF EXISTS "Admins can view all articles" ON public.articles;

-- 2. comments: supprimer la politique SELECT dupliquée
DROP POLICY IF EXISTS "Admins can view all comments" ON public.comments;

-- 3. database_backups: supprimer la politique SELECT dupliquée
DROP POLICY IF EXISTS "Admins can view all backups" ON public.database_backups;

-- 4. leads: supprimer la politique SELECT dupliquée
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;

-- 5. media_templates: supprimer la politique SELECT dupliquée
DROP POLICY IF EXISTS "Admins can view all media templates" ON public.media_templates;

-- 6. newsletters: supprimer la politique SELECT dupliquée
DROP POLICY IF EXISTS "Admins can view all newsletters" ON public.newsletters;

-- 7. performance_metrics: remplacer EXISTS par has_role() pour optimisation
DROP POLICY IF EXISTS "Admins can view performance metrics" ON public.performance_metrics;
DROP POLICY IF EXISTS "Admins can insert performance metrics" ON public.performance_metrics;
DROP POLICY IF EXISTS "Admins can update performance metrics" ON public.performance_metrics;
DROP POLICY IF EXISTS "Admins can delete performance metrics" ON public.performance_metrics;

-- Recréer les politiques performance_metrics avec has_role()
CREATE POLICY "Admins can view performance metrics" 
ON public.performance_metrics 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert performance metrics" 
ON public.performance_metrics 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update performance metrics" 
ON public.performance_metrics 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete performance metrics" 
ON public.performance_metrics 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));