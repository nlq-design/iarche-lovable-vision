import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'cockpit_read' | 'cockpit_write' | 'admin_read' | 'admin_write' | 'email' | 'rag';
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
    email: ToolDefinition[];
    rag: ToolDefinition[];
  };
  edgeFunctions: {
    connected: EdgeFunctionDefinition[];
    other: EdgeFunctionDefinition[];
  };
  aiTablesList: Array<{ name: string; description: string }>;
}

// Parse tools from tools-reference prompt content
function parseToolsFromPrompt(content: string): AIAgentStats['tools'] {
  const result: AIAgentStats['tools'] = {
    cockpit_read: [],
    cockpit_write: [],
    admin_read: [],
    admin_write: [],
    email: [],
    rag: [],
  };

  // Parse Cockpit Read tools
  const cockpitReadMatch = content.match(/## 🔵 OUTILS COCKPIT - LECTURE[^#]*?\n\n\|[^\|]+\|[^\|]+\|[^\|]+\|\n\|[-\s|]+\|\n([\s\S]*?)(?=\n\n##|$)/);
  if (cockpitReadMatch) {
    const rows = cockpitReadMatch[1].trim().split('\n');
    rows.forEach(row => {
      const cols = row.split('|').filter(c => c.trim());
      if (cols.length >= 2) {
        result.cockpit_read.push({
          name: cols[0].trim(),
          description: cols[1].trim(),
          category: 'cockpit_read'
        });
      }
    });
  }

  // Parse Cockpit Write tools
  const cockpitWriteMatch = content.match(/## 🟢 OUTILS COCKPIT - ÉCRITURE[^#]*?\n\n\|[^\|]+\|[^\|]+\|[^\|]+\|[^\|]+\|\n\|[-\s|]+\|\n([\s\S]*?)(?=\n\n##|$)/);
  if (cockpitWriteMatch) {
    const rows = cockpitWriteMatch[1].trim().split('\n');
    rows.forEach(row => {
      const cols = row.split('|').filter(c => c.trim());
      if (cols.length >= 2) {
        result.cockpit_write.push({
          name: cols[0].trim(),
          description: cols[1].trim(),
          category: 'cockpit_write',
          required_fields: cols[2]?.split(',').map(s => s.trim()).filter(Boolean),
          optional_fields: cols[3]?.split(',').map(s => s.trim()).filter(Boolean)
        });
      }
    });
  }

  // Parse Email tools
  const emailMatch = content.match(/## 🟠 OUTILS COCKPIT - EMAIL[^#]*?\n\n\|[^\|]+\|[^\|]+\|[^\|]+\|[^\|]+\|\n\|[-\s|]+\|\n([\s\S]*?)(?=\n\n##|$)/);
  if (emailMatch) {
    const rows = emailMatch[1].trim().split('\n');
    rows.forEach(row => {
      const cols = row.split('|').filter(c => c.trim());
      if (cols.length >= 2) {
        result.email.push({
          name: cols[0].trim(),
          description: cols[1].trim(),
          category: 'email'
        });
      }
    });
  }

  // Parse RAG tools
  const ragMatch = content.match(/## 🔴 OUTILS COCKPIT - IA\/RAG[^#]*?\n\n\|[^\|]+\|[^\|]+\|[^\|]+\|\n\|[-\s|]+\|\n([\s\S]*?)(?=\n\n##|$)/);
  if (ragMatch) {
    const rows = ragMatch[1].trim().split('\n');
    rows.forEach(row => {
      const cols = row.split('|').filter(c => c.trim());
      if (cols.length >= 2) {
        result.rag.push({
          name: cols[0].trim(),
          description: cols[1].trim(),
          category: 'rag'
        });
      }
    });
  }

  // Parse Admin Read tools
  const adminReadMatch = content.match(/## 🟣 OUTILS ADMIN - CONTENU[^#]*?\n\n\|[^\|]+\|[^\|]+\|[^\|]+\|\n\|[-\s|]+\|\n([\s\S]*?)(?=\n\n##|$)/);
  if (adminReadMatch) {
    const rows = adminReadMatch[1].trim().split('\n');
    rows.forEach(row => {
      const cols = row.split('|').filter(c => c.trim());
      if (cols.length >= 2) {
        result.admin_read.push({
          name: cols[0].trim(),
          description: cols[1].trim(),
          category: 'admin_read'
        });
      }
    });
  }

  // Parse Admin Write tools
  const adminWriteMatch = content.match(/## ⚫ OUTILS ADMIN - SYSTÈME[^#]*?\n\n\|[^\|]+\|[^\|]+\|[^\|]+\|\n\|[-\s|]+\|\n([\s\S]*?)(?=\n\n##|$)/);
  if (adminWriteMatch) {
    const rows = adminWriteMatch[1].trim().split('\n');
    rows.forEach(row => {
      const cols = row.split('|').filter(c => c.trim());
      if (cols.length >= 2) {
        result.admin_write.push({
          name: cols[0].trim(),
          description: cols[1].trim(),
          category: 'admin_write'
        });
      }
    });
  }

  // Also try to parse admin security tools
  const adminSecurityMatch = content.match(/## ⚡ OUTILS ADMIN - SÉCURITÉ[^#]*?\n\n\|[^\|]+\|[^\|]+\|[^\|]+\|\n\|[-\s|]+\|\n([\s\S]*?)(?=\n\n##|$)/);
  if (adminSecurityMatch) {
    const rows = adminSecurityMatch[1].trim().split('\n');
    rows.forEach(row => {
      const cols = row.split('|').filter(c => c.trim());
      if (cols.length >= 2) {
        result.admin_write.push({
          name: cols[0].trim(),
          description: cols[1].trim(),
          category: 'admin_write'
        });
      }
    });
  }

  return result;
}

// Parse edge functions from tools-reference
function parseEdgeFunctionsFromPrompt(content: string): AIAgentStats['edgeFunctions'] {
  const connected: EdgeFunctionDefinition[] = [];
  const other: EdgeFunctionDefinition[] = [];

  // Parse Edge Functions section
  const edgeMatch = content.match(/## 🔗 \d+ EDGE FUNCTIONS[^#]*?\n\n\|[^\|]+\|[^\|]+\|\n\|[-\s|]+\|\n([\s\S]*?)(?=\n\n---|$)/);
  if (edgeMatch) {
    const rows = edgeMatch[1].trim().split('\n');
    rows.forEach(row => {
      const cols = row.split('|').filter(c => c.trim());
      if (cols.length >= 2) {
        connected.push({
          name: cols[0].trim(),
          description: cols[1].trim(),
          connected_to_agent: true,
          usage: cols[1].trim()
        });
      }
    });
  }

  return { connected, other };
}

// Extract stats from header
function extractStatsFromPrompt(content: string): { totalTools: number; edgeFunctions: number; aiTables: number } {
  const statsMatch = content.match(/## 📊 STATISTIQUES\n- \*\*Total outils\*\* : (\d+)\n- \*\*Edge Functions\*\* : (\d+)\n- \*\*Tables IA\*\* : (\d+)/);
  if (statsMatch) {
    return {
      totalTools: parseInt(statsMatch[1], 10),
      edgeFunctions: parseInt(statsMatch[2], 10),
      aiTables: parseInt(statsMatch[3], 10)
    };
  }
  return { totalTools: 0, edgeFunctions: 0, aiTables: 0 };
}

export function useAIAgentStats() {
  return useQuery({
    queryKey: ['ai-agent-stats'],
    queryFn: async (): Promise<AIAgentStats> => {
      // Fetch tools-reference prompt
      const { data: toolsRefPrompt, error } = await supabase
        .from('ai_prompts')
        .select('system_prompt')
        .eq('slug', 'tools-reference')
        .maybeSingle();

      if (error) throw error;

      const content = toolsRefPrompt?.system_prompt || '';
      
      // Parse stats from header
      const headerStats = extractStatsFromPrompt(content);
      
      // Parse tools
      const tools = parseToolsFromPrompt(content);
      
      // Parse edge functions
      const edgeFunctions = parseEdgeFunctionsFromPrompt(content);

      // Calculate totals
      const totalTools = headerStats.totalTools || 
        Object.values(tools).reduce((acc, arr) => acc + arr.length, 0);
      
      const connectedEdgeFunctions = headerStats.edgeFunctions || edgeFunctions.connected.length;
      
      // Count action tools (write operations)
      const actionTools = tools.cockpit_write.length + tools.admin_write.length + tools.email.length;

      // AI Tables list (static for now, but could be parsed too)
      const aiTablesList = [
        { name: "ai_prompts", description: "Prompts système configurables" },
        { name: "ai_agent_memory", description: "Mémoire persistante agent" },
        { name: "resource_embeddings", description: "Vecteurs RAG (pgvector)" },
        { name: "voice_transcriptions", description: "Transcriptions audio" },
        { name: "keyword_aliases", description: "Dictionnaire normalisation" },
        { name: "llm_models", description: "Modèles LLM disponibles" },
      ];

      return {
        totalTools,
        connectedEdgeFunctions,
        totalEdgeFunctions: 38, // Could be fetched from file system in future
        aiTables: headerStats.aiTables || aiTablesList.length,
        actionTools,
        responseModes: 2, // CHAT and DETAILED
        tools,
        edgeFunctions,
        aiTablesList
      };
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false
  });
}

// Hook to get real-time edge function list
export function useEdgeFunctionsList() {
  return useQuery({
    queryKey: ['edge-functions-list'],
    queryFn: async () => {
      // This would ideally fetch from a Supabase function that lists deployed functions
      // For now, we parse from tools-reference
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('system_prompt')
        .eq('slug', 'tools-reference')
        .maybeSingle();

      if (error) throw error;
      
      const content = data?.system_prompt || '';
      return parseEdgeFunctionsFromPrompt(content);
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
