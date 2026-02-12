import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState, EmptyState } from './common';
import ReactMarkdown from 'react-markdown';
import { useMorningBrief } from '@/hooks/cockpit/useMorningBrief';
import { Calendar, AlertTriangle, Activity, RefreshCw } from 'lucide-react';

interface MorningBriefModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MorningBriefModal({ open, onOpenChange }: MorningBriefModalProps) {
  const { data, isLoading, refetch } = useMorningBrief();

  // Auto-fetch when modal opens
  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'secondary';
      case 'medium':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-4xl overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <span>☀️ Morning Brief</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </DialogHeader>

        <ScrollArea className="h-[calc(80vh-120px)] pr-4">
          {isLoading && <LoadingState message="Génération du brief..." />}

          {!isLoading && !data && (
            <EmptyState message="Impossible de charger le brief" inline />
          )}

          {!isLoading && data && (
            <div className="space-y-4 pe-4">
              {/* Section 1: Narrative brief */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Vue d'ensemble
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{data.brief || 'Aucun brief disponible'}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>

              {/* Section 2: Today's tasks */}
              {data.data.today_tasks?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Tâches du jour ({data.data.today_tasks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {data.data.today_tasks.map((task: any) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-2 rounded-md border border-border/50 hover:bg-muted/50"
                        >
                          <Badge variant={getPriorityColor(task.priority)} className="h-fit text-xs">
                            {task.priority}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{task.title}</p>
                            {task.due_time && (
                              <p className="text-xs text-muted-foreground">{task.due_time}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section 3: Today's bookings */}
              {data.data.today_bookings?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Rendez-vous ({data.data.today_bookings.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {data.data.today_bookings.map((booking: any) => (
                        <div
                          key={booking.id}
                          className="flex items-start gap-3 p-2 rounded-md border border-border/50 hover:bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium flex items-center gap-2">
                              <span>
                                {new Date(booking.start_time).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span className="truncate">{booking.name}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {booking.company || booking.email}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section 4: Inactivity alerts */}
              {data.data.inactivity_alerts?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Alertes inactivité ({data.data.inactivity_alerts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {data.data.inactivity_alerts.slice(0, 5).map((alert: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-2 rounded-md border border-border/50 hover:bg-muted/50"
                        >
                          <Badge
                            variant={getSeverityColor(alert.severity)}
                            className="h-fit text-xs"
                          >
                            {alert.severity}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{alert.entity_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {alert.days_inactive}j inactif • {alert.suggestion}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section 5: Project health summary */}
              {data.data.health_summary && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Santé des projets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-md border border-border/50 bg-card p-3 text-center">
                        <p className="text-lg font-bold text-emerald-600">
                          {data.data.health_summary.on_track}
                        </p>
                        <p className="text-xs text-muted-foreground">On track</p>
                      </div>
                      <div className="rounded-md border border-border/50 bg-card p-3 text-center">
                        <p className="text-lg font-bold text-amber-600">
                          {data.data.health_summary.at_risk}
                        </p>
                        <p className="text-xs text-muted-foreground">At risk</p>
                      </div>
                      <div className="rounded-md border border-border/50 bg-card p-3 text-center">
                        <p className="text-lg font-bold text-destructive">
                          {data.data.health_summary.off_track}
                        </p>
                        <p className="text-xs text-muted-foreground">Off track</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
