import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Loader2, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { STAGE_LABELS, formatCurrency } from './helpers';

interface StagnantWidgetProps {
  onSuggestFollowUp: (entityId: string) => void;
  suggestNextStep: { isPending: boolean };
}

export function StagnantWidget({ onSuggestFollowUp, suggestNextStep }: StagnantWidgetProps) {
  const navigate = useNavigate();
  const { data: stagnant = [], isLoading } = useQuery({
    queryKey: ['stagnant-opportunities'],
    queryFn: async () => {
      const ago = new Date();
      ago.setDate(ago.getDate() - 7);
      const { data } = await supabase
        .from('opportunities')
        .select('id, title, stage, updated_at, lead_id, value_amount')
        .lt('updated_at', ago.toISOString())
        .not('stage', 'in', '(closed_won,closed_lost)')
        .order('updated_at', { ascending: true })
        .limit(50);
      return data || [];
    },
    staleTime: 30_000,
  });

  if (isLoading || stagnant.length === 0) return null;

  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-1.5 pt-3 px-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" /> Inactif +7j
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-auto">{stagnant.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2">
        <ScrollArea className="max-h-[280px] pr-2">
          {stagnant.map((opp: any) => (
            <div key={opp.id} className="flex items-center justify-between py-1.5 px-1.5 rounded transition-colors group">
              <div className="min-w-0 cursor-pointer hover:bg-muted/50 flex-1" onClick={() => navigate('/cockpit/pipeline')}>
                <p className="text-xs font-medium truncate">{opp.title}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="capitalize">{STAGE_LABELS[opp.stage] || opp.stage}</span>
                  {opp.value_amount > 0 && <span>· {formatCurrency(opp.value_amount)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(opp.updated_at), { locale: fr })}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); onSuggestFollowUp(opp.id); }}
                      disabled={suggestNextStep.isPending}>
                      {suggestNextStep.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3 text-primary" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Suggestion IA</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
