import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

    const extractFnErrorMessage = (err: any): { message: string; status?: number } => {
      const status = err?.context?.status as number | undefined;
      const body = err?.context?.body;

      const bodyMessage =
        (typeof body === 'string' ? body : undefined) ||
        body?.error ||
        body?.message ||
        body?.details;

      const message = bodyMessage || err?.message || 'Erreur lors de la génération de la synthèse';
      return { message, status };
    };

    try {
      console.log('[usePartnerConsulte] Invoking partner-consulte edge function...');
      
      const { data, error: fnError } = await supabase.functions.invoke<PartnerConsulteResult>(
        'partner-consulte',
        { body: {} }
      );

      console.log('[usePartnerConsulte] Response:', { data, fnError });

      if (fnError) {
        console.error('[usePartnerConsulte] Function error details:', JSON.stringify(fnError, null, 2));
        const { message, status } = extractFnErrorMessage(fnError);
        const tagged = status ? `[${status}] ${message}` : message;
        throw new Error(tagged);
      }

      if (data?.success && data.synthesis) {
        setSynthesis(data.synthesis);
        setContext(data.context || null);
        return true;
      } else {
        setError(data?.message || data?.error || 'Erreur lors de la génération');
        return false;
      }
    } catch (err: any) {
      const { message, status } = extractFnErrorMessage(err);
      console.error('[usePartnerConsulte] Error:', { status, message, err });

      if (status === 429 || message.includes('429')) {
        setError('Limite de requêtes atteinte. Réessayez dans quelques instants.');
      } else if (status === 402 || message.includes('402')) {
        setError('Crédits IA insuffisants.');
      } else {
        setError(message);
      }
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
