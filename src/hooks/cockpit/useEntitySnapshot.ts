/**
 * useEntitySnapshot — Récupère les valeurs courantes d'une entité (lead/opp/project)
 * pour pré-remplir les champs du AIActionDrawer et afficher du contexte vivant.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EntitySnapshot {
  name?: string | null;
  amount?: number | null;
  deadline?: string | null;
  contact?: string | null;
  stage?: string | null;
  status?: string | null;
}

export function useEntitySnapshot(entityType?: string | null, entityId?: string | null) {
  return useQuery({
    queryKey: ['entity-snapshot', entityType, entityId],
    queryFn: async (): Promise<EntitySnapshot | null> => {
      if (!entityType || !entityId) return null;
      if (entityType === 'opportunity') {
        const { data } = await supabase
          .from('opportunities')
          .select('name, value_amount, expected_close_date, stage')
          .eq('id', entityId)
          .maybeSingle();
        if (!data) return null;
        return {
          name: data.name,
          amount: data.value_amount,
          deadline: data.expected_close_date,
          stage: data.stage,
        };
      }
      if (entityType === 'lead') {
        const { data } = await supabase
          .from('leads')
          .select('name, phone, email, status')
          .eq('id', entityId)
          .maybeSingle();
        if (!data) return null;
        return {
          name: data.name,
          contact: data.phone || data.email,
          status: data.status,
        };
      }
      if (entityType === 'project') {
        const { data } = await supabase
          .from('projects')
          .select('name, planned_end_date, status')
          .eq('id', entityId)
          .maybeSingle();
        if (!data) return null;
        return {
          name: data.name,
          deadline: data.planned_end_date,
          status: data.status,
        };
      }
      return null;
    },
    enabled: !!entityType && !!entityId,
    staleTime: 30_000,
  });
}
