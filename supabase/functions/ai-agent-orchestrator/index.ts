import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

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
          source: { type: "string", description: "Filtrer par source (contact, newsletter, livre-blanc, atelier-webinaire)" },
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
      name: "get_activity_log",
      description: "Récupère l'historique des activités (emails, appels, RDV, changements de statut).",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", description: "Filtrer par type (lead, opportunity, project)" },
          entity_id: { type: "string", description: "Filtrer par ID d'entité spécifique" },
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
  // ============ ADMIN - Lecture (N0) ============
  {
    type: "function",
    function: {
      name: "get_articles",
      description: "Récupère les articles publiés (actualités, articles, cas-clients, livres-blancs, ateliers).",
      parameters: {
        type: "object",
        properties: {
          resource_type: { type: "string", description: "Filtrer par type (actualite, article, cas-client, livre-blanc, atelier-webinaire)" },
          published_only: { type: "boolean", description: "Ne retourner que les articles publiés (défaut: true)" },
          limit: { type: "number", description: "Nombre max de résultats (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_solutions",
      description: "Récupère les solutions IArche (offres SaaS et services).",
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
      name: "get_contacts",
      description: "Récupère les messages de contact reçus via le formulaire.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Nombre max de résultats (défaut: 10)" },
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
      name: "suggest_booking_action",
      description: "[N1 - Suggestion] Suggère une action sur un rendez-vous (reporter, ajouter notes, envoyer rappel).",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "ID du booking" },
          action: { type: "string", enum: ["reschedule", "add_notes", "send_reminder", "prepare_meeting"], description: "Action suggérée" },
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
      description: "[N1 - Brouillon] Crée une tâche de suivi. L'utilisateur doit valider avant exécution.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre de la tâche" },
          description: { type: "string", description: "Description détaillée" },
          task_type: { type: "string", description: "Type (follow_up, call, email, meeting, other)" },
          priority: { type: "string", description: "Priorité (low, medium, high, urgent)" },
          due_date: { type: "string", description: "Date d'échéance (YYYY-MM-DD)" },
          lead_id: { type: "string", description: "ID du lead associé" },
          project_id: { type: "string", description: "ID du projet associé" },
        },
        required: ["title", "task_type"],
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
      name: "draft_followup_email",
      description: "[N1 - Brouillon] Génère un brouillon d'email de suivi pour un lead.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "ID du lead" },
          email_type: { type: "string", description: "Type (first_contact, post_meeting, followup, proposal)" },
          custom_context: { type: "string", description: "Contexte additionnel pour personnaliser l'email" },
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

    case "get_activity_log": {
      let query = supabase
        .from("activity_log")
        .select("id, entity_type, entity_id, activity_type, title, content, created_at, is_ai_generated")
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 20);

      if (args.entity_type) query = query.eq("entity_type", args.entity_type);
      if (args.entity_id) query = query.eq("entity_id", args.entity_id);

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

    case "get_contacts": {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, email, company, subject, message, source, created_at")
        .order("created_at", { ascending: false })
        .limit(args.limit as number || 10);

      if (error) throw error;
      return { contacts: data, count: data?.length || 0 };
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
      const taskData = {
        title: args.title as string,
        description: args.description as string || null,
        task_type: args.task_type as string || "follow_up",
        priority: args.priority as string || "medium",
        due_date: args.due_date as string || null,
        lead_id: args.lead_id as string || null,
        project_id: args.project_id as string || null,
        status: "pending",
        ai_generated: true,
        ai_metadata: {
          autonomy_level: "N1",
          generated_at: new Date().toISOString(),
          validation_required: true,
          validated_by_human: false,
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
        message: `Tâche "${args.title}" créée avec succès (à valider).`,
        autonomy_level: "N1",
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

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

const SYSTEM_PROMPT = `Tu es l'Agent IA IArche, un assistant commercial et opérationnel expert.

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { messages, stream = false } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Agent orchestrator called with", messages.length, "messages");

    // Build messages with system prompt
    const fullMessages = [
      { role: "system", content: SYSTEM_PROMPT },
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
        model: "google/gemini-2.5-flash",
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
          model: "google/gemini-2.5-flash",
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

    console.log("Agent response generated, tools called:", allToolCalls.map(t => t.name));

    return new Response(JSON.stringify({
      ok: true,
      message: finalContent,
      tool_calls: allToolCalls,
      usage: result.usage,
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
