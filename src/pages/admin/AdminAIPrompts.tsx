import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Bot, Loader2, RotateCcw, Cpu, Zap, Sparkles, Brain } from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { useLLMModelsGrouped } from "@/hooks/cockpit/useCockpitVoiceTranscriptions";

const DEFAULT_SYSTEM_PROMPT = `Tu es l'assistant IA d'IArche, un conseiller expert en gestion commerciale et projet.

Ton rôle est d'accompagner l'équipe dans :
- L'analyse et la qualification des leads
- Le suivi des opportunités commerciales
- La gestion des projets clients
- La rédaction de comptes-rendus de réunion
- La synthèse de transcriptions audio
- Les recommandations stratégiques

Règles de comportement :
- Sois concis et actionnable
- Privilégie les listes et structures claires
- Identifie les points d'attention et risques
- Propose des actions concrètes avec priorités
- Adapte ton niveau de détail au contexte

Format de sortie pour les transcriptions :
- Résumé exécutif (3-5 lignes)
- Points clés discutés
- Décisions prises
- Actions à mener (avec responsable si identifiable)
- Prochaines étapes`;

const MASTER_PROMPT_SLUG = "cockpit-master-assistant";

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

export default function AdminAIPrompts() {
  const queryClient = useQueryClient();
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  
  const { models: llmModels, grouped, isLoading: modelsLoading } = useLLMModelsGrouped();

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
      if (config?.llm_model_id) {
        setSelectedModelId(config.llm_model_id);
      }
    }
  }, [masterPrompt]);

  // Set default model when models load and no model is selected
  useEffect(() => {
    if (llmModels.length > 0 && !selectedModelId) {
      const defaultModel = llmModels.find(m => m.model_id === 'google/gemini-2.5-flash');
      if (defaultModel) {
        setSelectedModelId(defaultModel.id);
      }
    }
  }, [llmModels, selectedModelId]);

  const saveMutation = useMutation({
    mutationFn: async ({ prompt, modelId }: { prompt: string; modelId: string }) => {
      const modelConfig = { 
        temperature: 0.7,
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
            name: "Assistant Cockpit",
            slug: MASTER_PROMPT_SLUG,
            category: "assistant",
            system_prompt: prompt,
            model_config: modelConfig
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-ai-prompt'] });
      setHasChanges(false);
      toast.success("Configuration IA sauvegardée");
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
                Configuration globale pour tous les modules du Cockpit
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

        {/* Modules Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modules utilisant cet assistant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: "Transcriptions", desc: "Synthèse audio" },
                { name: "Leads", desc: "Qualification & scoring" },
                { name: "Projets", desc: "Suivi & recommandations" },
                { name: "Solutions", desc: "Analyse commerciale" },
                { name: "Comptes-rendus", desc: "Résumés de réunion" },
                { name: "Pipeline", desc: "Insights opportunités" },
                { name: "Agenda", desc: "Préparation RDV" },
                { name: "Documents", desc: "Analyse CDC" }
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
      </div>
    </AdminLayout>
  );
}