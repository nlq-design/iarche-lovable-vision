import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

async function getZoomAccessToken(): Promise<string> {
  const accountId = Deno.env.get('ZOOM_ACCOUNT_ID');
  const clientId = Deno.env.get('ZOOM_CLIENT_ID');
  const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');
  if (!accountId || !clientId || !clientSecret) throw new Error('Zoom credentials not configured');

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=account_credentials&account_id=${accountId}`,
  });
  const data = await response.json();
  if (!data.access_token) throw new Error('Failed to get Zoom access token');
  return data.access_token;
}

async function zoomGet(url: string, zoomToken: string) {
  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${zoomToken}` },
  });

  const text = await resp.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  return { resp, data, text };
}

async function listZoomRecordings(zoomToken: string, from: string, to: string) {
  const userListUrl = `https://api.zoom.us/v2/users/me/recordings?from=${from}&to=${to}&page_size=100`;
  const userList = await zoomGet(userListUrl, zoomToken);

  if (userList.resp.ok) return userList.data;

  const userMessage = userList.data?.message || userList.text || 'Unknown Zoom error';
  const missingUserRecordingScope =
    userList.data?.code === 4711 &&
    typeof userMessage === 'string' &&
    userMessage.includes('list_user_recordings');

  // Server-to-Server Zoom apps often expose account-level recording scopes instead of user-level ones.
  if (missingUserRecordingScope) {
    const accountId = Deno.env.get('ZOOM_ACCOUNT_ID');
    if (!accountId) {
      throw new Error('ZOOM_ACCOUNT_ID is required for account-level recordings fallback');
    }

    console.warn('[zoom-import] Missing user-level scopes, retrying with account-level recordings endpoint');
    const accountListUrl = `https://api.zoom.us/v2/accounts/${accountId}/recordings?from=${from}&to=${to}&page_size=100`;
    const accountList = await zoomGet(accountListUrl, zoomToken);

    if (accountList.resp.ok) return accountList.data;

    const accountMessage = accountList.data?.message || accountList.text || 'Unknown Zoom error';
    throw new Error(
      `Zoom scopes insuffisants: ajoutez cloud_recording:read:list_account_recordings:master (S2S) ou cloud_recording:read:list_user_recordings. Zoom: ${accountList.resp.status} - ${accountMessage}`
    );
  }
});
