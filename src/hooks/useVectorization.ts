import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VectorizationStatus {
  id: string;
  resource_type: string;
  total_resources: number;
  indexed_resources: number;
  total_chunks?: number;
  last_indexed_at: string | null;
  last_error: string | null;
  updated_at: string;
}

// All resource types including Cockpit modules
export const ALL_RESOURCE_TYPES = [
  // Content types
  'article', 'actualite', 'livre-blanc', 'atelier-webinaire', 'solution', 'cas-client', 'service',
  // Cockpit types
  'lead', 'project', 'partner', 'uploaded_file', 'specification', 'voice_transcription', 'generated_document'
] as const;

export type ResourceType = typeof ALL_RESOURCE_TYPES[number];

export interface IndexedResource {
  resource_id: string;
  resource_type: string;
  resource_title: string;
  resource_slug: string;
  chunk_count: number;
  created_at: string;
}

export function useVectorizationStatus() {
  return useQuery({
    queryKey: ['vectorization-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vectorization_status')
        .select('*')
        .order('resource_type');

      if (error) throw error;
      return data as VectorizationStatus[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds during indexing
  });
}

export function useIndexedResources(resourceType?: string) {
  return useQuery({
    queryKey: ['indexed-resources', resourceType],
    queryFn: async () => {
      let query = supabase
        .from('resource_embeddings')
        .select('resource_id, resource_type, resource_title, resource_slug, chunk_index, created_at')
        .eq('chunk_index', 0); // Only get first chunk to avoid duplicates

      if (resourceType) {
        query = query.eq('resource_type', resourceType);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Count chunks per resource
      const { data: chunkCounts } = await supabase
        .from('resource_embeddings')
        .select('resource_id');

      const countMap = new Map<string, number>();
      for (const item of chunkCounts || []) {
        countMap.set(item.resource_id, (countMap.get(item.resource_id) || 0) + 1);
      }

      return (data || []).map(item => ({
        ...item,
        chunk_count: countMap.get(item.resource_id) || 1,
      })) as IndexedResource[];
    },
  });
}

export function useSyncVectorizationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { action: 'sync_status' },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vectorization-status'] });
    },
  });
}

export function useGenerateAllEmbeddings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { action: 'generate_all' },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vectorization-status'] });
      queryClient.invalidateQueries({ queryKey: ['indexed-resources'] });
    },
  });
}

export function useGenerateSingleEmbedding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ resourceId, resourceType }: { resourceId: string; resourceType: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { 
          action: 'generate_single',
          resource_id: resourceId,
          resource_type: resourceType,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vectorization-status'] });
      queryClient.invalidateQueries({ queryKey: ['indexed-resources'] });
    },
  });
}

export function useSemanticSearch() {
  return useMutation({
    mutationFn: async ({ 
      query, 
      filterTypes, 
      matchThreshold = 0.7, 
      matchCount = 5 
    }: { 
      query: string; 
      filterTypes?: string[]; 
      matchThreshold?: number; 
      matchCount?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('search-embeddings', {
        body: { 
          query,
          filter_types: filterTypes,
          match_threshold: matchThreshold,
          match_count: matchCount,
        },
      });

      if (error) throw error;
      return data;
    },
  });
}
