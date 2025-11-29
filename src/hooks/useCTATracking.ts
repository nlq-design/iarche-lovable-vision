import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour tracker les clics sur CTAs
 */
export const useCTATracking = () => {
  
  /**
   * Génère ou récupère un ID de session utilisateur
   */
  const getSessionId = (): string => {
    let sessionId = sessionStorage.getItem('user_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('user_session_id', sessionId);
    }
    return sessionId;
  };

  /**
   * Track un clic sur CTA
   * @param ctaName - Nom du CTA (ex: "nous_contacter", "voir_projet")
   * @param sourcePage - Page/section source (ex: "header", "exemples_section")
   * @param sourceContext - Contexte additionnel optionnel (ex: slug, nom solution)
   */
  const trackCTAClick = async (
    ctaName: string,
    sourcePage: string,
    sourceContext?: string
  ): Promise<void> => {
    try {
      const sessionId = getSessionId();
      const referrer = document.referrer || '';

      await supabase.functions.invoke('track-cta-click', {
        body: {
          cta_name: ctaName,
          source_page: sourcePage,
          source_context: sourceContext || null,
          user_session: sessionId,
          referrer,
        },
      });

      console.log(`✅ CTA tracked: ${ctaName} from ${sourcePage}`);
    } catch (error) {
      // Silent fail - ne pas bloquer l'UX si le tracking échoue
      console.warn('Failed to track CTA click:', error);
    }
  };

  return { trackCTAClick, getSessionId };
};

export default useCTATracking;