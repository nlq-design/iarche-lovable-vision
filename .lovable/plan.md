## Phase IA-0 — Fondations RAG public + gouvernance prompt

### Objectif
Transformer `public-rag-chat` (proxy aveugle) en vrai RAG vectoriel, et migrer son prompt vers la table `ai_prompts` (gouvernance centralisée).

### Livrables

**1. Migration BDD** (`supabase--migration`)
- `ALTER TABLE resource_embeddings ADD COLUMN is_public boolean NOT NULL DEFAULT false`
- Index partiel : `CREATE INDEX idx_resource_embeddings_public ON resource_embeddings (is_public) WHERE is_public = true`
- Backfill : `UPDATE resource_embeddings SET is_public = true WHERE source_type IN ('article','solution','page_section')` (à confirmer selon source_types réels — query d'audit avant)
- RPC `match_public_embeddings(query_embedding vector, match_count int, similarity_threshold float)` : SECURITY DEFINER, filtre `is_public = true`, retourne `content, metadata, similarity`
- Insert dans `ai_prompts` : slug `public-rag-chat-nicolas`, category `public`, version 1, system_prompt avec persona Nicolas + règles anti-hallucination + format réponse + fallback `/contact`

**2. Refactor edge function `public-rag-chat`**
- Charger prompt via `loadPrompt('public-rag-chat-nicolas')` (DB > fallback hardcodé pour résilience)
- Embed query utilisateur via `/v1/embeddings` (model `google/gemini-embedding-001`, 1536 dims pour matcher l'existant)
- Appel RPC `match_public_embeddings` (top 5, seuil 0.7)
- Si aucun match : retour direct message Nicolas + CTA `/contact` (zero LLM call → économie tokens)
- Si matches : injection contexte dans prompt système, streaming SSE classique vers Lovable AI Gateway
- Conserver model `google/gemini-2.5-flash` (équilibre coût/qualité pour FAQ publique)

**3. Garde-fous**
- Rate limit déjà présent côté gateway → relayer 402/429 vers UI
- Log dans `ai_request_logs` : query, n_chunks_retrieved, fallback_used, tokens (pour monitoring coût)
- Aucune RLS écriture nécessaire (lecture publique sur is_public=true uniquement)

**4. Dead code**
- Supprimer prompt hardcodé inline dans index.ts (remplacé par DB)
- Pas d'autre code mort identifié dans cette fn (84 LOC, déjà minimal)

### Post-audit
- Test via `supabase--curl_edge_functions` : 1 query qui matche (ex: "Qu'est-ce que IArche?") + 1 query hors-périmètre (ex: "Comment cuisiner des pâtes?")
- Vérifier logs edge fn + entrée dans `ai_request_logs`
- Confirmer 0 régression UI sur ChatbotRagWidget (frontend inchangé)

### Hors périmètre IA-0 (réservé IA-1+)
- Multi-prompts contextuels dynamiques (IA-1)
- Cache sémantique sur public-rag-chat (IA-2)
- Refacto orchestrateur monolithique (IA-3)

### Risques
- Si aucune `source_type` réelle n'est "publique" → backfill vide → chatbot répond toujours fallback. Mitigation : query d'audit avant migration pour valider les source_types existants.
- Dimension embeddings : `resource_embeddings` est en 1536 (à confirmer), donc on force `dimensions: 1536` dans la requête `/v1/embeddings` pour éviter mismatch.

### Temps estimé
- Audit source_types + dim embeddings : 5 min
- Migration BDD : 10 min
- Refactor edge fn : 20 min
- Tests + post-audit : 15 min
- **Total : ~50 min**