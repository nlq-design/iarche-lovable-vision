import { useAIHealthStats } from "@/hooks/admin/useAIHealthStats";
import { useAIAgentStats } from "@/hooks/admin/useAIAgentStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  RefreshCw, CheckCircle2, AlertCircle, AlertTriangle,
  BookOpen, Brain, Database, FileText, Mic, Calendar, Sparkles,
  Activity, TrendingUp
} from "lucide-react";

const STATUS_ICONS = {
  healthy: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
};

const STATUS_COLORS = {
  healthy: "bg-green-500/10 text-green-700 border-green-500/20",
  warning: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  error: "bg-red-500/10 text-red-700 border-red-500/20",
};

export function AIHealthDashboard() {
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useAIHealthStats();
  const { data: stats, isLoading: statsLoading } = useAIAgentStats();

  const isLoading = healthLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!health) return null;

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${STATUS_COLORS[health.healthStatus]}`}>
            {STATUS_ICONS[health.healthStatus]}
          </div>
          <div>
            <h3 className="font-semibold">Santé du Système AI</h3>
            <p className="text-sm text-muted-foreground">
              {health.healthStatus === 'healthy' 
                ? 'Tous les systèmes fonctionnent normalement'
                : `${health.healthIssues.length} problème(s) détecté(s)`}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchHealth()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Health issues */}
      {health.healthIssues.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="pt-4">
            <ul className="space-y-1">
              {health.healthIssues.map((issue, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-yellow-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Main stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dictionnaire */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              Dictionnaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.aliasesActive}</div>
            <p className="text-xs text-muted-foreground">
              alias actifs / {health.aliasesTotal} total
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(health.aliasesByContext).slice(0, 3).map(([ctx, count]) => (
                <Badge key={ctx} variant="secondary" className="text-xs">
                  {ctx}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mémoire */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              Mémoire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.memoryActive}</div>
            <p className="text-xs text-muted-foreground">
              entrées actives ({health.memoryExpired} expirées)
            </p>
            <Progress 
              value={health.memoryTotal > 0 ? (health.memoryActive / health.memoryTotal) * 100 : 0} 
              className="mt-2 h-1.5" 
            />
          </CardContent>
        </Card>

        {/* RAG */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-green-500" />
              RAG
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.ragTotalChunks}</div>
            <p className="text-xs text-muted-foreground">
              chunks indexés
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(health.ragByType).slice(0, 3).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Prompts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              Prompts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.promptsTotal}</div>
            <p className="text-xs text-muted-foreground">
              {health.promptsPrimary} primaires, {health.promptsSecondary} secondaires
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(health.promptsByCategory).slice(0, 3).map(([cat, count]) => (
                <Badge key={cat} variant="secondary" className="text-xs">
                  {cat}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage stats (7 days) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Utilisation (7 derniers jours)
          </CardTitle>
          <CardDescription>Activité du système AI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Mic className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-xl font-bold">{health.usageTranscriptions}</div>
                <p className="text-xs text-muted-foreground">Transcriptions</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <FileText className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-xl font-bold">{health.usageDocuments}</div>
                <p className="text-xs text-muted-foreground">Documents</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-xl font-bold">{health.usageBookings}</div>
                <p className="text-xs text-muted-foreground">RDV créés</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Sparkles className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <div className="text-xl font-bold">{health.usageAIGenerated}</div>
                <p className="text-xs text-muted-foreground">Générations IA</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent stats summary */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Capacités Agent
            </CardTitle>
            <CardDescription>Configuration de l'orchestrateur AI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{stats.totalTools}</div>
                <p className="text-xs text-muted-foreground">Outils</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.actionTools}</div>
                <p className="text-xs text-muted-foreground">Actions</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.connectedEdgeFunctions}</div>
                <p className="text-xs text-muted-foreground">Edge Functions</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{stats.aiTables}</div>
                <p className="text-xs text-muted-foreground">Tables IA</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats.responseModes}</div>
                <p className="text-xs text-muted-foreground">Modes réponse</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
