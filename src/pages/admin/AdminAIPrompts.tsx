import { useState, useEffect, useMemo } from "react"; // v3.2
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { 
  Save, Bot, Loader2, RotateCcw, Cpu, Zap, Sparkles, Brain, 
  Database, RefreshCw, CheckCircle2, AlertCircle, FileText,
  Search, BookOpen, FileSignature, FileCheck, Briefcase,
  History, Trash2, Clock, MessageSquare, Wrench, ChevronDown,
  ExternalLink, Eye, Edit, Activity, Shield, Users, 
  Calendar, Target, ClipboardList, Mic, FileCode, Settings, Tag, Bell, BarChart3
} from "lucide-react";
import { KeywordDictionary } from "@/components/admin/KeywordDictionary";
import { AIHealthDashboard } from "@/components/admin/AIHealthDashboard";
import { OrchestratorConfig } from "@/components/admin/OrchestratorConfig";
import AdminLayout from "@/components/layouts/AdminLayout";
import { useLLMModelsGrouped } from "@/hooks/cockpit/useCockpitVoiceTranscriptions";
import { 
  useVectorizationStatus, 
  useIndexedResources, 
  useSyncVectorizationStatus,
  useGenerateAllEmbeddings,
  useSemanticSearch,
  useStaleResources,
  useReindexStaleResources,
  getFreshnessStatus,
  VectorizationStatus
} from "@/hooks/useVectorization";
import { useAIAgentStats } from "@/hooks/admin/useAIAgentStats";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

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

## CONTEXTE TEMPOREL
Date : {date_actuelle} | Heure : {heure_actuelle} | Semaine : {semaine}

## IDENTITÉ
- IArche : Agence IA basée à Bayonne, solutions d'intelligence artificielle pour entreprises
- Tu as accès COMPLET au CRM Cockpit et au module Admin
- Tu EXÉCUTES des actions concrètes, pas seulement des suggestions

## RÈGLES D'EXÉCUTION

### 1. EXÉCUTION DIRECTE
Quand l'utilisateur demande une action, tu DOIS :
- Appeler les outils appropriés IMMÉDIATEMENT (create_booking, create_lead, send_email, etc.)
- NE PAS demander de confirmation
- Créer RÉELLEMENT les données dans le système
- Retourner les résultats concrets (confirmations, liens Zoom, etc.)

### 2. COLLECTE D'INFOS MINIMALE
Si des informations CRITIQUES manquent (email, date/heure) :
- Demande UNIQUEMENT les infos indispensables en UNE question
- Dès que tu as les infos, EXÉCUTE sans demander validation

### 3. PAS DE BAVARDAGE
- Réponses courtes (3-5 lignes max en mode CHAT)
- Données concrètes : noms, dates, montants, statuts
- Jamais d'UUIDs visibles (utilise les noms/titres)
- JAMAIS de "voulez-vous que je..." ou "confirmez-vous ?"

## FORMAT DE RÉPONSE
- Mode CHAT (défaut) : 3-5 lignes max, données factuelles
- Mode DÉTAILLÉ (transcriptions, analyses, CDC) : Structure avec sections

## OUTILS PRINCIPAUX (67 disponibles)
- create_booking : RDV complet (Zoom + Calendrier + Emails)
- create_lead : Nouveau lead CRM
- send_email : Email (envoi direct)
- create_opportunity / create_project : Pipeline
- search_knowledge_base : Recherche RAG

## INTERDIT
- Demander validation ou confirmation
- Dire "voulez-vous que je..." ou "souhaitez-vous..."
- Reformuler au lieu d'agir
- Inventer des données`;

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

// NOTE: voice_transcription excluded from RAG - content indexed via Consulte on linked entities
const resourceTypeLabels: Record<string, string> = {
  article: "Articles",
  actualite: "Actualités",
  "livre-blanc": "Livres blancs",
  "atelier-webinaire": "Ateliers/Webinaires",
  solution: "Solutions",
  service: "Services",
  "cas-client": "Cas Clients",
  // Cockpit types (voice_transcription excluded - indexed via ai_documents_summary)
  lead: "Leads",
  project: "Projets",
  partner: "Partenaires",
  uploaded_file: "Fichiers",
  specification: "CDC",
  generated_document: "Documents"
};

const resourceTypeIcons: Record<string, React.ReactNode> = {
  article: <FileText className="h-4 w-4" />,
  actualite: <FileText className="h-4 w-4" />,
  "livre-blanc": <BookOpen className="h-4 w-4" />,
  "atelier-webinaire": <Calendar className="h-4 w-4" />,
  solution: <Sparkles className="h-4 w-4" />,
  service: <Cpu className="h-4 w-4" />,
  "cas-client": <Briefcase className="h-4 w-4" />,
  // Cockpit types (voice_transcription excluded - indexed via Consulte)
  lead: <Users className="h-4 w-4" />,
  project: <ClipboardList className="h-4 w-4" />,
  partner: <Users className="h-4 w-4" />,
  uploaded_file: <FileCode className="h-4 w-4" />,
  specification: <FileSignature className="h-4 w-4" />,
  generated_document: <FileCheck className="h-4 w-4" />
};

// =============================================================================
// PROMPT ACCORDIONS COMPONENT - 3 blocs composés
// =============================================================================

interface PromptAccordionsProps {
  masterPrompt: string;
  onMasterChange: (value: string) => void;
}

function PromptAccordions({ masterPrompt, onMasterChange }: PromptAccordionsProps) {
  const queryClient = useQueryClient();
  const [uiNavPrompt, setUiNavPrompt] = useState("");
  const [toolsRefPrompt, setToolsRefPrompt] = useState("");
  const [openAccordions, setOpenAccordions] = useState<string[]>(["master-agent"]);
  
  // Fetch ui-navigation and tools-reference prompts
  const { data: additionalPrompts, isLoading } = useQuery({
    queryKey: ['additional-ai-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .in('slug', ['ui-navigation', 'tools-reference']);
      
      if (error) throw error;
      return data;
    }
  });
  
  useEffect(() => {
    if (additionalPrompts) {
      const uiNav = additionalPrompts.find(p => p.slug === 'ui-navigation');
      const toolsRef = additionalPrompts.find(p => p.slug === 'tools-reference');
      if (uiNav) setUiNavPrompt(uiNav.system_prompt);
      if (toolsRef) setToolsRefPrompt(toolsRef.system_prompt);
    }
  }, [additionalPrompts]);
  
  // Save ui-navigation prompt
  const saveUiNavMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const existing = additionalPrompts?.find(p => p.slug === 'ui-navigation');
      if (existing) {
        const { error } = await supabase
          .from('ai_prompts')
          .update({ system_prompt: prompt, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['additional-ai-prompts'] });
      toast.success("Prompt Navigation UI sauvegardé");
    },
    onError: () => toast.error("Erreur de sauvegarde")
  });
  
  const getPromptStats = (prompt: string) => {
    const chars = prompt.length;
    const tokens = Math.ceil(chars / 4); // Approximation
    return { chars, tokens };
  };
  
  const masterStats = getPromptStats(masterPrompt);
  const uiNavStats = getPromptStats(uiNavPrompt);
  const toolsRefStats = getPromptStats(toolsRefPrompt);
  const totalTokens = masterStats.tokens + uiNavStats.tokens + toolsRefStats.tokens;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Token Budget Indicator */}
      <Card className="border-dashed">
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Budget tokens système :</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={totalTokens > 6000 ? "text-destructive font-medium" : "text-muted-foreground"}>
                ~{totalTokens.toLocaleString()} / 8,000 tokens
              </span>
              <Progress value={(totalTokens / 8000) * 100} className="w-24 h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accordion 1: Master Agent */}
      <Collapsible 
        open={openAccordions.includes("master-agent")} 
        onOpenChange={(open) => {
          setOpenAccordions(prev => 
            open ? [...prev, "master-agent"] : prev.filter(a => a !== "master-agent")
          );
        }}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Prompt Système (master-agent)</CardTitle>
                    <CardDescription>Identité, règles d'exécution, formats de réponse</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    ~{masterStats.tokens} tokens
                  </Badge>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <Edit className="h-3 w-3 mr-1" />
                    Éditable
                  </Badge>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openAccordions.includes("master-agent") ? "rotate-180" : ""}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <Textarea
                value={masterPrompt}
                onChange={(e) => onMasterChange(e.target.value)}
                placeholder="Entrez le prompt système..."
                className="min-h-[350px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {masterPrompt.length} caractères
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Accordion 2: UI Navigation */}
      <Collapsible 
        open={openAccordions.includes("ui-navigation")} 
        onOpenChange={(open) => {
          setOpenAccordions(prev => 
            open ? [...prev, "ui-navigation"] : prev.filter(a => a !== "ui-navigation")
          );
        }}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-5 w-5 text-blue-500" />
                  <div>
                    <CardTitle className="text-base">Navigation UI (ui-navigation)</CardTitle>
                    <CardDescription>Mapping pages Admin/Cockpit, boutons, actions</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    ~{uiNavStats.tokens} tokens
                  </Badge>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <Edit className="h-3 w-3 mr-1" />
                    Éditable
                  </Badge>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openAccordions.includes("ui-navigation") ? "rotate-180" : ""}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              <Textarea
                value={uiNavPrompt}
                onChange={(e) => setUiNavPrompt(e.target.value)}
                placeholder="Mapping des pages et actions UI..."
                className="min-h-[300px] font-mono text-sm"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {uiNavPrompt.length} caractères
                </p>
                <Button 
                  size="sm" 
                  onClick={() => saveUiNavMutation.mutate(uiNavPrompt)}
                  disabled={saveUiNavMutation.isPending}
                >
                  {saveUiNavMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Save className="h-3 w-3 mr-1" />
                  )}
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Accordion 3: Tools Reference (Read-only) */}
      <Collapsible 
        open={openAccordions.includes("tools-reference")} 
        onOpenChange={(open) => {
          setOpenAccordions(prev => 
            open ? [...prev, "tools-reference"] : prev.filter(a => a !== "tools-reference")
          );
        }}
      >
        <Card className="border-muted">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wrench className="h-5 w-5 text-orange-500" />
                  <div>
                    <CardTitle className="text-base">Référentiel Outils (tools-reference)</CardTitle>
                    <CardDescription>Outils, Edge Functions, tables IA (chargé dynamiquement)</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    ~{toolsRefStats.tokens} tokens
                  </Badge>
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                    <Shield className="h-3 w-3 mr-1" />
                    Lecture seule
                  </Badge>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openAccordions.includes("tools-reference") ? "rotate-180" : ""}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="rounded-md bg-muted/50 p-4">
                <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground max-h-[400px] overflow-y-auto">
                  {toolsRefPrompt}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Ce bloc est généré automatiquement. Modifiez l'orchestrateur pour le mettre à jour.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

function VectorizationCard({ status, onRefresh }: { status: VectorizationStatus[]; onRefresh: () => void }) {
  const generateAll = useGenerateAllEmbeddings();
  const [testQuery, setTestQuery] = useState("");
  const semanticSearch = useSemanticSearch();
  const { data: staleData, isLoading: staleLoading } = useStaleResources();
  const reindexStale = useReindexStaleResources();

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

  const handleReindexStale = async () => {
    if (!staleData?.stale?.length) return;
    toast.info(`Re-indexation de ${staleData.count} ressources obsolètes...`);
    try {
      const result = await reindexStale.mutateAsync(staleData.stale);
      toast.success(`Re-indexation terminée : ${result.reindexed} OK, ${result.failed} erreurs`);
    } catch (error) {
      toast.error("Erreur lors de la re-indexation");
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

  const getFreshnessBadge = (lastIndexedAt: string | null) => {
    const freshness = getFreshnessStatus(lastIndexedAt);
    switch (freshness) {
      case 'fresh':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Frais</Badge>;
      case 'stale':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">À rafraîchir</Badge>;
      case 'outdated':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">Obsolète</Badge>;
      case 'never':
        return <Badge variant="outline" className="text-xs">Jamais indexé</Badge>;
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
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Sync
            </Button>
            {(staleData?.count || 0) > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline"
                      size="sm" 
                      onClick={handleReindexStale}
                      disabled={reindexStale.isPending}
                      className="border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
                    >
                      {reindexStale.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <AlertCircle className="h-4 w-4 mr-1" />
                      )}
                      {staleData?.count} obsolètes
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Re-indexer les ressources modifiées depuis leur dernière indexation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
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

        {/* Stale resources alert */}
        {(staleData?.count || 0) > 0 && (
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">{staleData?.count} ressources modifiées</span>
              <span className="text-muted-foreground">depuis leur dernière indexation</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {staleData?.stale.slice(0, 3).map(r => r.resource_title).join(", ")}
              {(staleData?.count || 0) > 3 && ` et ${(staleData?.count || 0) - 3} autres...`}
            </div>
          </div>
        )}

        {/* Per-type status with freshness indicators */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {status.map((s) => {
            const progress = s.total_resources > 0 
              ? (s.indexed_resources / s.total_resources) * 100 
              : 0;
            const isComplete = s.indexed_resources === s.total_resources && s.total_resources > 0;
            const freshness = getFreshnessStatus(s.last_indexed_at);
            
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
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{s.indexed_resources} / {s.total_resources}</span>
                  {getFreshnessBadge(s.last_indexed_at)}
                </div>
                {s.last_indexed_at && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(s.last_indexed_at), { addSuffix: true, locale: fr })}
                  </div>
                )}
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
          <ScrollArea className="h-64 -mx-2 px-2">
            <div className="space-y-2 pr-2">
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
          </ScrollArea>
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
            <ScrollArea className="h-[400px] -mx-2 px-2">
              <div className="space-y-2 pr-2">
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
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Dynamic Modules Overview Component - Fully Dynamic from Database
function DynamicModulesOverview() {
  const { data: stats, isLoading, refetch } = useAIAgentStats();

  // Tool icons mapping
  const toolIcons: Record<string, React.ReactNode> = {
    get_leads: <Users className="h-3 w-3" />,
    get_lead_detail: <Users className="h-3 w-3" />,
    get_opportunities: <Target className="h-3 w-3" />,
    get_projects: <Briefcase className="h-3 w-3" />,
    get_project_detail: <Briefcase className="h-3 w-3" />,
    get_tasks: <ClipboardList className="h-3 w-3" />,
    get_bookings: <Calendar className="h-3 w-3" />,
    get_booking_details: <Calendar className="h-3 w-3" />,
    get_booking_types: <Calendar className="h-3 w-3" />,
    get_agenda_summary: <Calendar className="h-3 w-3" />,
    get_transcriptions: <Mic className="h-3 w-3" />,
    get_meeting_notes: <FileText className="h-3 w-3" />,
    get_specifications: <FileSignature className="h-3 w-3" />,
    get_generated_documents: <FileCheck className="h-3 w-3" />,
    get_solution_leads: <Sparkles className="h-3 w-3" />,
    get_activity_log: <Activity className="h-3 w-3" />,
    get_pipeline_stats: <Activity className="h-3 w-3" />,
    get_pending_ai_notifications: <Bell className="h-3 w-3" />,
    mark_notifications_reviewed: <Bell className="h-3 w-3" />,
    create_booking: <Calendar className="h-3 w-3" />,
    cancel_booking: <Calendar className="h-3 w-3" />,
    create_lead: <Users className="h-3 w-3" />,
    update_lead: <Users className="h-3 w-3" />,
    send_email: <MessageSquare className="h-3 w-3" />,
    generate_followup_email: <MessageSquare className="h-3 w-3" />,
    create_opportunity: <Target className="h-3 w-3" />,
    update_opportunity: <Target className="h-3 w-3" />,
    create_project: <Briefcase className="h-3 w-3" />,
    update_project: <Briefcase className="h-3 w-3" />,
    create_task: <ClipboardList className="h-3 w-3" />,
    update_task: <ClipboardList className="h-3 w-3" />,
    complete_task: <ClipboardList className="h-3 w-3" />,
    create_meeting_note: <FileText className="h-3 w-3" />,
    add_activity_log: <Activity className="h-3 w-3" />,
    link_solution_to_lead: <Sparkles className="h-3 w-3" />,
    create_specification: <FileSignature className="h-3 w-3" />,
    update_specification: <FileSignature className="h-3 w-3" />,
    log_activity: <Activity className="h-3 w-3" />,
    search_knowledge_base: <Search className="h-3 w-3" />,
    suggest_solutions_for_lead: <Sparkles className="h-3 w-3" />,
    generate_document: <FileText className="h-3 w-3" />,
    generate_cdc: <FileSignature className="h-3 w-3" />,
    analyze_transcription: <Mic className="h-3 w-3" />,
    suggest_next_actions: <Sparkles className="h-3 w-3" />,
    synthesize_entity: <Brain className="h-3 w-3" />,
    // Orchestration tools
    get_stale_syntheses: <RefreshCw className="h-3 w-3" />,
    get_ai_dashboard_metrics: <Activity className="h-3 w-3" />,
    trigger_proactive_notification: <Bell className="h-3 w-3" />,
    // Admin tools
    get_articles: <FileText className="h-3 w-3" />,
    get_article_details: <FileText className="h-3 w-3" />,
    get_solutions: <Sparkles className="h-3 w-3" />,
    get_categories_tags: <Tag className="h-3 w-3" />,
    get_contacts: <Users className="h-3 w-3" />,
    get_newsletters: <FileText className="h-3 w-3" />,
    get_forms: <FileText className="h-3 w-3" />,
    get_form_responses: <FileText className="h-3 w-3" />,
    get_brochures: <FileText className="h-3 w-3" />,
    get_atelier_inscriptions: <Calendar className="h-3 w-3" />,
    get_partners: <Users className="h-3 w-3" />,
    get_uploaded_files: <FileCode className="h-3 w-3" />,
    create_article: <FileText className="h-3 w-3" />,
    update_article: <FileText className="h-3 w-3" />,
    publish_article: <FileText className="h-3 w-3" />,
    create_newsletter: <FileText className="h-3 w-3" />,
    send_newsletter: <FileText className="h-3 w-3" />,
    get_audit_logs: <Shield className="h-3 w-3" />,
    get_login_attempts: <Shield className="h-3 w-3" />,
  };

// Cockpit modules - hardcoded for reliability (synced with ui-navigation prompt)
  const cockpitModulesFromDB = [
    { name: "Dashboard", desc: "Vue d'ensemble CRM", path: "/cockpit" },
    { name: "Leads", desc: "Gestion des prospects", path: "/cockpit/leads" },
    { name: "Pipeline", desc: "Opportunités commerciales", path: "/cockpit/pipeline" },
    { name: "Projects", desc: "Gestion des projets", path: "/cockpit/projects" },
    { name: "Agenda", desc: "Rendez-vous et planning", path: "/cockpit/agenda" },
    { name: "Documents", desc: "Documents générés", path: "/cockpit/documents" },
    { name: "Transcriptions", desc: "Transcriptions vocales", path: "/cockpit/transcriptions" },
    { name: "Partenaires", desc: "Réseau partenaires", path: "/cockpit/partenaires" },
    { name: "Solutions", desc: "Détection solutions", path: "/cockpit/solutions" },
    { name: "Uploads", desc: "Fichiers uploadés", path: "/cockpit/uploads" },
    { name: "Chatbot", desc: "Agent conversationnel", path: "/cockpit/chatbot" },
    { name: "Analytics", desc: "Statistiques avancées", path: "/cockpit/analytics" },
  ];

  // Icon mapping for cockpit modules
  const moduleIconMap: Record<string, React.ReactNode> = {
    transcriptions: <Mic className="h-4 w-4" />,
    leads: <Users className="h-4 w-4" />,
    projects: <Briefcase className="h-4 w-4" />,
    solutions: <Sparkles className="h-4 w-4" />,
    pipeline: <Target className="h-4 w-4" />,
    agenda: <Calendar className="h-4 w-4" />,
    documents: <FileCheck className="h-4 w-4" />,
    dashboard: <Activity className="h-4 w-4" />,
    uploads: <FileCode className="h-4 w-4" />,
    chatbot: <Bot className="h-4 w-4" />,
    analytics: <Database className="h-4 w-4" />,
  };

  const getModuleIcon = (path: string) => {
    const key = path.split('/').pop()?.toLowerCase() || '';
    return moduleIconMap[key] || <Bot className="h-4 w-4" />;
  };

  const cockpitModules = cockpitModulesFromDB;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          <AlertCircle className="h-5 w-5 mr-2" />
          Impossible de charger les statistiques
        </CardContent>
      </Card>
    );
  }

  const allTools = [
    ...stats.tools.cockpit_read,
    ...stats.tools.cockpit_write,
    ...stats.tools.admin_read,
    ...stats.tools.admin_write,
    ...stats.tools.email,
    ...stats.tools.rag,
    ...(stats.tools.orchestration || []),
  ];

  return (
    <div className="space-y-4">
      {/* Agent Overview Stats - Dynamic */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Agent IA IArche v5.3 - Vue d'ensemble</CardTitle>
                <CardDescription>
                  Master Agent multi-outils avec exécution directe, RAG et mémoire persistante
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <a 
                href="/docs/CDC_AI_AGENT_REFONTE_V3.md" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <FileCode className="h-3 w-3" />
                CDC v3.0
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="p-3 rounded-lg bg-background border text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalTools}</p>
              <p className="text-xs text-muted-foreground">Outils Agent</p>
            </div>
            <div className="p-3 rounded-lg bg-background border text-center">
              <p className="text-2xl font-bold text-green-500">{stats.connectedEdgeFunctions}</p>
              <p className="text-xs text-muted-foreground">Connectées Agent</p>
            </div>
            <div className="p-3 rounded-lg bg-background border text-center">
              <p className="text-2xl font-bold text-blue-500">{stats.aiTables}</p>
              <p className="text-xs text-muted-foreground">Tables IA</p>
            </div>
            <div className="p-3 rounded-lg bg-background border text-center">
              <p className="text-2xl font-bold text-yellow-500">{stats.actionTools}</p>
              <p className="text-xs text-muted-foreground">Outils Actions</p>
            </div>
            <div className="p-3 rounded-lg bg-background border text-center">
              <p className="text-2xl font-bold text-purple-500">{stats.responseModes}</p>
              <p className="text-xs text-muted-foreground">Modes réponse</p>
            </div>
            <div className="p-3 rounded-lg bg-background border text-center">
              <p className="text-2xl font-bold text-orange-500">∞</p>
              <p className="text-xs text-muted-foreground">Exécution directe</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tools Catalog - Dynamic */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Catalogue des {stats.totalTools} Outils Agent
          </CardTitle>
          <CardDescription>
            Outils disponibles pour l'orchestrateur IA, classés par domaine (chargé dynamiquement)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cockpit Read Tools */}
          {stats.tools.cockpit_read.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 transition-colors">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">COCKPIT - Lecture</span>
                  <Badge variant="secondary" className="text-xs">{stats.tools.cockpit_read.length} outils</Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg">
                  {stats.tools.cockpit_read.map((tool) => (
                    <TooltipProvider key={tool.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 p-2 rounded bg-background/50 text-xs">
                            {toolIcons[tool.name] || <Wrench className="h-3 w-3" />}
                            <code className="font-mono truncate">{tool.name}</code>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{tool.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Cockpit Write Tools */}
          {stats.tools.cockpit_write.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/15 transition-colors">
                <div className="flex items-center gap-2">
                  <Edit className="h-4 w-4 text-green-500" />
                  <span className="font-medium">COCKPIT - Écriture/Actions</span>
                  <Badge variant="secondary" className="text-xs">{stats.tools.cockpit_write.length} outils</Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg">
                  {stats.tools.cockpit_write.map((tool) => (
                    <TooltipProvider key={tool.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 p-2 rounded text-xs bg-background/50">
                            {toolIcons[tool.name] || <Wrench className="h-3 w-3" />}
                            <code className="font-mono truncate">{tool.name}</code>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{tool.description}</p>
                          {tool.required_fields && tool.required_fields.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Requis: {tool.required_fields.join(', ')}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Email Tools */}
          {stats.tools.email.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/15 transition-colors">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">COCKPIT - Email</span>
                  <Badge variant="secondary" className="text-xs">{stats.tools.email.length} outils</Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg">
                  {stats.tools.email.map((tool) => (
                    <TooltipProvider key={tool.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 p-2 rounded bg-background/50 text-xs">
                            {toolIcons[tool.name] || <MessageSquare className="h-3 w-3" />}
                            <code className="font-mono truncate">{tool.name}</code>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{tool.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* RAG Tools */}
          {stats.tools.rag.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-red-500" />
                  <span className="font-medium">COCKPIT - IA/RAG</span>
                  <Badge variant="secondary" className="text-xs">{stats.tools.rag.length} outils</Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg">
                  {stats.tools.rag.map((tool) => (
                    <TooltipProvider key={tool.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 p-2 rounded bg-background/50 text-xs">
                            {toolIcons[tool.name] || <Search className="h-3 w-3" />}
                            <code className="font-mono truncate">{tool.name}</code>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{tool.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Admin Read Tools */}
          {stats.tools.admin_read.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/15 transition-colors">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">ADMIN - Contenu</span>
                  <Badge variant="secondary" className="text-xs">{stats.tools.admin_read.length} outils</Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg">
                  {stats.tools.admin_read.map((tool) => (
                    <TooltipProvider key={tool.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 p-2 rounded bg-background/50 text-xs">
                            {toolIcons[tool.name] || <FileText className="h-3 w-3" />}
                            <code className="font-mono truncate">{tool.name}</code>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{tool.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Admin Write Tools */}
          {stats.tools.admin_write.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-slate-500/10 border border-slate-500/20 hover:bg-slate-500/15 transition-colors">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-slate-500" />
                  <span className="font-medium">ADMIN - Système</span>
                  <Badge variant="secondary" className="text-xs">{stats.tools.admin_write.length} outils</Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg">
                  {stats.tools.admin_write.map((tool) => (
                    <TooltipProvider key={tool.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 p-2 rounded text-xs bg-background/50">
                            {toolIcons[tool.name] || <Settings className="h-3 w-3" />}
                            <code className="font-mono truncate">{tool.name}</code>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{tool.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Admin Security Tools */}
          {stats.tools.admin_security && stats.tools.admin_security.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15 transition-colors">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">ADMIN - Sécurité</span>
                  <Badge variant="secondary" className="text-xs">{stats.tools.admin_security.length} outils</Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg">
                  {stats.tools.admin_security.map((tool) => (
                    <TooltipProvider key={tool.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 p-2 rounded text-xs bg-background/50">
                            {toolIcons[tool.name] || <Shield className="h-3 w-3" />}
                            <code className="font-mono truncate">{tool.name}</code>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{tool.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Orchestration Tools */}
          {stats.tools.orchestration && stats.tools.orchestration.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/15 transition-colors">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-cyan-500" />
                  <span className="font-medium">Orchestration v5.3</span>
                  <Badge variant="secondary" className="text-xs">{stats.tools.orchestration.length} outils</Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg">
                  {stats.tools.orchestration.map((tool) => (
                    <TooltipProvider key={tool.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 p-2 rounded text-xs bg-background/50">
                            {toolIcons[tool.name] || <RefreshCw className="h-3 w-3" />}
                            <code className="font-mono truncate">{tool.name}</code>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{tool.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Edge Functions Card - Dynamic */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Edge Functions ({stats.totalEdgeFunctions} déployées)
          </CardTitle>
          <CardDescription>
            Fonctions backend déployées. {stats.connectedEdgeFunctions} sont connectées à l'agent IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connected to Agent */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/15 transition-colors">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="font-medium text-sm">Connectées à l'Agent ({stats.edgeFunctions.connected.length})</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {stats.edgeFunctions.connected.map((fn) => (
                  <div key={fn.name} className="flex items-start p-2 rounded bg-background/50 border border-green-500/20">
                    <div className="flex-1 min-w-0">
                      <code className="text-xs font-mono text-green-600">{fn.name}</code>
                      <p className="text-xs text-muted-foreground truncate">{fn.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Other Edge Functions */}
          {stats.edgeFunctions.other.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg bg-muted/50 border hover:bg-muted/70 transition-colors">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Autres fonctions ({stats.edgeFunctions.other.length})</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {stats.edgeFunctions.other.map((fn) => (
                    <div key={fn.name} className="p-1.5 rounded bg-muted/30 border">
                      <code className="text-xs font-mono text-muted-foreground">{fn.name}</code>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Execution Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Mode d'exécution
          </CardTitle>
          <CardDescription>
            L'agent exécute directement les actions sans demander de validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-500 text-white">Lecture</Badge>
                <span className="font-medium">Consultation</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Statistiques, recherche RAG, consultation données. Résultats immédiats.
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-green-500/5 border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-500 text-white">Action</Badge>
                <span className="font-medium">Exécution directe</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Création RDV, leads, emails, tâches. Exécution immédiate sans confirmation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules Cockpit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modules Cockpit intégrés</CardTitle>
          <CardDescription>
            Tous ces modules invoquent l'agent via <code className="text-xs bg-muted px-1 rounded">ai-agent-orchestrator</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cockpitModules.map((module) => (
              <div 
                key={module.name}
                className="p-3 rounded-lg bg-muted/50 border flex items-start gap-3"
              >
                <div className="p-1.5 rounded bg-primary/10 text-primary">
                  {getModuleIcon(module.path)}
                </div>
                <div>
                  <p className="font-medium text-sm">{module.name}</p>
                  <p className="text-xs text-muted-foreground">{module.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Database Tables - Dynamic */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Tables IA dédiées ({stats.aiTablesList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {stats.aiTablesList.map((table) => (
              <div key={table.name} className="p-3 rounded-lg bg-muted/30 border">
                <code className="text-xs font-mono text-primary">{table.name}</code>
                <p className="text-xs text-muted-foreground mt-1">{table.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Document Generation Configuration Component
function DocumentGenerationConfig() {
  const queryClient = useQueryClient();
  const { models: llmModels, byProvider } = useLLMModelsGrouped();
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editUserPrompt, setEditUserPrompt] = useState("");

  // Fetch all document prompts FIRST
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

  // Fetch other specialized prompts (transcription, email, etc.)
  const { data: specializedPrompts } = useQuery({
    queryKey: ['specialized-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .neq('category', 'document_generation')
        .neq('slug', 'master-agent')
        .not('slug', 'in', '(ui-navigation,tools-reference)');
      if (error) throw error;
      return data || [];
    }
  });
  
  // Document type icon mapping (dynamic from db slug)
  const docTypeIcons: Record<string, React.ReactNode> = {
    document_generation_quote: <FileSignature className="h-4 w-4" />,
    document_generation_spec: <FileCheck className="h-4 w-4" />,
    document_generation_proposal: <Briefcase className="h-4 w-4" />,
    document_generation_email: <MessageSquare className="h-4 w-4" />,
    document_generation_report: <FileText className="h-4 w-4" />,
  };
  
  const docTypeNames: Record<string, string> = {
    document_generation_quote: 'Devis',
    document_generation_spec: 'Cahier des charges',
    document_generation_proposal: 'Proposition commerciale',
    document_generation_email: 'Email commercial',
    document_generation_report: 'Rapport',
  };

  // Build DOCUMENT_TYPES dynamically from docPrompts
  const DOCUMENT_TYPES = useMemo(() => {
    if (!docPrompts || docPrompts.length === 0) {
      // Fallback to default types if no prompts exist yet
      return [
        { slug: 'document_generation_quote', name: 'Devis', icon: <FileSignature className="h-4 w-4" />, type: 'quote' },
        { slug: 'document_generation_spec', name: 'Cahier des charges', icon: <FileCheck className="h-4 w-4" />, type: 'spec' },
        { slug: 'document_generation_proposal', name: 'Proposition commerciale', icon: <Briefcase className="h-4 w-4" />, type: 'proposal' },
      ];
    }
    return docPrompts.map(p => ({
      slug: p.slug,
      name: docTypeNames[p.slug] || p.name,
      icon: docTypeIcons[p.slug] || <FileText className="h-4 w-4" />,
      type: p.slug.replace('document_generation_', ''),
    }));
  }, [docPrompts]);

  const updatePromptMutation = useMutation({
    mutationFn: async ({ slug, updates }: { slug: string; updates: Record<string, unknown> }) => {
      const allPrompts = [...(docPrompts || []), ...(specializedPrompts || [])];
      const existingPrompt = allPrompts.find(p => p.slug === slug);
      
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
      queryClient.invalidateQueries({ queryKey: ['specialized-prompts'] });
      toast.success("Prompt mis à jour");
      setEditingPrompt(null);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    }
  });

  const getPromptConfig = (slug: string) => {
    const allPrompts = [...(docPrompts || []), ...(specializedPrompts || [])];
    const prompt = allPrompts.find(p => p.slug === slug);
    const config = prompt?.model_config as { model?: string; provider?: string } || {};
    return {
      prompt,
      model: config.model || 'google/gemini-2.5-flash',
      provider: config.provider || 'lovable',
    };
  };

  const handleModelChange = (slug: string, modelId: string) => {
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

  const handleEditPrompt = (slug: string) => {
    const config = getPromptConfig(slug);
    setEditContent(config.prompt?.system_prompt || "");
    setEditUserPrompt(config.prompt?.user_prompt || "");
    setEditingPrompt(slug);
  };

  const handleSavePrompt = () => {
    if (!editingPrompt) return;
    updatePromptMutation.mutate({
      slug: editingPrompt,
      updates: { 
        system_prompt: editContent,
        user_prompt: editUserPrompt || null
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
      {/* Document Generation Prompts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Génération de Documents
          </CardTitle>
          <CardDescription>
            Prompts spécialisés pour la génération de devis, CDC et propositions. Référencés par l'agent principal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {DOCUMENT_TYPES.map((docType) => {
            const config = getPromptConfig(docType.slug);
            const selectedModel = llmModels.find(m => m.model_id === config.model);
            const isEditing = editingPrompt === docType.slug;
            
            return (
              <div key={docType.slug} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {docType.icon}
                    <h3 className="font-medium">{docType.name}</h3>
                    {config.prompt && (
                      <Badge variant="outline" className="text-xs">
                        {config.provider}
                      </Badge>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => isEditing ? setEditingPrompt(null) : handleEditPrompt(docType.slug)}
                  >
                    {isEditing ? "Fermer" : "Éditer prompt"}
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Modèle LLM</Label>
                    <Select 
                      value={selectedModel?.id || ""} 
                      onValueChange={(modelId) => handleModelChange(docType.slug, modelId)}
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

                {isEditing && (
                  <div className="space-y-4 pt-3 border-t">
                    <div className="space-y-2">
                      <Label>Prompt système (principal)</Label>
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[200px] font-mono text-sm"
                        placeholder="Prompt système pour ce type de document..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>User Prompt (template secondaire)</Label>
                      <Textarea
                        value={editUserPrompt}
                        onChange={(e) => setEditUserPrompt(e.target.value)}
                        className="min-h-[60px] font-mono text-sm"
                        placeholder="Instructions contextuelles pour la génération..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Ce prompt est envoyé avec le contexte (projet, client, etc.) lors de la génération.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingPrompt(null)}>
                        Annuler
                      </Button>
                      <Button size="sm" onClick={handleSavePrompt} disabled={updatePromptMutation.isPending}>
                        {updatePromptMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Sauvegarder
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Other Specialized Prompts - Grouped by category */}
      {specializedPrompts && specializedPrompts.length > 0 && (
        <>
          {/* Group prompts by category */}
          {Object.entries(
            specializedPrompts.reduce((acc, prompt) => {
              const cat = prompt.category || 'other';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(prompt);
              return acc;
            }, {} as Record<string, typeof specializedPrompts>)
          ).map(([category, prompts]) => {
            const categoryInfo: Record<string, { icon: React.ReactNode; label: string; description: string }> = {
              transcription: { 
                icon: <Mic className="h-5 w-5" />, 
                label: 'Transcription Audio', 
                description: 'Analyse et structuration des transcriptions audio/vidéo selon le contexte (RDV, projet, support)'
              },
              cockpit: { 
                icon: <BarChart3 className="h-5 w-5" />, 
                label: 'Cockpit CRM', 
                description: 'Analyse, scoring, matching, OCR et génération de contenu commercial'
              },
              assistant: { 
                icon: <Bot className="h-5 w-5" />, 
                label: 'Assistant Conversationnel', 
                description: 'Configuration du chatbot assistant IA'
              },
              content: { 
                icon: <FileText className="h-5 w-5" />, 
                label: 'Contenu & SEO', 
                description: 'Génération d\'articles, FAQ, tags et enrichissement SEO'
              },
              security: { 
                icon: <Shield className="h-5 w-5" />, 
                label: 'Sécurité', 
                description: 'Détection d\'anomalies et analyse de sécurité'
              },
            };
            const info = categoryInfo[category] || { icon: <Settings className="h-5 w-5" />, label: category, description: '' };
            
            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {info.icon}
                    {info.label}
                  </CardTitle>
                  <CardDescription>{info.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {prompts.map((prompt) => {
                    const config = getPromptConfig(prompt.slug);
                    const selectedModel = llmModels.find(m => m.model_id === config.model);
                    const isEditing = editingPrompt === prompt.slug;
                    
                    return (
                      <div key={prompt.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-medium">{prompt.name}</h3>
                            <Badge variant="outline" className="text-xs">{config.provider}</Badge>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => isEditing ? setEditingPrompt(null) : handleEditPrompt(prompt.slug)}
                          >
                            {isEditing ? "Fermer" : "Éditer"}
                          </Button>
                        </div>
                        
                        {/* LLM Model Selector - Always visible */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Modèle LLM</Label>
                            <Select 
                              value={selectedModel?.id || ""} 
                              onValueChange={(modelId) => handleModelChange(prompt.slug, modelId)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un modèle">
                                  {selectedModel?.display_name || config.model || "Sélectionner..."}
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
                                              {model.category} • {model.cost_tier}
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
                            <Label className="text-sm text-muted-foreground">User Prompt (template)</Label>
                            <p className="text-xs text-muted-foreground truncate">
                              {prompt.user_prompt ? prompt.user_prompt.substring(0, 60) + '...' : 'Non défini'}
                            </p>
                          </div>
                        </div>
                        
                        {isEditing && (
                          <div className="space-y-4 pt-3 border-t">
                            <div className="space-y-2">
                              <Label>Prompt système (principal)</Label>
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[150px] font-mono text-sm"
                                placeholder="Instructions système pour ce cas d'usage..."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>User Prompt (template secondaire)</Label>
                              <Textarea
                                value={editUserPrompt}
                                onChange={(e) => setEditUserPrompt(e.target.value)}
                                className="min-h-[80px] font-mono text-sm"
                                placeholder="Template avec variables {{variable}}..."
                              />
                              <p className="text-xs text-muted-foreground">
                                Variables disponibles : {"{{content}}"}, {"{{context}}"}, {"{{lead}}"}, {"{{project}}"}, etc.
                              </p>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setEditingPrompt(null)}>
                                Annuler
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={handleSavePrompt}
                                disabled={updatePromptMutation.isPending}
                              >
                                {updatePromptMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Sauvegarder
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

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
          <TabsList className="flex-wrap">
            <TabsTrigger value="diagnostic">Diagnostic</TabsTrigger>
            <TabsTrigger value="orchestrator">Orchestrateur</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="documents">Prompts Secondaires</TabsTrigger>
            <TabsTrigger value="rag">Base RAG</TabsTrigger>
            <TabsTrigger value="dictionary">Dictionnaire</TabsTrigger>
            <TabsTrigger value="memory">Mémoire IA</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
          </TabsList>

          <TabsContent value="diagnostic" className="space-y-4">
            <AIHealthDashboard />
          </TabsContent>

          <TabsContent value="orchestrator" className="space-y-4">
            <OrchestratorConfig />
          </TabsContent>

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

            {/* System Prompts - 3 Blocs Composés */}
            <PromptAccordions 
              masterPrompt={systemPrompt}
              onMasterChange={handlePromptChange}
            />
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

          <TabsContent value="dictionary" className="space-y-4">
            <KeywordDictionary />
          </TabsContent>

          <TabsContent value="memory" className="space-y-4">
            <AIMemoryManager />
          </TabsContent>

          <TabsContent value="modules" className="space-y-4">
            <DynamicModulesOverview />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
