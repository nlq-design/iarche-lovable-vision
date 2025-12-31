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

// Get events from Google Calendar (including cancelled for full sync)
async function getCalendarEvents(
  accessToken: string, 
  timeMin: string, 
  timeMax: string,
  showDeleted: boolean = true
): Promise<any[]> {
  const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID not configured');

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    showDeleted: showDeleted.toString(),
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

// Extract email and name from event
function parseEventDetails(event: any): { name: string; email: string; company?: string; phone?: string } {
  const description = event.description || '';
  const summary = event.summary || '';
  
  // Try to get email from attendees first
  const attendees = event.attendees || [];
  const externalAttendee = attendees.find((a: any) => !a.self && !a.organizer);
  let email = externalAttendee?.email;
  
  // Fallback: look for email in description
  if (!email) {
    const emailMatch = description.match(/[\w.-]+@[\w.-]+\.\w+/);
    email = emailMatch ? emailMatch[0] : null;
  }
  
  // If still no email, use event creator or generate placeholder
  if (!email) {
    email = event.creator?.email || `event-${event.id}@calendar.sync`;
  }
  
  // Extract name
  let name = externalAttendee?.displayName || summary.split(' - ')[0] || summary.split(' avec ')[0] || summary;
  
  // Look for company/phone in description
  const companyMatch = description.match(/(?:Entreprise|Société|Company):\s*(.+)/i);
  const company = companyMatch ? companyMatch[1].trim().split('\n')[0] : undefined;
  
  const phoneMatch = description.match(/(?:Tél|Tel|Phone|Téléphone):\s*([\d\s.+-]+)/i);
  const phone = phoneMatch ? phoneMatch[1].trim() : undefined;
  
  return { name: name.substring(0, 255), email, company, phone };
}

// Determine meeting type from event
function determineMeetingType(event: any): 'visio' | 'telephone' | 'presentiel' {
  const summaryLower = (event.summary || '').toLowerCase();
  const descLower = (event.description || '').toLowerCase();
  const hasVideoConference = event.conferenceData?.entryPoints?.some((e: any) => e.entryPointType === 'video');
  const hasZoomLink = (event.description || '').includes('zoom.us/j/');
  
  if (summaryLower.includes('présentiel') || summaryLower.includes('bureau') || descLower.includes('présentiel') || summaryLower.includes('sur place')) {
    return 'presentiel';
  } else if (summaryLower.includes('téléphone') || summaryLower.includes('appel tel') || descLower.includes('appel téléphonique')) {
    return 'telephone';
  } else if (hasVideoConference || hasZoomLink || summaryLower.includes('visio') || summaryLower.includes('zoom') || summaryLower.includes('meet')) {
    return 'visio';
  }
  
  // Default to visio if has any conference link
  return hasVideoConference || hasZoomLink ? 'visio' : 'presentiel';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, daysAhead = 60, daysBefore = 30 } = await req.json();
    
    console.log(`[sync-google-calendar] Starting FULL MIRROR sync. daysAhead: ${daysAhead}, daysBefore: ${daysBefore}`);

    // Get access token
    const accessToken = await getAccessToken();
    console.log('[sync-google-calendar] Got Google access token');

    // Define time range (larger window for complete sync)
    const now = new Date();
    const timeMin = new Date(now.getTime() - daysBefore * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

    // Get ALL events from Google Calendar (including deleted/cancelled)
    const events = await getCalendarEvents(accessToken, timeMin, timeMax, true);
    console.log(`[sync-google-calendar] Found ${events.length} events in Google Calendar`);

    // Get ALL existing bookings with google_event_id in the time range
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('id, google_event_id, start_time, end_time, name, email, company, status, notes')
      .not('google_event_id', 'is', null)
      .gte('start_time', timeMin)
      .lte('start_time', timeMax);
    
    const bookingsByEventId = new Map(existingBookings?.map(b => [b.google_event_id, b]) || []);
    console.log(`[sync-google-calendar] Found ${bookingsByEventId.size} existing synced bookings in range`);

    // Get default booking type
    const { data: defaultBookingType } = await supabase
      .from('booking_types')
      .select('id, duration_minutes')
      .eq('slug', 'premier-echange')
      .single();

    if (!defaultBookingType) {
      throw new Error('Default booking type "premier-echange" not found');
    }

    const results = {
      created: 0,
      updated: 0,
      cancelled: 0,
      unchanged: 0,
      errors: [] as string[],
    };

    // Track which Google event IDs we've seen
    const seenGoogleEventIds = new Set<string>();

    // Process each Google Calendar event
    for (const event of events) {
      const eventId = event.id;
      seenGoogleEventIds.add(eventId);
      
      const existingBooking = bookingsByEventId.get(eventId);
      
      // Handle cancelled/deleted events
      if (event.status === 'cancelled') {
        if (existingBooking && existingBooking.status !== 'cancelled') {
          const { error } = await supabase
            .from('bookings')
            .update({ 
              status: 'cancelled',
              cancellation_reason: 'Annulé depuis Google Calendar',
              cancelled_at: new Date().toISOString()
            })
            .eq('id', existingBooking.id);
          
          if (!error) {
            console.log(`[sync-google-calendar] Cancelled booking: ${existingBooking.name}`);
            results.cancelled++;
          } else {
            results.errors.push(`Cancel ${existingBooking.name}: ${error.message}`);
          }
        }
        continue;
      }

      // Skip all-day events (no specific time)
      if (!event.start?.dateTime) {
        continue;
      }

      // Parse event details
      const details = parseEventDetails(event);
      const startTime = new Date(event.start.dateTime);
      const endTime = new Date(event.end?.dateTime || new Date(startTime.getTime() + defaultBookingType.duration_minutes * 60000));
      const meetingType = determineMeetingType(event);
      
      // Extract conference links
      const meetLink = event.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri;
      const zoomMatch = (event.description || '').match(/https:\/\/[\w.-]+\.zoom\.us\/j\/\d+[^\s]*/);
      
      const bookingData = {
        booking_type_id: defaultBookingType.id,
        name: details.name,
        email: details.email,
        phone: details.phone || null,
        company: details.company || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'confirmed',
        google_event_id: eventId,
        google_meet_link: meetLink || null,
        zoom_join_url: zoomMatch ? zoomMatch[0] : null,
        meeting_type: meetingType,
        message: `Synchronisé depuis Google Calendar: ${event.summary}`,
        notes: event.description || null,
      };

      if (existingBooking) {
        // Check if update is needed
        const needsUpdate = 
          existingBooking.start_time !== bookingData.start_time ||
          existingBooking.end_time !== bookingData.end_time ||
          existingBooking.name !== bookingData.name ||
          existingBooking.status === 'cancelled';
        
        if (needsUpdate) {
          const { error } = await supabase
            .from('bookings')
            .update({
              ...bookingData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingBooking.id);
          
          if (!error) {
            console.log(`[sync-google-calendar] Updated booking: ${details.name} at ${startTime.toISOString()}`);
            results.updated++;
          } else {
            results.errors.push(`Update ${details.name}: ${error.message}`);
          }
        } else {
          results.unchanged++;
        }
      } else {
        // Create new booking
        const { error } = await supabase
          .from('bookings')
          .insert(bookingData);
        
        if (!error) {
          console.log(`[sync-google-calendar] Created booking: ${details.name} at ${startTime.toISOString()}`);
          results.created++;
        } else {
          console.error(`[sync-google-calendar] Error creating booking:`, error);
          results.errors.push(`Create ${details.name}: ${error.message}`);
        }
      }
    }

    // Mark bookings as cancelled if their Google event no longer exists
    for (const [googleEventId, booking] of bookingsByEventId.entries()) {
      if (!seenGoogleEventIds.has(googleEventId) && booking.status !== 'cancelled') {
        const { error } = await supabase
          .from('bookings')
          .update({ 
            status: 'cancelled',
            cancellation_reason: 'Événement supprimé de Google Calendar',
            cancelled_at: new Date().toISOString()
          })
          .eq('id', booking.id);
        
        if (!error) {
          console.log(`[sync-google-calendar] Marked as cancelled (event deleted): ${booking.name}`);
          results.cancelled++;
        }
      }
    }

    console.log(`[sync-google-calendar] FULL MIRROR sync complete:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timeRange: { from: timeMin, to: timeMax },
        totalGoogleEvents: events.length,
        totalExistingBookings: bookingsByEventId.size,
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
