-- DIAGNOSTIC : appelle get_viviers_stats EN SIMULANT le contexte de Nick
-- (request.jwt.claims.sub = uid de Nick → auth.uid() = Nick). Aucune modif.
do $$
declare v_uid uuid; v_total bigint;
begin
  select id into v_uid from auth.users where lower(email)='nlq@nlq.fr' limit 1;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid::text, 'role', 'authenticated')::text, true);
  begin
    select total_leads into v_total from public.get_viviers_stats();
    raise notice 'DIAG get_viviers_stats(as Nick) total_leads=%', v_total;
  exception when others then
    raise notice 'DIAG get_viviers_stats(as Nick) ERREUR: %', SQLERRM;
  end;
end $$;
