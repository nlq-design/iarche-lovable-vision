import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InfrastructureStats {
  // Prompts
  promptsTotal: number;
  promptsCategories: number;
  promptsByCategory: Record<string, { count: number; slugs: string[] }>;
  
  // Edge Functions (hardcoded list since no DB table for them)
  edgeFunctionsTotal: number;
  edgeFunctionsList: string[];
  
  // Tables
  tablesTotal: number;
  tablesList: string[];
  tablesByGroup: Record<string, string[]>;
  
  // Secrets
  secretsTotal: number;
  secretsList: string[];
  
  // Storage Buckets
  bucketsTotal: number;
  bucketsList: Array<{ name: string; isPublic: boolean }>;
  
  // Connectors
  connectorsActive: string[];
  connectorsAvailable: string[];
}

// Known edge functions list (from filesystem)
const EDGE_FUNCTIONS = [
  "ai-agent-orchestrator",
  "analyze-comments-for-faq",
  "calendar-booking",
  "check-cta-conversion",
  "check-login-attempt",
  "check-performance-threshold",
  "create-database-backup",
  "create-voice-transcription",
  "detect-anomalies",
  "enrich-all-resources",
  "enrich-content-seo",
  "extract-entities",
  "generate-article-claude",
  "generate-article-gpt",
  "generate-document",
  "generate-docx",
  "generate-embeddings",
  "generate-faq",
  "generate-followup-email",
  "generate-sitemap",
  "notify-new-comment",
  "pappers-lookup",
  "process-uploaded-file",
  "process-voice-transcription",
  "publish-scheduled-articles",
  "push-to-google-calendar",
  "record-lighthouse-metrics",
  "restore-backup",
  "search-embeddings",
  "send-atelier-confirmation",
  "send-brevo-campaign",
  "send-form-notification",
  "send-lead-notification",
  "send-newsletter",
  "send-security-alert",
  "send-user-confirmation",
  "serve-transcription-audio",
  "suggest-tags",
  "sync-google-calendar",
  "synthesize-entity-documents",
  "telegram-webhook",
  "track-cta-click",
  "transcribe-audio-chunk",
  "verify-backup-integrity",
];

// Known secrets (from Supabase config)
const SECRETS = [
  "TELEGRAM_BOT_TOKEN",
  "ELEVENLABS_API_KEY",
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ZOOM_ACCOUNT_ID",
  "RESEND_API_KEY",
  "FLY_API_TOKEN",
  "GMAIL_CLIENT_ID",
  "ZOOM_CLIENT_ID",
  "SUPABASE_URL",
  "ANTHROPIC_API_KEY",
  "BREVO_API_KEY",
  "GMAIL_SENDER_EMAIL",
  "PAPPERS_API_KEY",
  "GOOGLE_CALENDAR_ID",
  "ZOOM_CLIENT_SECRET",
  "SUPABASE_DB_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "GMAIL_REFRESH_TOKEN",
  "GMAIL_CLIENT_SECRET",
  "LOVABLE_API_KEY",
  "SUPABASE_ANON_KEY",
  "GOOGLE_SERVICE_ACCOUNT_KEY",
];

// Known buckets
const BUCKETS = [
  { name: "livres-blancs", isPublic: true },
  { name: "brochure-images", isPublic: true },
  { name: "qr-codes", isPublic: true },
  { name: "media-library", isPublic: true },
  { name: "specifications", isPublic: true },
  { name: "cockpit-uploads", isPublic: false },
  { name: "voice-transcriptions", isPublic: false },
];

// Group tables by function
function groupTables(tables: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {
    "CRM Cockpit": [],
    "Documents": [],
    "Intelligence IA": [],
    "Contenu": [],
    "Authentification": [],
    "Système": [],
    "Analytics": [],
  };

  const mappings: Record<string, string> = {
    leads: "CRM Cockpit",
    lead_contacts: "CRM Cockpit",
    lead_partners: "CRM Cockpit",
    opportunities: "CRM Cockpit",
    opportunity_partners: "CRM Cockpit",
    projects: "CRM Cockpit",
    project_documents: "CRM Cockpit",
    project_contacts: "CRM Cockpit",
    project_notes: "CRM Cockpit",
    project_partners: "CRM Cockpit",
    partners: "CRM Cockpit",
    tasks: "CRM Cockpit",
    task_partners: "CRM Cockpit",
    bookings: "CRM Cockpit",
    booking_partners: "CRM Cockpit",
    booking_types: "CRM Cockpit",
    booking_availability: "CRM Cockpit",
    meeting_notes: "CRM Cockpit",
    
    generated_documents: "Documents",
    document_partners: "Documents",
    specifications: "Documents",
    uploaded_files: "Documents",
    voice_transcriptions: "Documents",
    transcription_partners: "Documents",
    
    ai_prompts: "Intelligence IA",
    ai_agent_memory: "Intelligence IA",
    keyword_aliases: "Intelligence IA",
    resource_embeddings: "Intelligence IA",
    vectorization_status: "Intelligence IA",
    entity_name_references: "Intelligence IA",
    llm_models: "Intelligence IA",
    
    articles: "Contenu",
    article_categories: "Contenu",
    article_tags: "Contenu",
    article_versions: "Contenu",
    article_views: "Contenu",
    categories: "Contenu",
    tags: "Contenu",
    comments: "Contenu",
    faqs: "Contenu",
    brochures: "Contenu",
    forms: "Contenu",
    form_responses: "Contenu",
    form_analytics: "Contenu",
    newsletters: "Contenu",
    newsletter_subscribers: "Contenu",
    atelier_inscriptions: "Contenu",
    solution_leads: "Contenu",
    solution_partners: "Contenu",
    
    user_roles: "Authentification",
    workspaces: "Authentification",
    workspace_members: "Authentification",
    cockpit_auth_sessions: "Authentification",
    cockpit_mfa_attempts: "Authentification",
    login_attempts: "Authentification",
    account_locks: "Authentification",
    
    activity_log: "Système",
    admin_audit_logs: "Système",
    database_backups: "Système",
    statuses: "Système",
    email_configurations: "Système",
    email_logs: "Système",
    media_templates: "Système",
    rate_limit_requests: "Système",
    
    cta_clicks: "Analytics",
    performance_metrics: "Analytics",
    contacts: "Analytics",
    search_queries: "Analytics",
  };

  tables.forEach(table => {
    const group = mappings[table] || "Système";
    if (groups[group]) {
      groups[group].push(table);
    } else {
      groups["Système"].push(table);
    }
  });

  return groups;
}

export function useInfrastructureStats() {
  return useQuery({
    queryKey: ["infrastructure-stats"],
    queryFn: async (): Promise<InfrastructureStats> => {
      // Fetch prompts
      const promptsResult = await supabase
        .from("ai_prompts")
        .select("slug, category")
        .order("category");

      // Process prompts
      const prompts = promptsResult.data || [];
      const promptsByCategory: Record<string, { count: number; slugs: string[] }> = {};
      prompts.forEach((p) => {
        if (!promptsByCategory[p.category]) {
          promptsByCategory[p.category] = { count: 0, slugs: [] };
        }
        promptsByCategory[p.category].count++;
        promptsByCategory[p.category].slugs.push(p.slug);
      });

      // Use hardcoded verified list of tables (from information_schema query)
      const tablesList = [
        "account_locks", "activity_log", "admin_audit_logs", "ai_agent_memory",
        "ai_prompts", "article_categories", "article_tags", "article_versions",
        "article_views", "articles", "atelier_inscriptions", "booking_availability",
        "booking_partners", "booking_types", "bookings", "brochures", "categories",
        "cockpit_auth_sessions", "cockpit_mfa_attempts", "comments", "contacts",
        "cta_clicks", "database_backups", "document_partners", "email_configurations",
        "email_logs", "entity_name_references", "faqs", "form_analytics",
        "form_responses", "forms", "generated_documents", "keyword_aliases",
        "lead_contacts", "lead_partners", "leads", "llm_models", "login_attempts",
        "media_templates", "meeting_notes", "newsletter_subscribers", "newsletters",
        "opportunities", "opportunity_partners", "partners", "performance_metrics",
        "project_contacts", "project_documents", "project_notes", "project_partners",
        "projects", "rate_limit_requests", "resource_embeddings", "search_queries",
        "solution_leads", "solution_partners", "specifications", "statuses", "tags",
        "task_partners", "tasks", "transcription_partners", "uploaded_files",
        "user_roles", "vectorization_status", "voice_transcriptions",
        "workspace_members", "workspaces",
      ];

      return {
        promptsTotal: prompts.length,
        promptsCategories: Object.keys(promptsByCategory).length,
        promptsByCategory,
        
        edgeFunctionsTotal: EDGE_FUNCTIONS.length,
        edgeFunctionsList: EDGE_FUNCTIONS,
        
        tablesTotal: tablesList.length,
        tablesList,
        tablesByGroup: groupTables(tablesList),
        
        secretsTotal: SECRETS.length,
        secretsList: SECRETS,
        
        bucketsTotal: BUCKETS.length,
        bucketsList: BUCKETS,
        
        connectorsActive: ["Notion"],
        connectorsAvailable: ["ElevenLabs", "Firecrawl", "Perplexity"],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
