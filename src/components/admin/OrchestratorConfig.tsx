import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Bot, Loader2, Wrench, Zap, Search, ChevronDown, ChevronRight,
  Database, FileText, Users, Calendar, ClipboardList, Mic, 
  FileCode, Settings, ExternalLink, RefreshCw, Copy, Eye,
  BrainCircuit, Activity, Bell, Shield, Sparkles, Target
} from "lucide-react";

// Définition des outils de l'orchestrateur - synchronisé avec l'edge function v6.22
const ORCHESTRATOR_TOOLS = {
  "Lecture Cockpit": [
    { name: "get_leads", description: "Récupère la liste des leads avec filtrage optionnel", icon: Users },
    { name: "get_opportunities", description: "Récupère les opportunités du pipeline commercial", icon: Target },
    { name: "get_projects", description: "Récupère les projets en cours", icon: ClipboardList },
    { name: "get_tasks", description: "Récupère les tâches", icon: ClipboardList },
    { name: "get_transcriptions", description: "Récupère les transcriptions vocales", icon: Mic },
    { name: "get_meeting_notes", description: "Récupère les comptes-rendus de réunion", icon: FileText },
    { name: "get_specifications", description: "Récupère les cahiers des charges", icon: FileCode },
    { name: "get_generated_documents", description: "Récupère les documents générés", icon: FileText },
    { name: "get_solution_leads", description: "Récupère les leads intéressés par des solutions", icon: Users },
    { name: "get_activity_log", description: "Récupère l'historique des activités", icon: Activity },
    { name: "get_pipeline_stats", description: "Statistiques du pipeline", icon: Activity },
    { name: "get_pending_ai_notifications", description: "Notifications IA non lues", icon: Bell },
    { name: "mark_notifications_reviewed", description: "Marquer notifications comme lues", icon: Bell },
  ],
  "Lecture Admin": [
    { name: "get_articles", description: "Récupère les articles/contenus publiés", icon: FileText },
    { name: "get_article_details", description: "Détails complets d'un article", icon: FileText },
    { name: "get_solutions", description: "Récupère les solutions IArche", icon: Sparkles },
    { name: "get_categories_tags", description: "Catégories et tags disponibles", icon: Settings },
    { name: "get_contacts", description: "Messages de contact reçus", icon: Users },
    { name: "get_newsletters", description: "Newsletters et abonnés", icon: FileText },
    { name: "get_forms", description: "Formulaires et statistiques", icon: FileText },
    { name: "get_form_responses", description: "Réponses à un formulaire", icon: FileText },
    { name: "get_brochures", description: "Brochures marketing", icon: FileText },
    { name: "get_atelier_inscriptions", description: "Inscriptions aux ateliers", icon: Calendar },
    { name: "get_bookings", description: "RDV calendrier", icon: Calendar },
    { name: "get_booking_details", description: "Détails complets d'un RDV", icon: Calendar },
    { name: "get_agenda_summary", description: "Résumé agenda (today, week, month)", icon: Calendar },
    { name: "get_comments", description: "Commentaires sur articles", icon: FileText },
    { name: "get_cta_analytics", description: "Statistiques clics CTA", icon: Activity },
  ],
  "Partenaires (v5.4)": [
    { name: "get_partners", description: "Liste des partenaires (experts IA, indépendants, apporteurs)", icon: Users },
    { name: "search_partners", description: "Rechercher un partenaire par nom/email", icon: Search },
    { name: "create_partner", description: "Créer un nouveau partenaire", icon: Users },
    { name: "update_partner", description: "Mettre à jour un partenaire", icon: Users },
  ],
  "Écriture Cockpit": [
    { name: "create_lead", description: "Créer un nouveau lead", icon: Users },
    { name: "update_lead", description: "Mettre à jour un lead", icon: Users },
    { name: "update_lead_qualification", description: "Changer qualification lead", icon: Users },
    { name: "create_opportunity", description: "Créer une opportunité", icon: Target },
    { name: "update_opportunity_stage", description: "Changer stage opportunité", icon: Target },
    { name: "create_project", description: "Créer un projet", icon: ClipboardList },
    { name: "create_task", description: "Créer une tâche", icon: ClipboardList },
    { name: "create_meeting_note", description: "Créer un compte-rendu", icon: FileText },
    { name: "log_activity", description: "Enregistrer une activité", icon: Activity },
    { name: "link_solution_to_lead", description: "Lier solution à lead", icon: Sparkles },
  ],
  "Écriture Admin": [
    { name: "create_booking", description: "Créer un RDV complet (Zoom + calendrier)", icon: Calendar },
    { name: "cancel_booking", description: "Annuler un RDV", icon: Calendar },
    { name: "reschedule_booking", description: "Reprogrammer un RDV", icon: Calendar },
    { name: "send_email", description: "Envoyer un email via Resend", icon: FileText },
    { name: "draft_followup_email", description: "Générer brouillon email suivi", icon: FileText },
    { name: "suggest_booking_action", description: "Suggérer action sur RDV", icon: Calendar },
    { name: "draft_article_content", description: "Générer brouillon article", icon: FileText },
    { name: "suggest_article_improvements", description: "Suggérer améliorations article", icon: FileText },
    { name: "draft_newsletter", description: "Générer brouillon newsletter", icon: FileText },
  ],
  "IA & RAG": [
    { name: "search_knowledge_base", description: "Recherche sémantique RAG", icon: Search },
    { name: "generate_document", description: "Générer un document IA (devis, CDC, proposition)", icon: FileText },
    { name: "enrich_seo", description: "Enrichir contenu HTML avec balises SEO", icon: Sparkles },
    { name: "generate_faq", description: "Générer FAQ automatique", icon: FileText },
    { name: "send_newsletter", description: "Envoyer newsletter pour un article", icon: FileText },
    { name: "suggest_tags", description: "Suggérer tags pertinents", icon: Sparkles },
    { name: "suggest_solutions_for_lead", description: "Identifier solutions pour un lead", icon: Sparkles },
  ],
  "Mémoire Persistante (v5.2)": [
    { name: "get_lead_familiarity", description: "Score de familiarité d'un lead", icon: BrainCircuit },
    { name: "update_lead_familiarity", description: "Recalculer score familiarité", icon: BrainCircuit },
    { name: "get_entity_references", description: "Références croisées entre entités", icon: BrainCircuit },
    { name: "create_entity_reference", description: "Créer référence croisée", icon: BrainCircuit },
  ],
  "Orchestration v5.3": [
    { name: "get_stale_syntheses", description: "Entités nécessitant mise à jour synthèse", icon: RefreshCw },
    { name: "get_ai_dashboard_metrics", description: "Métriques système temps réel", icon: Activity },
    { name: "trigger_proactive_notification", description: "Notification Telegram proactive", icon: Bell },
  ],
  "Telegram v3 (v6.22)": [
    { name: "telegram_inline_buttons", description: "Boutons de réponse rapide contextuels après actions", icon: Zap },
    { name: "telegram_stats", description: "Tracking des messages, temps de réponse, erreurs", icon: Activity },
    { name: "telegram_image_upload", description: "Import images/photos vers cockpit-uploads", icon: FileText },
    { name: "telegram_document_upload", description: "Import PDF/documents vers cockpit-uploads", icon: FileText },
    { name: "telegram_contextual_linking", description: "Liaison auto audio → lead/projet via caption", icon: BrainCircuit },
    { name: "telegram_reminder", description: "Commande /rappel avec parsing date/heure", icon: Calendar },
  ],
};

// Paramètres de configuration de l'orchestrateur
const ORCHESTRATOR_CONFIG = {
  endpoint: "ai-agent-orchestrator",
  gateway: "https://ai.gateway.lovable.dev/v1/chat/completions",
  defaultModel: "google/gemini-2.5-flash",
  fallbackModel: "google/gemini-2.5-flash-lite",
  maxTokens: 4096,
  temperature: 0.7,
  memoryEnabled: true,
  memoryTTL: "30 jours",
  ragEnabled: true,
  dictionaryEnabled: true,
  toolLoggingEnabled: true,
};

function ToolCard({ tool }: { tool: { name: string; description: string; icon: React.ComponentType<{ className?: string }> } }) {
  const Icon = tool.icon;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <code className="text-sm font-mono text-primary">{tool.name}</code>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tool.description}</p>
      </div>
    </div>
  );
}

function ToolCategory({ category, tools, defaultOpen = false }: { 
  category: string; 
  tools: { name: string; description: string; icon: React.ComponentType<{ className?: string }> }[];
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="font-medium">{category}</span>
          <Badge variant="secondary" className="text-xs">{tools.length}</Badge>
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.name} tool={tool} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function OrchestratorConfig() {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Récupérer les prompts liés à l'orchestrateur (avec gouverneur en premier)
  const { data: orchestratorPrompts, isLoading } = useQuery({
    queryKey: ['orchestrator-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .in('slug', ['orchestrator-governor', 'master-agent', 'ui-navigation', 'tools-reference']);
      
      if (error) throw error;
      
      // Trier selon la hiérarchie : governor → master → ui-navigation → tools-reference
      const order = ['orchestrator-governor', 'master-agent', 'ui-navigation', 'tools-reference'];
      return data?.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug)) || [];
    }
  });

  // Récupérer les statistiques de l'orchestrateur
  const { data: orchestratorStats } = useQuery({
    queryKey: ['orchestrator-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agent_memory')
        .select('memory_type', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      if (error) return { calls24h: 0, memoryEntries: 0 };
      return { calls24h: data?.length || 0, memoryEntries: data?.length || 0 };
    }
  });

  // Filtrer les outils par recherche
  const filteredTools = Object.entries(ORCHESTRATOR_TOOLS).reduce((acc, [category, tools]) => {
    if (!searchQuery) {
      acc[category] = tools;
    } else {
      const filtered = tools.filter(tool => 
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
    }
    return acc;
  }, {} as typeof ORCHESTRATOR_TOOLS);

  const totalTools = Object.values(ORCHESTRATOR_TOOLS).flat().length;
  const filteredCount = Object.values(filteredTools).flat().length;

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${ORCHESTRATOR_CONFIG.endpoint}`);
    toast.success("URL copiée dans le presse-papier");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalTools}</p>
                <p className="text-xs text-muted-foreground">Outils disponibles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{orchestratorStats?.calls24h || 0}</p>
                <p className="text-xs text-muted-foreground">Mémoires 24h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{orchestratorPrompts?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Prompts système</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">v6.22</p>
                <p className="text-xs text-muted-foreground">Version orchestrateur</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tools" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tools">Outils ({totalTools})</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="prompts">Prompts Liés</TabsTrigger>
        </TabsList>

        {/* Outils */}
        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Catalogue des Outils Agent
              </CardTitle>
              <CardDescription>
                {totalTools} outils disponibles pour l'orchestrateur IA. Ces outils permettent à l'agent d'interagir avec le CRM, le contenu Admin et les modules IA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un outil..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                {searchQuery && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {filteredCount} résultats
                  </span>
                )}
              </div>

              {/* Tool Categories */}
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {Object.entries(filteredTools).map(([category, tools], index) => (
                    <ToolCategory 
                      key={category} 
                      category={category} 
                      tools={tools} 
                      defaultOpen={index === 0}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Paramètres de l'Orchestrateur
              </CardTitle>
            <CardDescription>
                Configuration technique de l'agent IA IArche v6.22 avec Telegram v3, partenaires et logging enrichi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Endpoint */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Edge Function</label>
                  <div className="flex gap-2">
                    <Input 
                      value={ORCHESTRATOR_CONFIG.endpoint} 
                      readOnly 
                      className="font-mono text-sm bg-muted"
                    />
                    <Button variant="outline" size="icon" onClick={handleCopyEndpoint}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Gateway */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">AI Gateway</label>
                  <Input 
                    value={ORCHESTRATOR_CONFIG.gateway} 
                    readOnly 
                    className="font-mono text-sm bg-muted"
                  />
                </div>

                {/* Model */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Modèle par défaut</label>
                  <Input 
                    value={ORCHESTRATOR_CONFIG.defaultModel} 
                    readOnly 
                    className="font-mono text-sm bg-muted"
                  />
                </div>

                {/* Max Tokens */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Tokens</label>
                  <Input 
                    value={ORCHESTRATOR_CONFIG.maxTokens.toString()} 
                    readOnly 
                    className="font-mono text-sm bg-muted"
                  />
                </div>
              </div>

              {/* Feature Flags */}
              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-medium">Modules Actifs</label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={ORCHESTRATOR_CONFIG.memoryEnabled ? "default" : "secondary"}>
                    <BrainCircuit className="h-3 w-3 mr-1" />
                    Mémoire IA
                  </Badge>
                  <Badge variant={ORCHESTRATOR_CONFIG.ragEnabled ? "default" : "secondary"}>
                    <Database className="h-3 w-3 mr-1" />
                    RAG
                  </Badge>
                  <Badge variant={ORCHESTRATOR_CONFIG.dictionaryEnabled ? "default" : "secondary"}>
                    <FileText className="h-3 w-3 mr-1" />
                    Dictionnaire
                  </Badge>
                  <Badge variant="default">
                    <Shield className="h-3 w-3 mr-1" />
                    Auth MFA
                  </Badge>
                  <Badge variant="default">
                    <Bell className="h-3 w-3 mr-1" />
                    Notifications
                  </Badge>
                </div>
              </div>

              {/* Architecture */}
              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-medium">Architecture</label>
                <div className="bg-muted p-4 rounded-lg font-mono text-xs space-y-1">
                  <p>📡 Canaux : Telegram Bot, Cockpit Chat, API interne</p>
                  <p>🧠 Prompts : governor → master-agent → ui-navigation → tools-reference</p>
                  <p>🔧 Outils : {totalTools} fonctions (CRUD + IA + RAG)</p>
                  <p>📊 Tables : 69 tables Supabase</p>
                  <p>⚡ Edge Functions : 45 fonctions déployées</p>
                  <p>🔐 Secrets : 24 configurés</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompts Liés */}
        <TabsContent value="prompts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Prompts Système de l'Orchestrateur
              </CardTitle>
              <CardDescription>
                Les 4 prompts hiérarchiques qui composent le contexte de l'agent IA (Niveau 0 → Niveau 3)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {orchestratorPrompts?.map((prompt, index) => {
                const isGovernor = prompt.slug === 'orchestrator-governor';
                const levelLabels: Record<string, string> = {
                  'orchestrator-governor': 'Niveau 0 - Gouverneur',
                  'master-agent': 'Niveau 1 - Identité',
                  'ui-navigation': 'Niveau 2 - Navigation',
                  'tools-reference': 'Niveau 3 - Outils'
                };
                return (
                <Collapsible key={prompt.id} defaultOpen={isGovernor}>
                  <CollapsibleTrigger className={`flex items-center justify-between w-full p-4 rounded-lg border hover:bg-muted/50 transition-colors ${isGovernor ? 'border-primary bg-primary/5' : ''}`}>
                    <div className="flex items-center gap-3">
                      {isGovernor ? (
                        <Shield className="h-5 w-5 text-primary" />
                      ) : (
                        <Bot className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{prompt.name}</p>
                          {isGovernor && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                              Hiérarchie Supérieure
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">{levelLabels[prompt.slug] || ''}</span> • slug: <code className="bg-muted px-1 rounded">{prompt.slug}</code>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        ~{Math.ceil(prompt.system_prompt.length / 4)} tokens
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        v{prompt.version}
                      </Badge>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 p-4 bg-muted/50 rounded-lg">
                      <ScrollArea className="h-[300px]">
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {prompt.system_prompt}
                        </pre>
                      </ScrollArea>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <span className="text-xs text-muted-foreground">
                          Mis à jour : {new Date(prompt.updated_at).toLocaleDateString('fr-FR')}
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(prompt.system_prompt);
                            toast.success("Prompt copié");
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copier
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                );
              })}

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Pour éditer ces prompts, utilisez l'onglet <strong>Configuration</strong> de cette page.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
