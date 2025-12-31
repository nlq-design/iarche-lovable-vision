-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create resource_embeddings table for RAG
CREATE TABLE public.resource_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('article', 'actualite', 'livre-blanc', 'atelier-webinaire', 'solution', 'service')),
  resource_title TEXT NOT NULL,
  resource_slug TEXT NOT NULL,
  content_chunk TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  embedding extensions.vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(resource_id, chunk_index)
);

-- Create index for similarity search
CREATE INDEX idx_resource_embeddings_vector ON public.resource_embeddings 
USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

-- Create index for filtering by resource_type
CREATE INDEX idx_resource_embeddings_type ON public.resource_embeddings (resource_type);

-- Create index for resource_id lookups
CREATE INDEX idx_resource_embeddings_resource ON public.resource_embeddings (resource_id);

-- Enable RLS
ALTER TABLE public.resource_embeddings ENABLE ROW LEVEL SECURITY;

-- Admins can manage all embeddings
CREATE POLICY "Admins can manage embeddings"
ON public.resource_embeddings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Cockpit users can read embeddings for RAG search
CREATE POLICY "Cockpit users can read embeddings"
ON public.resource_embeddings
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'cockpit_user'::public.app_role) OR 
  public.has_role(auth.uid(), 'cockpit_admin'::public.app_role)
);

-- Service role can manage embeddings (for edge functions)
CREATE POLICY "Service role manages embeddings"
ON public.resource_embeddings
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function for semantic search
CREATE OR REPLACE FUNCTION public.search_similar_resources(
  query_embedding extensions.vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  resource_id UUID,
  resource_type TEXT,
  resource_title TEXT,
  resource_slug TEXT,
  content_chunk TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    re.resource_id,
    re.resource_type,
    re.resource_title,
    re.resource_slug,
    re.content_chunk,
    1 - (re.embedding <=> query_embedding) as similarity,
    re.metadata
  FROM public.resource_embeddings re
  WHERE 
    (filter_types IS NULL OR re.resource_type = ANY(filter_types))
    AND 1 - (re.embedding <=> query_embedding) > match_threshold
  ORDER BY re.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add vectorization_status to track indexation
CREATE TABLE public.vectorization_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL,
  total_resources INTEGER NOT NULL DEFAULT 0,
  indexed_resources INTEGER NOT NULL DEFAULT 0,
  last_indexed_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(resource_type)
);

ALTER TABLE public.vectorization_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vectorization status"
ON public.vectorization_status
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role manages vectorization status"
ON public.vectorization_status
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert initial status rows
INSERT INTO public.vectorization_status (resource_type, total_resources, indexed_resources)
VALUES 
  ('article', 0, 0),
  ('actualite', 0, 0),
  ('livre-blanc', 0, 0),
  ('atelier-webinaire', 0, 0),
  ('solution', 0, 0),
  ('service', 0, 0)
ON CONFLICT (resource_type) DO NOTHING;

-- Trigger to update updated_at
CREATE TRIGGER set_updated_at_resource_embeddings
BEFORE UPDATE ON public.resource_embeddings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_vectorization_status
BEFORE UPDATE ON public.vectorization_status
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();