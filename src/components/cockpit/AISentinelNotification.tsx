import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Info, XCircle, X, RefreshCw, ChevronRight, Radar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAISentinel, SentinelAlert } from '@/hooks/cockpit/useAISentinel';
import { cn } from '@/lib/utils';

const severityConfig = {
  critical: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', badge: 'destructive' as const },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', badge: 'secondary' as const },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', badge: 'outline' as const },
};

const categoryLabels: Record<string, string> = {
  incomplete: 'Données manquantes',
  inconsistency: 'Incohérence',
  inactivity: 'Inactivité',
  risk: 'Risque',
  duplicate: 'Doublon',
  overdue: 'En retard',
  imbalance: 'Déséquilibre',
};

function AlertItem({ alert, onDismiss, onNavigate }: { 
  alert: SentinelAlert; 
  onDismiss: () => void;
  onNavigate: () => void;
}) {
  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <div className={cn("p-3 rounded-lg border transition-colors hover:bg-muted/50", config.bg)}>
      <div className="flex items-start gap-2.5">
        <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", config.color)} />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={config.badge} className="text-[10px] px-1.5 py-0">
              {categoryLabels[alert.category]}
            </Badge>
            <span className="text-[10px] text-muted-foreground capitalize">{alert.entity_type}</span>
          </div>
          <p className="text-sm font-medium leading-snug">{alert.question}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{alert.detail}</p>
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={onNavigate}
            >
              Voir <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={onDismiss}
            >
              <X className="w-3 h-3 mr-0.5" /> Ignorer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AISentinelNotification() {
  const { alerts, total, isLoading, refresh, dismissAlert } = useAISentinel();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const hasAlerts = alerts.length > 0;

  const navigateToEntity = (alert: SentinelAlert) => {
    setOpen(false);
    const routes: Record<string, string> = {
      lead: `/cockpit/leads/${alert.entity_id}`,
      opportunity: `/cockpit/leads`, // opportunities are within leads
      project: `/cockpit/projects/${alert.entity_id}`,
      partner: `/cockpit/partenaires/${alert.entity_id}`,
    };
    navigate(routes[alert.entity_type] || '/cockpit');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 px-2.5 relative transition-all",
                criticalCount > 0
                  ? "border-destructive/50 text-destructive hover:bg-destructive/10 animate-pulse"
                  : hasAlerts
                  ? "border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  : "border-border text-muted-foreground"
              )}
            >
              <Radar className="w-4 h-4" />
              {hasAlerts && (
                <span className={cn(
                  "absolute -top-1.5 -right-1.5 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center",
                  criticalCount > 0 
                    ? "bg-destructive text-destructive-foreground" 
                    : "bg-amber-500 text-white"
                )}>
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {hasAlerts 
              ? `IA Sentinelle : ${alerts.length} point${alerts.length > 1 ? 's' : ''} à vérifier`
              : "IA Sentinelle — Aucune anomalie détectée"
            }
          </TooltipContent>
        </Tooltip>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Radar className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">IA Sentinelle</span>
            {total > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {total} détecté{total > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => refresh()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>

        <ScrollArea className="max-h-[400px]">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Radar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Aucune anomalie détectée</p>
              <p className="text-xs mt-1">Le système vérifie toutes les 5 minutes</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {alerts.map(alert => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onDismiss={() => dismissAlert(alert.id)}
                  onNavigate={() => navigateToEntity(alert)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
