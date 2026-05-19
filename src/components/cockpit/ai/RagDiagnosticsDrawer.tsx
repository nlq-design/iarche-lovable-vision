import { ScanSearch } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { LoadingState } from '@/components/cockpit/common/LoadingState';
import { EmptyState } from '@/components/cockpit/common/EmptyState';
import { useRagTrace } from '@/hooks/cockpit/useRagTrace';

interface RagDiagnosticsDrawerProps {
  traceId: string | null | undefined;
  label?: string;
}

function formatDateFR(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

function weightColor(w: number | null) {
  if (w == null) return 'secondary' as const;
  if (w >= 0.9) return 'default' as const;
  if (w >= 0.6) return 'secondary' as const;
  return 'outline' as const;
}

function typeColor(t: string) {
  if (t.startsWith('transcription')) return 'default' as const;
  if (t.includes('note')) return 'secondary' as const;
  if (t === 'opportunity' || t === 'lead_summary') return 'outline' as const;
  return 'outline' as const;
}

export function RagDiagnosticsDrawer({ traceId, label = 'Contexte injecté' }: RagDiagnosticsDrawerProps) {
  const { data: trace, isLoading } = useRagTrace(traceId);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!traceId}
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ScanSearch className="h-3.5 w-3.5" />
          {label}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-background">
        <SheetHeader>
          <SheetTitle className="font-manrope">Diagnostic du contexte IA</SheetTitle>
        </SheetHeader>

        {isLoading && <div className="pt-6"><LoadingState message="Chargement de la trace..." inline /></div>}

        {!isLoading && !trace && (
          <div className="pt-6">
            <EmptyState message="Aucune trace disponible" description="Cette réponse n'a pas enregistré de contexte." inline />
          </div>
        )}

        {trace && (
          <div className="space-y-6 pt-6">
            {/* Cache status (M6) */}
            {trace.cache_status && (
              <section>
                <div
                  className={
                    'flex items-center justify-between rounded-md border px-3 py-2 text-xs ' +
                    (trace.cache_status === 'hit'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : trace.cache_status === 'bypass'
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : 'border-border bg-muted text-muted-foreground')
                  }
                >
                  <span className="font-medium uppercase tracking-wide">
                    Cache {trace.cache_status}
                  </span>
                  <span className="font-mono">
                    {trace.cache_status === 'hit' && trace.cache_similarity != null
                      ? `sim ${trace.cache_similarity.toFixed(2)} · âge ${Math.round((trace.cache_age_seconds ?? 0) / 60)} min`
                      : trace.cache_status === 'miss'
                        ? 'nouvelle synthèse persistée'
                        : 'cache désactivé pour ce refresh'}
                  </span>
                </div>
              </section>
            )}

            {/* Budget tokens */}
            <section>
              <h3 className="text-sm font-semibold mb-2">Budget tokens</h3>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{trace.estimated_tokens.toLocaleString('fr-FR')} tokens injectés</span>
                {trace.token_budget && <span>budget {trace.token_budget.toLocaleString('fr-FR')}</span>}
              </div>
              <Progress
                value={trace.token_budget ? Math.min(100, (trace.estimated_tokens / trace.token_budget) * 100) : 0}
                className="h-2"
              />
              {trace.warnings?.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs text-amber-600">
                  {trace.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              )}
            </section>

            {/* Breakdown sections */}
            <section>
              <h3 className="text-sm font-semibold mb-2">Sections injectées</h3>
              {Object.keys(trace.breakdown ?? {}).length === 0 ? (
                <EmptyState message="Aucune section" inline />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8">Section</TableHead>
                      <TableHead className="h-8 text-right">Tokens</TableHead>
                      <TableHead className="h-8 text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(trace.breakdown).sort((a, b) => b[1] - a[1]).map(([name, tokens]) => (
                      <TableRow key={name}>
                        <TableCell className="font-mono text-xs">{name}</TableCell>
                        <TableCell className="text-right text-xs">{tokens.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {trace.estimated_tokens ? Math.round((tokens / trace.estimated_tokens) * 100) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>

            {/* RAG chunks */}
            <section>
              <h3 className="text-sm font-semibold mb-2">Extraits CRM (RAG)</h3>
              {!trace.rag_chunks?.length ? (
                <EmptyState message="Aucun extrait RAG lié à cette entité" inline />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8">Type</TableHead>
                      <TableHead className="h-8">Titre</TableHead>
                      <TableHead className="h-8">Source</TableHead>
                      <TableHead className="h-8 text-right">Poids</TableHead>
                      <TableHead className="h-8 text-right">Tokens</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trace.rag_chunks.map((c, i) => (
                      <TableRow key={`${c.resource_id}-${i}`}>
                        <TableCell>
                          <Badge variant={typeColor(c.resource_type)} className="font-mono text-[10px]">
                            {c.resource_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs" title={c.title}>{c.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateFR(c.source_date)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={weightColor(c.temporal_weight)} className="text-[10px]">
                            {c.temporal_weight != null ? c.temporal_weight.toFixed(2) : '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs">{c.estimated_tokens.toLocaleString('fr-FR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>

            <p className="text-[10px] text-muted-foreground/70">Trace #{trace.id.slice(0, 8)} · {trace.mode} · {formatDateFR(trace.created_at)}</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
