import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  ipAddress: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - config.windowMinutes);

    // Nettoyer les anciennes entrées
    await supabase.rpc('cleanup_rate_limit_requests');

    // Vérifier le nombre de requêtes dans la fenêtre
    const { data: existingRequests, error: fetchError } = await supabase
      .from('rate_limit_requests')
      .select('request_count')
      .eq('ip_address', ipAddress)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Rate limit check error:', fetchError);
      // En cas d'erreur, autoriser la requête (fail-open)
      return { allowed: true, remaining: config.maxRequests };
    }

    const currentCount = existingRequests?.request_count || 0;

    if (currentCount >= config.maxRequests) {
      return { 
        allowed: false, 
        remaining: 0 
      };
    }

    // Incrémenter ou créer l'entrée
    if (existingRequests) {
      await supabase
        .from('rate_limit_requests')
        .update({ request_count: currentCount + 1 })
        .eq('ip_address', ipAddress)
        .eq('endpoint', endpoint)
        .gte('window_start', windowStart.toISOString());
    } else {
      await supabase
        .from('rate_limit_requests')
        .insert({
          ip_address: ipAddress,
          endpoint: endpoint,
          request_count: 1,
          window_start: new Date().toISOString()
        });
    }

    return {
      allowed: true,
      remaining: config.maxRequests - currentCount - 1
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // En cas d'erreur, autoriser la requête (fail-open)
    return { allowed: true, remaining: config.maxRequests };
  }
}

export function getRateLimitHeaders(remaining: number, maxRequests: number, windowMinutes: number) {
  return {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(Date.now() + windowMinutes * 60 * 1000).toISOString()
  };
}
