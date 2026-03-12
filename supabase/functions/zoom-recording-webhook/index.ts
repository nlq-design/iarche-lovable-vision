import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

// Get Zoom OAuth S2S access token (same credentials as calendar-booking)
async function getZoomAccessToken(): Promise<string> {
  const accountId = Deno.env.get('ZOOM_ACCOUNT_ID');
  const clientId = Deno.env.get('ZOOM_CLIENT_ID');
  const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Zoom credentials not configured');
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=account_credentials&account_id=${accountId}`,
  });

  const data = await response.json();
  if (!data.access_token) {
    console.error('[zoom-webhook] Token error:', data);
    throw new Error('Failed to get Zoom access token');
  }
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[zoom-webhook] Received event:', body.event);

    // ========================================
    // 1. Handle Zoom URL Validation Challenge
    // ========================================
    if (body.event === 'endpoint.url_validation') {
      const plainToken = body.payload?.plainToken;
      const secret = Deno.env.get('ZOOM_WEBHOOK_SECRET_TOKEN');
      if (!secret) {
        console.error('[zoom-webhook] ZOOM_WEBHOOK_SECRET_TOKEN not configured');
        return new Response(JSON.stringify({ error: 'Secret not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // HMAC-SHA256 hash of plainToken using the secret
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(plainToken));
      const hashHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      console.log('[zoom-webhook] URL validation challenge responded');
      return new Response(
        JSON.stringify({ plainToken, encryptedToken: hashHex }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // 2. Handle recording.completed event
    // ========================================
    if (body.event !== 'recording.completed') {
      console.log(`[zoom-webhook] Ignoring event: ${body.event}`);
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = body.payload;
    const meetingId = String(payload?.object?.id || '');
    const meetingTopic = payload?.object?.topic || 'Réunion Zoom';
    const meetingStartTime = payload?.object?.start_time;
    const recordingFiles = payload?.object?.recording_files || [];

    console.log(`[zoom-webhook] Processing recording for meeting ${meetingId}: "${meetingTopic}"`);
    console.log(`[zoom-webhook] Found ${recordingFiles.length} recording file(s)`);

    // Find the best audio file (prefer audio_only, fallback to shared_screen_with_speaker_view)
    const audioFile = recordingFiles.find(
      (f: { recording_type: string; file_extension: string }) =>
        f.recording_type === 'audio_only'
    ) || recordingFiles.find(
      (f: { file_extension: string }) =>
        ['mp4', 'm4a', 'mp3'].includes(f.file_extension?.toLowerCase())
    );

    if (!audioFile) {
      console.error('[zoom-webhook] No suitable audio file found in recording');
      return new Response(
        JSON.stringify({ ok: false, error: 'No audio file in recording' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[zoom-webhook] Selected file: ${audioFile.recording_type} (${audioFile.file_extension}, ${audioFile.file_size} bytes)`);

    // ========================================
    // 3. Download recording from Zoom
    // ========================================
    const zoomToken = await getZoomAccessToken();
    const downloadUrl = audioFile.download_url;

    console.log('[zoom-webhook] Downloading recording from Zoom...');
    const downloadResponse = await fetch(`${downloadUrl}?access_token=${zoomToken}`);

    if (!downloadResponse.ok) {
      const errText = await downloadResponse.text();
      console.error(`[zoom-webhook] Download failed: ${downloadResponse.status} - ${errText}`);
      throw new Error(`Failed to download recording: ${downloadResponse.status}`);
    }

    const audioBlob = await downloadResponse.arrayBuffer();
    console.log(`[zoom-webhook] Downloaded ${audioBlob.byteLength} bytes`);

    // ========================================
    // 4. Upload to Supabase Storage
    // ========================================
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileExtension = audioFile.file_extension?.toLowerCase() || 'mp4';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const storagePath = `zoom-recordings/${meetingId}_${timestamp}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from('voice-transcriptions')
      .upload(storagePath, audioBlob, {
        contentType: `audio/${fileExtension === 'mp4' ? 'mp4' : fileExtension}`,
        upsert: false,
      });

    if (uploadError) {
      console.error('[zoom-webhook] Upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log(`[zoom-webhook] Uploaded to storage: ${storagePath}`);

    // ========================================
    // 5. Find linked booking via zoom_meeting_id
    // ========================================
    const { data: linkedBooking } = await supabase
      .from('bookings')
      .select('id, name, email, company, lead_id, start_time')
      .eq('zoom_meeting_id', meetingId)
      .maybeSingle();

    const leadId = linkedBooking?.lead_id || null;
    const contactName = linkedBooking?.name || meetingTopic;

    console.log(`[zoom-webhook] Linked booking: ${linkedBooking ? `${linkedBooking.name} (${linkedBooking.id})` : 'none'}`);

    // ========================================
    // 6. Create voice_transcriptions record (queued)
    // ========================================
    const { data: transcription, error: insertError } = await supabase
      .from('voice_transcriptions')
      .insert({
        workspace_id: DEFAULT_WORKSPACE_ID,
        storage_path: storagePath,
        source: 'zoom_recording',
        lead_id: leadId,
        original_filename: `${meetingTopic}.${fileExtension}`,
        file_size_bytes: audioBlob.byteLength,
        duration_seconds: audioFile.recording_end ? 
          Math.round((new Date(audioFile.recording_end).getTime() - new Date(audioFile.recording_start).getTime()) / 1000) : null,
        audio_format: fileExtension,
        transcription_date: meetingStartTime || new Date().toISOString(),
        status: 'queued',
        auto_create_tasks: true,
        analysis_context: `Enregistrement Zoom automatique de la réunion "${meetingTopic}" avec ${contactName}.${linkedBooking?.company ? ` Entreprise: ${linkedBooking.company}.` : ''}`,
        ai_metadata: {
          autonomy_level: 'N0',
          validated_by_human: false,
          validation_required: false,
          zoom_meeting_id: meetingId,
          zoom_topic: meetingTopic,
          booking_id: linkedBooking?.id || null,
          source: 'zoom_webhook',
        },
      })
      .select('id, status')
      .single();

    if (insertError) {
      console.error('[zoom-webhook] Insert error:', insertError);
      throw new Error(`DB insert failed: ${insertError.message}`);
    }

    console.log(`[zoom-webhook] ✅ Transcription job created: ${transcription.id} (status: ${transcription.status})`);

    return new Response(
      JSON.stringify({
        ok: true,
        transcription_id: transcription.id,
        meeting_topic: meetingTopic,
        linked_booking: linkedBooking?.id || null,
        file_size: audioBlob.byteLength,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[zoom-webhook] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
