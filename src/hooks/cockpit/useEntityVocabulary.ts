import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EntityVocabularyItem {
  id: string;
  entity_type: string;
  entity_id: string;
  term: string;
  category: string;
  workspace_id: string | null;
  created_at: string;
}

export const VOCABULARY_CATEGORIES = [
  { value: 'general', label: 'Général' },
  { value: 'tech', label: 'Technique' },
  { value: 'product', label: 'Produit' },
  { value: 'acronym', label: 'Acronyme' },
  { value: 'jargon', label: 'Jargon métier' },
] as const;

export function useEntityVocabulary(entityType: string | null, entityId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ['entity-vocabulary', entityType, entityId];

  const { data: terms = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!entityType || !entityId) return [];
      const { data, error } = await supabase
        .from('entity_vocabulary')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('category')
        .order('term');
      if (error) throw error;
      return (data ?? []) as EntityVocabularyItem[];
    },
    enabled: !!entityType && !!entityId,
  });

  const addTerm = useMutation({
    mutationFn: async (input: { term: string; category?: string; workspace_id?: string }) => {
      if (!entityType || !entityId) throw new Error('Missing entity');
      const { error } = await supabase.from('entity_vocabulary').insert({
        entity_type: entityType,
        entity_id: entityId,
        term: input.term,
        category: input.category ?? 'general',
        workspace_id: input.workspace_id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Terme ajouté');
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  });

  const removeTerm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('entity_vocabulary').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Terme supprimé');
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  });

  const bulkAdd = useMutation({
    mutationFn: async (inputs: { terms: string[]; category?: string; workspace_id?: string }) => {
      if (!entityType || !entityId || !inputs.terms.length) return;
      const rows = inputs.terms.map(term => ({
        entity_type: entityType,
        entity_id: entityId,
        term,
        category: inputs.category ?? 'general',
        workspace_id: inputs.workspace_id ?? null,
      }));
      const { error } = await supabase.from('entity_vocabulary').upsert(rows, {
        onConflict: 'entity_type,entity_id,term',
        ignoreDuplicates: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Termes ajoutés');
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  });

  return { terms, isLoading, addTerm, removeTerm, bulkAdd };
}
