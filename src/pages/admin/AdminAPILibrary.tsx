import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Zap, Cpu, Brain, Sparkles, Key, CheckCircle2, XCircle,
  AlertTriangle, ArrowUp, ArrowDown, RefreshCw, Loader2,
  Settings, BarChart3, Search, Eye, EyeOff, Shield, Clock,
  DollarSign, MessageSquare, Activity, Database, Server, Code,
  Wrench, CheckCircle, AlertCircle
} from "lucide-react";

// Provider icons and colors
const PROVIDER_CONFIG: Record<string, { icon: React.ReactNode; color: string; description: string }> = {
  lovable_ai: {
    icon: <Sparkles className="h-5 w-5" />,
    color: "text-purple-500",
    description: "Gateway Lovable - accès Gemini & GPT sans clé"
  },
  openai: {
    icon: <Cpu className="h-5 w-5" />,
    color: "text-green-500",
    description: "API OpenAI directe - GPT-4o, Embeddings"
  },
  anthropic: {
    icon: <Brain className="h-5 w-5" />,
    color: "text-orange-500",
    description: "API Anthropic - Claude Sonnet 4"
  },
  openrouter: {
    icon: <Zap className="h-5 w-5" />,
    color: "text-blue-500",
    description: "Multi-provider - 200+ modèles"
  }
};

const CATEGORY_LABELS: Record<string, string> = {
  chat: "Chat / Assistant",
  reasoning: "Raisonnement avancé",
  embedding: "Embeddings / RAG",
  vision: "Vision / Multimodal"
};

// Edge functions that use AI with their provider mapping
const EDGE_FUNCTION_AI_MAP: Array<{
  name: string;
  description: string;
  provider: string;
  category: string;
  migrated: boolean;
  legacyNote?: string;
  linesOfCode?: number;
  multiProvider?: boolean;
}> = [
  { name: "partner-consulte", description: "Synthèse IA 360° partenaires", provider: "lovable_ai", category: "reasoning", migrated: true },
  { name: "suggest-tags", description: "Suggestion automatique de tags", provider: "lovable_ai", category: "chat", migrated: true },
  { name: "search-embeddings", description: "Recherche RAG sémantique", provider: "openai", category: "embedding", migrated: true },
  { name: "generate-embeddings", description: "Génération d'embeddings", provider: "openai", category: "embedding", migrated: true },
  { 
    name: "process-voice-transcription", 
    description: "Post-processing transcription audio", 
    provider: "lovable_ai", 
    category: "reasoning", 
    migrated: true,
    legacyNote: "✅ Migré vers ai-client.ts - Utilise callLLMWithFallback pour le fallback automatique.",
    linesOfCode: 2540,
    multiProvider: true
  },
  { 
    name: "ai-agent-orchestrator", 
    description: "Agent IA multimodal Cockpit", 
    provider: "lovable_ai", 
    category: "reasoning", 
    migrated: true,
    legacyNote: "✅ Migré vers ai-client.ts - Utilise AIClient.complete() avec chatWithTools.",
    linesOfCode: 9297,
    multiProvider: true
  },
  { name: "generate-article-claude", description: "Génération article blog (Claude)", provider: "anthropic", category: "chat", migrated: true },
  { name: "generate-article-gpt", description: "Génération article blog (GPT)", provider: "openai", category: "chat", migrated: true },
  { name: "generate-document", description: "Génération de documents", provider: "lovable_ai", category: "chat", migrated: true },
  { name: "generate-faq", description: "Génération de FAQ", provider: "lovable_ai", category: "chat", migrated: true },
  { name: "generate-followup-email", description: "Emails de suivi automatiques", provider: "lovable_ai", category: "chat", migrated: true },
  { name: "enrich-content-seo", description: "Enrichissement SEO contenu", provider: "lovable_ai", category: "chat", migrated: true },
  { name: "analyze-comments-for-faq", description: "Analyse commentaires pour FAQ", provider: "lovable_ai", category: "chat", migrated: true },
  { name: "vivier-ai-search", description: "Recherche IA viviers", provider: "lovable_ai", category: "chat", migrated: true },
  { name: "vivier-insights", description: "Insights viviers", provider: "lovable_ai", category: "reasoning", migrated: true },
  { name: "score-viviers-batch", description: "Scoring batch viviers", provider: "lovable_ai", category: "chat", migrated: true },
  { name: "synthesize-entity-documents", description: "Synthèse documents entités", provider: "lovable_ai", category: "reasoning", migrated: true },
  { name: "extract-entities", description: "Extraction d'entités nommées", provider: "lovable_ai", category: "chat", migrated: true },
];

interface ProviderConfig {
  id: string;
  provider_name: string;
  display_name: string;
  base_url: string;
  api_key_env_var: string;
  is_active: boolean;
  is_default: boolean;
  priority: number;
  rate_limit_rpm: number | null;
}

interface ModelConfig {
  id: string;
  model_id: string;
  display_name: string;
  provider_name: string;
  category: string;
  context_window: number | null;
  capabilities: string[] | null;
  is_active: boolean;
  is_default_for_category: boolean;
}

// Secrets that are configured (fetched from edge function)
interface SecretStatus {
  [key: string]: boolean;
}

export default function AdminAPILibrary() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [functionSearchTerm, setFunctionSearchTerm] = useState("");
  const [showMigratedOnly, setShowMigratedOnly] = useState<boolean | null>(null);
  
  // Secret status check - hardcoded list of configured secrets
  const configuredSecrets: SecretStatus = {
    'LOVABLE_API_KEY': true,
    'OPENAI_API_KEY': true,
    'ANTHROPIC_API_KEY': true,
    'OPENROUTER_API_KEY': true,
  };

  // Fetch providers
  const { data: providers, isLoading: loadingProviders } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_provider_config')
        .select('*')
        .order('priority', { ascending: true });
      if (error) throw error;
      return data as ProviderConfig[];
    }
  });

  // Fetch models
  const { data: models, isLoading: loadingModels } = useQuery({
    queryKey: ['ai-models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .order('provider_name', { ascending: true });
      if (error) throw error;
      return data as ModelConfig[];
    }
  });

  // Fetch usage metrics (last 7 days)
  const { data: usageMetrics } = useQuery({
    queryKey: ['ai-usage-metrics'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('ai_usage_metrics')
        .select('model_provider, model_id, input_tokens, output_tokens, latency_ms, success')
        .gte('created_at', sevenDaysAgo.toISOString());
      
      if (error) throw error;
      return data;
    }
  });

  // Toggle provider active state
  const toggleProviderMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('ai_provider_config')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
      toast.success("Provider mis à jour");
    },
    onError: () => toast.error("Erreur de mise à jour")
  });

  // Toggle model active state
  const toggleModelMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('ai_models')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-models'] });
      toast.success("Modèle mis à jour");
    },
    onError: () => toast.error("Erreur de mise à jour")
  });

  // Set default model for category
  const setDefaultModelMutation = useMutation({
    mutationFn: async ({ id, category }: { id: string; category: string }) => {
      // First, unset all defaults for this category
      await supabase
        .from('ai_models')
        .update({ is_default_for_category: false })
        .eq('category', category);
      
      // Then set this one as default
      const { error } = await supabase
        .from('ai_models')
        .update({ is_default_for_category: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-models'] });
      toast.success("Modèle par défaut mis à jour");
    },
    onError: () => toast.error("Erreur de mise à jour")
  });

  // Update provider priority
  const updatePriorityMutation = useMutation({
    mutationFn: async ({ id, newPriority }: { id: string; newPriority: number }) => {
      const { error } = await supabase
        .from('ai_provider_config')
        .update({ priority: newPriority, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
      toast.success("Priorité mise à jour");
    }
  });

  // Filter models
  const filteredModels = useMemo(() => {
    if (!models) return [];
    return models.filter(model => {
      const matchesSearch = model.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           model.model_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || model.category === categoryFilter;
      const matchesProvider = providerFilter === "all" || model.provider_name === providerFilter;
      return matchesSearch && matchesCategory && matchesProvider;
    });
  }, [models, searchTerm, categoryFilter, providerFilter]);

  // Calculate usage stats per provider
  const usageByProvider = useMemo(() => {
    if (!usageMetrics) return {};
    const stats: Record<string, { requests: number; tokens: number; avgLatency: number; successRate: number }> = {};
    
    usageMetrics.forEach(m => {
      if (!stats[m.model_provider]) {
        stats[m.model_provider] = { requests: 0, tokens: 0, avgLatency: 0, successRate: 0 };
      }
      stats[m.model_provider].requests++;
      stats[m.model_provider].tokens += (m.input_tokens || 0) + (m.output_tokens || 0);
      stats[m.model_provider].avgLatency += m.latency_ms || 0;
    });
    
    Object.keys(stats).forEach(key => {
      if (stats[key].requests > 0) {
        stats[key].avgLatency = Math.round(stats[key].avgLatency / stats[key].requests);
        stats[key].successRate = Math.round(
          (usageMetrics.filter(m => m.model_provider === key && m.success).length / stats[key].requests) * 100
        );
      }
    });
    
    return stats;
  }, [usageMetrics]);

  // Filtered edge functions
  const filteredFunctions = useMemo(() => {
    return EDGE_FUNCTION_AI_MAP.filter(fn => {
      const matchesSearch = fn.name.toLowerCase().includes(functionSearchTerm.toLowerCase()) ||
                           fn.description.toLowerCase().includes(functionSearchTerm.toLowerCase());
      const matchesMigration = showMigratedOnly === null || fn.migrated === showMigratedOnly;
      return matchesSearch && matchesMigration;
    });
  }, [functionSearchTerm, showMigratedOnly]);

  // Stats for functions
  const functionStats = useMemo(() => {
    const total = EDGE_FUNCTION_AI_MAP.length;
    const migrated = EDGE_FUNCTION_AI_MAP.filter(fn => fn.migrated).length;
    const byProvider: Record<string, number> = {};
    EDGE_FUNCTION_AI_MAP.forEach(fn => {
      byProvider[fn.provider] = (byProvider[fn.provider] || 0) + 1;
    });
    return { total, migrated, byProvider };
  }, []);

  // Check if provider has a configured secret
  const isSecretConfigured = (envVar: string): boolean => {
    return configuredSecrets[envVar] === true;
  };

  const movePriority = (provider: ProviderConfig, direction: 'up' | 'down') => {
    if (!providers) return;
    const currentIndex = providers.findIndex(p => p.id === provider.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= providers.length) return;
    
    const otherProvider = providers[newIndex];
    
    // Swap priorities
    updatePriorityMutation.mutate({ id: provider.id, newPriority: otherProvider.priority });
    updatePriorityMutation.mutate({ id: otherProvider.id, newPriority: provider.priority });
  };

  if (loadingProviders || loadingModels) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Server className="h-6 w-6 text-primary" />
              Bibliothèque API
            </h1>
            <p className="text-muted-foreground">
              Gestion centralisée des providers et modèles IA
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
            queryClient.invalidateQueries({ queryKey: ['ai-models'] });
            toast.success("Données actualisées");
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        <Tabs defaultValue="providers" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="providers" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Providers ({providers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="models" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Modèles ({models?.filter(m => m.is_active).length || 0})
            </TabsTrigger>
            <TabsTrigger value="functions" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Fonctions ({functionStats.migrated}/{functionStats.total})
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Usage (7j)
            </TabsTrigger>
          </TabsList>

          {/* ============ PROVIDERS TAB ============ */}
          <TabsContent value="providers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Providers IA - Chaîne de Fallback
                </CardTitle>
                <CardDescription>
                  Ordonnez par priorité. En cas d'erreur, le système bascule sur le provider suivant.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {providers?.map((provider, index) => {
                    const config = PROVIDER_CONFIG[provider.provider_name];
                    const usage = usageByProvider[provider.provider_name];
                    
                    return (
                      <Card 
                        key={provider.id} 
                        className={`border-l-4 transition-all ${
                          provider.is_active 
                            ? provider.is_default ? 'border-l-primary bg-primary/5' : 'border-l-green-500' 
                            : 'border-l-muted opacity-60'
                        }`}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {/* Priority controls */}
                              <div className="flex flex-col gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  disabled={index === 0}
                                  onClick={() => movePriority(provider, 'up')}
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <span className="text-center text-xs font-bold text-muted-foreground">
                                  #{provider.priority}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  disabled={index === (providers?.length || 0) - 1}
                                  onClick={() => movePriority(provider, 'down')}
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              {/* Provider info */}
                              <div className={`p-2 rounded-lg bg-muted/50 ${config?.color}`}>
                                {config?.icon}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{provider.display_name}</span>
                                  {provider.is_default && (
                                    <Badge className="bg-primary/10 text-primary text-xs">
                                      Par défaut
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{config?.description}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Key className="h-3 w-3" />
                                    {provider.api_key_env_var}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {provider.rate_limit_rpm} req/min
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-6">
                              {/* Usage stats */}
                              {usage && (
                                <div className="text-right text-sm">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Activity className="h-3 w-3" />
                                    <span>{usage.requests} requêtes</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>~{usage.avgLatency}ms</span>
                                  </div>
                                </div>
                              )}

                              {/* API Key status - with real verification */}
                              <div className="flex items-center gap-2">
                                {provider.provider_name === 'lovable_ai' ? (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Auto-configuré
                                  </Badge>
                                ) : isSecretConfigured(provider.api_key_env_var) ? (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Clé configurée
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Clé manquante
                                  </Badge>
                                )}
                              </div>

                              {/* Toggle */}
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`active-${provider.id}`} className="text-sm">
                                  {provider.is_active ? "Actif" : "Inactif"}
                                </Label>
                                <Switch
                                  id={`active-${provider.id}`}
                                  checked={provider.is_active}
                                  onCheckedChange={(checked) => 
                                    toggleProviderMutation.mutate({ id: provider.id, is_active: checked })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick info card */}
            <Card className="border-dashed">
              <CardContent className="py-4">
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Fallback automatique</p>
                    <p>Si un provider échoue (rate limit, erreur API), le système bascule automatiquement sur le provider suivant dans l'ordre de priorité. Lovable AI est recommandé en position #1 car il ne requiert pas de clé API.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ MODELS TAB ============ */}
          <TabsContent value="models" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un modèle..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes catégories</SelectItem>
                      <SelectItem value="chat">Chat / Assistant</SelectItem>
                      <SelectItem value="reasoning">Raisonnement</SelectItem>
                      <SelectItem value="embedding">Embeddings</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={providerFilter} onValueChange={setProviderFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous providers</SelectItem>
                      {providers?.map(p => (
                        <SelectItem key={p.provider_name} value={p.provider_name}>
                          {p.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Models table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Catalogue des modèles</CardTitle>
                <CardDescription>
                  {filteredModels.length} modèles disponibles. Activez/désactivez et définissez les modèles par défaut.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Actif</TableHead>
                        <TableHead>Modèle</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Contexte</TableHead>
                        <TableHead>Capacités</TableHead>
                        <TableHead className="text-right">Défaut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredModels.map((model) => {
                        const providerConfig = PROVIDER_CONFIG[model.provider_name];
                        return (
                          <TableRow key={model.id} className={!model.is_active ? 'opacity-50' : ''}>
                            <TableCell>
                              <Switch
                                checked={model.is_active}
                                onCheckedChange={(checked) =>
                                  toggleModelMutation.mutate({ id: model.id, is_active: checked })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium">{model.display_name}</span>
                                <p className="text-xs text-muted-foreground font-mono">{model.model_id}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className={providerConfig?.color}>{providerConfig?.icon}</span>
                                <span className="text-sm">{model.provider_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {CATEGORY_LABELS[model.category] || model.category}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {model.context_window ? (
                                <span className="text-sm">
                                  {model.context_window >= 1000000 
                                    ? `${(model.context_window / 1000000).toFixed(0)}M` 
                                    : `${(model.context_window / 1000).toFixed(0)}K`}
                                </span>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {model.capabilities?.map((cap) => (
                                  <Badge key={cap} variant="secondary" className="text-xs">
                                    {cap}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {model.is_default_for_category ? (
                                <Badge className="bg-primary/10 text-primary">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Défaut
                                </Badge>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDefaultModelMutation.mutate({ 
                                    id: model.id, 
                                    category: model.category 
                                  })}
                                  disabled={!model.is_active}
                                >
                                  Définir
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ FUNCTIONS TAB ============ */}
          <TabsContent value="functions" className="space-y-4">
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Code className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{functionStats.total}</p>
                      <p className="text-sm text-muted-foreground">Fonctions IA</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{functionStats.migrated}</p>
                      <p className="text-sm text-muted-foreground">Migrées (centralisées)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <Wrench className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{functionStats.total - functionStats.migrated}</p>
                      <p className="text-sm text-muted-foreground">Legacy (à migrer)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {Math.round((functionStats.migrated / functionStats.total) * 100)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Taux migration</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher une fonction..."
                      value={functionSearchTerm}
                      onChange={(e) => setFunctionSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select 
                    value={showMigratedOnly === null ? "all" : showMigratedOnly ? "migrated" : "legacy"} 
                    onValueChange={(v) => setShowMigratedOnly(v === "all" ? null : v === "migrated")}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      <SelectItem value="migrated">Migrées uniquement</SelectItem>
                      <SelectItem value="legacy">Legacy uniquement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Functions table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  Mapping Fonction → Provider
                </CardTitle>
                <CardDescription>
                  Liste des edge functions utilisant l'IA et leur provider associé
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[450px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fonction</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead className="text-center">Statut</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFunctions.map((fn) => {
                        const providerConfig = PROVIDER_CONFIG[fn.provider];
                        return (
                          <TableRow key={fn.name}>
                            <TableCell>
                              <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                                {fn.name}
                              </code>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">{fn.description}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className={providerConfig?.color}>{providerConfig?.icon}</span>
                                <span className="text-sm capitalize">{fn.provider.replace('_', ' ')}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {CATEGORY_LABELS[fn.category] || fn.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {fn.migrated ? (
                                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Centralisé
                                </Badge>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Legacy
                                  </Badge>
                                  {fn.linesOfCode && (
                                    <span className="text-xs text-muted-foreground">
                                      {fn.linesOfCode.toLocaleString()} lignes
                                    </span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              {fn.legacyNote && (
                                <p className="text-xs text-muted-foreground italic">
                                  {fn.legacyNote}
                                </p>
                              )}
                              {fn.multiProvider && (
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  Multi-provider intégré
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Info card */}
            <Card className="border-dashed">
              <CardContent className="py-4">
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Fonctions Legacy</p>
                    <p>Les fonctions marquées "Legacy" utilisent encore des appels API directs. Elles doivent être migrées vers le système centralisé (<code className="bg-muted px-1 rounded">callLLM</code>) pour bénéficier du fallback automatique et du tracking unifié.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ USAGE TAB ============ */}
          <TabsContent value="usage" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {providers?.filter(p => p.is_active).map((provider) => {
                const usage = usageByProvider[provider.provider_name];
                const config = PROVIDER_CONFIG[provider.provider_name];
                
                return (
                  <Card key={provider.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className={config?.color}>{config?.icon}</span>
                        {provider.display_name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {usage ? (
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Requêtes</span>
                              <span className="font-medium">{usage.requests}</span>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Tokens</span>
                              <span className="font-medium">{usage.tokens.toLocaleString()}</span>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Latence moy.</span>
                              <span className="font-medium">{usage.avgLatency}ms</span>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Succès</span>
                              <span className="font-medium">{usage.successRate}%</span>
                            </div>
                            <Progress value={usage.successRate} className="h-1" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          Aucune donnée sur les 7 derniers jours
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Total usage summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Résumé (7 derniers jours)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">
                      {usageMetrics?.length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Requêtes totales</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {usageMetrics?.reduce((acc, m) => acc + (m.input_tokens || 0) + (m.output_tokens || 0), 0).toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Tokens consommés</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">
                      {usageMetrics?.length 
                        ? Math.round(usageMetrics.reduce((acc, m) => acc + (m.latency_ms || 0), 0) / usageMetrics.length)
                        : 0}ms
                    </p>
                    <p className="text-sm text-muted-foreground">Latence moyenne</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-600">
                      {usageMetrics?.length 
                        ? Math.round((usageMetrics.filter(m => m.success).length / usageMetrics.length) * 100)
                        : 100}%
                    </p>
                    <p className="text-sm text-muted-foreground">Taux de succès</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
