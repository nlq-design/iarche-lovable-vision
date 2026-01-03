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

export interface StaleResource {
  resource_id: string;
  resource_type: string;
  resource_title: string;
  updated_at: string;
  last_indexed_at: string | null;
}

// Freshness thresholds in hours
export const FRESHNESS_THRESHOLDS = {
  fresh: 24, // Less than 24h = fresh (green)
  stale: 72, // 24-72h = stale (orange)
  // More than 72h = outdated (red)
};

export function getFreshnessStatus(lastIndexedAt: string | null): 'fresh' | 'stale' | 'outdated' | 'never' {
  if (!lastIndexedAt) return 'never';
  const hoursSinceIndex = (Date.now() - new Date(lastIndexedAt).getTime()) / (1000 * 60 * 60);
  if (hoursSinceIndex < FRESHNESS_THRESHOLDS.fresh) return 'fresh';
  if (hoursSinceIndex < FRESHNESS_THRESHOLDS.stale) return 'stale';
  return 'outdated';
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

export function useStaleResources() {
  return useQuery({
    queryKey: ['stale-resources'],
    queryFn: async () => {
      // Get all indexed resource IDs with their index timestamps
      const { data: embeddings } = await supabase
        .from('resource_embeddings')
        .select('resource_id, resource_type, resource_title, created_at')
        .eq('chunk_index', 0);

      if (!embeddings?.length) return { stale: [], count: 0 };

      const indexedMap = new Map<string, { type: string; title: string; indexed_at: string }>();
      for (const e of embeddings) {
        indexedMap.set(e.resource_id, { 
          type: e.resource_type, 
          title: e.resource_title, 
          indexed_at: e.created_at 
        });
      }

      // Check articles for updates after indexing
      const articleIds = Array.from(indexedMap.entries())
        .filter(([, v]) => ['article', 'actualite', 'livre-blanc', 'atelier-webinaire', 'solution', 'cas-client'].includes(v.type))
        .map(([id]) => id);

      const staleResources: StaleResource[] = [];

      if (articleIds.length > 0) {
        const { data: articles } = await supabase
          .from('articles')
          .select('id, title, updated_at')
          .in('id', articleIds);

        for (const article of articles || []) {
          const indexed = indexedMap.get(article.id);
          if (indexed && new Date(article.updated_at) > new Date(indexed.indexed_at)) {
            staleResources.push({
              resource_id: article.id,
              resource_type: indexed.type,
              resource_title: article.title,
              updated_at: article.updated_at,
              last_indexed_at: indexed.indexed_at,
            });
          }
        }
      }

      // Check leads
      const leadIds = Array.from(indexedMap.entries())
        .filter(([, v]) => v.type === 'lead')
        .map(([id]) => id);

      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, name, created_at')
          .in('id', leadIds);

        // Leads don't have updated_at, so we can't check staleness reliably
        // We skip leads for now
      }

      // Check projects
      const projectIds = Array.from(indexedMap.entries())
        .filter(([, v]) => v.type === 'project')
        .map(([id]) => id);

      if (projectIds.length > 0) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name, updated_at')
          .in('id', projectIds);

        for (const project of projects || []) {
          const indexed = indexedMap.get(project.id);
          if (indexed && new Date(project.updated_at) > new Date(indexed.indexed_at)) {
            staleResources.push({
              resource_id: project.id,
              resource_type: 'project',
              resource_title: project.name,
              updated_at: project.updated_at,
              last_indexed_at: indexed.indexed_at,
            });
          }
        }
      }

      return { stale: staleResources, count: staleResources.length };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
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
      queryClient.invalidateQueries({ queryKey: ['stale-resources'] });
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
      queryClient.invalidateQueries({ queryKey: ['stale-resources'] });
    },
  });
}

export function useReindexStaleResources() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staleResources: StaleResource[]) => {
      let reindexed = 0;
      let failed = 0;

      for (const resource of staleResources) {
        try {
          const { error } = await supabase.functions.invoke('generate-embeddings', {
            body: { 
              action: 'generate_single',
              resource_id: resource.resource_id,
              resource_type: resource.resource_type,
            },
          });

          if (error) {
            failed++;
          } else {
            reindexed++;
          }
        } catch {
          failed++;
        }
      }

      return { reindexed, failed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vectorization-status'] });
      queryClient.invalidateQueries({ queryKey: ['indexed-resources'] });
      queryClient.invalidateQueries({ queryKey: ['stale-resources'] });
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
