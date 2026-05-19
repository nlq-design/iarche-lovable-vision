# CDC v2 — Brancher la richesse CRM au système IA

Audit chirurgical des colonnes sémantiquement riches mais invisibles du RAG, et plan d'ingestion priorisé. Remplace le Sprint 1 du CDC v1 (Router/Cache) qui optimisait une voiture sans essence.

---

## 1. Audit chiffré — Ce que l'IA ne voit pas aujourd'hui

Mesure réelle du remplissage des colonnes textuelles riches (BDD au 19/05/2026) :

| Source | Remplies / Total | Taille moy. | Volume total | Dans RAG ? |
|---|---|---|---|---|
| `voice_transcriptions.raw_transcript` | **135 / 135** | 41 KB | **~5,5 MB** | NON |
| `voice_transcriptions.ai_documents_summary` | 124 / 135 | 13 KB | ~1,7 MB | NON |
| `leads.ai_documents_summary` | **48 / 48** | 19 KB | ~940 KB | NON (les "lead embeddings" actuels = viviers, pas CRM commercial) |
| `activity_log.content` | **4 041 / 4 277** | 93 chars | ~375 KB | NON |
| `ai_agent_memory.content` | 683 / 683 | 134 chars | ~90 KB | À vérifier (existe mais isolé) |
| `opportunities.description` | 43 / 53 | 82 chars | ~3,5 KB | NON |
| `entity_context_notes.content` | 12 / 12 | 1 KB | ~12 KB | NON |
| `project_notes.content` | 1 / 1 | 14 KB | ~14 KB | NON |
| `uploaded_files.extracted_content` | 2 / 5 | 33 KB | ~67 KB | NON (et 3 fichiers jamais extraits) |
| `ai_cross_signals.narrative` | 6 / 6 | 219 chars | ~1 KB | NON |
| `generated_documents.ai_documents_summary` | 1 / 24 | 2,5 KB | ~2,5 KB | NON (et 23 docs sans synthèse) |
| `meeting_notes.ai_summary` | 0 / 1 | — | — | Pipeline cassé |
| `specifications.content` | 0 / 0 | — | — | Table vide |

**Synthèse** : ~8 MB de matière commerciale exploitable, dont **les transcriptions brutes** (5,5 MB) sont la mine d'or absolue — chaque réunion contient des objections, des deltas BANT, des engagements concrets que l'IA pourrait citer mot pour mot.

---

## 2. Diagnostic par catégorie

### A. Or massif non exploité (P0 absolu)
- **Transcriptions brutes** : 135 fichiers, 41 KB en moyenne, jamais découpés en chunks ni embeddés. Quand on demande à l'IA "qu'a dit X sur le sujet Y il y a 2 mois", elle ne peut pas répondre.
- **Synthèses Nicolas par lead** (`leads.ai_documents_summary`, 48/48) : profils riches générés mais inaccessibles au RAG.

### B. Mémoire conversationnelle ignorée (P0)
- **Activity log** : 4 041 entrées signal-faible-volume-fort. Agrégées par entité elles racontent l'histoire complète d'une relation (mail envoyé, lead consulté, doc partagé, etc.). Aujourd'hui invisibles.

### C. Pipelines cassés ou sous-utilisés (P1)
- `meeting_notes.ai_summary` : 0/1 — le résumeur ne tourne pas / n'a jamais tourné.
- `uploaded_files` : 3/5 fichiers sans extraction, 3/5 sans summary IA.
- `generated_documents.ai_documents_summary` : 1/24 — 23 documents générés non synthétisés.

### D. Tables fantômes (P3)
- `specifications.content` : 0 ligne. Mémoire dit "MCP fix" mais aucune donnée → fonctionnalité inerte.

---

## 3. Cahier des charges — 3 modules ciblés

### M13 — Ingestion CRM universelle dans `resource_embeddings`

Étendre `resource_embeddings` (déjà existant, déjà HNSW) avec de nouveaux `resource_type` :
- `transcription_chunk` (chunking par segments de ~1500 chars avec overlap 200, speaker préservé en metadata)
- `transcription_summary` (synthèse Nicolas en 1 chunk)
- `lead_summary` (CRM commercial réel, distinct des leads viviers)
- `opportunity` (title + description + ai_metadata.narrative concaténés)
- `activity_log_agg` (rollup hebdomadaire par entité, 1 chunk = 7j d'interactions sur 1 lead)
- `entity_note` (entity_context_notes + project_notes)
- `uploaded_file_chunk` (extracted_content chunké)
- `agent_memory` (ai_agent_memory.content)

Colonnes à ajouter sur `resource_embeddings` :
- `entity_links jsonb` — multi-rattachement (lead/projet/opp/partner) pour qu'un chunk de transcription remonte sur toutes les fiches concernées
- `temporal_weight numeric` — decay calculé (1.0 → 0.3 sur 90j) recalculé en cron nocturne
- `speaker text` — nullable, utile pour les chunks de transcription
- `source_date timestamptz` — date sémantique (≠ created_at de la ligne embedding)

### M14 — Edge function `crm-rag-indexer` + triggers

Une seule edge function réutilisable, dispatcher par `resource_type`. Triggers pg_net :
- `voice_transcriptions` AFTER UPDATE OF `raw_transcript`, `ai_documents_summary`
- `leads` AFTER UPDATE OF `ai_documents_summary`
- `opportunities` AFTER INSERT/UPDATE OF `description`, `ai_metadata`
- `entity_context_notes`, `project_notes` AFTER INSERT/UPDATE OF `content`
- `uploaded_files` AFTER UPDATE OF `extracted_content`
- Cron nocturne pour `activity_log_agg` (rollup) et recalcul `temporal_weight`

Backfill one-shot : indexer les 135 transcriptions + 48 leads + 53 opps + 4 041 activity_logs existants. Budget tokens estimé : ~3 M tokens (embeddings only, ~0,40 € avec `gemini-embedding-001`).

### M15 — Étendre `match_resources` + Context Maximizer

- Étendre la RPC `match_resources` (déjà utilisée) pour pondérer `score = cosine_similarity × temporal_weight` et filtrer par `entity_links` quand on consulte une fiche.
- Mettre à jour Context Maximizer (mémoire existante) : lorsqu'on ouvre un lead/opp, injecter automatiquement dans le prompt les **5 chunks de transcription les plus pertinents + 10 dernières lignes activity_log agrégées + dernière synthèse Nicolas**.
- Repair des pipelines cassés : edge cron `repair-stale-summaries` pour combler `meeting_notes.ai_summary`, `uploaded_files.ai_summary`, `generated_documents.ai_documents_summary` manquants.

---

## 4. Détails techniques

### Schéma M13 (migration)
```sql
ALTER TABLE resource_embeddings
  ADD COLUMN IF NOT EXISTS entity_links jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS temporal_weight numeric(4,3) DEFAULT 1.000,
  ADD COLUMN IF NOT EXISTS speaker text,
  ADD COLUMN IF NOT EXISTS source_date timestamptz,
  ADD COLUMN IF NOT EXISTS chunk_index int,
  ADD COLUMN IF NOT EXISTS parent_resource_id uuid;

CREATE INDEX IF NOT EXISTS idx_resource_embeddings_entity_links
  ON resource_embeddings USING GIN (entity_links);
CREATE INDEX IF NOT EXISTS idx_resource_embeddings_source_date
  ON resource_embeddings (source_date DESC);
```

### Chunking transcriptions
Privilégier les segments AssemblyAI déjà stockés dans `voice_transcriptions.segments` (jsonb) — chunk par fenêtre glissante de 8-12 segments contigus du même speaker (≈ 1 500 chars), overlap 2 segments. Metadata : `{transcription_id, speaker, start_ms, end_ms, lead_id, project_id}`.

### Activity log agg
RPC `rollup_activity_log_weekly(workspace_id, week)` → pour chaque (entité_id, semaine) génère 1 chunk : `"Semaine du {date} pour {entité} : 3 emails envoyés, 2 docs consultés, statut passé de X à Y, 1 réunion (45 min)..."`. Évite l'inflation embeddings (4 277 lignes → ~150 chunks/mois).

### Budget & coût récurrent
- Backfill : ~3 M tokens × 0,13 €/M = **0,40 €** (gemini-embedding-001).
- Run continu : ~500K tokens/mois estimés = **0,07 €/mois**.
- Stockage pgvector 3072d : ~10 MB pour le backfill complet — négligeable.

### Sécurité RLS
`resource_embeddings` a déjà RLS par workspace. Le nouveau champ `entity_links` doit être filtré côté RPC `match_resources` pour ne pas exposer un chunk transcription d'un autre workspace via fuite d'entity_id.

---

## 5. Découpage en sprints

**Sprint 1 (semaine 1) — M13 schéma + M14 backfill transcriptions**
- Migration colonnes `resource_embeddings`
- Edge `crm-rag-indexer` skeleton + handler `transcription_chunk` + `transcription_summary`
- Backfill one-shot 135 transcriptions (preuve de valeur immédiate)
- Trigger pg_net sur `voice_transcriptions`

**Sprint 2 (semaine 2) — Leads, opps, notes**
- Handlers `lead_summary`, `opportunity`, `entity_note`
- Backfill 48 leads + 53 opps + 13 notes
- Triggers correspondants

**Sprint 3 (semaine 3) — Activity log agg + Context Maximizer**
- RPC rollup_activity_log_weekly + cron nocturne
- Étendre `match_resources` (temporal_weight + entity_links filter)
- Mise à jour Context Maximizer dans `cockpit-ai-copilot` pour injecter les chunks CRM par défaut

**Sprint 4 (semaine 4) — Repair pipelines cassés**
- Edge cron `repair-stale-summaries`
- Re-traitement uploaded_files non extraits, meeting_notes sans summary, generated_documents sans synthèse
- Mesure KPI : nb de réponses IA qui citent une transcription / activity_log (objectif > 30 %)

---

## 6. KPIs de validation

- **Coverage RAG CRM** : % de leads/opps/transcriptions ayant ≥ 1 embedding actif → cible **> 95 %** à fin Sprint 2.
- **Citation rate** : % de réponses cockpit-ai-copilot citant explicitement une source CRM (transcription / activity_log / note) → cible **> 30 %** à fin Sprint 3 (vs ~0 % aujourd'hui).
- **Recall@5 sur questions CRM** : sur un golden-set de 30 questions "qu'a dit X / où en est Y / quel est le contexte de Z", au moins 4/5 résultats pertinents → cible **0,80**.
- **Cost guard** : embedding budget ≤ **0,20 €/mois** stable après backfill.

---

## 7. Ce qui reste du CDC v1 (déprorisé, non abandonné)

Les modules M1 (Router), M2 (Hybrid search BM25+vector), M6 (Semantic cache), M8 (Tracing), M10 (Knowledge bus), M11 (Context caching), M12 (Démonolithisation) restent pertinents mais **passent en Phase 2** (mois 2-3). Logique : on alimente d'abord le moteur, on l'optimise ensuite. Le hybrid search devient bien plus pertinent une fois que les transcriptions sont indexées.

---

**Prochaine étape proposée** : si tu valides ce CDC v2, je démarre Sprint 1 (migration + edge `crm-rag-indexer` + backfill transcriptions). Premier résultat visible : tu pourras demander à Nicolas "ressors-moi ce qu'a dit [client] sur [sujet] en mars" et il citera la phrase exacte.
