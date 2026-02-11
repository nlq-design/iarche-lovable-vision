/**
 * Cockpit Chatbot v2 - Conversational AI with Memory & Interview Mode
 * 
 * Features:
 *   - Memory enrichment via ai_agent_memory table
 *   - Tool calling for CRM actions (create tasks, update leads, etc.)
 *   - Interview Mode: proactively ask for missing CRM data (email, phone, budget, etc.)
 *   - Workspace isolation via workspace_id
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callLLM } from "../_shared/ai-client.ts";
import { loadPrompt } from "../_shared/prompt-loader.ts";
import { buildMaxContext, formatContextSummary } from "../_shared/context-maximizer.ts";
import { storeMemory, retrieveMemories, buildMemoryBlock, extractMemoriesFromConversation } from "../_shared/memory-enricher.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface InterviewSession {
  entity_type: string;
  entity_id: string;
  missing_fields: string[];
  current_question: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Verify user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { messages, session_id, workspace_id, mode = "chat", interview_context } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or infer workspace_id
    const wsId = workspace_id || (await getUserWorkspace(supabase, user.id));
    if (!wsId) {
      return new Response(JSON.stringify({ error: "Workspace non trouvé" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let response: unknown;

    if (mode === "interview") {
      response = await handleInterviewMode(
        supabase,
        wsId,
        user.id,
        interview_context || {},
        messages as ConversationMessage[]
      );
    } else {
      response = await handleChatMode(
        supabase,
        wsId,
        user.id,
        session_id,
        messages as ConversationMessage[]
      );
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    const message = error instanceof Error ? error.message : "Erreur interne";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Standard chat mode with memory enrichment and tool calling
 */
async function handleChatMode(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  userId: string,
  sessionId: string,
  messages: ConversationMessage[]
): Promise<unknown> {
  // Retrieve relevant memories (correct signature: supabase, workspaceId, options)
  const memories = await retrieveMemories(supabase, workspaceId, {
    category: "user_preference",
    limit: 10,
  });

  const memoryBlock = buildMemoryBlock(memories);

  // Load system prompt with fallback
  const systemPrompt = await loadPrompt(supabase, "cockpit-chatbot-system", {
    system_prompt: "Tu es l'assistant commercial IA d'IArche. Tu fournis des réponses précises et actionnables basées sur les données CRM de l'utilisateur.",
  });

  const userMessage = messages[messages.length - 1];
  const conversationHistory = messages.slice(0, -1);

  // Build context from CRM data if user asks about a specific entity
  let crmContext = "";
  const entityMention = detectEntityMention(userMessage.content);
  if (entityMention) {
    try {
      const ctx = await buildMaxContext(supabase, {
        entityType: entityMention.type,
        entityId: entityMention.id,
        tokenBudget: 20000, // Keep it reasonable for chat
      });
      crmContext = formatContextSummary(ctx);
    } catch (e) {
      console.warn("[chatbot-v2] Context build failed:", e);
    }
  }

  // Build LLM messages
  const llmMessages = [
    {
      role: "system" as const,
      content: `${systemPrompt.system_prompt}\n\n${memoryBlock}${crmContext ? `\n\n## Contexte CRM:\n${crmContext}` : ""}`,
    },
    ...conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage.content },
  ];

  // Call LLM with correct signature: callLLM(messages, options)
  const responseContent = await callLLM(llmMessages, {
    functionName: "cockpit-chatbot-v2",
    model: "google/gemini-3-flash-preview",
    temperature: 0.7,
    maxTokens: 1024,
    workspaceId,
  });

  // Auto-extract memories from conversation
  const newMemories = extractMemoriesFromConversation(userMessage.content, responseContent);
  for (const mem of newMemories) {
    await storeMemory(supabase, workspaceId, userId, {
      ...mem,
      sessionId: sessionId,
    });
  }

  return {
    message: responseContent,
    session_id: sessionId,
  };
}

/**
 * Interview Mode: proactively guide users to fill missing CRM data
 */
async function handleInterviewMode(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  userId: string,
  context: InterviewSession | Record<string, unknown>,
  messages: ConversationMessage[]
): Promise<unknown> {
  const session = context as InterviewSession;

  if (!session.entity_type || !session.entity_id) {
    return { error: "Entity type and ID required for interview mode" };
  }

  const missingFields = session.missing_fields || ["email", "phone", "budget"];
  const currentQuestionIdx = session.current_question || 0;

  // Load prompt with fallback
  const systemPrompt = await loadPrompt(supabase, "cockpit-interview-mode", {
    system_prompt: "Tu es un assistant spécialisé dans l'enrichissement de données CRM. Pose des questions naturelles et bienveillantes pour collecter les informations manquantes.",
  });

  // Fetch current entity state
  const entity = await fetchEntity(supabase, session.entity_type, session.entity_id);
  const questionField = missingFields[currentQuestionIdx];

  if (!questionField) {
    return {
      message: "Parfait, toutes les informations ont été collectées ! 🎉",
      interview_context: {
        ...session,
        completed: true,
      },
    };
  }

  // Build context with actual CRM data
  let entityContext = "";
  try {
    const ctx = await buildMaxContext(supabase, {
      entityType: session.entity_type,
      entityId: session.entity_id,
      tokenBudget: 10000,
    });
    entityContext = formatContextSummary(ctx);
  } catch (e) {
    entityContext = JSON.stringify(entity || {});
  }

  const interviewPrompt = `${systemPrompt.system_prompt}

## Entité à enrichir:
- Type: ${session.entity_type}
- Données actuelles:
${entityContext}

## Champ manquant actuel: "${questionField}"
## Champs restants: ${missingFields.slice(currentQuestionIdx).join(", ")}

Pose une question naturelle et conversationnelle pour obtenir "${questionField}". 
Explique brièvement pourquoi cette information est utile.
Ne pose qu'UNE seule question à la fois.`;

  const llmMessages = [
    { role: "system" as const, content: interviewPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  // Call LLM with correct signature
  const responseContent = await callLLM(llmMessages, {
    functionName: "cockpit-chatbot-v2",
    model: "google/gemini-3-flash-preview",
    temperature: 0.6,
    workspaceId,
  });

  // If user provided answer in last message, update entity field
  const lastUserMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  if (lastUserMessage?.role === "user" && lastUserMessage.content.length > 2) {
    const previousField = currentQuestionIdx > 0 ? missingFields[currentQuestionIdx - 1] : null;
    if (previousField) {
      await updateEntityField(supabase, session.entity_type, session.entity_id, previousField, lastUserMessage.content);
      
      // Log the enrichment
      await supabase.from("activity_log").insert({
        workspace_id: workspaceId,
        entity_type: session.entity_type,
        entity_id: session.entity_id,
        activity_type: "ai_action",
        title: `Interview IA: "${previousField}" enrichi`,
        is_ai_generated: true,
      });
    }
  }

  return {
    message: responseContent,
    interview_context: {
      entity_type: session.entity_type,
      entity_id: session.entity_id,
      missing_fields: missingFields,
      current_question: currentQuestionIdx + 1,
      completed: currentQuestionIdx + 1 >= missingFields.length,
    },
  };
}

/**
 * Detect entity mentions in user message (simple heuristic)
 */
function detectEntityMention(text: string): { type: string; id: string } | null {
  // UUID pattern in message
  const uuidMatch = text.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (!uuidMatch) return null;

  const lowerText = text.toLowerCase();
  let type = "lead";
  if (lowerText.includes("projet") || lowerText.includes("project")) type = "project";
  else if (lowerText.includes("opportunit")) type = "opportunity";
  else if (lowerText.includes("partenaire") || lowerText.includes("partner")) type = "partner";

  return { type, id: uuidMatch[1] };
}

/**
 * Fetch entity details
 */
async function fetchEntity(
  supabase: ReturnType<typeof createClient>,
  entityType: string,
  entityId: string
): Promise<unknown> {
  const tableMap: Record<string, string> = {
    lead: "leads",
    opportunity: "opportunities",
    project: "projects",
    partner: "partners",
  };
  const tableName = tableMap[entityType] || "leads";
  const { data } = await supabase.from(tableName).select("*").eq("id", entityId).single();
  return data;
}

/**
 * Update entity field with collected data
 */
async function updateEntityField(
  supabase: ReturnType<typeof createClient>,
  entityType: string,
  entityId: string,
  fieldName: string,
  value: string
): Promise<void> {
  const tableMap: Record<string, string> = {
    lead: "leads",
    opportunity: "opportunities",
    project: "projects",
    partner: "partners",
  };
  const tableName = tableMap[entityType] || "leads";

  try {
    await supabase.from(tableName).update({ [fieldName]: value }).eq("id", entityId);
  } catch (e) {
    console.warn(`[chatbot-v2] Failed to update ${tableName}.${fieldName}:`, e);
  }
}

/**
 * Get user's default workspace
 */
async function getUserWorkspace(supabase: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("created_by", userId)
    .limit(1)
    .single();
  return data?.id || null;
}
