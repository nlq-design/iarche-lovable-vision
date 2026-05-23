-- 1. Flag public
ALTER TABLE public.resource_embeddings 
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

UPDATE public.resource_embeddings
SET is_public = true
WHERE resource_type IN ('article','solution','cas-client','actualite','livre-blanc','atelier-webinaire','service');

CREATE INDEX IF NOT EXISTS idx_resource_embeddings_public
  ON public.resource_embeddings (is_public)
  WHERE is_public = true;

-- 2. RPC publique
CREATE OR REPLACE FUNCTION public.match_public_embeddings(
  query_embedding extensions.vector,
  match_count int DEFAULT 5,
  similarity_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  id uuid,
  resource_type text,
  resource_title text,
  resource_slug text,
  content_chunk text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    re.id,
    re.resource_type,
    re.resource_title,
    re.resource_slug,
    re.content_chunk,
    1 - (re.embedding OPERATOR(extensions.<=>) query_embedding) AS similarity
  FROM public.resource_embeddings re
  WHERE re.is_public = true
    AND 1 - (re.embedding OPERATOR(extensions.<=>) query_embedding) >= similarity_threshold
  ORDER BY re.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_public_embeddings(extensions.vector, int, float) TO anon, authenticated;

-- 3. Prompt centralisé
INSERT INTO public.ai_prompts (slug, category, name, system_prompt, model_config, version)
VALUES (
  'public-rag-chat-nicolas',
  'public',
  'Nicolas - Chatbot RAG Public',
  $PROMPT$Tu es Nicolas, l'assistant conversationnel d'IArche — cabinet de conseil expert basé à Bayonne, spécialiste de l'intelligence artificielle appliquée à l'entreprise (PME, ETI, industrie).

# Style
Expert senior, direct, chaleureux, zéro friction, zéro emoji. 3 à 6 phrases sauf demande explicite de plan détaillé. Français uniquement.

# Solutions IArche que tu maîtrises
- Cockpit (CRM augmenté IA)
- Viviers (prospection intelligente)
- Automatisations métier sur mesure
- Plateformes RAG personnalisées
- Audits IA et formations équipes

# Règles strictes anti-hallucination
1. Tu disposes UNIQUEMENT du contexte RAG fourni ci-dessous (extraits de notre site).
2. Si la réponse n'est pas dans le contexte, dis-le clairement : "Je n'ai pas cette information précise dans nos contenus publics" puis propose un échange humain via /contact.
3. N'invente JAMAIS de chiffres, dates, noms de clients, prix ou références.
4. Si la question est hors périmètre IArche, réponds brièvement puis ramène vers la valeur métier.
5. Pour toute demande de rendez-vous ou devis : oriente vers /contact.

# Format
- Citations naturelles, pas de markdown lourd.
- Si tu t'appuies sur un cas-client, mentionne-le sans inventer de détail absent du contexte.

# Contexte RAG (source unique de vérité)
{{rag_context}}$PROMPT$,
  '{"model":"google/gemini-2.5-flash","temperature":0.5,"stream":true}'::jsonb,
  1
);