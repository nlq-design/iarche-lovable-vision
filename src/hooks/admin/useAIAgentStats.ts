import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Real-time AI Dashboard Metrics from view
export interface AIDashboardMetrics {
  leads_stale: number;
  projects_stale: number;
  partners_stale: number;
  pending_notifications: number;
  memory_24h: number;
  total_embeddings: number;
  indexed_types: number;
}

export function useAIDashboardMetrics() {
  return useQuery({
    queryKey: ['ai-dashboard-metrics'],
    queryFn: async (): Promise<AIDashboardMetrics> => {
      const { data, error } = await supabase
        .from('ai_dashboard_metrics')
        .select('*')
        .single();

      if (error) {
        console.error('Failed to fetch AI dashboard metrics:', error);
        return {
          leads_stale: 0,
          projects_stale: 0,
          partners_stale: 0,
          pending_notifications: 0,
          memory_24h: 0,
          total_embeddings: 0,
          indexed_types: 0,
        };
      }

      return data as AIDashboardMetrics;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'cockpit_read' | 'cockpit_write' | 'admin_read' | 'admin_write' | 'admin_security' | 'email' | 'rag' | 'orchestration';
  required_fields?: string[];
  optional_fields?: string[];
}

export interface EdgeFunctionDefinition {
  name: string;
  description: string;
  connected_to_agent: boolean;
  usage?: string;
}

export interface AIAgentStats {
  totalTools: number;
  connectedEdgeFunctions: number;
  totalEdgeFunctions: number;
  aiTables: number;
  actionTools: number;
  responseModes: number;
  tools: {
    cockpit_read: ToolDefinition[];
    cockpit_write: ToolDefinition[];
    admin_read: ToolDefinition[];
    admin_write: ToolDefinition[];
    admin_security: ToolDefinition[];
    email: ToolDefinition[];
    rag: ToolDefinition[];
    orchestration: ToolDefinition[];
  };
  edgeFunctions: {
    connected: EdgeFunctionDefinition[];
    other: EdgeFunctionDefinition[];
  };
  aiTablesList: Array<{ name: string; description: string }>;
}

// Hardcoded tools definition - single source of truth
// Synchronized with OrchestratorConfig.tsx and ai-agent-orchestrator edge function
const ORCHESTRATOR_TOOLS: AIAgentStats['tools'] = {
  cockpit_read: [
    { name: "get_leads", description: "Récupère la liste des leads avec filtrage optionnel", category: 'cockpit_read' },
    { name: "get_opportunities", description: "Récupère les opportunités du pipeline commercial", category: 'cockpit_read' },
    { name: "get_projects", description: "Récupère les projets en cours", category: 'cockpit_read' },
    { name: "get_tasks", description: "Récupère les tâches", category: 'cockpit_read' },
    { name: "get_transcriptions", description: "Récupère les transcriptions vocales", category: 'cockpit_read' },
    { name: "get_meeting_notes", description: "Récupère les comptes-rendus de réunion", category: 'cockpit_read' },
    { name: "get_specifications", description: "Récupère les cahiers des charges", category: 'cockpit_read' },
    { name: "get_generated_documents", description: "Récupère les documents générés", category: 'cockpit_read' },
    { name: "get_solution_leads", description: "Récupère les leads intéressés par des solutions", category: 'cockpit_read' },
    { name: "get_activity_log", description: "Récupère l'historique des activités", category: 'cockpit_read' },
    { name: "get_pipeline_stats", description: "Statistiques du pipeline", category: 'cockpit_read' },
    { name: "get_pending_ai_notifications", description: "Notifications IA non lues", category: 'cockpit_read' },
    { name: "mark_notifications_reviewed", description: "Marquer notifications comme lues", category: 'cockpit_read' },
  ],
  cockpit_write: [
    { name: "create_lead", description: "Créer un nouveau lead", category: 'cockpit_write' },
    { name: "update_lead", description: "Mettre à jour un lead", category: 'cockpit_write' },
    { name: "create_opportunity", description: "Créer une opportunité", category: 'cockpit_write' },
    { name: "update_opportunity", description: "Mettre à jour une opportunité", category: 'cockpit_write' },
    { name: "create_project", description: "Créer un projet", category: 'cockpit_write' },
    { name: "update_project", description: "Mettre à jour un projet", category: 'cockpit_write' },
    { name: "create_task", description: "Créer une tâche", category: 'cockpit_write' },
    { name: "update_task", description: "Mettre à jour une tâche", category: 'cockpit_write' },
    { name: "complete_task", description: "Marquer tâche terminée", category: 'cockpit_write' },
    { name: "create_meeting_note", description: "Créer un compte-rendu", category: 'cockpit_write' },
    { name: "add_activity_log", description: "Ajouter une activité", category: 'cockpit_write' },
    { name: "link_solution_to_lead", description: "Lier solution à lead", category: 'cockpit_write' },
    { name: "create_specification", description: "Créer un CDC", category: 'cockpit_write' },
    { name: "update_specification", description: "Mettre à jour un CDC", category: 'cockpit_write' },
  ],
  admin_read: [
    { name: "get_articles", description: "Récupère les articles/contenus publiés", category: 'admin_read' },
    { name: "get_article_details", description: "Détails complets d'un article", category: 'admin_read' },
    { name: "get_solutions", description: "Récupère les solutions IArche", category: 'admin_read' },
    { name: "get_categories_tags", description: "Catégories et tags disponibles", category: 'admin_read' },
    { name: "get_contacts", description: "Messages de contact reçus", category: 'admin_read' },
    { name: "get_newsletters", description: "Newsletters et abonnés", category: 'admin_read' },
    { name: "get_forms", description: "Formulaires et statistiques", category: 'admin_read' },
    { name: "get_form_responses", description: "Réponses à un formulaire", category: 'admin_read' },
    { name: "get_brochures", description: "Brochures marketing", category: 'admin_read' },
    { name: "get_atelier_inscriptions", description: "Inscriptions aux ateliers", category: 'admin_read' },
    { name: "get_bookings", description: "RDV calendrier", category: 'admin_read' },
    { name: "get_booking_types", description: "Types de RDV disponibles", category: 'admin_read' },
    { name: "get_partners", description: "Partenaires enregistrés", category: 'admin_read' },
    { name: "get_uploaded_files", description: "Fichiers uploadés", category: 'admin_read' },
  ],
  admin_write: [
    { name: "create_article", description: "Créer un article", category: 'admin_write' },
    { name: "update_article", description: "Mettre à jour un article", category: 'admin_write' },
    { name: "publish_article", description: "Publier un article", category: 'admin_write' },
    { name: "create_booking", description: "Créer un RDV complet", category: 'admin_write' },
    { name: "cancel_booking", description: "Annuler un RDV", category: 'admin_write' },
    { name: "create_newsletter", description: "Créer une newsletter", category: 'admin_write' },
    { name: "send_newsletter", description: "Envoyer une newsletter", category: 'admin_write' },
  ],
  admin_security: [
    { name: "get_audit_logs", description: "Consulter les logs d'audit", category: 'admin_security' },
    { name: "get_login_attempts", description: "Consulter les tentatives de connexion", category: 'admin_security' },
  ],
  email: [
    { name: "send_email", description: "Envoyer un email", category: 'email' },
    { name: "generate_followup_email", description: "Générer email de suivi", category: 'email' },
  ],
  rag: [
    { name: "search_knowledge_base", description: "Recherche sémantique RAG", category: 'rag' },
    { name: "generate_document", description: "Générer un document IA", category: 'rag' },
    { name: "generate_cdc", description: "Générer un CDC", category: 'rag' },
    { name: "analyze_transcription", description: "Analyser une transcription", category: 'rag' },
    { name: "suggest_next_actions", description: "Suggérer prochaines actions", category: 'rag' },
    { name: "synthesize_entity", description: "Synthétiser une entité", category: 'rag' },
  ],
  orchestration: [
    { name: "get_stale_syntheses", description: "Entités nécessitant mise à jour", category: 'orchestration' },
    { name: "get_ai_dashboard_metrics", description: "Métriques système temps réel", category: 'orchestration' },
    { name: "trigger_proactive_notification", description: "Notification Telegram proactive", category: 'orchestration' },
  ],
};

// Edge functions list - synchronized with supabase/functions folder
const EDGE_FUNCTIONS: AIAgentStats['edgeFunctions'] = {
  connected: [
    { name: "ai-agent-orchestrator", description: "Agent IA principal multi-outils", connected_to_agent: true },
    { name: "generate-embeddings", description: "Génération embeddings RAG", connected_to_agent: true },
    { name: "search-embeddings", description: "Recherche sémantique", connected_to_agent: true },
    { name: "generate-document", description: "Génération documents IA", connected_to_agent: true },
    { name: "generate-followup-email", description: "Génération emails de suivi", connected_to_agent: true },
    { name: "extract-entities", description: "Extraction entités NLP", connected_to_agent: true },
    { name: "synthesize-entity-documents", description: "Synthèse documents entités", connected_to_agent: true },
    { name: "process-voice-transcription", description: "Traitement transcriptions vocales", connected_to_agent: true },
    { name: "suggest-tags", description: "Suggestion tags IA", connected_to_agent: true },
    { name: "generate-faq", description: "Génération FAQ automatique", connected_to_agent: true },
    { name: "enrich-content-seo", description: "Enrichissement SEO contenu", connected_to_agent: true },
  ],
  other: [
    { name: "calendar-booking", description: "Gestion réservations calendrier", connected_to_agent: false },
    { name: "send-lead-notification", description: "Notification nouveau lead", connected_to_agent: false },
    { name: "send-atelier-confirmation", description: "Confirmation atelier", connected_to_agent: false },
    { name: "send-newsletter", description: "Envoi newsletters", connected_to_agent: false },
    { name: "send-form-notification", description: "Notification formulaire", connected_to_agent: false },
    { name: "telegram-webhook", description: "Webhook Telegram", connected_to_agent: false },
    { name: "pappers-lookup", description: "Recherche entreprises Pappers", connected_to_agent: false },
    { name: "create-database-backup", description: "Backup base de données", connected_to_agent: false },
    { name: "push-to-google-calendar", description: "Sync Google Calendar", connected_to_agent: false },
    { name: "record-lighthouse-metrics", description: "Métriques Lighthouse", connected_to_agent: false },
  ],
};

// AI Tables list
const AI_TABLES: Array<{ name: string; description: string }> = [
  { name: "ai_prompts", description: "Prompts système configurables" },
  { name: "ai_agent_memory", description: "Mémoire persistante agent" },
  { name: "resource_embeddings", description: "Vecteurs RAG (pgvector)" },
  { name: "voice_transcriptions", description: "Transcriptions audio" },
  { name: "keyword_aliases", description: "Dictionnaire normalisation" },
  { name: "llm_models", description: "Modèles LLM disponibles" },
];

export function useAIAgentStats() {
  return useQuery({
    queryKey: ['ai-agent-stats'],
    queryFn: async (): Promise<AIAgentStats> => {
      // Calculate totals from hardcoded data
      const totalTools = Object.values(ORCHESTRATOR_TOOLS).reduce((acc, arr) => acc + arr.length, 0);
      const connectedEdgeFunctions = EDGE_FUNCTIONS.connected.length;
      const totalEdgeFunctions = EDGE_FUNCTIONS.connected.length + EDGE_FUNCTIONS.other.length;
      
      // Count action tools (write operations)
      const actionTools = ORCHESTRATOR_TOOLS.cockpit_write.length + 
                          ORCHESTRATOR_TOOLS.admin_write.length + 
                          ORCHESTRATOR_TOOLS.admin_security.length + 
                          ORCHESTRATOR_TOOLS.email.length;

      return {
        totalTools,
        connectedEdgeFunctions,
        totalEdgeFunctions,
        aiTables: AI_TABLES.length,
        actionTools,
        responseModes: 2, // CHAT and DETAILED
        tools: ORCHESTRATOR_TOOLS,
        edgeFunctions: EDGE_FUNCTIONS,
        aiTablesList: AI_TABLES,
      };
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false
  });
}

// Hook to get real-time edge function list
export function useEdgeFunctionsList() {
  return useQuery({
    queryKey: ['edge-functions-list'],
    queryFn: async () => {
      // Return hardcoded edge functions list
      return EDGE_FUNCTIONS;
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

// Hook to get cockpit modules configuration
export function useCockpitModules() {
  return useQuery({
    queryKey: ['cockpit-modules'],
    queryFn: async () => {
      // Fetch from ui-navigation prompt
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('system_prompt')
        .eq('slug', 'ui-navigation')
        .maybeSingle();

      if (error) throw error;
      
      // Parse modules from prompt
      const content = data?.system_prompt || '';
      const modules: Array<{ name: string; description: string; path: string }> = [];
      
      // Parse COCKPIT routes
      const cockpitMatch = content.match(/### COCKPIT \(\d+ routes\)([\s\S]*?)(?=###|$)/);
      if (cockpitMatch) {
        const routePattern = /\| `([^`]+)` \| [^|]+ \| ([^|]+) \|/g;
        let match;
        while ((match = routePattern.exec(cockpitMatch[1])) !== null) {
          const path = match[1];
          const description = match[2].trim();
          const name = path.split('/').pop() || path;
          modules.push({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            description,
            path
          });
        }
      }

      return modules;
    },
    staleTime: 5 * 60 * 1000
  });
}
