import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BodySchema = z.object({
  workspace_name: z.string().trim().min(2).max(80),
  workspace_type: z.enum(['solo', 'team']).default('solo'),
  persona: z.object({
    assistant_name: z.string().trim().min(1).max(50),
    company: z.string().trim().max(80).default(''),
    city: z.string().trim().max(80).default(''),
    role: z.string().trim().min(2).max(120).default('Assistant commercial'),
    tone: z.string().trim().max(200).default('Professionnel et concis'),
    language: z.string().trim().length(2).default('fr'),
  }),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimErr } = await userClient.auth.getClaims(token);
    if (claimErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Idempotency : if user already owns a workspace, return it
    const { data: existing } = await admin
      .from('workspace_members')
      .select('workspace_id, workspaces(id, name)')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({
        workspace_id: existing.workspace_id,
        already_exists: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { workspace_name, workspace_type, persona } = parsed.data;

    // 1. Create workspace with persona
    const { data: ws, error: wsErr } = await admin
      .from('workspaces')
      .insert({
        name: workspace_name,
        type: workspace_type,
        owner_id: userId,
        created_by: userId,
        ai_persona: persona,
        subscription_tier: 'trial',
        billing_status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
      })
      .select('id')
      .single();
    if (wsErr) throw wsErr;

    // 2. Add user as owner member
    const { error: memErr } = await admin.from('workspace_members').insert({
      workspace_id: ws.id,
      user_id: userId,
      role: 'owner',
    });
    if (memErr) throw memErr;

    // 3. Grant cockpit_user role
    await admin.from('user_roles').insert({
      user_id: userId,
      role: 'cockpit_user',
    }).select();

    console.log(`[create-cockpit-workspace] Created ${ws.id} for user ${userId}`);

    return new Response(JSON.stringify({
      workspace_id: ws.id,
      already_exists: false,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[create-cockpit-workspace] error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
