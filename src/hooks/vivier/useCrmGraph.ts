import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceId } from '@/contexts/WorkspaceContext';
import { DEFAULT_WORKSPACE_ID } from '@/lib/constants/workspace';

export type GraphNodeType =
  | 'lead'
  | 'lead_contact'
  | 'partner'
  | 'project'
  | 'solution'
  | 'document'
  | 'transcription';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  meta: { entity_id: string; is_seed?: boolean };
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: 'fk' | 'm2m';
  label: string;
}

export interface CrmGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function useCrmGraph(
  entityType: GraphNodeType | null,
  entityId: string | null,
  depth: number = 2,
) {
  const ctxWorkspaceId = useWorkspaceId();
  const effectiveWorkspaceId = ctxWorkspaceId ?? DEFAULT_WORKSPACE_ID;

  return useQuery<CrmGraph>({
    queryKey: ['crm-graph', entityType, entityId, depth, effectiveWorkspaceId],
    enabled: Boolean(entityType && entityId),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_crm_graph', {
        p_entity_type: entityType!,
        p_entity_id: entityId!,
        p_depth: depth,
        p_workspace_id: effectiveWorkspaceId,
      });
      if (error) throw error;
      const result = (data ?? { nodes: [], edges: [] }) as unknown as CrmGraph;
      return {
        nodes: result.nodes ?? [],
        edges: result.edges ?? [],
      };
    },
  });
}
