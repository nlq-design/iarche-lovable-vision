import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FormResponse, FormResponseMetadata, FormExportOptions } from '@/types/forms';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

interface GetResponsesOptions {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

interface ResponsesResult {
  data: FormResponse[];
  total: number;
  page: number;
  totalPages: number;
}

// Helper pour parser les réponses
const parseResponse = (data: any): FormResponse => ({
  ...data,
  metadata: data.metadata as FormResponseMetadata || {}
});

export const useFormResponses = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Liste paginée des réponses
  const getResponses = useCallback(async (
    formId: string, 
    options: GetResponsesOptions = {}
  ): Promise<ResponsesResult> => {
    setLoading(true);
    const { page = 1, limit = 20, startDate, endDate } = options;
    const offset = (page - 1) * limit;

    try {
      let query = supabase
        .from('form_responses')
        .select('*', { count: 'exact' })
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false });

      if (startDate) {
        query = query.gte('submitted_at', startDate);
      }
      if (endDate) {
        query = query.lte('submitted_at', endDate);
      }

      const { data, error, count } = await query.range(offset, offset + limit - 1);
      
      if (error) throw error;

      return {
        data: (data || []).map(parseResponse),
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de charger les réponses', variant: 'destructive' });
      return { data: [], total: 0, page: 1, totalPages: 0 };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Récupère une réponse par ID
  const getResponseById = useCallback(async (id: string): Promise<FormResponse | null> => {
    try {
      const { data, error } = await supabase
        .from('form_responses')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return parseResponse(data);
    } catch (error) {
      return null;
    }
  }, []);

  // Soumet une réponse (public)
  const submitResponse = useCallback(async (
    formId: string, 
    responseData: Record<string, any>,
    metadata?: Partial<FormResponseMetadata>
  ): Promise<FormResponse | null> => {
    try {
      // Déterminer le device
      const userAgent = navigator.userAgent;
      let device: 'desktop' | 'mobile' | 'tablet' = 'desktop';
      if (/tablet|ipad/i.test(userAgent)) device = 'tablet';
      else if (/mobile|android|iphone/i.test(userAgent)) device = 'mobile';

      const responseMetadata: FormResponseMetadata = {
        userAgent,
        device,
        referrer: document.referrer || undefined,
        source: new URLSearchParams(window.location.search).get('utm_source') || undefined,
        submittedAt: new Date().toISOString(),
        ...metadata
      };

      console.log('Submitting form response:', { formId, responseData, metadata: responseMetadata });

      const { data: response, error } = await supabase
        .from('form_responses')
        .insert({
          form_id: formId,
          data: responseData as unknown as Json,
          metadata: responseMetadata as unknown as Json,
          is_complete: true
        })
        .select()
        .single();
      
      if (error) {
        console.error('Supabase insert error:', error);
        toast({ 
          title: 'Erreur de soumission', 
          description: error.message || 'Une erreur est survenue', 
          variant: 'destructive' 
        });
        return null;
      }

      // Récupérer les infos du formulaire pour les notifications
      const { data: form } = await supabase
        .from('forms')
        .select('slug, title, settings, fields')
        .eq('id', formId)
        .single();
      
      if (form?.slug) {
        await supabase.rpc('increment_form_submissions', { form_slug: form.slug });
      }

      // Envoyer les notifications email
      if (form) {
        const settings = form.settings as any;
        const notificationSettings = settings?.notifications || {};
        const formFields = form.fields as any[] | null;
        console.log('Form fields from database:', formFields);
        // Trouver l'email du répondant
        let respondentEmail: string | undefined;
        
        // 1. Utiliser le champ configuré si présent
        if (notificationSettings.respondentEmailField) {
          respondentEmail = responseData[notificationSettings.respondentEmailField];
        }
        
        // 2. Fallback: chercher une valeur qui ressemble à un email dans les données
        if (!respondentEmail) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          for (const [key, value] of Object.entries(responseData)) {
            if (typeof value === 'string' && emailRegex.test(value)) {
              respondentEmail = value;
              console.log('Found respondent email:', respondentEmail, 'in field:', key);
              break;
            }
          }
        }
        
        console.log('Respondent email to send confirmation:', respondentEmail);

        // Appeler l'edge function pour les emails - TOUJOURS envoyer au répondant si email trouvé
        try {
          const payload = {
            form_id: formId,
            form_title: form.title,
            form_fields: formFields || [], // Envoyer la structure des champs pour le mapping
            response_data: responseData,
            respondent_email: respondentEmail,
            admin_email: 'nlq@iarche.fr',
            send_to_respondent: true,
            custom_subject: notificationSettings.customSubject,
            custom_message: notificationSettings.customMessage,
          };
          console.log('Sending notification with payload:', payload);
          
          await supabase.functions.invoke('send-form-notification', {
            body: payload
          });
          console.log('Notification emails sent successfully');
        } catch (emailError) {
          console.error('Error sending notification emails:', emailError);
          // Ne pas bloquer la soumission si l'email échoue
        }
      }

      toast({ title: 'Succès', description: 'Réponse enregistrée' });
      return parseResponse(response);
    } catch (error: any) {
      console.error('Erreur soumission:', error);
      toast({ 
        title: 'Erreur de soumission', 
        description: error?.message || 'Une erreur inattendue est survenue', 
        variant: 'destructive' 
      });
      return null;
    }
  }, [toast]);

  // Supprime une réponse
  const deleteResponse = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('form_responses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: 'Succès', description: 'Réponse supprimée' });
      return true;
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  // Supprime plusieurs réponses
  const deleteMultipleResponses = useCallback(async (ids: string[]): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('form_responses')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      toast({ title: 'Succès', description: `${ids.length} réponses supprimées` });
      return true;
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  // Export des réponses
  const exportResponses = useCallback(async (
    formId: string, 
    options: FormExportOptions
  ): Promise<string | null> => {
    setLoading(true);
    try {
      let query = supabase
        .from('form_responses')
        .select('*')
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false });

      if (options.dateRange?.start) {
        query = query.gte('submitted_at', options.dateRange.start);
      }
      if (options.dateRange?.end) {
        query = query.lte('submitted_at', options.dateRange.end);
      }

      const { data, error } = await query;
      if (error) throw error;

      const responses = (data || []).map(parseResponse);

      if (options.format === 'json') {
        const blob = new Blob([JSON.stringify(responses, null, 2)], { type: 'application/json' });
        return URL.createObjectURL(blob);
      }

      if (options.format === 'csv') {
        // Construire CSV
        const headers = new Set<string>();
        responses.forEach(r => Object.keys(r.data).forEach(k => headers.add(k)));
        if (options.includeMetadata) {
          headers.add('submitted_at');
          headers.add('device');
          headers.add('source');
        }

        const headerRow = Array.from(headers).join(',');
        const dataRows = responses.map(r => {
          return Array.from(headers).map(h => {
            if (h === 'submitted_at') return r.submitted_at;
            if (h === 'device') return r.metadata?.device || '';
            if (h === 'source') return r.metadata?.source || '';
            const val = r.data[h];
            if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
            return val ?? '';
          }).join(',');
        });

        const csv = [headerRow, ...dataRows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        return URL.createObjectURL(blob);
      }

      return null;
    } catch (error) {
      toast({ title: 'Erreur', description: 'Export échoué', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    getResponses,
    getResponseById,
    submitResponse,
    deleteResponse,
    deleteMultipleResponses,
    exportResponses
  };
};
