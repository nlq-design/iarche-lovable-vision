-- UNE requête, UNE ligne de résultat. Colle-moi le résultat en texte.
-- (Supabase Studio › SQL)
SELECT
  (SELECT count(*) FROM public.viviers)                                              AS total_viviers,
  (SELECT count(*) FROM public.viviers WHERE workspace_id = '00000000-0000-0000-0000-000000000001') AS viviers_ws001,
  (SELECT count(*) FROM public.viviers WHERE workspace_id IS NULL)                   AS viviers_null,
  (SELECT count(*) FROM public.viviers WHERE workspace_id IS NOT NULL
        AND workspace_id <> '00000000-0000-0000-0000-000000000001')                  AS viviers_autre_ws,
  (SELECT count(*) FROM public.workspace_members
        WHERE user_id = auth.uid()
          AND workspace_id = '00000000-0000-0000-0000-000000000001')                 AS je_suis_membre_001,
  public.has_role(auth.uid(), 'super_admin'::app_role)                               AS je_suis_super_admin,
  public.has_cockpit_access(auth.uid())                                              AS jai_acces_cockpit;
