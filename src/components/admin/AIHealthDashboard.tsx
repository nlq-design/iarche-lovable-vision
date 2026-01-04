import { useAIHealthStats } from "@/hooks/admin/useAIHealthStats";
import { useAIAgentStats } from "@/hooks/admin/useAIAgentStats";
import { useInfrastructureStats } from "@/hooks/admin/useInfrastructureStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  RefreshCw, CheckCircle2, AlertCircle, AlertTriangle,
  BookOpen, Brain, Database, FileText, Mic, Calendar, Sparkles,
  Activity, TrendingUp, Link2, Users, ChevronDown, Settings,
  Bot, Wrench, Briefcase, ClipboardList, FileSignature, FileCheck, FileCode,
  Key, HardDrive, Plug, Server, FolderOpen
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
  const { data: infra, isLoading: infraLoading } = useInfrastructureStats();

  const isLoading = healthLoading || statsLoading || infraLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
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

  if (!health || !infra) return null;

  // Resource type icons mapping
  const resourceTypeIcons: Record<string, React.ReactNode> = {
    article: <FileText className="h-3 w-3" />,
    actualite: <FileText className="h-3 w-3" />,
    "livre-blanc": <BookOpen className="h-3 w-3" />,
    "atelier-webinaire": <Calendar className="h-3 w-3" />,
    solution: <Sparkles className="h-3 w-3" />,
    service: <Settings className="h-3 w-3" />,
    "cas-client": <Briefcase className="h-3 w-3" />,
    lead: <Users className="h-3 w-3" />,
    project: <ClipboardList className="h-3 w-3" />,
    partner: <Users className="h-3 w-3" />,
    uploaded_file: <FileCode className="h-3 w-3" />,
    specification: <FileSignature className="h-3 w-3" />,
    voice_transcription: <Mic className="h-3 w-3" />,
    generated_document: <FileCheck className="h-3 w-3" />,
  };

  // Module navigation items for quick access
  const moduleItems = [
    { key: 'config', label: 'Configuration', icon: <Bot className="h-4 w-4" />, desc: 'Master Agent, modèle LLM' },
    { key: 'documents', label: 'Prompts Secondaires', icon: <FileText className="h-4 w-4" />, desc: `${health.promptsSecondary} prompts par catégorie`, count: health.promptsSecondary },
    { key: 'rag', label: 'Base RAG', icon: <Database className="h-4 w-4" />, desc: `${health.ragTotalChunks} chunks, ${Object.keys(health.ragByType).length} types`, count: health.ragTotalChunks },
    { key: 'dictionary', label: 'Dictionnaire', icon: <BookOpen className="h-4 w-4" />, desc: `${health.aliasesActive} alias actifs`, count: health.aliasesActive },
    { key: 'memory', label: 'Mémoire IA', icon: <Brain className="h-4 w-4" />, desc: `${health.memoryActive} entrées actives`, count: health.memoryActive },
    { key: 'modules', label: 'Modules', icon: <Wrench className="h-4 w-4" />, desc: `${stats?.totalTools || 0} outils agent`, count: stats?.totalTools || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${STATUS_COLORS[health.healthStatus]}`}>
            {STATUS_ICONS[health.healthStatus]}
          </div>
          <div>
            <h3 className="font-semibold">Diagnostic Système IA v6.22</h3>
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

      {/* Module Navigation Cards */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Navigation Modules IA
          </CardTitle>
          <CardDescription>Vue d'ensemble des composants IA — cliquez sur les onglets ci-dessus pour accéder</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {moduleItems.map((mod) => (
              <div 
                key={mod.key}
                className="p-3 rounded-lg border bg-background/80 hover:bg-muted/50 transition-colors space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    {mod.icon}
                  </div>
                  <span className="text-sm font-medium">{mod.label}</span>
                </div>
                <div className="text-xs text-muted-foreground">{mod.desc}</div>
                {mod.count !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {mod.count.toLocaleString()}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
              chunks • {Object.keys(health.ragByType).length} types indexés
            </p>
            <Collapsible>
              <CollapsibleTrigger className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <ChevronDown className="h-3 w-3" />
                Détail par type
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-1">
                  {Object.entries(health.ragByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">
                        {resourceTypeIcons[type] || <FileText className="h-3 w-3" />}
                        {type}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
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
            <Collapsible>
              <CollapsibleTrigger className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <ChevronDown className="h-3 w-3" />
                Par catégorie
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(health.promptsByCategory).map(([cat, count]) => (
                    <Badge key={cat} variant="secondary" className="text-xs">
                      {cat}: {count}
                    </Badge>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Phase 2: Cross-références */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4 text-cyan-500" />
              Références
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.entityReferencesTotal}</div>
            <p className="text-xs text-muted-foreground">
              liens croisés
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(health.entityReferencesByType).slice(0, 3).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Phase 2: Lead Familiarity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-rose-500" />
              Familiarité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.leadsFamiliarityAvg}%</div>
            <p className="text-xs text-muted-foreground">
              score moyen leads
            </p>
            <Progress 
              value={health.leadsFamiliarityAvg} 
              className="mt-2 h-1.5" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              {health.leadsWithHighFamiliarity} leads familiers
            </p>
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

      {/* Infrastructure complète */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Server className="h-4 w-4" />
            Infrastructure Complète (Vérifié)
          </CardTitle>
          <CardDescription>Inventaire réel du système</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Prompts */}
            <Collapsible>
              <div className="p-3 rounded-lg border bg-orange-500/5 border-orange-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Prompts</span>
                </div>
                <div className="text-2xl font-bold">{infra.promptsTotal}</div>
                <p className="text-xs text-muted-foreground">{infra.promptsCategories} catégories</p>
                <CollapsibleTrigger className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <ChevronDown className="h-3 w-3" />
                  Détail
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="mt-2 p-2 rounded border bg-muted/30 space-y-1 max-h-40 overflow-auto">
                  {Object.entries(infra.promptsByCategory).map(([cat, data]) => (
                    <div key={cat} className="flex justify-between text-xs">
                      <span>{cat}</span>
                      <Badge variant="outline" className="text-xs">{data.count}</Badge>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Edge Functions */}
            <Collapsible>
              <div className="p-3 rounded-lg border bg-blue-500/5 border-blue-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Plug className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Edge Functions</span>
                </div>
                <div className="text-2xl font-bold">{infra.edgeFunctionsTotal}</div>
                <p className="text-xs text-muted-foreground">+ _shared</p>
                <CollapsibleTrigger className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <ChevronDown className="h-3 w-3" />
                  Liste
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="mt-2 p-2 rounded border bg-muted/30 max-h-40 overflow-auto">
                  <div className="flex flex-wrap gap-1">
                    {infra.edgeFunctionsList.slice(0, 20).map((fn) => (
                      <Badge key={fn} variant="secondary" className="text-xs">
                        {fn}
                      </Badge>
                    ))}
                    {infra.edgeFunctionsTotal > 20 && (
                      <Badge variant="outline" className="text-xs">
                        +{infra.edgeFunctionsTotal - 20} autres
                      </Badge>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Tables */}
            <Collapsible>
              <div className="p-3 rounded-lg border bg-green-500/5 border-green-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Tables</span>
                </div>
                <div className="text-2xl font-bold">{infra.tablesTotal}</div>
                <p className="text-xs text-muted-foreground">{Object.keys(infra.tablesByGroup).length} groupes</p>
                <CollapsibleTrigger className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <ChevronDown className="h-3 w-3" />
                  Groupes
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="mt-2 p-2 rounded border bg-muted/30 space-y-2 max-h-40 overflow-auto">
                  {Object.entries(infra.tablesByGroup).map(([group, tables]) => (
                    <div key={group} className="text-xs">
                      <div className="flex justify-between font-medium">
                        <span>{group}</span>
                        <Badge variant="outline">{tables.length}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Secrets */}
            <Collapsible>
              <div className="p-3 rounded-lg border bg-purple-500/5 border-purple-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Key className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Secrets</span>
                </div>
                <div className="text-2xl font-bold">{infra.secretsTotal}</div>
                <p className="text-xs text-muted-foreground">API Keys</p>
                <CollapsibleTrigger className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <ChevronDown className="h-3 w-3" />
                  Liste
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="mt-2 p-2 rounded border bg-muted/30 max-h-40 overflow-auto">
                  <div className="flex flex-wrap gap-1">
                    {infra.secretsList.map((secret) => (
                      <Badge key={secret} variant="secondary" className="text-xs font-mono">
                        {secret.replace(/_/g, '_​')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Buckets */}
            <Collapsible>
              <div className="p-3 rounded-lg border bg-cyan-500/5 border-cyan-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <HardDrive className="h-4 w-4 text-cyan-500" />
                  <span className="text-sm font-medium">Buckets</span>
                </div>
                <div className="text-2xl font-bold">{infra.bucketsTotal}</div>
                <p className="text-xs text-muted-foreground">Storage</p>
                <CollapsibleTrigger className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <ChevronDown className="h-3 w-3" />
                  Détail
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="mt-2 p-2 rounded border bg-muted/30 space-y-1">
                  {infra.bucketsList.map((bucket) => (
                    <div key={bucket.name} className="flex items-center justify-between text-xs">
                      <span className="font-mono">{bucket.name}</span>
                      <Badge variant={bucket.isPublic ? "default" : "secondary"} className="text-xs">
                        {bucket.isPublic ? "public" : "privé"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Connecteurs */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="h-4 w-4" />
              <span className="text-sm font-medium">Connecteurs</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {infra.connectorsActive.map((c) => (
                <Badge key={c} className="bg-green-500/10 text-green-700 border-green-500/20">
                  ✓ {c}
                </Badge>
              ))}
              {infra.connectorsAvailable.map((c) => (
                <Badge key={c} variant="outline" className="text-muted-foreground">
                  {c} (disponible)
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
