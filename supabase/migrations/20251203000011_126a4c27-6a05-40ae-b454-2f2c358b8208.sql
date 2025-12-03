-- ========================================
-- FIX: GRANT permissions sur forms
-- ========================================

-- Accorder SELECT à anon et authenticated (lecture publique)
GRANT SELECT ON public.forms TO anon, authenticated;

-- Accorder toutes les permissions aux authenticated (pour admin via RLS)
GRANT INSERT, UPDATE, DELETE ON public.forms TO authenticated;

-- Même chose pour form_responses et form_analytics
GRANT SELECT ON public.form_responses TO authenticated;
GRANT INSERT ON public.form_responses TO anon, authenticated;
GRANT DELETE ON public.form_responses TO authenticated;

GRANT SELECT ON public.form_analytics TO authenticated;
GRANT INSERT ON public.form_analytics TO anon, authenticated;