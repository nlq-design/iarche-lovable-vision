-- Phase IA-2K — RAG Public Self-Healing
-- Journal des questions publiques sans réponse + clustering sémantique

CREATE TABLE IF NOT EXISTS public.public_rag_unanswered (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  query_embedding extensions.vector(1536),
  top_similarity NUMERIC(4,3),
  hits_count INT DEFAULT 0,
  reason TEXT NOT NULL CHECK (reason IN ('no_match','low_confidence')),
  user_agent TEXT,
  asked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.public_rag_unanswered ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_rag_unanswered_admin_select ON public.public_rag_unanswered;
CREATE POLICY public_rag_unanswered_admin_select
  ON public.public_rag_unanswered FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS public_rag_unanswered_service_insert ON public.public_rag_unanswered;
CREATE POLICY public_rag_unanswered_service_insert
  ON public.public_rag_unanswered FOR INSERT TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_rag_unanswered_asked_at
  ON public.public_rag_unanswered (asked_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_unanswered_norm
  ON public.public_rag_unanswered (normalized_query);

CREATE INDEX IF NOT EXISTS idx_rag_unanswered_embedding_ann
  ON public.public_rag_unanswered
  USING ivfflat (query_embedding extensions.vector_cosine_ops)
  WITH (lists = 50);

-- Clustering sémantique : regroupe les questions similaires sur une fenêtre
CREATE OR REPLACE FUNCTION public.cluster_unanswered_rag(
  _days INT DEFAULT 14,
  _min_count INT DEFAULT 3,
  _sim_threshold NUMERIC DEFAULT 0.85
)
RETURNS TABLE (
  cluster_anchor_id UUID,
  representative_query TEXT,
  occurrences INT,
  last_asked TIMESTAMPTZ,
  avg_top_similarity NUMERIC,
  sample_queries TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  WITH recent AS (
    SELECT id, query, query_embedding, top_similarity, asked_at
      FROM public.public_rag_unanswered
     WHERE asked_at >= now() - (_days || ' days')::interval
       AND query_embedding IS NOT NULL
  ),
  -- Pour chaque question, on agrège les voisins sémantiques
  clusters AS (
    SELECT
      r1.id AS anchor_id,
      r1.query AS anchor_query,
      COUNT(*)::INT AS occurrences,
      MAX(r2.asked_at) AS last_asked,
      AVG(COALESCE(r2.top_similarity, 0))::NUMERIC AS avg_top_similarity,
      (ARRAY_AGG(DISTINCT r2.query ORDER BY r2.query))[1:5] AS sample_queries
    FROM recent r1
    JOIN recent r2
      ON 1 - (r1.query_embedding <=> r2.query_embedding) >= _sim_threshold
    GROUP BY r1.id, r1.query
  ),
  -- On garde uniquement l'ancre la plus représentative par groupe
  dedup AS (
    SELECT *,
           ROW_NUMBER() OVER (
             PARTITION BY sample_queries
             ORDER BY occurrences DESC, anchor_id
           ) AS rn
    FROM clusters
    WHERE occurrences >= _min_count
  )
  SELECT anchor_id, anchor_query, occurrences, last_asked, avg_top_similarity, sample_queries
    FROM dedup
   WHERE rn = 1
   ORDER BY occurrences DESC, last_asked DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cluster_unanswered_rag(INT, INT, NUMERIC) TO authenticated;