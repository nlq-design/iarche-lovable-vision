import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export interface PappersVivierResult {
  found: boolean;
  siren?: string;
  siret?: string;
  company_name?: string;
  legal_form?: string;
  creation_date?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  naf_code?: string;
  naf_label?: string;
  employees?: string;
  employees_range?: string;
  capital?: number;
  website?: string;
  representatives?: Array<{
    name: string;
    position: string;
  }>;
}

export function usePappersVivierEnrich() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  /**
   * Enrich a vivier lead with Pappers data by SIRET
   */
  const enrichVivier = async (vivierId: string, siret: string): Promise<boolean> => {
    if (!siret || siret.replace(/\s/g, '').length < 9) {
      toast.error('SIRET invalide (9-14 chiffres requis)');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call Pappers lookup
      const { data, error: fnError } = await supabase.functions.invoke('pappers-lookup', {
        body: { siret: siret.replace(/\s/g, '') },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.found) {
        toast.error('Entreprise non trouvée dans Pappers');
        return false;
      }

      // Update vivier with enriched data
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Map Pappers data to vivier fields
      if (data.company_name) updateData.company_name = data.company_name;
      if (data.siret) updateData.siret = data.siret;
      if (data.siren) updateData.siren = data.siren;
      if (data.address) updateData.address = data.address;
      if (data.postal_code) updateData.postal_code = data.postal_code;
      if (data.city) updateData.city = data.city;
      if (data.naf_code) updateData.naf_code = data.naf_code;
      if (data.naf_label || data.industry) updateData.industry = data.naf_label || data.industry;
      if (data.legal_form) updateData.legal_form = data.legal_form;
      if (data.creation_date) updateData.creation_date = data.creation_date;
      if (data.website) updateData.website = data.website;
      
      // Employee count - try to parse from employees_range or employees
      if (data.employees_min) {
        updateData.employee_count = data.employees_min;
      } else if (data.employees) {
        const parsed = parseInt(data.employees, 10);
        if (!isNaN(parsed)) updateData.employee_count = parsed;
      }

      // Store representative as contact if available
      if (data.representatives && data.representatives.length > 0) {
        const rep = data.representatives[0];
        if (rep.name) updateData.contact_name = rep.name;
        if (rep.position) updateData.contact_position = rep.position;
      }

      // Store full Pappers data in raw_data for reference (existing JSONB column)
      // Note: We don't merge with existing raw_data here to keep it simple
      updateData.raw_data = {
        pappers_enriched_at: new Date().toISOString(),
        pappers_data: data,
      };

      const { error: updateError } = await supabase
        .from('viviers')
        .update(updateData)
        .eq('id', vivierId);

      if (updateError) {
        throw updateError;
      }

      // Log activity
      try {
        await supabase.from('activity_log').insert({
          entity_type: 'vivier',
          entity_id: vivierId,
          activity_type: 'enrichment',
          title: 'Enrichissement Pappers',
          content: `Données enrichies via Pappers (SIRET: ${siret})`,
          metadata: { source: 'pappers', siret },
        });
      } catch (logError) {
        console.warn('Activity log failed:', logError);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['vivier-by-slug'] });
      queryClient.invalidateQueries({ queryKey: ['viviers'] });

      toast.success('Lead enrichi avec les données Pappers');
      return true;
    } catch (err: any) {
      console.error('Pappers enrichment error:', err);
      setError(err.message);
      toast.error(`Erreur Pappers: ${err.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    enrichVivier,
    isLoading,
    error,
  };
}
