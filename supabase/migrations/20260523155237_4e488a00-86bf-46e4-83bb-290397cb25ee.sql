
-- 1. Ajouter la colonne ai_persona
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS ai_persona JSONB NOT NULL DEFAULT jsonb_build_object(
  'assistant_name', 'Assistant',
  'company', '',
  'city', '',
  'role', 'Assistant commercial',
  'tone', 'Professionnel et concis',
  'language', 'fr'
);

-- 2. Seed le workspace IArche Interne avec la persona Nicolas existante
UPDATE public.workspaces
SET ai_persona = jsonb_build_object(
  'assistant_name', 'Nicolas',
  'company', 'IArche',
  'city', 'Bayonne',
  'role', 'Expert senior en transformation IA',
  'tone', 'Zero Friction, direct, expert',
  'language', 'fr'
)
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 3. Helper SQL pour lecture rapide depuis edge functions
CREATE OR REPLACE FUNCTION public.get_workspace_persona(_workspace_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ai_persona FROM public.workspaces WHERE id = _workspace_id),
    jsonb_build_object(
      'assistant_name', 'Assistant',
      'company', '',
      'city', '',
      'role', 'Assistant commercial',
      'tone', 'Professionnel et concis',
      'language', 'fr'
    )
  );
$$;
