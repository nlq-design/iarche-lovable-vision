import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "https://esm.sh/resend@2.0.0";
import { trackAPIUsage } from '../_shared/api-tracker.ts';
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rateLimit.ts";
import { calendarBookingSchema, validateRequest, type CalendarBookingRequest, type BookingData } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

type MeetingType = 'visio' | 'telephone' | 'presentiel';

// Map solution slugs to display names
function getSolutionDisplayName(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  const solutionNames: Record<string, string> = {
    'collaboria': 'Collaboria',
    'datalia': 'Datalia',
    'team-5-connect': 'Team 5 Connect',
    'lexia': 'Lexia',
    'dialogue-plus': 'Dialogue Plus',
  };
  return solutionNames[slug] || slug;
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

// Get Zoom OAuth access token
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
    console.error('Zoom token error:', data);
    throw new Error('Failed to get Zoom access token');
  }
  return data.access_token;
}

// Create Zoom meeting
async function createZoomMeeting(
  accessToken: string,
  topic: string,
  startTime: string,
  duration: number,
  attendeeEmails: string[]
): Promise<{ meetingId: string; joinUrl: string; password: string }> {
  const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic,
      type: 2, // Scheduled meeting
      start_time: startTime,
      duration,
      timezone: 'Europe/Paris',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        waiting_room: true,
        meeting_invitees: attendeeEmails.map(email => ({ email })),
      },
    }),
  });

  const data = await response.json();
  if (data.code) {
    console.error('Zoom meeting error:', data);
    throw new Error(data.message || 'Failed to create Zoom meeting');
  }

  return {
    meetingId: String(data.id),
    joinUrl: data.join_url,
    password: data.password,
  };
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
  attendeeEmails: string[],
  createMeet: boolean = true
): Promise<{ eventId: string; meetLink?: string }> {
  const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID not configured');

  // Note: Service accounts cannot invite attendees without Domain-Wide Delegation
  // Attendees receive confirmation emails via Resend instead
  const eventBody: any = {
    summary,
    description: `${description}\n\nParticipants: ${attendeeEmails.join(', ')}`,
    start: { dateTime: startTime, timeZone: 'Europe/Paris' },
    end: { dateTime: endTime, timeZone: 'Europe/Paris' },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 1440 },
        { method: 'popup', minutes: 30 },
      ],
    },
  };

  // Only add conference data if creating a Meet link
  if (createMeet) {
    eventBody.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
  }

  console.log('Creating calendar event for calendar:', calendarId);
  
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    }
  );

  const data = await response.json();
  console.log('Calendar API response status:', response.status);
  
  if (data.error) {
    console.error('Calendar event error:', data.error);
    throw new Error(data.error.message || 'Failed to create calendar event');
  }

  return {
    eventId: data.id,
    meetLink: createMeet ? data.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri : undefined,
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

// Get meeting type label in French
function getMeetingTypeLabel(meetingType: MeetingType): string {
  switch (meetingType) {
    case 'visio': return 'Visioconférence Zoom';
    case 'telephone': return 'Appel téléphonique';
    case 'presentiel': return 'Rendez-vous en présentiel';
    default: return 'Visioconférence';
  }
}

// Generate ICS calendar file content
function generateICS(
  summary: string,
  description: string,
  startTime: Date,
  endTime: Date,
  location: string,
  organizerEmail: string,
  attendeeEmails: string[],
  meetLink?: string
): string {
  const formatDateICS = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const uid = crypto.randomUUID();
  const now = formatDateICS(new Date());
  const start = formatDateICS(startTime);
  const end = formatDateICS(endTime);
  
  const fullDescription = meetLink 
    ? `${description}\\n\\nLien de connexion : ${meetLink}`
    : description;

  const attendeesLines = attendeeEmails
    .map(email => `ATTENDEE;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${email}`)
    .join('\n');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//IArche//Booking System//FR
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
SUMMARY:${summary}
DESCRIPTION:${fullDescription.replace(/\n/g, '\\n')}
LOCATION:${location}
ORGANIZER;CN=IArche:mailto:${organizerEmail}
${attendeesLines}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
}

// Address for in-person meetings
const IARCHE_ADDRESS = '25 All. Marines, 64100 Bayonne';

// Email template constants
const EMAIL_COLORS = {
  nightBlue: '#1A2B4A',
  terracotta: '#B04A32',
  offWhite: '#FAF9F7',
  textGray: '#374151',
  mutedGray: '#6B7280',
  lightGray: '#9CA3AF',
  borderGray: '#E5E7EB',
};
const LOGO_URL = 'https://iarche.fr/logos/iarche-main.png';

// Generate HTML email template
function generateEmailHTML(
  name: string,
  bookingTypeName: string,
  startTime: Date,
  endTime: Date,
  meetingType: MeetingType,
  meetLink?: string,
  zoomPassword?: string,
  additionalGuests?: string[],
  phone?: string,
  email?: string,
  company?: string,
  message?: string,
  solutionName?: string
): string {
  const formatDateFr = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    return date.toLocaleDateString('fr-FR', options);
  };

  const formatTimeFr = (date: Date): string => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const meetingTypeLabel = getMeetingTypeLabel(meetingType);
  const locationText = meetingType === 'presentiel' ? IARCHE_ADDRESS : meetingTypeLabel;

  // Durée en minutes
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  // ----- Liens d'agenda (Google / Outlook) -----
  // Format UTC compact YYYYMMDDTHHMMSSZ
  const fmtUtc = (d: Date): string =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const fullDescriptionLines: string[] = [
    `Type : ${bookingTypeName}`,
    solutionName ? `Solution : ${solutionName}` : '',
    `Date : ${formatDateFr(startTime)} à ${formatTimeFr(startTime)}`,
    `Durée : ${durationMinutes} minutes`,
    `Format : ${meetingTypeLabel}`,
    meetingType === 'presentiel' ? `Adresse : ${IARCHE_ADDRESS}` : '',
    meetLink ? `Lien visio : ${meetLink}` : '',
    zoomPassword ? `Mot de passe Zoom : ${zoomPassword}` : '',
    '',
    'Vos coordonnées',
    `Nom : ${name}`,
    email ? `Email : ${email}` : '',
    phone ? `Téléphone : ${phone}` : '',
    company ? `Entreprise : ${company}` : '',
    additionalGuests && additionalGuests.length > 0
      ? `Invités supplémentaires : ${additionalGuests.join(', ')}`
      : '',
    message ? `Message : ${message}` : '',
    '',
    'Contact IArche : nlq@iarche.fr',
  ].filter(Boolean);
  const fullDescription = fullDescriptionLines.join('\n');

  const eventTitle = solutionName
    ? `${bookingTypeName} - ${solutionName} - IArche`
    : `${bookingTypeName} - IArche`;
  const eventLocation = meetLink || (meetingType === 'presentiel' ? IARCHE_ADDRESS : meetingTypeLabel);

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${fmtUtc(startTime)}/${fmtUtc(endTime)}&details=${encodeURIComponent(fullDescription)}&location=${encodeURIComponent(eventLocation)}`;
  const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(eventTitle)}&startdt=${encodeURIComponent(startTime.toISOString())}&enddt=${encodeURIComponent(endTime.toISOString())}&body=${encodeURIComponent(fullDescription)}&location=${encodeURIComponent(eventLocation)}`;

  const guestsHtml = additionalGuests && additionalGuests.length > 0
    ? `<tr>
        <td style="padding-top: 12px;">
          <strong style="color: ${EMAIL_COLORS.nightBlue}; font-size: 14px;">Participants invités</strong><br>
          <span style="color: ${EMAIL_COLORS.textGray}; font-size: 16px;">${additionalGuests.join(', ')}</span>
        </td>
      </tr>`
    : '';

  let connectionSection = '';
  if (meetLink) {
    connectionSection = `
      <table role="presentation" style="width: 100%; margin-bottom: 24px;">
        <tr>
          <td style="text-align: center;">
            <a href="${meetLink}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: ${EMAIL_COLORS.nightBlue}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
              Rejoindre la réunion visio
            </a>
          </td>
        </tr>
        <tr>
          <td style="text-align: center; padding-top: 12px;">
            <span style="font-size: 12px; color: ${EMAIL_COLORS.mutedGray};">ou copiez ce lien : ${meetLink}</span>
            ${zoomPassword ? `<br><span style="font-size: 12px; color: ${EMAIL_COLORS.mutedGray};">Mot de passe : <strong>${zoomPassword}</strong></span>` : ''}
          </td>
        </tr>
      </table>
    `;
  } else if (meetingType === 'telephone') {
    connectionSection = `
      <table role="presentation" style="width: 100%; margin-bottom: 24px; background-color: ${EMAIL_COLORS.offWhite}; border-radius: 8px;">
        <tr>
          <td style="padding: 16px; text-align: center;">
            <p style="margin: 0; color: ${EMAIL_COLORS.textGray}; font-size: 14px;">
              Nous vous appellerons au <strong>${phone || 'numéro que vous avez indiqué'}</strong> à l'heure du rendez-vous.
            </p>
          </td>
        </tr>
      </table>
    `;
  } else if (meetingType === 'presentiel') {
    connectionSection = `
      <table role="presentation" style="width: 100%; margin-bottom: 24px; background-color: ${EMAIL_COLORS.offWhite}; border-radius: 8px;">
        <tr>
          <td style="padding: 16px; text-align: center;">
            <p style="margin: 0; color: ${EMAIL_COLORS.textGray}; font-size: 14px;">
              Rendez-vous dans nos locaux :<br>
              <strong>${IARCHE_ADDRESS}</strong>
            </p>
            <a href="https://maps.google.com/?q=${encodeURIComponent(IARCHE_ADDRESS)}" target="_blank" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background-color: ${EMAIL_COLORS.nightBlue}; color: #ffffff; text-decoration: none; font-size: 12px; border-radius: 4px;">
              Voir sur Google Maps
            </a>
          </td>
        </tr>
      </table>
    `;
  }

  const calendarButtonsSection = `
    <table role="presentation" style="width: 100%; margin-bottom: 16px;">
      <tr>
        <td style="text-align: center; padding-bottom: 8px;">
          <strong style="color: ${EMAIL_COLORS.nightBlue}; font-size: 14px;">Ajouter à votre agenda</strong>
        </td>
      </tr>
      <tr>
        <td style="text-align: center;">
          <a href="${googleUrl}" target="_blank" style="display: inline-block; margin: 4px; padding: 10px 18px; background-color: #ffffff; color: ${EMAIL_COLORS.nightBlue}; text-decoration: none; font-size: 13px; font-weight: 500; border: 1px solid ${EMAIL_COLORS.borderGray}; border-radius: 6px;">Google Calendar</a>
          <a href="${outlookUrl}" target="_blank" style="display: inline-block; margin: 4px; padding: 10px 18px; background-color: #ffffff; color: ${EMAIL_COLORS.nightBlue}; text-decoration: none; font-size: 13px; font-weight: 500; border: 1px solid ${EMAIL_COLORS.borderGray}; border-radius: 6px;">Outlook</a>
        </td>
      </tr>
      <tr>
        <td style="text-align: center; padding-top: 8px;">
          <span style="font-size: 12px; color: ${EMAIL_COLORS.mutedGray};">Apple Calendar / iCloud : ouvrez le fichier .ics joint à cet email.</span>
        </td>
      </tr>
    </table>
  `;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de rendez-vous</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${EMAIL_COLORS.offWhite};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header with gradient and logo -->
          <tr>
            <td style="background: linear-gradient(135deg, ${EMAIL_COLORS.nightBlue} 0%, ${EMAIL_COLORS.terracotta} 100%); padding: 32px 40px; text-align: center;">
              <img src="${LOGO_URL}" alt="IArche" style="height: 40px; margin-bottom: 16px;" />
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Votre rendez-vous est confirmé</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.textGray};">
                Bonjour ${name},<br><br>
                Votre rendez-vous <strong>${bookingTypeName}</strong> a bien été enregistré.
              </p>

              <!-- Booking details card -->
              <table role="presentation" style="width: 100%; background-color: ${EMAIL_COLORS.offWhite}; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid ${EMAIL_COLORS.terracotta};">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <strong style="color: ${EMAIL_COLORS.nightBlue}; font-size: 14px;">Date</strong><br>
                          <span style="color: ${EMAIL_COLORS.textGray}; font-size: 16px;">${formatDateFr(startTime)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <strong style="color: ${EMAIL_COLORS.nightBlue}; font-size: 14px;">Horaire</strong><br>
                          <span style="color: ${EMAIL_COLORS.textGray}; font-size: 16px;">${formatTimeFr(startTime)} - ${formatTimeFr(endTime)} (${durationMinutes} min)</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong style="color: ${EMAIL_COLORS.nightBlue}; font-size: 14px;">Format</strong><br>
                          <span style="color: ${EMAIL_COLORS.textGray}; font-size: 16px;">${locationText}</span>
                        </td>
                      </tr>
                      ${guestsHtml}
                    </table>
                  </td>
                </tr>
              </table>

              ${connectionSection}

              ${calendarButtonsSection}

              <p style="margin: 16px 0 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.mutedGray};">
                Si vous avez des questions ou devez modifier votre rendez-vous, contactez-nous à <a href="mailto:nlq@iarche.fr" style="color: ${EMAIL_COLORS.terracotta};">nlq@iarche.fr</a>.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: ${EMAIL_COLORS.offWhite}; border-top: 1px solid ${EMAIL_COLORS.borderGray}; text-align: center;">
              <img src="${LOGO_URL}" alt="IArche" style="height: 28px; margin-bottom: 12px; opacity: 0.8;" />
              <p style="margin: 0 0 8px; font-size: 12px; color: ${EMAIL_COLORS.lightGray};">
                IArche · Architecte IA · Bayonne, France
              </p>
              <p style="margin: 0;">
                <a href="https://iarche.fr" style="color: ${EMAIL_COLORS.terracotta}; text-decoration: none; font-size: 12px; font-weight: 500;">iarche.fr</a>
                <span style="color: ${EMAIL_COLORS.lightGray}; margin: 0 8px;">·</span>
                <a href="mailto:nlq@iarche.fr" style="color: ${EMAIL_COLORS.nightBlue}; text-decoration: none; font-size: 12px;">nlq@iarche.fr</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Get UTC offset in minutes for Europe/Paris at a given date
function getParisOffsetMs(date: Date): number {
  // Use Intl to determine the actual offset (handles DST automatically)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    hour: 'numeric',
    hourCycle: 'h23',
  });
  // Create two dates: one at UTC midnight, compare with Paris hour
  const utcMidnight = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
  const parisHourStr = formatter.format(utcMidnight);
  const parisHour = parseInt(parisHourStr, 10);
  // Offset = Paris hour - UTC hour (at the reference point of 12:00 UTC)
  const offsetHours = parisHour - 12;
  return offsetHours * 60 * 60 * 1000;
}

// Create a Date object representing a specific hour in Europe/Paris timezone
function createParisDate(dateStr: string, hour: number): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Start with the desired hour in UTC
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, 0, 0, 0));
  // Subtract the Paris offset to get the correct UTC instant
  const offsetMs = getParisOffsetMs(utcDate);
  return new Date(utcDate.getTime() - offsetMs);
}

// Generate available time slots for a date - fixed hourly slots (9h, 10h, 11h, etc.)
function generateSlots(
  date: string,
  durationMinutes: number,
  bufferMinutes: number,
  availability: { start_time: string; end_time: string }[],
  busyTimes: { start: string; end: string }[],
  existingBookings: { start_time: string; end_time: string }[]
): string[] {
  const slots: string[] = [];
  
  for (const avail of availability) {
    const [startH] = avail.start_time.split(':').map(Number);
    const [endH] = avail.end_time.split(':').map(Number);
    
    // Generate slots at fixed hours only (9, 10, 11, 12, etc.) in Europe/Paris
    for (let hour = startH; hour < endH; hour++) {
      const current = createParisDate(date, hour);
      
      const slotEndTime = new Date(current.getTime() + durationMinutes * 60000);
      const endTimeLimit = createParisDate(date, endH);
      
      // Skip if slot end time exceeds availability end time
      if (slotEndTime.getTime() > endTimeLimit.getTime()) {
        continue;
      }
      
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
        slots.push(current.toISOString());
      }
    }
  }
  
  return slots;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Rate limiting - 10 requests per hour per IP for create-booking, 30 for get-slots
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    // Parse and validate request body
    const rawData = await req.json();
    const validation = validateRequest(calendarBookingSchema, rawData, corsHeaders);
    if (!validation.success) {
      return validation.response;
    }
    
    const { action, bookingTypeSlug, date, bookingData, bookingId } = validation.data;

    // Apply stricter rate limiting for create-booking action
    const rateLimitConfig = action === 'create-booking' 
      ? { maxRequests: 5, windowMinutes: 60 }  // 5 bookings per hour
      : { maxRequests: 30, windowMinutes: 60 }; // 30 slot checks per hour
    
    const { allowed, remaining } = await checkRateLimit(
      supabase, 
      clientIP, 
      `calendar-booking-${action}`, 
      rateLimitConfig
    );
    
    if (!allowed) {
      console.warn(`Rate limit exceeded for IP ${clientIP} on ${action}`);
      return new Response(
        JSON.stringify({ error: 'Trop de requêtes. Veuillez réessayer plus tard.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            ...getRateLimitHeaders(remaining, rateLimitConfig.maxRequests, rateLimitConfig.windowMinutes)
          } 
        }
      );
    }

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
      const meetingType: MeetingType = bookingData.meetingType || 'visio';
      const additionalGuests = bookingData.additionalGuests || [];

      // Phase 1.5 multi-tenant: always include workspace_id (hoisted - used in lead upsert AND booking insert)
      const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

      // Collect all attendee emails
      const allAttendeeEmails = [bookingData.email, ...additionalGuests.filter(e => e && e.includes('@'))];

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
        // Get solution display name for context
        const solutionName = getSolutionDisplayName(bookingData.solutionSlug);
        const sourceContext = solutionName 
          ? `${bookingType.name} - ${solutionName} (${getMeetingTypeLabel(meetingType)})`
          : `${bookingType.name} (${getMeetingTypeLabel(meetingType)})`;
        
        const { data: newLead } = await supabase
          .from('leads')
          .upsert({
            name: bookingData.name,
            email: bookingData.email,
            phone: bookingData.phone,
            company: bookingData.company,
            source: 'booking',
            source_context: sourceContext,
            message: bookingData.message,
            workspace_id: DEFAULT_WORKSPACE_ID,
          }, { 
            onConflict: 'email',
            ignoreDuplicates: false 
          })
          .select()
          .single();
        leadId = newLead?.id;
      }

      // Get solution display name
      const solutionName = getSolutionDisplayName(bookingData.solutionSlug);
      const solutionInfo = solutionName ? `\nSolution: ${solutionName}` : '';

      // Create meeting link based on type
      let googleEventId = null;
      let googleMeetLink = null;
      let zoomMeetingId = null;
      let zoomJoinUrl = null;
      let zoomPassword = null;

      // Build description based on meeting type
      let eventDescription = `Email: ${bookingData.email}\nEntreprise: ${bookingData.company || 'Non renseignée'}${solutionInfo}${additionalGuests.length > 0 ? `\nParticipants supplémentaires: ${additionalGuests.join(', ')}` : ''}\n\nMessage: ${bookingData.message || 'Aucun'}`;
      
      if (meetingType === 'telephone') {
        eventDescription = `📞 APPEL TÉLÉPHONIQUE\nNuméro à appeler: ${bookingData.phone || 'Non renseigné'}\n\n${eventDescription}`;
      } else if (meetingType === 'presentiel') {
        eventDescription = `📍 RENDEZ-VOUS EN PRÉSENTIEL\nAdresse: ${IARCHE_ADDRESS}\n\n${eventDescription}`;
      } else {
        eventDescription = `Téléphone: ${bookingData.phone || 'Non renseigné'}\n${eventDescription}`;
      }

      // Event title with solution name if applicable
      const eventTitle = solutionName 
        ? `${bookingType.name} - ${solutionName} - ${bookingData.name}`
        : `${bookingType.name} - ${bookingData.name}`;

      if (meetingType === 'visio') {
        // Create Zoom meeting
        try {
          const zoomToken = await getZoomAccessToken();
          const zoomResult = await createZoomMeeting(
            zoomToken,
            eventTitle,
            startTime.toISOString(),
            bookingType.duration_minutes,
            allAttendeeEmails
          );
          zoomMeetingId = zoomResult.meetingId;
          zoomJoinUrl = zoomResult.joinUrl;
          zoomPassword = zoomResult.password;
          console.log('Zoom meeting created:', zoomMeetingId);
        } catch (err) {
          console.error('Failed to create Zoom meeting:', err);
        }

        // Also create Google Calendar event with Zoom link in description
        try {
          const accessToken = await getAccessToken();
          const eventResult = await createCalendarEvent(
            accessToken,
            eventTitle,
            `${eventDescription}\n\nLien Zoom: ${zoomJoinUrl || 'À venir'}${zoomPassword ? `\nMot de passe: ${zoomPassword}` : ''}`,
            startTime.toISOString(),
            endTime.toISOString(),
            allAttendeeEmails,
            false // Don't create Meet link
          );
          googleEventId = eventResult.eventId;
        } catch (err) {
          console.error('Failed to create Google Calendar event:', err);
        }
      } else {
        // Telephone or presentiel - just create calendar event without video
        try {
          const accessToken = await getAccessToken();
          const eventResult = await createCalendarEvent(
            accessToken,
            eventTitle,
            eventDescription,
            startTime.toISOString(),
            endTime.toISOString(),
            allAttendeeEmails,
            false // No Meet link
          );
          googleEventId = eventResult.eventId;
        } catch (err) {
          console.error('Failed to create Google Calendar event:', err);
        }
      }

      // Determine the meeting link to use
      const meetLink = zoomJoinUrl;

      // Create booking record (Phase 2 multi-tenant: workspace_id required)
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
          meeting_type: meetingType,
          additional_guests: additionalGuests,
          zoom_meeting_id: zoomMeetingId,
          zoom_join_url: zoomJoinUrl,
          workspace_id: DEFAULT_WORKSPACE_ID,
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

      // Generate ICS file
      let icsLocation = getMeetingTypeLabel(meetingType);
      const icsTitle = solutionName 
        ? `${bookingType.name} - ${solutionName} - IArche`
        : `${bookingType.name} - IArche`;
      let icsDescription = `Rendez-vous avec IArche\n\nType: ${bookingType.name}${solutionName ? `\nSolution: ${solutionName}` : ''}\nFormat: ${getMeetingTypeLabel(meetingType)}\nAvec: ${bookingData.name}`;
      
      if (meetingType === 'presentiel') {
        icsLocation = IARCHE_ADDRESS;
        icsDescription += `\n\nAdresse: ${IARCHE_ADDRESS}`;
      } else if (meetingType === 'telephone') {
        icsLocation = `Appel au ${bookingData.phone || 'numéro indiqué'}`;
        icsDescription += `\n\nNuméro à appeler: ${bookingData.phone || 'Non renseigné'}`;
      }
      
      const icsContent = generateICS(
        icsTitle,
        icsDescription,
        startTime,
        endTime,
        meetLink || icsLocation,
        'nlq@nlq.fr',
        allAttendeeEmails,
        meetLink || undefined
      );

      // Generate HTML email
      const emailHTML = generateEmailHTML(
        bookingData.name,
        bookingType.name,
        startTime,
        endTime,
        meetingType,
        meetLink || undefined,
        zoomPassword || undefined,
        additionalGuests.length > 0 ? additionalGuests : undefined,
        bookingData.phone || undefined
      );

      // Send confirmation email with ICS attachment
      try {
        const icsBuffer = new TextEncoder().encode(icsContent);
        const icsBase64 = btoa(String.fromCharCode(...icsBuffer));

      // Email subject with solution name if applicable
      const emailSubject = solutionName
        ? `✅ Confirmation : ${bookingType.name} - ${solutionName} le ${startTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`
        : `✅ Confirmation : ${bookingType.name} le ${startTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`;

        await resend.emails.send({
          from: 'IArche <contact@iarche.fr>',
          to: allAttendeeEmails,
          subject: emailSubject,
          html: emailHTML,
          attachments: [
            {
              filename: 'rendez-vous-iarche.ics',
              content: icsBase64,
            },
          ],
        });

        console.log('Confirmation email sent successfully to:', allAttendeeEmails.join(', '));

        // Log email
        await supabase.from('email_logs').insert({
          recipient_email: bookingData.email,
          subject: `Confirmation : ${bookingType.name}`,
          email_type: 'booking_confirmation',
          source_type: 'booking',
          source_id: booking.id,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });
      } catch (emailErr) {
        console.error('Failed to send confirmation email:', emailErr);
        // Log failed email
        await supabase.from('email_logs').insert({
          recipient_email: bookingData.email,
          subject: `Confirmation : ${bookingType.name}`,
          email_type: 'booking_confirmation',
          source_type: 'booking',
          source_id: booking.id,
          status: 'failed',
          error_message: emailErr instanceof Error ? emailErr.message : 'Unknown error',
        });
      }

      // Send admin notification
      // Admin notification subject with solution
      const adminSubject = solutionName
        ? `📅 Nouveau RDV : ${bookingType.name} - ${solutionName} - ${bookingData.name}`
        : `📅 Nouveau RDV : ${bookingType.name} - ${bookingData.name}`;

      try {
        await resend.emails.send({
          from: 'IArche <contact@iarche.fr>',
          to: ['nlq@nlq.fr'],
          subject: adminSubject,
          html: `
            <h2>Nouveau rendez-vous</h2>
            <p><strong>Type:</strong> ${bookingType.name}</p>
            ${solutionName ? `<p><strong>Solution:</strong> ${solutionName}</p>` : ''}
            <p><strong>Format:</strong> ${getMeetingTypeLabel(meetingType)}</p>
            <p><strong>Date:</strong> ${startTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} à ${startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Nom:</strong> ${bookingData.name}</p>
            <p><strong>Email:</strong> ${bookingData.email}</p>
            <p><strong>Téléphone:</strong> ${bookingData.phone || 'Non renseigné'}</p>
            <p><strong>Entreprise:</strong> ${bookingData.company || 'Non renseignée'}</p>
            ${additionalGuests.length > 0 ? `<p><strong>Participants invités:</strong> ${additionalGuests.join(', ')}</p>` : ''}
            <p><strong>Message:</strong> ${bookingData.message || 'Aucun'}</p>
            ${meetLink ? `<p><strong>Lien Visio:</strong> <a href="${meetLink}">${meetLink}</a></p>` : ''}
          `,
        });
        console.log('Admin notification sent');
      } catch (adminErr) {
        console.warn('Failed to send admin notification:', adminErr);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          booking, 
          googleMeetLink,
          zoomJoinUrl,
          zoomPassword,
          meetingType,
        }),
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

    // Track failed API calls
    try {
      await trackAPIUsage({
        workspaceId: '00000000-0000-0000-0000-000000000001',
        apiCategory: 'calendar',
        apiName: 'google-calendar',
        providerName: 'google',
        operationType: 'booking',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (_) { /* non-blocking */ }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
