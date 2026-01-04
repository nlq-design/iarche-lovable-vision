import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FormEventType, FormAnalytics } from '@/types/forms';

// Générer un session ID unique pour tracker les utilisateurs
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('form_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('form_session_id', sessionId);
  }
  return sessionId;
};

export const useFormAnalytics = () => {
  // Enregistrer un événement
  const trackEvent = useCallback(async (
    formId: string,
    eventType: FormEventType,
    options?: { fieldId?: string; step?: number }
  ): Promise<void> => {
    try {
      await supabase.from('form_analytics').insert({
        form_id: formId,
        event_type: eventType,
        field_id: options?.fieldId,
        step: options?.step || 0,
        session_id: getSessionId()
      });

      // Si c'est une vue, incrémenter aussi le compteur
      if (eventType === 'view') {
        const { data: form } = await supabase
          .from('forms')
          .select('slug')
          .eq('id', formId)
          .single();
        
        if (form?.slug) {
          await supabase.rpc('increment_form_views', { form_slug: form.slug });
        }
      }
    } catch (error) {
      console.error('Erreur tracking:', error);
    }
  }, []);

  // Récupérer les analytics d'un formulaire
  const getAnalytics = useCallback(async (
    formId: string,
    period: { start: string; end: string }
  ): Promise<FormAnalytics | null> => {
    try {
      // Récupérer tous les événements de la période
      const { data: events, error } = await supabase
        .from('form_analytics')
        .select('*')
        .eq('form_id', formId)
        .gte('created_at', period.start)
        .lte('created_at', period.end);

      if (error) throw error;

      // Récupérer les réponses de la période
      const { data: responses } = await supabase
        .from('form_responses')
        .select('metadata')
        .eq('form_id', formId)
        .gte('submitted_at', period.start)
        .lte('submitted_at', period.end);

      const views = events?.filter(e => e.event_type === 'view').length || 0;
      const starts = events?.filter(e => e.event_type === 'start').length || 0;
      const submissions = events?.filter(e => e.event_type === 'submit').length || 0;

      // Analyse des devices
      const devices = { desktop: 0, mobile: 0, tablet: 0 };
      responses?.forEach(r => {
        const device = (r.metadata as any)?.device || 'desktop';
        if (device in devices) devices[device as keyof typeof devices]++;
      });

      // Analyse des sources
      const sources: Record<string, number> = {};
      responses?.forEach(r => {
        const source = (r.metadata as any)?.source || 'Direct';
        sources[source] = (sources[source] || 0) + 1;
      });

      // Analyse des abandons par champ
      const dropOff: { byField: Record<string, number>; byStep: Record<number, number> } = {
        byField: {},
        byStep: {}
      };

      // Grouper les événements par session
      const sessions = new Map<string, any[]>();
      events?.forEach(e => {
        const sessionEvents = sessions.get(e.session_id || '') || [];
        sessionEvents.push(e);
        sessions.set(e.session_id || '', sessionEvents);
      });

      // Pour chaque session sans submit, trouver le dernier champ touché
      sessions.forEach((sessionEvents) => {
        const hasSubmit = sessionEvents.some(e => e.event_type === 'submit');
        if (!hasSubmit) {
          const lastFocus = sessionEvents
            .filter(e => e.event_type === 'field_focus')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          
          if (lastFocus?.field_id) {
            dropOff.byField[lastFocus.field_id] = (dropOff.byField[lastFocus.field_id] || 0) + 1;
          }
          if (lastFocus?.step !== undefined) {
            dropOff.byStep[lastFocus.step] = (dropOff.byStep[lastFocus.step] || 0) + 1;
          }
        }
      });

      return {
        formId,
        period,
        metrics: {
          views,
          starts,
          submissions,
          conversionRate: views > 0 ? (submissions / views) * 100 : 0,
          completionRate: starts > 0 ? (submissions / starts) * 100 : 0,
          averageTime: 0 // Note: nécessite stockage des timestamps de session pour calcul
        },
        dropOff,
        devices,
        sources
      };
    } catch (error) {
      console.error('Erreur analytics:', error);
      return null;
    }
  }, []);

  // Analyse des abandons détaillée
  const getDropOffAnalysis = useCallback(async (formId: string): Promise<Record<string, number>> => {
    const analytics = await getAnalytics(formId, {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    });
    return analytics?.dropOff.byField || {};
  }, [getAnalytics]);

  return {
    trackEvent,
    getAnalytics,
    getDropOffAnalysis
  };
};
