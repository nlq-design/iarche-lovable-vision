import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Settings2, Search, Loader2, Check, X, Zap, Cpu, Brain, Sparkles,
  DollarSign, MessageSquare
} from "lucide-react";

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing_prompt: number;
  pricing_completion: number;
  modality: string;
  provider: string;
}

interface FunctionConfig {
  id: string;
  function_name: string;
  provider_name: string;
  model_id: string | null;
  is_custom_model: boolean;
}

interface Props {
  functionName: string;
  currentProvider: string;
  onConfigUpdate?: () => void;
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  lovable_ai: <Sparkles className="h-4 w-4 text-purple-500" />,
  openai: <Cpu className="h-4 w-4 text-green-500" />,
  anthropic: <Brain className="h-4 w-4 text-orange-500" />,
  openrouter: <Zap className="h-4 w-4 text-blue-500" />,
};

const PROVIDER_LABELS: Record<string, string> = {
  lovable_ai: "Lovable AI",
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
};

// Default models per provider
const DEFAULT_MODELS: Record<string, { id: string; name: string }[]> = {
  lovable_ai: [
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash Preview" },
    { id: "openai/gpt-5-mini", name: "GPT-5 Mini" },
    { id: "openai/gpt-5", name: "GPT-5" },
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
    { id: "text-embedding-3-small", name: "Embedding 3 Small" },
    { id: "text-embedding-3-large", name: "Embedding 3 Large" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
  ],
};

export default function FunctionModelSelector({ functionName, currentProvider, onConfigUpdate }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState(currentProvider);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Fetch current configuration
  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ["function-model-config", functionName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edge_function_model_config")
        .select("*")
        .eq("function_name", functionName)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data as FunctionConfig | null;
    },
  });

  // Fetch OpenRouter models when provider is openrouter
  const { data: openRouterData, isLoading: loadingOpenRouter } = useQuery({
    queryKey: ["openrouter-models"],
    queryFn: async () => {
      const response = await supabase.functions.invoke("fetch-openrouter-models");
      if (response.error) throw response.error;
      return response.data as { 
        models: OpenRouterModel[]; 
        grouped: Record<string, OpenRouterModel[]>;
        providers: string[];
      };
    },
    enabled: selectedProvider === "openrouter",
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Initialize selected values from config
  useEffect(() => {
    if (config) {
      setSelectedProvider(config.provider_name);
      setSelectedModel(config.model_id);
    }
  }, [config]);

  // Save configuration
  const saveMutation = useMutation({
    mutationFn: async ({ provider, model }: { provider: string; model: string | null }) => {
      const isCustom = provider === "openrouter" && !!model;
      
      const { error } = await supabase
        .from("edge_function_model_config")
        .upsert({
          function_name: functionName,
          provider_name: provider,
          model_id: model,
          is_custom_model: isCustom,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "function_name",
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["function-model-config", functionName] });
      queryClient.invalidateQueries({ queryKey: ["function-model-configs"] });
      toast.success(`Configuration de ${functionName} mise à jour`);
      setOpen(false);
      onConfigUpdate?.();
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast.error("Erreur lors de la sauvegarde");
    },
  });

  // Filter OpenRouter models
  const filteredModels = useMemo(() => {
    if (!openRouterData?.models) return [];
    if (!search.trim()) return openRouterData.models.slice(0, 100); // Limit initial display
    
    const searchLower = search.toLowerCase();
    return openRouterData.models.filter(
      (m) =>
        m.id.toLowerCase().includes(searchLower) ||
        m.name.toLowerCase().includes(searchLower) ||
        m.provider.toLowerCase().includes(searchLower)
    ).slice(0, 100);
  }, [openRouterData?.models, search]);

  // Get display info for current model
  const getCurrentModelDisplay = () => {
    if (!config) return { provider: currentProvider, model: "Défaut" };
    
    const provider = config.provider_name;
    if (!config.model_id) return { provider, model: "Défaut du provider" };
    
    // Check if it's a known model
    const knownModels = DEFAULT_MODELS[provider];
    const known = knownModels?.find(m => m.id === config.model_id);
    if (known) return { provider, model: known.name };
    
    // OpenRouter model
    if (config.is_custom_model) {
      return { provider: "openrouter", model: config.model_id };
    }
    
    return { provider, model: config.model_id };
  };

  const displayInfo = getCurrentModelDisplay();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-3.5 w-3.5" />
          {PROVIDER_ICONS[displayInfo.provider]}
          <span className="text-xs truncate max-w-[120px]">{displayInfo.model}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuration de {functionName}
          </DialogTitle>
          <DialogDescription>
            Sélectionnez le provider et le modèle à utiliser pour cette fonction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Provider</label>
            <Select value={selectedProvider} onValueChange={(v) => {
              setSelectedProvider(v);
              setSelectedModel(null);
              setSearch("");
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      {PROVIDER_ICONS[key]}
                      <span>{label}</span>
                      {key === "openrouter" && (
                        <Badge variant="secondary" className="text-xs ml-2">
                          200+ modèles
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Modèle</label>
            
            {/* Non-OpenRouter providers */}
            {selectedProvider !== "openrouter" && (
              <Select 
                value={selectedModel || "default"} 
                onValueChange={(v) => setSelectedModel(v === "default" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Modèle par défaut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    <span className="text-muted-foreground">Modèle par défaut du provider</span>
                  </SelectItem>
                  {DEFAULT_MODELS[selectedProvider]?.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                      <span className="ml-2 text-xs text-muted-foreground font-mono">
                        {model.id}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* OpenRouter - Dynamic search */}
            {selectedProvider === "openrouter" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher parmi 200+ modèles..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {loadingOpenRouter ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Chargement des modèles OpenRouter...
                    </span>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] border rounded-md">
                    <div className="p-2 space-y-1">
                      {filteredModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => setSelectedModel(model.id)}
                          className={`w-full text-left p-3 rounded-md transition-colors ${
                            selectedModel === model.id
                              ? "bg-primary/10 border border-primary"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{model.name}</span>
                                {selectedModel === model.id && (
                                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground font-mono truncate">
                                {model.id}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                              <Badge variant="outline" className="text-xs">
                                {model.provider}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MessageSquare className="h-3 w-3" />
                                {model.context_length >= 1000000
                                  ? `${(model.context_length / 1000000).toFixed(1)}M`
                                  : `${Math.round(model.context_length / 1000)}K`}
                              </div>
                            </div>
                          </div>
                          {model.pricing_prompt > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <DollarSign className="h-3 w-3" />
                              ${(model.pricing_prompt * 1000000).toFixed(2)}/1M input
                            </div>
                          )}
                        </button>
                      ))}
                      {filteredModels.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          Aucun modèle trouvé pour "{search}"
                        </div>
                      )}
                      {filteredModels.length === 100 && (
                        <div className="text-center py-2 text-xs text-muted-foreground">
                          Affichage des 100 premiers résultats. Affinez votre recherche.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
                
                {openRouterData && (
                  <p className="text-xs text-muted-foreground text-center">
                    {openRouterData.models.length} modèles disponibles via OpenRouter
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedModel && (
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-sm">
                <span className="font-medium">Configuration :</span>{" "}
                {PROVIDER_LABELS[selectedProvider]} → {selectedModel}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => saveMutation.mutate({ 
                provider: selectedProvider, 
                model: selectedModel 
              })}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
