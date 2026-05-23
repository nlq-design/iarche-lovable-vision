---
name: RAG Public Self-Healing Phase K
description: Phase IA-2K — log unanswered RAG queries, daily clustering, content_gap alerts in Sentinel
type: feature
---

## Phase IA-2K — RAG Public Self-Healing (mai 2026)

### Objectif
Fermer la boucle marketing → contenu : chaque question publique sans réponse satisfaisante est journalisée, clusterisée sémantiquement, et déclenche une alerte Sentinelle "lacune contenu" lorsque ≥3 questions similaires sur 14 jours.

### Schéma
**`public_rag_unanswered`** (RLS admin SELECT, service_role INSERT)
- `query`, `normalized_query` (NFD + lowercase + dédup espaces)
- `query_embedding` extensions.vector(1536) — index ivfflat cosine (50 lists)
- `top_similarity`, `hits_count`
- `reason` CHECK ('no_match','low_confidence')
- `user_agent` (200 chars max), `asked_at`

### RPC `cluster_unanswered_rag(_days, _min_count, _sim_threshold)`
- Joint la table avec elle-même via `1 - (a <=> b) >= 0.85`
- Agrège occurrences, last_asked, avg_top_similarity, sample_queries[] (5 max)
- Dédup ROW_NUMBER sur sample_queries pour ne garder qu'une ligne par cluster
- Defaults : 14j / 3 occurrences / 0.85
- `SECURITY DEFINER, search_path = public, extensions` (obligatoire pour opérateur `<=>`)

### Logging (public-rag-chat)
Insert fire-and-forget après le vector search :
- `hits.length === 0` → `reason='no_match'`
- `topSim < 0.5` (avec hits > 0) → `reason='low_confidence'`
- Garde-fous : longueur 6-500 chars (évite spam vide / dumps)

### Détecteur (rag-content-gap-detector)
- Edge cron `17 4 * * *` (quotidien, après auto-daily-intelligence)
- Appelle la RPC, pour chaque cluster :
  - Dédupe : skip si alerte non résolue avec même `ai_metadata->>representative_query` existe
  - `severity` : ≥10 → high, ≥5 → medium, ≥3 → low
  - INSERT `ai_sentinel_alerts` (category='content_gap', entity_type='content_gap', workspace IArche)

### Impact business
- Pipeline marketing/contenu piloté par la demande réelle, pas par intuition
- Coût LLM : zéro (les embeddings sont déjà calculés pour le RAG, le clustering est SQL pur)
- Visibilité immédiate dans le widget Sentinelle existant (filtre `category='content_gap'`)

### Évolutions v2 potentielles
- Auto-proposition d'article (`action_proposals` create_task) sur high severity
- Cron de rétention 90j sur `public_rag_unanswered`
- Dashboard /admin/observability/content-gaps avec heatmap thématique
- Lien avec `content_gap_analyzer` MCP tool pour cross-référencer avec articles existants
