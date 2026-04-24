import { useMemo, useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCrmGraph, type GraphNodeType } from '@/hooks/vivier/useCrmGraph';
import { VivierSidebar } from '@/components/viviers/VivierSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Network, Users, Briefcase, Handshake } from 'lucide-react';
import { useWorkspaceId } from '@/contexts/WorkspaceContext';
import { DEFAULT_WORKSPACE_ID } from '@/lib/constants/workspace';

const NODE_TYPES: { type: GraphNodeType; color: string; label: string }[] = [
  { type: 'lead', color: '#3b82f6', label: 'Lead' },
  { type: 'lead_contact', color: '#10b981', label: 'Contact' },
  { type: 'partner', color: '#f97316', label: 'Partenaire' },
  { type: 'project', color: '#8b5cf6', label: 'Projet' },
  { type: 'solution', color: '#eab308', label: 'Solution' },
  { type: 'document', color: '#6b7280', label: 'Document' },
  { type: 'transcription', color: '#ec4899', label: 'Transcription' },
];

const COLOR_MAP: Record<GraphNodeType, string> = NODE_TYPES.reduce(
  (acc, n) => ({ ...acc, [n.type]: n.color }),
  {} as Record<GraphNodeType, string>,
);

function buildRadialLayout(
  nodes: { id: string; type: GraphNodeType; label: string; isSeed: boolean }[],
  edges: { source: string; target: string }[],
) {
  // BFS depth from seed
  const seed = nodes.find((n) => n.isSeed);
  const adj = new Map<string, string[]>();
  edges.forEach((e) => {
    adj.set(e.source, [...(adj.get(e.source) ?? []), e.target]);
    adj.set(e.target, [...(adj.get(e.target) ?? []), e.source]);
  });
  const depthMap = new Map<string, number>();
  if (seed) {
    depthMap.set(seed.id, 0);
    const queue = [seed.id];
    while (queue.length) {
      const cur = queue.shift()!;
      const d = depthMap.get(cur)!;
      for (const next of adj.get(cur) ?? []) {
        if (!depthMap.has(next)) {
          depthMap.set(next, d + 1);
          queue.push(next);
        }
      }
    }
  }
  // Group by depth
  const byDepth = new Map<number, string[]>();
  nodes.forEach((n) => {
    const d = depthMap.get(n.id) ?? 1;
    byDepth.set(d, [...(byDepth.get(d) ?? []), n.id]);
  });

  const positions = new Map<string, { x: number; y: number }>();
  for (const [d, ids] of byDepth.entries()) {
    if (d === 0) {
      positions.set(ids[0], { x: 0, y: 0 });
      continue;
    }
    const radius = d * 250;
    const angleStep = (2 * Math.PI) / ids.length;
    ids.forEach((id, i) => {
      positions.set(id, {
        x: Math.cos(i * angleStep) * radius,
        y: Math.sin(i * angleStep) * radius,
      });
    });
  }
  return positions;
}

function GraphCanvas({
  entityType,
  entityId,
  visibleTypes,
}: {
  entityType: GraphNodeType;
  entityId: string;
  visibleTypes: Set<GraphNodeType>;
}) {
  const [, setSearchParams] = useSearchParams();
  const { data, isLoading, error } = useCrmGraph(entityType, entityId, 2);

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [] as Node[], edges: [] as Edge[] };

    const filteredNodes = data.nodes.filter((n) => visibleTypes.has(n.type));
    const visibleIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = data.edges.filter(
      (e) => visibleIds.has(e.source) && visibleIds.has(e.target),
    );

    const layoutInput = filteredNodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      isSeed: Boolean(n.meta?.is_seed),
    }));
    const positions = buildRadialLayout(layoutInput, filteredEdges);

    const rfNodes: Node[] = filteredNodes.map((n) => {
      const pos = positions.get(n.id) ?? { x: 0, y: 0 };
      const isSeed = Boolean(n.meta?.is_seed);
      const color = COLOR_MAP[n.type];
      return {
        id: n.id,
        position: pos,
        data: { label: n.label },
        style: {
          background: color,
          color: '#fff',
          border: isSeed ? '3px solid hsl(var(--foreground))' : '1px solid rgba(0,0,0,0.1)',
          borderRadius: 12,
          padding: '8px 12px',
          fontSize: 12,
          fontWeight: isSeed ? 700 : 500,
          minWidth: 120,
          maxWidth: 200,
          textAlign: 'center' as const,
          boxShadow: isSeed ? '0 4px 14px rgba(0,0,0,0.25)' : '0 2px 6px rgba(0,0,0,0.1)',
        },
      };
    });

    const rfEdges: Edge[] = filteredEdges.map((e, idx) => ({
      id: `${e.source}-${e.target}-${idx}`,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.kind === 'fk',
      style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.5 },
      labelStyle: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
      labelBgStyle: { fill: 'hsl(var(--background))' },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [data, visibleTypes]);

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    const [type, id] = node.id.split(':');
    setSearchParams({ entityType: type, entityId: id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        Erreur de chargement du graphe : {(error as Error).message}
      </div>
    );
  }

  if (!nodes.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Aucune relation trouvée pour cette entité.
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={handleNodeClick}
      fitView
      minZoom={0.1}
      maxZoom={2}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      <Controls />
      <MiniMap
        nodeColor={(n) => (n.style?.background as string) ?? '#999'}
        pannable
        zoomable
      />
    </ReactFlow>
  );
}

function EmptyStatePicker() {
  const ctxWorkspaceId = useWorkspaceId();
  const workspaceId = ctxWorkspaceId ?? DEFAULT_WORKSPACE_ID;
  const [, setSearchParams] = useSearchParams();

  const { data: leads } = useQuery({
    queryKey: ['graph-picker-leads', workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, name, company')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ['graph-picker-projects', workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: partners } = useQuery({
    queryKey: ['graph-picker-partners', workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from('partners')
        .select('id, full_name, company_name')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const pick = (type: GraphNodeType, id: string) => {
    setSearchParams({ entityType: type, entityId: id });
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div className="text-center space-y-2">
        <Network className="w-12 h-12 mx-auto text-primary" />
        <h2 className="text-2xl font-bold">Graphe relationnel CRM</h2>
        <p className="text-muted-foreground">
          Sélectionnez une entité à explorer pour visualiser son réseau de relations.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" /> Leads récents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {leads?.length ? (
              leads.map((l) => (
                <button
                  key={l.id}
                  onClick={() => pick('lead', l.id)}
                  className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors truncate"
                >
                  {l.company || l.name}
                </button>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Aucun lead</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-violet-500" /> Projets récents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {projects?.length ? (
              projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pick('project', p.id)}
                  className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors truncate"
                >
                  {p.name}
                </button>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Aucun projet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Handshake className="w-4 h-4 text-orange-500" /> Partenaires récents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {partners?.length ? (
              partners.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pick('partner', p.id)}
                  className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors truncate"
                >
                  {p.company_name || p.full_name}
                </button>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Aucun partenaire</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VivierGraph() {
  const [searchParams] = useSearchParams();
  const entityType = searchParams.get('entityType') as GraphNodeType | null;
  const entityId = searchParams.get('entityId');

  const [visibleTypes, setVisibleTypes] = useState<Set<GraphNodeType>>(
    () => new Set(NODE_TYPES.map((n) => n.type)),
  );

  // Reset filters when entity changes
  useEffect(() => {
    setVisibleTypes(new Set(NODE_TYPES.map((n) => n.type)));
  }, [entityType, entityId]);

  const toggleType = (t: GraphNodeType) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <VivierSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center px-4 gap-2">
            <SidebarTrigger />
            <Network className="w-5 h-5 text-primary" />
            <h1 className="font-semibold">Graphe relationnel</h1>
          </header>

          <div className="flex-1 relative">
            {entityType && entityId ? (
              <ReactFlowProvider>
                <GraphCanvas
                  entityType={entityType}
                  entityId={entityId}
                  visibleTypes={visibleTypes}
                />
                {/* Filter overlay */}
                <Card className="absolute top-4 left-4 z-10 w-56 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                      Filtrer par type
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {NODE_TYPES.map((nt) => (
                      <div key={nt.type} className="flex items-center gap-2">
                        <Checkbox
                          id={`f-${nt.type}`}
                          checked={visibleTypes.has(nt.type)}
                          onCheckedChange={() => toggleType(nt.type)}
                        />
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ background: nt.color }}
                        />
                        <Label
                          htmlFor={`f-${nt.type}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {nt.label}
                        </Label>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </ReactFlowProvider>
            ) : (
              <EmptyStatePicker />
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
