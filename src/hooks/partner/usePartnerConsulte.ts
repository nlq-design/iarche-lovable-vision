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

    try {
      const { data, error: fnError } = await supabase.functions.invoke<PartnerConsulteResult>(
        'partner-consulte',
        { body: {} }
      );

      if (fnError) {
        throw fnError;
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
      console.error('[usePartnerConsulte] Error:', err);
      
      if (err.message?.includes('429')) {
        setError('Limite de requêtes atteinte. Réessayez dans quelques instants.');
      } else if (err.message?.includes('402')) {
        setError('Crédits IA insuffisants.');
      } else {
        setError(err.message || 'Erreur lors de la génération de la synthèse');
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
