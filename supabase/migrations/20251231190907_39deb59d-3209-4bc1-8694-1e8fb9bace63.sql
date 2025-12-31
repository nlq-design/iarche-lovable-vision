-- Table pour la mémoire persistante de l'agent IA
CREATE TABLE public.ai_agent_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID,
  session_id TEXT,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('conversation', 'action', 'rag_query', 'tool_call', 'insight', 'preference', 'context')),
  category TEXT, -- e.g., 'lead', 'project', 'document', 'search'
  entity_type TEXT, -- linked entity type if applicable
  entity_id UUID, -- linked entity id if applicable
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding extensions.vector(1536), -- for semantic search in memory
  importance_score FLOAT DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
  expires_at TIMESTAMPTZ, -- optional expiration for short-term memory
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_ai_memory_workspace ON public.ai_agent_memory(workspace_id);
CREATE INDEX idx_ai_memory_user ON public.ai_agent_memory(user_id);
CREATE INDEX idx_ai_memory_session ON public.ai_agent_memory(session_id);
CREATE INDEX idx_ai_memory_type ON public.ai_agent_memory(memory_type);
CREATE INDEX idx_ai_memory_entity ON public.ai_agent_memory(entity_type, entity_id);
CREATE INDEX idx_ai_memory_created ON public.ai_agent_memory(created_at DESC);
CREATE INDEX idx_ai_memory_importance ON public.ai_agent_memory(importance_score DESC);

-- Index vectoriel pour recherche sémantique dans la mémoire
CREATE INDEX idx_ai_memory_embedding ON public.ai_agent_memory 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Trigger updated_at
CREATE TRIGGER set_ai_memory_updated_at
  BEFORE UPDATE ON public.ai_agent_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Fonction pour rechercher dans la mémoire avec similarité sémantique
CREATE OR REPLACE FUNCTION public.search_ai_memory(
  p_query_embedding extensions.vector(1536),
  p_workspace_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_memory_types TEXT[] DEFAULT NULL,
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  memory_type TEXT,
  category TEXT,
  content TEXT,
  metadata JSONB,
  importance_score FLOAT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.memory_type,
    m.category,
    m.content,
    m.metadata,
    m.importance_score,
    1 - (m.embedding <=> p_query_embedding) as similarity,
    m.created_at
  FROM public.ai_agent_memory m
  WHERE 
    (p_workspace_id IS NULL OR m.workspace_id = p_workspace_id)
    AND (p_user_id IS NULL OR m.user_id = p_user_id)
    AND (p_session_id IS NULL OR m.session_id = p_session_id)
    AND (p_memory_types IS NULL OR m.memory_type = ANY(p_memory_types))
    AND (m.expires_at IS NULL OR m.expires_at > now())
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY 
    m.importance_score DESC,
    m.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- Fonction pour récupérer la mémoire récente (sans embedding)
CREATE OR REPLACE FUNCTION public.get_recent_ai_memory(
  p_workspace_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_memory_types TEXT[] DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  memory_type TEXT,
  category TEXT,
  entity_type TEXT,
  entity_id UUID,
  content TEXT,
  metadata JSONB,
  importance_score FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.memory_type,
    m.category,
    m.entity_type,
    m.entity_id,
    m.content,
    m.metadata,
    m.importance_score,
    m.created_at
  FROM public.ai_agent_memory m
  WHERE 
    (p_workspace_id IS NULL OR m.workspace_id = p_workspace_id)
    AND (p_user_id IS NULL OR m.user_id = p_user_id)
    AND (p_session_id IS NULL OR m.session_id = p_session_id)
    AND (p_memory_types IS NULL OR m.memory_type = ANY(p_memory_types))
    AND (m.expires_at IS NULL OR m.expires_at > now())
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Nettoyage automatique des mémoires expirées
CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_memory()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_agent_memory
  WHERE expires_at IS NOT NULL AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- RLS
ALTER TABLE public.ai_agent_memory ENABLE ROW LEVEL SECURITY;

-- Politique: cockpit_admin peut tout voir
CREATE POLICY "Cockpit admins can manage all memory"
  ON public.ai_agent_memory
  FOR ALL
  USING (public.has_role(auth.uid(), 'cockpit_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'cockpit_admin'));

-- Politique: les utilisateurs peuvent voir leur propre mémoire
CREATE POLICY "Users can view own memory"
  ON public.ai_agent_memory
  FOR SELECT
  USING (user_id = auth.uid());

-- Politique: les membres workspace peuvent voir la mémoire du workspace
CREATE POLICY "Workspace members can view workspace memory"
  ON public.ai_agent_memory
  FOR SELECT
  USING (
    workspace_id IS NOT NULL 
    AND public.is_workspace_member(workspace_id, auth.uid())
  );

-- Politique: service role pour edge functions
CREATE POLICY "Service role full access"
  ON public.ai_agent_memory
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');