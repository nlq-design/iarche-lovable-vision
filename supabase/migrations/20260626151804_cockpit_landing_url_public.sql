-- ════════════════════════════════════════════════════════════════════════
-- Repoint de la solution "Cockpit by IArche" vers sa landing publique.
--
-- Avant : landing_url = '/cockpit' → route interne GATED (ProtectedCockpitRoute),
--         donc /solutions/cockpit renvoyait un visiteur public vers le login,
--         sans page de présentation.
-- Après : landing_url = '/cockpit-solution' → nouvelle landing marketing publique
--         (src/pages/CockpitSolution.tsx), construite sur la charte v4.
--
-- Idempotent (UPDATE ciblé par slug) et réversible :
--   UPDATE ... SET landing_url='/cockpit', is_external=false ... pour annuler.
-- ════════════════════════════════════════════════════════════════════════

UPDATE public.solution_meta sm
SET landing_url = '/cockpit-solution',
    is_external = false,
    updated_at  = now()
FROM public.articles a
WHERE a.id = sm.solution_id
  AND a.slug = 'cockpit'
  AND a.resource_type = 'solution';
