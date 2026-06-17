-- Corrige la visibilité des viviers dans le cockpit :
-- 1) garantit que Nick (nlq@nlq.fr) est membre du workspace IArche …001
--    (les fonctions get_viviers_stats/count filtrent sur super_admin OU membre).
-- 2) re-garantit workspace_id = …001 sur tous les viviers.
-- + diagnostic via NOTICE.

insert into public.workspace_members (workspace_id, user_id, role, status)
select '00000000-0000-0000-0000-000000000001', u.id, 'owner', 'active'
from auth.users u
where lower(u.email) = 'nlq@nlq.fr'
on conflict (workspace_id, user_id) do nothing;

update public.viviers
set workspace_id = '00000000-0000-0000-0000-000000000001'
where workspace_id is distinct from '00000000-0000-0000-0000-000000000001';

do $$
declare
  v_uid uuid;
  v_member boolean;
  v_super boolean;
  v_total bigint;
  v_001 bigint;
begin
  select id into v_uid from auth.users where lower(email) = 'nlq@nlq.fr' limit 1;
  select exists(select 1 from public.workspace_members
                where workspace_id='00000000-0000-0000-0000-000000000001' and user_id=v_uid) into v_member;
  begin
    select public.has_role(v_uid, 'super_admin'::app_role) into v_super;
  exception when others then v_super := null;
  end;
  select count(*) into v_total from public.viviers;
  select count(*) into v_001 from public.viviers where workspace_id='00000000-0000-0000-0000-000000000001';
  raise notice 'DIAG nick_uid=% membre001=% super_admin=% viviers_total=% viviers_001=%',
    v_uid, v_member, v_super, v_total, v_001;
end $$;
