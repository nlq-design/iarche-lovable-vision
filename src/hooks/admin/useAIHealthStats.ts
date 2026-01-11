import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AIHealthStats {
  // Alias dictionary
  aliasesTotal: number;
  aliasesActive: number;
  aliasesByContext: Record<string, number>;
  
  // Memory
  memoryTotal: number;
  memoryActive: number;
  memoryExpired: number;
  memoryByType: Record<string, number>;
  
  // RAG
  ragResourcesIndexed: number;
  ragTotalChunks: number;
  ragByType: Record<string, number>;
  
  // Prompts
  promptsTotal: number;
  promptsPrimary: number;
  promptsSecondary: number;
  promptsByCategory: Record<string, number>;
  
  // Usage (last 7 days) - from activity_log
  usageTranscriptions: number;
  usageDocuments: number;
  usageBookings: number;
  usageAIGenerated: number;
  
  // Phase 2: Entity References
  entityReferencesTotal: number;
  entityReferencesByType: Record<string, number>;
  
  // Phase 2: Lead Familiarity
  leadsFamiliarityAvg: number;
  leadsWithHighFamiliarity: number;
  
  // Health status
  healthStatus: 'healthy' | 'warning' | 'error';
  healthIssues: string[];
}

export function useAIHealthStats() {
  return useQuery({
    queryKey: ['ai-health-stats'],
    queryFn: async (): Promise<AIHealthStats> => {
      const healthIssues: string[] = [];
      
      // Fetch all stats in parallel
      const [
        aliasesResult,
        memoryResult,
        ragResult,
        promptsResult,
        transcriptionsResult,
        documentsResult,
        bookingsResult,
        aiGeneratedResult,
        entityRefsResult,
        leadsFamiliarityResult,
      ] = await Promise.all([
        // Aliases
        supabase.from('keyword_aliases').select('context_type, is_active'),
        
        // Memory
        supabase.from('ai_agent_memory').select('memory_type, expires_at'),
        
        // RAG
        supabase.from('resource_embeddings').select('resource_type'),
        
        // Prompts
        supabase.from('ai_prompts').select('slug, category'),
        
        // Transcriptions (last 7 days)
        supabase.from('voice_transcriptions')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Generated documents (last 7 days)
        supabase.from('generated_documents')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Bookings (last 7 days)
        supabase.from('bookings')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // AI generated content (last 7 days)
        supabase.from('activity_log')
          .select('id', { count: 'exact', head: true })
          .eq('is_ai_generated', true)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Phase 2: Entity references
        supabase.from('entity_name_references').select('reference_type'),
        
        // Phase 2: Leads familiarity
        supabase.from('leads').select('familiarity_score'),
      ]);

      // Process aliases
      const aliases = aliasesResult.data || [];
      const aliasesActive = aliases.filter(a => a.is_active).length;
      const aliasesByContext: Record<string, number> = {};
      aliases.forEach(a => {
        aliasesByContext[a.context_type] = (aliasesByContext[a.context_type] || 0) + 1;
      });

      if (aliasesActive === 0) {
        healthIssues.push("Aucun alias actif dans le dictionnaire");
      }

      // Process memory
      const memory = memoryResult.data || [];
      const now = new Date();
      const memoryActive = memory.filter(m => !m.expires_at || new Date(m.expires_at) > now).length;
      const memoryExpired = memory.length - memoryActive;
      const memoryByType: Record<string, number> = {};
      memory.forEach(m => {
        memoryByType[m.memory_type] = (memoryByType[m.memory_type] || 0) + 1;
      });

      // Process RAG
      const rag = ragResult.data || [];
      const ragByType: Record<string, number> = {};
      rag.forEach(r => {
        ragByType[r.resource_type] = (ragByType[r.resource_type] || 0) + 1;
      });

      if (rag.length === 0) {
        healthIssues.push("Aucune ressource indexée pour le RAG");
      }

      // Process prompts
      const prompts = promptsResult.data || [];
      const primaryPrompts = ['master-agent', 'tools-reference', 'ui-navigation'];
      const promptsPrimary = prompts.filter(p => primaryPrompts.includes(p.slug)).length;
      const promptsByCategory: Record<string, number> = {};
      prompts.forEach(p => {
        promptsByCategory[p.category] = (promptsByCategory[p.category] || 0) + 1;
      });

      if (promptsPrimary < 3) {
        healthIssues.push("Prompts primaires manquants (master-agent, tools-reference, ui-navigation)");
      }

      // Phase 2: Process entity references
      const entityRefs = entityRefsResult.data || [];
      const entityReferencesByType: Record<string, number> = {};
      entityRefs.forEach(r => {
        entityReferencesByType[r.reference_type] = (entityReferencesByType[r.reference_type] || 0) + 1;
      });

      // Phase 2: Process lead familiarity
      const leads = leadsFamiliarityResult.data || [];
      const familiarityScores = leads.map(l => l.familiarity_score || 0);
      const leadsFamiliarityAvg = familiarityScores.length > 0 
        ? familiarityScores.reduce((a, b) => a + b, 0) / familiarityScores.length 
        : 0;
      const leadsWithHighFamiliarity = familiarityScores.filter(s => s >= 50).length;

      // Determine health status
      let healthStatus: 'healthy' | 'warning' | 'error' = 'healthy';
      if (healthIssues.length > 0) {
        healthStatus = healthIssues.some(i => i.includes("manquants") || i.includes("Aucune ressource")) 
          ? 'error' 
          : 'warning';
      }

      return {
        aliasesTotal: aliases.length,
        aliasesActive,
        aliasesByContext,
        
        memoryTotal: memory.length,
        memoryActive,
        memoryExpired,
        memoryByType,
        
        ragResourcesIndexed: new Set(rag.map(r => r.resource_type)).size > 0 
          ? rag.length 
          : 0,
        ragTotalChunks: rag.length,
        ragByType,
        
        promptsTotal: prompts.length,
        promptsPrimary,
        promptsSecondary: prompts.length - promptsPrimary,
        promptsByCategory,
        
        usageTranscriptions: transcriptionsResult.count || 0,
        usageDocuments: documentsResult.count || 0,
        usageBookings: bookingsResult.count || 0,
        usageAIGenerated: aiGeneratedResult.count || 0,
        
        entityReferencesTotal: entityRefs.length,
        entityReferencesByType,
        
        leadsFamiliarityAvg: Math.round(leadsFamiliarityAvg * 10) / 10,
        leadsWithHighFamiliarity,
        
        healthStatus,
        healthIssues,
      };
    },
    staleTime: 60 * 1000, // 1 minute - health stats are not critical
    refetchOnWindowFocus: false, // Avoid reload on tab focus
  });
}

// Separate hook for detailed memory stats
export function useAIMemoryDetails(limit = 20) {
  return useQuery({
    queryKey: ['ai-memory-details', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agent_memory')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000
  });
}

// Hook for entity references
export function useEntityReferences(entityType: string, entityId: string | null) {
  return useQuery({
    queryKey: ['entity-references', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];
      
      const { data, error } = await supabase
        .rpc('get_entity_references', {
          p_entity_type: entityType,
          p_entity_id: entityId
        });

      if (error) throw error;
      return data || [];
    },
    enabled: !!entityId,
    staleTime: 30 * 1000
  });
}
