import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RagChunkDebug {
  resource_id: string;
  resource_type: string;
  title: string;
  source_date: string | null;
  temporal_weight: number | null;
  chars: number;
  estimated_tokens: number;
}

export interface AiContextTrace {
  id: string;
  workspace_id: string;
  user_id: string | null;
  mode: string;
  entity_type: string | null;
  entity_id: string | null;
  estimated_tokens: number;
  token_budget: number | null;
  breakdown: Record<string, number>;
  rag_chunks: RagChunkDebug[];
  warnings: string[];
  created_at: string;
  cache_status: 'hit' | 'miss' | 'bypass' | null;
  cache_similarity: number | null;
  cache_age_seconds: number | null;
}

export function useRagTrace(traceId: string | null | undefined) {
  return useQuery({
    queryKey: ['ai-context-trace', traceId],
    enabled: !!traceId,
    staleTime: 60_000,
    queryFn: async (): Promise<AiContextTrace | null> => {
      if (!traceId) return null;
      const { data, error } = await supabase
        .from('ai_context_traces')
        .select('*')
        .eq('id', traceId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as AiContextTrace | null;
    },
  });
}
