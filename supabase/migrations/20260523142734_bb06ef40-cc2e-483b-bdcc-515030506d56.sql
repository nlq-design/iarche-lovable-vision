-- Phase C — Router Sémantique v2 : ancres d'intent vectorielles
CREATE TABLE IF NOT EXISTS public.ai_intent_anchors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent text NOT NULL CHECK (intent IN ('crm_query','doc_generation','analysis','vivier','general')),
  text text NOT NULL,
  embedding extensions.vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intent, text)
);

CREATE INDEX IF NOT EXISTS ai_intent_anchors_embedding_idx
  ON public.ai_intent_anchors
  USING hnsw (embedding extensions.vector_cosine_ops);

ALTER TABLE public.ai_intent_anchors ENABLE ROW LEVEL SECURITY;

-- Lecture admin uniquement (curation), aucune écriture client
CREATE POLICY "ai_intent_anchors_admin_select"
  ON public.ai_intent_anchors FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RPC : retourne l'intent le plus proche
CREATE OR REPLACE FUNCTION public.match_intent_anchor(
  query_embedding_text text,
  similarity_threshold double precision DEFAULT 0.75
)
RETURNS TABLE(intent text, similarity double precision, anchor_text text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  qv extensions.vector;
BEGIN
  qv := query_embedding_text::extensions.vector;
  RETURN QUERY
  SELECT
    a.intent,
    (1 - (a.embedding OPERATOR(extensions.<=>) qv))::float AS similarity,
    a.text AS anchor_text
  FROM public.ai_intent_anchors a
  WHERE a.embedding IS NOT NULL
    AND (1 - (a.embedding OPERATOR(extensions.<=>) qv)) >= similarity_threshold
  ORDER BY a.embedding OPERATOR(extensions.<=>) qv
  LIMIT 1;
END;
$$;