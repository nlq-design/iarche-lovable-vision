import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Target,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  Building2,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface VivierInsight {
  type: 'opportunity' | 'cohort' | 'trend' | 'alert';
  title: string;
  description: string;
  metric?: string;
  priority: 'high' | 'medium' | 'low';
  suggested_query?: string;
}

interface VivierStats {
  total_leads: number;
  avg_score: number;
  high_score_count: number;
  not_contacted_30d: number;
  top_industries: Array<{ industry: string; count: number; avg_score: number }>;
  top_cities: Array<{ city: string; count: number }>;
  score_distribution: Array<{ range: string; count: number }>;
}

interface VivierInsightsProps {
  onQuerySuggest?: (query: string) => void;
}

const ICON_MAP = {
  opportunity: Target,
  cohort: Users,
  trend: TrendingUp,
  alert: AlertTriangle,
};

const PRIORITY_COLORS = {
  high: 'border-orange-500 bg-orange-500/10',
  medium: 'border-primary bg-primary/10',
  low: 'border-muted-foreground bg-muted',
};

export function VivierInsights({ onQuerySuggest }: VivierInsightsProps) {
  const [stats, setStats] = useState<VivierStats | null>(null);
  const [insights, setInsights] = useState<VivierInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchInsights = async (showToast = false) => {
    try {
      const { data, error } = await supabase.functions.invoke('vivier-insights');

      if (error) throw error;

      if (data.stats) {
        setStats(data.stats);
      }
      if (data.insights) {
        setInsights(data.insights);
      }
      setLastUpdated(new Date());
      
      if (showToast) {
        toast.success('Insights actualisés');
      }
    } catch (err) {
      console.error('Error fetching insights:', err);
      if (showToast) {
        toast.error('Erreur lors du chargement des insights');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchInsights(true);
  };

  const handleInsightAction = (insight: VivierInsight) => {
    if (insight.suggested_query && onQuerySuggest) {
      onQuerySuggest(insight.suggested_query);
      toast.success('Requête copiée dans la recherche IA');
    }
  };

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-accent/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5 text-primary" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const highPriorityCount = insights.filter(i => i.priority === 'high').length;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="border-primary/20 bg-gradient-to-br from-accent/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                <CardTitle className="flex items-center gap-2 text-lg cursor-pointer">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Insights
                  {highPriorityCount > 0 && (
                    <Badge variant="destructive" className="ml-1 text-xs">
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
              disabled={isRefreshing}
              className="text-muted-foreground"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Quick Stats */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">
                    {stats.total_leads.toLocaleString('fr-FR')}
                  </div>
                  <div className="text-xs text-muted-foreground">Total leads</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">
                    {Math.round(stats.avg_score)}
                  </div>
                  <div className="text-xs text-muted-foreground">Score moyen</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">
                    {stats.high_score_count.toLocaleString('fr-FR')}
                  </div>
                  <div className="text-xs text-muted-foreground">Score ≥ 70</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-500">
                    {stats.not_contacted_30d.toLocaleString('fr-FR')}
                  </div>
                  <div className="text-xs text-muted-foreground">Non contactés</div>
                </div>
              </div>
            )}

            {/* Top Industries & Cities */}
            {stats && (stats.top_industries.length > 0 || stats.top_cities.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stats.top_industries.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Building2 className="w-3 h-3" />
                      Top secteurs
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {stats.top_industries.slice(0, 4).map((ind, i) => (
                        <Badge 
                          key={i} 
                          variant="secondary" 
                          className="text-xs cursor-pointer hover:bg-secondary/80"
                          onClick={() => onQuerySuggest?.(`secteur ${ind.industry}`)}
                        >
                          {ind.industry} ({ind.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {stats.top_cities.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      Top villes
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {stats.top_cities.slice(0, 4).map((city, i) => (
                        <Badge 
                          key={i} 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-muted"
                          onClick={() => onQuerySuggest?.(`ville ${city.city}`)}
                        >
                          {city.city} ({city.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Insights */}
            {insights.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="w-3 h-3" />
                  Recommandations IA
                </div>
                {insights.map((insight, i) => {
                  const Icon = ICON_MAP[insight.type];
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border-l-4 ${PRIORITY_COLORS[insight.priority]} cursor-pointer transition-all hover:shadow-sm`}
                      onClick={() => handleInsightAction(insight)}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${
                          insight.priority === 'high' ? 'text-orange-500' : 
                          insight.priority === 'medium' ? 'text-primary' : 
                          'text-muted-foreground'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{insight.title}</span>
                            {insight.metric && (
                              <Badge variant="secondary" className="text-xs font-bold">
                                {insight.metric}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {insight.description}
                          </p>
                          {insight.suggested_query && (
                            <div className="mt-1.5 flex items-center gap-1 text-xs text-primary">
                              <Sparkles className="w-3 h-3" />
                              Cliquez pour rechercher
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Aucun insight disponible pour le moment
              </div>
            )}

            {/* Last updated */}
            {lastUpdated && (
              <div className="text-xs text-muted-foreground text-center pt-2">
                Actualisé {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
