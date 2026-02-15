import { useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { LoadingState } from './common/LoadingState';
import { EmptyState } from './common/EmptyState';
import {
  useDeadlineCascade,
  type CriticalPathItem,
  type RescheduleItem,
  type CascadeRecommendation,
} from '@/hooks/cockpit/useDeadlineCascade';
import {
  CalendarDays,
  Target,
  Link2,
  RotateCcw,
  Construction,
  DollarSign,
  Lightbulb,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Ban,
  Square,
} from 'lucide-react';

interface DeadlineCascadeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
}

const feasibilityConfig: Record<string, { border: string; bg: string; label: string }> = {
  on_track: { border: 'border-green-500', bg: 'bg-green-50 dark:bg-green-950/30', label: '✅ En bonne voie' },
  at_risk: { border: 'border-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30', label: '⚠️ À risque' },
  impossible: { border: 'border-red-500', bg: 'bg-red-50 dark:bg-red-950/30', label: '🚫 Impossible' },
};

const healthBadgeConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  on_track: { variant: 'default', label: 'En bonne voie' },
  at_risk: { variant: 'secondary', label: 'À risque' },
  critical: { variant: 'destructive', label: 'Critique' },
  blocked: { variant: 'destructive', label: 'Bloqué' },
};

const statusIcons: Record<CriticalPathItem['status'], React.ComponentType<{ className?: string }>> = {
  done: CheckCircle2,
  in_progress: Loader2,
  blocked: Ban,
  not_started: Square,
};

const priorityConfig: Record<string, { variant: 'destructive' | 'secondary' | 'outline'; label: string }> = {
  high: { variant: 'destructive', label: 'Élevé' },
  medium: { variant: 'secondary', label: 'Moyen' },
  low: { variant: 'outline', label: 'Faible' },
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

export function DeadlineCascadeDrawer({ open, onOpenChange, projectId }: DeadlineCascadeDrawerProps) {
  const { data, isLoading, refetch } = useDeadlineCascade(projectId);

  useEffect(() => {
    if (open && projectId) refetch();
  }, [open, projectId, refetch]);

  const project = data?.project;
  const healthCfg = healthBadgeConfig[project?.health_status ?? ''] ?? healthBadgeConfig.on_track;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[800px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Cascade Deadlines
          </SheetTitle>
          <SheetDescription>
            {project ? `${project.name} — Deadline : ${formatDate(project.deadline)}` : 'Analyse des deadlines projet'}
          </SheetDescription>
          {project && (
            <Badge variant={healthCfg.variant} className="w-fit text-xs mt-1">{healthCfg.label}</Badge>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-160px)]">
          <div className="pr-4 space-y-4">
            {isLoading && <LoadingState message="Analyse des deadlines..." />}

            {!isLoading && !data && (
              <EmptyState
                icon={CalendarDays}
                message="Aucune donnée disponible"
                description="Impossible d'analyser les deadlines de ce projet"
              />
            )}

            {!isLoading && data && (
              <>
                {/* Faisabilité */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" /> Faisabilité
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const cfg = feasibilityConfig[data.feasibility.status] ?? feasibilityConfig.on_track;
                      return (
                        <div className={`p-3 rounded-md border-l-4 ${cfg.border} ${cfg.bg}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{cfg.label}</span>
                            <Badge variant="outline" className="text-xs">{data.feasibility.confidence}%</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{data.feasibility.summary}</p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Chemin critique */}
                {data.critical_path.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Link2 className="h-4 w-4" /> Chemin critique
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.critical_path.map((item, idx) => {
                          const Icon = statusIcons[item.status] ?? Square;
                          return (
                            <div key={idx} className="text-sm">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                <span className="font-medium text-foreground">{item.task}</span>
                                <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                                  {formatDate(item.deadline)} (marge: {item.slack_days}j)
                                </span>
                              </div>
                              {item.dependency && (
                                <p className="text-xs text-muted-foreground pl-6">└─ dépend de : {item.dependency}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tâches à replanifier */}
                {data.tasks_to_reschedule.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" /> Tâches à replanifier
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.tasks_to_reschedule.map((item, idx) => {
                          const cfg = priorityConfig[item.impact] ?? priorityConfig.low;
                          return (
                            <div key={idx} className="text-sm space-y-1">
                              <p className="font-medium text-foreground">{item.task}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatDate(item.current_deadline)}</span>
                                <span>→</span>
                                <span className="font-medium text-foreground">{formatDate(item.suggested_deadline)}</span>
                                <Badge variant={cfg.variant} className="text-xs ml-auto">{cfg.label}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{item.reason}</p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Jalons bloqués */}
                {data.blocked_milestones.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Construction className="h-4 w-4" /> Jalons bloqués
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.blocked_milestones.map((m, idx) => (
                          <div key={idx} className="p-2.5 rounded-md border border-destructive/30 bg-destructive/5">
                            <div className="flex items-center gap-2 text-sm">
                              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                              <span className="font-medium text-foreground">{m.milestone}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 pl-6">
                              Bloqué par : {m.blocked_by} · Retard estimé : {m.estimated_delay_days}j
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Impact opportunités */}
                {data.opportunity_impact.opportunities_affected > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <DollarSign className="h-4 w-4" /> Impact opportunités
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 mb-3 text-sm">
                        <Badge variant="secondary">{data.opportunity_impact.opportunities_affected} affectées</Badge>
                        <span className="font-semibold text-destructive">{formatCurrency(data.opportunity_impact.total_value_at_risk)} à risque</span>
                      </div>
                      <div className="space-y-2">
                        {data.opportunity_impact.details.map((d, idx) => (
                          <div key={idx} className="text-sm">
                            <div className="flex justify-between">
                              <span className="text-foreground">{d.name}</span>
                              <span className="font-medium text-foreground">{formatCurrency(d.value)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{d.impact_description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommandations */}
                {data.recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" /> Recommandations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.recommendations.map((r, idx) => {
                          const cfg = priorityConfig[r.priority] ?? priorityConfig.low;
                          return (
                            <div key={idx} className="text-sm space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                                <span className="font-medium text-foreground">{r.action}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Effort : {r.effort}</p>
                              <p className="text-xs text-muted-foreground">→ {r.expected_outcome}</p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Rafraîchir
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="ml-auto">
            Fermer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
