import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Centralized AI client for provider switching and fallback
import { createAIClient } from "../_shared/ai-client.ts";
import { chatWithTools, completeLLM } from "../_shared/ai-legacy-bridge.ts";
import type { AIMessage, AITool } from "../_shared/ai-types.ts";
import { composeSystemPromptForRequest, type Intent } from "../_shared/intent-router.ts";
import { buildCacheKey, buildContextFingerprint, lookupCache, storeCache, trackCacheTrace } from "../_shared/semantic-cache.ts";

// Phase IA-2 — Cache sémantique orchestrator (general intent only, no tool_calls)
const ORCHESTRATOR_CACHE_TTL_HOURS = 24;
const ORCHESTRATOR_CACHE_THRESHOLD = 0.95; // strict pour éviter pollution CRM

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
// Note: LOVABLE_API_KEY and OPENAI_API_KEY are now managed by the centralized AI client
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

// Helper function to use centralized AI client
async function callCentralizedAI(
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number } = {}
): Promise<string> {
  return completeLLM(systemPrompt, userPrompt, {
    category: 'chat',
    maxTokens: options.maxTokens || 4096,
  });
}

// =============================================================================
// INPUT SANITIZATION FOR SEARCH QUERIES
// =============================================================================

/**
 * Sanitizes search input for Supabase ILIKE queries
 * - Escapes SQL wildcards (%, _) to prevent wildcard injection
 * - Limits length to prevent performance issues
 * - Trims whitespace
 */
function sanitizeSearchInput(input: string, maxLength = 200): string {
  if (!input || typeof input !== 'string') return '';
  // Trim and limit length
  const trimmed = input.trim().slice(0, maxLength);
  // Escape SQL LIKE wildcards to prevent wildcard injection attacks
  return trimmed.replace(/[%_]/g, '\\$&');
}

/**
 * Validates and sanitizes a UUID to prevent injection
 */
function sanitizeUUID(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') return '';
  // UUID v4 format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(input.trim()) ? input.trim() : '';
}

// =============================================================================
// MODEL CONTEXT WINDOWS
// =============================================================================

function getModelContextWindow(modelId: string): number {
  const contextWindows: Record<string, number> = {
    "google/gemini-2.5-pro": 1048576,
    "google/gemini-3-pro-preview": 1048576,
    "google/gemini-3-flash-preview": 1048576,
    "google/gemini-2.5-flash": 1048576,
    "google/gemini-2.5-flash-lite": 131072,
    "openai/gpt-5": 128000,
    "openai/gpt-5-mini": 128000,
    "openai/gpt-5-nano": 128000,
    "openai/gpt-5.2": 128000,
  };
  // Find by exact match or prefix
  for (const [key, value] of Object.entries(contextWindows)) {
    if (modelId === key || modelId.startsWith(key)) return value;
  }
  return 32000; // Conservative fallback
}

// =============================================================================
// MEMORY HELPERS
// =============================================================================

interface MemoryEntry {
  memory_type: 'conversation' | 'action' | 'rag_query' | 'tool_call' | 'insight' | 'preference' | 'context';
  category?: string;
  entity_type?: string;
  entity_id?: string;
  content: string;
  metadata?: Record<string, unknown>;
  importance_score?: number;
  expires_at?: string;
}

// deno-lint-ignore no-explicit-any
async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) return null;
  
  try {
    const response = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000), // Limit text length
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.data[0].embedding;
  } catch {
    return null;
  }
}

// deno-lint-ignore no-explicit-any
async function saveMemory(supabase: any, entry: MemoryEntry, workspaceId?: string, userId?: string, sessionId?: string): Promise<void> {
  try {
    // Generate embedding for semantic search in memory
    const embedding = await generateEmbedding(entry.content);
    
    const { error } = await supabase.from("ai_agent_memory").insert({
      workspace_id: workspaceId,
      user_id: userId,
      session_id: sessionId,
      memory_type: entry.memory_type,
      category: entry.category,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      content: entry.content,
      metadata: entry.metadata || {},
      embedding: embedding ? `[${embedding.join(",")}]` : null,
      importance_score: entry.importance_score ?? 0.5,
      expires_at: entry.expires_at,
    });
    
    if (error) {
      console.error("Failed to save memory:", error);
    }
  } catch (err) {
    console.error("Memory save error:", err);
  }
}

/**
 * Log a decision automatically after a write tool is executed.
 * Used for post-processing without LLM round-trip.
 * Records the action + result to ai_agent_memory for context.
 */
// deno-lint-ignore no-explicit-any
async function logDecision(
  supabase: any,
  toolName: string,
  args: Record<string, unknown>,
  result: unknown,
  workspaceId?: string,
  userId?: string,
  sessionId?: string
): Promise<void> {
  const writeTools = [
    "create_lead", "update_lead", "create_booking", "update_booking",
    "create_task", "update_task", "create_project", "update_project",
    "send_email", "create_meeting_note", "update_meeting_note",
    "create_opportunity", "update_opportunity", "update_lead_score"
  ];

  // Only log write operations that succeeded
  if (!writeTools.includes(toolName)) return;
  if (typeof result === "object" && result !== null && "success" in result && !result.success) return;

  try {
    const entityId = (args.lead_id || args.booking_id || args.task_id || args.project_id || args.opportunity_id) as string | undefined;
    const entityType = toolName.split("_")[1] || "unknown"; // e.g., "create_lead" -> "lead"

    const decisionText = `${toolName}: ${JSON.stringify(args).substring(0, 100)}`;

    await saveMemory(supabase, {
      memory_type: "context",
      category: "executed_action",
      entity_type: entityType,
      entity_id: entityId,
      content: decisionText,
      importance_score: 0.9,
      metadata: { tool_result: typeof result === "string" ? result : "success" },
    }, workspaceId, userId, sessionId);
  } catch (err) {
    console.error("[logDecision] Error:", err);
    // Silent fail - don't break orchestration
  }
}

// deno-lint-ignore no-explicit-any
async function getRecentMemory(supabase: any, workspaceId?: string, userId?: string, sessionId?: string, limit = 10): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc("get_recent_ai_memory", {
      p_workspace_id: workspaceId,
      p_user_id: userId,
      p_session_id: sessionId,
      p_memory_types: null,
      p_limit: limit,
    });
    
    if (error || !data) return [];
    
    return data.map((m: { memory_type: string; content: string; created_at: string }) => 
      `[${m.memory_type}] ${m.content}`
    );
  } catch {
    return [];
  }
}

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// deno-lint-ignore no-explicit-any
async function searchMemory(supabase: any, query: string, workspaceId?: string, userId?: string, limit = 5): Promise<string[]> {
  try {
    const embedding = await generateEmbedding(query);
    if (!embedding) return [];
    
    const { data, error } = await supabase.rpc("search_ai_memory", {
      p_query_embedding: `[${embedding.join(",")}]`,
      p_workspace_id: workspaceId,
      p_user_id: userId,
      p_session_id: null,
      p_memory_types: null,
      p_match_threshold: 0.65,
      p_match_count: limit,
    });
    
    if (error || !data) return [];
    
    return data.map((m: { memory_type: string; content: string; similarity: number }) => 
      `[${m.memory_type}|${(m.similarity * 100).toFixed(0)}%] ${m.content}`
    );
  } catch {
    return [];
  }
}

// =============================================================================
// TOOL DEFINITIONS - Organized by Module
// =============================================================================

const AGENT_TOOLS = [
  // ============ COCKPIT - Lecture ============
  {
    type: "function",
    function: {
      name: "get_leads",
      description: "Récupère la liste des leads avec filtrage optionnel. Données : nom, email, entreprise, source, score, statut.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Rechercher par nom ou entreprise (insensible à la casse)" },
          status: { type: "string", description: "Filtrer par statut (new, contacted, qualified, converted, lost)" },
          source: { type: "string", description: "Filtrer par source (contact, newsletter, livre-blanc, atelier-webinaire, formulaire, booking)" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_leads",
      description: "Recherche un lead par nom, email ou entreprise. À utiliser pour trouver un lead spécifique.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Terme de recherche (nom, email, entreprise)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_fuzzy",
      description: "Recherche floue/approximative d'entités (leads, projets, partenaires). Utilise quand l'utilisateur orthographie mal un nom ou quand search_leads ne trouve rien.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Terme de recherche (peut être approximatif/mal orthographié)" },
          entity_types: { 
            type: "array", 
            items: { type: "string", enum: ["lead", "project", "partner"] },
            description: "Types d'entités à rechercher (défaut: tous)" 
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_opportunities",
      description: "Récupère les opportunités du pipeline commercial. Données : titre, valeur, probabilité, stage, lead associé.",
      parameters: {
        type: "object",
        properties: {
          stage: { type: "string", description: "Filtrer par stage (lead, r1, r2, pause, closed_won, lost)" },
          min_value: { type: "number", description: "Valeur minimum en euros" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_projects",
      description: "Récupère les projets en cours. Données : nom, description, statut, budget, lead/opportunité liés.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Rechercher par nom de projet (insensible à la casse)" },
          status: { type: "string", description: "Filtrer par statut (scoping, in_progress, on_hold, completed, cancelled)" },
          health_status: { type: "string", description: "Filtrer par santé (on_track, at_risk, blocked)" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_projects",
      description: "Recherche un projet par nom. À utiliser pour trouver un projet spécifique comme 'Beeliopi', 'Beerecos', etc.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Terme de recherche (nom du projet)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tasks",
      description: "Récupère les tâches. Données : titre, type, priorité, statut, échéance, entité liée.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filtrer par statut (pending, in_progress, completed, cancelled)" },
          priority: { type: "string", description: "Filtrer par priorité (low, medium, high, urgent)" },
          overdue_only: { type: "boolean", description: "Ne retourner que les tâches en retard" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_transcriptions",
      description: "Récupère les transcriptions vocales avec leurs analyses. Données : résumé, besoins détectés, actions.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "Filtrer par lead" },
          project_id: { type: "string", description: "Filtrer par projet" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_meeting_notes",
      description: "Récupère les comptes-rendus de réunion. Données : notes, objectifs, prochaines étapes, actions, résumé IA.",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "Filtrer par RDV" },
          project_id: { type: "string", description: "Filtrer par projet" },
          opportunity_id: { type: "string", description: "Filtrer par opportunité" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_specifications",
      description: "Récupère les cahiers des charges (CDC/Spécifications). Données : titre, contenu, statut, version, projet lié.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Filtrer par projet" },
          status: { type: "string", description: "Filtrer par statut (draft, review, approved, archived)" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_generated_documents",
      description: "Récupère les documents générés (devis, CDC, propositions). Données : type, statut, contenu, projet/lead lié.",
      parameters: {
        type: "object",
        properties: {
          document_type: { type: "string", description: "Filtrer par type (quote, cdc, proposal, email)" },
          status: { type: "string", description: "Filtrer par statut (draft, pending_review, approved, sent)" },
          lead_id: { type: "string", description: "Filtrer par lead" },
          project_id: { type: "string", description: "Filtrer par projet" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_solution_leads",
      description: "Récupère les leads intéressés par des solutions spécifiques avec niveau d'intérêt et notes.",
      parameters: {
        type: "object",
        properties: {
          solution_id: { type: "string", description: "Filtrer par solution" },
          lead_id: { type: "string", description: "Filtrer par lead" },
          interest_level: { type: "string", description: "Filtrer par niveau d'intérêt (low, medium, high, very_high)" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_activity_log",
      description: "Récupère l'historique des activités (emails, appels, RDV, changements de statut, actions IA).",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", description: "Filtrer par type (lead, opportunity, project, task, meeting_note, booking)" },
          entity_id: { type: "string", description: "Filtrer par ID d'entité spécifique" },
          activity_type: { type: "string", description: "Filtrer par type d'activité (note, email, call, meeting, status_change, ai_action)" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pipeline_stats",
      description: "Récupère les statistiques du pipeline : nombre d'opportunités par stage, valeur totale, taux de conversion.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pending_ai_notifications",
      description: "Récupère les nouvelles entrées (leads, opportunités, projets, tâches, documents...) non encore revues par l'IA. UTILISE CE TOOL EN PREMIER pour être informé des nouveautés.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Nombre max de notifications (défaut: 20)" },
          entity_type: { type: "string", description: "Filtrer par type (lead, opportunity, project, task, booking, etc.)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_notifications_reviewed",
      description: "Marque les notifications comme lues après les avoir traitées. Appeler après get_pending_ai_notifications.",
      parameters: {
        type: "object",
        properties: {
          notification_ids: { 
            type: "array", 
            items: { type: "string" },
            description: "Liste des IDs de notifications à marquer comme lues" 
          },
        },
        required: ["notification_ids"],
      },
    },
  },
  // ============ ADMIN - Lecture (N0) ============
  {
    type: "function",
    function: {
      name: "get_articles",
      description: "Récupère les articles/contenus publiés (actualités, articles, cas-clients, livres-blancs, ateliers, solutions).",
      parameters: {
        type: "object",
        properties: {
          resource_type: { type: "string", description: "Filtrer par type (actualite, article, cas-client, livre-blanc, atelier-webinaire, solution)" },
          published_only: { type: "boolean", description: "Ne retourner que les articles publiés (défaut: true)" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_article_details",
      description: "Récupère le contenu complet d'un article avec catégories, tags, FAQ et statistiques.",
      parameters: {
        type: "object",
        properties: {
          article_id: { type: "string", description: "ID de l'article" },
          slug: { type: "string", description: "Slug de l'article (alternatif à l'ID)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_solutions",
      description: "Récupère les solutions IArche (offres SaaS et services) avec détails.",
      parameters: {
        type: "object",
        properties: {
          published_only: { type: "boolean", description: "Ne retourner que les solutions publiées (défaut: true)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_categories_tags",
      description: "Récupère les catégories et tags disponibles pour les articles.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_contacts",
      description: "Récupère les messages de contact reçus via le formulaire.",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string", description: "Filtrer par source" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_newsletters",
      description: "Récupère les newsletters (brouillons et envoyées) et les statistiques d'abonnés.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filtrer par statut (draft, sent)" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_forms",
      description: "Récupère les formulaires et leurs statistiques (vues, soumissions).",
      parameters: {
        type: "object",
        properties: {
          active_only: { type: "boolean", description: "Ne retourner que les formulaires actifs (défaut: true)" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_form_responses",
      description: "Récupère les réponses à un formulaire spécifique.",
      parameters: {
        type: "object",
        properties: {
          form_id: { type: "string", description: "ID du formulaire" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 20)" },
        },
        required: ["form_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_brochures",
      description: "Récupère les brochures marketing avec leurs sections et statistiques de vues.",
      parameters: {
        type: "object",
        properties: {
          published_only: { type: "boolean", description: "Ne retourner que les brochures publiées (défaut: true)" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_atelier_inscriptions",
      description: "Récupère les inscriptions aux ateliers/webinaires avec les leads associés.",
      parameters: {
        type: "object",
        properties: {
          atelier_id: { type: "string", description: "Filtrer par atelier" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_bookings",
      description: "Récupère les rendez-vous planifiés avec filtres avancés.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filtrer par statut (pending, confirmed, cancelled, completed)" },
          meeting_type: { type: "string", description: "Filtrer par type (visio, telephone, presentiel)" },
          upcoming_only: { type: "boolean", description: "Ne retourner que les RDV futurs" },
          start_date: { type: "string", description: "Date de début (YYYY-MM-DD)" },
          end_date: { type: "string", description: "Date de fin (YYYY-MM-DD)" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_booking_details",
      description: "Récupère les détails complets d'un rendez-vous avec le lead associé et les notes de réunion.",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "ID du booking" },
        },
        required: ["booking_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_agenda_summary",
      description: "Obtient un résumé de l'agenda : RDV aujourd'hui, cette semaine, statistiques, prochains RDV importants.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "tomorrow", "this_week", "next_week", "this_month"], description: "Période du résumé (défaut: this_week)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_comments",
      description: "Récupère les commentaires sur les articles (approuvés et en attente).",
      parameters: {
        type: "object",
        properties: {
          article_id: { type: "string", description: "Filtrer par article" },
          approved_only: { type: "boolean", description: "Ne retourner que les commentaires approuvés" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_cta_analytics",
      description: "Récupère les statistiques des clics CTA avec conversion et sources.",
      parameters: {
        type: "object",
        properties: {
          cta_name: { type: "string", description: "Filtrer par nom de CTA" },
          days: { type: "number", description: "Nombre de jours à analyser (défaut: 30)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge_base",
      description: "Recherche sémantique dans la base de connaissances IArche (articles, solutions, cas clients) via RAG. Retourne une synthèse sourcée et exploitable.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "La requête de recherche" },
          filter_types: { 
            type: "array", 
            items: { type: "string" },
            description: "Filtrer par types de ressources (solution, cas-client, article, livre-blanc, etc.)" 
          },
          entity_context: { type: "string", description: "Contexte de l'entité liée (ex: 'Lead: Marie Pecot - Beerecos - recherche chatbot')" },
        },
        required: ["query"],
      },
    },
  },
  // ============ COCKPIT - Écriture ============
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Crée une tâche de suivi. Si une heure est mentionnée (ex: 'à 14h', 'pour 10h30'), elle sera automatiquement extraite et ajoutée.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre de la tâche" },
          description: { type: "string", description: "Description détaillée" },
          task_type: { type: "string", description: "Type (follow_up, call, email, meeting, document, other)" },
          priority: { type: "string", description: "Priorité (low, medium, high, urgent)" },
          due_date: { type: "string", description: "Date d'échéance (YYYY-MM-DD)" },
          due_time: { type: "string", description: "Heure d'échéance (HH:mm). Auto-extrait si mentionnée dans le titre." },
          lead_id: { type: "string", description: "ID du lead associé" },
          project_id: { type: "string", description: "ID du projet associé" },
          opportunity_id: { type: "string", description: "ID de l'opportunité associée" },
          transcription_id: { type: "string", description: "ID de transcription source si tâche générée depuis une transcription" },
        },
        required: ["title", "task_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_meeting_note",
      description: "Crée un compte-rendu de réunion. Si aucun booking_id/project_id/opportunity_id n'est fourni mais qu'un lead_name ou lead_email est donné, l'agent recherche automatiquement l'opportunité liée au lead.",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "ID du RDV associé" },
          project_id: { type: "string", description: "ID du projet associé" },
          opportunity_id: { type: "string", description: "ID de l'opportunité associée" },
          lead_name: { type: "string", description: "Nom du lead (pour recherche auto de l'opportunité si pas d'ID fourni)" },
          lead_email: { type: "string", description: "Email du lead (pour recherche auto de l'opportunité si pas d'ID fourni)" },
          notes: { type: "string", description: "Notes de la réunion" },
          objectives: { type: "string", description: "Objectifs de la réunion" },
          next_steps: { type: "string", description: "Prochaines étapes" },
          action_items: { type: "array", items: { type: "string" }, description: "Liste des actions à mener" },
        },
        required: ["notes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_lead_qualification",
      description: "Change la qualification d'un lead.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "ID du lead" },
          new_status: { type: "string", description: "Nouveau statut (new, contacted, qualified, converted, lost)" },
          reason: { type: "string", description: "Justification du changement" },
        },
        required: ["lead_id", "new_status", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_opportunity_stage",
      description: "Change le stage d'une opportunité.",
      parameters: {
        type: "object",
        properties: {
          opportunity_id: { type: "string", description: "ID de l'opportunité" },
          new_stage: { type: "string", description: "Nouveau stage (lead, qualified, proposal, negotiation, closed_won, lost)" },
          reason: { type: "string", description: "Justification du changement" },
          value_amount: { type: "number", description: "Nouvelle valeur estimée (optionnel)" },
        },
        required: ["opportunity_id", "new_stage", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_followup_email",
      description: "Génère un email de suivi pour un lead ou projet.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "ID du lead" },
          email_type: { type: "string", description: "Type (first_contact, post_meeting, followup, proposal, reminder)" },
          custom_context: { type: "string", description: "Contexte additionnel pour personnaliser l'email" },
          transcription_id: { type: "string", description: "ID de transcription pour contexte (optionnel)" },
        },
        required: ["lead_id", "email_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_solutions_for_lead",
      description: "Analyse les besoins du lead et identifie les solutions IArche pertinentes.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "ID du lead" },
        },
        required: ["lead_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_booking_action",
      description: "Suggère une action sur un rendez-vous (reporter, ajouter notes, envoyer rappel).",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "ID du booking" },
          action: { type: "string", enum: ["reschedule", "add_notes", "send_reminder", "prepare_meeting", "create_followup"], description: "Action suggérée" },
          reason: { type: "string", description: "Raison ou contexte de l'action" },
          notes: { type: "string", description: "Notes à ajouter si action = add_notes" },
        },
        required: ["booking_id", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_activity",
      description: "Enregistre une activité dans le journal (appel, email, note, etc.).",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", description: "Type d'entité (lead, opportunity, project, task)" },
          entity_id: { type: "string", description: "ID de l'entité" },
          activity_type: { type: "string", description: "Type d'activité (note, email, call, meeting, status_change)" },
          title: { type: "string", description: "Titre de l'activité" },
          content: { type: "string", description: "Contenu/description de l'activité" },
        },
        required: ["entity_type", "entity_id", "activity_type", "title"],
      },
    },
  },
  // ============ ADMIN - Écriture ============
  {
    type: "function",
    function: {
      name: "draft_article_content",
      description: "Génère un brouillon de contenu pour un article/actualité.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre de l'article" },
          resource_type: { type: "string", description: "Type (actualite, article, cas-client)" },
          topic: { type: "string", description: "Sujet principal" },
          keywords: { type: "array", items: { type: "string" }, description: "Mots-clés à inclure" },
          tone: { type: "string", description: "Ton souhaité (professionnel, accessible, technique)" },
        },
        required: ["title", "resource_type", "topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_article_improvements",
      description: "Analyse un article et suggère des améliorations (SEO, structure, contenu).",
      parameters: {
        type: "object",
        properties: {
          article_id: { type: "string", description: "ID de l'article à analyser" },
        },
        required: ["article_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_newsletter",
      description: "Génère un brouillon de newsletter basé sur les actualités récentes.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Sujet de la newsletter" },
          include_articles: { type: "boolean", description: "Inclure les derniers articles" },
          include_events: { type: "boolean", description: "Inclure les prochains événements" },
          custom_intro: { type: "string", description: "Introduction personnalisée" },
        },
        required: ["subject"],
      },
    },
  },
  // ============ NOUVEAUX OUTILS D'ACTION (v3.0) ============
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Crée un rendez-vous COMPLET avec génération Zoom (si visio), ajout calendrier Google et envoi emails de confirmation. IMPORTANT: Pour la date, consulte TOUJOURS le CALENDRIER DE RÉFÉRENCE dans le contexte temporel et utilise la date ISO exacte (YYYY-MM-DD) correspondant au jour mentionné par l'utilisateur.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nom complet du contact" },
          email: { type: "string", description: "Email du contact" },
          company: { type: "string", description: "Entreprise (optionnel)" },
          phone: { type: "string", description: "Téléphone (requis si type=telephone)" },
          date: { type: "string", description: "Date du RDV au format YYYY-MM-DD. CRITIQUE: Consulte le CALENDRIER DE RÉFÉRENCE pour trouver la date exacte. Ex: si l'utilisateur dit 'vendredi', trouve la ligne 'vendredi DD/MM/YYYY = YYYY-MM-DD' et utilise cette date ISO." },
          time: { type: "string", description: "Heure du RDV au format HH:mm (ex: 14:00 ou 14:30)" },
          duration_minutes: { type: "number", description: "Durée en minutes (défaut: 60)" },
          meeting_type: { type: "string", enum: ["visio", "telephone", "presentiel"], description: "Type de rendez-vous" },
          booking_type_slug: { type: "string", description: "Slug du type de RDV (decouverte, suivi, demo)" },
          message: { type: "string", description: "Message ou contexte du RDV" },
          create_lead_if_missing: { type: "boolean", description: "Créer le lead si email inconnu (défaut: true)" },
          additional_guests: { type: "array", items: { type: "string" }, description: "Emails des invités supplémentaires" },
        },
        required: ["name", "email", "date", "time", "meeting_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_lead",
      description: "Crée un lead dans le CRM avec toutes les informations.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nom complet" },
          email: { type: "string", description: "Email" },
          company: { type: "string", description: "Entreprise" },
          phone: { type: "string", description: "Téléphone" },
          source: { type: "string", description: "Source (contact, telegram, agent, booking, formulaire)" },
          source_context: { type: "string", description: "Contexte détaillé de la source" },
          message: { type: "string", description: "Message ou notes" },
          qualification_status: { type: "string", enum: ["new", "contacted", "qualified"], description: "Statut initial (défaut: new)" },
          industry: { type: "string", description: "Secteur d'activité" },
          company_size: { type: "string", description: "Taille entreprise" },
        },
      required: ["name", "email", "source"],
    },
  },
},
{
  type: "function",
  function: {
    name: "update_lead",
    description: "Met à jour les informations d'un lead existant (téléphone, entreprise, notes, etc.). Utilise cet outil pour modifier directement un lead au lieu de créer une tâche.",
    parameters: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "ID du lead (peut être retrouvé via get_leads)" },
        email: { type: "string", description: "Email pour identifier le lead si pas d'ID" },
        phone: { type: "string", description: "Nouveau téléphone" },
        company: { type: "string", description: "Nouvelle entreprise" },
        position: { type: "string", description: "Nouveau poste" },
        linkedin_url: { type: "string", description: "URL LinkedIn" },
        website: { type: "string", description: "Site web" },
        source_context: { type: "string", description: "Ajouter au contexte existant" },
        message: { type: "string", description: "Ajouter aux notes/messages" },
      },
    },
  },
},
{
    type: "function",
    function: {
      name: "send_email",
      description: "Génère et envoie un email via Resend. Envoi direct par défaut (send_now=true).",
      parameters: {
        type: "object",
        properties: {
          to_email: { type: "string", description: "Email destinataire" },
          to_name: { type: "string", description: "Nom destinataire" },
          subject: { type: "string", description: "Sujet de l'email" },
          body_html: { type: "string", description: "Corps HTML de l'email (généré automatiquement si absent)" },
          email_type: { type: "string", enum: ["first_contact", "followup", "post_meeting", "proposal", "reminder", "custom"], description: "Type d'email pour génération automatique" },
          lead_id: { type: "string", description: "ID du lead pour enrichir le contexte" },
          send_now: { type: "boolean", description: "Envoi immédiat (défaut: true)" },
          signature: { type: "string", description: "Signature personnalisée (défaut: Nick / IArche)" },
        },
        required: ["to_email", "subject"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_booking",
      description: "Annule un rendez-vous existant et envoie une notification au contact.",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "ID du rendez-vous à annuler" },
          reason: { type: "string", description: "Raison de l'annulation" },
          notify_contact: { type: "boolean", description: "Envoyer email d'annulation (défaut: true)" },
        },
        required: ["booking_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reschedule_booking",
      description: "Replanifie un rendez-vous à une nouvelle date/heure.",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "ID du rendez-vous à reprogrammer" },
          new_date: { type: "string", description: "Nouvelle date (YYYY-MM-DD)" },
          new_time: { type: "string", description: "Nouvelle heure (HH:mm)" },
          notify_contact: { type: "boolean", description: "Notifier le contact (défaut: true)" },
        },
        required: ["booking_id", "new_date", "new_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_opportunity",
      description: "Crée une opportunité dans le pipeline commercial.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre de l'opportunité" },
          lead_id: { type: "string", description: "ID du lead associé" },
          value_amount: { type: "number", description: "Valeur estimée en euros" },
          probability: { type: "number", description: "Probabilité de closing (0-100)" },
          stage: { type: "string", enum: ["lead", "r1", "r2", "pause"], description: "Stage initial" },
          expected_close_date: { type: "string", description: "Date de closing prévue (YYYY-MM-DD)" },
          description: { type: "string", description: "Description de l'opportunité" },
          source: { type: "string", description: "Source de l'opportunité" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Crée un projet (généralement après opportunité gagnée).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nom du projet" },
          description: { type: "string", description: "Description" },
          opportunity_id: { type: "string", description: "ID de l'opportunité source" },
          lead_id: { type: "string", description: "ID du lead client" },
          budget_amount: { type: "number", description: "Budget en euros" },
          start_date: { type: "string", description: "Date de début (YYYY-MM-DD)" },
          target_end_date: { type: "string", description: "Date de fin prévue (YYYY-MM-DD)" },
          status: { type: "string", enum: ["scoping", "in_progress"], description: "Statut initial" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "link_solution_to_lead",
      description: "Associe une solution IArche à un lead avec niveau d'intérêt.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "ID du lead" },
          solution_slug: { type: "string", description: "Slug de la solution (collaboria, datalia, lexia, etc.)" },
          interest_level: { type: "string", enum: ["low", "medium", "high", "very_high"], description: "Niveau d'intérêt" },
          notes: { type: "string", description: "Notes sur l'intérêt" },
        },
        required: ["lead_id", "solution_slug"],
      },
    },
  },
  // ============ NOUVEAUX OUTILS P1 (Phase 4) ============
  {
    type: "function",
    function: {
      name: "create_specification",
      description: "Crée un cahier des charges (CDC/Spécification) pour un projet.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre du CDC" },
          description: { type: "string", description: "Description générale" },
          project_id: { type: "string", description: "ID du projet associé" },
          lead_id: { type: "string", description: "ID du lead client" },
          functional_requirements: { type: "array", items: { type: "string" }, description: "Exigences fonctionnelles" },
          technical_requirements: { type: "array", items: { type: "string" }, description: "Exigences techniques" },
          constraints: { type: "array", items: { type: "string" }, description: "Contraintes projet" },
          content: { type: "string", description: "Contenu détaillé du CDC (Markdown)" },
          status: { type: "string", enum: ["draft", "review", "approved"], description: "Statut initial (défaut: draft)" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_document",
      description: "Crée manuellement un document généré (devis, proposition, email type) sans IA.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre du document" },
          document_type: { type: "string", enum: ["quote", "cdc", "proposal", "email"], description: "Type de document" },
          content_json: { type: "object", description: "Contenu structuré du document" },
          project_id: { type: "string", description: "ID du projet associé" },
          lead_id: { type: "string", description: "ID du lead client" },
          opportunity_id: { type: "string", description: "ID de l'opportunité associée" },
          status: { type: "string", enum: ["draft", "pending_review", "approved"], description: "Statut initial (défaut: draft)" },
        },
        required: ["title", "document_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_document",
      description: "Génère un document commercial (devis, CDC, proposition) via IA.",
      parameters: {
        type: "object",
        properties: {
          document_type: { type: "string", enum: ["quote", "spec", "proposal"], description: "Type de document : quote (devis), spec (CDC), proposal (proposition)" },
          project_id: { type: "string", description: "ID du projet associé" },
          opportunity_id: { type: "string", description: "ID de l'opportunité associée" },
          lead_id: { type: "string", description: "ID du lead client" },
          custom_instructions: { type: "string", description: "Instructions personnalisées pour la génération" },
        },
        required: ["document_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "enrich_seo",
      description: "Enrichit le contenu HTML d'un article avec des balises SEO.",
      parameters: {
        type: "object",
        properties: {
          article_id: { type: "string", description: "ID de l'article à enrichir" },
          content: { type: "string", description: "Contenu HTML à enrichir (si pas d'article_id)" },
          resource_type: { type: "string", description: "Type de ressource (actualite, article, cas-client)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_faq",
      description: "Génère une FAQ automatique pour un article.",
      parameters: {
        type: "object",
        properties: {
          article_id: { type: "string", description: "ID de l'article" },
          mode: { type: "string", enum: ["new", "add"], description: "Mode : new (remplacer), add (ajouter aux existantes)" },
        },
        required: ["article_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_newsletter",
      description: "Envoie une newsletter à tous les abonnés pour un article.",
      parameters: {
        type: "object",
        properties: {
          article_id: { type: "string", description: "ID de l'article à promouvoir" },
        },
        required: ["article_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_tags",
      description: "Suggère des tags pertinents pour un article basé sur son contenu.",
      parameters: {
        type: "object",
        properties: {
          article_id: { type: "string", description: "ID de l'article" },
          title: { type: "string", description: "Titre si pas d'article_id" },
          content: { type: "string", description: "Contenu si pas d'article_id" },
        },
      },
    },
  },
  // ============ PHASE 2: MÉMOIRE PERSISTANTE ============
  {
    type: "function",
    function: {
      name: "get_lead_familiarity",
      description: "Récupère le score de familiarité d'un lead (historique d'interactions, documents, RDV, transcriptions).",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "ID du lead" },
        },
        required: ["lead_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_lead_familiarity",
      description: "Recalcule et met à jour le score de familiarité d'un lead.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "ID du lead" },
        },
        required: ["lead_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_entity_references",
      description: "Récupère les références croisées entre entités (leads mentionnant projets, transcriptions mentionnant partenaires, etc.).",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", description: "Type d'entité (lead, project, partner, solution)" },
          entity_id: { type: "string", description: "ID de l'entité" },
        },
        required: ["entity_type", "entity_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_entity_reference",
      description: "Crée une référence croisée entre deux entités (ex: transcription mentionne lead, document référence projet).",
      parameters: {
        type: "object",
        properties: {
          source_type: { type: "string", description: "Type de l'entité source" },
          source_id: { type: "string", description: "ID de l'entité source" },
          target_type: { type: "string", description: "Type de l'entité cible" },
          target_id: { type: "string", description: "ID de l'entité cible" },
          reference_type: { type: "string", description: "Type de référence (mention, link, cite, related)" },
          context: { type: "string", description: "Contexte de la référence" },
          confidence: { type: "number", description: "Score de confiance 0-1" },
        },
        required: ["source_type", "source_id", "target_type", "target_id"],
      },
    },
  },
  // ============ PHASE 3: OUTILS AMÉLIORATION IA v5.3 ============
  {
    type: "function",
    function: {
      name: "get_stale_syntheses",
      description: "Récupère les entités dont la synthèse IA est obsolète et doit être recalculée. Utiliser pour maintenance proactive.",
      parameters: {
        type: "object",
        properties: {
          max_items: { type: "number", description: "Nombre max par type d'entité (défaut: 5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_ai_dashboard_metrics",
      description: "Récupère les métriques temps réel du système IA : synthèses obsolètes, notifications en attente, mémoire 24h, état RAG.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "trigger_proactive_notification",
      description: "Envoie une notification proactive via Telegram pour un événement important (changement de stage, nouveau lead qualifié, etc.).",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Message à envoyer" },
          entity_type: { type: "string", description: "Type d'entité concernée" },
          entity_id: { type: "string", description: "ID de l'entité" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Priorité du message" },
        },
        required: ["message"],
      },
    },
  },
  // ============ PARTENAIRES (v5.4) ============
  {
    type: "function",
    function: {
      name: "get_partners",
      description: "Récupère la liste des partenaires (experts IA, indépendants, apporteurs d'affaires). Différent des leads (clients potentiels).",
      parameters: {
        type: "object",
        properties: {
          partner_type: { type: "string", enum: ["expert_ia", "independant", "apporteur"], description: "Filtrer par type de partenaire" },
          is_active: { type: "boolean", description: "Filtrer les partenaires actifs uniquement (défaut: true)" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_partners",
      description: "Recherche un partenaire par nom, email ou entreprise. À utiliser AVANT de créer un nouveau partenaire pour éviter les doublons.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Terme de recherche (nom, email, entreprise)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_solutions",
      description: "Recherche une solution IArche par nom ou slug (Collaboria, Datalia, Lexia, Team 5 Connect, Dialogue Plus). Inclut la synthèse Consulte.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Terme de recherche (nom, slug)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_documents",
      description: "Recherche dans les documents générés (devis, CDC, propositions) par titre ou type. Inclut la synthèse Consulte.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Terme de recherche (titre, contenu)" },
          document_type: { type: "string", enum: ["quote", "cdc", "proposal", "email"], description: "Filtrer par type" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_transcriptions",
      description: "Recherche dans les transcriptions vocales par résumé, besoins détectés ou lead/projet lié. Inclut la synthèse Consulte.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Terme de recherche (résumé, besoins, action items)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_specifications",
      description: "Recherche dans les cahiers des charges (CDC/Spécifications) par titre ou contenu. Inclut la synthèse Consulte.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Terme de recherche (titre, contenu, exigences)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_partner",
      description: "Crée un partenaire dans le CRM. ATTENTION: Un partenaire n'est PAS un lead. Utiliser pour experts IA, indépendants ou apporteurs d'affaires.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nom complet du partenaire" },
          email: { type: "string", description: "Email du partenaire" },
          company: { type: "string", description: "Entreprise/Structure" },
          phone: { type: "string", description: "Téléphone" },
          partner_type: { type: "string", enum: ["expert_ia", "independant", "apporteur"], description: "Type de partenaire (défaut: independant)" },
          specialties: { type: "array", items: { type: "string" }, description: "Spécialités/compétences" },
          commission_rate: { type: "number", description: "Taux de commission en % (pour apporteurs)" },
          notes: { type: "string", description: "Notes sur le partenaire" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_partner",
      description: "Met à jour les informations d'un partenaire existant.",
      parameters: {
        type: "object",
        properties: {
          partner_id: { type: "string", description: "ID du partenaire" },
          email: { type: "string", description: "Email pour identifier le partenaire si pas d'ID" },
          name: { type: "string", description: "Nouveau nom" },
          phone: { type: "string", description: "Nouveau téléphone" },
          company: { type: "string", description: "Nouvelle entreprise" },
          partner_type: { type: "string", enum: ["expert_ia", "independant", "apporteur"], description: "Nouveau type" },
          specialties: { type: "array", items: { type: "string" }, description: "Nouvelles spécialités" },
          is_active: { type: "boolean", description: "Statut actif/inactif" },
          notes: { type: "string", description: "Notes à ajouter" },
        },
      },
    },
  },
  // ============ CREATE SOLUTION & TRANSCRIPTION ============
  {
    type: "function",
    function: {
      name: "create_solution",
      description: "Crée une nouvelle solution IArche (offre SaaS/service). Une solution est un article avec resource_type='solution'.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre de la solution (ex: Collaboria, Datalia)" },
          slug: { type: "string", description: "Slug URL unique (ex: collaboria, datalia)" },
          excerpt: { type: "string", description: "Description courte (< 160 caractères)" },
          content: { type: "string", description: "Contenu HTML de la solution" },
          meta_title: { type: "string", description: "Titre SEO" },
          meta_description: { type: "string", description: "Description SEO" },
          published: { type: "boolean", description: "Publier immédiatement (défaut: false)" },
          thematiques: { type: "array", items: { type: "string" }, description: "Thématiques associées" },
          tags: { type: "array", items: { type: "string" }, description: "Tags de la solution" },
        },
        required: ["title", "slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_transcription",
      description: "Crée une transcription vocale manuellement (sans upload audio). Utile pour importer des notes de réunion textuelles.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre de la transcription" },
          transcript_text: { type: "string", description: "Texte de la transcription" },
          transcript_summary: { type: "string", description: "Résumé de la transcription" },
          lead_id: { type: "string", description: "ID du lead associé" },
          project_id: { type: "string", description: "ID du projet associé" },
          transcription_date: { type: "string", description: "Date de la transcription (YYYY-MM-DD)" },
          detected_needs: { type: "array", items: { type: "string" }, description: "Besoins détectés" },
          action_items: { type: "array", items: { type: "string" }, description: "Actions à mener" },
          speakers: { type: "array", items: { type: "string" }, description: "Liste des intervenants" },
        },
        required: ["title"],
      },
    },
  },
  // ============ CRUD COMPLET COCKPIT (v5.5) ============
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Met à jour une tâche existante (titre, description, priorité, échéance, statut).",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "ID de la tâche" },
          title: { type: "string", description: "Nouveau titre" },
          description: { type: "string", description: "Nouvelle description" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Nouvelle priorité" },
          status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"], description: "Nouveau statut" },
          due_date: { type: "string", description: "Nouvelle date d'échéance (YYYY-MM-DD)" },
          due_time: { type: "string", description: "Nouvelle heure d'échéance (HH:mm)" },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description: "Marque une tâche comme terminée.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "ID de la tâche" },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "snooze_task",
      description: "Reporte une tâche à une date ultérieure.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "ID de la tâche" },
          snooze_until: { type: "string", description: "Reporter jusqu'à (YYYY-MM-DD)" },
        },
        required: ["task_id", "snooze_until"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Supprime une tâche.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "ID de la tâche" },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project",
      description: "Met à jour un projet (nom, description, statut, budget, dates).",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "ID du projet" },
          name: { type: "string", description: "Nouveau nom" },
          description: { type: "string", description: "Nouvelle description" },
          status: { type: "string", enum: ["scoping", "in_progress", "on_hold", "completed", "cancelled"], description: "Nouveau statut" },
          health_status: { type: "string", enum: ["on_track", "at_risk", "blocked"], description: "Nouvelle santé" },
          budget_amount: { type: "number", description: "Nouveau budget" },
          start_date: { type: "string", description: "Nouvelle date de début (YYYY-MM-DD)" },
          target_end_date: { type: "string", description: "Nouvelle date de fin (YYYY-MM-DD)" },
        },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_project",
      description: "Supprime un projet et toutes ses données liées (cascade).",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "ID du projet" },
        },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_meeting_note",
      description: "Met à jour un compte-rendu de réunion.",
      parameters: {
        type: "object",
        properties: {
          meeting_note_id: { type: "string", description: "ID du compte-rendu" },
          notes: { type: "string", description: "Nouvelles notes" },
          objectives: { type: "string", description: "Nouveaux objectifs" },
          next_steps: { type: "string", description: "Nouvelles prochaines étapes" },
          action_items: { type: "array", items: { type: "string" }, description: "Nouvelles actions" },
        },
        required: ["meeting_note_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_meeting_note",
      description: "Supprime un compte-rendu de réunion.",
      parameters: {
        type: "object",
        properties: {
          meeting_note_id: { type: "string", description: "ID du compte-rendu" },
        },
        required: ["meeting_note_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_transcription",
      description: "Met à jour une transcription (lead, projet, titre, date).",
      parameters: {
        type: "object",
        properties: {
          transcription_id: { type: "string", description: "ID de la transcription" },
          title: { type: "string", description: "Nouveau titre" },
          lead_id: { type: "string", description: "Nouveau lead associé" },
          project_id: { type: "string", description: "Nouveau projet associé" },
          transcription_date: { type: "string", description: "Nouvelle date (YYYY-MM-DD)" },
        },
        required: ["transcription_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_specification",
      description: "Met à jour un cahier des charges.",
      parameters: {
        type: "object",
        properties: {
          specification_id: { type: "string", description: "ID du CDC" },
          title: { type: "string", description: "Nouveau titre" },
          description: { type: "string", description: "Nouvelle description" },
          content: { type: "string", description: "Nouveau contenu" },
          status: { type: "string", enum: ["draft", "review", "approved", "archived"], description: "Nouveau statut" },
        },
        required: ["specification_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "approve_specification",
      description: "Approuve un cahier des charges.",
      parameters: {
        type: "object",
        properties: {
          specification_id: { type: "string", description: "ID du CDC" },
        },
        required: ["specification_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_document",
      description: "Met à jour un document généré (titre, statut, version).",
      parameters: {
        type: "object",
        properties: {
          document_id: { type: "string", description: "ID du document" },
          title: { type: "string", description: "Nouveau titre" },
          status: { type: "string", enum: ["draft", "pending_review", "approved", "sent", "archived"], description: "Nouveau statut" },
          version: { type: "string", description: "Nouvelle version" },
        },
        required: ["document_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "approve_document",
      description: "Approuve un document généré.",
      parameters: {
        type: "object",
        properties: {
          document_id: { type: "string", description: "ID du document" },
        },
        required: ["document_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_lead",
      description: "Supprime un lead et toutes ses données liées (opportunités, projets, tâches - cascade sécurisée).",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "ID du lead" },
        },
        required: ["lead_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_opportunity",
      description: "Met à jour une opportunité (titre, valeur, probabilité, dates).",
      parameters: {
        type: "object",
        properties: {
          opportunity_id: { type: "string", description: "ID de l'opportunité" },
          title: { type: "string", description: "Nouveau titre" },
          description: { type: "string", description: "Nouvelle description" },
          value_amount: { type: "number", description: "Nouvelle valeur en euros" },
          probability: { type: "number", description: "Nouvelle probabilité (0-100)" },
          expected_close_date: { type: "string", description: "Nouvelle date de closing (YYYY-MM-DD)" },
        },
        required: ["opportunity_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_opportunity",
      description: "Supprime une opportunité.",
      parameters: {
        type: "object",
        properties: {
          opportunity_id: { type: "string", description: "ID de l'opportunité" },
        },
        required: ["opportunity_id"],
      },
    },
  },
  // ============ CRUD ADMIN (v5.5) ============
  {
    type: "function",
    function: {
      name: "create_article",
      description: "Crée un article/contenu (actualité, article, cas-client).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre de l'article" },
          slug: { type: "string", description: "Slug URL unique" },
          resource_type: { type: "string", enum: ["actualite", "article", "cas-client", "livre-blanc", "atelier-webinaire"], description: "Type de ressource" },
          excerpt: { type: "string", description: "Résumé/extrait" },
          content: { type: "string", description: "Contenu HTML" },
          meta_title: { type: "string", description: "Titre SEO" },
          meta_description: { type: "string", description: "Description SEO" },
          tags: { type: "array", items: { type: "string" }, description: "Tags" },
          published: { type: "boolean", description: "Publier immédiatement (défaut: false)" },
          cover_image_url: { type: "string", description: "URL image de couverture" },
        },
        required: ["title", "slug", "resource_type", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_article",
      description: "Met à jour un article existant.",
      parameters: {
        type: "object",
        properties: {
          article_id: { type: "string", description: "ID de l'article" },
          title: { type: "string", description: "Nouveau titre" },
          excerpt: { type: "string", description: "Nouveau résumé" },
          content: { type: "string", description: "Nouveau contenu" },
          published: { type: "boolean", description: "Publier/dépublier" },
          meta_title: { type: "string", description: "Titre SEO" },
          meta_description: { type: "string", description: "Description SEO" },
          tags: { type: "array", items: { type: "string" }, description: "Tags" },
        },
        required: ["article_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_article",
      description: "Supprime un article.",
      parameters: {
        type: "object",
        properties: {
          article_id: { type: "string", description: "ID de l'article" },
        },
        required: ["article_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_brochure",
      description: "Crée une brochure marketing.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre interne" },
          slug: { type: "string", description: "Slug URL unique" },
          cover_title: { type: "string", description: "Titre affiché en couverture" },
          cover_subtitle: { type: "string", description: "Sous-titre couverture" },
          cover_image_url: { type: "string", description: "URL image de couverture" },
          published: { type: "boolean", description: "Publier immédiatement (défaut: false)" },
        },
        required: ["title", "slug", "cover_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_brochure",
      description: "Met à jour une brochure.",
      parameters: {
        type: "object",
        properties: {
          brochure_id: { type: "string", description: "ID de la brochure" },
          title: { type: "string", description: "Nouveau titre" },
          cover_title: { type: "string", description: "Nouveau titre couverture" },
          cover_subtitle: { type: "string", description: "Nouveau sous-titre" },
          published: { type: "boolean", description: "Publier/dépublier" },
        },
        required: ["brochure_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_brochure",
      description: "Supprime une brochure.",
      parameters: {
        type: "object",
        properties: {
          brochure_id: { type: "string", description: "ID de la brochure" },
        },
        required: ["brochure_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_form",
      description: "Crée un formulaire.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre du formulaire" },
          description: { type: "string", description: "Description" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_form",
      description: "Met à jour un formulaire (titre, description, activation).",
      parameters: {
        type: "object",
        properties: {
          form_id: { type: "string", description: "ID du formulaire" },
          title: { type: "string", description: "Nouveau titre" },
          description: { type: "string", description: "Nouvelle description" },
          is_active: { type: "boolean", description: "Activer/désactiver" },
        },
        required: ["form_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_form",
      description: "Supprime un formulaire.",
      parameters: {
        type: "object",
        properties: {
          form_id: { type: "string", description: "ID du formulaire" },
        },
        required: ["form_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "approve_comment",
      description: "Approuve un commentaire sur un article.",
      parameters: {
        type: "object",
        properties: {
          comment_id: { type: "string", description: "ID du commentaire" },
        },
        required: ["comment_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reject_comment",
      description: "Rejette/supprime un commentaire sur un article.",
      parameters: {
        type: "object",
        properties: {
          comment_id: { type: "string", description: "ID du commentaire" },
        },
        required: ["comment_id"],
      },
    },
  },
  // ============ CRUD COMPLÉMENTAIRE COCKPIT (v5.6) ============
  {
    type: "function",
    function: {
      name: "create_lead_contact",
      description: "Ajoute un contact secondaire à un lead (plusieurs interlocuteurs possibles par entreprise).",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "ID du lead parent" },
          name: { type: "string", description: "Nom du contact" },
          email: { type: "string", description: "Email du contact" },
          phone: { type: "string", description: "Téléphone" },
          position: { type: "string", description: "Poste/fonction" },
          is_primary: { type: "boolean", description: "Contact principal (défaut: false)" },
          notes: { type: "string", description: "Notes sur ce contact" },
        },
        required: ["lead_id", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_lead_contact",
      description: "Met à jour un contact de lead.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "ID du contact" },
          name: { type: "string", description: "Nouveau nom" },
          email: { type: "string", description: "Nouvel email" },
          phone: { type: "string", description: "Nouveau téléphone" },
          position: { type: "string", description: "Nouveau poste" },
          notes: { type: "string", description: "Nouvelles notes" },
        },
        required: ["contact_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_lead_contact",
      description: "Supprime un contact de lead.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "ID du contact" },
        },
        required: ["contact_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_primary_lead_contact",
      description: "Définit un contact comme contact principal du lead.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "ID du contact à définir comme principal" },
          lead_id: { type: "string", description: "ID du lead" },
        },
        required: ["contact_id", "lead_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project_note",
      description: "Ajoute une synthèse/note à un projet. Différent du journal d'activité : ces notes sont des documents de travail.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "ID du projet" },
          title: { type: "string", description: "Titre de la note" },
          content: { type: "string", description: "Contenu de la note (Markdown)" },
          note_type: { type: "string", enum: ["general", "technical", "meeting", "decision", "risk"], description: "Type de note (défaut: general)" },
          tags: { type: "array", items: { type: "string" }, description: "Tags" },
        },
        required: ["project_id", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project_note",
      description: "Met à jour une note de projet.",
      parameters: {
        type: "object",
        properties: {
          note_id: { type: "string", description: "ID de la note" },
          title: { type: "string", description: "Nouveau titre" },
          content: { type: "string", description: "Nouveau contenu" },
          note_type: { type: "string", enum: ["general", "technical", "meeting", "decision", "risk"], description: "Nouveau type" },
          tags: { type: "array", items: { type: "string" }, description: "Nouveaux tags" },
        },
        required: ["note_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_project_note",
      description: "Supprime une note de projet.",
      parameters: {
        type: "object",
        properties: {
          note_id: { type: "string", description: "ID de la note" },
        },
        required: ["note_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_context_note",
      description: "Crée une note de contexte pour une entité (lead, projet, solution, partenaire). Ces notes enrichissent la synthèse IA Consulte.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["lead", "project", "solution", "partner", "document", "transcription"], description: "Type d'entité" },
          entity_id: { type: "string", description: "ID de l'entité" },
          content: { type: "string", description: "Contenu de la note de contexte" },
        },
        required: ["entity_type", "entity_id", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_context_note",
      description: "Met à jour une note de contexte.",
      parameters: {
        type: "object",
        properties: {
          note_id: { type: "string", description: "ID de la note de contexte" },
          content: { type: "string", description: "Nouveau contenu" },
        },
        required: ["note_id", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_context_note",
      description: "Supprime une note de contexte.",
      parameters: {
        type: "object",
        properties: {
          note_id: { type: "string", description: "ID de la note de contexte" },
        },
        required: ["note_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_partner",
      description: "Supprime un partenaire (soft-delete, déplacé vers la corbeille).",
      parameters: {
        type: "object",
        properties: {
          partner_id: { type: "string", description: "ID du partenaire" },
        },
        required: ["partner_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_lead_score",
      description: "Met à jour manuellement le score d'un lead avec détails justificatifs.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "ID du lead" },
          score: { type: "number", description: "Nouveau score (0-100)" },
          details: { type: "object", description: "Détails du scoring (ex: { engagement: 20, budget: 30, timing: 25 })" },
        },
        required: ["lead_id", "score"],
      },
    },
  },
  // ============ VIVIERS - Cold Leads Module ============
  {
    type: "function",
    function: {
      name: "get_viviers",
      description: "Récupère les prospects froids (viviers). Données : nom, email, entreprise, score, source, tags.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Rechercher par nom, email ou entreprise" },
          source: { type: "string", description: "Filtrer par source d'import" },
          min_score: { type: "number", description: "Score minimum (0-100)" },
          max_score: { type: "number", description: "Score maximum (0-100)" },
          promoted: { type: "boolean", description: "Filtrer par statut de promotion (true=promus, false=non promus)" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_viviers",
      description: "Recherche un vivier par nom, email ou entreprise. À utiliser pour trouver des prospects froids spécifiques.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Terme de recherche (nom, email, entreprise)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "score_viviers",
      description: "Déclenche le scoring IA de viviers sélectionnés ou d'un segment entier. Utilise le prompt vivier-score.",
      parameters: {
        type: "object",
        properties: {
          vivier_ids: { type: "array", items: { type: "string" }, description: "IDs des viviers à scorer (optionnel si segment_query)" },
          segment_query: { type: "string", description: "Requête naturelle de ciblage (ex: 'PME tech en IDF')" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "promote_viviers_to_leads",
      description: "Promeut des viviers vers la table leads avec enrichissement automatique. Supprime le vivier après promotion.",
      parameters: {
        type: "object",
        properties: {
          vivier_ids: { type: "array", items: { type: "string" }, description: "IDs des viviers à promouvoir" },
          enrich: { type: "boolean", description: "Enrichir via Pappers si SIRET disponible (défaut: true)" },
        },
        required: ["vivier_ids"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_vivier_campaigns",
      description: "Récupère les campagnes email cold (Instantly). Données : nom, statut, statistiques, domaine d'envoi.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["draft", "created", "active", "paused", "completed"], description: "Filtrer par statut" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_vivier_campaign",
      description: "Crée une campagne email cold pour un segment de viviers. Génère le contenu via le prompt vivier-campaign.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nom de la campagne" },
          segment_query: { type: "string", description: "Requête de ciblage naturelle (ex: 'Score > 60, secteur tech')" },
          vivier_ids: { type: "array", items: { type: "string" }, description: "Ou IDs spécifiques de viviers" },
          domain_id: { type: "string", description: "ID du domaine d'envoi (satellite Instantly)" },
          generate_content: { type: "boolean", description: "Générer le contenu via IA (défaut: true)" },
          pain_point: { type: "string", description: "Point de douleur à adresser dans les emails" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preview_campaign_email",
      description: "Prévisualise un email de campagne avec les variables résolues pour un vivier spécifique.",
      parameters: {
        type: "object",
        properties: {
          campaign_id: { type: "string", description: "ID de la campagne" },
          vivier_id: { type: "string", description: "ID du vivier pour résoudre les variables" },
          step: { type: "number", description: "Numéro du step (1, 2 ou 3)" },
        },
        required: ["campaign_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "launch_vivier_campaign",
      description: "Lance une campagne email cold via Instantly. ATTENTION: action irréversible, nécessite confirmation.",
      parameters: {
        type: "object",
        properties: {
          campaign_id: { type: "string", description: "ID de la campagne à lancer" },
          confirm: { type: "boolean", description: "Confirmation explicite requise (true)" },
        },
        required: ["campaign_id", "confirm"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_email_domains",
      description: "Liste les domaines email configurés (satellites Instantly + core Brevo) avec leur statut de warm-up.",
      parameters: {
        type: "object",
        properties: {
          provider: { type: "string", enum: ["instantly", "brevo", "resend"], description: "Filtrer par provider" },
          domain_type: { type: "string", enum: ["core", "satellite"], description: "Filtrer par type" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clean_viviers",
      description: "Nettoie les viviers : détection doublons, emails invalides, données incohérentes. Utilise le prompt vivier-clean.",
      parameters: {
        type: "object",
        properties: {
          preview_only: { type: "boolean", description: "Mode prévisualisation sans suppression (défaut: true)" },
          vivier_ids: { type: "array", items: { type: "string" }, description: "IDs spécifiques à analyser (optionnel)" },
        },
      },
    },
  },
  // ============ OUTILS EDGE FUNCTIONS (v7.0) ============
  {
    type: "function",
    function: {
      name: "lookup_company",
      description: "Recherche une entreprise française par SIRET, SIREN ou nom via l'API Pappers. Enrichit automatiquement les données entreprise.",
      parameters: {
        type: "object",
        properties: {
          siret: { type: "string", description: "Numéro SIRET (14 chiffres)" },
          siren: { type: "string", description: "Numéro SIREN (9 chiffres)" },
          company_name: { type: "string", description: "Nom de l'entreprise (recherche approximative)" },
          lead_id: { type: "string", description: "ID du lead à enrichir avec les données trouvées (optionnel)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_article_faq",
      description: "Génère automatiquement une FAQ empathique pour un article. Questions du point de vue du lecteur.",
      parameters: {
        type: "object",
        properties: {
          article_id: { type: "string", description: "ID de l'article" },
          mode: { type: "string", enum: ["new", "add"], description: "new = remplacer, add = ajouter aux existantes" },
        },
        required: ["article_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "enrich_content_seo",
      description: "Enrichit le contenu HTML d'un article avec des balises <strong> sur les mots-clés importants pour le SEO.",
      parameters: {
        type: "object",
        properties: {
          article_id: { type: "string", description: "ID de l'article à enrichir" },
        },
        required: ["article_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_article_tags",
      description: "Suggère des tags pertinents pour un article basé sur son contenu.",
      parameters: {
        type: "object",
        properties: {
          article_id: { type: "string", description: "ID de l'article" },
        },
        required: ["article_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "refresh_entity_synthesis",
      description: "Régénère la synthèse IA (Consulte 360°) d'une entité. Utilise pour les entités marquées 'stale'.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["lead", "project", "partner", "solution"], description: "Type d'entité" },
          entity_id: { type: "string", description: "ID de l'entité" },
        },
        required: ["entity_type", "entity_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_email_logs",
      description: "Récupère les logs d'envoi d'emails (notifications, newsletters, campagnes).",
      parameters: {
        type: "object",
        properties: {
          email_type: { type: "string", description: "Filtrer par type (notification, newsletter, campaign)" },
          status: { type: "string", enum: ["pending", "sent", "failed"], description: "Filtrer par statut" },
          recipient_email: { type: "string", description: "Filtrer par destinataire" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_audit_logs",
      description: "Récupère les logs d'audit admin (actions utilisateurs, modifications, connexions).",
      parameters: {
        type: "object",
        properties: {
          action_type: { type: "string", description: "Filtrer par action (create, update, delete, login)" },
          resource_type: { type: "string", description: "Filtrer par type de ressource" },
          user_email: { type: "string", description: "Filtrer par utilisateur" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_rag_status",
      description: "Récupère le statut de l'indexation RAG (embeddings) pour toutes les ressources.",
      parameters: {
        type: "object",
        properties: {
          resource_type: { type: "string", description: "Filtrer par type de ressource" },
          stale_only: { type: "boolean", description: "Ne montrer que les ressources non indexées ou obsolètes" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trigger_embedding_refresh",
      description: "Déclenche la réindexation RAG d'une ou plusieurs ressources.",
      parameters: {
        type: "object",
        properties: {
          resource_type: { type: "string", description: "Type de ressource (article, solution, cas-client)" },
          resource_id: { type: "string", description: "ID spécifique (optionnel, sinon tout le type)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_followup_email",
      description: "Génère et envoie un email de relance commerciale à un lead. Utilise le contexte du lead et ses interactions.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "ID du lead" },
          email_type: { type: "string", enum: ["first_contact", "followup", "proposal", "reminder"], description: "Type d'email" },
          custom_message: { type: "string", description: "Message personnalisé à inclure (optionnel)" },
          preview_only: { type: "boolean", description: "Prévisualiser sans envoyer (défaut: true)" },
        },
        required: ["lead_id", "email_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_email_drafts",
      description: "Récupère les brouillons d'emails générés par l'IA en attente d'envoi. Affiche le contenu complet pour relecture.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "Filtrer par lead spécifique" },
          status: { type: "string", enum: ["pending_review", "sent", "all"], description: "Filtrer par statut (défaut: pending_review)" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_email_draft",
      description: "Envoie un brouillon d'email préalablement généré. L'email est envoyé au destinataire indiqué dans le brouillon.",
      parameters: {
        type: "object",
        properties: {
          draft_id: { type: "string", description: "ID du brouillon (activity_log ID)" },
        },
        required: ["draft_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "convert_lead_to_partner",
      description: "Convertit un lead existant en partenaire. Crée le partenaire avec les infos du lead et marque le lead comme converti.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "ID du lead à convertir" },
          partner_type: { type: "string", enum: ["expert_ia", "independant", "apporteur"], description: "Type de partenaire (défaut: apporteur)" },
          specialties: { type: "array", items: { type: "string" }, description: "Spécialités du partenaire" },
          commission_rate: { type: "number", description: "Taux de commission en % (défaut: 10)" },
        },
        required: ["lead_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cleanup_old_drafts",
      description: "Nettoie les brouillons d'emails expirés (non envoyés depuis X jours). Retourne le nombre supprimé.",
      parameters: {
        type: "object",
        properties: {
          days_old: { type: "number", description: "Âge minimum en jours pour supprimer (défaut: 30)" },
          dry_run: { type: "boolean", description: "Si true, compte sans supprimer (défaut: false)" },
        },
      },
    },
  },
  // ============ OUTILS v8.0 - NOUVELLES FONCTIONNALITÉS ============
  {
    type: "function",
    function: {
      name: "sync_google_calendar",
      description: "Synchronise l'agenda avec Google Calendar. Récupère les événements Google et les met à jour dans le CRM.",
      parameters: {
        type: "object",
        properties: {
          direction: { type: "string", enum: ["pull", "push", "both"], description: "Direction de sync (défaut: both)" },
          days_range: { type: "number", description: "Nombre de jours à synchroniser (défaut: 30)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_article_ai",
      description: "Génère un article IA complet (blog, actualité, cas client) avec titre, contenu et meta SEO.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Sujet de l'article" },
          resource_type: { type: "string", enum: ["article", "actualite", "cas-client"], description: "Type de contenu" },
          keywords: { type: "array", items: { type: "string" }, description: "Mots-clés à inclure" },
          tone: { type: "string", enum: ["professionnel", "accessible", "technique", "inspirant"], description: "Ton souhaité" },
          length: { type: "string", enum: ["court", "moyen", "long"], description: "Longueur (court ~500, moyen ~1000, long ~2000 mots)" },
        },
        required: ["topic", "resource_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_backup",
      description: "Crée un backup complet de la base de données. Utile avant des migrations ou opérations critiques.",
      parameters: {
        type: "object",
        properties: {
          backup_type: { type: "string", enum: ["full", "incremental"], description: "Type de backup (défaut: full)" },
          tables: { type: "array", items: { type: "string" }, description: "Tables spécifiques à backup (optionnel, sinon toutes)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_telegram_stats",
      description: "Récupère les statistiques du bot Telegram (messages traités, erreurs, temps de réponse).",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month", "all"], description: "Période d'analyse (défaut: week)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_calendar_availability",
      description: "Récupère les créneaux disponibles pour planifier un RDV.",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "Date de début (YYYY-MM-DD)" },
          end_date: { type: "string", description: "Date de fin (YYYY-MM-DD)" },
          duration_minutes: { type: "number", description: "Durée souhaitée en minutes (défaut: 60)" },
          booking_type_slug: { type: "string", description: "Type de RDV (decouverte, suivi, demo)" },
        },
        required: ["start_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "detect_security_anomalies",
      description: "Lance une détection d'anomalies sécurité (tentatives connexion suspectes, comportements anormaux).",
      parameters: {
        type: "object",
        properties: {
          period_hours: { type: "number", description: "Période d'analyse en heures (défaut: 24)" },
          include_resolved: { type: "boolean", description: "Inclure les anomalies déjà résolues" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_security_logs",
      description: "Récupère les logs de connexion et tentatives d'authentification.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Filtrer par email" },
          success_only: { type: "boolean", description: "Ne montrer que les connexions réussies" },
          failed_only: { type: "boolean", description: "Ne montrer que les échecs" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_performance_metrics",
      description: "Récupère les métriques de performance du site (Lighthouse scores, Core Web Vitals).",
      parameters: {
        type: "object",
        properties: {
          environment: { type: "string", enum: ["production", "staging"], description: "Environnement (défaut: production)" },
          limit: { type: "number", description: "Nombre de mesures (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stale_entities",
      description: "Liste les entités dont la synthèse IA (Consulte 360°) est obsolète et doit être régénérée.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["lead", "project", "partner", "all"], description: "Type d'entité (défaut: all)" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_refresh_syntheses",
      description: "Régénère en batch les synthèses IA de toutes les entités marquées 'stale'. Opération longue.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["lead", "project", "partner", "all"], description: "Type d'entité (défaut: all)" },
          max_count: { type: "number", description: "Nombre max à traiter (défaut: 10)" },
        },
      },
    },
  },
  // ============ PHASE 1 - MEMORY ENRICHMENT ============
  {
    type: "function",
    function: {
      name: "save_user_preference",
      description: "Sauvegarde une préférence utilisateur explicite dans la mémoire IA. Appelé quand l'IA détecte une préférence déclarée par l'utilisateur.",
      parameters: {
        type: "object",
        properties: {
          preference_text: { type: "string", description: "Description claire de la préférence (ex: 'préfère les réunions en fin de journée')" },
          category: { type: "string", description: "Catégorie (optionnel, ex: 'communication', 'scheduling', 'format')" },
          importance_score: { type: "number", description: "Score d'importance 0-1 (défaut: 0.8)" },
        },
        required: ["preference_text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_context_insight",
      description: "Sauvegarde un insight contextuel notable détecté dans les données CRM (changement de statut, anomalie, date proche, fait clé). Importance modérée, expire en 30 jours.",
      parameters: {
        type: "object",
        properties: {
          insight_text: { type: "string", description: "Description de l'insight (ex: 'Lead passé de prospect à qualifié')" },
          entity_type: { type: "string", description: "Type d'entité concernée (lead, project, partner, etc.)" },
          entity_id: { type: "string", description: "ID de l'entité (optionnel)" },
          importance_score: { type: "number", description: "Score d'importance 0-1 (défaut: 0.6)" },
        },
        required: ["insight_text"],
      },
    },
  },
  // ============ PHASE 2 - INTERVIEW MODE ============
  {
    type: "function",
    function: {
      name: "detect_missing_fields",
      description: "Détecte les champs critiques manquants d'une entité CRM (lead, opportunity, project). Utilisé quand l'utilisateur consulte une entité ou qu'une action échoue à cause d'un champ manquant. Retourne la liste des champs vides pour guider l'interview.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["lead", "opportunity", "project"], description: "Type d'entité à analyser" },
          entity_id: { type: "string", description: "UUID de l'entité" },
        },
        required: ["entity_type", "entity_id"],
      },
    },
  },
];

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

interface OpportunityRow {
  stage: string;
  value_amount: number | null;
  probability: number | null;
}

interface LeadRow {
  id: string;
  name: string;
  company: string | null;
  qualification_status: string | null;
  message: string | null;
  source_context: string | null;
}

interface TranscriptionRow {
  detected_needs: string[] | null;
  transcript_summary: string | null;
}

// deno-lint-ignore no-explicit-any
async function executeTool(
  supabase: any,
  toolName: string,
  args: Record<string, unknown>,
  conversationHistory?: Array<{ role: string; content: string }>,
  workspaceId?: string,
  userId?: string,
  sessionId?: string
): Promise<unknown> {
  console.log(`Executing tool: ${toolName}`, args);

  switch (toolName) {
    // ============ COCKPIT READS ============
    case "get_leads": {
      // LIMIT AUGMENTÉ pour accès complet (défaut: 50, max: 100)
      const limit = Math.min(args.limit as number || 50, 100);
      
      let query = supabase
        .from("leads")
        .select(`
          id, name, email, company, phone, source, source_context, 
          lead_score, qualification_status, created_at, last_contacted_at,
          position, industry, company_size, city,
          ai_documents_summary, synthesis_stale
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      // Support recherche par nom/company with sanitized input
      if (args.query) {
        const searchQuery = sanitizeSearchInput(args.query as string);
        if (searchQuery) {
          query = query.or(`name.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
        }
      }
      if (args.status) query = query.eq("qualification_status", args.status);
      if (args.source) query = query.eq("source", args.source);

      const { data, error } = await query;
      if (error) throw error;
      
      // Ajouter résumé par statut
      const byStatus = (data || []).reduce((acc: Record<string, number>, l: { qualification_status: string | null }) => {
        const status = l.qualification_status || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // Phase 2: Auto-detect missing critical fields for interview mode
      const criticalLeadFieldsGet = ["email", "phone", "company", "industry", "budget", "source", "position", "city"];
      const leadsWithMissingGet = (data || []).map((lead: any) => {
        const missingFields = criticalLeadFieldsGet.filter(f => !lead[f] || lead[f] === "");
        return { ...lead, missing_critical_fields: missingFields, completion_rate: Math.round(((criticalLeadFieldsGet.length - missingFields.length) / criticalLeadFieldsGet.length) * 100) };
      });

      return { 
        leads: leadsWithMissingGet, 
        count: data?.length || 0, 
        by_status: byStatus,
        consulte_available: (data || []).some((l: any) => l.ai_documents_summary),
        message: `${data?.length || 0} lead(s) récupéré(s)`,
        interview_hint: leadsWithMissingGet.some((l: any) => l.missing_critical_fields.length > 0) 
          ? "⚠️ Certains leads ont des champs critiques manquants. Si l'utilisateur consulte un lead spécifique, pose UNE question sur le premier champ manquant." 
          : null,
      };
    }

    case "search_leads": {
      const searchQuery = sanitizeSearchInput(args.query as string);
      if (!searchQuery) {
        return { leads: [], count: 0, message: "Terme de recherche requis" };
      }

      const { data, error } = await supabase
        .from("leads")
        .select(`
          id, name, email, company, phone, source, source_context, 
          lead_score, qualification_status, created_at, last_contacted_at,
          position, website, linkedin_url, city, industry, company_size,
          ai_documents_summary, synthesis_stale
        `)
        .or(`name.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .order("lead_score", { ascending: false, nullsFirst: false })
        .limit(10);

      if (error) throw error;
      
      // If no results found with exact search, try fuzzy search
      if ((!data || data.length === 0) && searchQuery.length >= 3) {
        console.log(`No exact matches for "${searchQuery}", trying fuzzy search...`);
        
        const { data: fuzzyData, error: fuzzyError } = await supabase
          .rpc("search_entities_fuzzy", {
            search_term: searchQuery,
            entity_types: ["lead"]
          });
        
        if (!fuzzyError && fuzzyData && fuzzyData.length > 0) {
          // Fetch full lead data for fuzzy matches
          const leadIds = fuzzyData.map((f: { entity_id: string }) => f.entity_id);
          const { data: leadsData } = await supabase
            .from("leads")
            .select(`
              id, name, email, company, phone, source, source_context, 
              lead_score, qualification_status, created_at, last_contacted_at,
              position, website, linkedin_url, city, industry, company_size,
              ai_documents_summary, synthesis_stale
            `)
            .in("id", leadIds);
          
          if (leadsData && leadsData.length > 0) {
            return { 
              leads: leadsData,
              count: leadsData.length,
              query: searchQuery,
              search_type: "fuzzy",
              consulte_available: leadsData.some((l: any) => l.ai_documents_summary),
              message: `${leadsData.length} lead(s) trouvé(s) par recherche approximative pour "${searchQuery}"`
            };
          }
        }
      }
      
      // Phase 2: Auto-detect missing critical fields for interview mode
      const criticalLeadFields = ["email", "phone", "company", "industry", "budget", "source", "position", "city"];
      const leadsWithMissing = (data || []).map((lead: any) => {
        const missingFields = criticalLeadFields.filter(f => !lead[f] || lead[f] === "");
        return { ...lead, missing_critical_fields: missingFields, completion_rate: Math.round(((criticalLeadFields.length - missingFields.length) / criticalLeadFields.length) * 100) };
      });

      return { 
        leads: leadsWithMissing,
        count: data?.length || 0,
        query: searchQuery,
        search_type: "exact",
        consulte_available: (data || []).some((l: any) => l.ai_documents_summary),
        message: (data?.length || 0) > 0 
          ? `${data?.length} lead(s) trouvé(s) pour "${searchQuery}"`
          : `Aucun lead trouvé pour "${searchQuery}". Essayez search_fuzzy pour une recherche approximative.`
      };
    }

    case "search_fuzzy": {
      const searchQuery = (args.query as string || "").trim();
      if (!searchQuery || searchQuery.length < 2) {
        return { results: [], count: 0, message: "Terme de recherche trop court (min 2 caractères)" };
      }

      const entityTypes = (args.entity_types as string[]) || ["lead", "project", "partner"];

      const { data, error } = await supabase.rpc("search_entities_fuzzy", {
        search_term: searchQuery,
        entity_types: entityTypes
      });

      if (error) {
        console.error("Fuzzy search error:", error);
        return { results: [], count: 0, error: error.message };
      }

      // Group results by entity type for better readability
      const grouped: Record<string, unknown[]> = {};
      for (const result of (data || [])) {
        const type = result.entity_type;
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push({
          id: result.entity_id,
          name: result.entity_name,
          company: result.entity_company,
          similarity: Math.round(result.similarity_score * 100) + "%"
        });
      }

      return { 
        results: data || [],
        grouped,
        count: data?.length || 0,
        query: searchQuery,
        entity_types: entityTypes,
        message: (data?.length || 0) > 0 
          ? `${data?.length} résultat(s) trouvé(s) par recherche approximative pour "${searchQuery}"`
          : `Aucun résultat trouvé pour "${searchQuery}" même avec recherche approximative`
      };
    }

    // ============ PARTENAIRES (v5.4) ============
    case "get_partners": {
      let query = supabase
        .from("partners")
        .select(`
          id, name, email, company, phone, partner_type, specialties, 
          is_active, commission_rate, notes, slug, created_at,
          ai_documents_summary, synthesis_stale
        `)
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 20);

      if (args.partner_type) query = query.eq("partner_type", args.partner_type);
      if (args.is_active !== false) query = query.eq("is_active", true).is("deleted_at", null);

      const { data, error } = await query;
      if (error) throw error;
      return { 
        partners: data, 
        count: data?.length || 0, 
        consulte_available: (data || []).some((p: any) => p.ai_documents_summary),
        note: "Les partenaires sont différents des leads (clients). Un partenaire est un expert IA, indépendant ou apporteur d'affaires." 
      };
    }

    case "search_partners": {
      const searchQuery = (args.query as string || "").toLowerCase().trim();
      if (!searchQuery) {
        return { error: "Requête de recherche vide", partners: [] };
      }

      const sanitizedQuery = sanitizeSearchInput(searchQuery);
      if (!sanitizedQuery) {
        return { error: "Requête de recherche vide", partners: [] };
      }

      const { data, error } = await supabase
        .from("partners")
        .select(`
          id, name, email, company, phone, partner_type, specialties, 
          is_active, slug, ai_documents_summary, synthesis_stale
        `)
        .is("deleted_at", null)
        .or(`name.ilike.%${sanitizedQuery}%,email.ilike.%${sanitizedQuery}%,company.ilike.%${sanitizedQuery}%,slug.ilike.%${sanitizedQuery}%`)
        .limit(10);

      if (error) throw error;
      return { 
        partners: data, 
        count: data?.length || 0,
        search_query: searchQuery,
        consulte_available: (data || []).some((p: any) => p.ai_documents_summary),
        hint: data?.length === 0 ? "Aucun partenaire trouvé. Pour créer un nouveau partenaire, utilise create_partner." : null
      };
    }

    case "create_partner": {
      const rawName = args.name as string | undefined;
      
      if (!rawName || rawName.trim() === "") {
        return {
          success: false,
          error: "Le nom du partenaire est obligatoire",
          message: "⚠️ Je ne peux pas créer le partenaire. Merci de préciser un nom.",
          autonomy_level: "execution_directe",
        };
      }

      const partnerName = rawName.trim();
      const partnerEmail = (args.email as string || "").trim().toLowerCase();
      
      // Generate slug from name
      const slug = partnerName
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Check for duplicate by email or slug
      if (partnerEmail) {
        const { data: existingByEmail } = await supabase
          .from("partners")
          .select("id, name, slug")
          .eq("email", partnerEmail)
          .is("deleted_at", null)
          .maybeSingle();

        if (existingByEmail) {
          return {
            success: false,
            error: "Un partenaire avec cet email existe déjà",
            existing_partner: existingByEmail,
            message: `⚠️ Le partenaire "${existingByEmail.name}" existe déjà avec cet email.`,
            autonomy_level: "execution_directe",
          };
        }
      }

      const { data: existingBySlug } = await supabase
        .from("partners")
        .select("id, name")
        .eq("slug", slug)
        .is("deleted_at", null)
        .maybeSingle();

      if (existingBySlug) {
        return {
          success: false,
          error: "Un partenaire avec ce nom existe déjà",
          existing_partner: existingBySlug,
          message: `⚠️ Le partenaire "${existingBySlug.name}" existe déjà.`,
          autonomy_level: "execution_directe",
        };
      }

      const partnerData = {
        name: partnerName,
        slug,
        email: partnerEmail || null,
        company: (args.company as string || "").trim() || null,
        phone: (args.phone as string || "").trim() || null,
        partner_type: args.partner_type as string || "independant",
        specialties: args.specialties as string[] || [],
        commission_rate: args.commission_rate as number || null,
        notes: args.notes as string || null,
        is_active: true,
      };

      const { data: newPartner, error } = await supabase
        .from("partners")
        .insert(partnerData)
        .select()
        .single();

      if (error) throw error;

      const typeLabels: Record<string, string> = {
        expert_ia: "Expert IA",
        independant: "Indépendant",
        apporteur: "Apporteur d'affaires",
      };

      return {
        success: true,
        partner: newPartner,
        message: `✅ Partenaire créé : "${partnerName}" (${typeLabels[partnerData.partner_type] || partnerData.partner_type})${partnerEmail ? ` - ${partnerEmail}` : ""}`,
        autonomy_level: "execution_directe",
      };
    }

    case "update_partner": {
      // Find partner by ID or email
      let partnerId = args.partner_id as string;
      
      if (!partnerId && args.email) {
        const { data: foundPartner } = await supabase
          .from("partners")
          .select("id, name")
          .eq("email", (args.email as string).toLowerCase())
          .is("deleted_at", null)
          .maybeSingle();
        
        if (!foundPartner) {
          return {
            success: false,
            error: "Partenaire non trouvé",
            message: `⚠️ Aucun partenaire trouvé avec l'email "${args.email}".`,
            autonomy_level: "execution_directe",
          };
        }
        partnerId = foundPartner.id;
      }

      if (!partnerId) {
        return {
          success: false,
          error: "ID ou email du partenaire requis",
          message: "⚠️ Précisez partner_id ou email pour identifier le partenaire.",
          autonomy_level: "execution_directe",
        };
      }

      const updateData: Record<string, unknown> = {};
      if (args.name) updateData.name = (args.name as string).trim();
      if (args.phone) updateData.phone = (args.phone as string).trim();
      if (args.company) updateData.company = (args.company as string).trim();
      if (args.partner_type) updateData.partner_type = args.partner_type;
      if (args.specialties) updateData.specialties = args.specialties;
      if (args.is_active !== undefined) updateData.is_active = args.is_active;
      if (args.notes) updateData.notes = args.notes;

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: "Aucune modification spécifiée",
          message: "⚠️ Précisez au moins un champ à modifier.",
          autonomy_level: "execution_directe",
        };
      }

      const { data: updatedPartner, error } = await supabase
        .from("partners")
        .update(updateData)
        .eq("id", partnerId)
        .select("id, name, email, partner_type")
        .single();

      if (error) throw error;

      return {
        success: true,
        partner: updatedPartner,
        updated_fields: Object.keys(updateData),
        message: `✅ Partenaire "${updatedPartner.name}" mis à jour : ${Object.keys(updateData).join(", ")}`,
        autonomy_level: "execution_directe",
      };
    }

    case "get_opportunities": {
      // LIMIT AUGMENTÉ pour accès complet (défaut: 50)
      const limit = Math.min(args.limit as number || 50, 100);
      
      let query = supabase
        .from("opportunities")
        .select(`
          id, title, description, stage, value_amount, probability, 
          expected_close_date, created_at, updated_at, source, close_reason,
          lead:leads(id, name, company, email, qualification_status)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (args.stage) query = query.eq("stage", args.stage);
      if (args.min_value) query = query.gte("value_amount", args.min_value);

      const { data, error } = await query;
      if (error) throw error;
      
      // Ajouter un résumé par stage
      const byStage = (data || []).reduce((acc: Record<string, { count: number; value: number }>, o: { stage: string; value_amount: number | null }) => {
        if (!acc[o.stage]) acc[o.stage] = { count: 0, value: 0 };
        acc[o.stage].count++;
        acc[o.stage].value += o.value_amount || 0;
        return acc;
      }, {});
      
      const totalValue = (data || []).reduce((sum: number, o: { value_amount: number | null }) => sum + (o.value_amount || 0), 0);

      return { 
        opportunities: data, 
        count: data?.length || 0,
        by_stage: byStage,
        total_pipeline_value: totalValue,
        message: `${data?.length || 0} opportunité(s) - Valeur totale: ${totalValue.toLocaleString()}€`
      };
    }

    case "get_projects": {
      // LIMIT AUGMENTÉ pour accès complet aux projets (défaut: 50, max: 100)
      const limit = Math.min(args.limit as number || 50, 100);
      
      let query = supabase
        .from("projects")
        .select(`
          id, name, description, status, health_status, 
          budget_amount, consumed_amount, start_date, target_end_date,
          created_at, updated_at, priority,
          ai_documents_summary, synthesis_stale,
          lead:leads(id, name, company, email),
          opportunity:opportunities(id, title, value_amount, stage)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      // Support recherche par nom (insensible à la casse et accents)
      if (args.query) {
        const searchTerm = (args.query as string).trim();
        query = query.ilike("name", `%${searchTerm}%`);
      }
      if (args.status) query = query.eq("status", args.status);
      if (args.health_status) query = query.eq("health_status", args.health_status);

      const { data, error } = await query;
      if (error) throw error;
      
      // Ajouter un résumé par statut pour une meilleure vue d'ensemble
      const byStatus = (data || []).reduce((acc: Record<string, number>, p: { status: string }) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {});

      return { 
        projects: data, 
        count: data?.length || 0,
        by_status: byStatus,
        consulte_available: (data || []).some((p: any) => p.ai_documents_summary),
        message: `${data?.length || 0} projet(s) récupéré(s)${args.query ? ` pour "${args.query}"` : ""}`
      };
    }

    case "search_projects": {
      const searchQuery = (args.query as string || "").trim();
      if (!searchQuery) {
        // Si pas de query, retourner TOUS les projets
        const { data: allProjects, error: allError } = await supabase
          .from("projects")
          .select(`
            id, name, description, status, health_status, 
            budget_amount, start_date, target_end_date, created_at,
            ai_documents_summary, synthesis_stale,
            lead:leads(id, name, company, email),
            opportunity:opportunities(id, title, stage, value_amount)
          `)
          .order("created_at", { ascending: false })
          .limit(50);
        
        if (allError) throw allError;
        return { 
          projects: allProjects, 
          count: allProjects?.length || 0,
          message: `Tous les projets (${allProjects?.length || 0} total)`
        };
      }

      // Recherche par nom de projet with sanitized input
      const sanitizedQuery = sanitizeSearchInput(searchQuery);
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id, name, description, status, health_status, 
          budget_amount, start_date, target_end_date, created_at,
          ai_documents_summary, synthesis_stale,
          lead:leads(id, name, company, email),
          opportunity:opportunities(id, title, stage, value_amount)
        `)
        .ilike("name", `%${sanitizedQuery}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Recherche étendue : aussi dans les leads liés
      const { data: projectsByLead } = await supabase
        .from("projects")
        .select(`
          id, name, description, status, health_status, ai_documents_summary,
          lead:leads(id, name, company, email)
        `)
        .not("lead_id", "is", null)
        .limit(50);
      
      // Merge results without duplicates
      const allProjects = data || [];
      const searchLower = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const leadMatches = (projectsByLead || []).filter((p: any) => {
        const leadName = (p.lead?.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const leadCompany = (p.lead?.company || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const matchesSearch = leadName.includes(searchLower) || leadCompany.includes(searchLower);
        const notAlreadyIncluded = !allProjects.some((ap: { id: string }) => ap.id === p.id);
        return matchesSearch && notAlreadyIncluded;
      });

      const finalResults = [...allProjects, ...leadMatches];

      return { 
        projects: finalResults,
        count: finalResults.length,
        query: searchQuery,
        direct_matches: allProjects.length,
        lead_matches: leadMatches.length,
        consulte_available: finalResults.some((p: any) => p.ai_documents_summary),
        message: finalResults.length > 0 
          ? `${finalResults.length} projet(s) trouvé(s) pour "${searchQuery}" (${allProjects.length} direct, ${leadMatches.length} via lead)`
          : `Aucun projet trouvé pour "${searchQuery}". Essayez search_fuzzy.`
      };
    }

    case "search_solutions": {
      const searchQuery = sanitizeSearchInput(args.query as string);
      if (!searchQuery) {
        return { solutions: [], count: 0, message: "Terme de recherche requis" };
      }

      const { data, error } = await supabase
        .from("articles")
        .select(`
          id, title, slug, excerpt, content, published, published_at,
          cover_image_url, ai_documents_summary, synthesis_stale
        `)
        .eq("resource_type", "solution")
        .or(`title.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%`)
        .order("title")
        .limit(10);

      if (error) throw error;
      
      return { 
        solutions: data,
        count: data?.length || 0,
        query: searchQuery,
        consulte_available: (data || []).some((s: any) => s.ai_documents_summary),
        message: (data?.length || 0) > 0 
          ? `${data?.length} solution(s) trouvée(s) pour "${searchQuery}"`
          : `Aucune solution trouvée pour "${searchQuery}"`
      };
    }

    case "search_documents": {
      const searchQuery = sanitizeSearchInput(args.query as string);
      if (!searchQuery) {
        return { documents: [], count: 0, message: "Terme de recherche requis" };
      }

      let query = supabase
        .from("generated_documents")
        .select(`
          id, title, document_type, status, version, ai_generated, 
          ai_documents_summary, synthesis_stale, created_at, updated_at,
          lead:leads(id, name, company),
          project:projects(id, name)
        `)
        .ilike("title", `%${searchQuery}%`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (args.document_type) query = query.eq("document_type", args.document_type);

      const { data, error } = await query;
      if (error) throw error;
      
      return { 
        documents: data,
        count: data?.length || 0,
        query: searchQuery,
        consulte_available: (data || []).some((d: any) => d.ai_documents_summary),
        message: (data?.length || 0) > 0 
          ? `${data?.length} document(s) trouvé(s) pour "${searchQuery}"`
          : `Aucun document trouvé pour "${searchQuery}"`
      };
    }

    case "search_transcriptions": {
      const searchQuery = (args.query as string || "").trim();
      if (!searchQuery) {
        return { transcriptions: [], count: 0, message: "Terme de recherche requis" };
      }

      const { data, error } = await supabase
        .from("voice_transcriptions")
        .select(`
          id, title, transcript_summary, detected_needs, action_items,
          key_decisions, next_steps, status, duration_seconds, created_at,
          lead:leads(id, name, company),
          project:projects(id, name),
          partner:partners(id, name)
        `)
        .or(`transcript_summary.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`)
        .eq("status", "done")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      
      return { 
        transcriptions: data,
        count: data?.length || 0,
        query: searchQuery,
        message: (data?.length || 0) > 0 
          ? `${data?.length} transcription(s) trouvée(s) pour "${searchQuery}"`
          : `Aucune transcription trouvée pour "${searchQuery}"`
      };
    }

    case "search_specifications": {
      const searchQuery = (args.query as string || "").trim();
      if (!searchQuery) {
        return { specifications: [], count: 0, message: "Terme de recherche requis" };
      }

      const { data, error } = await supabase
        .from("specifications")
        .select(`
          id, title, description, status, version, 
          functional_requirements, technical_requirements,
          created_at, updated_at,
          project:projects(id, name, ai_documents_summary),
          lead:leads(id, name, company)
        `)
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      
      return { 
        specifications: data,
        count: data?.length || 0,
        query: searchQuery,
        message: (data?.length || 0) > 0 
          ? `${data?.length} cahier(s) des charges trouvé(s) pour "${searchQuery}"`
          : `Aucun CDC trouvé pour "${searchQuery}"`
      };
    }

    case "get_tasks": {
      let query = supabase
        .from("tasks")
        .select(`
          id, title, description, task_type, priority, status, 
          due_date, due_time, created_at,
          lead:leads(id, name),
          project:projects(id, name)
        `)
        .order("due_date", { ascending: true })
        .limit(args.limit as number || 20);

      if (args.status) query = query.eq("status", args.status);
      if (args.priority) query = query.eq("priority", args.priority);
      if (args.overdue_only) {
        query = query.lt("due_date", new Date().toISOString().split("T")[0]);
        query = query.neq("status", "completed");
      }

      const { data, error } = await query;
      if (error) throw error;
      return { tasks: data, count: data?.length || 0 };
    }

    case "get_transcriptions": {
      let query = supabase
        .from("voice_transcriptions")
        .select(`
          id, title, raw_transcript, transcript_summary, detected_needs, 
          action_items, key_decisions, next_steps, status, created_at,
          lead:leads(id, name, company, ai_documents_summary),
          project:projects(id, name, ai_documents_summary)
        `)
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 5);

      if (args.lead_id) query = query.eq("lead_id", args.lead_id);
      if (args.project_id) query = query.eq("project_id", args.project_id);

      const { data, error } = await query;
      if (error) throw error;
      return { transcriptions: data, count: data?.length || 0 };
    }

    case "get_meeting_notes": {
      let query = supabase
        .from("meeting_notes")
        .select(`
          id, notes, objectives, next_steps, action_items, ai_summary, 
          duration_minutes, created_at, updated_at,
          booking:bookings(id, name, email, company, start_time),
          project:projects(id, name),
          opportunity:opportunities(id, title)
        `)
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 10);

      if (args.booking_id) query = query.eq("booking_id", args.booking_id);
      if (args.project_id) query = query.eq("project_id", args.project_id);
      if (args.opportunity_id) query = query.eq("opportunity_id", args.opportunity_id);

      const { data, error } = await query;
      if (error) throw error;
      return { meeting_notes: data, count: data?.length || 0 };
    }

    case "get_specifications": {
      let query = supabase
        .from("specifications")
        .select(`
          id, title, description, content, status, version, 
          functional_requirements, technical_requirements, constraints,
          created_at, updated_at,
          project:projects(id, name),
          lead:leads(id, name, company)
        `)
        .order("updated_at", { ascending: false })
        .limit(args.limit as number || 10);

      if (args.project_id) query = query.eq("project_id", args.project_id);
      if (args.status) query = query.eq("status", args.status);

      const { data, error } = await query;
      if (error) throw error;
      return { specifications: data, count: data?.length || 0 };
    }

    case "get_generated_documents": {
      let query = supabase
        .from("generated_documents")
        .select(`
          id, title, document_type, status, version, ai_generated, 
          ai_documents_summary, synthesis_stale,
          content_json, created_at, updated_at, sent_at, sent_to,
          lead:leads(id, name, company, email),
          project:projects(id, name),
          opportunity:opportunities(id, title)
        `)
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 10);

      if (args.document_type) query = query.eq("document_type", args.document_type);
      if (args.status) query = query.eq("status", args.status);
      if (args.lead_id) query = query.eq("lead_id", args.lead_id);
      if (args.project_id) query = query.eq("project_id", args.project_id);

      const { data, error } = await query;
      if (error) throw error;
      return { 
        documents: data, 
        count: data?.length || 0,
        consulte_available: (data || []).some((d: any) => d.ai_documents_summary)
      };
    }

    case "get_solution_leads": {
      let query = supabase
        .from("solution_leads")
        .select(`
          id, interest_level, commercial_notes, detected_at, created_at,
          lead:leads(id, name, email, company, qualification_status, lead_score),
          solution:articles!solution_leads_solution_id_fkey(id, title, slug)
        `)
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 20);

      if (args.solution_id) query = query.eq("solution_id", args.solution_id);
      if (args.lead_id) query = query.eq("lead_id", args.lead_id);
      if (args.interest_level) query = query.eq("interest_level", args.interest_level);

      const { data, error } = await query;
      if (error) throw error;
      return { solution_leads: data, count: data?.length || 0 };
    }

    case "get_activity_log": {
      let query = supabase
        .from("activity_log")
        .select("id, entity_type, entity_id, activity_type, title, content, created_at, is_ai_generated, visibility, ai_metadata")
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 20);

      if (args.entity_type) query = query.eq("entity_type", args.entity_type);
      if (args.entity_id) query = query.eq("entity_id", args.entity_id);
      if (args.activity_type) query = query.eq("activity_type", args.activity_type);

      const { data, error } = await query;
      if (error) throw error;
      return { activities: data, count: data?.length || 0 };
    }

    case "get_pipeline_stats": {
      const { data: opportunities, error } = await supabase
        .from("opportunities")
        .select("stage, value_amount, probability");

      if (error) throw error;

      const stages = ["lead", "qualified", "proposal", "negotiation", "closed_won", "lost"];
      const opps = (opportunities || []) as OpportunityRow[];
      const stats = stages.reduce((acc, stage) => {
        const stageOpps = opps.filter((o: OpportunityRow) => o.stage === stage);
        acc[stage] = {
          count: stageOpps.length,
          total_value: stageOpps.reduce((sum: number, o: OpportunityRow) => sum + (o.value_amount || 0), 0),
          weighted_value: stageOpps.reduce((sum: number, o: OpportunityRow) => sum + ((o.value_amount || 0) * (o.probability || 0) / 100), 0),
        };
        return acc;
      }, {} as Record<string, { count: number; total_value: number; weighted_value: number }>);

      const totalValue = opps.reduce((sum: number, o: OpportunityRow) => sum + (o.value_amount || 0), 0);
      const wonValue = stats.closed_won?.total_value || 0;
      const lostValue = stats.lost?.total_value || 0;
      const conversionRate = totalValue > 0 ? (wonValue / (wonValue + lostValue) * 100) : 0;

      return {
        by_stage: stats,
        total_opportunities: opportunities?.length || 0,
        total_pipeline_value: totalValue,
        conversion_rate: conversionRate.toFixed(1) + "%",
      };
    }

    case "get_pending_ai_notifications": {
      let query = supabase
        .from("activity_log")
        .select("id, entity_type, entity_id, activity_type, title, content, created_at, metadata")
        .eq("pending_ai_review", true)
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 20);

      if (args.entity_type) query = query.eq("entity_type", args.entity_type);

      const { data, error } = await query;
      if (error) throw error;

      const notifications = data || [];
      const summary = notifications.reduce((acc: Record<string, number>, n: { entity_type: string }) => {
        acc[n.entity_type] = (acc[n.entity_type] || 0) + 1;
        return acc;
      }, {});

      return { 
        notifications,
        count: notifications.length,
        summary,
        message: notifications.length > 0 
          ? `${notifications.length} nouvelle(s) notification(s) à traiter`
          : "Aucune nouvelle notification"
      };
    }

    case "mark_notifications_reviewed": {
      const ids = args.notification_ids as string[];
      if (!ids || ids.length === 0) {
        return { success: false, error: "Aucun ID fourni" };
      }

      const { data, error } = await supabase.rpc("mark_ai_notifications_reviewed", {
        p_ids: ids
      });

      if (error) throw error;

      return { 
        success: true, 
        marked_count: data,
        message: `${data} notification(s) marquée(s) comme lue(s)`
      };
    }

    // ============ ADMIN READS ============
    case "get_articles": {
      let query = supabase
        .from("articles")
        .select("id, title, slug, excerpt, resource_type, published, published_at, cover_image_url")
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 10);

      if (args.resource_type) query = query.eq("resource_type", args.resource_type);
      if (args.published_only !== false) query = query.eq("published", true);

      const { data, error } = await query;
      if (error) throw error;
      return { articles: data, count: data?.length || 0 };
    }

    case "get_solutions": {
      let query = supabase
        .from("articles")
        .select(`
          id, title, slug, excerpt, cover_image_url, published,
          ai_documents_summary, synthesis_stale
        `)
        .eq("resource_type", "solution")
        .order("title");

      if (args.published_only !== false) query = query.eq("published", true);

      const { data, error } = await query;
      if (error) throw error;
      return { 
        solutions: data, 
        count: data?.length || 0,
        consulte_available: (data || []).some((s: any) => s.ai_documents_summary)
      };
    }

    case "get_article_details": {
      // Validate article_id as UUID and sanitize slug
      const articleId = sanitizeUUID(args.article_id as string);
      const articleSlug = sanitizeSearchInput(args.slug as string, 100);
      
      if (!articleId && !articleSlug) {
        return { error: "article_id ou slug requis" };
      }

      // Build query with validated inputs
      let query = supabase
        .from("articles")
        .select(`
          id, title, slug, content, excerpt, resource_type, published, published_at,
          cover_image_url, author, meta_title, meta_description, faq, created_at, updated_at
        `);
      
      if (articleId) {
        query = query.eq("id", articleId);
      } else if (articleSlug) {
        query = query.eq("slug", articleSlug);
      }
      
      const { data: article, error } = await query.single();

      if (error) throw error;

      // Get categories
      const { data: categories } = await supabase
        .from("article_categories")
        .select("category:categories(id, name, slug)")
        .eq("article_id", article.id);

      // Get tags
      const { data: tags } = await supabase
        .from("article_tags")
        .select("tag:tags(id, name)")
        .eq("article_id", article.id);

      // Get views count
      const { count: viewsCount } = await supabase
        .from("article_views")
        .select("*", { count: "exact", head: true })
        .eq("article_id", article.id);

      // Get comments count
      const { count: commentsCount } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("article_id", article.id)
        .eq("approved", true);

      return {
        article,
        categories: categories?.map((c: any) => c.category) || [],
        tags: tags?.map((t: any) => t.tag) || [],
        stats: {
          views: viewsCount || 0,
          comments: commentsCount || 0,
        },
      };
    }

    case "get_categories_tags": {
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name");

      const { data: tags } = await supabase
        .from("tags")
        .select("id, name")
        .order("name");

      return {
        categories: categories || [],
        tags: tags || [],
      };
    }

    case "get_contacts": {
      let query = supabase
        .from("contacts")
        .select("id, name, email, company, subject, message, source, source_context, created_at")
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 10);

      if (args.source) query = query.eq("source", args.source);

      const { data, error } = await query;
      if (error) throw error;
      return { contacts: data, count: data?.length || 0 };
    }

    case "get_newsletters": {
      const { data: newsletters, error } = await supabase
        .from("newsletters")
        .select("id, subject, content, status, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 10);

      if (error) throw error;

      // Get subscriber count
      const { count: subscriberCount } = await supabase
        .from("newsletter_subscribers")
        .select("*", { count: "exact", head: true });

      if (args.status) {
        const filtered = newsletters?.filter((n: any) => n.status === args.status);
        return { newsletters: filtered, subscriber_count: subscriberCount || 0 };
      }

      return { newsletters: newsletters || [], subscriber_count: subscriberCount || 0 };
    }

    case "get_forms": {
      let query = supabase
        .from("forms")
        .select("id, title, slug, description, is_active, views_count, submissions_count, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 10);

      if (args.active_only !== false) query = query.eq("is_active", true);

      const { data, error } = await query;
      if (error) throw error;

      // Calculate conversion rates
      const formsWithStats = data?.map((f: any) => ({
        ...f,
        conversion_rate: f.views_count > 0 ? ((f.submissions_count / f.views_count) * 100).toFixed(1) + "%" : "0%",
      }));

      return { forms: formsWithStats, count: data?.length || 0 };
    }

    case "get_form_responses": {
      const { data, error } = await supabase
        .from("form_responses")
        .select("id, data, metadata, submitted_at, is_complete")
        .eq("form_id", args.form_id)
        .order("submitted_at", { ascending: false })
        .limit(args.limit as number || 20);

      if (error) throw error;

      // Get form info
      const { data: form } = await supabase
        .from("forms")
        .select("title, slug")
        .eq("id", args.form_id)
        .single();

      return { 
        form_title: form?.title,
        responses: data, 
        count: data?.length || 0 
      };
    }

    case "get_brochures": {
      let query = supabase
        .from("brochures")
        .select("id, title, slug, cover_title, cover_subtitle, published, views_count, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 10);

      if (args.published_only !== false) query = query.eq("published", true);

      const { data, error } = await query;
      if (error) throw error;
      return { brochures: data, count: data?.length || 0 };
    }

    case "get_atelier_inscriptions": {
      let query = supabase
        .from("atelier_inscriptions")
        .select(`
          id, created_at,
          atelier:articles!atelier_inscriptions_atelier_id_fkey(id, title, slug, event_date),
          lead:leads(id, name, email, company)
        `)
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 20);

      if (args.atelier_id) query = query.eq("atelier_id", args.atelier_id);

      const { data, error } = await query;
      if (error) throw error;
      return { inscriptions: data, count: data?.length || 0 };
    }

    case "get_comments": {
      let query = supabase
        .from("comments")
        .select(`
          id, author_name, author_email, content, approved, created_at,
          article:articles(id, title, slug)
        `)
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 20);

      if (args.article_id) query = query.eq("article_id", args.article_id);
      if (args.approved_only) query = query.eq("approved", true);

      const { data, error } = await query;
      if (error) throw error;
      return { comments: data, count: data?.length || 0 };
    }

    case "get_cta_analytics": {
      const days = args.days as number || 30;
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      let query = supabase
        .from("cta_clicks")
        .select("id, cta_name, source_page, source_context, clicked_at")
        .gte("clicked_at", sinceDate.toISOString())
        .order("clicked_at", { ascending: false });

      if (args.cta_name) query = query.eq("cta_name", args.cta_name);

      const { data, error } = await query;
      if (error) throw error;

      // Group by CTA name
      const clickData = data || [];
      const byCta = clickData.reduce((acc: Record<string, number>, click: any) => {
        acc[click.cta_name] = (acc[click.cta_name] || 0) + 1;
        return acc;
      }, {});

      const bySource = clickData.reduce((acc: Record<string, number>, click: any) => {
        acc[click.source_page] = (acc[click.source_page] || 0) + 1;
        return acc;
      }, {});

      return {
        total_clicks: clickData.length,
        by_cta: byCta,
        by_source: bySource,
        period_days: days,
      };
    }

    case "get_bookings": {
      let query = supabase
        .from("bookings")
        .select(`
          id, name, email, company, phone, message, status, 
          start_time, end_time, meeting_type, google_meet_link, zoom_join_url, notes,
          booking_type:booking_types(name, duration_minutes, slug),
          lead:leads(id, name, company, qualification_status)
        `)
        .order("start_time", { ascending: true })
        .limit(args.limit as number || 10);

      if (args.status) query = query.eq("status", args.status);
      if (args.meeting_type) query = query.eq("meeting_type", args.meeting_type);
      if (args.upcoming_only) query = query.gte("start_time", new Date().toISOString());
      if (args.start_date) query = query.gte("start_time", args.start_date);
      if (args.end_date) query = query.lte("start_time", args.end_date + "T23:59:59");

      const { data, error } = await query;
      if (error) throw error;
      return { bookings: data, count: data?.length || 0 };
    }

    case "get_booking_details": {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select(`
          id, name, email, company, phone, message, status, 
          start_time, end_time, meeting_type, google_meet_link, zoom_join_url, notes,
          google_event_id, created_at, updated_at,
          booking_type:booking_types(id, name, duration_minutes, slug, description),
          lead:leads(id, name, email, company, phone, qualification_status, lead_score, source)
        `)
        .eq("id", args.booking_id)
        .single();

      if (error) throw error;

      // Get associated meeting notes if any
      const { data: meetingNotes } = await supabase
        .from("meeting_notes")
        .select("id, notes, objectives, next_steps, action_items, ai_summary, created_at")
        .eq("booking_id", args.booking_id)
        .order("created_at", { ascending: false })
        .limit(1);

      return { 
        booking, 
        meeting_notes: meetingNotes?.[0] || null,
        has_meeting_notes: (meetingNotes?.length || 0) > 0
      };
    }

    case "get_agenda_summary": {
      const now = new Date();
      const period = args.period as string || "this_week";
      
      let startDate: Date;
      let endDate: Date;
      
      switch (period) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case "tomorrow":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);
          break;
        case "this_week": {
          const dayOfWeek = now.getDay();
          const monday = new Date(now);
          monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
          monday.setHours(0, 0, 0, 0);
          startDate = monday;
          endDate = new Date(monday);
          endDate.setDate(monday.getDate() + 6);
          endDate.setHours(23, 59, 59);
          break;
        }
        case "next_week": {
          const dayOfWeek = now.getDay();
          const nextMonday = new Date(now);
          nextMonday.setDate(now.getDate() + (7 - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)));
          nextMonday.setHours(0, 0, 0, 0);
          startDate = nextMonday;
          endDate = new Date(nextMonday);
          endDate.setDate(nextMonday.getDate() + 6);
          endDate.setHours(23, 59, 59);
          break;
        }
        case "this_month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59);
      }

      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(`
          id, name, email, company, status, start_time, end_time, meeting_type,
          booking_type:booking_types(name, slug),
          lead:leads(id, name, company)
        `)
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;

      const bookingList = bookings || [];
      const confirmed = bookingList.filter((b: any) => b.status === "confirmed");
      const pending = bookingList.filter((b: any) => b.status === "pending");
      const cancelled = bookingList.filter((b: any) => b.status === "cancelled");
      
      const byType = {
        visio: bookingList.filter((b: any) => b.meeting_type === "visio").length,
        telephone: bookingList.filter((b: any) => b.meeting_type === "telephone").length,
        presentiel: bookingList.filter((b: any) => b.meeting_type === "presentiel").length,
      };

      // Get today's bookings specifically for "today" or "this_week"
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const todayBookings = bookingList.filter((b: any) => {
        const bDate = new Date(b.start_time);
        return bDate >= todayStart && bDate <= todayEnd;
      });

      return {
        period,
        period_start: startDate.toISOString().split("T")[0],
        period_end: endDate.toISOString().split("T")[0],
        total_bookings: bookingList.length,
        confirmed: confirmed.length,
        pending: pending.length,
        cancelled: cancelled.length,
        by_meeting_type: byType,
        today_count: todayBookings.length,
        today_bookings: todayBookings.map((b: any) => ({
          id: b.id,
          time: new Date(b.start_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          name: b.name,
          company: b.company,
          type: b.meeting_type,
          booking_type: (b.booking_type as any)?.name,
        })),
        upcoming: bookingList.slice(0, 5).map((b: any) => ({
          id: b.id,
          date: new Date(b.start_time).toLocaleDateString("fr-FR"),
          time: new Date(b.start_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          name: b.name,
          company: b.company,
          type: b.meeting_type,
          status: b.status,
        })),
      };
    }

    case "suggest_booking_action": {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select(`
          id, name, email, company, status, start_time, meeting_type,
          booking_type:booking_types(name),
          lead:leads(id, name)
        `)
        .eq("id", args.booking_id)
        .single();

      if (error) throw error;

      const action = args.action as string;
      const bookingInfo = booking as any;
      const bookingDate = new Date(bookingInfo.start_time).toLocaleDateString("fr-FR");
      const bookingTime = new Date(bookingInfo.start_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

      let suggestion: {
        action: string;
        booking_id: string;
        booking_summary: string;
        message: string;
        action_required: string;
        notes?: string;
        reason?: string;
      };

      switch (action) {
        case "reschedule":
          suggestion = {
            action: "reschedule",
            booking_id: args.booking_id as string,
            booking_summary: `${bookingInfo.name} - ${bookingDate} ${bookingTime}`,
            reason: args.reason as string,
            message: `Suggestion de reporter le RDV avec ${bookingInfo.name} (${bookingDate} ${bookingTime}). Raison: ${args.reason || "non spécifiée"}.`,
            action_required: "Contactez le prospect pour proposer une nouvelle date via /rendez-vous.",
          };
          break;
        case "add_notes":
          suggestion = {
            action: "add_notes",
            booking_id: args.booking_id as string,
            booking_summary: `${bookingInfo.name} - ${bookingDate} ${bookingTime}`,
            notes: args.notes as string,
            message: `Notes à ajouter pour le RDV avec ${bookingInfo.name}: "${args.notes}"`,
            action_required: "Ouvrez la fiche RDV pour ajouter ces notes.",
          };
          break;
        case "send_reminder":
          suggestion = {
            action: "send_reminder",
            booking_id: args.booking_id as string,
            booking_summary: `${bookingInfo.name} - ${bookingDate} ${bookingTime}`,
            message: `Suggestion d'envoyer un rappel pour le RDV avec ${bookingInfo.name} prévu le ${bookingDate} à ${bookingTime}.`,
            action_required: "Envoyez un email de rappel avec les détails du RDV.",
          };
          break;
        case "prepare_meeting":
          suggestion = {
            action: "prepare_meeting",
            booking_id: args.booking_id as string,
            booking_summary: `${bookingInfo.name} - ${bookingDate} ${bookingTime}`,
            message: `Préparation suggérée pour le RDV avec ${bookingInfo.name}: Consultez la fiche lead, les transcriptions précédentes, et préparez une présentation adaptée.`,
            action_required: "Consultez les informations du lead et préparez votre pitch.",
          };
          break;
        default:
          suggestion = {
            action: action,
            booking_id: args.booking_id as string,
            booking_summary: `${bookingInfo.name} - ${bookingDate} ${bookingTime}`,
            message: `Action "${action}" suggérée pour le RDV.`,
            action_required: "Validez cette action dans le module agenda.",
          };
      }

      return {
        success: true,
        suggestion,
        autonomy_level: "N1",
      };
    }

    case "search_knowledge_base": {
      // Build conversation context from recent messages (last 3)
      let conversationContext = "";
      if (conversationHistory && conversationHistory.length > 0) {
        const recentMessages = conversationHistory.slice(-3);
        conversationContext = recentMessages
          .map((m: { role: string; content: string }) => `[${m.role}]: ${m.content}`)
          .join("\n");
      }

      // Call search-embeddings with RAG synthesis enabled
      const searchResponse = await fetch(`${SUPABASE_URL}/functions/v1/search-embeddings`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: args.query,
          filter_types: args.filter_types,
          match_count: 8,
          match_threshold: 0.65,
          synthesize: true,
          conversation_context: conversationContext,
          entity_context: args.entity_context || null,
        }),
      });

      if (!searchResponse.ok) {
        throw new Error("Knowledge base search failed");
      }

      const searchResult = await searchResponse.json();
      
      // If synthesis succeeded, return synthesized response
      if (searchResult.synthesized && searchResult.synthesis) {
        return {
          synthesis: searchResult.synthesis,
          sources: searchResult.results?.map((r: any) => ({
            title: r.resource_title,
            type: r.resource_type,
            slug: r.resource_slug,
            similarity: (r.similarity * 100).toFixed(1) + "%",
          })) || [],
          sources_count: searchResult.sources_count || 0,
          query: args.query,
        };
      }

      // Fallback: raw results
      return {
        results: searchResult.results?.map((r: any) => ({
          title: r.resource_title,
          type: r.resource_type,
          slug: r.resource_slug,
          excerpt: r.content_chunk?.substring(0, 300) + "...",
          similarity: (r.similarity * 100).toFixed(1) + "%",
        })) || [],
        query: args.query,
      };
    }

    // ============ COCKPIT WRITES (N1) ============
    case "create_task": {
      // VALIDATION du champ obligatoire
      const rawTaskTitle = args.title as string | undefined;
      
      if (!rawTaskTitle || rawTaskTitle.trim() === "") {
        return {
          success: false,
          error: "Le titre de la tâche est obligatoire",
          message: `⚠️ Je ne peux pas créer la tâche. Merci de préciser un titre.`,
          autonomy_level: "proposal",
        };
      }
      
      const title = rawTaskTitle.trim();
      
      // Auto-extract time from title if not provided
      let dueTime = args.due_time as string | null;
      
      if (!dueTime && title) {
        // Regex patterns for French time formats
        const timePatterns = [
          /à\s*(\d{1,2})[h:](\d{2})?/i,  // "à 14h" or "à 14h30" or "à 14:30"
          /pour\s*(\d{1,2})[h:](\d{2})?/i,  // "pour 10h" or "pour 10h30"
          /(\d{1,2})[h:](\d{2})\b/,  // "14h30" or "14:30"
          /RDV\s*(\d{1,2})[h:](\d{2})?/i,  // "RDV 14h"
        ];
        
        for (const pattern of timePatterns) {
          const match = title.match(pattern);
          if (match) {
            const hours = match[1].padStart(2, '0');
            const minutes = (match[2] || '00').padStart(2, '0');
            dueTime = `${hours}:${minutes}`;
            break;
          }
        }
      }
      
      // CREATE ACTION PROPOSAL (Phase 3)
      const actionPayload = {
        title: title,
        description: args.description as string || null,
        task_type: args.task_type as string || "follow_up",
        priority: args.priority as string || "medium",
        due_date: args.due_date as string || null,
        due_time: dueTime,
        lead_id: args.lead_id as string || null,
        project_id: args.project_id as string || null,
        opportunity_id: args.opportunity_id as string || null,
      };

      const { data: proposal, error: proposalError } = await supabase
        .from("action_proposals")
        .insert({
          workspace_id: "00000000-0000-0000-0000-000000000001",
          action_type: "create_task",
          action_label: `Créer tâche: "${title}"`,
          action_payload: actionPayload,
          status: "pending",
          ai_reasoning: args.reasoning || "Task création proposée par l'IA",
          user_id: userId || null,
        })
        .select("id")
        .single();

      if (proposalError) throw proposalError;

      return {
        success: true,
        proposal_id: proposal.id,
        action_type: "create_task",
        message: `📋 Proposition créée: Créer tâche "${title}". Valide-la dans le cockpit pour l'exécuter.`,
        autonomy_level: "proposal",
        action_details: actionPayload,
      };
    }

    case "update_lead_qualification": {
      // N1: Suggest only, don't actually update
      const { data: lead, error } = await supabase
        .from("leads")
        .select("id, name, qualification_status")
        .eq("id", args.lead_id)
        .single();

      if (error) throw error;

      return {
        success: true,
        suggestion: {
          lead_id: args.lead_id,
          lead_name: lead.name,
          current_status: lead.qualification_status,
          suggested_status: args.new_status,
          reason: args.reason,
        },
        message: `Suggestion de changement de qualification pour ${lead.name}: ${lead.qualification_status} → ${args.new_status}. Raison: ${args.reason}`,
        autonomy_level: "N1",
        action_required: "Validez ce changement dans la fiche lead.",
      };
    }

    case "draft_followup_email": {
      // Delegate to existing generate-followup-email function
      const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-followup-email`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead_id: args.lead_id,
          email_type: args.email_type,
          custom_context: args.custom_context,
        }),
      });

      if (!emailResponse.ok) {
        throw new Error("Email generation failed");
      }

      const emailResult = await emailResponse.json();
      return {
        success: true,
        email: emailResult.email,
        lead_name: emailResult.lead_name,
        lead_email: emailResult.lead_email,
        message: `Brouillon d'email "${args.email_type}" généré pour ${emailResult.lead_name}.`,
        autonomy_level: "N1",
        action_required: "Relisez et envoyez manuellement.",
      };
    }

    case "get_email_drafts": {
      const limit = Math.min(args.limit as number || 20, 50);
      const statusFilter = args.status as string || "pending_review";
      
      let query = supabase
        .from("activity_log")
        .select(`
          id, title, content, created_at, ai_metadata, metadata,
          lead:leads(id, name, email, company)
        `)
        .eq("activity_type", "email_draft_generated")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (args.lead_id) {
        query = query.eq("lead_id", args.lead_id);
      }
      
      // Filter by status if not "all"
      if (statusFilter !== "all") {
        query = query.eq("metadata->>draft_status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const drafts = (data || []).map((d: any) => ({
        id: d.id,
        created_at: d.created_at,
        lead_name: d.lead?.name || d.ai_metadata?.recipient_name,
        lead_email: d.lead?.email || d.ai_metadata?.recipient_email,
        company: d.lead?.company,
        email_type: d.ai_metadata?.email_type,
        subject: d.ai_metadata?.email_data?.subject || d.metadata?.email_subject,
        status: d.metadata?.draft_status || "pending_review",
        preview: d.ai_metadata?.email_data?.body?.substring(0, 200) + "...",
      }));

      const pendingCount = drafts.filter((d: any) => d.status === "pending_review").length;
      const sentCount = drafts.filter((d: any) => d.status === "sent").length;

      return {
        drafts,
        count: drafts.length,
        pending_count: pendingCount,
        sent_count: sentCount,
        message: `${drafts.length} brouillon(s) d'email trouvé(s) (${pendingCount} en attente, ${sentCount} envoyé(s))`,
        hint: pendingCount > 0 
          ? "💡 Utilisez send_email_draft(draft_id) pour envoyer un brouillon, ou indiquez à l'utilisateur de consulter la section 'Brouillons emails' dans le cockpit."
          : null,
      };
    }

    case "send_email_draft": {
      const draftId = args.draft_id as string;
      
      if (!draftId) {
        return {
          success: false,
          error: "draft_id est obligatoire",
          message: "⚠️ Précisez l'ID du brouillon à envoyer.",
        };
      }

      // Fetch the draft
      const { data: draft, error: draftError } = await supabase
        .from("activity_log")
        .select(`
          id, content, ai_metadata, metadata,
          lead:leads(id, name, email)
        `)
        .eq("id", draftId)
        .eq("activity_type", "email_draft_generated")
        .single();

      if (draftError || !draft) {
        return {
          success: false,
          error: "Brouillon non trouvé",
          message: `⚠️ Aucun brouillon trouvé avec l'ID "${draftId}".`,
        };
      }

      const draftData = draft as any;
      const emailData = draftData.ai_metadata?.email_data;
      const recipientEmail = draftData.ai_metadata?.recipient_email || draftData.lead?.email;

      if (!emailData || !recipientEmail) {
        return {
          success: false,
          error: "Données email incomplètes",
          message: "⚠️ Ce brouillon ne contient pas assez d'informations pour être envoyé.",
        };
      }

      // Send via transactional email function
      const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject: emailData.subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <p>${emailData.greeting}</p>
              <div>${emailData.body}</div>
              ${emailData.cta ? `
                <p style="margin: 24px 0;">
                  <a href="${emailData.cta_url}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                    ${emailData.cta}
                  </a>
                </p>
              ` : ""}
              <p>${(emailData.signature || "").replace(/\n/g, "<br>")}</p>
            </div>
          `,
          source_type: "email_draft",
          source_id: draftId,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        return {
          success: false,
          error: "Échec de l'envoi",
          message: `⚠️ L'email n'a pas pu être envoyé: ${errorText}`,
        };
      }

      // Update draft status to sent
      await supabase
        .from("activity_log")
        .update({
          metadata: {
            ...draftData.metadata,
            draft_status: "sent",
            sent_at: new Date().toISOString(),
          },
          ai_metadata: {
            ...draftData.ai_metadata,
            validated_by_human: true,
          },
        })
        .eq("id", draftId);

      return {
        success: true,
        message: `✅ Email envoyé à ${recipientEmail} avec le sujet "${emailData.subject}"`,
        recipient: recipientEmail,
        subject: emailData.subject,
        autonomy_level: "execution_directe",
      };
    }

    case "cleanup_old_drafts": {
      const daysOld = (args.days_old as number) || 30;
      const dryRun = args.dry_run === true;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffISO = cutoffDate.toISOString();

      // Find old drafts that were never sent
      const { data: oldDrafts, error: findError } = await supabase
        .from("activity_log")
        .select("id, created_at, ai_metadata, metadata")
        .eq("activity_type", "email_draft_generated")
        .lt("created_at", cutoffISO);

      if (findError) throw findError;

      // Filter to only pending_review (not sent)
      const draftsToDelete = (oldDrafts || []).filter((d: any) => {
        const status = d.metadata?.draft_status;
        return !status || status === "pending_review";
      });

      if (dryRun) {
        return {
          success: true,
          dry_run: true,
          count: draftsToDelete.length,
          message: `🔍 ${draftsToDelete.length} brouillon(s) de plus de ${daysOld} jours seraient supprimés.`,
          autonomy_level: "informational",
        };
      }

      if (draftsToDelete.length === 0) {
        return {
          success: true,
          count: 0,
          message: `✅ Aucun brouillon expiré à nettoyer (seuil: ${daysOld} jours).`,
          autonomy_level: "execution_directe",
        };
      }

      const idsToDelete = draftsToDelete.map((d: any) => d.id);

      const { error: deleteError } = await supabase
        .from("activity_log")
        .delete()
        .in("id", idsToDelete);

      if (deleteError) throw deleteError;

      return {
        success: true,
        count: idsToDelete.length,
        message: `🧹 ${idsToDelete.length} brouillon(s) expiré(s) supprimé(s) (> ${daysOld} jours).`,
        autonomy_level: "execution_directe",
      };
    }

    case "suggest_solutions_for_lead": {
      // Get lead info
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("id, name, company, message, source_context")
        .eq("id", args.lead_id)
        .single();

      if (leadError) throw leadError;

      // Get any transcriptions for context
      const { data: transcriptions } = await supabase
        .from("voice_transcriptions")
        .select("detected_needs, transcript_summary")
        .eq("lead_id", args.lead_id)
        .limit(3);

      // Build search query from lead context
      const leadData = lead as LeadRow;
      const transcriptData = (transcriptions || []) as TranscriptionRow[];
      const searchContext = [
        leadData.message,
        leadData.source_context,
        ...transcriptData.map((t: TranscriptionRow) => t.detected_needs?.join(" ") || ""),
      ].filter(Boolean).join(" ");

      if (!searchContext) {
        return {
          success: false,
          message: "Pas assez de contexte pour suggérer des solutions. Ajoutez des transcriptions ou des notes.",
        };
      }

      // Search for relevant solutions
      const searchResponse = await fetch(`${SUPABASE_URL}/functions/v1/search-embeddings`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchContext,
          filter_types: ["solution"],
          match_count: 5,
          match_threshold: 0.6,
        }),
      });

      const searchResult = await searchResponse.json();

      return {
        success: true,
        lead_name: leadData.name,
        suggested_solutions: searchResult.results?.map((r: { resource_title: string; resource_slug: string; similarity: number; content_chunk: string }) => ({
          title: r.resource_title,
          slug: r.resource_slug,
          relevance: (r.similarity * 100).toFixed(0) + "%",
          excerpt: r.content_chunk?.substring(0, 200),
        })) || [],
        detected_needs: transcriptData.flatMap((t: TranscriptionRow) => t.detected_needs || []),
        message: `${searchResult.results?.length || 0} solution(s) suggérée(s) pour ${leadData.name}.`,
        autonomy_level: "N1",
      };
    }

    // ============ NEW COCKPIT WRITES ============
    case "create_meeting_note": {
      // VALIDATION du champ obligatoire
      const rawNotes = args.notes as string | undefined;
      
      if (!rawNotes || rawNotes.trim() === "") {
        return {
          success: false,
          error: "Le contenu des notes est obligatoire",
          message: `⚠️ Je ne peux pas créer le compte-rendu. Merci de préciser les notes de la réunion.`,
          autonomy_level: "execution_directe",
        };
      }
      
      // Variables pour les IDs
      let bookingId = args.booking_id as string | null;
      let projectId = args.project_id as string | null;
      let opportunityId = args.opportunity_id as string | null;
      
      // Si aucun ID fourni mais lead_name ou lead_email, recherche automatique
      if (!bookingId && !projectId && !opportunityId) {
        const leadName = args.lead_name as string | undefined;
        const leadEmail = args.lead_email as string | undefined;
        
        if (leadName || leadEmail) {
          // Rechercher le lead
          let leadQuery = supabase.from("leads").select("id, name");
          
          if (leadEmail) {
            leadQuery = leadQuery.eq("email", leadEmail.toLowerCase().trim());
          } else if (leadName) {
            leadQuery = leadQuery.ilike("name", `%${leadName}%`);
          }
          
          const { data: foundLead } = await leadQuery.maybeSingle();
          
          if (foundLead) {
            // Chercher l'opportunité liée à ce lead
            const { data: foundOpp } = await supabase
              .from("opportunities")
              .select("id, title")
              .eq("lead_id", foundLead.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (foundOpp) {
              opportunityId = foundOpp.id;
              console.log(`[create_meeting_note] Auto-linked to opportunity "${foundOpp.title}" via lead "${foundLead.name}"`);
            } else {
              // Pas d'opportunité, chercher un booking récent pour ce lead
              const { data: foundBooking } = await supabase
                .from("bookings")
                .select("id, name")
                .eq("email", leadEmail || "")
                .order("start_time", { ascending: false })
                .limit(1)
                .maybeSingle();
              
              if (foundBooking) {
                bookingId = foundBooking.id;
                console.log(`[create_meeting_note] Auto-linked to booking for "${foundBooking.name}"`);
              }
            }
          }
        }
      }
      
      // Si toujours aucun lien trouvé, retourner une erreur claire
      if (!bookingId && !projectId && !opportunityId) {
        return {
          success: false,
          error: "Aucun lien trouvé (booking_id, project_id ou opportunity_id)",
          message: `⚠️ Je ne peux pas créer le compte-rendu. Aucun RDV, projet ou opportunité trouvé pour ce lead. Précisez le nom ou l'email du lead.`,
          autonomy_level: "execution_directe",
        };
      }
      
      const meetingNoteData = {
        booking_id: bookingId,
        project_id: projectId,
        opportunity_id: opportunityId,
        notes: rawNotes.trim(),
        objectives: args.objectives as string || null,
        next_steps: args.next_steps as string || null,
        action_items: args.action_items || [],
        ai_metadata: {
          autonomy_level: "execution_directe",
          generated_at: new Date().toISOString(),
          validation_required: false,
          validated_by_human: false,
          auto_linked: !args.booking_id && !args.project_id && !args.opportunity_id,
        },
        workspace_id: "00000000-0000-0000-0000-000000000001",
      };

      const { data, error } = await supabase
        .from("meeting_notes")
        .insert(meetingNoteData)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        meeting_note: data,
        message: "✅ Compte-rendu de réunion créé.",
        autonomy_level: "execution_directe",
      };
    }

    case "update_opportunity_stage": {
      // Direct execution: actually update the stage
      const { data: opportunity, error } = await supabase
        .from("opportunities")
        .select("id, title, stage, value_amount")
        .eq("id", args.opportunity_id)
        .single();

      if (error) throw error;

      const previousStage = opportunity.stage;
      
      // Actually update the opportunity
      const updateData: Record<string, unknown> = {
        stage: args.new_stage,
        updated_at: new Date().toISOString(),
      };
      
      if (args.value_amount !== undefined) {
        updateData.value_amount = args.value_amount;
      }
      
      await supabase
        .from("opportunities")
        .update(updateData)
        .eq("id", args.opportunity_id);

      return {
        success: true,
        opportunity_id: args.opportunity_id,
        previous_stage: previousStage,
        new_stage: args.new_stage,
        message: `✅ Opportunité "${opportunity.title}" mise à jour : ${previousStage} → ${args.new_stage}`,
        autonomy_level: "execution_directe",
      };
    }

    case "log_activity": {
      // Liste blanche des activity_type valides
      const VALID_ACTIVITY_TYPES = ['note', 'email', 'call', 'meeting', 'status_change', 'ai_action', 'document', 'task', 'comment'];
      const VALID_ENTITY_TYPES = ['lead', 'opportunity', 'project', 'task', 'meeting_note', 'booking', 'specification', 'voice_transcription'];
      
      const rawActivityType = (args.activity_type as string || "note").toLowerCase();
      const rawEntityType = (args.entity_type as string || "").toLowerCase();
      
      // Validation des types
      const activityType = VALID_ACTIVITY_TYPES.includes(rawActivityType) ? rawActivityType : "note";
      
      if (!VALID_ENTITY_TYPES.includes(rawEntityType)) {
        return {
          success: false,
          error: `entity_type invalide: ${rawEntityType}. Valeurs acceptées: ${VALID_ENTITY_TYPES.join(", ")}`,
          message: `⚠️ Impossible d'enregistrer l'activité: type d'entité invalide.`,
          autonomy_level: "execution_directe",
        };
      }
      
      if (!args.entity_id) {
        return {
          success: false,
          error: "entity_id est obligatoire",
          message: "⚠️ Impossible d'enregistrer l'activité: ID de l'entité manquant.",
          autonomy_level: "execution_directe",
        };
      }
      
      const activityData = {
        entity_type: rawEntityType,
        entity_id: args.entity_id as string,
        activity_type: activityType,
        title: (args.title as string || "Activité enregistrée").slice(0, 255),
        content: args.content as string || null,
        is_ai_generated: true,
        ai_metadata: {
          autonomy_level: "execution_directe",
          generated_at: new Date().toISOString(),
        },
        visibility: "internal",
        workspace_id: "00000000-0000-0000-0000-000000000001",
      };

      const { data, error } = await supabase
        .from("activity_log")
        .insert(activityData)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        activity: data,
        message: `✅ Activité "${args.title}" enregistrée.`,
        autonomy_level: "execution_directe",
      };
    }

    // ============ ADMIN WRITES (N1) ============
    case "draft_article_content": {
      // Use AI to generate article draft
      const articlePrompt = `Génère un brouillon d'article pour IArche:
Titre: ${args.title}
Type: ${args.resource_type}
Sujet: ${args.topic}
${args.keywords ? `Mots-clés: ${(args.keywords as string[]).join(", ")}` : ""}
${args.tone ? `Ton: ${args.tone}` : ""}

L'article doit être structuré avec des sous-titres H2/H3, engageant et informatif.
Retourne le contenu au format HTML avec les balises appropriées.`;

      // Use centralized AI client for provider fallback
      const content = await callCentralizedAI(
        "Tu es un expert en rédaction de contenu B2B pour IArche, Architecte IA. Génère des articles professionnels et engageants.",
        articlePrompt
      );

      return {
        success: true,
        draft: {
          title: args.title,
          resource_type: args.resource_type,
          content: content,
          topic: args.topic,
        },
        message: `✅ Brouillon d'article "${args.title}" généré. Disponible dans l'éditeur Admin.`,
        autonomy_level: "execution_directe",
      };
    }

    case "suggest_article_improvements": {
      const { data: article, error } = await supabase
        .from("articles")
        .select("id, title, content, excerpt, meta_title, meta_description, faq")
        .eq("id", args.article_id)
        .single();

      if (error) throw error;

      const analysisPrompt = `Analyse cet article et suggère des améliorations:
Titre: ${article.title}
Contenu (extrait): ${article.content?.substring(0, 2000)}...
Meta title: ${article.meta_title || "Non défini"}
Meta description: ${article.meta_description || "Non défini"}
FAQ: ${article.faq ? "Présente" : "Absente"}

Suggestions demandées:
1. Améliorations SEO (titre, méta, structure)
2. Amélioration du contenu (clarté, engagement)
3. FAQ suggérées si absentes
4. Mots-clés manquants`;

      // Use centralized AI client for provider fallback
      const suggestions = await callCentralizedAI(
        "Tu es un expert SEO et content marketing. Analyse les articles et suggère des améliorations concrètes.",
        analysisPrompt
      );

      return {
        success: true,
        article_title: article.title,
        suggestions: suggestions,
        message: `Analyse de "${article.title}" terminée.`,
        autonomy_level: "N1",
        action_required: "Appliquez les suggestions dans l'éditeur Admin.",
      };
    }

    case "draft_newsletter": {
      // Get recent articles for newsletter content
      const { data: recentArticles } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, resource_type, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(5);

      // Get upcoming events if requested
      let upcomingEvents: any[] = [];
      if (args.include_events) {
        const { data: events } = await supabase
          .from("articles")
          .select("id, title, slug, event_date, heure_debut")
          .eq("resource_type", "atelier-webinaire")
          .eq("published", true)
          .gte("event_date", new Date().toISOString().split("T")[0])
          .order("event_date")
          .limit(3);
        upcomingEvents = events || [];
      }

      const newsletterPrompt = `Génère une newsletter IArche:
Sujet: ${args.subject}
${args.custom_intro ? `Introduction souhaitée: ${args.custom_intro}` : ""}

Articles récents à mentionner:
${(recentArticles || []).map((a: any) => `- ${a.title} (${a.resource_type}): ${a.excerpt?.substring(0, 100)}...`).join("\n")}

${upcomingEvents.length > 0 ? `Événements à venir:\n${upcomingEvents.map((e: any) => `- ${e.title} le ${e.event_date}`).join("\n")}` : ""}

Génère un contenu HTML pour email avec:
1. Introduction engageante
2. Section actualités avec liens
3. Section événements (si applicable)
4. Call-to-action
5. Footer IArche`;

      // Use centralized AI client for provider fallback
      const content = await callCentralizedAI(
        "Tu es expert en email marketing B2B. Génère des newsletters engageantes au format HTML.",
        newsletterPrompt
      );

      return {
        success: true,
        draft: {
          subject: args.subject,
          content: content,
          articles_included: recentArticles?.length || 0,
          events_included: upcomingEvents.length,
        },
        message: `Brouillon de newsletter "${args.subject}" généré.`,
        autonomy_level: "N1",
        action_required: "Relisez et envoyez via le module Newsletters Admin.",
      };
    }

    // ============ NOUVEAUX OUTILS D'ACTION v3.0 ============
    
    case "create_booking": {
      // VALIDATION CRITIQUE : name et email sont obligatoires
      const rawName = args.name as string | undefined;
      const rawEmail = args.email as string | undefined;
      const rawDate = args.date as string | undefined;
      const rawTime = args.time as string | undefined;
      
      const missingFields: string[] = [];
      if (!rawName || rawName.trim() === "") missingFields.push("name (nom du contact)");
      if (!rawEmail || rawEmail.trim() === "" || !rawEmail.includes("@")) missingFields.push("email (adresse email valide)");
      if (!rawDate) missingFields.push("date (format YYYY-MM-DD)");
      if (!rawTime) missingFields.push("time (format HH:MM)");
      
      if (missingFields.length > 0) {
        return {
          success: false,
          error: `Champs obligatoires manquants : ${missingFields.join(", ")}`,
          message: `⚠️ Je ne peux pas créer le RDV. Il me manque : ${missingFields.join(", ")}. Merci de préciser ces informations.`,
          autonomy_level: "execution_directe",
        };
      }
      
      // Call the existing calendar-booking edge function
      const bookingPayload = {
        name: rawName!.trim(),
        email: rawEmail!.trim().toLowerCase(),
        company: (args.company as string || "").trim() || null,
        phone: (args.phone as string || "").trim() || null,
        message: (args.message as string || "").trim() || null,
        date: rawDate!,
        time: rawTime!,
        duration_minutes: args.duration_minutes as number || 60,
        meeting_type: args.meeting_type as string || "presentiel",
        booking_type_slug: args.booking_type_slug as string || "decouverte",
        additional_guests: args.additional_guests as string[] || [],
      };

      // Get booking type ID from slug
      const { data: bookingType, error: btError } = await supabase
        .from("booking_types")
        .select("id, duration_minutes")
        .eq("slug", bookingPayload.booking_type_slug)
        .eq("is_active", true)
        .maybeSingle();

      if (btError || !bookingType) {
        // Fallback to first active booking type
        const { data: defaultType } = await supabase
          .from("booking_types")
          .select("id, duration_minutes")
          .eq("is_active", true)
          .limit(1)
          .single();
        
        if (!defaultType) {
          throw new Error("Aucun type de RDV actif trouvé");
        }
        bookingPayload.booking_type_slug = "decouverte";
      }

      // Build start/end times
      const startTime = new Date(`${bookingPayload.date}T${bookingPayload.time}:00`);
      const endTime = new Date(startTime.getTime() + (bookingPayload.duration_minutes || 60) * 60000);

      // Get the actual booking type ID from the slug
      const bookingTypeIdToUse = bookingType?.id || (await supabase
        .from("booking_types")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .single()).data?.id;

      if (!bookingTypeIdToUse) {
        throw new Error("Aucun type de RDV actif trouvé");
      }

      // Call calendar-booking edge function with correct format
      const bookingResponse = await fetch(`${SUPABASE_URL}/functions/v1/calendar-booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create-booking",
          bookingData: {
            name: bookingPayload.name,
            email: bookingPayload.email,
            company: bookingPayload.company,
            phone: bookingPayload.phone,
            message: bookingPayload.message,
            bookingTypeId: bookingTypeIdToUse,
            startTime: startTime.toISOString(),
            meetingType: bookingPayload.meeting_type,
            additionalGuests: bookingPayload.additional_guests,
          },
        }),
      });

      if (!bookingResponse.ok) {
        const errorText = await bookingResponse.text();
        console.error("Booking creation failed:", errorText);
        throw new Error(`Erreur lors de la création du RDV: ${errorText}`);
      }

      const bookingResult = await bookingResponse.json();

      // Create lead if requested - BUT CHECK IF PARTNER EXISTS FIRST
      if (args.create_lead_if_missing !== false) {
        const normalizedEmail = bookingPayload.email.toLowerCase().trim();
        
        // Check if this email belongs to an existing partner
        const { data: existingPartner } = await supabase
          .from("partners")
          .select("id, name, partner_type")
          .eq("email", normalizedEmail)
          .is("deleted_at", null)
          .maybeSingle();

        if (existingPartner) {
          console.log(`[create_booking] Email ${normalizedEmail} belongs to PARTNER "${existingPartner.name}" (${existingPartner.partner_type}) - NOT creating lead`);
          // Don't create lead, just log the association
        } else {
          // Check if lead already exists
          const { data: existingLead } = await supabase
            .from("leads")
            .select("id")
            .eq("email", normalizedEmail)
            .maybeSingle();

          if (!existingLead) {
            // Phase 1.5 multi-tenant: always include workspace_id
            const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";
            await supabase.from("leads").insert({
              name: bookingPayload.name,
              email: normalizedEmail,
              company: bookingPayload.company,
              phone: bookingPayload.phone,
              source: "agent",
              source_context: `RDV créé via Agent IA le ${bookingPayload.date}`,
              qualification_status: "contacted",
              workspace_id: DEFAULT_WORKSPACE_ID,
            });
            console.log(`[create_booking] Created new lead for ${normalizedEmail}`);
          }
        }
      }

      const dateFormatted = startTime.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      const timeFormatted = startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

      return {
        success: true,
        booking: bookingResult,
        message: `✅ RDV créé : ${bookingPayload.name} - ${dateFormatted} à ${timeFormatted} (${bookingPayload.meeting_type})`,
        details: {
          date: dateFormatted,
          time: timeFormatted,
          type: bookingPayload.meeting_type,
          zoom_link: bookingResult.zoom_join_url || null,
          calendar_added: true,
          email_sent: true,
        },
        autonomy_level: "N1",
      };
    }

    case "create_lead": {
      // VALIDATION des champs obligatoires
      const rawLeadName = args.name as string | undefined;
      const rawLeadEmail = args.email as string | undefined;
      
      const missingLeadFields: string[] = [];
      if (!rawLeadName || rawLeadName.trim() === "") missingLeadFields.push("name (nom du contact)");
      if (!rawLeadEmail || rawLeadEmail.trim() === "" || !rawLeadEmail.includes("@")) missingLeadFields.push("email (adresse email valide)");
      
      if (missingLeadFields.length > 0) {
        return {
          success: false,
          error: `Champs obligatoires manquants : ${missingLeadFields.join(", ")}`,
          message: `⚠️ Je ne peux pas créer le lead. Il me manque : ${missingLeadFields.join(", ")}. Merci de préciser ces informations.`,
          autonomy_level: "N1",
        };
      }
      
      const leadData = {
        name: rawLeadName!.trim(),
        email: rawLeadEmail!.trim().toLowerCase(),
        company: (args.company as string || "").trim() || null,
        phone: (args.phone as string || "").trim() || null,
        source: args.source as string || "agent",
        source_context: args.source_context as string || "Créé via Agent IA",
        message: args.message as string || null,
        qualification_status: args.qualification_status as string || "new",
        industry: args.industry as string || null,
        company_size: args.company_size as string || null,
      };

      // IMPORTANT: Check if this email belongs to a PARTNER first
      const { data: existingPartner } = await supabase
        .from("partners")
        .select("id, name, partner_type, email")
        .eq("email", leadData.email)
        .is("deleted_at", null)
        .maybeSingle();

      if (existingPartner) {
        return {
          success: false,
          is_partner: true,
          partner: existingPartner,
          message: `⚠️ Cette personne est un PARTENAIRE existant : ${existingPartner.name} (${existingPartner.partner_type}). Utilisez les outils partenaire (search_partners, update_partner) au lieu de créer un lead.`,
          autonomy_level: "N1",
        };
      }

      // Check if lead already exists
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id, name, qualification_status")
        .eq("email", leadData.email)
        .maybeSingle();

      if (existingLead) {
        return {
          success: false,
          message: `Lead existant : ${existingLead.name} (${leadData.email}) - statut: ${existingLead.qualification_status}`,
          existing_lead_id: existingLead.id,
          autonomy_level: "N1",
        };
      }

      const { data: newLead, error } = await supabase
        .from("leads")
        .insert(leadData)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        lead: newLead,
        message: `✅ Lead créé : ${leadData.name} (${leadData.email}) - ${leadData.company || "Entreprise non spécifiée"}`,
        autonomy_level: "N1",
      };
    }

    case "convert_lead_to_partner": {
      const leadId = args.lead_id as string;
      
      if (!leadId) {
        return {
          success: false,
          error: "lead_id est obligatoire",
          message: "⚠️ Précisez l'ID du lead à convertir en partenaire.",
          autonomy_level: "execution_directe",
        };
      }

      // Fetch lead data
      const { data: lead, error: leadErr } = await supabase
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .single();

      if (leadErr || !lead) {
        return {
          success: false,
          error: "Lead non trouvé",
          message: `⚠️ Aucun lead trouvé avec l'ID ${leadId}.`,
          autonomy_level: "execution_directe",
        };
      }

      // Check if partner already exists with same email
      const { data: existingPartner } = await supabase
        .from("partners")
        .select("id, name, slug")
        .eq("email", lead.email)
        .is("deleted_at", null)
        .maybeSingle();

      if (existingPartner) {
        // Mark lead as converted to existing partner
        await supabase
          .from("leads")
          .update({
            source_context: `${lead.source_context || ""}\n[CONVERTI EN PARTENAIRE: ${existingPartner.slug}]`.trim(),
            qualification_status: "converted_to_partner",
          })
          .eq("id", leadId);

        return {
          success: true,
          message: `⚠️ Un partenaire existe déjà avec cet email : ${existingPartner.name} (${existingPartner.slug}). Lead marqué comme converti.`,
          partner: existingPartner,
          lead_marked_converted: true,
          autonomy_level: "execution_directe",
        };
      }

      // Generate slug from name
      const baseSlug = lead.name
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);

      const partnerData = {
        name: lead.name,
        slug: `${baseSlug}-${Date.now().toString(36)}`,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        partner_type: (args.partner_type as string) || "apporteur",
        specialties: (args.specialties as string[]) || [],
        commission_rate: (args.commission_rate as number) || 10,
        website: lead.website,
        linkedin_url: lead.linkedin_url,
        bio: lead.message || null,
        is_active: true,
        workspace_id: "00000000-0000-0000-0000-000000000001",
      };

      const { data: newPartner, error: partnerErr } = await supabase
        .from("partners")
        .insert(partnerData)
        .select("id, name, slug, partner_type")
        .single();

      if (partnerErr) throw partnerErr;

      // Update lead to mark as converted
      await supabase
        .from("leads")
        .update({
          source_context: `${lead.source_context || ""}\n[CONVERTI EN PARTENAIRE: ${newPartner.slug}]`.trim(),
          qualification_status: "converted_to_partner",
        })
        .eq("id", leadId);

      // Log activity
      await supabase.from("activity_log").insert({
        workspace_id: "00000000-0000-0000-0000-000000000001",
        entity_type: "partner",
        entity_id: newPartner.id,
        activity_type: "conversion",
        title: `Lead converti en partenaire`,
        content: `${lead.name} (lead) → ${newPartner.name} (${partnerData.partner_type})`,
        lead_id: leadId,
        ai_metadata: {
          conversion_source: "ai_agent",
          original_lead_id: leadId,
          original_qualification: lead.qualification_status,
        },
      });

      const typeLabels: Record<string, string> = {
        expert_ia: "Expert IA",
        independant: "Indépendant",
        apporteur: "Apporteur d'affaires",
      };

      return {
        success: true,
        partner: newPartner,
        lead_id: leadId,
        message: `✅ Lead converti en partenaire : ${newPartner.name} (${typeLabels[partnerData.partner_type] || partnerData.partner_type})`,
        autonomy_level: "execution_directe",
      };
    }

    case "update_lead": {
      // Trouver le lead par ID ou email
      let leadId = args.lead_id as string | undefined;
      
      if (!leadId && args.email) {
        const { data: foundLead } = await supabase
          .from("leads")
          .select("id, name, phone, company, source_context, message")
          .eq("email", (args.email as string).toLowerCase().trim())
          .maybeSingle();
        
        if (foundLead) {
          leadId = foundLead.id;
        }
      }
      
      if (!leadId) {
        return {
          success: false,
          error: "Lead non trouvé",
          message: "⚠️ Je ne trouve pas ce lead. Précisez l'ID ou l'email du lead à mettre à jour.",
          autonomy_level: "execution_directe",
        };
      }
      
      // Récupérer le lead actuel pour les champs à concaténer
      const { data: currentLead } = await supabase
        .from("leads")
        .select("name, phone, company, source_context, message")
        .eq("id", leadId)
        .single();
      
      // Construire l'objet de mise à jour
      const updateData: Record<string, unknown> = {
        last_contacted_at: new Date().toISOString(),
      };
      
      if (args.phone) updateData.phone = (args.phone as string).trim();
      if (args.company) updateData.company = (args.company as string).trim();
      if (args.position) updateData.position = (args.position as string).trim();
      if (args.linkedin_url) updateData.linkedin_url = (args.linkedin_url as string).trim();
      if (args.website) updateData.website = (args.website as string).trim();
      
      // Concaténer source_context si fourni
      if (args.source_context) {
        const existingContext = currentLead?.source_context || "";
        updateData.source_context = existingContext 
          ? `${existingContext} | ${args.source_context}` 
          : args.source_context;
      }
      
      // Concaténer message/notes si fourni
      if (args.message) {
        const existingMessage = currentLead?.message || "";
        updateData.message = existingMessage 
          ? `${existingMessage}\n---\n${args.message}` 
          : args.message;
      }
      
      const { data: updatedLead, error } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", leadId)
        .select("id, name, email, phone, company")
        .single();
      
      if (error) throw error;
      
      const updatedFields = Object.keys(updateData).filter(k => k !== "last_contacted_at");
      
      return {
        success: true,
        lead: updatedLead,
        updated_fields: updatedFields,
        message: `✅ Lead "${updatedLead.name}" mis à jour : ${updatedFields.join(", ")}`,
        autonomy_level: "execution_directe",
      };
    }

    case "create_specification": {
      const rawTitle = args.title as string | undefined;
      
      if (!rawTitle || rawTitle.trim() === "") {
        return {
          success: false,
          error: "Le titre du CDC est obligatoire",
          message: "⚠️ Je ne peux pas créer le CDC. Merci de préciser un titre.",
          autonomy_level: "execution_directe",
        };
      }

      const specData = {
        title: rawTitle.trim(),
        description: (args.description as string || "").trim() || null,
        project_id: args.project_id as string || null,
        lead_id: args.lead_id as string || null,
        functional_requirements: args.functional_requirements as string[] || [],
        technical_requirements: args.technical_requirements as string[] || [],
        constraints: args.constraints as string[] || [],
        content: args.content as string || null,
        status: args.status as string || "draft",
        version: "1.0",
        workspace_id: "00000000-0000-0000-0000-000000000001",
      };

      const { data: newSpec, error } = await supabase
        .from("specifications")
        .insert(specData)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        specification: newSpec,
        message: `✅ CDC créé : "${specData.title}" (statut: ${specData.status})`,
        autonomy_level: "execution_directe",
      };
    }

    case "create_document": {
      const rawDocTitle = args.title as string | undefined;
      const rawDocType = args.document_type as string | undefined;
      
      if (!rawDocTitle || rawDocTitle.trim() === "") {
        return {
          success: false,
          error: "Le titre du document est obligatoire",
          message: "⚠️ Je ne peux pas créer le document. Merci de préciser un titre.",
          autonomy_level: "execution_directe",
        };
      }
      
      if (!rawDocType) {
        return {
          success: false,
          error: "Le type de document est obligatoire",
          message: "⚠️ Précisez le type de document : quote (devis), cdc, proposal ou email.",
          autonomy_level: "execution_directe",
        };
      }

      const docData = {
        title: rawDocTitle.trim(),
        document_type: rawDocType,
        content_json: args.content_json as Record<string, unknown> || {},
        project_id: args.project_id as string || null,
        lead_id: args.lead_id as string || null,
        opportunity_id: args.opportunity_id as string || null,
        status: args.status as string || "draft",
        ai_generated: false,
        version: "1.0",
        workspace_id: "00000000-0000-0000-0000-000000000001",
      };

      const { data: newDoc, error } = await supabase
        .from("generated_documents")
        .insert(docData)
        .select()
        .single();

      if (error) throw error;

      const typeLabels: Record<string, string> = {
        quote: "Devis",
        cdc: "CDC",
        proposal: "Proposition",
        email: "Email type",
      };

      return {
        success: true,
        document: newDoc,
        message: `✅ ${typeLabels[rawDocType] || "Document"} créé : "${docData.title}"`,
        autonomy_level: "execution_directe",
      };
    }

    case "create_solution": {
      const rawTitle = args.title as string | undefined;
      const rawSlug = args.slug as string | undefined;
      
      if (!rawTitle || rawTitle.trim() === "") {
        return {
          success: false,
          error: "Le titre de la solution est obligatoire",
          message: "⚠️ Je ne peux pas créer la solution. Merci de préciser un titre.",
          autonomy_level: "execution_directe",
        };
      }
      
      if (!rawSlug || rawSlug.trim() === "") {
        return {
          success: false,
          error: "Le slug de la solution est obligatoire",
          message: "⚠️ Précisez un slug URL unique (ex: collaboria, datalia).",
          autonomy_level: "execution_directe",
        };
      }

      // Normalize slug
      const slug = rawSlug.toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Check for existing solution with same slug
      const { data: existingBySlug } = await supabase
        .from("articles")
        .select("id, title")
        .eq("resource_type", "solution")
        .eq("slug", slug)
        .maybeSingle();

      if (existingBySlug) {
        return {
          success: false,
          error: "Une solution avec ce slug existe déjà",
          existing_solution: existingBySlug,
          message: `⚠️ La solution "${existingBySlug.title}" utilise déjà le slug "${slug}".`,
          autonomy_level: "execution_directe",
        };
      }

      const solutionData = {
        title: rawTitle.trim(),
        slug: slug,
        resource_type: "solution",
        excerpt: (args.excerpt as string || "").trim() || null,
        content: args.content as string || "<p>Contenu à compléter.</p>",
        meta_title: (args.meta_title as string || rawTitle).trim(),
        meta_description: (args.meta_description as string || args.excerpt as string || "").trim() || null,
        published: args.published === true,
        published_at: args.published === true ? new Date().toISOString() : null,
        thematiques: args.thematiques as string[] || [],
        tags: args.tags as string[] || [],
      };

      const { data: newSolution, error } = await supabase
        .from("articles")
        .insert(solutionData)
        .select("id, title, slug, published")
        .single();

      if (error) throw error;

      return {
        success: true,
        solution: newSolution,
        message: `✅ Solution créée : "${solutionData.title}" (slug: ${slug}, ${solutionData.published ? "publiée" : "brouillon"})`,
        autonomy_level: "execution_directe",
      };
    }

    case "create_transcription": {
      const rawTitle = args.title as string | undefined;
      
      if (!rawTitle || rawTitle.trim() === "") {
        return {
          success: false,
          error: "Le titre de la transcription est obligatoire",
          message: "⚠️ Je ne peux pas créer la transcription. Merci de préciser un titre.",
          autonomy_level: "execution_directe",
        };
      }

      // Generate slug from title
      const baseSlug = rawTitle
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50);
      
      const transcriptionData = {
        title: rawTitle.trim(),
        slug: `${baseSlug}-${Date.now()}`,
        transcript_text: args.transcript_text as string || null,
        transcript_summary: args.transcript_summary as string || null,
        lead_id: args.lead_id as string || null,
        project_id: args.project_id as string || null,
        transcription_date: args.transcription_date as string || new Date().toISOString().split("T")[0],
        detected_needs: args.detected_needs as string[] || [],
        action_items: args.action_items as string[] || [],
        speakers: args.speakers as string[] || [],
        status: "done",
        workspace_id: "00000000-0000-0000-0000-000000000001",
      };

      const { data: newTranscription, error } = await supabase
        .from("voice_transcriptions")
        .insert(transcriptionData)
        .select("id, title, slug, status, lead_id, project_id")
        .single();

      if (error) throw error;

      if (transcriptionData.lead_id) {
        await supabase.from("activity_log").insert({
          workspace_id: transcriptionData.workspace_id,
          entity_type: "voice_transcription",
          entity_id: newTranscription.id,
          activity_type: "new_transcription",
          title: `Transcription créée : ${transcriptionData.title}`,
          content: transcriptionData.transcript_summary || "Transcription manuelle ajoutée",
          lead_id: transcriptionData.lead_id,
          project_id: transcriptionData.project_id,
        });
      }

      return {
        success: true,
        transcription: newTranscription,
        message: `✅ Transcription créée : "${transcriptionData.title}"${transcriptionData.lead_id ? " (liée au lead)" : ""}`,
        autonomy_level: "execution_directe",
      };
    }

    case "send_email": {
      const emailType = args.email_type as string || "custom";
      
      // If body not provided, generate it
      let bodyHtml = args.body_html as string;
      let subject = args.subject as string;
      
      if (!bodyHtml && args.lead_id) {
        // Use generate-followup-email to create content
        const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-followup-email`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lead_id: args.lead_id,
            email_type: emailType,
            custom_context: args.custom_context,
          }),
        });

        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          if (emailData.email) {
            subject = emailData.email.subject || subject;
            bodyHtml = `
              <p>${emailData.email.greeting || ""}</p>
              ${emailData.email.body || ""}
              <p>${emailData.email.signature || "Nick / IArche"}</p>
            `;
          }
        }
      }

      const signature = args.signature as string || "Nick / IArche";
      
      if (!bodyHtml) {
        bodyHtml = `<p>Email généré automatiquement.</p><p>Cordialement,<br>${signature}</p>`;
      }

      // CREATE ACTION PROPOSAL (Phase 3) - Emails require validation
      const actionPayload = {
        to_email: args.to_email as string,
        to_name: args.to_name as string || null,
        subject: subject,
        body_html: bodyHtml,
        signature: signature,
        email_type: emailType,
        lead_id: args.lead_id as string || null,
      };

      const { data: proposal, error: proposalError } = await supabase
        .from("action_proposals")
        .insert({
          workspace_id: "00000000-0000-0000-0000-000000000001",
          action_type: "send_email",
          action_label: `Envoyer email: "${subject}" à ${args.to_name || args.to_email}`,
          action_payload: actionPayload,
          status: "pending",
          ai_reasoning: args.reasoning || "Email proposé par l'IA",
          user_id: userId || null,
        })
        .select("id")
        .single();

      if (proposalError) throw proposalError;

      return {
        success: true,
        proposal_id: proposal.id,
        action_type: "send_email",
        message: `📧 Proposition d'email créée: "${subject}" → ${args.to_name || args.to_email}. Valide-la pour l'envoyer.`,
        autonomy_level: "proposal",
        email_preview: {
          subject: subject,
          to: args.to_email,
          body_preview: bodyHtml.substring(0, 200) + "...",
        },
      };
    }

    case "cancel_booking": {
      // VALIDATION: booking_id obligatoire
      if (!args.booking_id) {
        return {
          success: false,
          error: "ID du RDV obligatoire",
          message: "⚠️ Je ne peux pas annuler le RDV sans son identifiant. Précisez quel RDV annuler.",
          autonomy_level: "execution_directe",
        };
      }
      
      const { data: booking, error: bErr } = await supabase
        .from("bookings")
        .select("id, name, email, start_time, status")
        .eq("id", args.booking_id)
        .single();

      if (bErr || !booking) throw new Error("RDV non trouvé");

      await supabase
        .from("bookings")
        .update({ 
          status: "cancelled", 
          cancellation_reason: args.reason || "Annulé via Agent IA",
          cancelled_at: new Date().toISOString()
        })
        .eq("id", args.booking_id);

      const dateFormatted = new Date(booking.start_time).toLocaleDateString("fr-FR");

      return {
        success: true,
        message: `✅ RDV annulé : ${booking.name} du ${dateFormatted}`,
        autonomy_level: "execution_directe",
      };
    }

    case "reschedule_booking": {
      // VALIDATION: champs obligatoires
      const missingRescheduleFields: string[] = [];
      if (!args.booking_id) missingRescheduleFields.push("booking_id (ID du RDV)");
      if (!args.new_date) missingRescheduleFields.push("new_date (nouvelle date YYYY-MM-DD)");
      if (!args.new_time) missingRescheduleFields.push("new_time (nouvelle heure HH:MM)");
      
      if (missingRescheduleFields.length > 0) {
        return {
          success: false,
          error: `Champs obligatoires manquants : ${missingRescheduleFields.join(", ")}`,
          message: `⚠️ Je ne peux pas reprogrammer le RDV. Il me manque : ${missingRescheduleFields.join(", ")}.`,
          autonomy_level: "execution_directe",
        };
      }
      
      const { data: booking, error: bErr } = await supabase
        .from("bookings")
        .select("id, name, email, start_time, end_time, booking_type_id")
        .eq("id", args.booking_id)
        .single();

      if (bErr || !booking) throw new Error("RDV non trouvé");

      const newStart = new Date(`${args.new_date}T${args.new_time}:00`);
      const duration = new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime();
      const newEnd = new Date(newStart.getTime() + duration);

      await supabase
        .from("bookings")
        .update({ 
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
          notes: `Reprogrammé le ${new Date().toLocaleDateString("fr-FR")} via Agent IA`,
        })
        .eq("id", args.booking_id);

      const dateFormatted = newStart.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      const timeFormatted = newStart.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

      return {
        success: true,
        message: `✅ RDV reprogrammé : ${booking.name} → ${dateFormatted} à ${timeFormatted}`,
        autonomy_level: "execution_directe",
      };
    }

    case "create_opportunity": {
      // VALIDATION des champs obligatoires
      const rawOppTitle = args.title as string | undefined;
      
      if (!rawOppTitle || rawOppTitle.trim() === "") {
        return {
          success: false,
          error: "Le titre de l'opportunité est obligatoire",
          message: `⚠️ Je ne peux pas créer l'opportunité. Merci de préciser un titre.`,
          autonomy_level: "N1",
        };
      }
      
      const oppData = {
        title: rawOppTitle.trim(),
        lead_id: args.lead_id as string || null,
        value_amount: args.value_amount as number || null,
        probability: args.probability as number || 50,
        stage: args.stage as string || "lead",
        expected_close_date: args.expected_close_date as string || null,
        description: args.description as string || null,
        source: args.source as string || "agent",
        workspace_id: "00000000-0000-0000-0000-000000000001",
      };

      const { data: newOpp, error } = await supabase
        .from("opportunities")
        .insert(oppData)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        opportunity: newOpp,
        message: `✅ Opportunité créée : "${oppData.title}" - ${oppData.stage} - ${oppData.value_amount ? oppData.value_amount + "€" : "valeur non définie"}`,
        autonomy_level: "N1",
      };
    }

    case "create_project": {
      // VALIDATION des champs obligatoires
      const rawProjName = args.name as string | undefined;
      
      if (!rawProjName || rawProjName.trim() === "") {
        return {
          success: false,
          error: "Le nom du projet est obligatoire",
          message: `⚠️ Je ne peux pas créer le projet. Merci de préciser un nom.`,
          autonomy_level: "N1",
        };
      }
      
      const projData = {
        name: rawProjName.trim(),
        description: args.description as string || null,
        opportunity_id: args.opportunity_id as string || null,
        lead_id: args.lead_id as string || null,
        budget_amount: args.budget_amount as number || null,
        start_date: args.start_date as string || null,
        target_end_date: args.target_end_date as string || null,
        status: args.status as string || "scoping",
        health_status: "on_track",
        workspace_id: "00000000-0000-0000-0000-000000000001",
      };

      const { data: newProj, error } = await supabase
        .from("projects")
        .insert(projData)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        project: newProj,
        message: `✅ Projet créé : "${projData.name}" - ${projData.status}`,
        autonomy_level: "N1",
      };
    }

    case "link_solution_to_lead": {
      // VALIDATION: champs obligatoires
      if (!args.solution_slug || !args.lead_id) {
        return {
          success: false,
          error: "solution_slug et lead_id sont obligatoires",
          message: "⚠️ Je ne peux pas lier la solution sans le slug de la solution et l'ID du lead.",
          autonomy_level: "N1",
        };
      }
      
      // Get solution ID from slug
      const { data: solution, error: solErr } = await supabase
        .from("articles")
        .select("id, title")
        .eq("slug", args.solution_slug)
        .eq("resource_type", "solution")
        .single();

      if (solErr || !solution) throw new Error(`Solution "${args.solution_slug}" non trouvée`);

      // Check if link already exists
      const { data: existing } = await supabase
        .from("solution_leads")
        .select("id")
        .eq("lead_id", args.lead_id)
        .eq("solution_id", solution.id)
        .maybeSingle();

      if (existing) {
        // Update interest level
        await supabase
          .from("solution_leads")
          .update({ 
            interest_level: args.interest_level || "medium",
            notes: args.notes,
          })
          .eq("id", existing.id);

        return {
          success: true,
          message: `✅ Intérêt mis à jour : ${solution.title} → ${args.interest_level || "medium"}`,
          autonomy_level: "N1",
        };
      }

      const { error } = await supabase.from("solution_leads").insert({
        lead_id: args.lead_id,
        solution_id: solution.id,
        interest_level: args.interest_level || "medium",
        notes: args.notes,
      });

      if (error) throw error;

      return {
        success: true,
        message: `✅ Solution liée : ${solution.title} → Lead (intérêt: ${args.interest_level || "medium"})`,
        autonomy_level: "N1",
      };
    }

    // ============ NOUVEAUX OUTILS P1 (Phase 4) ============
    
    case "generate_document": {
      // VALIDATION: document_type obligatoire
      const validDocTypes = ["quote", "spec", "proposal"];
      if (!args.document_type || !validDocTypes.includes(args.document_type as string)) {
        return {
          success: false,
          error: "Type de document invalide",
          message: `⚠️ Type de document obligatoire. Valeurs acceptées : ${validDocTypes.join(", ")}.`,
          autonomy_level: "N1",
        };
      }
      
      // Au moins une entité liée requise
      if (!args.project_id && !args.opportunity_id && !args.lead_id) {
        return {
          success: false,
          error: "Entité liée manquante",
          message: "⚠️ Précisez au moins un projet, une opportunité ou un lead pour générer le document.",
          autonomy_level: "N1",
        };
      }

      const typeLabels: Record<string, string> = {
        quote: "Devis",
        spec: "Cahier des charges",
        proposal: "Proposition commerciale",
      };
      
      // Create AbortController with 55s timeout (edge functions have 60s max)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      
      try {
        // Call the existing generate-document edge function with timeout
        const docResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-document`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            document_type: args.document_type,
            project_id: args.project_id || null,
            opportunity_id: args.opportunity_id || null,
            lead_id: args.lead_id || null,
            custom_instructions: args.custom_instructions || null,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!docResponse.ok) {
          const errorText = await docResponse.text();
          console.error("Document generation failed:", errorText);
          
          // Specific error handling
          if (docResponse.status === 429) {
            return {
              success: false,
              error: "rate_limited",
              message: "⚠️ Trop de requêtes en cours. Réessayez dans quelques secondes.",
              autonomy_level: "N1",
            };
          }
          if (docResponse.status === 402) {
            return {
              success: false,
              error: "credits_exhausted",
              message: "⚠️ Crédits IA épuisés. Contactez l'administrateur.",
              autonomy_level: "N1",
            };
          }
          
          throw new Error(`Erreur génération document: ${errorText}`);
        }

        const docResult = await docResponse.json();

        return {
          success: true,
          document: docResult.document || docResult,
          message: `✅ ${typeLabels[args.document_type as string] || "Document"} généré : "${docResult.document?.title || docResult.title || "Nouveau document"}"`,
          autonomy_level: "N1",
          action_required: "Relisez et validez dans le module Documents.",
          document_id: docResult.document?.id || docResult.id,
        };
        
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        
        // Handle timeout specifically
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          console.error("Document generation timeout after 55s");
          return {
            success: false,
            error: "timeout",
            message: `⚠️ La génération du ${typeLabels[args.document_type as string]?.toLowerCase() || "document"} a pris trop de temps. Le système était peut-être surchargé. Veuillez réessayer.`,
            autonomy_level: "N1",
            retry_suggested: true,
          };
        }
        
        // Re-throw other errors
        throw fetchError;
      }
    }

    case "enrich_seo": {
      let contentToEnrich = args.content as string;
      let resourceType = args.resource_type as string || "article";

      // If article_id provided, fetch the article content
      if (args.article_id && !contentToEnrich) {
        const { data: article, error } = await supabase
          .from("articles")
          .select("content, resource_type")
          .eq("id", args.article_id)
          .single();

        if (error || !article) throw new Error("Article non trouvé");
        contentToEnrich = article.content;
        resourceType = article.resource_type;
      }

      if (!contentToEnrich) {
        throw new Error("Aucun contenu à enrichir (fournir article_id ou content)");
      }

      // Call the enrich-content-seo edge function
      const seoResponse = await fetch(`${SUPABASE_URL}/functions/v1/enrich-content-seo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: contentToEnrich,
          resourceType: resourceType,
        }),
      });

      if (!seoResponse.ok) {
        const errorText = await seoResponse.text();
        console.error("SEO enrichment failed:", errorText);
        throw new Error(`Erreur enrichissement SEO: ${errorText}`);
      }

      const seoResult = await seoResponse.json();

      // If article_id, update the article with enriched content
      if (args.article_id && seoResult.enrichedContent) {
        await supabase
          .from("articles")
          .update({ content: seoResult.enrichedContent })
          .eq("id", args.article_id);

        return {
          success: true,
          message: `✅ Contenu SEO enrichi et mis à jour pour l'article`,
          enriched: true,
          autonomy_level: "N1",
        };
      }

      return {
        success: true,
        enrichedContent: seoResult.enrichedContent,
        message: `✅ Contenu SEO enrichi (mots-clés mis en <strong>)`,
        autonomy_level: "N1",
      };
    }

    case "generate_faq": {
      // Get article info
      const { data: article, error: articleError } = await supabase
        .from("articles")
        .select("id, title, content, resource_type")
        .eq("id", args.article_id)
        .single();

      if (articleError || !article) throw new Error("Article non trouvé");

      // Get existing FAQ questions if mode is 'add'
      let existingQuestions: string[] = [];
      if (args.mode === "add") {
        const { data: existingFaq } = await supabase
          .from("faqs")
          .select("questions")
          .eq("article_id", args.article_id)
          .maybeSingle();

        if (existingFaq?.questions) {
          existingQuestions = (existingFaq.questions as { question: string }[]).map(q => q.question);
        }
      }

      // Call the generate-faq edge function
      const faqResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-faq`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          article_id: args.article_id,
          title: article.title,
          content: article.content,
          resource_type: article.resource_type,
          mode: args.mode || "new",
          existing_questions: existingQuestions,
        }),
      });

      if (!faqResponse.ok) {
        const errorText = await faqResponse.text();
        console.error("FAQ generation failed:", errorText);
        throw new Error(`Erreur génération FAQ: ${errorText}`);
      }

      const faqResult = await faqResponse.json();
      const questionsCount = faqResult.questions?.length || 0;

      return {
        success: true,
        faq: faqResult.faq,
        questions_generated: questionsCount,
        message: `✅ ${questionsCount} questions FAQ générées pour "${article.title}"`,
        autonomy_level: "execution_directe",
      };
    }

    case "send_newsletter": {
      // Get article info first
      const { data: article, error: articleError } = await supabase
        .from("articles")
        .select("id, title, slug, published")
        .eq("id", args.article_id)
        .single();

      if (articleError || !article) throw new Error("Article non trouvé");
      if (!article.published) throw new Error("L'article doit être publié avant d'envoyer une newsletter");

      // Count subscribers
      const { count: subscriberCount } = await supabase
        .from("newsletter_subscribers")
        .select("*", { count: "exact", head: true });

      if (!subscriberCount || subscriberCount === 0) {
        return {
          success: false,
          message: `⚠️ Aucun abonné newsletter. Newsletter non envoyée.`,
          autonomy_level: "execution_directe",
        };
      }

      // Call the send-newsletter edge function
      const newsletterResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-newsletter`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          articleId: args.article_id,
        }),
      });

      if (!newsletterResponse.ok) {
        const errorText = await newsletterResponse.text();
        console.error("Newsletter send failed:", errorText);
        throw new Error(`Erreur envoi newsletter: ${errorText}`);
      }

      const result = await newsletterResponse.json();

      return {
        success: true,
        sent: result.sent || 0,
        failed: result.failed || 0,
        message: `✅ Newsletter envoyée : ${result.sent} email(s) pour "${article.title}"`,
        autonomy_level: "execution_directe",
      };
    }

    case "suggest_tags": {
      let title = args.title as string;
      let content = args.content as string;

      // If article_id provided, fetch article
      if (args.article_id) {
        const { data: article, error } = await supabase
          .from("articles")
          .select("title, content")
          .eq("id", args.article_id)
          .single();

        if (error || !article) throw new Error("Article non trouvé");
        title = article.title;
        content = article.content;
      }

      if (!title && !content) {
        throw new Error("Fournir article_id, ou title+content");
      }

      // Call suggest-tags edge function
      const tagsResponse = await fetch(`${SUPABASE_URL}/functions/v1/suggest-tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title,
          content: content?.substring(0, 3000),
        }),
      });

      if (!tagsResponse.ok) {
        const errorText = await tagsResponse.text();
        console.error("Tag suggestion failed:", errorText);
        throw new Error(`Erreur suggestion tags: ${errorText}`);
      }

      const tagsResult = await tagsResponse.json();

      return {
        success: true,
        suggested_tags: tagsResult.tags || tagsResult.suggested_tags || [],
        message: `✅ Tags suggérés : ${(tagsResult.tags || tagsResult.suggested_tags || []).join(", ")}`,
        autonomy_level: "execution_directe",
      };
    }

    // ============ PHASE 2: MÉMOIRE PERSISTANTE ============
    
    case "get_lead_familiarity": {
      const { data: lead, error } = await supabase
        .from("leads")
        .select("id, name, company, familiarity_score, familiarity_details")
        .eq("id", args.lead_id)
        .single();

      if (error) throw error;

      return {
        lead_id: lead.id,
        name: lead.name,
        company: lead.company,
        familiarity_score: lead.familiarity_score || 0,
        familiarity_details: lead.familiarity_details || {},
        interpretation: lead.familiarity_score >= 50 
          ? "Lead très familier - historique riche d'interactions"
          : lead.familiarity_score >= 20 
            ? "Lead connu - quelques interactions"
            : "Lead récent - peu d'historique",
      };
    }

    case "update_lead_familiarity": {
      const { error } = await supabase.rpc("update_lead_familiarity", {
        p_lead_id: args.lead_id,
      });

      if (error) throw error;

      // Fetch updated score
      const { data: lead } = await supabase
        .from("leads")
        .select("familiarity_score, familiarity_details")
        .eq("id", args.lead_id)
        .single();

      return {
        success: true,
        lead_id: args.lead_id,
        new_score: lead?.familiarity_score || 0,
        details: lead?.familiarity_details || {},
        message: `Score de familiarité mis à jour : ${lead?.familiarity_score || 0}%`,
      };
    }

    case "get_entity_references": {
      const { data: refs, error } = await supabase.rpc("get_entity_references", {
        p_entity_type: args.entity_type,
        p_entity_id: args.entity_id,
      });

      if (error) throw error;

      // Enrich with entity names
      const enrichedRefs = await Promise.all((refs || []).map(async (ref: any) => {
        let relatedName = "";
        
        if (ref.related_entity_type === "lead") {
          const { data } = await supabase.from("leads").select("name, company").eq("id", ref.related_entity_id).single();
          relatedName = data ? `${data.name}${data.company ? ` (${data.company})` : ""}` : "";
        } else if (ref.related_entity_type === "partner") {
          const { data } = await supabase.from("partners").select("name").eq("id", ref.related_entity_id).single();
          relatedName = data?.name || "";
        } else if (ref.related_entity_type === "project") {
          const { data } = await supabase.from("projects").select("name").eq("id", ref.related_entity_id).single();
          relatedName = data?.name || "";
        }
        
        return {
          ...ref,
          related_name: relatedName,
        };
      }));

      return {
        entity_type: args.entity_type,
        entity_id: args.entity_id,
        references: enrichedRefs,
        total_count: enrichedRefs.length,
        outgoing: enrichedRefs.filter((r: any) => r.direction === "outgoing").length,
        incoming: enrichedRefs.filter((r: any) => r.direction === "incoming").length,
      };
    }

    case "create_entity_reference": {
      const { data: refId, error } = await supabase.rpc("create_entity_reference", {
        p_source_type: args.source_type,
        p_source_id: args.source_id,
        p_target_type: args.target_type,
        p_target_id: args.target_id,
        p_reference_type: args.reference_type || "mention",
        p_context: args.context || null,
        p_confidence: args.confidence || 0.8,
      });

      if (error) throw error;

      return {
        success: true,
        reference_id: refId,
        source: `${args.source_type}:${args.source_id}`,
        target: `${args.target_type}:${args.target_id}`,
        type: args.reference_type || "mention",
        message: `Référence croisée créée entre ${args.source_type} et ${args.target_type}`,
      };
    }

    // ============ v5.3 - NOUVEAUX OUTILS AMÉLIORATION IA ============
    case "get_stale_syntheses": {
      const maxItems = args.max_items as number || 5;
      
      const { data, error } = await supabase.rpc("refresh_stale_syntheses", {
        max_items: maxItems,
      });

      if (error) throw error;

      const grouped = {
        leads: (data || []).filter((r: any) => r.entity_type === "lead"),
        projects: (data || []).filter((r: any) => r.entity_type === "project"),
        partners: (data || []).filter((r: any) => r.entity_type === "partner"),
      };

      return {
        stale_entities: data || [],
        summary: {
          leads: grouped.leads.length,
          projects: grouped.projects.length,
          partners: grouped.partners.length,
          total: (data || []).length,
        },
        message: `${(data || []).length} entité(s) avec synthèse obsolète : ${grouped.leads.length} leads, ${grouped.projects.length} projets, ${grouped.partners.length} partenaires`,
      };
    }

    case "get_ai_dashboard_metrics": {
      // Query the ai_dashboard_metrics view
      const { data, error } = await supabase
        .from("ai_dashboard_metrics")
        .select("*")
        .single();

      if (error) {
        console.error("Failed to fetch AI dashboard metrics:", error);
        // Fallback to individual queries
        const [leadsStale, projectsStale, partnersStale, pendingNotifs, memory24h, embeddings] = await Promise.all([
          supabase.from("leads").select("id", { count: "exact", head: true }).eq("synthesis_stale", true),
          supabase.from("projects").select("id", { count: "exact", head: true }).eq("synthesis_stale", true),
          supabase.from("partners").select("id", { count: "exact", head: true }).eq("synthesis_stale", true),
          supabase.from("activity_log").select("id", { count: "exact", head: true }).eq("pending_ai_review", true),
          supabase.from("ai_agent_memory").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
          supabase.from("resource_embeddings").select("id, resource_type", { count: "exact" }),
        ]);

        return {
          leads_stale: leadsStale.count || 0,
          projects_stale: projectsStale.count || 0,
          partners_stale: partnersStale.count || 0,
          pending_notifications: pendingNotifs.count || 0,
          memory_24h: memory24h.count || 0,
          total_embeddings: embeddings.count || 0,
          indexed_types: new Set((embeddings.data || []).map((e: any) => e.resource_type)).size,
          message: "Métriques IA récupérées (mode fallback)",
        };
      }

      return {
        ...data,
        health_status: data.pending_notifications > 50 ? "attention_needed" : 
                       data.leads_stale + data.projects_stale > 10 ? "maintenance_suggested" : "healthy",
        message: `État IA : ${data.total_embeddings} embeddings, ${data.pending_notifications} notifications en attente, ${data.leads_stale + data.projects_stale + data.partners_stale} synthèses à recalculer`,
      };
    }

    case "trigger_proactive_notification": {
      const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      const allowedUsers = Deno.env.get("ALLOWED_TELEGRAM_USERS");
      
      if (!telegramToken) {
        return {
          success: false,
          message: "Telegram non configuré (TELEGRAM_BOT_TOKEN manquant)",
        };
      }

      const priorityEmojis: Record<string, string> = {
        low: "ℹ️",
        medium: "📌",
        high: "⚠️",
        urgent: "🚨",
      };

      const priority = args.priority as string || "medium";
      const emoji = priorityEmojis[priority] || "📌";
      
      let messageText = `${emoji} *Notification IArche*\n\n${args.message}`;
      
      if (args.entity_type && args.entity_id) {
        messageText += `\n\n🔗 _${args.entity_type}: ${args.entity_id}_`;
      }

      // Send to allowed users
      const chatIds = allowedUsers?.split(",").map(s => s.trim()).filter(Boolean) || [];
      let sentCount = 0;

      for (const chatId of chatIds) {
        try {
          const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: messageText,
              parse_mode: "Markdown",
            }),
          });
          
          if (response.ok) sentCount++;
        } catch (e) {
          console.error(`Failed to send Telegram to ${chatId}:`, e);
        }
      }

      // Log the notification
      await supabase.from("activity_log").insert({
        workspace_id: "00000000-0000-0000-0000-000000000001",
        entity_type: args.entity_type || "system",
        entity_id: args.entity_id || "00000000-0000-0000-0000-000000000000",
        activity_type: "proactive_notification",
        title: `Notification ${priority}`,
        content: args.message as string,
        is_ai_generated: true,
        metadata: { priority, telegram_sent: sentCount, channel: "telegram" },
      });

      return {
        success: sentCount > 0,
        sent_to: sentCount,
        total_recipients: chatIds.length,
        priority,
        message: sentCount > 0 
          ? `✅ Notification envoyée à ${sentCount} destinataire(s) via Telegram`
          : "⚠️ Notification enregistrée mais non envoyée (aucun destinataire configuré)",
      };
    }

    // ============ CRUD COMPLET COCKPIT (v5.5) ============
    
    case "update_task": {
      if (!args.task_id) {
        return { success: false, error: "task_id obligatoire" };
      }
      
      const updates: Record<string, unknown> = {};
      if (args.title) updates.title = args.title;
      if (args.description) updates.description = args.description;
      if (args.priority) updates.priority = args.priority;
      if (args.status) updates.status = args.status;
      if (args.due_date) updates.due_date = args.due_date;
      if (args.due_time) updates.due_time = args.due_time;
      
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", args.task_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, task: data, message: `✅ Tâche "${data.title}" mise à jour` };
    }

    case "complete_task": {
      if (!args.task_id) {
        return { success: false, error: "task_id obligatoire" };
      }
      
      const { data, error } = await supabase
        .from("tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", args.task_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, task: data, message: `✅ Tâche "${data.title}" marquée comme terminée` };
    }

    case "snooze_task": {
      if (!args.task_id || !args.snooze_until) {
        return { success: false, error: "task_id et snooze_until obligatoires" };
      }
      
      const { data, error } = await supabase
        .from("tasks")
        .update({ snoozed_until: args.snooze_until })
        .eq("id", args.task_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, task: data, message: `✅ Tâche "${data.title}" reportée au ${args.snooze_until}` };
    }

    case "delete_task": {
      if (!args.task_id) {
        return { success: false, error: "task_id obligatoire" };
      }
      
      const { data: task } = await supabase.from("tasks").select("title").eq("id", args.task_id).single();
      const { error } = await supabase.from("tasks").delete().eq("id", args.task_id);
      
      if (error) throw error;
      return { success: true, message: `✅ Tâche "${task?.title || args.task_id}" supprimée` };
    }

    case "update_project": {
      if (!args.project_id) {
        return { success: false, error: "project_id obligatoire" };
      }
      
      const updates: Record<string, unknown> = {};
      if (args.name) updates.name = args.name;
      if (args.description) updates.description = args.description;
      if (args.status) updates.status = args.status;
      if (args.health_status) updates.health_status = args.health_status;
      if (args.budget_amount !== undefined) updates.budget_amount = args.budget_amount;
      if (args.start_date) updates.start_date = args.start_date;
      if (args.target_end_date) updates.target_end_date = args.target_end_date;
      
      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", args.project_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, project: data, message: `✅ Projet "${data.name}" mis à jour` };
    }

    case "delete_project": {
      if (!args.project_id) {
        return { success: false, error: "project_id obligatoire" };
      }
      
      const { data: proj } = await supabase.from("projects").select("name").eq("id", args.project_id).single();
      const { error } = await supabase.rpc("delete_project_cascade", { p_project_id: args.project_id });
      
      if (error) throw error;
      return { success: true, message: `✅ Projet "${proj?.name || args.project_id}" supprimé avec ses données liées` };
    }

    case "update_meeting_note": {
      if (!args.meeting_note_id) {
        return { success: false, error: "meeting_note_id obligatoire" };
      }
      
      const updates: Record<string, unknown> = {};
      if (args.notes) updates.notes = args.notes;
      if (args.objectives) updates.objectives = args.objectives;
      if (args.next_steps) updates.next_steps = args.next_steps;
      if (args.action_items) updates.action_items = args.action_items;
      
      const { data, error } = await supabase
        .from("meeting_notes")
        .update(updates)
        .eq("id", args.meeting_note_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, meeting_note: data, message: `✅ Compte-rendu mis à jour` };
    }

    case "delete_meeting_note": {
      if (!args.meeting_note_id) {
        return { success: false, error: "meeting_note_id obligatoire" };
      }
      
      const { error } = await supabase.from("meeting_notes").delete().eq("id", args.meeting_note_id);
      
      if (error) throw error;
      return { success: true, message: `✅ Compte-rendu supprimé` };
    }

    case "update_transcription": {
      if (!args.transcription_id) {
        return { success: false, error: "transcription_id obligatoire" };
      }
      
      const updates: Record<string, unknown> = {};
      if (args.title) updates.title = args.title;
      if (args.lead_id) updates.lead_id = args.lead_id;
      if (args.project_id) updates.project_id = args.project_id;
      if (args.transcription_date) updates.transcription_date = args.transcription_date;
      
      const { data, error } = await supabase
        .from("voice_transcriptions")
        .update(updates)
        .eq("id", args.transcription_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, transcription: data, message: `✅ Transcription "${data.title || data.id}" mise à jour` };
    }

    case "update_specification": {
      if (!args.specification_id) {
        return { success: false, error: "specification_id obligatoire" };
      }
      
      const updates: Record<string, unknown> = {};
      if (args.title) updates.title = args.title;
      if (args.description) updates.description = args.description;
      if (args.content) updates.content = args.content;
      if (args.status) updates.status = args.status;
      
      const { data, error } = await supabase
        .from("specifications")
        .update(updates)
        .eq("id", args.specification_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, specification: data, message: `✅ CDC "${data.title}" mis à jour` };
    }

    case "approve_specification": {
      if (!args.specification_id) {
        return { success: false, error: "specification_id obligatoire" };
      }
      
      const { data, error } = await supabase
        .from("specifications")
        .update({ 
          status: "approved", 
          approved_at: new Date().toISOString() 
        })
        .eq("id", args.specification_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, specification: data, message: `✅ CDC "${data.title}" approuvé` };
    }

    case "update_document": {
      if (!args.document_id) {
        return { success: false, error: "document_id obligatoire" };
      }
      
      const updates: Record<string, unknown> = {};
      if (args.title) updates.title = args.title;
      if (args.status) updates.status = args.status;
      if (args.version) updates.version = args.version;
      
      const { data, error } = await supabase
        .from("generated_documents")
        .update(updates)
        .eq("id", args.document_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, document: data, message: `✅ Document "${data.title}" mis à jour` };
    }

    case "approve_document": {
      if (!args.document_id) {
        return { success: false, error: "document_id obligatoire" };
      }
      
      const { data, error } = await supabase
        .from("generated_documents")
        .update({ 
          status: "approved", 
          approved_at: new Date().toISOString() 
        })
        .eq("id", args.document_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, document: data, message: `✅ Document "${data.title}" approuvé` };
    }

    case "delete_lead": {
      if (!args.lead_id) {
        return { success: false, error: "lead_id obligatoire" };
      }
      
      const { data: lead } = await supabase.from("leads").select("name, email").eq("id", args.lead_id).single();
      const { error } = await supabase.rpc("delete_lead_cascade", { p_lead_id: args.lead_id });
      
      if (error) throw error;
      return { success: true, message: `✅ Lead "${lead?.name || args.lead_id}" et ses données liées supprimés` };
    }

    case "update_opportunity": {
      if (!args.opportunity_id) {
        return { success: false, error: "opportunity_id obligatoire" };
      }
      
      const updates: Record<string, unknown> = {};
      if (args.title) updates.title = args.title;
      if (args.description) updates.description = args.description;
      if (args.value_amount !== undefined) updates.value_amount = args.value_amount;
      if (args.probability !== undefined) updates.probability = args.probability;
      if (args.expected_close_date) updates.expected_close_date = args.expected_close_date;
      
      const { data, error } = await supabase
        .from("opportunities")
        .update(updates)
        .eq("id", args.opportunity_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, opportunity: data, message: `✅ Opportunité "${data.title}" mise à jour` };
    }

    case "delete_opportunity": {
      if (!args.opportunity_id) {
        return { success: false, error: "opportunity_id obligatoire" };
      }
      
      const { data: opp } = await supabase.from("opportunities").select("title").eq("id", args.opportunity_id).single();
      const { error } = await supabase.from("opportunities").delete().eq("id", args.opportunity_id);
      
      if (error) throw error;
      return { success: true, message: `✅ Opportunité "${opp?.title || args.opportunity_id}" supprimée` };
    }

    // ============ CRUD ADMIN (v5.5) ============
    
    case "create_article": {
      if (!args.title || !args.slug || !args.resource_type || !args.content) {
        return { success: false, error: "title, slug, resource_type et content obligatoires" };
      }
      
      const { data, error } = await supabase
        .from("articles")
        .insert({
          title: args.title,
          slug: args.slug,
          resource_type: args.resource_type,
          excerpt: args.excerpt || null,
          content: args.content,
          meta_title: args.meta_title || args.title,
          meta_description: args.meta_description || args.excerpt || null,
          tags: args.tags || [],
          published: args.published || false,
          cover_image_url: args.cover_image_url || null,
          status: args.published ? "published" : "draft",
        })
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, article: data, message: `✅ Article "${data.title}" créé (${data.resource_type})` };
    }

    case "update_article": {
      if (!args.article_id) {
        return { success: false, error: "article_id obligatoire" };
      }
      
      const updates: Record<string, unknown> = {};
      if (args.title) updates.title = args.title;
      if (args.excerpt) updates.excerpt = args.excerpt;
      if (args.content) updates.content = args.content;
      if (args.published !== undefined) {
        updates.published = args.published;
        updates.status = args.published ? "published" : "draft";
        if (args.published) updates.published_at = new Date().toISOString();
      }
      if (args.meta_title) updates.meta_title = args.meta_title;
      if (args.meta_description) updates.meta_description = args.meta_description;
      if (args.tags) updates.tags = args.tags;
      
      const { data, error } = await supabase
        .from("articles")
        .update(updates)
        .eq("id", args.article_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, article: data, message: `✅ Article "${data.title}" mis à jour` };
    }

    case "delete_article": {
      if (!args.article_id) {
        return { success: false, error: "article_id obligatoire" };
      }
      
      const { data: article } = await supabase.from("articles").select("title").eq("id", args.article_id).single();
      const { error } = await supabase.from("articles").delete().eq("id", args.article_id);
      
      if (error) throw error;
      return { success: true, message: `✅ Article "${article?.title || args.article_id}" supprimé` };
    }

    case "create_brochure": {
      if (!args.title || !args.slug || !args.cover_title) {
        return { success: false, error: "title, slug et cover_title obligatoires" };
      }
      
      const { data, error } = await supabase
        .from("brochures")
        .insert({
          title: args.title,
          slug: args.slug,
          cover_title: args.cover_title,
          cover_subtitle: args.cover_subtitle || null,
          cover_image_url: args.cover_image_url || null,
          published: args.published || false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, brochure: data, message: `✅ Brochure "${data.title}" créée` };
    }

    case "update_brochure": {
      if (!args.brochure_id) {
        return { success: false, error: "brochure_id obligatoire" };
      }
      
      const updates: Record<string, unknown> = {};
      if (args.title) updates.title = args.title;
      if (args.cover_title) updates.cover_title = args.cover_title;
      if (args.cover_subtitle) updates.cover_subtitle = args.cover_subtitle;
      if (args.published !== undefined) updates.published = args.published;
      
      const { data, error } = await supabase
        .from("brochures")
        .update(updates)
        .eq("id", args.brochure_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, brochure: data, message: `✅ Brochure "${data.title}" mise à jour` };
    }

    case "delete_brochure": {
      if (!args.brochure_id) {
        return { success: false, error: "brochure_id obligatoire" };
      }
      
      const { data: brochure } = await supabase.from("brochures").select("title").eq("id", args.brochure_id).single();
      const { error } = await supabase.from("brochures").delete().eq("id", args.brochure_id);
      
      if (error) throw error;
      return { success: true, message: `✅ Brochure "${brochure?.title || args.brochure_id}" supprimée` };
    }

    case "create_form": {
      if (!args.title) {
        return { success: false, error: "title obligatoire" };
      }
      
      // Generate slug
      const slug = (args.title as string)
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") + "-" + Math.random().toString(36).substring(2, 8);
      
      const { data, error } = await supabase
        .from("forms")
        .insert({
          title: args.title,
          slug,
          description: args.description || null,
          is_active: true,
          fields: [],
        })
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, form: data, message: `✅ Formulaire "${data.title}" créé` };
    }

    case "update_form": {
      if (!args.form_id) {
        return { success: false, error: "form_id obligatoire" };
      }
      
      const updates: Record<string, unknown> = {};
      if (args.title) updates.title = args.title;
      if (args.description) updates.description = args.description;
      if (args.is_active !== undefined) updates.is_active = args.is_active;
      
      const { data, error } = await supabase
        .from("forms")
        .update(updates)
        .eq("id", args.form_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, form: data, message: `✅ Formulaire "${data.title}" mis à jour` };
    }

    case "delete_form": {
      if (!args.form_id) {
        return { success: false, error: "form_id obligatoire" };
      }
      
      const { data: form } = await supabase.from("forms").select("title").eq("id", args.form_id).single();
      const { error } = await supabase.from("forms").delete().eq("id", args.form_id);
      
      if (error) throw error;
      return { success: true, message: `✅ Formulaire "${form?.title || args.form_id}" supprimé` };
    }

    case "approve_comment": {
      if (!args.comment_id) {
        return { success: false, error: "comment_id obligatoire" };
      }
      
      const { data, error } = await supabase
        .from("comments")
        .update({ approved: true })
        .eq("id", args.comment_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, comment: data, message: `✅ Commentaire de "${data.author_name}" approuvé` };
    }

    case "reject_comment": {
      if (!args.comment_id) {
        return { success: false, error: "comment_id obligatoire" };
      }
      
      const { data: comment } = await supabase.from("comments").select("author_name").eq("id", args.comment_id).single();
      const { error } = await supabase.from("comments").delete().eq("id", args.comment_id);
      
      if (error) throw error;
      return { success: true, message: `✅ Commentaire de "${comment?.author_name || "inconnu"}" supprimé` };
    }

    // ============ CRUD COMPLÉMENTAIRE COCKPIT (v5.6) ============
    
    case "create_lead_contact": {
      if (!args.lead_id || !args.name) {
        return { success: false, error: "lead_id et name obligatoires" };
      }
      
      const { data, error } = await supabase
        .from("lead_contacts")
        .insert({
          lead_id: args.lead_id,
          name: args.name,
          email: args.email || null,
          phone: args.phone || null,
          position: args.position || null,
          is_primary: args.is_primary || false,
          notes: args.notes || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, contact: data, message: `✅ Contact "${data.name}" ajouté au lead` };
    }

    case "update_lead_contact": {
      if (!args.contact_id) {
        return { success: false, error: "contact_id obligatoire" };
      }
      
      const updates: Record<string, unknown> = {};
      if (args.name) updates.name = args.name;
      if (args.email) updates.email = args.email;
      if (args.phone) updates.phone = args.phone;
      if (args.position) updates.position = args.position;
      if (args.notes) updates.notes = args.notes;
      
      const { data, error } = await supabase
        .from("lead_contacts")
        .update(updates)
        .eq("id", args.contact_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, contact: data, message: `✅ Contact "${data.name}" mis à jour` };
    }

    case "delete_lead_contact": {
      if (!args.contact_id) {
        return { success: false, error: "contact_id obligatoire" };
      }
      
      const { data: contact } = await supabase.from("lead_contacts").select("name").eq("id", args.contact_id).single();
      const { error } = await supabase.from("lead_contacts").delete().eq("id", args.contact_id);
      
      if (error) throw error;
      return { success: true, message: `✅ Contact "${contact?.name || args.contact_id}" supprimé` };
    }

    case "set_primary_lead_contact": {
      if (!args.contact_id || !args.lead_id) {
        return { success: false, error: "contact_id et lead_id obligatoires" };
      }
      
      // D'abord, retirer le statut primary de tous les contacts du lead
      await supabase
        .from("lead_contacts")
        .update({ is_primary: false })
        .eq("lead_id", args.lead_id);
      
      // Puis définir le nouveau primary
      const { data, error } = await supabase
        .from("lead_contacts")
        .update({ is_primary: true })
        .eq("id", args.contact_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, contact: data, message: `✅ "${data.name}" défini comme contact principal` };
    }

    case "create_project_note": {
      if (!args.project_id || !args.title) {
        return { success: false, error: "project_id et title obligatoires" };
      }
      
      const { data, error } = await supabase
        .from("project_notes")
        .insert({
          project_id: args.project_id,
          workspace_id: "00000000-0000-0000-0000-000000000001",
          title: args.title,
          content: args.content || null,
          note_type: args.note_type || "general",
          tags: args.tags || [],
        })
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, note: data, message: `✅ Note "${data.title}" ajoutée au projet` };
    }

    case "update_project_note": {
      if (!args.note_id) {
        return { success: false, error: "note_id obligatoire" };
      }
      
      const updates: Record<string, unknown> = {};
      if (args.title) updates.title = args.title;
      if (args.content) updates.content = args.content;
      if (args.note_type) updates.note_type = args.note_type;
      if (args.tags) updates.tags = args.tags;
      
      const { data, error } = await supabase
        .from("project_notes")
        .update(updates)
        .eq("id", args.note_id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, note: data, message: `✅ Note "${data.title}" mise à jour` };
    }

    case "delete_project_note": {
      if (!args.note_id) {
        return { success: false, error: "note_id obligatoire" };
      }
      
      const { data: note } = await supabase.from("project_notes").select("title").eq("id", args.note_id).single();
      const { error } = await supabase.from("project_notes").delete().eq("id", args.note_id);
      
      if (error) throw error;
      return { success: true, message: `✅ Note "${note?.title || args.note_id}" supprimée` };
    }

    case "create_context_note": {
      if (!args.entity_type || !args.entity_id || !args.content) {
        return { success: false, error: "entity_type, entity_id et content obligatoires" };
      }
      
      const { data, error } = await supabase
        .from("entity_context_notes")
        .insert({
          entity_type: args.entity_type,
          entity_id: args.entity_id,
          content: args.content,
          workspace_id: "00000000-0000-0000-0000-000000000001",
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Marquer l'entité comme synthesis_stale pour recalcul
      const tableMap: Record<string, string> = {
        lead: "leads",
        project: "projects",
        partner: "partners",
        document: "generated_documents",
        transcription: "voice_transcriptions",
        solution: "articles",
      };
      const table = tableMap[args.entity_type as string];
      if (table) {
        await supabase.from(table).update({ synthesis_stale: true }).eq("id", args.entity_id);
      }
      
      return { success: true, note: data, message: `✅ Note de contexte ajoutée à ${args.entity_type} (synthèse marquée obsolète)` };
    }

    case "update_context_note": {
      if (!args.note_id || !args.content) {
        return { success: false, error: "note_id et content obligatoires" };
      }
      
      const { data, error } = await supabase
        .from("entity_context_notes")
        .update({ content: args.content })
        .eq("id", args.note_id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Marquer l'entité comme synthesis_stale
      const tableMap: Record<string, string> = {
        lead: "leads",
        project: "projects",
        partner: "partners",
        document: "generated_documents",
        transcription: "voice_transcriptions",
        solution: "articles",
      };
      const table = tableMap[data.entity_type as string];
      if (table) {
        await supabase.from(table).update({ synthesis_stale: true }).eq("id", data.entity_id);
      }
      
      return { success: true, note: data, message: `✅ Note de contexte mise à jour` };
    }

    case "delete_context_note": {
      if (!args.note_id) {
        return { success: false, error: "note_id obligatoire" };
      }
      
      const { data: note } = await supabase.from("entity_context_notes").select("entity_type, entity_id").eq("id", args.note_id).single();
      const { error } = await supabase.from("entity_context_notes").delete().eq("id", args.note_id);
      
      if (error) throw error;
      return { success: true, message: `✅ Note de contexte supprimée` };
    }

    case "delete_partner": {
      if (!args.partner_id) {
        return { success: false, error: "partner_id obligatoire" };
      }
      
      const { data: partner } = await supabase.from("partners").select("name").eq("id", args.partner_id).single();
      
      // Soft delete
      const { error } = await supabase
        .from("partners")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", args.partner_id);
      
      if (error) throw error;
      return { success: true, message: `✅ Partenaire "${partner?.name || args.partner_id}" mis à la corbeille` };
    }

    case "update_lead_score": {
      if (!args.lead_id || args.score === undefined) {
        return { success: false, error: "lead_id et score obligatoires" };
      }
      
      const { data, error } = await supabase
        .from("leads")
        .update({
          lead_score: args.score,
          lead_score_details: args.details || {},
        })
        .eq("id", args.lead_id)
        .select("id, name, lead_score")
        .single();
      
      if (error) throw error;
      return { success: true, lead: data, message: `✅ Score de "${data.name}" mis à jour : ${data.lead_score}/100` };
    }

    // ============ VIVIERS - Cold Leads Module ============

    case "get_viviers": {
      let query = supabase
        .from("viviers")
        .select("id, email, name, first_name, company, phone, industry, city, source, cold_score, tags, promoted_at, promoted_to_lead_id, created_at")
        .order("cold_score", { ascending: false, nullsFirst: false })
        .limit(args.limit as number || 20);

      if (args.query) {
        const searchQuery = sanitizeSearchInput(args.query as string);
        if (searchQuery) {
          query = query.or(`name.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
        }
      }
      if (args.source) query = query.eq("source", args.source);
      if (args.min_score) query = query.gte("cold_score", args.min_score);
      if (args.max_score) query = query.lte("cold_score", args.max_score);
      if (args.promoted === true) query = query.not("promoted_at", "is", null);
      if (args.promoted === false) query = query.is("promoted_at", null);

      const { data, error } = await query;
      if (error) throw error;
      return { viviers: data, count: data?.length || 0 };
    }

    case "search_viviers": {
      const searchQuery = sanitizeSearchInput(args.query as string);
      if (!searchQuery) {
        return { viviers: [], count: 0, message: "Terme de recherche requis" };
      }

      const { data, error } = await supabase
        .from("viviers")
        .select("id, email, name, first_name, company, phone, industry, city, source, cold_score, tags, siret, promoted_at")
        .or(`name.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .order("cold_score", { ascending: false })
        .limit(15);

      if (error) throw error;
      return { viviers: data, count: data?.length || 0, query: searchQuery };
    }

    case "score_viviers": {
      // Score viviers using vivier-score prompt
      const vivierIds = args.vivier_ids as string[] || [];
      
      if (vivierIds.length === 0 && !args.segment_query) {
        return { success: false, error: "vivier_ids ou segment_query requis" };
      }

      // Fetch viviers to score
      let query = supabase.from("viviers").select("*").is("promoted_at", null);
      if (vivierIds.length > 0) {
        query = query.in("id", vivierIds);
      } else {
        query = query.limit(50); // Limit batch size
      }

      const { data: viviers, error } = await query;
      if (error) throw error;

      // For each vivier, calculate a simple score based on completeness
      const scoredViviers = [];
      for (const vivier of viviers || []) {
        let score = 0;
        // Completude (30 pts)
        if (vivier.email) score += 10;
        if (vivier.phone) score += 10;
        if (vivier.siret) score += 10;
        // Secteur cible (25 pts) - tech, conseil, industrie prioritaires
        const targetIndustries = ["tech", "conseil", "industrie", "services", "informatique", "digital"];
        if (vivier.industry && targetIndustries.some(t => vivier.industry.toLowerCase().includes(t))) score += 25;
        // Taille entreprise (20 pts) - PME/ETI prioritaires
        const targetSizes = ["pme", "eti", "50-249", "250-999"];
        if (vivier.company_size && targetSizes.some(t => vivier.company_size.toLowerCase().includes(t))) score += 20;
        // Localisation (15 pts) - IDF, grandes métropoles
        const targetCities = ["paris", "lyon", "bordeaux", "toulouse", "nantes", "marseille", "lille", "bayonne"];
        if (vivier.city && targetCities.some(c => vivier.city.toLowerCase().includes(c))) score += 15;
        // Signaux business (10 pts)
        if (vivier.website || vivier.linkedin_url) score += 10;

        scoredViviers.push({ id: vivier.id, email: vivier.email, name: vivier.name, old_score: vivier.cold_score, new_score: score });
        
        // Update score
        await supabase.from("viviers").update({ cold_score: score }).eq("id", vivier.id);
      }

      return { 
        success: true, 
        scored: scoredViviers.length, 
        viviers: scoredViviers.slice(0, 10),
        message: `✅ ${scoredViviers.length} viviers scorés`
      };
    }

    case "promote_viviers_to_leads": {
      const vivierIds = args.vivier_ids as string[];
      if (!vivierIds || vivierIds.length === 0) {
        return { success: false, error: "vivier_ids requis" };
      }

      // Call edge function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/promote-vivier-to-lead`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vivier_ids: vivierIds, enrich: args.enrich !== false }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Promotion failed: ${errorText}`);
      }

      const result = await response.json();
      return { 
        success: true, 
        ...result,
        message: `✅ ${result.promoted} nouveaux leads créés, ${result.updated} existants enrichis`
      };
    }

    case "get_vivier_campaigns": {
      let query = supabase
        .from("vivier_campaigns")
        .select("id, name, status, emails_sent, emails_opened, emails_clicked, emails_replied, instantly_campaign_id, created_at, launched_at")
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 10);

      if (args.status) query = query.eq("status", args.status);

      const { data, error } = await query;
      if (error) throw error;
      return { campaigns: data, count: data?.length || 0 };
    }

    case "create_vivier_campaign": {
      if (!args.name) {
        return { success: false, error: "name obligatoire" };
      }

      // Get viviers for campaign
      const vivierIds = args.vivier_ids as string[] || [];
      let targetVivierCount = 0;

      if (vivierIds.length > 0) {
        targetVivierCount = vivierIds.length;
      } else if (args.segment_query) {
        // Count matching viviers (simplified - would use vivier-target prompt in production)
        const { count } = await supabase
          .from("viviers")
          .select("id", { count: "exact", head: true })
          .is("promoted_at", null)
          .gte("cold_score", 50);
        targetVivierCount = count || 0;
      }

      // Create campaign
      const { data: campaign, error } = await supabase
        .from("vivier_campaigns")
        .insert({
          name: args.name,
          status: "draft",
          domain_id: args.domain_id || null,
          segment_criteria: args.segment_query ? { query: args.segment_query } : null,
          emails_sent: 0,
          emails_opened: 0,
          emails_clicked: 0,
          emails_replied: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Add recipients if specific IDs provided
      if (vivierIds.length > 0) {
        const recipients = vivierIds.map(id => ({
          campaign_id: campaign.id,
          vivier_id: id,
        }));
        await supabase.from("vivier_campaign_recipients").insert(recipients);
      }

      return { 
        success: true, 
        campaign,
        target_count: targetVivierCount,
        message: `✅ Campagne "${campaign.name}" créée avec ${targetVivierCount} prospects ciblés`
      };
    }

    case "preview_campaign_email": {
      if (!args.campaign_id) {
        return { success: false, error: "campaign_id obligatoire" };
      }

      const { data: campaign } = await supabase
        .from("vivier_campaigns")
        .select("*, email_sequence")
        .eq("id", args.campaign_id)
        .single();

      if (!campaign) {
        return { success: false, error: "Campagne non trouvée" };
      }

      // Get sample vivier for preview
      let sampleVivier = null;
      if (args.vivier_id) {
        const { data } = await supabase.from("viviers").select("*").eq("id", args.vivier_id).single();
        sampleVivier = data;
      } else {
        const { data: recipients } = await supabase
          .from("vivier_campaign_recipients")
          .select("vivier_id, viviers(*)")
          .eq("campaign_id", args.campaign_id)
          .limit(1);
        sampleVivier = recipients?.[0]?.viviers;
      }

      // Mock email preview (in production, would use stored sequence)
      const step = (args.step as number) || 1;
      const emailPreview = {
        step,
        subject: `[Preview] Email Step ${step}`,
        body: sampleVivier 
          ? `Bonjour ${sampleVivier.first_name || sampleVivier.name?.split(" ")[0] || ""},\n\nCeci est un aperçu de l'email pour ${sampleVivier.company || "votre entreprise"}...`
          : "Aucun vivier disponible pour prévisualisation",
        variables_resolved: sampleVivier ? { first_name: sampleVivier.first_name, company: sampleVivier.company } : {},
      };

      return { success: true, campaign_name: campaign.name, preview: emailPreview };
    }

    case "launch_vivier_campaign": {
      if (!args.campaign_id) {
        return { success: false, error: "campaign_id obligatoire" };
      }
      if (args.confirm !== true) {
        return { success: false, error: "Confirmation explicite requise (confirm: true)" };
      }

      // Call edge function to launch
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-instantly-campaign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ campaign_id: args.campaign_id, action: "launch" }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Launch failed: ${errorText}`);
      }

      const result = await response.json();
      return { 
        success: true, 
        ...result,
        message: `🚀 Campagne lancée via Instantly`
      };
    }

    case "get_email_domains": {
      let query = supabase
        .from("email_domains")
        .select("id, domain, from_email, from_name, provider, domain_type, is_active, warmup_status, warmup_day, spf_valid, dkim_valid, dmarc_valid")
        .eq("is_active", true)
        .order("domain_type", { ascending: true });

      if (args.provider) query = query.eq("provider", args.provider);
      if (args.domain_type) query = query.eq("domain_type", args.domain_type);

      const { data, error } = await query;
      if (error) throw error;
      
      // Summary stats
      const summary = {
        total: data?.length || 0,
        core: (data || []).filter((d: { domain_type: string }) => d.domain_type === "core").length,
        satellite: (data || []).filter((d: { domain_type: string }) => d.domain_type === "satellite").length,
        warming: (data || []).filter((d: { warmup_status: string }) => d.warmup_status === "warming").length,
        ready: (data || []).filter((d: { warmup_status: string }) => d.warmup_status === "ready").length,
      };

      return { domains: data, summary };
    }

    case "clean_viviers": {
      const previewOnly = args.preview_only !== false;
      const vivierIds = args.vivier_ids as string[] || null;

      // Fetch viviers to analyze
      let query = supabase.from("viviers").select("id, email, name, company, siret, phone, city").is("promoted_at", null);
      if (vivierIds && vivierIds.length > 0) {
        query = query.in("id", vivierIds);
      }
      query = query.limit(500);

      const { data: viviers, error } = await query;
      if (error) throw error;

      // Simple duplicate detection (same email)
      const emailCounts: Record<string, string[]> = {};
      const invalidEmails: { id: string; email: string; reason: string }[] = [];
      const genericEmails: { id: string; email: string }[] = [];

      for (const v of viviers || []) {
        // Track duplicates
        if (v.email) {
          if (!emailCounts[v.email]) emailCounts[v.email] = [];
          emailCounts[v.email].push(v.id);

          // Check for generic emails
          const genericPrefixes = ["info@", "contact@", "noreply@", "admin@", "support@"];
          if (genericPrefixes.some(p => v.email.toLowerCase().startsWith(p))) {
            genericEmails.push({ id: v.id, email: v.email });
          }
        } else {
          invalidEmails.push({ id: v.id, email: "", reason: "missing_email" });
        }
      }

      // Find duplicates
      const duplicates = Object.entries(emailCounts)
        .filter(([_, ids]) => ids.length > 1)
        .map(([email, ids]) => ({ email, ids, count: ids.length }));

      const summary: { 
        total_analyzed: number; 
        duplicates_found: number; 
        invalid_emails: number; 
        generic_emails: number; 
        duplicates_deleted?: number;
      } = {
        total_analyzed: viviers?.length || 0,
        duplicates_found: duplicates.length,
        invalid_emails: invalidEmails.length,
        generic_emails: genericEmails.length,
      };

      if (!previewOnly && duplicates.length > 0) {
        // Delete duplicates (keep first)
        for (const dup of duplicates) {
          const idsToDelete = dup.ids.slice(1);
          await supabase.from("viviers").delete().in("id", idsToDelete);
        }
        summary.duplicates_deleted = duplicates.reduce((sum, d) => sum + d.ids.length - 1, 0);
      }

      return { 
        success: true, 
        preview_only: previewOnly,
        summary,
        duplicates: duplicates.slice(0, 10),
        generic_emails: genericEmails.slice(0, 10),
        message: previewOnly 
          ? `📊 Analyse: ${summary.duplicates_found} doublons, ${summary.generic_emails} emails génériques`
          : `🧹 Nettoyage effectué: ${summary.duplicates_deleted || 0} doublons supprimés`
      };
    }

    // ============ NOUVEAUX OUTILS EDGE FUNCTIONS (v7.0) ============
    
    case "lookup_company": {
      const siret = args.siret as string;
      const siren = args.siren as string;
      const companyName = args.company_name as string;
      const leadId = args.lead_id as string;

      if (!siret && !siren && !companyName) {
        return { success: false, error: "siret, siren ou company_name requis" };
      }

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/pappers-lookup`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ siret, siren, company_name: companyName }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return { success: false, error: `Pappers lookup failed: ${errorText}` };
        }

        const result = await response.json();

        // If lead_id provided, enrich the lead with company data
        if (leadId && result.company) {
          const company = result.company;
          await supabase.from("leads").update({
            company: company.denomination || company.nom_entreprise,
            siret: company.siret,
            industry: company.libelle_code_naf,
            company_size: company.tranche_effectif,
            city: company.siege?.ville,
            address: company.siege?.adresse_ligne_1,
            postal_code: company.siege?.code_postal,
          }).eq("id", leadId);
          
          result.lead_enriched = true;
          result.message = `✅ Entreprise trouvée et lead enrichi : ${company.denomination || company.nom_entreprise}`;
        } else if (result.company) {
          result.message = `✅ Entreprise trouvée : ${result.company.denomination || result.company.nom_entreprise}`;
        }

        return result;
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Pappers lookup error" };
      }
    }

    case "generate_article_faq": {
      const articleId = args.article_id as string;
      const mode = (args.mode as string) || "new";

      if (!articleId) {
        return { success: false, error: "article_id requis" };
      }

      // Get article
      const { data: article, error: articleError } = await supabase
        .from("articles")
        .select("id, title, content, resource_type, faq")
        .eq("id", articleId)
        .single();

      if (articleError || !article) {
        return { success: false, error: "Article non trouvé" };
      }

      const existingQuestions = article.faq ? (article.faq as Array<{question: string}>).map(f => f.question) : [];

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-faq`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            article_id: articleId,
            title: article.title,
            content: article.content,
            resource_type: article.resource_type,
            mode,
            existing_questions: existingQuestions,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return { success: false, error: `FAQ generation failed: ${errorText}` };
        }

        const result = await response.json();
        return {
          success: true,
          faq_count: result.questions?.length || 0,
          message: `✅ FAQ générée : ${result.questions?.length || 0} questions pour "${article.title}"`
        };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "FAQ generation error" };
      }
    }

    case "enrich_content_seo": {
      const articleId = args.article_id as string;

      if (!articleId) {
        return { success: false, error: "article_id requis" };
      }

      const { data: article } = await supabase
        .from("articles")
        .select("id, title, content, resource_type")
        .eq("id", articleId)
        .single();

      if (!article) {
        return { success: false, error: "Article non trouvé" };
      }

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/enrich-content-seo`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: article.content,
            resourceType: article.resource_type,
          }),
        });

        if (!response.ok) {
          return { success: false, error: "SEO enrichment failed" };
        }

        const result = await response.json();
        
        // Update article with enriched content
        if (result.enrichedContent) {
          await supabase.from("articles").update({ content: result.enrichedContent }).eq("id", articleId);
        }

        return {
          success: true,
          message: `✅ Contenu SEO enrichi pour "${article.title}"`
        };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "SEO enrichment error" };
      }
    }

    case "suggest_article_tags": {
      const articleId = args.article_id as string;

      if (!articleId) {
        return { success: false, error: "article_id requis" };
      }

      const { data: article } = await supabase
        .from("articles")
        .select("id, title, content, excerpt")
        .eq("id", articleId)
        .single();

      if (!article) {
        return { success: false, error: "Article non trouvé" };
      }

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/suggest-tags`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: article.title,
            content: article.content || article.excerpt,
          }),
        });

        if (!response.ok) {
          return { success: false, error: "Tag suggestion failed" };
        }

        const result = await response.json();
        return {
          success: true,
          suggested_tags: result.tags || [],
          message: `✅ ${result.tags?.length || 0} tags suggérés pour "${article.title}"`
        };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Tag suggestion error" };
      }
    }

    case "refresh_entity_synthesis": {
      const entityType = args.entity_type as string;
      const entityId = args.entity_id as string;

      if (!entityType || !entityId) {
        return { success: false, error: "entity_type et entity_id requis" };
      }

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/synthesize-entity-documents`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ entity_type: entityType, entity_id: entityId }),
        });

        if (!response.ok) {
          return { success: false, error: "Synthesis refresh failed" };
        }

        const result = await response.json();
        return {
          success: true,
          synthesis_updated: true,
          message: `✅ Synthèse 360° rafraîchie pour ${entityType} ${entityId.slice(0, 8)}...`
        };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Synthesis error" };
      }
    }

    case "get_email_logs": {
      let query = supabase
        .from("email_logs")
        .select("id, email_type, recipient_email, subject, status, sent_at, error_message, source_type, created_at")
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 20);

      if (args.email_type) query = query.eq("email_type", args.email_type);
      if (args.status) query = query.eq("status", args.status);
      if (args.recipient_email) query = query.eq("recipient_email", args.recipient_email);

      const { data, error } = await query;
      if (error) throw error;

      return { 
        logs: data, 
        count: data?.length || 0,
        message: `📧 ${data?.length || 0} logs d'emails trouvés`
      };
    }

    case "get_audit_logs": {
      let query = supabase
        .from("admin_audit_logs")
        .select("id, action_type, resource_type, resource_name, user_email, created_at, ip_address")
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 50);

      if (args.action_type) query = query.eq("action_type", args.action_type);
      if (args.resource_type) query = query.eq("resource_type", args.resource_type);
      if (args.user_email) query = query.eq("user_email", args.user_email);

      const { data, error } = await query;
      if (error) throw error;

      return { 
        logs: data, 
        count: data?.length || 0,
        message: `📋 ${data?.length || 0} logs d'audit trouvés`
      };
    }

    case "get_rag_status": {
      let query = supabase
        .from("vectorization_status")
        .select("resource_type, resource_id, status, last_vectorized_at, error_message, chunks_count")
        .order("last_vectorized_at", { ascending: false, nullsFirst: true })
        .limit(50);

      if (args.resource_type) query = query.eq("resource_type", args.resource_type);
      if (args.stale_only) query = query.neq("status", "completed");

      const { data, error } = await query;
      if (error) throw error;

      // Count by status
      const statusCounts: Record<string, number> = {};
      for (const item of data || []) {
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      }

      return { 
        items: data, 
        count: data?.length || 0,
        status_summary: statusCounts,
        message: `🔍 Statut RAG : ${statusCounts.completed || 0} indexés, ${statusCounts.pending || 0} en attente, ${statusCounts.failed || 0} en erreur`
      };
    }

    case "trigger_embedding_refresh": {
      const resourceType = args.resource_type as string;
      const resourceId = args.resource_id as string;

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-embeddings`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            resource_type: resourceType,
            resource_id: resourceId,
            force_refresh: true 
          }),
        });

        if (!response.ok) {
          return { success: false, error: "Embedding refresh failed" };
        }

        const result = await response.json();
        return {
          success: true,
          refreshed: result.processed || 1,
          message: resourceId 
            ? `🔄 Embeddings rafraîchis pour ${resourceType} ${resourceId.slice(0, 8)}...`
            : `🔄 Embeddings rafraîchis pour tous les ${resourceType}`
        };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Embedding refresh error" };
      }
    }

    case "send_followup_email": {
      const leadId = args.lead_id as string;
      const emailType = args.email_type as string;
      const customMessage = args.custom_message as string;
      const previewOnly = args.preview_only !== false;

      if (!leadId || !emailType) {
        return { success: false, error: "lead_id et email_type requis" };
      }

      // Get lead info
      const { data: lead } = await supabase
        .from("leads")
        .select("id, name, email, company, source_context, ai_documents_summary")
        .eq("id", leadId)
        .single();

      if (!lead) {
        return { success: false, error: "Lead non trouvé" };
      }

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-followup-email`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lead_id: leadId,
            lead_name: lead.name,
            lead_email: lead.email,
            company: lead.company,
            context: lead.ai_documents_summary || lead.source_context,
            email_type: emailType,
            custom_message: customMessage,
            send_now: !previewOnly,
          }),
        });

        if (!response.ok) {
          return { success: false, error: "Email generation failed" };
        }

        const result = await response.json();
        return {
          success: true,
          preview: previewOnly,
          email_subject: result.subject,
          email_content: result.content?.slice(0, 500) + (result.content?.length > 500 ? "..." : ""),
          sent: !previewOnly && result.sent,
          message: previewOnly 
            ? `📧 Email de ${emailType} préparé pour ${lead.name}. Confirmez l'envoi.`
            : `✅ Email de ${emailType} envoyé à ${lead.email}`
        };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Email error" };
      }
    }

    // ============ NOUVEAUX OUTILS v8.0 ============

    case "sync_google_calendar": {
      const direction = (args.direction as string) || "both";
      const daysRange = (args.days_range as number) || 30;

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-google-calendar`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ direction, days_range: daysRange }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return { success: false, error: `Sync failed: ${errorText}` };
        }

        const result = await response.json();
        return {
          success: true,
          synced: result.synced || 0,
          created: result.created || 0,
          updated: result.updated || 0,
          message: `📅 Calendrier synchronisé : ${result.synced || 0} événements (${result.created || 0} créés, ${result.updated || 0} mis à jour)`
        };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Sync error" };
      }
    }

    case "generate_article_ai": {
      const topic = args.topic as string;
      const resourceType = args.resource_type as string;
      const keywords = args.keywords as string[] || [];
      const tone = (args.tone as string) || "professionnel";
      const length = (args.length as string) || "moyen";

      if (!topic || !resourceType) {
        return { success: false, error: "topic et resource_type requis" };
      }

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-article-gpt`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic,
            resource_type: resourceType,
            keywords,
            tone,
            length,
            save_draft: true,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return { success: false, error: `Article generation failed: ${errorText}` };
        }

        const result = await response.json();
        return {
          success: true,
          article_id: result.article?.id || result.id,
          title: result.article?.title || result.title,
          slug: result.article?.slug || result.slug,
          word_count: result.word_count,
          message: `✍️ Article généré : "${result.article?.title || result.title}" (${result.word_count || "~1000"} mots)`
        };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Article generation error" };
      }
    }

    case "create_backup": {
      const backupType = (args.backup_type as string) || "full";
      const tables = args.tables as string[] || [];

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/create-database-backup`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ backup_type: backupType, tables }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return { success: false, error: `Backup failed: ${errorText}` };
        }

        const result = await response.json();
        return {
          success: true,
          backup_id: result.backup_id || result.id,
          status: result.status,
          tables_count: result.tables_backed_up?.length || 0,
          message: `💾 Backup ${backupType} créé : ${result.tables_backed_up?.length || 0} tables sauvegardées`
        };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Backup error" };
      }
    }

    case "get_telegram_stats": {
      const period = (args.period as string) || "week";
      
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      switch (period) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      const { data: stats, error } = await supabase
        .from("telegram_stats")
        .select("message_count, error_count, avg_response_time_ms, date")
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (error) throw error;

      // Aggregate stats
      const totalMessages = (stats || []).reduce((sum: number, s: { message_count?: number }) => sum + (s.message_count || 0), 0);
      const totalErrors = (stats || []).reduce((sum: number, s: { error_count?: number }) => sum + (s.error_count || 0), 0);
      const avgResponseTime = (stats || []).length > 0 
        ? Math.round((stats || []).reduce((sum: number, s: { avg_response_time_ms?: number }) => sum + (s.avg_response_time_ms || 0), 0) / stats!.length)
        : 0;
      const successRate = totalMessages > 0 ? Math.round((1 - totalErrors / totalMessages) * 100) : 100;

      return {
        period,
        total_messages: totalMessages,
        total_errors: totalErrors,
        success_rate: `${successRate}%`,
        avg_response_time_ms: avgResponseTime,
        days_analyzed: (stats || []).length,
        message: `📊 Stats Telegram (${period}): ${totalMessages} messages, ${successRate}% succès, ${avgResponseTime}ms moyenne`
      };
    }

    case "get_calendar_availability": {
      const startDate = args.start_date as string;
      const endDate = args.end_date as string || startDate;
      const durationMinutes = (args.duration_minutes as number) || 60;
      const bookingTypeSlug = args.booking_type_slug as string;

      if (!startDate) {
        return { success: false, error: "start_date requis (YYYY-MM-DD)" };
      }

      // Get existing bookings in range
      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("start_time, end_time")
        .gte("start_time", startDate)
        .lte("start_time", endDate + "T23:59:59")
        .neq("status", "cancelled");

      // Get availability rules
      const { data: availabilityRules } = await supabase
        .from("booking_availability")
        .select("day_of_week, start_time, end_time, is_active")
        .eq("is_active", true);

      // Calculate available slots (simplified)
      const slots: { date: string; time: string; available: boolean }[] = [];
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        const dateStr = d.toISOString().split("T")[0];
        
        // Check availability rules for this day
        const dayRules = (availabilityRules || []).filter((r: { day_of_week: number }) => r.day_of_week === dayOfWeek);
        
        for (const rule of dayRules) {
          // Generate slots from rule.start_time to rule.end_time
          const [startH, startM] = rule.start_time.split(":").map(Number);
          const [endH, endM] = rule.end_time.split(":").map(Number);
          
          for (let h = startH; h < endH; h++) {
            for (const m of [0, 30]) {
              if (h === startH && m < startM) continue;
              if (h === endH - 1 && m + durationMinutes / 60 > 60) continue;
              
              const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
              const slotStart = new Date(`${dateStr}T${timeStr}:00`);
              const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
              
              // Check if slot overlaps with existing bookings
              const isOverlapping = (existingBookings || []).some((b: { start_time: string; end_time: string }) => {
                const bStart = new Date(b.start_time);
                const bEnd = new Date(b.end_time);
                return slotStart < bEnd && slotEnd > bStart;
              });
              
              if (!isOverlapping) {
                slots.push({ date: dateStr, time: timeStr, available: true });
              }
            }
          }
        }
      }

      return {
        start_date: startDate,
        end_date: endDate,
        duration_minutes: durationMinutes,
        available_slots: slots.slice(0, 20),
        total_available: slots.length,
        message: `📅 ${slots.length} créneaux disponibles entre le ${startDate} et le ${endDate}`
      };
    }

    case "detect_security_anomalies": {
      const periodHours = (args.period_hours as number) || 24;
      const includeResolved = args.include_resolved === true;

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/detect-anomalies`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ period_hours: periodHours, include_resolved: includeResolved }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return { success: false, error: `Anomaly detection failed: ${errorText}` };
        }

        const result = await response.json();
        return {
          success: true,
          anomalies_found: result.anomalies?.length || 0,
          anomalies: result.anomalies?.slice(0, 10) || [],
          period_hours: periodHours,
          message: result.anomalies?.length > 0 
            ? `⚠️ ${result.anomalies.length} anomalies détectées dans les dernières ${periodHours}h`
            : `✅ Aucune anomalie détectée dans les dernières ${periodHours}h`
        };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Anomaly detection error" };
      }
    }

    case "get_security_logs": {
      let query = supabase
        .from("login_attempts")
        .select("id, email, success, failure_reason, attempted_at, ip_address, user_agent")
        .order("attempted_at", { ascending: false })
        .limit(args.limit as number || 50);

      if (args.email) query = query.eq("email", args.email);
      if (args.success_only === true) query = query.eq("success", true);
      if (args.failed_only === true) query = query.eq("success", false);

      const { data, error } = await query;
      if (error) throw error;

      // Calculate summary
      const successCount = (data || []).filter((l: { success: boolean }) => l.success).length;
      const failedCount = (data || []).filter((l: { success: boolean }) => !l.success).length;

      return {
        logs: data,
        count: data?.length || 0,
        summary: {
          successful: successCount,
          failed: failedCount,
          success_rate: data?.length ? `${Math.round(successCount / data.length * 100)}%` : "N/A"
        },
        message: `🔐 ${data?.length || 0} tentatives de connexion (${successCount} réussies, ${failedCount} échouées)`
      };
    }

    case "get_performance_metrics": {
      const environment = (args.environment as string) || "production";
      const limit = (args.limit as number) || 10;

      const { data, error } = await supabase
        .from("performance_metrics")
        .select("performance_score, accessibility_score, best_practices_score, seo_score, lcp, fcp, cls, recorded_at, environment")
        .eq("environment", environment)
        .order("recorded_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Calculate averages
      const avgPerformance = data?.length 
        ? Math.round((data.reduce((sum: number, m: { performance_score?: number }) => sum + (m.performance_score || 0), 0) / data.length))
        : 0;
      const avgSeo = data?.length 
        ? Math.round((data.reduce((sum: number, m: { seo_score?: number }) => sum + (m.seo_score || 0), 0) / data.length))
        : 0;

      return {
        metrics: data,
        count: data?.length || 0,
        averages: {
          performance: avgPerformance,
          seo: avgSeo,
          accessibility: data?.length ? Math.round(data.reduce((sum: number, m: { accessibility_score?: number }) => sum + (m.accessibility_score || 0), 0) / data.length) : 0,
        },
        environment,
        message: `📈 Performance ${environment}: ${avgPerformance}/100 (SEO: ${avgSeo}/100)`
      };
    }

    case "get_stale_entities": {
      const entityType = (args.entity_type as string) || "all";
      const limit = (args.limit as number) || 20;

      const results: { type: string; id: string; name: string; stale_since?: string }[] = [];

      if (entityType === "all" || entityType === "lead") {
        const { data: leads } = await supabase
          .from("leads")
          .select("id, name, updated_at")
          .eq("synthesis_stale", true)
          .limit(limit);
        for (const l of leads || []) {
          results.push({ type: "lead", id: l.id, name: l.name, stale_since: l.updated_at });
        }
      }

      if (entityType === "all" || entityType === "project") {
        const { data: projects } = await supabase
          .from("projects")
          .select("id, name, updated_at")
          .eq("synthesis_stale", true)
          .limit(limit);
        for (const p of projects || []) {
          results.push({ type: "project", id: p.id, name: p.name, stale_since: p.updated_at });
        }
      }

      if (entityType === "all" || entityType === "partner") {
        const { data: partners } = await supabase
          .from("partners")
          .select("id, name, updated_at")
          .eq("synthesis_stale", true)
          .is("deleted_at", null)
          .limit(limit);
        for (const p of partners || []) {
          results.push({ type: "partner", id: p.id, name: p.name, stale_since: p.updated_at });
        }
      }

      return {
        stale_entities: results.slice(0, limit),
        count: results.length,
        by_type: {
          leads: results.filter(r => r.type === "lead").length,
          projects: results.filter(r => r.type === "project").length,
          partners: results.filter(r => r.type === "partner").length,
        },
        message: results.length > 0
          ? `⚠️ ${results.length} entités ont une synthèse obsolète`
          : `✅ Toutes les synthèses sont à jour`
      };
    }

    case "bulk_refresh_syntheses": {
      const entityType = (args.entity_type as string) || "all";
      const maxCount = (args.max_count as number) || 10;

      // Get stale entities
      const staleEntities: { type: string; id: string }[] = [];

      if (entityType === "all" || entityType === "lead") {
        const { data } = await supabase
          .from("leads")
          .select("id")
          .eq("synthesis_stale", true)
          .limit(maxCount);
        for (const l of data || []) {
          staleEntities.push({ type: "lead", id: l.id });
        }
      }

      if (entityType === "all" || entityType === "project") {
        const remaining = maxCount - staleEntities.length;
        if (remaining > 0) {
          const { data } = await supabase
            .from("projects")
            .select("id")
            .eq("synthesis_stale", true)
            .limit(remaining);
          for (const p of data || []) {
            staleEntities.push({ type: "project", id: p.id });
          }
        }
      }

      if (entityType === "all" || entityType === "partner") {
        const remaining = maxCount - staleEntities.length;
        if (remaining > 0) {
          const { data } = await supabase
            .from("partners")
            .select("id")
            .eq("synthesis_stale", true)
            .is("deleted_at", null)
            .limit(remaining);
          for (const p of data || []) {
            staleEntities.push({ type: "partner", id: p.id });
          }
        }
      }

      if (staleEntities.length === 0) {
        return {
          success: true,
          refreshed: 0,
          message: "✅ Aucune synthèse obsolète à régénérer"
        };
      }

      // Trigger refresh for each (fire and forget)
      let refreshedCount = 0;
      for (const entity of staleEntities.slice(0, maxCount)) {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/synthesize-entity-documents`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ entity_type: entity.type, entity_id: entity.id }),
          });
          refreshedCount++;
        } catch {
          // Continue on error
        }
      }

      return {
        success: true,
        refreshed: refreshedCount,
        total_stale: staleEntities.length,
        message: `🔄 ${refreshedCount} synthèses en cours de régénération`
      };
    }

    // ============ PHASE 1 - MEMORY ENRICHMENT ============
    case "save_user_preference": {
      const prefText = args.preference_text as string;
      const category = (args.category as string) || "user_preference";
      const importance = (args.importance_score as number) || 0.85;

      if (!prefText || prefText.length < 5) {
        return { success: false, error: "preference_text trop court (min 5 chars)" };
      }

      try {
        // Preferences expire after 180 days (CDC v3.1)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 180);

        await saveMemory(supabase, {
          memory_type: "preference",
          category,
          content: prefText,
          importance_score: Math.min(importance, 1.0),
          expires_at: expiresAt.toISOString(),
          metadata: { saved_by: "user_preference_tool", auto_detected: false, expiration_days: 180 },
        }, workspaceId, userId, sessionId);

        return {
          success: true,
          message: `✅ Préférence sauvegardée : "${prefText.substring(0, 50)}..."`
        };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Memory error" };
      }
    }

    case "save_context_insight": {
      const insightText = args.insight_text as string;
      const entityType = args.entity_type as string | undefined;
      const entityId = args.entity_id as string | undefined;
      const importance = (args.importance_score as number) || 0.6;

      if (!insightText || insightText.length < 5) {
        return { success: false, error: "insight_text trop court (min 5 chars)" };
      }

      try {
        // Expire en 30 jours
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await saveMemory(supabase, {
          memory_type: "insight",
          category: "crm_context",
          entity_type: entityType,
          entity_id: entityId,
          content: insightText,
          importance_score: Math.min(importance, 1.0),
          expires_at: expiresAt.toISOString(),
          metadata: { saved_by: "context_insight_tool", expiration_days: 30 },
        }, workspaceId, userId, sessionId);

        return {
          success: true,
          message: `💡 Insight sauvegardé : "${insightText.substring(0, 50)}..."`
        };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Memory error" };
      }
    }

    // ============ PHASE 2 - INTERVIEW MODE ============
    case "detect_missing_fields": {
      const entityType = args.entity_type as string;
      const entityId = sanitizeUUID(args.entity_id as string);

      if (!entityId) {
        return { success: false, error: "entity_id invalide (UUID requis)" };
      }

      const criticalFields: Record<string, { table: string; fields: string[] }> = {
        lead: {
          table: "leads",
          fields: ["email", "phone", "company", "industry", "budget", "source", "position", "city"],
        },
        opportunity: {
          table: "opportunities",
          fields: ["value_amount", "probability", "expected_close_date", "stage"],
        },
        project: {
          table: "projects",
          fields: ["budget_amount", "start_date", "target_end_date", "health_status"],
        },
      };

      const config = criticalFields[entityType];
      if (!config) {
        return { success: false, error: `Type d'entité non supporté: ${entityType}` };
      }

      try {
        const { data, error } = await supabase
          .from(config.table)
          .select(config.fields.join(", ") + ", id, name")
          .eq("id", entityId)
          .single();

        if (error || !data) {
          return { success: false, error: error?.message || "Entité introuvable" };
        }

        const missingFields: string[] = [];
        const presentFields: Record<string, unknown> = {};

        for (const field of config.fields) {
          const value = data[field];
          if (value === null || value === undefined || value === "") {
            missingFields.push(field);
          } else {
            presentFields[field] = value;
          }
        }

        const completionRate = Math.round(((config.fields.length - missingFields.length) / config.fields.length) * 100);

        return {
          success: true,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: data.name || entityId,
          missing_fields: missingFields,
          present_fields: presentFields,
          completion_rate: completionRate,
          total_critical_fields: config.fields.length,
          message: missingFields.length === 0
            ? `✅ ${entityType} "${data.name}" est complet (${completionRate}%)`
            : `⚠️ ${missingFields.length} champ(s) manquant(s) sur ${data.name}: ${missingFields.join(", ")} (${completionRate}% complet)`,
        };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Erreur DB" };
      }
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

const DEFAULT_SYSTEM_PROMPT = `Tu es l'Agent IA IArche, un assistant commercial et opérationnel expert.

## CONTEXTE TEMPOREL
Date : {date_actuelle} | Heure : {heure_actuelle} | Semaine : {semaine}

## IDENTITÉ
- IArche : Architecte IA basé à Bayonne, solutions d'intelligence artificielle pour entreprises
- Tu as accès COMPLET au CRM Cockpit et au module Admin
- Tu EXÉCUTES des actions concrètes, pas seulement des suggestions

## RÈGLES CRITIQUES D'ACTION

### 1. COLLECTE EN UNE FOIS
Quand l'utilisateur demande une action (créer RDV, lead, email...) :
- Identifie les informations CRITIQUES manquantes (email pour créer lead, date/heure pour RDV)
- Si infos critiques manquent, pose UNE question regroupant tout
- Sinon, EXÉCUTE DIRECTEMENT

## RÈGLES D'EXÉCUTION (Phase 3: Propose-Validate-Execute)

### 1. ACTIONS SENSIBLES REQUIÈRENT VALIDATION
Les actions suivantes créent des **propositions** qui doivent être validées par l'utilisateur:
- send_email: Emails doivent être relus avant envoi
- create_task: Tâches complexes nécessitent validation
- schedule_meeting: RDVs sensibles nécessitent confirmation
- update_lead: Mises à jour CRM critiques

**Workflow**: Tu proposes → Utilisateur valide → Exécution automatique

### 2. ACTIONS DIRECTES (pas de validation)
Ces actions s'exécutent immédiatement sans proposition:
- get_* (lectures): Jamais bloquées
- detect_missing_fields: Pour l'interview mode
- create_meeting_note: Notes de suivi standard
- suggest_*: Analyses et recommandations

### 3. INTERVIEW MODE (Phase 2 active)
Si champs manquent:
- Consulte detect_missing_fields
- Pose UNE seule question à la fois
- Met à jour l'entité après chaque réponse
- NE JAMAIS inventer de données
- Priorité: infos bloquant une action spécifique

### 4. RÈGLE DE PRIORITÉ ABSOLUE
Si l'utilisateur demande une action PRÉCISE (email, tâche, RDV):
- N'exécute PAS l'interview complète sur tous les champs
- Demande UNIQUEMENT les infos critiques pour cette action
- Ex: "Envoie email à Dupont" + email manquant → "Quel est l'email de Dupont ?" (pas interview complète)

## FORMAT DE RÉPONSE

### Mode CHAT (par défaut)
- Maximum 3-5 lignes
- Données factuelles
- Action directe

### Mode DÉTAILLÉ (transcriptions, analyses, CDC, rapports)
Activé par mots-clés : "transcription", "analyse", "compte-rendu", "synthèse", "détaillé"
- Structure avec sections
- Tableaux si pertinent
- Exhaustivité

## RÈGLES DE CHAÎNAGE OBLIGATOIRE

Quand une demande implique PLUSIEURS actions, tu DOIS les exécuter TOUTES en séquence :

### Scénarios de chaînage :

1. **RDV avec nouveau contact**
   get_leads(email) → SI non trouvé → create_lead → create_booking

2. **Mise à jour info lead** (téléphone, entreprise...)
   get_leads(name/email) → update_lead(lead_id, champs)

3. **Compte-rendu de réunion**
   get_leads(name) → get_opportunities(lead_id) → create_meeting_note(opportunity_id, notes)

4. **Post-RDV complet** (notes + actions)
   get_booking_details → create_meeting_note → create_task (si actions identifiées)

5. **Qualification lead → Opportunité**
   get_leads → update_lead(qualification_status) → create_opportunity

6. **Email de suivi**
   get_leads → draft_followup_email → send_email(send_now=true)

7. **Préparation RDV**
   get_booking_details → search_knowledge_base(besoins lead) → log_activity

8. **Analyse besoins client**
   get_leads → suggest_solutions_for_lead → log_activity

9. **Création projet post-signature**
   get_opportunities(stage=closed_won) → create_project → create_task

10. **Report RDV**
    cancel_booking(reason) → create_booking(nouvelle date)

### INTERDIT
- Créer une tâche pour une action que tu peux faire directement
- Stopper après le premier outil quand d'autres sont nécessaires
- Dire "je vais créer une tâche pour..." si update_lead/create_booking existe

## MÉMOIRE DE SESSION ACTIVE

Tu DOIS utiliser les informations collectées précédemment :
- Si l'utilisateur a donné un email → l'utiliser pour les actions suivantes
- Si un lead a été créé → son ID est disponible pour les actions liées
- Si une date/heure a été mentionnée → la conserver pour create_booking

### INTERDICTION ABSOLUE
- Redemander une info déjà fournie dans la conversation
- Ignorer le contexte des messages précédents

## OUTILS PRINCIPAUX (67 disponibles)

### Actions Cockpit
- create_booking : RDV complet (Zoom + Calendrier + Emails)
- create_lead : Nouveau lead CRM
- update_lead : Mise à jour lead (téléphone, entreprise, notes) - ACTION DIRECTE
- create_meeting_note : Compte-rendu de réunion (auto-link vers opportunity via lead_name/lead_email)
- create_task : Nouvelle tâche (uniquement si aucune action directe disponible)
- send_email : Email (envoi direct)
- create_opportunity : Nouvelle opportunité
- create_project : Nouveau projet

### Consultation
- get_bookings, get_agenda_summary : RDV
- get_leads, get_opportunities : Pipeline
- get_tasks : Tâches
- search_knowledge_base : Recherche RAG

## PHASE 1 - ENRICHISSEMENT MÉMOIRE (Circulaire)

Quand l'utilisateur DECLARE une préférence personnelle → appelle save_user_preference
Exemples : "J'aime réunir le matin", "Je préfère par email", "Toujours en visio"
- Importance: 0.8 par défaut
- Ne pas attendre confirmation, le tool s'exécute silencieusement

Quand TU DÉTECTES un insight notable dans les données CRM → appelle save_context_insight
Exemples : 
  - Changement de statut d'un lead (prospect → qualifié)
  - Anomalie (anomalie de budget, date proche)
  - Fait clé nouvellement identifié
- Importance: 0.6 par défaut
- Expiration: 30 jours
- Entity_id et entity_type sont optionnels mais importants pour le contexte

**Les décisions des write-tools sont AUTO-LOGGÉES en background** (save_decision automatique)
Tu n'as rien à faire pour ça. C'est un post-processing qui sauvegarde chaque create/update/send exécuté.

## PHASE 2 - INTERVIEW MODE (Enrichissement progressif)

Les résultats de search_leads et get_leads incluent automatiquement "missing_critical_fields" et "completion_rate" pour chaque lead.

**OBLIGATOIRE - INTERVIEW AUTOMATIQUE** : Quand tu consultes un lead et que "missing_critical_fields" n'est PAS vide :
1. Présente les données connues de l'entité
2. Mentionne le taux de complétion
3. TERMINE TOUJOURS ta réponse par UNE SEULE QUESTION DIRECTE sur le premier champ manquant

Exemples de questions d'interview (à adapter naturellement) :
- phone manquant → "Quel est le numéro de téléphone de PILEA ?"
- company manquant → "Quelle est l'entreprise de ce contact ?"  
- industry manquant → "Dans quel secteur d'activité évolue cette entreprise ?"
- budget manquant → "Y a-t-il un budget estimé pour ce projet ?"

**PRIORITÉ ACTION** : Si l'utilisateur demande une ACTION (appeler, envoyer email) et qu'un champ manque :
- Demande UNIQUEMENT ce champ spécifique : "Je n'ai pas le numéro de PILEA. Quel est son téléphone ?"
- NE PAS lancer un interview complet

Après la réponse de l'utilisateur → mets à jour l'entité (update_lead) puis pose la question suivante sur le prochain champ manquant.
NE JAMAIS inventer de données pour combler les champs manquants.

## INTERDIT ABSOLU
- Demander validation ou confirmation
- Dire "voulez-vous que je..." ou "souhaitez-vous..."
- Reformuler au lieu d'agir
- Inventer des données
- Afficher les UUIDs
- Créer une tâche pour une action directe (ex: update_lead, create_booking)
- Stopper après un seul outil si la tâche en nécessite plusieurs`;

// Slugs pour le système de prompts composés v5.3 (avec gouverneur)
const PROMPT_SLUGS = {
  governor: "orchestrator-governor",
  master: "master-agent",
  uiNavigation: "ui-navigation",
  toolsReference: "tools-reference",
};

// Fallbacks pour chaque bloc
const FALLBACK_GOVERNOR = `## GOUVERNANCE ORCHESTRATEUR
- Priorité Cockpit > Admin
- Canaux : Telegram (concis), Chat (détaillé), API (batch)
- Escalade : Retry → Notification → Fallback manuel`;

const FALLBACK_UI_NAVIGATION = `## NAVIGATION UI
- /admin : Espace administration (articles, contacts, newsletters)
- /cockpit : Espace commercial (leads, pipeline, projets, agenda)`;

const FALLBACK_TOOLS_REFERENCE = `## OUTILS DISPONIBLES
- get_leads, get_opportunities, get_projects : Lecture CRM
- create_booking, create_lead, send_email : Actions directes
- search_knowledge_base : Recherche RAG`;

// deno-lint-ignore no-explicit-any
async function getSystemPrompt(supabase: any): Promise<{ prompt: string; model: string }> {
  try {
    // Récupérer les 4 prompts en une seule requête (gouverneur + 3 blocs)
    const { data, error } = await supabase
      .from("ai_prompts")
      .select("slug, system_prompt, model_config")
      .in("slug", [PROMPT_SLUGS.governor, PROMPT_SLUGS.master, PROMPT_SLUGS.uiNavigation, PROMPT_SLUGS.toolsReference]);
    
    if (error) {
      console.error("Error fetching prompts:", error);
      return { prompt: DEFAULT_SYSTEM_PROMPT, model: "google/gemini-2.5-flash" };
    }
    
    // Helper pour récupérer un prompt par slug
    const getPromptBySlug = (slug: string): string => {
      const found = data?.find((p: { slug: string }) => p.slug === slug);
      return found?.system_prompt?.trim() || "";
    };
    
    // Récupérer chaque bloc avec fallback - ORDRE HIÉRARCHIQUE
    const governorPrompt = getPromptBySlug(PROMPT_SLUGS.governor) || FALLBACK_GOVERNOR;
    const masterPrompt = getPromptBySlug(PROMPT_SLUGS.master) || DEFAULT_SYSTEM_PROMPT;
    const uiNavigation = getPromptBySlug(PROMPT_SLUGS.uiNavigation) || FALLBACK_UI_NAVIGATION;
    const toolsReference = getPromptBySlug(PROMPT_SLUGS.toolsReference) || FALLBACK_TOOLS_REFERENCE;
    
    // Récupérer le modèle depuis master-agent
    const masterData = data?.find((p: { slug: string }) => p.slug === PROMPT_SLUGS.master);
    const modelConfig = masterData?.model_config as { model?: string } | null;
    const model = modelConfig?.model || "google/gemini-2.5-flash";
    
    // Composer le prompt final avec GOUVERNEUR EN PREMIER
    const composedPrompt = [
      `### AGENT IA IARCHE - PROMPT SYSTÈME COMPOSÉ v5.3`,
      `### Hiérarchie: governor → master-agent → ui-navigation → tools-reference`,
      ``,
      `## NIVEAU 0 - GOUVERNEUR`,
      governorPrompt,
      ``,
      `---`,
      ``,
      `## NIVEAU 1 - IDENTITÉ AGENT`,
      masterPrompt,
      ``,
      `---`,
      ``,
      `## NIVEAU 2 - NAVIGATION`,
      uiNavigation,
      ``,
      `---`,
      ``,
      `## NIVEAU 3 - OUTILS`,
      toolsReference,
    ].join("\n");
    
    console.log(`Composed system prompt from ${data?.length || 0} blocks (v5.3 with governor), model: ${model}`);
    return { prompt: composedPrompt, model };
    
  } catch (err) {
    console.error("Failed to fetch system prompt:", err);
    return { prompt: DEFAULT_SYSTEM_PROMPT, model: "google/gemini-2.5-flash" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth modes:
    // - Internal calls (e.g. Telegram webhook) using x-internal-token
    // - User JWT calls from the web app using Authorization: Bearer <jwt>

    const internalToken = req.headers.get("x-internal-token");
    const authHeader = req.headers.get("Authorization") ?? "";

    let authedUserId: string | null = null;
    let authMode: "internal" | "jwt" = "internal";

    if (internalToken && internalToken === SUPABASE_SERVICE_ROLE_KEY) {
      authMode = "internal";
    } else {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate JWT (we run our own validation because this function can be called by non-JWT clients)
      const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: u, error: uerr } = await supabaseAuth.auth.getUser();
      if (uerr || !u?.user) {
        console.error("[ai-agent-orchestrator] invalid_auth:", uerr?.message);
        return new Response(JSON.stringify({ error: "invalid_auth" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      authMode = "jwt";
      authedUserId = u.user.id;
    }

    console.log("[ai-agent-orchestrator] authMode=", authMode, "user=", authedUserId ?? "(none)");

    // Service client for DB operations (bypasses RLS by design)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { messages, stream = false, workspace_id, user_id, session_id, telegram_fast_mode = false } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =============================================================================
    // INPUT VALIDATION - Security hardening for prompt injection protection
    // =============================================================================
    const MAX_MESSAGE_LENGTH = 8000; // Max chars per message
    const MAX_MESSAGES_COUNT = 50;   // Max messages in conversation
    const MAX_TOTAL_LENGTH = 50000;  // Max total chars across all messages

    // Validate message count
    if (messages.length > MAX_MESSAGES_COUNT) {
      console.warn("[SECURITY] Too many messages:", messages.length);
      return new Response(JSON.stringify({ error: "Too many messages. Maximum 50 allowed." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate each message and total length
    let totalLength = 0;
    for (const msg of messages) {
      if (!msg || typeof msg !== 'object') continue;
      const content = msg.content;
      if (typeof content === 'string') {
        if (content.length > MAX_MESSAGE_LENGTH) {
          console.warn("[SECURITY] Message too long:", content.length);
          return new Response(JSON.stringify({ error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        totalLength += content.length;
      }
    }

    if (totalLength > MAX_TOTAL_LENGTH) {
      console.warn("[SECURITY] Total content too long:", totalLength);
      return new Response(JSON.stringify({ error: "Total conversation too long. Please start a new conversation." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Agent orchestrator called with", messages.length, "messages, total chars:", totalLength);

    // Fetch system prompt from ai_prompts table
    const { prompt: systemPrompt, model: configuredModel } = await getSystemPrompt(supabase);
    
    // TELEGRAM FAST MODE: Use faster model and limit iterations for Telegram requests
    const selectedModel = telegram_fast_mode ? "google/gemini-2.5-flash-lite" : configuredModel;
    const maxIterations = telegram_fast_mode ? 3 : 5; // Fewer iterations for Telegram
    
    if (telegram_fast_mode) {
      console.log("[TELEGRAM_FAST_MODE] Using faster model and reduced iterations");
    }

    // Get the user's last message
    const lastUserMessage = messages.filter((m: { role: string }) => m.role === "user").pop();
    const userQuery = lastUserMessage?.content || "";

    // ============================================================
    // PHASE IA-1 : Intent router (modular prompt)
    // Fallback transparent vers le composer monolithique v5.3 si échec.
    // ============================================================
    let effectiveSystemPrompt = systemPrompt;
    let routedIntent: Intent | null = null;
    let routedModules: string[] = [];
    try {
      const routed = await composeSystemPromptForRequest(supabase, userQuery);
      if (routed.used_router && routed.prompt) {
        effectiveSystemPrompt = routed.prompt;
        routedIntent = routed.intent;
        routedModules = routed.modulesLoaded;
        console.log(
          `[orchestrator] modular prompt intent=${routed.intent} chars=${routed.prompt.length} modules=${routedModules.join(",")}`,
        );
      } else {
        console.log("[orchestrator] router fallback to legacy monolithic prompt");
      }
    } catch (err) {
      console.warn("[orchestrator] intent router error, fallback to legacy:", (err as Error).message);
    }



    // =============================================================================
    // RATE LIMITING - Prevent abuse
    // =============================================================================
    const effectiveUserId = authedUserId || (typeof user_id === "string" && /^[0-9a-fA-F-]{36}$/.test(user_id) ? user_id : null);
    
    if (effectiveUserId) {
      try {
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        const { data: recentCalls } = await supabase
          .from('ai_usage_metrics')
          .select('created_at')
          .eq('user_id', effectiveUserId)
          .gte('created_at', oneMinuteAgo);
        
        const callCount = recentCalls?.length || 0;
        if (callCount > 30) { // 30 requests per minute limit
          console.warn("[SECURITY] Rate limit exceeded for user:", effectiveUserId, "calls:", callCount);
          return new Response(JSON.stringify({ 
            error: "Limite de requêtes dépassée. Veuillez patienter une minute." 
          }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (err) {
        console.error("Rate limit check failed (non-blocking):", err);
      }
    }

    // =============================================================================
    // PROMPT INJECTION DETECTION - Log suspicious patterns (monitoring only)
    // =============================================================================
    if (userQuery) {
      const suspiciousPatterns = [
        /ignore\s+(all\s+)?previous\s+instructions?/i,
        /system\s+prompt/i,
        /reveal\s+(your|the)\s+(prompt|instructions|system)/i,
        /you\s+are\s+now\s+(in\s+)?\w+\s+mode/i,
        /override\s+(your|the|all)\s+(rules|instructions|prompt)/i,
        /forget\s+(all|everything|your)\s+(previous|instructions)/i,
        /jailbreak/i,
        /DAN\s+mode/i,
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(userQuery)) {
          console.warn('[SECURITY] Potential prompt injection detected:', {
            pattern: pattern.source,
            user_id: effectiveUserId,
            workspace_id,
            preview: userQuery.substring(0, 100)
          });
          // Log to audit table for monitoring (non-blocking)
          supabase.from('admin_audit_logs').insert({
            action_type: 'security_alert',
            resource_type: 'ai_orchestrator',
            resource_name: 'prompt_injection_attempt',
            user_id: effectiveUserId,
            new_data: { 
              pattern: pattern.source, 
              preview: userQuery.substring(0, 200),
              workspace_id 
            }
          });
          break;
        }
      }
    }

    // =============================================================================
    // MEMORY INTEGRATION
    // =============================================================================
    
    // 1. Fetch recent memory for context
    // NOTE: ai_agent_memory.user_id is UUID; ignore non-UUID user_id values.
    const safeUserId = typeof user_id === "string" && /^[0-9a-fA-F-]{36}$/.test(user_id)
      ? user_id
      : authedUserId;

    // Phase IA-1 v6.2 : LAZY MEMORY LOADING
    // Skip all 3 memory DB queries for short "general" intents (greetings,
    // navigation, simple questions). Saves 3 DB calls + token bloat downstream.
    const isShortGeneral =
      routedIntent === "general" && (userQuery || "").trim().length < 40;

    if (isShortGeneral) {
      console.log(`[orchestrator] lazy-memory: skipping 3 memory queries (short general intent, query="${(userQuery || '').slice(0, 30)}")`);
    }

    const recentMemory: string[] = isShortGeneral
      ? []
      : await getRecentMemory(supabase, workspace_id, safeUserId ?? undefined, session_id, 10);

    // 2. Search relevant memory semantically
    const relevantMemory: string[] = isShortGeneral || !userQuery
      ? []
      : await searchMemory(supabase, userQuery, workspace_id, safeUserId ?? undefined, 5);

    // 3. Fetch active entities from recent context (leads/partners mentioned recently)
    let activeEntities: { type: string; id: string; name: string; details: string }[] = [];
    if (!isShortGeneral) {
      try {
        // Build query with proper parameterized filters
        let contextQuery = supabase
          .from("ai_agent_memory")
          .select("entity_type, entity_id, content")
          .eq("memory_type", "context")
          .eq("category", "active_entity");

        // Use validated inputs for the filter - proper parameterized approach
        if (session_id) {
          contextQuery = contextQuery.eq("session_id", session_id);
        } else if (safeUserId) {
          contextQuery = contextQuery.eq("user_id", safeUserId);
        }

        const { data: contextMemory } = await contextQuery
          .gte("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(3); // Reduced from 5 to avoid context pollution

        if (contextMemory && contextMemory.length > 0) {
          activeEntities = contextMemory.map((m: { entity_type: string | null; entity_id: string | null; content: string }) => ({
            type: m.entity_type || "unknown",
            id: m.entity_id || "",
            name: m.content.split(":")[0] || "",
            details: m.content,
          }));
        }
      } catch (err) {
        console.error("Active entities fetch error (non-blocking):", err);
      }
    }
    
    // 3b. ADVANCED TOPIC CHANGE DETECTION
    // Prevents context bleeding when user changes subject
    const queryForTopicDetection = userQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Extract mentioned entity names from active entities
    const activeEntityNames = activeEntities.map(e => {
      // Extract name from content like "Lead mentionné : Cédric Picard (email) - Beerecos"
      const parts = e.details.toLowerCase().split(/[\s\-:()]+/).filter(p => p.length > 2);
      return parts;
    }).flat();
    
    // Check if current query mentions ANY of the active entity names
    const queryMentionsActiveEntity = activeEntityNames.some(name => 
      name.length > 3 && queryForTopicDetection.includes(name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    );
    
    // Keywords that suggest user is asking about something NEW
    const newTopicKeywords = [
      "info", "infos", "information", "parle", "c'est quoi", "qu'est-ce", 
      "presente", "decris", "detail", "explique", "dis-moi", "donne-moi",
      "quelles sont", "quelle est", "quel est", "qui est", "prochain", "prochaine"
    ];
    const asksForNewInfo = newTopicKeywords.some(kw => queryForTopicDetection.includes(kw));
    
    // Detect RDV-related context vs info-request context
    const isRdvRelatedQuery = /\b(rdv|rendez|booking|prend|planifi|reserver|calendar|agenda)\b/i.test(queryForTopicDetection);
    const hasActiveRdvContext = activeEntities.some(e => 
      e.details.toLowerCase().includes("rdv") || 
      e.details.toLowerCase().includes("booking") ||
      e.type === "booking"
    );
    
    // TOPIC CHANGE = user asks for info but doesn't mention active entities
    // OR user asks about different topic (not RDV when context is RDV)
    const isTopicChange = 
      (asksForNewInfo && activeEntities.length > 0 && !queryMentionsActiveEntity) ||
      (!isRdvRelatedQuery && hasActiveRdvContext && activeEntities.length > 0);
    
    if (isTopicChange) {
      console.log(`Topic change detected - query "${userQuery.slice(0, 50)}..." doesn't relate to active entities:`, 
        activeEntities.map(e => e.details.slice(0, 50)));
      
      // Expire active entities in database to prevent future bleeding
      try {
        let updateQuery = supabase
          .from("ai_agent_memory")
          .update({ expires_at: new Date().toISOString() })
          .eq("memory_type", "context")
          .eq("category", "active_entity");
        
        // Use proper parameterized filter
        if (session_id) {
          updateQuery = updateQuery.eq("session_id", session_id);
        } else if (safeUserId) {
          updateQuery = updateQuery.eq("user_id", safeUserId);
        }
        
        await updateQuery;
      } catch (err) {
        console.error("Failed to expire active entities:", err);
      }
      
      activeEntities = []; // Clear for this request
    }
    
    // 4. Build memory context string - ONLY include if truly relevant
    let memoryContext = "";
    
    // Active entities shown ONLY if query explicitly mentions them
    if (activeEntities.length > 0 && queryMentionsActiveEntity) {
      memoryContext += "\n\n📋 CONTEXTE ACTIF (entité mentionnée dans la requête) :";
      for (const entity of activeEntities) {
        memoryContext += `\n- ${entity.details}`;
      }
    }
    
    // Phase IA-1 v6.2 : Anti-pollution rule ONLY when memory might bleed.
    // Skip the ~600 chars block when no active entity & no relevant memory.
    const hasMemoryRisk =
      activeEntities.length > 0 || relevantMemory.length > 0 || recentMemory.length > 0;

    if (hasMemoryRisk) {
      memoryContext += `\n
⚠️ RÈGLE ABSOLUE - PRIORITÉ MAXIMALE ⚠️
1. Lire et analyser UNIQUEMENT le dernier message de l'utilisateur
2. Répondre UNIQUEMENT à ce qui est demandé dans ce message
3. NE JAMAIS parler d'un RDV, lead ou sujet qui n'est PAS mentionné dans le message actuel
4. Si le message demande des "infos sur X", parler SEULEMENT de X, pas d'autre chose
5. IGNORER tout contexte précédent qui ne concerne pas la requête actuelle`;
    }

    if (recentMemory.length > 0 || relevantMemory.length > 0) {
      // Only include memory if it seems related to current query
      const queryWords = queryForTopicDetection.split(/\s+/).filter((w: string) => w.length > 3);
      const relevantMemoryForQuery = relevantMemory.filter((m: string) =>
        queryWords.some((word: string) => m.toLowerCase().includes(word))
      );

      if (relevantMemoryForQuery.length > 0) {
        memoryContext += "\n\nMÉMOIRE PERTINENTE (uniquement si en lien avec la requête) :";
        memoryContext += "\n" + relevantMemoryForQuery.slice(0, 2).join("\n");
      }
    }

    // 4. Inject current date/time context - CRITICAL for agent temporal awareness
    // Phase IA-1 v6.2 : LAZY DATE CONTEXT
    // Full 14-day calendar (~1500 chars) only for date/scheduling queries.
    // Other queries get a minimal date stub (~120 chars).
    const now = new Date();
    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

    const queryLowerForDate = (userQuery || "").toLowerCase();
    const needsFullCalendar =
      /\b(rdv|rendez|booking|planifi|reserver|calendar|agenda|demain|hier|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|semaine|prochain|prochaine|\d{1,2}h|\d{1,2}[\/\-]\d{1,2})\b/i.test(queryLowerForDate) ||
      routedIntent === "doc_generation"; // devis often need date precision

    let dateContext: string;
    if (needsFullCalendar) {
      // Build explicit week calendar with dates
      const calendarRef: string[] = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        const dayName = dayNames[d.getDay()];
        const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const isoDate = d.toISOString().split('T')[0];
        const label = i === 0 ? " (AUJOURD'HUI)" : i === 1 ? " (demain)" : "";
        calendarRef.push(`  ${dayName} ${dateStr} = ${isoDate}${label}`);
      }

      dateContext = `\n\nCONTEXTE TEMPOREL (RÉFÉRENCE OBLIGATOIRE) :
- Date du jour : ${now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (${now.toISOString().split('T')[0]})
- Jour de la semaine actuel : ${dayNames[now.getDay()].toUpperCase()}
- Heure actuelle : ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
- Fuseau horaire : Europe/Paris
- Semaine : ${getWeekNumber(now)}

📅 CALENDRIER DE RÉFÉRENCE (utiliser ces dates EXACTES pour les RDV) :
${calendarRef.join('\n')}

⚠️ RÈGLE CRITIQUE CALCUL DE DATES :
- Quand l'utilisateur dit "vendredi", trouve la ligne contenant "vendredi" ci-dessus et utilise la date ISO (YYYY-MM-DD)
- NE JAMAIS calculer les dates mentalement - TOUJOURS consulter le calendrier ci-dessus
- Si aujourd'hui est lundi 06/01/2026, alors vendredi = 10/01/2026 SEULEMENT si le calendrier le confirme`;
    } else {
      dateContext = `\n\nCONTEXTE TEMPOREL : ${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} (Europe/Paris, ISO ${now.toISOString().split('T')[0]}).`;
      console.log(`[orchestrator] lazy-date: minimal stub (intent=${routedIntent})`);
    }

    // 5. Save the user query to memory with entity detection
    if (userQuery) {
      // Detect if message contains key info (email, name, date, company, etc.)
      const hasEmail = /@/.test(userQuery);
      const hasDate = /\d{1,2}[\/\-]\d{1,2}|\d{1,2}h|\d{2}:\d{2}|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche/i.test(userQuery);
      const hasName = /avec\s+[A-Z][a-zé]+|M\.\s*[A-Z]|Mme\s*[A-Z]|[A-Z][a-z]+\s+[A-Z][a-z]+/i.test(userQuery);
      const hasCompany = /\b(entreprise|société|client|partenaire)\s+[A-Z]/i.test(userQuery);
      
      // Extract potential entity names for better context retention
      const emailMatch = userQuery.match(/[\w.+-]+@[\w.-]+\.\w+/);
      const nameMatch = userQuery.match(/(?:avec|pour|de|chez)\s+([A-ZÉÀ][a-zéèà]+(?:\s+[A-ZÉÀ][a-zéèà]+)?)/i);
      const companyMatch = userQuery.match(/(?:entreprise|société|client|partenaire|chez)\s+([A-ZÉÀ][A-Za-zéèàùç\s&-]+)/i);
      
      const importanceScore = hasEmail || hasDate || hasName || hasCompany ? 0.85 : 0.4;
      const category = hasEmail ? "contact_info" : hasDate ? "scheduling" : hasName || hasCompany ? "entity_mention" : "user_query";
      
      // Build metadata with extracted entities for better context recall
      const entityMetadata: Record<string, unknown> = {};
      if (emailMatch) entityMetadata.mentioned_email = emailMatch[0];
      if (nameMatch) entityMetadata.mentioned_name = nameMatch[1];
      if (companyMatch) entityMetadata.mentioned_company = companyMatch[1].trim();
      
      await saveMemory(supabase, {
        memory_type: "conversation",
        category: category,
        content: userQuery.slice(0, 500),
        metadata: Object.keys(entityMetadata).length > 0 ? entityMetadata : undefined,
        importance_score: importanceScore,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days (extended from 7)
      }, workspace_id, safeUserId ?? undefined, session_id);
      
      // If entities were mentioned, try to resolve them from DB and save as context
      if (emailMatch || companyMatch) {
        try {
          // Try to find lead by email or company
          let entityQuery = supabase.from("leads").select("id, name, email, company").limit(1);
          if (emailMatch) {
            entityQuery = entityQuery.eq("email", emailMatch[0]);
          } else if (companyMatch) {
            entityQuery = entityQuery.ilike("company", `%${companyMatch[1].trim()}%`);
          }
          
          const { data: leadMatch } = await entityQuery;
          if (leadMatch && leadMatch.length > 0) {
            const lead = leadMatch[0];
            await saveMemory(supabase, {
              memory_type: "context",
              category: "active_entity",
              entity_type: "lead",
              entity_id: lead.id,
              content: `Lead mentionné : ${lead.name} (${lead.email}) - ${lead.company || 'N/A'}`,
              importance_score: 0.7, // Reduced from 0.9
              expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // 20 min (reduced from 2h to prevent bleeding)
            }, workspace_id, safeUserId ?? undefined, session_id);
          }
          
          // Also check partners
          if (companyMatch) {
            const { data: partnerMatch } = await supabase
              .from("partners")
              .select("id, name, email, partner_type")
              .ilike("name", `%${companyMatch[1].trim()}%`)
              .limit(1);
            
            if (partnerMatch && partnerMatch.length > 0) {
              const partner = partnerMatch[0];
              await saveMemory(supabase, {
                memory_type: "context",
                category: "active_entity",
                entity_type: "partner",
                entity_id: partner.id,
                content: `Partenaire mentionné : ${partner.name} (${partner.email || 'N/A'}) - Type: ${partner.partner_type}`,
                importance_score: 0.7, // Reduced from 0.9
                expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // 20 min (reduced from 2h)
              }, workspace_id, safeUserId ?? undefined, session_id);
            }
          }
        } catch (entityErr) {
          console.error("Entity resolution error (non-blocking):", entityErr);
        }
      }
    }

    // =============================================================================
    // RESPONSE MODE DETECTION
    // =============================================================================
    // Detect if the user query suggests detailed mode (transcription, analysis, etc.)
    const DETAILED_MODE_KEYWORDS = [
      "transcription", "analyse", "compte-rendu", "réunion", "résumé", 
      "synthèse", "debrief", "meeting", "notes", "cr ", "c.r.", "pv ",
      "draft", "brouillon", "génère", "génerer", "créer un", "rédige",
      "plan d'action", "actions", "tâches à créer", "email de suivi"
    ];
    
    const queryLower = userQuery.toLowerCase();
    const needsDetailedMode = DETAILED_MODE_KEYWORDS.some(kw => queryLower.includes(kw));
    const responseMode = needsDetailedMode ? "DÉTAILLÉ" : "CHAT";
    
    console.log(`Response mode detected: ${responseMode} (query: "${userQuery.slice(0, 50)}...")`);
    
    // Inject mode into system prompt
    const promptWithMode = effectiveSystemPrompt.replace("{response_mode}", responseMode);

    // Build messages with system prompt + memory context + date context
    const fullMessages = [
      { role: "system", content: promptWithMode + memoryContext + dateContext },
      ...messages,
    ];

    // Initial AI call with tools - using centralized client
    const aiClient = createAIClient({
      workspaceId: workspace_id,
      userId: user_id,
      enableLogging: true,
      enableMetrics: true,
    });

    // ============================================================
    // PHASE IA-2 — Semantic cache lookup (general intent only)
    // Cache uniquement les requêtes "general" sans entité active :
    // greetings, FAQ IArche, questions de connaissance générique.
    // Skip si entités actives ou mémoire pertinente (réponse contextuelle).
    // ============================================================
    const cacheEligible =
      routedIntent === "general" &&
      activeEntities.length === 0 &&
      relevantMemory.length === 0 &&
      (userQuery || "").trim().length > 0;

    const orchestratorCacheKey = buildCacheKey({
      workspaceId: workspace_id,
      mode: "orchestrator_general",
      entityType: "general",
      entityId: "orchestrator",
    });
    const orchestratorFingerprint = cacheEligible
      ? await buildContextFingerprint({
          entityType: "general",
          entityId: "orchestrator",
          workspaceId: workspace_id,
          userId: safeUserId ?? "anonymous",
          entityUpdatedAt: null,
          ragChunksCount: 0,
          promptVersion: `modular:${routedModules.join("|")}`,
          extra: { mode: responseMode },
          cacheScope: "workspace",
        })
      : "";

    if (cacheEligible) {
      const cached = await lookupCache({
        supabase,
        workspaceId: workspace_id,
        cacheKey: orchestratorCacheKey,
        queryText: userQuery,
        fingerprint: orchestratorFingerprint,
        threshold: ORCHESTRATOR_CACHE_THRESHOLD,
      });
      if (cached.hit && typeof cached.response === "string") {
        console.log(`[orchestrator] CACHE HIT sim=${cached.similarity.toFixed(3)} age=${cached.ageSeconds}s hits=${cached.hitCount}`);
        return new Response(JSON.stringify({
          ok: true,
          message: cached.response,
          tool_calls: [],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
            max_tokens: getModelContextWindow(selectedModel),
            model_id: cached.model ?? selectedModel,
            tokens_available: getModelContextWindow(selectedModel),
            cache_mode: "hit",
            cache_similarity: cached.similarity,
            cache_age_seconds: cached.ageSeconds,
          },
          memory_used: false,
          active_entities_count: 0,
          performance: { tool_count: 0, total_tool_duration_ms: 0, iterations: 0 },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
        });
      }
    }

    let aiResponse = await aiClient.complete({
      messages: fullMessages as AIMessage[],
      tools: AGENT_TOOLS as AITool[],
      tool_choice: 'auto',
      model: selectedModel,
      category: 'reasoning',
      fallback: true,
    });

    let assistantMessage: { content?: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } | undefined = {
      content: aiResponse.content,
      tool_calls: aiResponse.tool_calls,
    };
    const allToolCalls: { name: string; result?: unknown; error?: string; duration_ms?: number }[] = [];

    // Tool calling loop (max iterations depends on mode)
    let iterations = 0;
    // deno-lint-ignore no-explicit-any
    let conversationMessages: any[] = [...fullMessages];
    
    while (assistantMessage?.tool_calls && iterations < maxIterations) {
      iterations++;
      console.log(`Tool calling iteration ${iterations}:`, assistantMessage.tool_calls.length, "calls");

      const toolResults = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
        const toolStartTime = Date.now();

        // Retry mechanism: up to 2 attempts with exponential backoff
        const maxRetries = 2;
        let lastError: Error | null = null;
        let toolSucceeded = false;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const toolResult = await executeTool(supabase, toolName, toolArgs, messages, workspace_id, user_id, session_id);
            const toolDuration = Date.now() - toolStartTime;
            
            allToolCalls.push({ name: toolName, result: toolResult, duration_ms: toolDuration });
            toolResults.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult),
            });
            
            // Enhanced logging with execution time
            if (attempt > 1) {
              console.log(`Tool ${toolName} succeeded on attempt ${attempt} in ${toolDuration}ms`);
            } else {
              console.log(`Tool ${toolName} completed in ${toolDuration}ms`);
            }
            
            // Save tool call to memory - skip for write tools (logDecision handles those with higher importance)
            const writeToolNames = [
              "create_lead", "update_lead", "create_booking", "update_booking",
              "create_task", "update_task", "create_project", "update_project",
              "send_email", "create_meeting_note", "update_meeting_note",
              "create_opportunity", "update_opportunity", "update_lead_score"
            ];
            const isWriteTool = writeToolNames.includes(toolName);
            
            if (!isWriteTool) {
              await saveMemory(supabase, {
                memory_type: "tool_call",
                category: toolName,
                content: `Tool ${toolName} appelé avec ${JSON.stringify(toolArgs).slice(0, 200)}`,
                metadata: { 
                  tool: toolName, 
                  args: toolArgs, 
                  success: true,
                  duration_ms: toolDuration,
                  attempts: attempt,
                  timestamp: new Date().toISOString(),
                },
                importance_score: 0.6,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              }, workspace_id, user_id, session_id);
            }
            
            // Phase 1: Auto-log write decisions (post-processing, replaces saveMemory for write tools)
            await logDecision(supabase, toolName, toolArgs, toolResult, workspace_id, user_id, session_id);
            
            toolSucceeded = true;
            break; // Success - exit retry loop
            
          } catch (toolError) {
            lastError = toolError as Error;
            console.warn(`Tool ${toolName} attempt ${attempt}/${maxRetries} failed:`, (toolError as Error).message);
            
            if (attempt < maxRetries) {
              // Exponential backoff: 1s, 2s
              const backoffMs = 1000 * attempt;
              console.log(`Retrying ${toolName} in ${backoffMs}ms...`);
              await new Promise(r => setTimeout(r, backoffMs));
            }
          }
        }

        // All retries exhausted
        if (!toolSucceeded && lastError) {
          const toolDuration = Date.now() - toolStartTime;
          console.error(`Tool ${toolName} failed after ${maxRetries} attempts (${toolDuration}ms):`, lastError.message);
          
          allToolCalls.push({ name: toolName, error: lastError.message, duration_ms: toolDuration });
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ 
              error: lastError.message,
              details: `L'outil ${toolName} a échoué après ${maxRetries} tentatives. Raison: ${lastError.message}. Veuillez proposer une alternative à l'utilisateur.`
            }),
          });
        }
      }

      // Continue conversation with tool results
      conversationMessages = [
        ...conversationMessages,
        { role: "assistant", content: assistantMessage.content || "", tool_calls: assistantMessage.tool_calls },
        ...toolResults,
      ];

      try {
        aiResponse = await aiClient.complete({
          messages: conversationMessages as AIMessage[],
          tools: AGENT_TOOLS as AITool[],
          tool_choice: 'auto',
          model: selectedModel,
          category: 'reasoning',
          fallback: true,
        });
        
        assistantMessage = {
          content: aiResponse.content,
          tool_calls: aiResponse.tool_calls,
        };
      } catch (err) {
        console.error("AI continuation error:", err);
        break;
      }
    }

    const finalContent = assistantMessage?.content || "Je n'ai pas pu traiter votre demande.";

    // Phase IA-2 — Store cache si éligible ET aucun tool_call déclenché
    // (sinon on risquerait de servir des données CRM périmées sur hit suivant)
    if (cacheEligible && allToolCalls.length === 0 && finalContent.length > 30) {
      storeCache({
        supabase,
        workspaceId: workspace_id,
        cacheKey: orchestratorCacheKey,
        queryText: userQuery,
        fingerprint: orchestratorFingerprint,
        response: finalContent,
        model: selectedModel,
        promptVersion: `modular:${routedModules.join("|")}`,
        ttlHours: ORCHESTRATOR_CACHE_TTL_HOURS,
      }).catch((e) => console.warn("[orchestrator] cache store failed:", (e as Error).message));
      console.log(`[orchestrator] CACHE STORE intent=general len=${finalContent.length} model=${selectedModel}`);
    }

    // Save assistant response to memory (important insights only)
    if (finalContent && finalContent.length > 50) {
      const isInsight = allToolCalls.length > 0 || finalContent.includes("recommand") || finalContent.includes("suggèr") || finalContent.includes("action");
      await saveMemory(supabase, {
        memory_type: isInsight ? "insight" : "conversation",
        category: allToolCalls.length > 0 ? allToolCalls.map(t => t.name).join(",") : "response",
        content: finalContent.slice(0, 1000),
        metadata: { tools_used: allToolCalls.map(t => t.name) },
        importance_score: isInsight ? 0.8 : 0.4,
        expires_at: isInsight 
          ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days for insights
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days for conversation
      }, workspace_id, user_id, session_id);
    }

    const totalToolDuration = allToolCalls.reduce((sum, t) => sum + (t.duration_ms || 0), 0);
    console.log(`Agent response generated, tools called: ${allToolCalls.map(t => t.name).join(", ")}, total tool time: ${totalToolDuration}ms`);

    return new Response(JSON.stringify({
      ok: true,
      message: finalContent,
      tool_calls: allToolCalls,
      usage: {
        ...aiResponse.usage,
        max_tokens: getModelContextWindow(selectedModel),
        model_id: selectedModel,
        tokens_available: getModelContextWindow(selectedModel) - (aiResponse.usage?.total_tokens || 0),
      },
      memory_used: recentMemory.length + relevantMemory.length > 0,
      active_entities_count: activeEntities.length,
      performance: {
        tool_count: allToolCalls.length,
        total_tool_duration_ms: totalToolDuration,
        iterations: iterations,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Agent orchestrator error:", error);
    return new Response(JSON.stringify({
      error: "internal_error",
      message: (error as Error).message,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
