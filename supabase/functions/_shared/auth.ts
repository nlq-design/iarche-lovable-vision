import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Resolve the authenticated user id from the request's Authorization header.
 * Throws a 401 Response on failure.
 */
export async function resolveUserIdFromRequest(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) {
    throw new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return user.id;
}

export const IARCHE_FOUNDER_WORKSPACE = '00000000-0000-0000-0000-000000000001';

/**
 * Résout le workspace effectif de l'appelant authentifié (isolation multi-tenant).
 *
 * - Staff HQ IArche (admin / cockpit_admin / super_admin) → workspace fondateur IArche (…001).
 * - Locataire standard → son workspace via `workspace_members`.
 *
 * Remplace le `DEFAULT_WORKSPACE_ID = '…001'` hardcodé (SYS-1) dans les fonctions
 * DÉCLENCHÉES PAR UN UTILISATEUR. Ne PAS utiliser dans les jobs cron/système
 * (pas de JWT appelant) — ceux-ci restent sur …001 jusqu'à l'onboarding multi-tenant.
 *
 * @param supabaseAdmin client service-role (bypass RLS)
 * @throws Response 401 (pas d'auth) / 403 (aucun workspace)
 */
export async function resolveCallerWorkspace(
  req: Request,
  supabaseAdmin: SupabaseClient,
): Promise<string> {
  const userId = await resolveUserIdFromRequest(req);

  const { data: hq } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['admin', 'cockpit_admin', 'super_admin'])
    .limit(1)
    .maybeSingle();
  if (hq) return IARCHE_FOUNDER_WORKSPACE;

  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (member?.workspace_id) return member.workspace_id as string;

  throw new Response(
    JSON.stringify({ error: 'Forbidden: no workspace membership for user' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

/**
 * Asserts that the given userId carries the super_admin role in user_roles.
 * Throws a 403 Response otherwise.
 *
 * @param supabaseClient A service-role Supabase client (bypasses RLS).
 * @param userId         The authenticated user's id (resolved from JWT).
 */
export async function assertSuperAdmin(
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data, error } = await supabaseClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'super_admin')
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Response(
      JSON.stringify({ error: 'Forbidden: super_admin role required' }),
      {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
}
