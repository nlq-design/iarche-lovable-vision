import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Save, Bot, Loader2, RotateCcw, Cpu, Zap, Sparkles, Brain, 
  Database, RefreshCw, CheckCircle2, AlertCircle, FileText,
  Search, BookOpen, FileSignature, FileCheck, Briefcase,
  History, Trash2, Clock, MessageSquare, Wrench
} from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { useLLMModelsGrouped } from "@/hooks/cockpit/useCockpitVoiceTranscriptions";
import { 
  useVectorizationStatus, 
  useIndexedResources, 
  useSyncVectorizationStatus,
  useGenerateAllEmbeddings,
  useSemanticSearch,
  VectorizationStatus
} from "@/hooks/useVectorization";

// Provider groups for LLM selection
const PROVIDER_GROUPS = {
  lovable: { label: "Lovable AI", icon: <Sparkles className="h-4 w-4" /> },
  openai: { label: "OpenAI Direct", icon: <Cpu className="h-4 w-4" /> },
  anthropic: { label: "Anthropic Direct", icon: <Brain className="h-4 w-4" /> },
  openrouter: { label: "OpenRouter", icon: <Zap className="h-4 w-4" /> },
};

// IMPORTANT: Ce slug doit correspondre à celui de l'edge function ai-agent-orchestrator
const MASTER_PROMPT_SLUG = "master-agent";

const DEFAULT_SYSTEM_PROMPT = `Tu es l'Agent IA IArche, un assistant commercial et opérationnel expert.

CONTEXTE :
- IArche est une agence IA basée à Bayonne spécialisée dans les solutions d'intelligence artificielle pour entreprises.
- Tu as accès complet aux données du CRM Cockpit (leads, opportunités, projets, tâches) et du module Admin (articles, solutions, contacts).
- Tu utilises la base de connaissances RAG pour trouver des informations pertinentes sur les offres IArche.

RÔLE :
- Répondre aux questions sur l'activité commerciale et le contenu
- Analyser les données et fournir des insights actionnables
- Suggérer des actions (tâches, emails, qualifications) en mode N1 (validation humaine requise)
- Aider à la prise de décision commerciale
- Rechercher dans la base de connaissances pour enrichir tes réponses

RÈGLES :
- Sois concis et orienté action
- Utilise les outils disponibles pour répondre avec des données réelles
- Utilise search_knowledge_base pour chercher des informations sur les solutions, articles, cas clients IArche
- Pour toute modification (N1), indique clairement que l'utilisateur doit valider
- Ne jamais inventer de données - si tu ne sais pas, dis-le
- Réponds en français

NIVEAUX D'AUTONOMIE :
- N0 : Lecture seule, informatif (statistiques, recherche, consultation)
- N1 : Suggestions/brouillons à valider (tâches, emails, qualifications)
- N2 : Actions irréversibles (réservé, non implémenté ici)`;

const categoryIcons: Record<string, React.ReactNode> = {
  fast: <Zap className="h-4 w-4" />,
  balanced: <Cpu className="h-4 w-4" />,
  premium: <Sparkles className="h-4 w-4" />,
  reasoning: <Brain className="h-4 w-4" />
};

const categoryLabels: Record<string, string> = {
  fast: "Rapide",
  balanced: "Équilibré",
  premium: "Premium",
  reasoning: "Raisonnement"
};

const resourceTypeLabels: Record<string, string> = {
  article: "Articles",
  actualite: "Actualités",
  "livre-blanc": "Livres blancs",
  "atelier-webinaire": "Ateliers/Webinaires",
  solution: "Solutions",
  service: "Services"
};

const resourceTypeIcons: Record<string, React.ReactNode> = {
  article: <FileText className="h-4 w-4" />,
  actualite: <FileText className="h-4 w-4" />,
  "livre-blanc": <BookOpen className="h-4 w-4" />,
  "atelier-webinaire": <FileText className="h-4 w-4" />,
  solution: <Sparkles className="h-4 w-4" />,
  service: <Cpu className="h-4 w-4" />
};

function VectorizationCard({ status, onRefresh }: { status: VectorizationStatus[]; onRefresh: () => void }) {
  const generateAll = useGenerateAllEmbeddings();
  const [testQuery, setTestQuery] = useState("");
  const semanticSearch = useSemanticSearch();

  const totalResources = status.reduce((acc, s) => acc + s.total_resources, 0);
  const indexedResources = status.reduce((acc, s) => acc + s.indexed_resources, 0);
  const overallProgress = totalResources > 0 ? (indexedResources / totalResources) * 100 : 0;

  const handleGenerateAll = async () => {
    toast.info("Indexation en cours...", { duration: 60000 });
    try {
      const result = await generateAll.mutateAsync();
      if (result.success) {
        toast.success(`Indexation terminée : ${result.indexed} ressources indexées`);
      } else {
        toast.warning(`Indexation partielle : ${result.errors} erreurs`);
      }
    } catch (error) {
      toast.error("Erreur lors de l'indexation");
      console.error(error);
    }
  };

  const handleTestSearch = async () => {
    if (!testQuery.trim()) return;
    try {
      const result = await semanticSearch.mutateAsync({ 
        query: testQuery,
        filterTypes: ['solution', 'service'],
        matchCount: 3
      });
      console.log("Search results:", result);
      if (result.results?.length > 0) {
        toast.success(`${result.results.length} résultats trouvés`, {
          description: result.results.map((r: any) => `${r.resource_title} (${(r.similarity * 100).toFixed(0)}%)`).join(", ")
        });
      } else {
        toast.info("Aucun résultat trouvé");
      }
    } catch (error) {
      toast.error("Erreur de recherche");
      console.error(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>Base de connaissances RAG</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Sync
            </Button>
            <Button 
              size="sm" 
              onClick={handleGenerateAll}
              disabled={generateAll.isPending}
            >
              {generateAll.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-1" />
              )}
              Indexer tout
            </Button>
          </div>
        </div>
        <CardDescription>
          Vectorisation des ressources pour la détection automatique de solutions/services dans les transcriptions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progression globale</span>
            <span className="font-medium">{indexedResources} / {totalResources} ressources</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Per-type status */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {status.map((s) => {
            const progress = s.total_resources > 0 
              ? (s.indexed_resources / s.total_resources) * 100 
              : 0;
            const isComplete = s.indexed_resources === s.total_resources && s.total_resources > 0;
            
            return (
              <div 
                key={s.resource_type}
                className="p-3 rounded-lg bg-muted/50 border space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {resourceTypeIcons[s.resource_type]}
                    <span className="text-sm font-medium">
                      {resourceTypeLabels[s.resource_type] || s.resource_type}
                    </span>
                  </div>
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : s.last_error ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : null}
                </div>
                <Progress value={progress} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{s.indexed_resources} / {s.total_resources}</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Test search */}
        <div className="pt-4 border-t">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Tester la recherche sémantique..."
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                onKeyDown={(e) => e.key === 'Enter' && handleTestSearch()}
              />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleTestSearch}
              disabled={semanticSearch.isPending || !testQuery.trim()}
            >
              {semanticSearch.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Testez avec "automatisation RH", "chatbot client", "conformité RGPD"...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function IndexedResourcesList() {
  const { data: resources, isLoading } = useIndexedResources();
  const [selectedType, setSelectedType] = useState<string>("all");

  const filteredResources = selectedType === "all" 
    ? resources 
    : resources?.filter(r => r.resource_type === selectedType);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Ressources indexées</CardTitle>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {Object.entries(resourceTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredResources?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune ressource indexée. Cliquez sur "Indexer tout" pour démarrer.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredResources?.slice(0, 20).map((resource) => (
              <div 
                key={resource.resource_id}
                className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-sm"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {resourceTypeIcons[resource.resource_type]}
                  <span className="truncate">{resource.resource_title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {resource.chunk_count} chunks
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {resourceTypeLabels[resource.resource_type] || resource.resource_type}
                  </Badge>
                </div>
              </div>
            ))}
            {(filteredResources?.length || 0) > 20 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{(filteredResources?.length || 0) - 20} autres ressources
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Memory Management Component
function AIMemoryManager() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>("all");
  
  const { data: memories, isLoading, refetch } = useQuery({
    queryKey: ['ai-memory', selectedType],
    queryFn: async () => {
      let query = supabase
        .from('ai_agent_memory')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (selectedType !== "all") {
        query = query.eq('memory_type', selectedType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  const { data: memoryStats } = useQuery({
    queryKey: ['ai-memory-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agent_memory')
        .select('memory_type')
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((m) => {
        counts[m.memory_type] = (counts[m.memory_type] || 0) + 1;
      });
      return counts;
    }
  });

  const deleteMemoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_agent_memory')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-memory'] });
      queryClient.invalidateQueries({ queryKey: ['ai-memory-stats'] });
      toast.success("Mémoire supprimée");
    }
  });

  const clearExpiredMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('cleanup_expired_ai_memory');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-memory'] });
      queryClient.invalidateQueries({ queryKey: ['ai-memory-stats'] });
      toast.success("Mémoires expirées nettoyées");
      refetch();
    }
  });

  const memoryTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    conversation: { label: "Conversation", icon: <MessageSquare className="h-3 w-3" />, color: "bg-blue-500/10 text-blue-500" },
    action: { label: "Action", icon: <Zap className="h-3 w-3" />, color: "bg-green-500/10 text-green-500" },
    rag_query: { label: "Requête RAG", icon: <Search className="h-3 w-3" />, color: "bg-purple-500/10 text-purple-500" },
    tool_call: { label: "Tool Call", icon: <Wrench className="h-3 w-3" />, color: "bg-orange-500/10 text-orange-500" },
    insight: { label: "Insight", icon: <Sparkles className="h-3 w-3" />, color: "bg-yellow-500/10 text-yellow-500" },
    preference: { label: "Préférence", icon: <CheckCircle2 className="h-3 w-3" />, color: "bg-pink-500/10 text-pink-500" },
    context: { label: "Contexte", icon: <Brain className="h-3 w-3" />, color: "bg-cyan-500/10 text-cyan-500" },
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const totalMemories = Object.values(memoryStats || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <CardTitle>Mémoire Agent IA</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Rafraîchir
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => clearExpiredMutation.mutate()}
                disabled={clearExpiredMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Nettoyer expirées
              </Button>
            </div>
          </div>
          <CardDescription>
            L'agent IA mémorise les conversations, actions et insights pour améliorer ses réponses.
            Les embeddings vectoriels permettent une recherche sémantique dans la mémoire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <p className="text-2xl font-bold">{totalMemories}</p>
              <p className="text-xs text-muted-foreground">Total entrées</p>
            </div>
            {Object.entries(memoryStats || {}).slice(0, 3).map(([type, count]) => {
              const config = memoryTypeConfig[type];
              return (
                <div key={type} className="p-3 rounded-lg bg-muted/50 border text-center">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    {config?.icon}
                    {config?.label || type}
                  </p>
                </div>
              );
            })}
          </div>
          
          {/* Filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button 
              variant={selectedType === "all" ? "default" : "outline"} 
              size="sm"
              onClick={() => setSelectedType("all")}
            >
              Tout
            </Button>
            {Object.entries(memoryTypeConfig).map(([type, config]) => (
              <Button 
                key={type}
                variant={selectedType === type ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedType(type)}
                className="gap-1"
              >
                {config.icon}
                {config.label}
                {memoryStats?.[type] && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {memoryStats[type]}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Memory List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entrées récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !memories?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Aucune mémoire enregistrée</p>
              <p className="text-xs">L'agent commencera à mémoriser après les premières interactions</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {memories.map((memory) => {
                const config = memoryTypeConfig[memory.memory_type];
                return (
                  <div 
                    key={memory.id}
                    className="p-3 rounded-lg border bg-muted/30 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${config?.color || "bg-muted"}`}>
                          {config?.icon}
                          <span className="ml-1">{config?.label || memory.memory_type}</span>
                        </Badge>
                        {memory.category && (
                          <Badge variant="outline" className="text-xs">
                            {memory.category}
                          </Badge>
                        )}
                        {memory.importance_score && memory.importance_score > 0.7 && (
                          <Badge variant="secondary" className="text-xs">
                            ⭐ Important
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(memory.created_at)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => deleteMemoryMutation.mutate(memory.id)}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm line-clamp-3">{memory.content}</p>
                    {memory.entity_type && (
                      <p className="text-xs text-muted-foreground">
                        Lié à : {memory.entity_type} {memory.entity_id?.slice(0, 8)}...
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Document Generation Configuration Component
function DocumentGenerationConfig() {
  const queryClient = useQueryClient();
  const { models: llmModels, byProvider } = useLLMModelsGrouped();
  
  const DOCUMENT_TYPES = [
    { slug: 'document_generation_quote', name: 'Devis', icon: <FileSignature className="h-4 w-4" />, type: 'quote' },
    { slug: 'document_generation_spec', name: 'Cahier des charges', icon: <FileCheck className="h-4 w-4" />, type: 'spec' },
    { slug: 'document_generation_proposal', name: 'Proposition commerciale', icon: <Briefcase className="h-4 w-4" />, type: 'proposal' },
  ];

  // Fetch all document prompts
  const { data: docPrompts, isLoading } = useQuery({
    queryKey: ['document-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .eq('category', 'document_generation');
      if (error) throw error;
      return data || [];
    }
  });

  const updatePromptMutation = useMutation({
    mutationFn: async ({ slug, updates }: { slug: string; updates: any }) => {
      const existingPrompt = docPrompts?.find(p => p.slug === slug);
      
      if (existingPrompt) {
        const { error } = await supabase
          .from('ai_prompts')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', existingPrompt.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-prompts'] });
      toast.success("Configuration document mise à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    }
  });

  const getPromptConfig = (slug: string) => {
    const prompt = docPrompts?.find(p => p.slug === slug);
    const config = prompt?.model_config as { model?: string; provider?: string } || {};
    return {
      prompt,
      model: config.model || 'google/gemini-2.5-flash',
      provider: config.provider || 'lovable',
    };
  };

  const handleModelChange = (slug: string, modelId: string, provider: string) => {
    const model = llmModels.find(m => m.id === modelId);
    if (!model) return;
    
    updatePromptMutation.mutate({
      slug,
      updates: {
        model_config: {
          model: model.model_id,
          provider: model.provider,
        }
      }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Configuration Génération Documents
          </CardTitle>
          <CardDescription>
            Configurez le modèle LLM utilisé pour chaque type de document généré dans le Cockpit.
            Les prompts système sont pré-configurés et optimisés pour chaque type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {DOCUMENT_TYPES.map((docType) => {
            const config = getPromptConfig(docType.slug);
            const selectedModel = llmModels.find(m => m.model_id === config.model);
            
            return (
              <div key={docType.slug} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  {docType.icon}
                  <h3 className="font-medium">{docType.name}</h3>
                  {config.prompt && (
                    <Badge variant="outline" className="text-xs">
                      {config.provider}
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Modèle LLM</Label>
                    <Select 
                      value={selectedModel?.id || ""} 
                      onValueChange={(modelId) => {
                        const model = llmModels.find(m => m.id === modelId);
                        if (model) {
                          handleModelChange(docType.slug, modelId, model.provider);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un modèle">
                          {selectedModel?.display_name || "Sélectionner..."}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(byProvider).map(([provider, models]) => {
                          if (models.length === 0) return null;
                          const providerInfo = PROVIDER_GROUPS[provider as keyof typeof PROVIDER_GROUPS];
                          return (
                            <div key={provider}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-2 bg-muted/50">
                                {providerInfo?.icon}
                                {providerInfo?.label || provider}
                              </div>
                              {models.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{model.display_name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {model.category} • {model.description || model.cost_tier}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Statut</Label>
                    <div className="flex items-center gap-2 h-10">
                      {config.prompt ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Configuré
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Prompt par défaut
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Provider Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Providers disponibles</CardTitle>
          <CardDescription>
            Les modèles sont répartis par provider. Chaque provider nécessite sa propre clé API configurée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(PROVIDER_GROUPS).map(([key, info]) => (
              <div key={key} className="p-3 rounded-lg bg-muted/50 border flex items-center gap-2">
                {info.icon}
                <span className="text-sm font-medium">{info.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            <strong>Lovable AI</strong> est inclus par défaut. Pour les autres providers, configurez les clés API 
            (OPENAI_API_KEY, ANTHROPIC_API_KEY, OPENROUTER_API_KEY) dans les secrets Supabase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminAIPrompts() {
  const queryClient = useQueryClient();
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  
  const { models: llmModels, grouped, isLoading: modelsLoading } = useLLMModelsGrouped();
  const { data: vectorStatus, isLoading: statusLoading, refetch: refetchStatus } = useVectorizationStatus();
  const syncStatus = useSyncVectorizationStatus();

  const { data: masterPrompt, isLoading } = useQuery({
    queryKey: ['master-ai-prompt'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .eq('slug', MASTER_PROMPT_SLUG)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (masterPrompt) {
      setSystemPrompt(masterPrompt.system_prompt);
      const config = masterPrompt.model_config as { model?: string; llm_model_id?: string } | null;
      // Priorité au llm_model_id (UUID), sinon chercher par model_id string
      if (config?.llm_model_id) {
        setSelectedModelId(config.llm_model_id);
      } else if (config?.model && llmModels.length > 0) {
        const modelByModelId = llmModels.find(m => m.model_id === config.model);
        if (modelByModelId) {
          setSelectedModelId(modelByModelId.id);
        }
      }
    }
  }, [masterPrompt, llmModels]);

  useEffect(() => {
    if (llmModels.length > 0 && !selectedModelId) {
      const defaultModel = llmModels.find(m => m.model_id === 'google/gemini-2.5-flash');
      if (defaultModel) {
        setSelectedModelId(defaultModel.id);
      }
    }
  }, [llmModels, selectedModelId]);

  // Sync status on mount
  useEffect(() => {
    syncStatus.mutate();
  }, []);

  const saveMutation = useMutation({
    mutationFn: async ({ prompt, modelId }: { prompt: string; modelId: string }) => {
      // Récupérer le model_id (format "provider/model") depuis llm_models
      const selectedModel = llmModels.find(m => m.id === modelId);
      const modelIdForConfig = selectedModel?.model_id || 'google/gemini-2.5-flash';
      const provider = selectedModel?.provider || 'lovable';
      
      const modelConfig = { 
        model: modelIdForConfig,
        provider: provider,
        temperature: 0.7,
        max_tokens: 4096,
        // Garder llm_model_id pour référence
        llm_model_id: modelId
      };
      
      if (masterPrompt) {
        const { error } = await supabase
          .from('ai_prompts')
          .update({ 
            system_prompt: prompt,
            model_config: modelConfig,
            updated_at: new Date().toISOString()
          })
          .eq('id', masterPrompt.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_prompts')
          .insert({
            name: "Agent IA IArche - Prompt Principal",
            slug: MASTER_PROMPT_SLUG,
            category: "agent",
            system_prompt: prompt,
            model_config: modelConfig
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-ai-prompt'] });
      setHasChanges(false);
      toast.success("Configuration IA sauvegardée - Active immédiatement sur l'agent");
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  });

  const handlePromptChange = (value: string) => {
    setSystemPrompt(value);
    setHasChanges(true);
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate({ prompt: systemPrompt, modelId: selectedModelId });
  };

  const handleReset = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    setHasChanges(true);
  };

  const getSelectedModelName = () => {
    if (!llmModels.length || !selectedModelId) return "Chargement...";
    const model = llmModels.find(m => m.id === selectedModelId);
    return model?.display_name || "Sélectionner un modèle";
  };

  if (isLoading || modelsLoading) {
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
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Assistant IA</h1>
              <p className="text-muted-foreground">
                Configuration globale, modèle LLM et base de connaissances RAG
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Sauvegarder
            </Button>
          </div>
        </div>

        <Tabs defaultValue="config" className="space-y-4">
          <TabsList>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="documents">Génération Docs</TabsTrigger>
            <TabsTrigger value="rag">Base RAG</TabsTrigger>
            <TabsTrigger value="memory">Mémoire IA</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            {/* Model Selection Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Modèle LLM
                </CardTitle>
                <CardDescription>
                  Sélectionnez le modèle IA à utiliser pour les transcriptions, analyses et synthèses.
                  Ce choix s'applique à tous les modules du Cockpit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedModelId} onValueChange={handleModelChange}>
                  <SelectTrigger className="w-full md:w-[400px]">
                    <SelectValue placeholder="Sélectionner un modèle">
                      {getSelectedModelName()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(grouped).map(([category, models]) => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-2 bg-muted/50">
                          {categoryIcons[category]}
                          {categoryLabels[category] || category}
                        </div>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{model.display_name}</span>
                              {model.description && (
                                <span className="text-xs text-muted-foreground">{model.description}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* System Prompt Card */}
            <Card>
              <CardHeader>
                <CardTitle>Prompt Système</CardTitle>
                <CardDescription>
                  Ce prompt définit le comportement de votre assistant IA pour l'ensemble des fonctionnalités : 
                  transcriptions, leads, projets, solutions, comptes-rendus, pipeline, agenda, documents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  placeholder="Entrez le prompt système..."
                  className="min-h-[400px] font-mono text-sm"
                />
                <div className="flex justify-between items-center mt-3">
                  <p className="text-xs text-muted-foreground">
                    {systemPrompt.length} caractères
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <DocumentGenerationConfig />
          </TabsContent>

          <TabsContent value="rag" className="space-y-4">
            {/* Vectorization Status */}
            {vectorStatus && (
              <VectorizationCard 
                status={vectorStatus} 
                onRefresh={() => {
                  syncStatus.mutate();
                  refetchStatus();
                }} 
              />
            )}

            {/* Indexed Resources List */}
            <IndexedResourcesList />
          </TabsContent>

          <TabsContent value="memory" className="space-y-4">
            <AIMemoryManager />
          </TabsContent>

          <TabsContent value="modules" className="space-y-4">
            {/* Edge Functions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Edge Functions IA
                </CardTitle>
                <CardDescription>
                  Fonctions backend déployées automatiquement, utilisant ce prompt système et le modèle LLM configuré.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { 
                      name: "ai-agent-orchestrator", 
                      desc: "Agent principal avec outils (CRM, RAG, Admin)", 
                      uses: "Prompt système + Modèle LLM + RAG",
                      status: "active"
                    },
                    { 
                      name: "search-embeddings", 
                      desc: "Recherche sémantique dans la base RAG", 
                      uses: "OpenAI text-embedding-3-small",
                      status: "active"
                    },
                    { 
                      name: "generate-embeddings", 
                      desc: "Indexation vectorielle des ressources", 
                      uses: "OpenAI text-embedding-3-small",
                      status: "active"
                    },
                    { 
                      name: "generate-document", 
                      desc: "Génération Devis/CDC/Proposition", 
                      uses: "Prompts spécifiques (onglet Docs)",
                      status: "active"
                    },
                    { 
                      name: "process-voice-transcription", 
                      desc: "Traitement transcription vocale", 
                      uses: "Prompt transcription + RAG",
                      status: "active"
                    },
                  ].map((fn) => (
                    <div 
                      key={fn.name}
                      className="flex items-start justify-between p-3 rounded-lg bg-muted/50 border"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-background px-2 py-0.5 rounded">
                            {fn.name}
                          </code>
                          <Badge variant="outline" className="text-xs">
                            {fn.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{fn.desc}</p>
                        <p className="text-xs text-muted-foreground/80">
                          <span className="font-medium">Utilise :</span> {fn.uses}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Modules Cockpit */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Modules Cockpit</CardTitle>
                <CardDescription>
                  Tous ces modules invoquent l'agent via <code className="text-xs bg-muted px-1 rounded">ai-agent-orchestrator</code>.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { name: "Transcriptions", desc: "Synthèse audio + détection solutions", path: "/cockpit/transcriptions" },
                    { name: "Leads", desc: "Qualification & scoring", path: "/cockpit/leads" },
                    { name: "Projets", desc: "Suivi & recommandations", path: "/cockpit/projects" },
                    { name: "Solutions", desc: "Analyse commerciale", path: "/cockpit/solutions" },
                    { name: "Pipeline", desc: "Insights opportunités", path: "/cockpit/pipeline" },
                    { name: "Agenda", desc: "Préparation RDV", path: "/cockpit/agenda" },
                    { name: "Documents", desc: "Génération CDC/Devis", path: "/cockpit/documents" },
                    { name: "Agent Chat", desc: "Agent flottant universel", path: "composant global" }
                  ].map((module) => (
                    <div 
                      key={module.name}
                      className="p-3 rounded-lg bg-muted/50 border"
                    >
                      <p className="font-medium text-sm">{module.name}</p>
                      <p className="text-xs text-muted-foreground">{module.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* RAG Integration Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Architecture RAG
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <div className="p-3 rounded-lg bg-muted/30 border space-y-2">
                  <p className="font-medium text-foreground">Flux de données :</p>
                  <ol className="list-decimal list-inside space-y-1 pl-2">
                    <li><strong>generate-embeddings</strong> : Indexe articles/solutions → table <code>resource_embeddings</code></li>
                    <li><strong>search-embeddings</strong> : Reçoit requête → génère embedding → recherche vectorielle</li>
                    <li><strong>ai-agent-orchestrator</strong> : Appelle <code>search_knowledge_base</code> → enrichit contexte</li>
                  </ol>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-foreground mb-1">Ressources indexées :</p>
                    <ul className="list-disc list-inside space-y-0.5 pl-2 text-xs">
                      <li>Articles</li>
                      <li>Actualités</li>
                      <li>Livres blancs</li>
                      <li>Ateliers/Webinaires</li>
                      <li>Solutions</li>
                      <li>Services</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">Exclus (confidentialité) :</p>
                    <ul className="list-disc list-inside space-y-0.5 pl-2 text-xs">
                      <li>Cas clients</li>
                      <li>Données CRM (leads, projets)</li>
                    </ul>
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
