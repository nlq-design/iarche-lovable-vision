/**
 * MCP API Keys Management Edge Function
 * 
 * Manages CRUD for MCP API keys used to authenticate
 * the MCP server from Claude.ai.
 * 
 * All routes require JWT Supabase auth.
 * Actions: create, list, revoke
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => chars[b % chars.length])
    .join('');
  return `iarche_mcp_${randomPart}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: JWT Supabase obligatoire
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabaseUser.auth.getClaims(token);

    if (authError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claims.claims.sub as string;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    // === CREATE ===
    if (action === 'create') {
      const { label, workspace_id } = body;
      if (!label || !workspace_id) {
        return new Response(
          JSON.stringify({ error: 'label and workspace_id are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const plainKey = generateApiKey();
      const keyHash = await sha256(plainKey);
      const keyPrefix = plainKey.substring(0, 16); // "iarche_mcp_XXXXX"

      const { data, error } = await supabaseAdmin
        .from('mcp_api_keys')
        .insert({
          workspace_id,
          user_id: userId,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          label,
        })
        .select('id, key_prefix, label, created_at')
        .single();

      if (error) {
        console.error('[mcp-api-keys] Create error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return the plain key ONCE — never stored
      return new Response(
        JSON.stringify({
          ...data,
          key: plainKey, // Only time it's returned in clear
          message: 'Copiez cette clé maintenant — elle ne sera plus affichée.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === LIST ===
    if (action === 'list') {
      const { data, error } = await supabaseAdmin
        .from('mcp_api_keys')
        .select('id, key_prefix, label, last_used_at, expires_at, revoked_at, created_at, workspace_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ keys: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === REVOKE ===
    if (action === 'revoke') {
      const { key_id } = body;
      if (!key_id) {
        return new Response(
          JSON.stringify({ error: 'key_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify ownership
      const { data: existingKey } = await supabaseAdmin
        .from('mcp_api_keys')
        .select('id, user_id')
        .eq('id', key_id)
        .single();

      if (!existingKey || existingKey.user_id !== userId) {
        return new Response(
          JSON.stringify({ error: 'Key not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabaseAdmin
        .from('mcp_api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', key_id);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Key revoked' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action. Use: create, list, revoke' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mcp-api-keys] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
