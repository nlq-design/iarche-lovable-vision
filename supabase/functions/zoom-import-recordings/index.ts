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
      `Zoom scopes insuffisants: ajoutez cloud_recording:read:list_account_recordings:admin (S2S) ou cloud_recording:read:list_user_recordings. Zoom: ${accountList.resp.status} - ${accountMessage}`
    );
  }

  throw new Error(`Zoom API error: ${userList.resp.status} - ${userMessage}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
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
    const action = body.action || 'list';

    // ========================================
    // ACTION: list — List Zoom cloud recordings
    // ========================================
    if (action === 'list') {
      const zoomToken = await getZoomAccessToken();
      const from = body.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const to = body.to || new Date().toISOString().split('T')[0];

      console.log(`[zoom-import] Listing recordings from ${from} to ${to}`);

      const listData = await listZoomRecordings(zoomToken, from, to);
      const meetings = listData.meetings || [];

      // Check which meeting IDs are already imported
      const meetingIds = meetings.map((m: any) => String(m.id));
      const { data: existingTranscriptions } = await supabaseService
        .from('voice_transcriptions')
        .select('ai_metadata')
        .eq('source', 'zoom_recording')
        .in('ai_metadata->>zoom_meeting_id', meetingIds);

      const importedMeetingIds = new Set(
        (existingTranscriptions || []).map((t: any) => t.ai_metadata?.zoom_meeting_id)
      );

      // Also check webhook-imported ones
      const { data: webhookTranscriptions } = await supabaseService
        .from('voice_transcriptions')
        .select('ai_metadata')
        .eq('source', 'zoom_recording');
      
      const allImportedIds = new Set([
        ...importedMeetingIds,
        ...(webhookTranscriptions || []).map((t: any) => t.ai_metadata?.zoom_meeting_id).filter(Boolean),
      ]);

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

      return new Response(JSON.stringify({ recordings, total: listData.total_records || recordings.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================
    // ACTION: import — Import a specific recording
    // ========================================
    if (action === 'import') {
      const meetingId = body.meeting_id;
      if (!meetingId) throw new Error('meeting_id required');

      console.log(`[zoom-import] Importing recording for meeting ${meetingId}`);

      const zoomToken = await getZoomAccessToken();

      // Get recording details
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

      // Download
      console.log(`[zoom-import] Downloading ${audioFile.file_extension} (${audioFile.file_size} bytes)`);
      const downloadResp = await fetch(`${audioFile.download_url}?access_token=${zoomToken}`);
      if (!downloadResp.ok) throw new Error(`Download failed: ${downloadResp.status}`);

      const audioBlob = await downloadResp.arrayBuffer();

      // Upload to storage
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

      // Find linked booking
      const { data: linkedBooking } = await supabaseService
        .from('bookings')
        .select('id, name, email, company, lead_id, start_time')
        .eq('zoom_meeting_id', meetingId)
        .maybeSingle();

      const leadId = linkedBooking?.lead_id || null;
      const contactName = linkedBooking?.name || topic;

      // Create transcription record
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
    console.error('[zoom-import] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
