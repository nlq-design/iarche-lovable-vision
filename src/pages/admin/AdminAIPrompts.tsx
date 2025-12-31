import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Bot, Loader2, RotateCcw } from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";

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

export default function AdminAIPrompts() {
  const queryClient = useQueryClient();
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [hasChanges, setHasChanges] = useState(false);

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
    }
  }, [masterPrompt]);

  const saveMutation = useMutation({
    mutationFn: async (prompt: string) => {
      if (masterPrompt) {
        const { error } = await supabase
          .from('ai_prompts')
          .update({ 
            system_prompt: prompt,
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
            model_config: { model: "openai/gpt-5", temperature: 0.7 }
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-ai-prompt'] });
      setHasChanges(false);
      toast.success("Prompt système sauvegardé");
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

  const handleSave = () => {
    saveMutation.mutate(systemPrompt);
  };

  const handleReset = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    setHasChanges(true);
  };

  if (isLoading) {
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Assistant IA</h1>
              <p className="text-muted-foreground">
                Prompt système unique pour tous les modules du Cockpit (GPT)
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
              className="min-h-[450px] font-mono text-sm"
            />
            <div className="flex justify-between items-center mt-3">
              <p className="text-xs text-muted-foreground">
                {systemPrompt.length} caractères
              </p>
              <p className="text-xs text-muted-foreground">
                Modèle: <span className="font-medium">GPT-5</span>
              </p>
            </div>
          </CardContent>
        </Card>

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
