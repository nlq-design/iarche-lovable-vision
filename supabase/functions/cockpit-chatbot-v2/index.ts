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
import { callLLM, extractStructured } from "../_shared/ai-client.ts";
import { loadPrompt } from "../_shared/prompt-loader.ts";
import { buildMaxContext } from "../_shared/context-maximizer.ts";
import { storeMemory, retrieveMemories, buildMemoryBlock } from "../_shared/memory-enricher.ts";

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
      // Interview Mode: proactively gather missing CRM data
      response = await handleInterviewMode(
        supabase,
        wsId,
        user.id,
        interview_context || {},
        messages as ConversationMessage[]
      );
    } else {
      // Standard chat mode with memory
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
  supabase: any,
  workspaceId: string,
  userId: string,
  sessionId: string,
  messages: ConversationMessage[]
): Promise<unknown> {
  // Retrieve relevant memories from previous conversations
  const memories = await retrieveMemories(supabase, workspaceId, userId, {
    category: "user_preference",
    limit: 10,
  });

  const memoryBlock = buildMemoryBlock(memories);

  // Load system prompt
  const systemPrompt = await loadPrompt(supabase, "cockpit-chatbot-system", "chat");
  if (!systemPrompt) {
    throw new Error("System prompt not found");
  }

  // Build conversation context (simplified - full context would use buildMaxContext)
  const userMessage = messages[messages.length - 1];
  const conversationHistory = messages.slice(0, -1);

  // Build messages for LLM
  const llmMessages = [
    {
      role: "system",
      content: `${systemPrompt.system_prompt}\n\n## Mémoire utilisateur:\n${memoryBlock}`,
    },
    ...conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: userMessage.content },
  ];

  // Call LLM with tool definitions
  const tools = [
    {
      type: "function",
      function: {
        name: "create_task",
        description: "Create a new task in the CRM",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            due_date: { type: "string", description: "ISO date string" },
            entity_type: { type: "string" },
            entity_id: { type: "string" },
          },
          required: ["title", "priority"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "update_lead",
        description: "Update lead information",
        parameters: {
          type: "object",
          properties: {
            lead_id: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            company: { type: "string" },
            status: { type: "string" },
            notes: { type: "string" },
          },
          required: ["lead_id"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "start_interview",
        description: "Start data enrichment interview for a CRM entity",
        parameters: {
          type: "object",
          properties: {
            entity_type: { type: "string", enum: ["lead", "opportunity", "project"] },
            entity_id: { type: "string" },
            fields_to_collect: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["entity_type", "entity_id"],
        },
      },
    },
  ];

  const llmResponse = await callLLM({
    messages: llmMessages,
    model: "google/gemini-3-flash-preview",
    tools,
    temperature: 0.7,
  });

  // Store key facts from user message
  const userKeywords = extractKeywords(userMessage.content);
  if (userKeywords.length > 0) {
    await storeMemory(supabase, workspaceId, userId, sessionId, {
      content: `Sujet: ${userMessage.content}`,
      memory_type: "conversation_topic",
      category: "user_preference",
      importance_score: 0.6,
    });
  }

  // Extract and execute tool calls if any
  const toolResults = [];
  if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
    for (const toolCall of llmResponse.tool_calls) {
      const result = await executeToolCall(supabase, workspaceId, toolCall);
      toolResults.push({ tool: toolCall.function.name, result });
    }
  }

  return {
    message: llmResponse.content,
    tool_calls: toolResults.length > 0 ? toolResults : undefined,
    session_id: sessionId,
  };
}

/**
 * Interview Mode: proactively guide users to fill missing CRM data
 */
async function handleInterviewMode(
  supabase: any,
  workspaceId: string,
  userId: string,
  context: InterviewSession | Record<string, unknown>,
  messages: ConversationMessage[]
): Promise<unknown> {
  const session = context as InterviewSession;

  if (!session.entity_type || !session.entity_id) {
    return { error: "Entity type and ID required for interview mode" };
  }

  // Detect missing fields from current messages
  const missingFields = session.missing_fields || ["email", "phone", "budget"];
  const currentQuestionIdx = session.current_question || 0;

  const systemPrompt = await loadPrompt(supabase, "cockpit-interview-mode", "chat");
  if (!systemPrompt) {
    throw new Error("Interview system prompt not found");
  }

  // Build interview-specific context
  const entity = await fetchEntity(supabase, session.entity_type, session.entity_id);
  const questionField = missingFields[currentQuestionIdx];

  const interviewPrompt = `${systemPrompt.system_prompt}

## Entité à enrichir:
- Type: ${session.entity_type}
- ID: ${session.entity_id}
- Données actuelles: ${JSON.stringify(entity || {})}

## Champ manquant actuel:
${questionField}

Posez une question naturelle et bienveillante pour obtenir cette information.`;

  const llmMessages = [
    { role: "system", content: interviewPrompt },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const llmResponse = await callLLM({
    messages: llmMessages,
    model: "google/gemini-3-flash-preview",
    temperature: 0.6,
  });

  // If user provided answer, update entity
  const lastUserMessage = messages.length > 0 ? messages[messages.length - 1].content : "";
  if (lastUserMessage && lastUserMessage.length > 5) {
    await updateEntityField(supabase, session.entity_type, session.entity_id, questionField, lastUserMessage);
  }

  return {
    message: llmResponse.content,
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
 * Execute tool calls from LLM responses
 */
async function executeToolCall(
  supabase: any,
  workspaceId: string,
  toolCall: any
): Promise<unknown> {
  const { name, arguments: args } = toolCall.function;
  const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;

  switch (name) {
    case "create_task":
      return await supabase.from("tasks").insert({
        workspace_id: workspaceId,
        ...parsedArgs,
        status: "pending",
      });

    case "update_lead":
      return await supabase
        .from("leads")
        .update(parsedArgs)
        .eq("id", parsedArgs.lead_id)
        .select();

    case "start_interview":
      return { interview_started: true, context: parsedArgs };

    default:
      return { error: `Tool ${name} not implemented` };
  }
}

/**
 * Fetch entity details
 */
async function fetchEntity(
  supabase: any,
  entityType: string,
  entityId: string
): Promise<unknown> {
  const { data } = await supabase
    .from(entityType === "lead" ? "leads" : entityType === "opportunity" ? "opportunities" : "projects")
    .select("*")
    .eq("id", entityId)
    .single();
  return data;
}

/**
 * Update entity field with collected data
 */
async function updateEntityField(
  supabase: any,
  entityType: string,
  entityId: string,
  fieldName: string,
  value: string
): Promise<unknown> {
  const tableName = entityType === "lead" ? "leads" : entityType === "opportunity" ? "opportunities" : "projects";
  return await supabase
    .from(tableName)
    .update({ [fieldName]: value })
    .eq("id", entityId)
    .select();
}

/**
 * Get user's default workspace
 */
async function getUserWorkspace(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("created_by", userId)
    .limit(1)
    .single();
  return data?.id || null;
}

/**
 * Extract keywords from user message for memory storage
 */
function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  return words.filter((w) => w.length > 4 && !["about", "think", "would", "could"].includes(w));
}
