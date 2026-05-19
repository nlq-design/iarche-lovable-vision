---
name: CRM-as-RAG ingestion v1
description: Indexation auto des transcriptions, leads, opportunities dans resource_embeddings via crm-rag-indexer + triggers pg_net
type: feature
---

# CRM-as-RAG v1 (Sprints 1+2 du CDC v2)

## État au 19/05/2026
- **135/135** voice_transcriptions indexées → 4 366 chunks + 124 summaries
- **45/48** leads indexés (3 sans workspace_id) → 388 chunks
- **53/53** opportunities indexées → 53 chunks
- Embedding model : `openai/text-embedding-3-small` (1536d) via Lovable AI Gateway
- Coût backfill total : ~0,20 €

## Architecture
- Edge fn `crm-rag-indexer` (verify_jwt=false, par défaut) — dispatcher par `resource_type`
- Modes : `task=index` (id ciblé) ou `task=backfill` (limit + workspace_id optionnels)
- Idempotent : DELETE puis UPSERT par `(resource_id, chunk_index)` ; pagination 1000 lignes pour exclusion backfill
- Colonnes étendues `resource_embeddings` : `entity_links jsonb`, `temporal_weight numeric`, `speaker`, `source_date`, `chunk_index`, `parent_resource_id`

## Triggers pg_net (auto-réindex)
Fonction `public.trigger_crm_rag_index(resource_type)` SECURITY DEFINER appelée par :
- `trg_rag_voice_transcriptions` AFTER INSERT/UPDATE OF raw_transcript, ai_documents_summary
- `trg_rag_leads` AFTER INSERT/UPDATE OF ai_documents_summary, message, source_context, name, company, position, industry, status
- `trg_rag_opportunities` AFTER INSERT/UPDATE OF title, description, ai_metadata, stage, value_amount, probability

## Resource types supportés
`transcription_chunk`, `transcription_summary`, `lead_summary`, `opportunity`

## À faire (Sprint 3)
- `activity_log_agg` (rollup hebdo via RPC + cron)
- `entity_note` (entity_context_notes + project_notes)
- Étendre `match_resources` : `score × temporal_weight` + filtre `entity_links`
- Brancher Context Maximizer (`cockpit-ai-copilot`) pour injecter 5 chunks + 10 activity_log + last summary quand on consulte une fiche
