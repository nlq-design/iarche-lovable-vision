/**
 * Prefetch utilities for instant navigation
 * Preloads data on hover for smoother UX
 */

import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type PrefetchFn = (queryClient: QueryClient) => Promise<void>;

// Prefetch functions for each module
const prefetchFunctions: Record<string, PrefetchFn> = {
  '/cockpit': async (queryClient) => {
    await queryClient.prefetchQuery({
      queryKey: ['cockpit-opportunities'],
      queryFn: async () => {
        const { data } = await supabase
          .from('opportunities')
          .select('id, title, stage, amount, probability')
          .order('updated_at', { ascending: false })
          .limit(20);
        return data || [];
      },
      staleTime: 60 * 1000,
    });
  },

  '/cockpit/pipeline': async (queryClient) => {
    await queryClient.prefetchQuery({
      queryKey: ['cockpit-opportunities'],
      queryFn: async () => {
        const { data } = await supabase
          .from('opportunities')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(100);
        return data || [];
      },
      staleTime: 60 * 1000,
    });
  },

  '/cockpit/leads': async (queryClient) => {
    await queryClient.prefetchQuery({
      queryKey: ['leads'],
      queryFn: async () => {
        const { data } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        return data || [];
      },
      staleTime: 60 * 1000,
    });
  },

  '/cockpit/projects': async (queryClient) => {
    await queryClient.prefetchQuery({
      queryKey: ['cockpit-projects'],
      queryFn: async () => {
        const { data } = await supabase
          .from('projects')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(50);
        return data || [];
      },
      staleTime: 60 * 1000,
    });
  },

  '/cockpit/partenaires': async (queryClient) => {
    await queryClient.prefetchQuery({
      queryKey: ['cockpit-partners'],
      queryFn: async () => {
        const { data } = await supabase
          .from('partners')
          .select('*')
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(50);
        return data || [];
      },
      staleTime: 2 * 60 * 1000,
    });
  },

  '/cockpit/documents': async (queryClient) => {
    await queryClient.prefetchQuery({
      queryKey: ['cockpit-documents'],
      queryFn: async () => {
        const { data } = await supabase
          .from('generated_documents')
          .select('id, title, document_type, status, created_at')
          .order('created_at', { ascending: false })
          .limit(30);
        return data || [];
      },
      staleTime: 60 * 1000,
    });
  },

  '/cockpit/transcriptions': async (queryClient) => {
    await queryClient.prefetchQuery({
      queryKey: ['cockpit-transcriptions'],
      queryFn: async () => {
        const { data } = await supabase
          .from('voice_transcriptions')
          .select('id, title, status, created_at')
          .order('created_at', { ascending: false })
          .limit(30);
        return data || [];
      },
      staleTime: 60 * 1000,
    });
  },
};

/**
 * Prefetch data for a route
 * Call this on mouseEnter/focus of navigation links
 */
export function prefetchRoute(
  route: string,
  queryClient: QueryClient
): void {
  const prefetchFn = prefetchFunctions[route];
  
  if (prefetchFn) {
    prefetchFn(queryClient).catch(() => {
      // Silently ignore prefetch errors
    });
  }
}

/**
 * Check if a route has prefetch configured
 */
export function hasPrefetch(route: string): boolean {
  return route in prefetchFunctions;
}
