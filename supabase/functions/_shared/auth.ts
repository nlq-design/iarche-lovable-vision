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
