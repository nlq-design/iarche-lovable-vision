import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceId } from '@/contexts/WorkspaceContext';
import { DEFAULT_WORKSPACE_ID } from '@/lib/constants/workspace';
import type { CrossSignalDB, CrossSignalEntity } from './useCockpitIntelligence';

export function useCrossSignals(workspaceIdOverride?: string) {
  const ctxWorkspaceId = useWorkspaceId();
  const workspaceId = workspaceIdOverride ?? ctxWorkspaceId ?? DEFAULT_WORKSPACE_ID;

  return useQuery({
    queryKey: ['ai-cross-signals', workspaceId],
    queryFn: async (): Promise<CrossSignalDB[]> => {
      const { data, error } = await supabase
        .from('ai_cross_signals')
        .select('signal_type, title, narrative, score, severity, entities, evidence, expires_at')
        .eq('workspace_id', workspaceId)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('score', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []).map((row) => ({
        signal_type: row.signal_type as string,
        title: row.title as string,
        narrative: row.narrative as string,
        score: Number(row.score ?? 0),
        severity: (row.severity ?? 'medium') as 'high' | 'medium' | 'low',
        entities: (row.entities ?? []) as unknown as CrossSignalEntity[],
        evidence: (row.evidence ?? {}) as unknown as Record<string, unknown>,
      }));
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
