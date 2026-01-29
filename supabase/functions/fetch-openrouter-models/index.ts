import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    is_moderated: boolean;
  };
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type: string | null;
  };
}

interface SimplifiedModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing_prompt: number;
  pricing_completion: number;
  modality: string;
  provider: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch models from OpenRouter API (no auth required for this endpoint)
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch OpenRouter models",
          details: errorText 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const data = await response.json();
    const models: OpenRouterModel[] = data.data || [];

    // Simplify and structure the model data
    const simplifiedModels: SimplifiedModel[] = models.map((model) => {
      // Extract provider from model ID (e.g., "anthropic/claude-3" -> "anthropic")
      const provider = model.id.split("/")[0] || "unknown";
      
      return {
        id: model.id,
        name: model.name || model.id,
        description: model.description || "",
        context_length: model.context_length || 0,
        pricing_prompt: parseFloat(model.pricing?.prompt || "0"),
        pricing_completion: parseFloat(model.pricing?.completion || "0"),
        modality: model.architecture?.modality || "text",
        provider,
      };
    });

    // Sort by provider, then by name
    simplifiedModels.sort((a, b) => {
      if (a.provider !== b.provider) {
        return a.provider.localeCompare(b.provider);
      }
      return a.name.localeCompare(b.name);
    });

    // Group by provider for easier navigation
    const groupedByProvider: Record<string, SimplifiedModel[]> = {};
    simplifiedModels.forEach((model) => {
      if (!groupedByProvider[model.provider]) {
        groupedByProvider[model.provider] = [];
      }
      groupedByProvider[model.provider].push(model);
    });

    return new Response(
      JSON.stringify({
        models: simplifiedModels,
        grouped: groupedByProvider,
        total: simplifiedModels.length,
        providers: Object.keys(groupedByProvider).sort(),
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error fetching OpenRouter models:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
