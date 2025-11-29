import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginAttemptRequest {
  email: string;
  success: boolean;
  failure_reason?: string;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email, success, failure_reason } = await req.json() as LoginAttemptRequest;

    // Récupérer l'adresse IP du client
    const ip_address = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      '0.0.0.0';
    const user_agent = req.headers.get('user-agent') || 'Unknown';

    console.log(`Login attempt for ${email}: ${success ? 'SUCCESS' : 'FAILED'}`);

    // Vérifier si le compte est déjà verrouillé
    const { data: existingLock } = await supabaseClient
      .from('account_locks')
      .select('*')
      .eq('email', email)
      .gte('locked_until', new Date().toISOString())
      .maybeSingle();

    if (existingLock) {
      const minutesRemaining = Math.ceil(
        (new Date(existingLock.locked_until).getTime() - Date.now()) / (1000 * 60)
      );
      
      return new Response(
        JSON.stringify({
          locked: true,
          message: `Compte verrouillé. Réessayez dans ${minutesRemaining} minutes.`,
          locked_until: existingLock.locked_until,
          attempts_remaining: 0
        }),
        {
          status: 423, // Locked
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Enregistrer la tentative
    await supabaseClient
      .from('login_attempts')
      .insert({
        email,
        ip_address,
        user_agent,
        success,
        failure_reason: success ? null : failure_reason,
        attempted_at: new Date().toISOString()
      });

    if (success) {
      // Supprimer les anciennes tentatives échouées pour cet email
      await supabaseClient
        .from('login_attempts')
        .delete()
        .eq('email', email)
        .eq('success', false);

      return new Response(
        JSON.stringify({
          locked: false,
          message: 'Connexion réussie'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Compter les échecs récents (dernières 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentFailures, error } = await supabaseClient
      .from('login_attempts')
      .select('*')
      .eq('email', email)
      .eq('success', false)
      .gte('attempted_at', fifteenMinutesAgo);

    if (error) {
      console.error('Error counting failures:', error);
    }

    const failureCount = recentFailures?.length || 0;
    const attemptsRemaining = Math.max(0, MAX_FAILED_ATTEMPTS - failureCount);

    console.log(`Failed attempts for ${email}: ${failureCount}/${MAX_FAILED_ATTEMPTS}`);

    // Verrouiller le compte si trop de tentatives
    if (failureCount >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      
      await supabaseClient
        .from('account_locks')
        .insert({
          email,
          locked_until: lockedUntil.toISOString(),
          failed_attempts: failureCount
        });

      console.log(`Account locked for ${email} until ${lockedUntil.toISOString()}`);

      // Envoyer une alerte de sécurité
      try {
        await supabaseClient.functions.invoke('send-security-alert', {
          body: {
            alert: {
              severity: 'high',
              title: 'Compte administrateur verrouillé',
              description: `Le compte ${email} a été verrouillé suite à ${failureCount} tentatives de connexion échouées.`,
              details: {
                email,
                failed_attempts: failureCount,
                locked_until: lockedUntil.toISOString(),
                ip_address,
                action: 'Le compte sera automatiquement déverrouillé après 30 minutes.'
              }
            }
          }
        });
      } catch (alertError) {
        console.error('Error sending security alert:', alertError);
      }

      return new Response(
        JSON.stringify({
          locked: true,
          message: `Trop de tentatives échouées. Compte verrouillé pendant ${LOCK_DURATION_MINUTES} minutes.`,
          locked_until: lockedUntil.toISOString(),
          attempts_remaining: 0
        }),
        {
          status: 423, // Locked
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        locked: false,
        message: 'Tentative échouée',
        attempts_remaining: attemptsRemaining,
        warning: attemptsRemaining <= 2 ? `Attention: ${attemptsRemaining} tentative(s) restante(s)` : undefined
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in check-login-attempt:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
