-- Ajoute la colonne `slug` à `partners`.
--
-- Le code (routing /cockpit/partenaires/:slug, page détail, formulaire qui
-- requiert le slug, useEntityLinks, useWorkspacePartners) suppose une colonne
-- `slug` qui n'existait pas en base (drift de la migration off-Lovable) :
--   - tsc échouait (partners.slug introuvable)
--   - createPartner insérait `slug` → création de partenaire cassée
-- Aucun backfill nécessaire (0 partenaire au moment de l'ajout).
--
-- Unicité par workspace (le routing slug est résolu dans le contexte workspace).

alter table public.partners add column if not exists slug text;

create unique index if not exists partners_workspace_slug_key
  on public.partners (workspace_id, slug)
  where slug is not null;
