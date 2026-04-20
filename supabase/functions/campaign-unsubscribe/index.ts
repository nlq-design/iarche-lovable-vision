import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DEFAULT_WORKSPACE_ID } from '../_shared/workspace.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, campaign_id, token } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'email required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lowerEmail = email.toLowerCase().trim();

    // --- Résolution workspace_id : priorité campaign, fallback DEFAULT ---
    let resolvedWorkspaceId: string = DEFAULT_WORKSPACE_ID;
    if (campaign_id) {
      const { data: campaign } = await supabase
        .from('vivier_campaigns')
        .select('workspace_id')
        .eq('id', campaign_id)
        .maybeSingle();
      if (campaign?.workspace_id) {
        resolvedWorkspaceId = campaign.workspace_id;
      }
    }

    // --- Idempotence : si déjà désinscrit pour cette campagne, short-circuit sans double event ---
    if (campaign_id) {
      const { data: existing } = await supabase
        .from('vivier_campaign_recipients')
        .select('id, unsubscribed_at')
        .eq('email', lowerEmail)
        .eq('campaign_id', campaign_id)
        .eq('workspace_id', resolvedWorkspaceId)
        .maybeSingle();

      if (existing?.unsubscribed_at) {
        return new Response(
          JSON.stringify({ success: true, already_unsubscribed: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // --- 1) INSERT event EN PREMIER : source de vérité RGPD, workspace_id obligatoire ---
    const { error: insertError } = await supabase
      .from('vivier_campaign_events')
      .insert({
        campaign_id: campaign_id || null,
        event_type: 'unsubscribe',
        event_data: { email: lowerEmail, source: 'web' },
        workspace_id: resolvedWorkspaceId,
      });

    if (insertError) {
      console.error('[campaign-unsubscribe] INSERT event failed:', insertError);
      return new Response(
        JSON.stringify({ error: 'unsubscribe_failed', detail: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- 2-4) UPDATEs best-effort scopés workspace — try/catch granulaire, log errors, ne bloque pas le flux ---
    const nowIso = new Date().toISOString();

    // 2) UPDATE recipient scopé (email + campaign_id + workspace_id)
    if (campaign_id) {
      try {
        await supabase
          .from('vivier_campaign_recipients')
          .update({ unsubscribed_at: nowIso, status: 'unsubscribed' })
          .eq('email', lowerEmail)
          .eq('campaign_id', campaign_id)
          .eq('workspace_id', resolvedWorkspaceId);
      } catch (err) {
        console.error('[campaign-unsubscribe] UPDATE recipient scoped failed:', err);
      }
    }

    // 3) UPDATE viviers scopé (email + workspace_id)
    try {
      const { data: vivier } = await supabase
        .from('viviers')
        .select('id')
        .eq('email', lowerEmail)
        .eq('workspace_id', resolvedWorkspaceId)
        .maybeSingle();

      if (vivier?.id) {
        await supabase
          .from('viviers')
          .update({ status: 'unsubscribed', unsubscribed_at: nowIso })
          .eq('id', vivier.id);
      }
    } catch (err) {
      console.error('[campaign-unsubscribe] UPDATE vivier failed:', err);
    }

    // 4) UPDATE masse recipients scopé workspace
    try {
      await supabase
        .from('vivier_campaign_recipients')
        .update({ unsubscribed_at: nowIso, status: 'unsubscribed' })
        .eq('email', lowerEmail)
        .eq('workspace_id', resolvedWorkspaceId)
        .is('unsubscribed_at', null);
    } catch (err) {
      console.error('[campaign-unsubscribe] UPDATE mass recipients failed:', err);
    }

    console.log('[campaign-unsubscribe] success', { email: lowerEmail, campaign_id, workspace_id: resolvedWorkspaceId });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
