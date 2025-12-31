// Gmail API client using OAuth2
// Replaces Resend for better deliverability with nlq.fr domain

interface GmailSendOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

interface GmailTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GMAIL_CLIENT_ID');
  const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GMAIL_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Gmail OAuth credentials not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Gmail] Token refresh failed:', error);
    throw new Error(`Failed to refresh Gmail access token: ${error}`);
  }

  const data: GmailTokenResponse = await response.json();
  return data.access_token;
}

function createRawEmail(to: string, subject: string, html: string, from: string, replyTo?: string): string {
  const boundary = `boundary_${Date.now()}`;
  
  const headers = [
    `From: IArche <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  if (replyTo) {
    headers.push(`Reply-To: ${replyTo}`);
  }

  const body = [
    headers.join('\r\n'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(html))),
    `--${boundary}--`,
  ].join('\r\n');

  // URL-safe base64 encoding
  return btoa(body)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendGmail(options: GmailSendOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, subject, html, replyTo } = options;
  const senderEmail = Deno.env.get('GMAIL_SENDER_EMAIL') || 'nlq@nlq.fr';

  try {
    const accessToken = await getAccessToken();
    const recipients = Array.isArray(to) ? to : [to];
    const results: { email: string; success: boolean; messageId?: string; error?: string }[] = [];

    for (const recipient of recipients) {
      const rawMessage = createRawEmail(recipient, subject, html, senderEmail, replyTo);

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: rawMessage,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`[Gmail] Send failed to ${recipient}:`, error);
        results.push({ email: recipient, success: false, error });
      } else {
        const data = await response.json();
        console.log(`[Gmail] Email sent to ${recipient}, messageId: ${data.id}`);
        results.push({ email: recipient, success: true, messageId: data.id });
      }
    }

    const allSuccess = results.every(r => r.success);
    const firstMessageId = results.find(r => r.messageId)?.messageId;
    const errors = results.filter(r => !r.success).map(r => `${r.email}: ${r.error}`);

    return {
      success: allSuccess,
      messageId: firstMessageId,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  } catch (error) {
    console.error('[Gmail] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export type { GmailSendOptions };
