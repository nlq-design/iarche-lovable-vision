-- DIAGNOSTIC (lecture) — rôles de Nick + has_cockpit_access. Aucune modif.
do $$
declare v_uid uuid; v_roles text; v_cockpit boolean;
begin
  select id into v_uid from auth.users where lower(email) = 'nlq@nlq.fr' limit 1;
  select string_agg(role::text, ',') into v_roles from public.user_roles where user_id = v_uid;
  begin
    select public.has_cockpit_access(v_uid) into v_cockpit;
  exception when others then v_cockpit := null;
  end;
  raise notice 'DIAG roles=[%] has_cockpit_access=%', coalesce(v_roles,'(aucun)'), v_cockpit;
end $$;
