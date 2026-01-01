import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'cockpit_read' | 'cockpit_write' | 'admin_read' | 'admin_write' | 'admin_security' | 'email' | 'rag';
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
    admin_security: [],
    email: [],
    rag: [],
  };

  // Helper to parse table rows
  const parseTableSection = (section: string): Array<{name: string; description: string; required?: string[]; optional?: string[]}> => {
    const items: Array<{name: string; description: string; required?: string[]; optional?: string[]}> = [];
    const lines = section.split('\n');
    
    for (const line of lines) {
      if (!line.startsWith('|') || line.includes('---') || line.includes('Outil') || line.includes('Fonction')) continue;
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 2 && cols[0] && !cols[0].includes('---')) {
        items.push({
          name: cols[0],
          description: cols[1],
          required: cols[2]?.split(',').map(s => s.trim()).filter(Boolean),
          optional: cols[3]?.split(',').map(s => s.trim()).filter(Boolean)
        });
      }
    }
    return items;
  };

  // Parse Cockpit Read tools
  const cockpitReadMatch = content.match(/## 🔵 OUTILS COCKPIT - LECTURE[^\n]*\n([\s\S]*?)(?=\n## [🟢🟠🔴🟣⚫⚡]|$)/);
  if (cockpitReadMatch) {
    parseTableSection(cockpitReadMatch[1]).forEach(item => {
      result.cockpit_read.push({ name: item.name, description: item.description, category: 'cockpit_read' });
    });
  }

  // Parse Cockpit Write tools
  const cockpitWriteMatch = content.match(/## 🟢 OUTILS COCKPIT - ÉCRITURE[^\n]*\n([\s\S]*?)(?=\n## [🔵🟠🔴🟣⚫⚡]|$)/);
  if (cockpitWriteMatch) {
    parseTableSection(cockpitWriteMatch[1]).forEach(item => {
      result.cockpit_write.push({ 
        name: item.name, 
        description: item.description, 
        category: 'cockpit_write',
        required_fields: item.required,
        optional_fields: item.optional
      });
    });
  }

  // Parse Email tools
  const emailMatch = content.match(/## 🟠 OUTILS COCKPIT - EMAIL[^\n]*\n([\s\S]*?)(?=\n## [🔵🟢🔴🟣⚫⚡]|$)/);
  if (emailMatch) {
    parseTableSection(emailMatch[1]).forEach(item => {
      result.email.push({ 
        name: item.name, 
        description: item.description, 
        category: 'email',
        required_fields: item.required,
        optional_fields: item.optional
      });
    });
  }

  // Parse RAG tools
  const ragMatch = content.match(/## 🔴 OUTILS COCKPIT - IA\/RAG[^\n]*\n([\s\S]*?)(?=\n## [🔵🟢🟠🟣⚫⚡]|$)/);
  if (ragMatch) {
    parseTableSection(ragMatch[1]).forEach(item => {
      result.rag.push({ 
        name: item.name, 
        description: item.description, 
        category: 'rag',
        required_fields: item.required,
        optional_fields: item.optional
      });
    });
  }

  // Parse Admin Content tools
  const adminContentMatch = content.match(/## 🟣 OUTILS ADMIN - CONTENU[^\n]*\n([\s\S]*?)(?=\n## [🔵🟢🟠🔴⚫⚡]|$)/);
  if (adminContentMatch) {
    parseTableSection(adminContentMatch[1]).forEach(item => {
      result.admin_read.push({ name: item.name, description: item.description, category: 'admin_read' });
    });
  }

  // Parse Admin System tools
  const adminSystemMatch = content.match(/## ⚫ OUTILS ADMIN - SYSTÈME[^\n]*\n([\s\S]*?)(?=\n## [🔵🟢🟠🔴🟣⚡]|$)/);
  if (adminSystemMatch) {
    parseTableSection(adminSystemMatch[1]).forEach(item => {
      result.admin_write.push({ name: item.name, description: item.description, category: 'admin_write' });
    });
  }

  // Parse Admin Security tools
  const adminSecurityMatch = content.match(/## ⚡ OUTILS ADMIN - SÉCURITÉ[^\n]*\n([\s\S]*?)(?=\n## |---\n\n|$)/);
  if (adminSecurityMatch) {
    parseTableSection(adminSecurityMatch[1]).forEach(item => {
      result.admin_security.push({ name: item.name, description: item.description, category: 'admin_security' });
    });
  }

  return result;
}

// Parse edge functions from tools-reference
function parseEdgeFunctionsFromPrompt(content: string): AIAgentStats['edgeFunctions'] {
  const connected: EdgeFunctionDefinition[] = [];
  const other: EdgeFunctionDefinition[] = [];

  // Parse connected edge functions
  const connectedMatch = content.match(/### Connectées à l'Agent IA[^\n]*\n([\s\S]*?)(?=\n### Autres|\n---\n|$)/);
  if (connectedMatch) {
    const lines = connectedMatch[1].split('\n');
    for (const line of lines) {
      if (!line.startsWith('|') || line.includes('---') || line.includes('Fonction') || line.includes('Description')) continue;
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 2 && cols[0] && !cols[0].includes('---')) {
        connected.push({
          name: cols[0],
          description: cols[1],
          connected_to_agent: true,
          usage: cols[1]
        });
      }
    }
  }

  // Parse other edge functions
  const otherMatch = content.match(/### Autres fonctions backend[^\n]*\n([\s\S]*?)(?=\n---\n|$)/);
  if (otherMatch) {
    const lines = otherMatch[1].split('\n');
    for (const line of lines) {
      if (!line.startsWith('|') || line.includes('---') || line.includes('Fonction') || line.includes('Description')) continue;
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 2 && cols[0] && !cols[0].includes('---')) {
        other.push({
          name: cols[0],
          description: cols[1],
          connected_to_agent: false,
          usage: cols[1]
        });
      }
    }
  }

  return { connected, other };
}

// Parse AI tables from prompt
function parseAITablesFromPrompt(content: string): Array<{ name: string; description: string }> {
  const tables: Array<{ name: string; description: string }> = [];
  
  const tablesMatch = content.match(/## 📋 TABLES IA DÉDIÉES[^\n]*\n([\s\S]*?)(?=\n---\n|$)/);
  if (tablesMatch) {
    const lines = tablesMatch[1].split('\n');
    for (const line of lines) {
      if (!line.startsWith('|') || line.includes('---') || line.includes('Table') || line.includes('Description')) continue;
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 2 && cols[0] && !cols[0].includes('---')) {
        tables.push({
          name: cols[0],
          description: cols[1]
        });
      }
    }
  }
  
  return tables;
}

// Extract stats from header
function extractStatsFromPrompt(content: string): { totalTools: number; connectedEdgeFunctions: number; totalEdgeFunctions: number; aiTables: number } {
  const result = { totalTools: 0, connectedEdgeFunctions: 0, totalEdgeFunctions: 0, aiTables: 0 };
  
  // Parse total tools
  const toolsMatch = content.match(/\*\*Total outils\*\* : (\d+)/);
  if (toolsMatch) result.totalTools = parseInt(toolsMatch[1], 10);
  
  // Parse connected edge functions
  const connectedMatch = content.match(/\*\*Edge Functions connectées\*\* : (\d+)/);
  if (connectedMatch) result.connectedEdgeFunctions = parseInt(connectedMatch[1], 10);
  
  // Parse total edge functions
  const totalEfMatch = content.match(/\*\*Edge Functions totales\*\* : (\d+)/);
  if (totalEfMatch) result.totalEdgeFunctions = parseInt(totalEfMatch[1], 10);
  
  // Parse AI tables
  const tablesMatch = content.match(/\*\*Tables IA\*\* : (\d+)/);
  if (tablesMatch) result.aiTables = parseInt(tablesMatch[1], 10);
  
  return result;
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
      
      // Parse AI tables
      const aiTablesList = parseAITablesFromPrompt(content);

      // Calculate totals from parsed data if header stats are missing
      const totalTools = headerStats.totalTools || 
        Object.values(tools).reduce((acc, arr) => acc + arr.length, 0);
      
      const connectedEdgeFunctions = headerStats.connectedEdgeFunctions || edgeFunctions.connected.length;
      const totalEdgeFunctions = headerStats.totalEdgeFunctions || (edgeFunctions.connected.length + edgeFunctions.other.length);
      
      // Count action tools (write operations)
      const actionTools = tools.cockpit_write.length + tools.admin_write.length + tools.admin_security.length + tools.email.length;

      return {
        totalTools,
        connectedEdgeFunctions,
        totalEdgeFunctions,
        aiTables: headerStats.aiTables || aiTablesList.length,
        actionTools,
        responseModes: 2, // CHAT and DETAILED
        tools,
        edgeFunctions,
        aiTablesList: aiTablesList.length > 0 ? aiTablesList : [
          { name: "ai_prompts", description: "Prompts système configurables" },
          { name: "ai_agent_memory", description: "Mémoire persistante agent" },
          { name: "resource_embeddings", description: "Vecteurs RAG (pgvector)" },
          { name: "voice_transcriptions", description: "Transcriptions audio" },
          { name: "keyword_aliases", description: "Dictionnaire normalisation" },
          { name: "llm_models", description: "Modèles LLM disponibles" },
        ]
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
