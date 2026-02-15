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
import { useMeetingPrep, type MeetingPrepAction } from '@/hooks/cockpit/useMeetingPrep';
import {
  Handshake,
  Mail,
  Phone,
  Users,
  FileText,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  CalendarDays,
} from 'lucide-react';

interface MeetingPrepDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId?: string;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  call: Phone,
  meeting: Users,
  note: FileText,
};

const priorityConfig: Record<string, { variant: 'destructive' | 'secondary' | 'outline'; label: string }> = {
  high: { variant: 'destructive', label: 'Haute' },
  medium: { variant: 'secondary', label: 'Moyenne' },
  low: { variant: 'outline', label: 'Basse' },
};

const timingLabels: Record<string, string> = {
  before: 'AVANT le RDV',
  during: 'PENDANT le RDV',
  after: 'APRÈS le RDV',
};

function groupByTiming(actions: MeetingPrepAction[]) {
  const groups: Record<string, MeetingPrepAction[]> = { before: [], during: [], after: [] };
  for (const a of actions) {
    (groups[a.timing] ??= []).push(a);
  }
  return groups;
}

export function MeetingPrepDrawer({ open, onOpenChange, bookingId }: MeetingPrepDrawerProps) {
  const { data, isLoading, refetch } = useMeetingPrep(bookingId);

  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  const meeting = data?.meeting;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Préparation RDV
          </SheetTitle>
          <SheetDescription>
            {meeting
              ? `${meeting.contact.name} — ${meeting.contact.company}`
              : 'Prochain rendez-vous à préparer'}
          </SheetDescription>
          {meeting && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{new Date(meeting.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
              <Badge variant="outline" className="text-xs">{meeting.type}</Badge>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-160px)]">
          <div className="pr-4 space-y-4">
            {isLoading && <LoadingState message="Préparation du briefing..." />}

            {!isLoading && !data && (
              <EmptyState
                icon={CalendarDays}
                message="Aucun RDV à préparer"
                description="Aucun rendez-vous à venir trouvé dans votre agenda"
              />
            )}

            {!isLoading && data && (
              <>
                {/* Contexte opportunité */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">📊 Contexte opportunité</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Opportunité</span>
                      <span className="font-medium text-foreground">{data.context.opportunityName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Étape</span>
                      <Badge variant="secondary">{data.context.opportunityStage}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valeur</span>
                      <span className="font-semibold text-foreground">{data.context.opportunityValue.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dernier contact</span>
                      <span className="text-foreground">il y a {data.context.daysSinceLastContact} jours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Interactions</span>
                      <span className="text-foreground">{data.context.totalInteractions}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Historique récent */}
                {data.history.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">📅 Historique récent</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.history.map((h, idx) => {
                          const Icon = typeIcons[h.type] ?? FileText;
                          return (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(h.date).toLocaleDateString('fr-FR')}
                                </span>
                                <p className="text-foreground">{h.summary}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Points de discussion */}
                {data.talkingPoints.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Points de discussion
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.talkingPoints.map((tp, idx) => {
                          const cfg = priorityConfig[tp.priority] ?? priorityConfig.low;
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                                <span className="text-sm font-medium text-foreground">{tp.topic}</span>
                              </div>
                              <p className="text-xs text-muted-foreground pl-1">{tp.detail}</p>
                              <p className="text-xs text-muted-foreground/60 pl-1 italic">Source : {tp.source}</p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Risques */}
                {data.risks.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        Risques identifiés
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.risks.map((r, idx) => (
                          <div key={idx} className="text-sm space-y-1">
                            <p className="text-foreground font-medium">{r.description}</p>
                            <p className="text-muted-foreground text-xs">→ {r.mitigation}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions suggérées */}
                {data.suggestedActions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">✅ Actions suggérées</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(groupByTiming(data.suggestedActions)).map(
                          ([timing, actions]) =>
                            actions.length > 0 && (
                              <div key={timing}>
                                <p className="text-xs font-semibold text-muted-foreground mb-2">
                                  {timingLabels[timing]}
                                </p>
                                <div className="space-y-2">
                                  {actions.map((a, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm">
                                      <span className="text-primary flex-shrink-0">□</span>
                                      <div>
                                        <span className="text-foreground">{a.action}</span>
                                        <p className="text-xs text-muted-foreground">{a.rationale}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                        )}
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
            Actualiser
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="ml-auto">
            Fermer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
