import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Radar, AlertTriangle, XCircle, Info, X, ChevronRight, RefreshCw,
} from 'lucide-react';
import { SentinelAlert } from '@/hooks/cockpit/useAISentinel';
import { cn } from '@/lib/utils';
import { navigateToEntity } from './helpers';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AIActionDrawer } from './AIActionDrawer';
import { computeAIActionSignature, type AIActionSnapshot } from '@/hooks/cockpit/useAIAction';

function alertToSnapshot(alert: SentinelAlert): AIActionSnapshot {
  return {
    signature: computeAIActionSignature({ source: 'sentinel', alert_id: alert.id, action_text: alert.question }),
    source: 'sentinel',
    entity_type: alert.entity_type,
    entity_id: alert.entity_id,
    entity_name: alert.entity_name,
    action_text: alert.question,
    reasoning: alert.detail,
    urgency: alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'high' : 'medium',
  };
}

// ─── Sentinel Card (in-grid) ───
export function SentinelCardWidget({ alerts, lastFetched }: { alerts: SentinelAlert[]; lastFetched: Date | null }) {
  const navigate = useNavigate();
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  if (alerts.length === 0) return null;

  return (
    <Card className={cn("flex-shrink-0", criticalCount > 0 ? "border-destructive/30" : "border-amber-500/20")}>
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Radar className={cn("h-3.5 w-3.5", criticalCount > 0 ? "text-destructive" : "text-amber-500")} />
          <span className={criticalCount > 0 ? "text-destructive" : "text-amber-600"}>Sentinelle</span>
          <Badge variant={criticalCount > 0 ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0 ml-1">{alerts.length}</Badge>
          {lastFetched && <span className="text-[9px] text-muted-foreground ml-auto font-normal">{formatDistanceToNow(lastFetched, { addSuffix: true, locale: fr })}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2">
        <div className="space-y-1">
          {alerts.slice(0, 3).map(alert => (
            <button key={alert.id}
              className={cn("w-full text-left flex items-start gap-2 p-1.5 rounded text-xs hover:bg-muted/50 transition-colors",
                alert.severity === 'critical' ? "text-destructive" : "text-muted-foreground"
              )}
              onClick={() => navigateToEntity(navigate, alert)}>
              {alert.severity === 'critical' ? <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-500" />}
              <span className="truncate">{alert.entity_name}: {alert.question}</span>
            </button>
          ))}
          {alerts.length > 3 && <p className="text-[10px] text-muted-foreground text-center">+{alerts.length - 3} autres</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sentinel Popover Button (in header band) ───
const severityConfig = {
  critical: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', badge: 'destructive' as const },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', badge: 'secondary' as const },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', badge: 'outline' as const },
};

export function SentinelButton({ alerts, isLoading, onRefresh, onDismiss, lastFetched }: {
  alerts: SentinelAlert[]; isLoading: boolean; onRefresh: () => void; onDismiss: (id: string) => void; lastFetched: Date | null;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const hasAlerts = alerts.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm"
              className={cn("h-8 px-2 relative",
                criticalCount > 0 ? "text-destructive animate-pulse" :
                hasAlerts ? "text-amber-600" : "text-muted-foreground"
              )}>
              <Radar className="h-3.5 w-3.5" />
              {hasAlerts && (
                <span className={cn("absolute -top-1 -right-1 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center",
                  criticalCount > 0 ? "bg-destructive text-destructive-foreground" : "bg-amber-500 text-white"
                )}>{alerts.length > 9 ? '9+' : alerts.length}</span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {hasAlerts ? `Sentinelle : ${alerts.length} anomalie${alerts.length > 1 ? 's' : ''}` : 'Sentinelle — Aucune anomalie'}
          </TooltipContent>
        </Tooltip>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Radar className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">IA Sentinelle</span>
            {alerts.length > 0 && <Badge variant="secondary" className="text-[10px]">{alerts.length}</Badge>}
          </div>
          <div className="flex items-center gap-1">
            {lastFetched && <span className="text-[9px] text-muted-foreground">{formatDistanceToNow(lastFetched, { addSuffix: true, locale: fr })}</span>}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-[350px]">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Radar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Aucune anomalie</p>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {alerts.map(alert => {
                const config = severityConfig[alert.severity as keyof typeof severityConfig] ?? severityConfig.info;
                const Icon = config.icon;
                return (
                  <div key={alert.id} className={cn("p-2.5 rounded-lg border transition-colors hover:bg-muted/50", config.bg)}>
                    <div className="flex items-start gap-2">
                      <Icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", config.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-snug">{alert.question}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{alert.entity_name} · {alert.entity_type}</p>
                        <div className="flex gap-1 mt-1">
                          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]"
                            onClick={() => { setOpen(false); navigateToEntity(navigate, alert); }}>
                            Voir <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground"
                            onClick={() => onDismiss(alert.id)}>
                            <X className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
