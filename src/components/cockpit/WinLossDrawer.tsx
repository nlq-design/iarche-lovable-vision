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
import { useWinLossAnalysis } from '@/hooks/cockpit/useWinLossAnalysis';
import { TrendingUp, TrendingDown, Target, Lightbulb, RefreshCw } from 'lucide-react';

interface WinLossDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WinLossDrawer({ open, onOpenChange }: WinLossDrawerProps) {
  const { data, isLoading, refetch } = useWinLossAnalysis();

  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Analyse Win/Loss Pipeline
          </SheetTitle>
          <SheetDescription>
            Patterns de conversion sur les 6 derniers mois
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-160px)]">
          <div className="pr-4 space-y-4">
            {isLoading && <LoadingState message="Analyse du pipeline..." />}

            {!isLoading && !data?.analysis && (
              <EmptyState
                icon={Target}
                message="Aucune donnée disponible"
                description="Pas assez d'opportunités pour analyser les patterns"
              />
            )}

            {!isLoading && data?.analysis && (
              <>
                {/* Stats globales */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Statistiques</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="text-2xl font-bold text-green-600">
                            {data.stats.won}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Gagnées</p>
                        <p className="text-sm font-semibold">
                          {Math.round(data.stats.total_won_value / 1000)}K€
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          <span className="text-2xl font-bold text-red-600">
                            {data.stats.lost}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Perdues</p>
                        <p className="text-sm font-semibold">
                          {Math.round(data.stats.total_lost_value / 1000)}K€
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-1">
                        Taux de gain
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        {data.stats.win_rate}%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Patterns gagnés */}
                {data.analysis.win_patterns.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        Patterns des opportunités gagnées
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data.analysis.win_patterns.map((pattern: string, idx: number) => (
                          <div key={idx} className="flex gap-2 text-sm">
                            <span className="text-green-600 flex-shrink-0">✓</span>
                            <span className="text-foreground">{pattern}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Patterns perdus */}
                {data.analysis.loss_patterns.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className="text-red-600">✗</span>
                        Patterns des opportunités perdues
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data.analysis.loss_patterns.map((pattern: string, idx: number) => (
                          <div key={idx} className="flex gap-2 text-sm">
                            <span className="text-red-600 flex-shrink-0">✗</span>
                            <span className="text-foreground">{pattern}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Meilleures sources */}
                {data.analysis.best_sources.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Meilleures sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {data.analysis.best_sources.map((source: string, idx: number) => (
                          <Badge key={idx} variant="secondary">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Stage critique */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Stage critique
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground">
                      Le stage{' '}
                      <span className="font-semibold">
                        {data.analysis.critical_stage}
                      </span>{' '}
                      est déterminant pour la conversion
                    </p>
                  </CardContent>
                </Card>

                {/* Recommandations */}
                {data.analysis.recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Recommandations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data.analysis.recommendations.map((rec: string, idx: number) => (
                          <div key={idx} className="flex gap-2 text-sm">
                            <span className="text-primary flex-shrink-0">→</span>
                            <span className="text-foreground">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Facteurs clés */}
                {data.analysis.key_differentiators.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        Facteurs clés de succès
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data.analysis.key_differentiators.map((diff: string, idx: number) => (
                          <div key={idx} className="flex gap-2 text-sm">
                            <span className="text-primary flex-shrink-0">•</span>
                            <span className="text-foreground">{diff}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Actualiser
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="ml-auto"
          >
            Fermer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
