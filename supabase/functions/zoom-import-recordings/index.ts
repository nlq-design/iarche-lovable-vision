import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

// Scopes requis pour un import complet des enregistrements Zoom
const REQUIRED_ZOOM_SCOPES = [
  'cloud_recording:read:list_user_recordings:admin',
  'user:read:list_users:admin',
];
const OPTIONAL_ZOOM_SCOPES = [
  'cloud_recording:read:list_account_recordings:master',
];

async function getZoomAccessToken(): Promise<{ token: string; scopes: string[] }> {
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
  const scopes = typeof data.scope === 'string' ? data.scope.split(/\s+/).filter(Boolean) : [];
  return { token: data.access_token, scopes };
}

function diagnoseScopes(grantedScopes: string[]) {
  const granted = new Set(grantedScopes);
  const missing_required = REQUIRED_ZOOM_SCOPES.filter((s) => !granted.has(s));
  const missing_optional = OPTIONAL_ZOOM_SCOPES.filter((s) => !granted.has(s));
  return {
    granted_scopes: grantedScopes,
    required_scopes: REQUIRED_ZOOM_SCOPES,
    optional_scopes: OPTIONAL_ZOOM_SCOPES,
    missing_required,
    missing_optional,
    ready: missing_required.length === 0,
  };
}

function extractMissingScopes(zoomError: string | null | undefined): string[] {
  const match = String(zoomError || '').match(/scopes:\[([^\]]+)\]/i);
  if (!match?.[1]) return [];
  return match[1].split(',').map((scope) => scope.trim()).filter(Boolean);
}

function mergeEndpointScopeFindings(scopeDiag: ReturnType<typeof diagnoseScopes>, endpointErrors: Array<string | null | undefined>) {
  const endpointMissingScopes = Array.from(new Set(endpointErrors.flatMap(extractMissingScopes)));
  const missingRequired = Array.from(new Set([
    ...scopeDiag.missing_required,
    ...endpointMissingScopes.filter((scope) => REQUIRED_ZOOM_SCOPES.includes(scope)),
  ]));
  const missingOptional = Array.from(new Set([
    ...scopeDiag.missing_optional,
    ...endpointMissingScopes.filter((scope) => OPTIONAL_ZOOM_SCOPES.includes(scope)),
  ]));

  return {
    ...scopeDiag,
    missing_required: missingRequired,
    missing_optional: missingOptional,
    ready: missingRequired.length === 0,
  };
}

async function zoomGet(url: string, zoomToken: string) {
  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${zoomToken}` },
  });
  const text = await resp.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  return { resp, data, text };
}

async function probeZoomScopeAccess(zoomToken: string) {
  const today = new Date().toISOString().split('T')[0];
  const probes = [
    { label: 'Utilisateur propriétaire de l\'app Zoom', endpoint: '/users/me/recordings', url: `https://api.zoom.us/v2/users/me/recordings?from=${today}&to=${today}&page_size=1` },
    { label: 'Tous les utilisateurs du compte Zoom', endpoint: '/users', url: 'https://api.zoom.us/v2/users?page_size=1&status=active' },
    { label: 'Enregistrements au niveau du compte Zoom', endpoint: '/accounts/{accountId}/recordings', url: `https://api.zoom.us/v2/accounts/${Deno.env.get('ZOOM_ACCOUNT_ID')}/recordings?from=${today}&to=${today}&page_size=1` },
  ];

  const checks = [];
  for (const probe of probes) {
    const result = await zoomGet(probe.url, zoomToken);
    checks.push({
      label: probe.label,
      endpoint: probe.endpoint,
      ok: result.resp.ok,
      status: result.resp.status,
      zoom_error: result.resp.ok ? null : result.data?.message || result.text || null,
    });
  }
  return checks;
}

/**
 * Strategy: try multiple Zoom API endpoints for listing recordings,
 * since S2S apps have different scopes available depending on account type.
 * 
 * Order of attempts:
 * 1. GET /users/me/recordings (user-level scope)
 * 2. GET /users (list users) → GET /users/{id}/recordings (admin scope)
 */
async function listZoomRecordings(zoomToken: string, from: string, to: string) {
  const allMeetings: any[] = [];
  const seenIds = new Set<string>();
  const sourceChecks: any[] = [];

  // Strategy 1: Direct /users/me/recordings
  const userList = await zoomGet(
    `https://api.zoom.us/v2/users/me/recordings?from=${from}&to=${to}&page_size=100`,
    zoomToken
  );
  console.log(
    `[zoom-import] /users/me/recordings → HTTP ${userList.resp.status}, meetings=${userList.data?.meetings?.length ?? 0}`
  );
  sourceChecks.push({
    label: "Utilisateur propriétaire de l'app Zoom",
    endpoint: '/users/me/recordings',
    ok: userList.resp.ok,
    status: userList.resp.status,
    recordings_count: userList.data?.meetings?.length ?? 0,
    zoom_error: userList.resp.ok ? null : userList.data?.message || userList.text || null,
  });
  if (userList.resp.ok && userList.data?.meetings) {
    for (const m of userList.data.meetings) {
      if (!seenIds.has(String(m.id))) { seenIds.add(String(m.id)); allMeetings.push(m); }
    }
  }

  // Strategy 2: List account users then per-user recordings (always run to enrich)
  const usersResp = await zoomGet(
    'https://api.zoom.us/v2/users?page_size=300&status=active',
    zoomToken
  );
  console.log(
    `[zoom-import] /users → HTTP ${usersResp.resp.status}, users=${usersResp.data?.users?.length ?? 0}` +
    (!usersResp.resp.ok ? ` err="${usersResp.data?.message || usersResp.text?.slice(0,200)}"` : '')
  );
  const usersError = usersResp.data?.message || usersResp.text || null;
  sourceChecks.push({
    label: 'Tous les utilisateurs du compte Zoom',
    endpoint: '/users',
    ok: usersResp.resp.ok,
    status: usersResp.resp.status,
    users_count: usersResp.data?.users?.length ?? 0,
    zoom_error: usersResp.resp.ok ? null : usersError,
  });

  if (usersResp.resp.ok && usersResp.data?.users?.length > 0) {
    for (const user of usersResp.data.users) {
      const userRecordings = await zoomGet(
        `https://api.zoom.us/v2/users/${user.id}/recordings?from=${from}&to=${to}&page_size=100`,
        zoomToken
      );
      const count = userRecordings.data?.meetings?.length ?? 0;
      console.log(
        `[zoom-import] user ${user.email} → HTTP ${userRecordings.resp.status}, meetings=${count}`
      );
      if (userRecordings.resp.ok && userRecordings.data?.meetings) {
        for (const m of userRecordings.data.meetings) {
          if (!seenIds.has(String(m.id))) { seenIds.add(String(m.id)); allMeetings.push(m); }
        }
      }
    }
  }

  // Strategy 3: Account-level recordings (requires master scope)
  const accountId = Deno.env.get('ZOOM_ACCOUNT_ID');
  let accountList: any = null;
  if (accountId) {
    accountList = await zoomGet(
      `https://api.zoom.us/v2/accounts/${accountId}/recordings?from=${from}&to=${to}&page_size=100`,
      zoomToken
    );
    console.log(
      `[zoom-import] /accounts/{accountId}/recordings → HTTP ${accountList.resp.status}, meetings=${accountList.data?.meetings?.length ?? 0}` +
      (!accountList.resp.ok ? ` err="${accountList.data?.message || accountList.text?.slice(0,200)}"` : '')
    );
    sourceChecks.push({
      label: 'Enregistrements au niveau du compte Zoom',
      endpoint: '/accounts/{accountId}/recordings',
      ok: accountList.resp.ok,
      status: accountList.resp.status,
      recordings_count: accountList.data?.meetings?.length ?? 0,
      zoom_error: accountList.resp.ok ? null : accountList.data?.message || accountList.text || null,
    });
    if (accountList.resp.ok && accountList.data?.meetings) {
      for (const m of accountList.data.meetings) {
        if (!seenIds.has(String(m.id))) { seenIds.add(String(m.id)); allMeetings.push(m); }
      }
    }
  }

  const diagnostic = { range: { from, to }, source_checks: sourceChecks };

  if (allMeetings.length > 0) {
    return { meetings: allMeetings, total_records: allMeetings.length, diagnostic };
  }

  if (userList.resp.ok || usersResp.resp.ok) {
    const missingUserListScope = String(usersError || '').includes('user:read:list_users:admin');
    if (userList.resp.ok && !usersResp.resp.ok && missingUserListScope) {
      return {
        meetings: [],
        total_records: 0,
        warning:
          "Le connecteur Zoom répond, mais il ne voit que l'utilisateur propriétaire de l'app Zoom. Zoom refuse la vérification des autres utilisateurs du compte : le scope user:read:list_users:admin manque. Si l'enregistrement appartient à un autre utilisateur Zoom que ce propriétaire, il restera invisible ici.",
        error_code: 'ZOOM_USER_LIST_SCOPE_MISSING',
        required_scopes: ['user:read:list_users:admin', 'cloud_recording:read:list_user_recordings:admin'],
        zoom_error: usersError,
        diagnostic,
      };
    }

    // APIs OK mais réellement aucun enregistrement cloud accessible sur la période
    return { meetings: [], total_records: 0, diagnostic };
  }

  const requiredScopes = [
    'cloud_recording:read:list_user_recordings',
    'cloud_recording:read:list_user_recordings:admin',
    'cloud_recording:read:list_account_recordings:master',
  ];
  const scopeErrorMessage =
    `Accès aux enregistrements Zoom non autorisé. Ajoutez un des scopes suivants dans votre app Zoom Server-to-Server OAuth : ` +
    requiredScopes.join(', ') + '.';

  console.warn(`[zoom-import] ${scopeErrorMessage} Dernière erreur Zoom: ${userList.data?.message || userList.text}`);

  return {
    meetings: [],
    total_records: 0,
    warning: scopeErrorMessage,
    error_code: 'ZOOM_MISSING_RECORDING_SCOPES',
    required_scopes: requiredScopes,
    zoom_error: userList.data?.message || userList.text || null,
    diagnostic,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let action = 'unknown';

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json();
    action = body.action || 'list';

    // ========================================
    // ========================================
    // ACTION: check_scopes (préflight)
    // ========================================
    if (action === 'check_scopes') {
      try {
        const { token: zoomToken, scopes } = await getZoomAccessToken();
        const endpointChecks = await probeZoomScopeAccess(zoomToken);
        const diag = mergeEndpointScopeFindings(diagnoseScopes(scopes), endpointChecks.map((check) => check.zoom_error));
        const blockingChecks = endpointChecks.filter((check) => !check.ok && check.endpoint !== '/accounts/{accountId}/recordings');
        console.log(`[zoom-import] check_scopes → granted=${scopes.length}, missing_required=${diag.missing_required.length}, blocking_checks=${blockingChecks.length}`);
        return new Response(JSON.stringify({
          ok: true,
          ...diag,
          ready: diag.ready && blockingChecks.length === 0,
          endpoint_checks: endpointChecks,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e.message || 'Zoom credentials error' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (action === 'list') {
      const { token: zoomToken, scopes } = await getZoomAccessToken();
      const scopeDiag = diagnoseScopes(scopes);
      const from = body.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const to = body.to || new Date().toISOString().split('T')[0];

      console.log(`[zoom-import] Listing recordings from ${from} to ${to} (granted scopes: ${scopes.length}, missing required: ${scopeDiag.missing_required.length})`);

      const listData = await listZoomRecordings(zoomToken, from, to);
      const effectiveScopeDiag = mergeEndpointScopeFindings(scopeDiag, listData.diagnostic?.source_checks?.map((check: any) => check.zoom_error) || []);
      const meetings = listData.meetings || [];

      const { data: webhookTranscriptions } = await supabaseService
        .from('voice_transcriptions')
        .select('ai_metadata')
        .eq('source', 'zoom_recording');

      const allImportedIds = new Set(
        (webhookTranscriptions || []).map((t: any) => t.ai_metadata?.zoom_meeting_id).filter(Boolean)
      );

      const recordings = meetings.map((m: any) => {
        const audioFile = (m.recording_files || []).find(
          (f: any) => f.recording_type === 'audio_only'
        ) || (m.recording_files || []).find(
          (f: any) => ['mp4', 'm4a', 'mp3'].includes(f.file_extension?.toLowerCase())
        );

        return {
          meeting_id: String(m.id),
          topic: m.topic || 'Réunion Zoom',
          start_time: m.start_time,
          duration: m.duration,
          total_size: m.total_size,
          has_audio: !!audioFile,
          audio_format: audioFile?.file_extension || null,
          audio_size: audioFile?.file_size || null,
          already_imported: allImportedIds.has(String(m.id)),
          recording_count: (m.recording_files || []).length,
        };
      });

      return new Response(JSON.stringify({
        recordings,
        total: listData.total_records || recordings.length,
        warning: listData.warning || null,
        error_code: listData.error_code || null,
        required_scopes: listData.required_scopes || null,
        zoom_error: listData.zoom_error || null,
        diagnostic: listData.diagnostic || null,
        scope_check: effectiveScopeDiag,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================
    // ACTION: import
    // ========================================
    if (action === 'import') {
      const meetingId = body.meeting_id;
      if (!meetingId) throw new Error('meeting_id required');

      console.log(`[zoom-import] Importing recording for meeting ${meetingId}`);
      const { token: zoomToken } = await getZoomAccessToken();

      const recUrl = `https://api.zoom.us/v2/meetings/${meetingId}/recordings`;
      const recResp = await fetch(recUrl, {
        headers: { 'Authorization': `Bearer ${zoomToken}` },
      });

      if (!recResp.ok) {
        const errText = await recResp.text();
        throw new Error(`Zoom API error: ${recResp.status} - ${errText}`);
      }

      const recData = await recResp.json();
      const topic = recData.topic || 'Réunion Zoom';
      const recordingFiles = recData.recording_files || [];

      const audioFile = recordingFiles.find(
        (f: any) => f.recording_type === 'audio_only'
      ) || recordingFiles.find(
        (f: any) => ['mp4', 'm4a', 'mp3'].includes(f.file_extension?.toLowerCase())
      );

      if (!audioFile) throw new Error('No audio file found in this recording');

      console.log(`[zoom-import] Downloading ${audioFile.file_extension} (${audioFile.file_size} bytes)`);
      const downloadResp = await fetch(`${audioFile.download_url}?access_token=${zoomToken}`);
      if (!downloadResp.ok) throw new Error(`Download failed: ${downloadResp.status}`);

      const audioBlob = await downloadResp.arrayBuffer();

      const fileExt = audioFile.file_extension?.toLowerCase() || 'mp4';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const storagePath = `zoom-recordings/${meetingId}_${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabaseService.storage
        .from('voice-transcriptions')
        .upload(storagePath, audioBlob, {
          contentType: `audio/${fileExt === 'mp4' ? 'mp4' : fileExt}`,
          upsert: false,
        });

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      const { data: linkedBooking } = await supabaseService
        .from('bookings')
        .select('id, name, email, company, lead_id, start_time')
        .eq('zoom_meeting_id', meetingId)
        .maybeSingle();

      const leadId = linkedBooking?.lead_id || null;
      const contactName = linkedBooking?.name || topic;

      const { data: transcription, error: insertError } = await supabaseService
        .from('voice_transcriptions')
        .insert({
          workspace_id: DEFAULT_WORKSPACE_ID,
          storage_path: storagePath,
          source: 'zoom_recording',
          lead_id: leadId,
          original_filename: `${topic}.${fileExt}`,
          file_size_bytes: audioBlob.byteLength,
          duration_seconds: audioFile.recording_end
            ? Math.round((new Date(audioFile.recording_end).getTime() - new Date(audioFile.recording_start).getTime()) / 1000)
            : null,
          audio_format: fileExt,
          transcription_date: recData.start_time || new Date().toISOString(),
          status: 'queued',
          auto_create_tasks: true,
          analysis_context: `Enregistrement Zoom importé manuellement : "${topic}" avec ${contactName}.${linkedBooking?.company ? ` Entreprise: ${linkedBooking.company}.` : ''}`,
          ai_metadata: {
            autonomy_level: 'N0',
            validated_by_human: false,
            validation_required: false,
            zoom_meeting_id: meetingId,
            zoom_topic: topic,
            booking_id: linkedBooking?.id || null,
            source: 'zoom_manual_import',
          },
        })
        .select('id, status')
        .single();

      if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);

      console.log(`[zoom-import] ✅ Imported: ${transcription.id}`);

      return new Response(JSON.stringify({
        ok: true,
        transcription_id: transcription.id,
        meeting_topic: topic,
        linked_booking: linkedBooking?.id || null,
        file_size: audioBlob.byteLength,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isZoomScopeError =
      action === 'list' &&
      (
        message.includes('list_user_recordings') ||
        message.includes('list_account_recordings') ||
        message.includes('Impossible de lister les enregistrements Zoom') ||
        message.includes('Zoom scopes')
      );

    if (isZoomScopeError) {
      console.warn('[zoom-import] Returning degraded list response due to missing Zoom scopes');
      return new Response(
        JSON.stringify({
          recordings: [],
          total: 0,
          warning: message,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error('[zoom-import] Error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
