import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Zap } from 'lucide-react';
import { IntelligenceAction } from '@/hooks/cockpit/useCockpitIntelligence';
import { cn } from '@/lib/utils';
import { formatCurrency } from './helpers';
import { AIActionDrawer } from './AIActionDrawer';
import { computeAIActionSignature, type AIActionSnapshot } from '@/hooks/cockpit/useAIAction';

const urgencyConfig: Record<string, { bg: string; text: string; icon: string }> = {
  critical: { bg: 'bg-destructive/10 border-destructive/30', text: 'text-destructive', icon: '🔴' },
  high: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-700 dark:text-amber-400', icon: '🟠' },
  medium: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-700 dark:text-blue-400', icon: '🔵' },
  low: { bg: 'bg-muted border-border', text: 'text-muted-foreground', icon: '⚪' },
};

interface TopActionsWidgetProps {
  actions?: IntelligenceAction[];
  isLoading: boolean;
  navigate: (path: string) => void;
}

export function TopActionsWidget({ actions, isLoading }: TopActionsWidgetProps) {
  const [selected, setSelected] = useState<AIActionSnapshot | null>(null);

  if (isLoading) return (
    <Card className="border-primary/20">
      <CardContent className="pt-3 px-3 pb-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Calcul des priorités...
        </div>
      </CardContent>
    </Card>
  );
  if (!actions?.length) return null;

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Actions Prioritaires
            <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">{actions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-2">
          <ScrollArea className="h-[320px] pr-2">
            <div className="space-y-1.5">
              {actions.map((action, i) => {
              const cfg = urgencyConfig[action.urgency] || urgencyConfig.medium;
              const snapshot: AIActionSnapshot = {
                signature: computeAIActionSignature({
                  source: 'top_action',
                  entity_type: action.entity_type,
                  entity_id: action.entity_id,
                  action_text: action.action,
                }),
                source: 'top_action',
                entity_type: action.entity_type,
                entity_id: action.entity_id,
                entity_name: action.entity_name,
                action_text: action.action,
                reasoning: action.reasoning,
                urgency: action.urgency,
                impact_value: action.impact_value,
              };
              return (
                <div key={i}
                  className={cn("p-2 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity", cfg.bg)}
                  onClick={() => setSelected(snapshot)}>
                  <div className="flex items-start gap-2">
                    <span className="text-xs mt-0.5">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-medium", cfg.text)}>{action.action}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{action.reasoning}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">{action.entity_type}</Badge>
                        <span className="text-[9px] text-muted-foreground">{action.entity_name}</span>
                        {action.impact_value && action.impact_value > 0 && (
                          <span className="text-[9px] font-semibold text-primary">{formatCurrency(action.impact_value)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      <AIActionDrawer snapshot={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </>
  );
}
