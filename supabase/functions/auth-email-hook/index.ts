// Supabase Auth Email Hook — IArche v5
// Intercepts Supabase Auth email events (signup, recovery, email_change, magiclink)
// Verifies Standard Webhook signature, renders FR branded HTML, sends via Resend.
// verify_jwt = false (signature verification replaces JWT auth).

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import {
  getSignupConfirmEmail,
  getPasswordResetEmail,
  getEmailChangeEmail,
  getMagicLinkEmail,
} from '../_shared/emailTemplate.ts';
import { logEmail } from '../_shared/emailLogger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
};

const FROM_ADDRESS = 'IArche <noreply@iarche.fr>';

interface AuthHookPayload {
  user: {
    email: string;
    new_email?: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

function buildConfirmationUrl(p: AuthHookPayload['email_data']): string {
  const base = (p.site_url || '').replace(/\/+$/, '');
  const params = new URLSearchParams({
    token: p.token_hash,
    type: p.email_action_type,
    redirect_to: p.redirect_to || '',
  });
  return `${base}/auth/v1/verify?${params.toString()}`;
}

function renderEmail(payload: AuthHookPayload): { subject: string; html: string } | null {
  const action = payload.email_data.email_action_type;
  const url = buildConfirmationUrl(payload.email_data);
  const email = payload.user.email;

  switch (action) {
    case 'signup':
      return {
        subject: 'Confirmez votre inscription IArche',
        html: getSignupConfirmEmail(url, email),
      };
    case 'recovery':
      return {
        subject: 'Réinitialisation de votre mot de passe IArche',
        html: getPasswordResetEmail(url, email),
      };
    case 'email_change':
    case 'email_change_new':
    case 'email_change_current':
      return {
        subject: 'Confirmez le changement d\'adresse email IArche',
        html: getEmailChangeEmail(url, email, payload.user.new_email || email),
      };
    case 'magiclink':
      return {
        subject: 'Votre lien de connexion IArche',
        html: getMagicLinkEmail(url, email),
      };
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
  const resendKey = Deno.env.get('RESEND_API_KEY');

  if (!hookSecret) {
    console.error('SEND_EMAIL_HOOK_SECRET missing');
    return new Response(JSON.stringify({ error: 'Hook secret not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!resendKey) {
    console.error('RESEND_API_KEY missing');
    return new Response(JSON.stringify({ error: 'Resend not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers);

  // Standard Webhooks signature verification
  // Supabase sends the secret prefixed with "v1,whsec_" — strip prefix for the verifier
  const normalizedSecret = hookSecret.replace(/^v1,whsec_/, '').replace(/^whsec_/, '');

  let payload: AuthHookPayload;
  try {
    const wh = new Webhook(normalizedSecret);
    payload = wh.verify(rawBody, headers) as AuthHookPayload;
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rendered = renderEmail(payload);
  if (!rendered) {
    console.warn(`Unsupported email_action_type: ${payload.email_data?.email_action_type}`);
    return new Response(JSON.stringify({ error: 'Unsupported action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const recipient =
    payload.email_data.email_action_type === 'email_change' && payload.user.new_email
      ? payload.user.new_email
      : payload.user.email;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [recipient],
        subject: rendered.subject,
        html: rendered.html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Resend send failed:', res.status, errText);
      await logEmail({
        recipient_email: recipient,
        subject: rendered.subject,
        source_type: 'auth_hook',
        email_type: 'user_confirmation',
        status: 'failed',
        error_message: `Resend ${res.status}: ${errText}`,
        metadata: { action: payload.email_data.email_action_type },
      });
      return new Response(JSON.stringify({ error: 'Email send failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await logEmail({
      recipient_email: recipient,
      subject: rendered.subject,
      source_type: 'auth_hook',
      email_type: 'user_confirmation',
      status: 'sent',
      metadata: { action: payload.email_data.email_action_type },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('auth-email-hook error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
