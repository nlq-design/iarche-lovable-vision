import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Parse Google Service Account credentials
function getGoogleAuth() {
  const keyJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  return JSON.parse(keyJson);
}

// Get Google OAuth2 access token using service account
async function getAccessToken(): Promise<string> {
  const credentials = getGoogleAuth();
  const now = Math.floor(Date.now() / 1000);
  
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signInput = `${headerB64}.${payloadB64}`;

  const pemContents = credentials.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(signInput));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signInput}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    console.error('Token error:', tokenData);
    throw new Error('Failed to get access token');
  }
  return tokenData.access_token;
}

// Get events from Google Calendar
async function getCalendarEvents(
  accessToken: string, 
  timeMin: string, 
  timeMax: string
): Promise<any[]> {
  const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID not configured');

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();
  if (data.error) {
    console.error('Calendar API error:', data.error);
    throw new Error(data.error.message || 'Failed to get calendar events');
  }

  return data.items || [];
}

// Extract email and name from event description or summary
function parseEventDetails(event: any): { name: string; email: string; company?: string } | null {
  // Try to extract from description
  const description = event.description || '';
  const summary = event.summary || '';
  
  // Look for email pattern
  const emailMatch = description.match(/[\w.-]+@[\w.-]+\.\w+/);
  const email = emailMatch ? emailMatch[0] : null;
  
  // Try to extract name from summary or description
  let name = summary.split(' - ')[0] || summary;
  
  // Look for company in description
  const companyMatch = description.match(/Entreprise:\s*(.+)/i) || description.match(/Société:\s*(.+)/i);
  const company = companyMatch ? companyMatch[1].trim() : undefined;
  
  if (!email) {
    // If no email found, we can't create a proper booking
    return null;
  }
  
  return { name, email, company };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, daysAhead = 30, daysBefore = 7 } = await req.json();
    
    console.log(`[sync-google-calendar] Action: ${action}, daysAhead: ${daysAhead}, daysBefore: ${daysBefore}`);

    // Get access token
    const accessToken = await getAccessToken();

    // ── Action: get-events (real-time Google Calendar events for cockpit) ──
    if (action === 'get-events') {
      const now = new Date();
      const timeMin = new Date(now.getTime() - daysBefore * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

      const events = await getCalendarEvents(accessToken, timeMin, timeMax);

      // Get existing google_event_ids from bookings to mark which are already synced
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('google_event_id')
        .not('google_event_id', 'is', null);
      const syncedIds = new Set(existingBookings?.map(b => b.google_event_id) || []);

      const calendarEvents = events
        .filter((e: any) => e.status !== 'cancelled' && e.start?.dateTime)
        .map((event: any) => ({
          id: event.id,
          summary: event.summary || '(Sans titre)',
          start: event.start.dateTime,
          end: event.end?.dateTime || event.start.dateTime,
          meetLink: event.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri || null,
          location: event.location || null,
          description: event.description || null,
          isSynced: syncedIds.has(event.id),
          source: 'google_calendar' as const,
        }));

      return new Response(
        JSON.stringify({ success: true, events: calendarEvents, timeRange: { from: timeMin, to: timeMax } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Action: sync (import Google → DB) ──
    console.log('[sync-google-calendar] Starting sync...');

    // Define time range
    const now = new Date();
    const timeMin = new Date(now.getTime() - daysBefore * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

    // Get events from Google Calendar
    const events = await getCalendarEvents(accessToken, timeMin, timeMax);
    console.log(`[sync-google-calendar] Found ${events.length} events in Google Calendar`);

    // Get existing bookings with google_event_id
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('google_event_id')
      .not('google_event_id', 'is', null);
    
    const existingEventIds = new Set(existingBookings?.map(b => b.google_event_id) || []);
    console.log(`[sync-google-calendar] Found ${existingEventIds.size} existing synced bookings`);

    // Get default booking type (Premier échange)
    const { data: defaultBookingType } = await supabase
      .from('booking_types')
      .select('id, duration_minutes')
      .eq('slug', 'premier-echange')
      .single();

    if (!defaultBookingType) {
      throw new Error('Default booking type "premier-echange" not found');
    }

    const results = {
      synced: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process each event
    for (const event of events) {
      const eventId = event.id;
      
      // Skip if already synced
      if (existingEventIds.has(eventId)) {
        results.skipped++;
        continue;
      }

      // Skip cancelled events
      if (event.status === 'cancelled') {
        results.skipped++;
        continue;
      }

      // Skip all-day events (no specific time)
      if (!event.start?.dateTime) {
        results.skipped++;
        continue;
      }

      // Parse event details
      const details = parseEventDetails(event);
      if (!details) {
        console.log(`[sync-google-calendar] Skipping event "${event.summary}" - no email found`);
        results.skipped++;
        continue;
      }

      const startTime = new Date(event.start.dateTime);
      const endTime = new Date(event.end?.dateTime || new Date(startTime.getTime() + defaultBookingType.duration_minutes * 60000));
      
      // Determine meeting type from event
      let meetingType: 'visio' | 'telephone' | 'presentiel' = 'visio';
      const summaryLower = (event.summary || '').toLowerCase();
      const descLower = (event.description || '').toLowerCase();
      
      if (summaryLower.includes('présentiel') || summaryLower.includes('bureau') || descLower.includes('présentiel')) {
        meetingType = 'presentiel';
      } else if (summaryLower.includes('téléphone') || summaryLower.includes('appel') || descLower.includes('téléphone')) {
        meetingType = 'telephone';
      }

      // Extract Meet/Zoom links
      const meetLink = event.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri;
      const zoomMatch = (event.description || '').match(/https:\/\/[\w.-]+\.zoom\.us\/j\/\d+/);
      
      try {
        // Create booking record
        const { error: insertError } = await supabase
          .from('bookings')
          .insert({
            booking_type_id: defaultBookingType.id,
            name: details.name,
            email: details.email,
            company: details.company,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: 'confirmed',
            google_event_id: eventId,
            google_meet_link: meetLink || null,
            zoom_join_url: zoomMatch ? zoomMatch[0] : null,
            meeting_type: meetingType,
            message: `Synchronisé depuis Google Calendar: ${event.summary}`,
            notes: event.description || null,
          });

        if (insertError) {
          console.error(`[sync-google-calendar] Error inserting booking for "${event.summary}":`, insertError);
          results.errors.push(`${event.summary}: ${insertError.message}`);
        } else {
          console.log(`[sync-google-calendar] Synced event: ${event.summary} at ${startTime.toISOString()}`);
          results.synced++;
        }
      } catch (err) {
        console.error(`[sync-google-calendar] Error processing event "${event.summary}":`, err);
        results.errors.push(`${event.summary}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    console.log(`[sync-google-calendar] Sync complete. Synced: ${results.synced}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timeRange: { from: timeMin, to: timeMax },
        totalEventsFound: events.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-google-calendar] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
