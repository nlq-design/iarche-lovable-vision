import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingRequest {
  action: 'get-slots' | 'create-booking' | 'cancel-booking';
  bookingTypeSlug?: string;
  date?: string;
  bookingData?: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    message?: string;
    startTime: string;
    bookingTypeId: string;
  };
  bookingId?: string;
}

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
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // Create JWT
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signInput = `${headerB64}.${payloadB64}`;

  // Import private key and sign
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

  // Exchange JWT for access token
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

// Get busy times from Google Calendar
async function getBusyTimes(accessToken: string, timeMin: string, timeMax: string): Promise<{ start: string; end: string }[]> {
  const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID not configured');

  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: [{ id: calendarId }],
    }),
  });

  const data = await response.json();
  return data.calendars?.[calendarId]?.busy || [];
}

// Create event in Google Calendar
async function createCalendarEvent(
  accessToken: string,
  summary: string,
  description: string,
  startTime: string,
  endTime: string,
  attendeeEmail: string
): Promise<{ eventId: string; meetLink?: string }> {
  const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID not configured');

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary,
        description,
        start: { dateTime: startTime, timeZone: 'Europe/Paris' },
        end: { dateTime: endTime, timeZone: 'Europe/Paris' },
        attendees: [{ email: attendeeEmail }],
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 1440 },
            { method: 'popup', minutes: 30 },
          ],
        },
      }),
    }
  );

  const data = await response.json();
  if (data.error) {
    console.error('Calendar event error:', data.error);
    throw new Error(data.error.message || 'Failed to create calendar event');
  }

  return {
    eventId: data.id,
    meetLink: data.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri,
  };
}

// Delete event from Google Calendar
async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID not configured');

  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );
}

// Generate available time slots for a date
function generateSlots(
  date: string,
  durationMinutes: number,
  bufferMinutes: number,
  availability: { start_time: string; end_time: string }[],
  busyTimes: { start: string; end: string }[],
  existingBookings: { start_time: string; end_time: string }[]
): string[] {
  const slots: string[] = [];
  const dateObj = new Date(date);
  
  for (const avail of availability) {
    const [startH, startM] = avail.start_time.split(':').map(Number);
    const [endH, endM] = avail.end_time.split(':').map(Number);
    
    let current = new Date(dateObj);
    current.setHours(startH, startM, 0, 0);
    
    const endTime = new Date(dateObj);
    endTime.setHours(endH, endM, 0, 0);
    
    while (current.getTime() + durationMinutes * 60000 <= endTime.getTime()) {
      const slotStart = current.toISOString();
      const slotEnd = new Date(current.getTime() + durationMinutes * 60000).toISOString();
      
      // Check if slot conflicts with busy times
      const isBusy = busyTimes.some(busy => {
        const busyStart = new Date(busy.start).getTime();
        const busyEnd = new Date(busy.end).getTime();
        const slotStartMs = current.getTime();
        const slotEndMs = current.getTime() + durationMinutes * 60000;
        return slotStartMs < busyEnd && slotEndMs > busyStart;
      });
      
      // Check if slot conflicts with existing bookings
      const isBooked = existingBookings.some(booking => {
        const bookingStart = new Date(booking.start_time).getTime();
        const bookingEnd = new Date(booking.end_time).getTime();
        const slotStartMs = current.getTime();
        const slotEndMs = current.getTime() + durationMinutes * 60000;
        return slotStartMs < bookingEnd && slotEndMs > bookingStart;
      });
      
      if (!isBusy && !isBooked && current.getTime() > Date.now()) {
        slots.push(slotStart);
      }
      
      current = new Date(current.getTime() + (durationMinutes + bufferMinutes) * 60000);
    }
  }
  
  return slots;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, bookingTypeSlug, date, bookingData, bookingId }: BookingRequest = await req.json();

    console.log(`Calendar booking action: ${action}`, { bookingTypeSlug, date });

    if (action === 'get-slots') {
      if (!bookingTypeSlug || !date) {
        return new Response(
          JSON.stringify({ error: 'Missing bookingTypeSlug or date' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get booking type
      const { data: bookingType, error: typeError } = await supabase
        .from('booking_types')
        .select('*')
        .eq('slug', bookingTypeSlug)
        .eq('is_active', true)
        .single();

      if (typeError || !bookingType) {
        return new Response(
          JSON.stringify({ error: 'Booking type not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get day of week (0 = Sunday, 1 = Monday, etc.)
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();

      // Get availability for this day
      const { data: availability } = await supabase
        .from('booking_availability')
        .select('start_time, end_time')
        .eq('booking_type_id', bookingType.id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

      if (!availability || availability.length === 0) {
        return new Response(
          JSON.stringify({ slots: [], bookingType }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get existing bookings for this date
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('booking_type_id', bookingType.id)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString());

      // Get busy times from Google Calendar
      let busyTimes: { start: string; end: string }[] = [];
      try {
        const accessToken = await getAccessToken();
        busyTimes = await getBusyTimes(accessToken, dayStart.toISOString(), dayEnd.toISOString());
      } catch (err) {
        console.warn('Failed to get Google Calendar busy times:', err);
      }

      // Generate available slots
      const slots = generateSlots(
        date,
        bookingType.duration_minutes,
        bookingType.buffer_minutes || 15,
        availability,
        busyTimes,
        existingBookings || []
      );

      return new Response(
        JSON.stringify({ slots, bookingType }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create-booking') {
      if (!bookingData) {
        return new Response(
          JSON.stringify({ error: 'Missing booking data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get booking type
      const { data: bookingType } = await supabase
        .from('booking_types')
        .select('*')
        .eq('id', bookingData.bookingTypeId)
        .single();

      if (!bookingType) {
        return new Response(
          JSON.stringify({ error: 'Booking type not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const startTime = new Date(bookingData.startTime);
      const endTime = new Date(startTime.getTime() + bookingType.duration_minutes * 60000);

      // Create or find lead
      let leadId = null;
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('email', bookingData.email)
        .eq('source', 'booking')
        .maybeSingle();

      if (existingLead) {
        leadId = existingLead.id;
      } else {
        const { data: newLead } = await supabase
          .from('leads')
          .insert({
            name: bookingData.name,
            email: bookingData.email,
            phone: bookingData.phone,
            company: bookingData.company,
            source: 'booking',
            source_context: bookingType.name,
            message: bookingData.message,
          })
          .select()
          .single();
        leadId = newLead?.id;
      }

      // Create Google Calendar event
      let googleEventId = null;
      let googleMeetLink = null;
      try {
        const accessToken = await getAccessToken();
        const eventResult = await createCalendarEvent(
          accessToken,
          `${bookingType.name} - ${bookingData.name}`,
          `Email: ${bookingData.email}\nTéléphone: ${bookingData.phone || 'Non renseigné'}\nEntreprise: ${bookingData.company || 'Non renseignée'}\n\nMessage: ${bookingData.message || 'Aucun'}`,
          startTime.toISOString(),
          endTime.toISOString(),
          bookingData.email
        );
        googleEventId = eventResult.eventId;
        googleMeetLink = eventResult.meetLink;
      } catch (err) {
        console.error('Failed to create Google Calendar event:', err);
      }

      // Create booking record
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          booking_type_id: bookingData.bookingTypeId,
          lead_id: leadId,
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
          company: bookingData.company,
          message: bookingData.message,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'confirmed',
          google_event_id: googleEventId,
          google_meet_link: googleMeetLink,
        })
        .select()
        .single();

      if (bookingError) {
        console.error('Booking error:', bookingError);
        return new Response(
          JSON.stringify({ error: 'Failed to create booking' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send confirmation emails
      try {
        await supabase.functions.invoke('send-user-confirmation', {
          body: {
            email: bookingData.email,
            name: bookingData.name,
            source_type: 'booking',
            source_context: bookingType.name,
          },
        });
      } catch (err) {
        console.warn('Failed to send confirmation email:', err);
      }

      return new Response(
        JSON.stringify({ success: true, booking, googleMeetLink }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'cancel-booking') {
      if (!bookingId) {
        return new Response(
          JSON.stringify({ error: 'Missing bookingId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (!booking) {
        return new Response(
          JSON.stringify({ error: 'Booking not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete Google Calendar event
      if (booking.google_event_id) {
        try {
          const accessToken = await getAccessToken();
          await deleteCalendarEvent(accessToken, booking.google_event_id);
        } catch (err) {
          console.warn('Failed to delete Google Calendar event:', err);
        }
      }

      // Update booking status
      await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', bookingId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in calendar-booking:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});