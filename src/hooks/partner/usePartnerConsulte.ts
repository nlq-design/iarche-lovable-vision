import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseAIError } from '@/lib/ai-error-handler';

interface PartnerConsulteResult {
  success: boolean;
  synthesis?: string;
  context?: {
    projects_count: number;
    leads_count: number;
    transcriptions_count: number;
    documents_count: number;
  };
  error?: string;
  message?: string;
}

export function usePartnerConsulte() {
  const [isLoading, setIsLoading] = useState(false);
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<PartnerConsulteResult['context'] | null>(null);

  const generateSynthesis = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {

      // Refresh session to avoid expired access tokens causing 401 in backend functions
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        // Non-bloquant: on tente quand même de récupérer la session actuelle
        console.warn('[usePartnerConsulte] refreshSession failed, falling back to getSession', refreshError);
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(sessionError.message);

      const accessToken = refreshed?.session?.access_token ?? sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/partner-consulte`;

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apikey ? { apikey } : {}),
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });

      const raw = await resp.text();
      const parsedBody = (() => {
        try {
          return raw ? JSON.parse(raw) : null;
        } catch {
          return raw;
        }
      })();

      if (!resp.ok) {
        const e: any = new Error('Edge Function returned a non-2xx status code');
        e.context = { status: resp.status, body: parsedBody };
        throw e;
      }

      const data = parsedBody as PartnerConsulteResult;

      console.log('[usePartnerConsulte] Response:', { data });

      if (data?.success && data.synthesis) {
        setSynthesis(data.synthesis);
        setContext(data.context || null);
        return true;
      } else {
        setError(data?.message || data?.error || 'Erreur lors de la génération');
        return false;
      }
    } catch (err: unknown) {
      const aiError = parseAIError(err);
      console.error('[usePartnerConsulte] Error:', aiError);
      setError(aiError.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearSynthesis = () => {
    setSynthesis(null);
    setContext(null);
    setError(null);
  };

  return {
    isLoading,
    synthesis,
    context,
    error,
    generateSynthesis,
    clearSynthesis
  };
}
