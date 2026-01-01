import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

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
// TOOL DEFINITIONS - Organized by Module and Autonomy Level
// =============================================================================

const AGENT_TOOLS = [
  // ============ COCKPIT - Lecture (N0) ============
  {
    type: "function",
    function: {
      name: "get_leads",
      description: "Récupère la liste des leads avec filtrage optionnel. Données : nom, email, entreprise, source, score, statut.",
      parameters: {
        type: "object",
        properties: {
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
      name: "get_opportunities",
      description: "Récupère les opportunités du pipeline commercial. Données : titre, valeur, probabilité, stage, lead associé.",
      parameters: {
        type: "object",
        properties: {
          stage: { type: "string", description: "Filtrer par stage (lead, qualified, proposal, negotiation, won, lost)" },
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
      description: "Recherche sémantique dans la base de connaissances IArche (articles, solutions, cas clients) via RAG.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "La requête de recherche" },
          filter_types: { 
            type: "array", 
            items: { type: "string" },
            description: "Filtrer par types de ressources" 
          },
        },
        required: ["query"],
      },
    },
  },
  // ============ COCKPIT - Écriture (N1) ============
  {
    type: "function",
    function: {
      name: "create_task",
      description: "[N1 - Brouillon] Crée une tâche de suivi. L'utilisateur doit valider avant exécution. Si une heure est mentionnée (ex: 'à 14h', 'pour 10h30'), elle sera automatiquement extraite et ajoutée.",
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
      description: "[N1 - Brouillon] Crée un compte-rendu de réunion. L'utilisateur doit valider.",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "ID du RDV associé" },
          project_id: { type: "string", description: "ID du projet associé" },
          opportunity_id: { type: "string", description: "ID de l'opportunité associée" },
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
      description: "[N1 - Suggestion] Suggère un changement de qualification pour un lead.",
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
      description: "[N1 - Suggestion] Suggère un changement de stage pour une opportunité.",
      parameters: {
        type: "object",
        properties: {
          opportunity_id: { type: "string", description: "ID de l'opportunité" },
          new_stage: { type: "string", description: "Nouveau stage (lead, qualified, proposal, negotiation, won, lost)" },
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
      description: "[N1 - Brouillon] Génère un brouillon d'email de suivi pour un lead ou projet.",
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
      description: "[N1 - Suggestion] Analyse les besoins du lead et suggère les solutions IArche pertinentes.",
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
      description: "[N1 - Suggestion] Suggère une action sur un rendez-vous (reporter, ajouter notes, envoyer rappel).",
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
      description: "[N1 - Action] Enregistre une activité dans le journal (appel, email, note, etc.).",
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
  // ============ ADMIN - Écriture (N1) ============
  {
    type: "function",
    function: {
      name: "draft_article_content",
      description: "[N1 - Brouillon] Génère un brouillon de contenu pour un article/actualité.",
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
      description: "[N1 - Suggestion] Analyse un article et suggère des améliorations (SEO, structure, contenu).",
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
      description: "[N1 - Brouillon] Génère un brouillon de newsletter basé sur les actualités récentes.",
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
  args: Record<string, unknown>
): Promise<unknown> {
  console.log(`Executing tool: ${toolName}`, args);

  switch (toolName) {
    // ============ COCKPIT READS ============
    case "get_leads": {
      let query = supabase
        .from("leads")
        .select("id, name, email, company, phone, source, source_context, lead_score, qualification_status, created_at, last_contacted_at")
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 10);

      if (args.status) query = query.eq("qualification_status", args.status);
      if (args.source) query = query.eq("source", args.source);

      const { data, error } = await query;
      if (error) throw error;
      return { leads: data, count: data?.length || 0 };
    }

    case "get_opportunities": {
      let query = supabase
        .from("opportunities")
        .select(`
          id, title, description, stage, value_amount, probability, 
          expected_close_date, created_at,
          lead:leads(id, name, company, email)
        `)
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 10);

      if (args.stage) query = query.eq("stage", args.stage);
      if (args.min_value) query = query.gte("value_amount", args.min_value);

      const { data, error } = await query;
      if (error) throw error;
      return { opportunities: data, count: data?.length || 0 };
    }

    case "get_projects": {
      let query = supabase
        .from("projects")
        .select(`
          id, name, description, status, health_status, 
          budget_amount, consumed_amount, start_date, target_end_date,
          lead:leads(id, name, company),
          opportunity:opportunities(id, title, value_amount)
        `)
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 10);

      if (args.status) query = query.eq("status", args.status);
      if (args.health_status) query = query.eq("health_status", args.health_status);

      const { data, error } = await query;
      if (error) throw error;
      return { projects: data, count: data?.length || 0 };
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
          id, raw_transcript, transcript_summary, detected_needs, 
          action_items, key_decisions, next_steps, status, created_at,
          lead:leads(id, name, company),
          project:projects(id, name)
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
      return { documents: data, count: data?.length || 0 };
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

      const stages = ["lead", "qualified", "proposal", "negotiation", "won", "lost"];
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
      const wonValue = stats.won?.total_value || 0;
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
        .select("id, title, slug, excerpt, cover_image_url, published")
        .eq("resource_type", "solution")
        .order("title");

      if (args.published_only !== false) query = query.eq("published", true);

      const { data, error } = await query;
      if (error) throw error;
      return { solutions: data, count: data?.length || 0 };
    }

    case "get_article_details": {
      const { data: article, error } = await supabase
        .from("articles")
        .select(`
          id, title, slug, content, excerpt, resource_type, published, published_at,
          cover_image_url, author, meta_title, meta_description, faq, created_at, updated_at
        `)
        .or(`id.eq.${args.article_id || ""},slug.eq.${args.slug || ""}`)
        .single();

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
      // Call the existing search-embeddings function
      const searchResponse = await fetch(`${SUPABASE_URL}/functions/v1/search-embeddings`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: args.query,
          filter_types: args.filter_types,
          match_count: 5,
          match_threshold: 0.7,
        }),
      });

      if (!searchResponse.ok) {
        throw new Error("Knowledge base search failed");
      }

      const searchResult = await searchResponse.json();
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
      // Auto-extract time from title if not provided
      let dueTime = args.due_time as string | null;
      const title = args.title as string;
      
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
      
      const taskData = {
        title: title,
        description: args.description as string || null,
        task_type: args.task_type as string || "follow_up",
        priority: args.priority as string || "medium",
        due_date: args.due_date as string || null,
        due_time: dueTime,
        lead_id: args.lead_id as string || null,
        project_id: args.project_id as string || null,
        opportunity_id: args.opportunity_id as string || null,
        status: "pending",
        ai_generated: true,
        ai_metadata: {
          autonomy_level: "N1",
          generated_at: new Date().toISOString(),
          validation_required: true,
          validated_by_human: false,
          source_transcription_id: args.transcription_id || null,
        },
        workspace_id: "00000000-0000-0000-0000-000000000001",
      };

      const { data, error } = await supabase
        .from("tasks")
        .insert(taskData)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        task: data,
        message: `Tâche "${title}" créée${dueTime ? ` (à ${dueTime})` : ''} avec succès (à valider).`,
        autonomy_level: "N1",
        extracted_time: dueTime,
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
      const meetingNoteData = {
        booking_id: args.booking_id as string || null,
        project_id: args.project_id as string || null,
        opportunity_id: args.opportunity_id as string || null,
        notes: args.notes as string,
        objectives: args.objectives as string || null,
        next_steps: args.next_steps as string || null,
        action_items: args.action_items || [],
        ai_metadata: {
          autonomy_level: "N1",
          generated_at: new Date().toISOString(),
          validation_required: true,
          validated_by_human: false,
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
        message: "Compte-rendu de réunion créé (à valider).",
        autonomy_level: "N1",
      };
    }

    case "update_opportunity_stage": {
      // N1: Suggest only, don't actually update
      const { data: opportunity, error } = await supabase
        .from("opportunities")
        .select("id, title, stage, value_amount")
        .eq("id", args.opportunity_id)
        .single();

      if (error) throw error;

      return {
        success: true,
        suggestion: {
          opportunity_id: args.opportunity_id,
          opportunity_title: opportunity.title,
          current_stage: opportunity.stage,
          suggested_stage: args.new_stage,
          current_value: opportunity.value_amount,
          suggested_value: args.value_amount,
          reason: args.reason,
        },
        message: `Suggestion de changement de stage pour ${opportunity.title}: ${opportunity.stage} → ${args.new_stage}. Raison: ${args.reason}`,
        autonomy_level: "N1",
        action_required: "Validez ce changement dans le pipeline.",
      };
    }

    case "log_activity": {
      const activityData = {
        entity_type: args.entity_type as string,
        entity_id: args.entity_id as string,
        activity_type: args.activity_type as string,
        title: args.title as string,
        content: args.content as string || null,
        is_ai_generated: true,
        ai_metadata: {
          autonomy_level: "N1",
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
        message: `Activité "${args.title}" enregistrée.`,
        autonomy_level: "N1",
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

      const response = await fetch(LOVABLE_AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Tu es un expert en rédaction de contenu B2B pour une agence d'IA. Génère des articles professionnels et engageants." },
            { role: "user", content: articlePrompt },
          ],
        }),
      });

      if (!response.ok) throw new Error("Content generation failed");

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || "";

      return {
        success: true,
        draft: {
          title: args.title,
          resource_type: args.resource_type,
          content: content,
          topic: args.topic,
        },
        message: `Brouillon d'article "${args.title}" généré.`,
        autonomy_level: "N1",
        action_required: "Relisez et créez l'article dans l'éditeur Admin.",
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

      const response = await fetch(LOVABLE_AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Tu es un expert SEO et content marketing. Analyse les articles et suggère des améliorations concrètes." },
            { role: "user", content: analysisPrompt },
          ],
        }),
      });

      if (!response.ok) throw new Error("Analysis failed");

      const result = await response.json();
      const suggestions = result.choices?.[0]?.message?.content || "";

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

      const response = await fetch(LOVABLE_AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Tu es expert en email marketing B2B. Génère des newsletters engageantes au format HTML." },
            { role: "user", content: newsletterPrompt },
          ],
        }),
      });

      if (!response.ok) throw new Error("Newsletter generation failed");

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || "";

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

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

const DEFAULT_SYSTEM_PROMPT = `Tu es l'Agent IA IArche, un assistant commercial et opérationnel expert.

CONTEXTE :
- IArche est une agence IA basée à Bayonne spécialisée dans les solutions d'intelligence artificielle pour entreprises.
- Tu as accès complet aux données du CRM Cockpit (leads, opportunités, projets, tâches) et du module Admin (articles, solutions, contacts).
- Tu utilises la base de connaissances RAG pour trouver des informations pertinentes.

RÔLE :
- Répondre aux questions sur l'activité commerciale et le contenu
- Analyser les données et fournir des insights actionnables
- Suggérer des actions (tâches, emails, qualifications) en mode N1 (validation humaine requise)
- Aider à la prise de décision commerciale

RÈGLES :
- Sois concis et orienté action
- Utilise les outils disponibles pour répondre avec des données réelles
- Pour toute modification (N1), indique clairement que l'utilisateur doit valider
- Ne jamais inventer de données - si tu ne sais pas, dis-le
- Réponds en français

NIVEAUX D'AUTONOMIE :
- N0 : Lecture seule, informatif (statistiques, recherche, consultation)
- N1 : Suggestions/brouillons à valider (tâches, emails, qualifications)
- N2 : Actions irréversibles (réservé, non implémenté ici)`;

const MASTER_PROMPT_SLUG = "master-agent";

// deno-lint-ignore no-explicit-any
async function getSystemPrompt(supabase: any): Promise<{ prompt: string; model: string }> {
  try {
    const { data, error } = await supabase
      .from("ai_prompts")
      .select("system_prompt, model_config")
      .eq("slug", MASTER_PROMPT_SLUG)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching master prompt:", error);
      return { prompt: DEFAULT_SYSTEM_PROMPT, model: "google/gemini-2.5-flash" };
    }
    
    if (data?.system_prompt) {
      const modelConfig = data.model_config as { model?: string } | null;
      const model = modelConfig?.model || "google/gemini-2.5-flash";
      console.log("Using master prompt from ai_prompts, model:", model);
      return { prompt: data.system_prompt, model };
    }
    
    console.log("No master prompt found, using default");
    return { prompt: DEFAULT_SYSTEM_PROMPT, model: "google/gemini-2.5-flash" };
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
    const { messages, stream = false, workspace_id, user_id, session_id } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Agent orchestrator called with", messages.length, "messages");

    // Fetch system prompt from ai_prompts table
    const { prompt: systemPrompt, model: selectedModel } = await getSystemPrompt(supabase);

    // Get the user's last message
    const lastUserMessage = messages.filter((m: { role: string }) => m.role === "user").pop();
    const userQuery = lastUserMessage?.content || "";

    // =============================================================================
    // MEMORY INTEGRATION
    // =============================================================================
    
    // 1. Fetch recent memory for context
    // NOTE: ai_agent_memory.user_id is UUID; ignore non-UUID user_id values.
    const safeUserId = typeof user_id === "string" && /^[0-9a-fA-F-]{36}$/.test(user_id)
      ? user_id
      : authedUserId;

    const recentMemory = await getRecentMemory(supabase, workspace_id, safeUserId ?? undefined, session_id, 5);

    // 2. Search relevant memory semantically
    const relevantMemory = userQuery ? await searchMemory(supabase, userQuery, workspace_id, safeUserId ?? undefined, 3) : [];
    
    // 3. Build memory context string
    let memoryContext = "";
    if (recentMemory.length > 0 || relevantMemory.length > 0) {
      memoryContext = "\n\nMÉMOIRE AGENT (contexte précédent) :";
      if (relevantMemory.length > 0) {
        memoryContext += "\n--- Mémoire pertinente ---\n" + relevantMemory.join("\n");
      }
      if (recentMemory.length > 0) {
        memoryContext += "\n--- Actions récentes ---\n" + recentMemory.slice(0, 3).join("\n");
      }
    }

    // 4. Inject current date/time context - CRITICAL for agent temporal awareness
    const now = new Date();
    const dateContext = `\n\nCONTEXTE TEMPOREL :
- Date du jour : ${now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Heure actuelle : ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
- Fuseau horaire : Europe/Paris
- Semaine : ${getWeekNumber(now)}`;

    // 5. Save the user query to memory
    if (userQuery) {
      await saveMemory(supabase, {
        memory_type: "conversation",
        category: "user_query",
        content: userQuery.slice(0, 500),
        importance_score: 0.3,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      }, workspace_id, user_id, session_id);
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
    const promptWithMode = systemPrompt.replace("{response_mode}", responseMode);

    // Build messages with system prompt + memory context + date context
    const fullMessages = [
      { role: "system", content: promptWithMode + memoryContext + dateContext },
      ...messages,
    ];

    // Initial AI call with tools
    let response = await fetch(LOVABLE_AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: fullMessages,
        tools: AGENT_TOOLS,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      return new Response(JSON.stringify({ error: "ai_error", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result = await response.json();
    let assistantMessage = result.choices?.[0]?.message;
    const allToolCalls: { name: string; result: unknown }[] = [];

    // Tool calling loop (max 5 iterations to prevent infinite loops)
    let iterations = 0;
    while (assistantMessage?.tool_calls && iterations < 5) {
      iterations++;
      console.log(`Tool calling iteration ${iterations}:`, assistantMessage.tool_calls.length, "calls");

      const toolResults = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

        try {
          const toolResult = await executeTool(supabase, toolName, toolArgs);
          allToolCalls.push({ name: toolName, result: toolResult });
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
          
          // Save tool call to memory
          await saveMemory(supabase, {
            memory_type: "tool_call",
            category: toolName,
            content: `Tool ${toolName} appelé avec ${JSON.stringify(toolArgs).slice(0, 200)}`,
            metadata: { tool: toolName, args: toolArgs, success: true },
            importance_score: 0.6,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          }, workspace_id, user_id, session_id);
          
        } catch (toolError) {
          console.error(`Tool ${toolName} error:`, toolError);
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: (toolError as Error).message }),
          });
        }
      }

      // Continue conversation with tool results
      const continuedMessages = [
        ...fullMessages,
        assistantMessage,
        ...toolResults,
      ];

      response = await fetch(LOVABLE_AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: continuedMessages,
          tools: AGENT_TOOLS,
          tool_choice: "auto",
        }),
      });

      if (!response.ok) {
        break;
      }

      result = await response.json();
      assistantMessage = result.choices?.[0]?.message;
    }

    const finalContent = assistantMessage?.content || "Je n'ai pas pu traiter votre demande.";

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

    console.log("Agent response generated, tools called:", allToolCalls.map(t => t.name));

    return new Response(JSON.stringify({
      ok: true,
      message: finalContent,
      tool_calls: allToolCalls,
      usage: result.usage,
      memory_used: recentMemory.length + relevantMemory.length > 0,
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
