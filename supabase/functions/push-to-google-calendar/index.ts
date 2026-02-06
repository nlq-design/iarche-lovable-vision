import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { trackAPIUsage } from '../_shared/api-tracker.ts';

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
    scope: 'https://www.googleapis.com/auth/calendar',
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

// Create event in Google Calendar
async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    location?: string;
  }
): Promise<{ id: string; htmlLink: string } | null> {
  const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID not configured');

  const eventData = {
    summary: event.summary,
    description: event.description || '',
    start: {
      dateTime: event.start,
      timeZone: 'Europe/Paris',
    },
    end: {
      dateTime: event.end,
      timeZone: 'Europe/Paris',
    },
    location: event.location,
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    }
  );

  const data = await response.json();
  if (data.error) {
    console.error('Calendar API error:', data.error);
    return null;
  }

  return { id: data.id, htmlLink: data.htmlLink };
}

// Update event in Google Calendar
async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: {
    summary?: string;
    description?: string;
    start?: string;
    end?: string;
    location?: string;
  }
): Promise<boolean> {
  const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID not configured');

  const eventData: Record<string, unknown> = {};
  if (event.summary) eventData.summary = event.summary;
  if (event.description) eventData.description = event.description;
  if (event.location) eventData.location = event.location;
  if (event.start) {
    eventData.start = { dateTime: event.start, timeZone: 'Europe/Paris' };
  }
  if (event.end) {
    eventData.end = { dateTime: event.end, timeZone: 'Europe/Paris' };
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    }
  );

  return response.ok;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action = 'sync_all' } = await req.json().catch(() => ({}));
    console.log(`[push-to-google-calendar] Starting push. Action: ${action}`);

    // Get access token
    const accessToken = await getAccessToken();
    console.log('[push-to-google-calendar] Got Google access token');

    const results = {
      bookings_pushed: 0,
      tasks_pushed: 0,
      errors: [] as string[],
    };

    // ==========================================================================
    // 1. Push Cockpit Bookings to Google Calendar (those without google_event_id)
    // ==========================================================================
    if (action === 'sync_all' || action === 'bookings') {
      const { data: unpushedBookings } = await supabase
        .from('bookings')
        .select('*')
        .is('google_event_id', null)
        .in('status', ['confirmed', 'pending'])
        .gte('start_time', new Date().toISOString());

      console.log(`[push-to-google-calendar] Found ${unpushedBookings?.length || 0} unpushed bookings`);

      for (const booking of unpushedBookings || []) {
        try {
          const meetingTypeLabel = {
            visio: '📹 Visio',
            telephone: '📞 Téléphone',
            presentiel: '📍 Présentiel',
          }[booking.meeting_type as string] || '📅 RDV';

          const description = [
            `Participant: ${booking.name}`,
            booking.email ? `Email: ${booking.email}` : '',
            booking.company ? `Entreprise: ${booking.company}` : '',
            booking.phone ? `Téléphone: ${booking.phone}` : '',
            booking.zoom_join_url ? `Zoom: ${booking.zoom_join_url}` : '',
            booking.google_meet_link ? `Meet: ${booking.google_meet_link}` : '',
            booking.message ? `\nMessage: ${booking.message}` : '',
            '\n---\nSynchronisé depuis Cockpit IArche',
          ].filter(Boolean).join('\n');

          const eventResult = await createCalendarEvent(accessToken, {
            summary: `${meetingTypeLabel} - ${booking.name}${booking.company ? ` (${booking.company})` : ''}`,
            description,
            start: booking.start_time,
            end: booking.end_time,
            location: booking.meeting_type === 'presentiel' ? '60 rue François 1er, 75008 Paris' : undefined,
          });

          if (eventResult) {
            await supabase
              .from('bookings')
              .update({ google_event_id: eventResult.id })
              .eq('id', booking.id);
            
            results.bookings_pushed++;
            console.log(`[push-to-google-calendar] Pushed booking: ${booking.name}`);
          }
        } catch (err) {
          console.error(`[push-to-google-calendar] Error pushing booking ${booking.id}:`, err);
          results.errors.push(`Booking ${booking.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    }

    // ==========================================================================
    // 2. Push Cockpit Tasks with due_date to Google Calendar
    // ==========================================================================
    if (action === 'sync_all' || action === 'tasks') {
      const { data: unpushedTasks } = await supabase
        .from('tasks')
        .select('*, leads(name, company)')
        .is('google_event_id', null)
        .not('due_date', 'is', null)
        .in('status', ['pending', 'in_progress'])
        .gte('due_date', new Date().toISOString());

      console.log(`[push-to-google-calendar] Found ${unpushedTasks?.length || 0} unpushed tasks with due dates`);

      for (const task of unpushedTasks || []) {
        try {
          const dueDate = new Date(task.due_date);
          // Create a 30-minute event at 9 AM on the due date
          const startTime = new Date(dueDate);
          startTime.setHours(9, 0, 0, 0);
          const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

          const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' }[task.priority as string] || '⚪';
          const taskTypeLabels: Record<string, string> = {
            follow_up: 'Suivi',
            call: 'Appel',
            meeting: 'Réunion',
            email: 'Email',
            proposal: 'Proposition',
            admin: 'Admin',
          };
          
          const leadInfo = task.leads as { name?: string; company?: string } | null;
          const leadContext = leadInfo ? ` - ${leadInfo.name || ''}${leadInfo.company ? ` (${leadInfo.company})` : ''}` : '';

          const description = [
            `Type: ${taskTypeLabels[task.task_type as string] || task.task_type}`,
            `Priorité: ${task.priority}`,
            task.description ? `\nDescription: ${task.description}` : '',
            leadInfo?.name ? `\nContact: ${leadInfo.name}` : '',
            leadInfo?.company ? `Entreprise: ${leadInfo.company}` : '',
            '\n---\n⚡ Tâche Cockpit IArche',
          ].filter(Boolean).join('\n');

          const eventResult = await createCalendarEvent(accessToken, {
            summary: `${priorityEmoji} [Tâche] ${task.title}${leadContext}`,
            description,
            start: startTime.toISOString(),
            end: endTime.toISOString(),
          });

          if (eventResult) {
            await supabase
              .from('tasks')
              .update({ google_event_id: eventResult.id })
              .eq('id', task.id);
            
            results.tasks_pushed++;
            console.log(`[push-to-google-calendar] Pushed task: ${task.title}`);
          }
        } catch (err) {
          console.error(`[push-to-google-calendar] Error pushing task ${task.id}:`, err);
          results.errors.push(`Task ${task.title}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    }

    console.log(`[push-to-google-calendar] Push complete. Bookings: ${results.bookings_pushed}, Tasks: ${results.tasks_pushed}, Errors: ${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[push-to-google-calendar] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
