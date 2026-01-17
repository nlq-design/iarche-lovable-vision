import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Flame, 
  Target,
  Zap,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Users,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';
import { useVivierInsights, VivierOpportunity } from '@/hooks/viviers/useVivierInsights';
import { useQueryClient } from '@tanstack/react-query';

interface VivierInsightsProps {
  onQuerySuggest?: (query: string) => void;
}

const TYPE_CONFIG = {
  hot_leads: {
    icon: Flame,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10 border-orange-500/30',
  },
  golden_segment: {
    icon: Target,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
  },
  quick_win: {
    icon: Zap,
    color: 'text-green-500',
    bg: 'bg-green-500/10 border-green-500/30',
  },
  reactivation: {
    icon: RefreshCcw,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 border-blue-500/30',
  },
};

export function VivierInsights({ onQuerySuggest }: VivierInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const queryClient = useQueryClient();
  
  const { data, isLoading, isFetching, refetch } = useVivierInsights();
  
  const stats = data?.stats ?? null;
  const opportunities = data?.opportunities ?? [];
  const dailySummary = data?.daily_summary ?? '';

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['vivier-insights'] });
    refetch();
    toast.success('Opportunités en cours d\'actualisation...');
  };

  const handleOpportunityAction = (opp: VivierOpportunity) => {
    if (opp.action.query && onQuerySuggest) {
      onQuerySuggest(opp.action.query);
      toast.success(`Recherche: "${opp.action.query}"`);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-accent/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Opportunités du jour
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const highPriorityCount = opportunities.filter(o => o.priority === 'high').length;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="border-primary/20 bg-gradient-to-br from-accent/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                <CardTitle className="flex items-center gap-2 text-lg cursor-pointer">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Opportunités
                  {highPriorityCount > 0 && (
                    <Badge className="ml-1 bg-orange-500 text-white text-xs">
                      {highPriorityCount}
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </CardTitle>
              </Button>
            </CollapsibleTrigger>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isFetching}
              className="text-muted-foreground"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {/* Daily Summary */}
          {dailySummary && (
            <p className="text-sm text-muted-foreground mt-1">
              {dailySummary}
            </p>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-3 pt-2">
            {/* Quick Stats Row */}
            {stats && (
              <div className="grid grid-cols-3 gap-2 p-2 bg-muted/30 rounded-lg text-center">
                <div>
                  <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                    <Flame className="w-4 h-4 text-orange-500" />
                    {stats.hot_leads_count}
                  </div>
                  <div className="text-xs text-muted-foreground">Leads chauds</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    {stats.high_score_count}
                  </div>
                  <div className="text-xs text-muted-foreground">Score ≥70</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                    <Users className="w-4 h-4 text-blue-500" />
                    {stats.complete_data_count}
                  </div>
                  <div className="text-xs text-muted-foreground">Données complètes</div>
                </div>
              </div>
            )}

            {/* Opportunities */}
            {opportunities.length > 0 ? (
              <div className="space-y-2">
                {opportunities.map((opp, i) => {
                  const config = TYPE_CONFIG[opp.type];
                  const Icon = config.icon;
                  
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${config.bg} cursor-pointer transition-all hover:shadow-md group`}
                      onClick={() => handleOpportunityAction(opp)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full bg-background ${config.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{opp.title}</span>
                            {opp.priority === 'high' && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                                Prioritaire
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {opp.description}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="secondary"
                              className="h-7 text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                            >
                              {opp.action.label}
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                            {opp.avg_score > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Score ~{opp.avg_score}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Aucune opportunité détectée. Lancez le scoring pour en générer.
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
