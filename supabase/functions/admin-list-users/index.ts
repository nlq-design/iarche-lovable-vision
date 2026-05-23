import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveUserIdFromRequest, assertSuperAdmin } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const userId = await resolveUserIdFromRequest(req);
    await assertSuperAdmin(admin, userId);

    // List auth.users (paginated, single page sufficient for current scale)
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) throw listErr;

    const userIds = list.users.map(u => u.id);

    const [{ data: roles }, { data: profiles }, { data: members }] = await Promise.all([
      admin.from('user_roles').select('user_id, role').in('user_id', userIds),
      admin.from('profiles').select('user_id, full_name, avatar_url, locale, timezone').in('user_id', userIds),
      admin.from('workspace_members').select('user_id, workspace_id, role').in('user_id', userIds),
    ]);

    const rolesByUser = new Map<string, string[]>();
    (roles ?? []).forEach(r => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });
    const profileByUser = new Map((profiles ?? []).map(p => [p.user_id, p]));
    const membershipByUser = new Map<string, Array<{ workspace_id: string; role: string }>>();
    (members ?? []).forEach(m => {
      const arr = membershipByUser.get(m.user_id) ?? [];
      arr.push({ workspace_id: m.workspace_id, role: m.role });
      membershipByUser.set(m.user_id, arr);
    });

    const users = list.users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      email_confirmed_at: u.email_confirmed_at,
      provider: u.app_metadata?.provider ?? 'email',
      roles: rolesByUser.get(u.id) ?? [],
      profile: profileByUser.get(u.id) ?? null,
      workspaces: membershipByUser.get(u.id) ?? [],
    }));

    return new Response(JSON.stringify({ users, total: users.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('admin-list-users error:', e);
    return new Response(JSON.stringify({ error: e.message ?? 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
