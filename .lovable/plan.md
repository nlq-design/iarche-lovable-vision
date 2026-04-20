
## Plan v3 — Tools Transcription invisibles dans Claude runtime

### Diagnostic
Handshake MCP OK (`get_leads` fonctionne). Les 4 tools transcription filtrés par ranker Anthropic — cause probable: noms quasi identiques + descriptions similaires + redondance.

### Phase 1 — Audit (read-only, 5 min)
1. Localiser les 4 handlers dans `supabase/functions/mcp-server/index.ts` : `get_transcription`, `get_transcription_detail`, `get_transcriptions`, `list_transcriptions`.
2. Extraire `name`, `description`, `inputSchema`, payload moyen.
3. Comparer avec `get_leads` (témoin OK).
4. Vérifier présence dans `_EXPOSED_TOOLS`.

### Phase 2 — Commit 1 : Refonte `list_transcriptions` + `get_transcription_detail`
**Cible :**
- `list_transcriptions(filters?, limit?, date_from?, date_to?, entity_id?)` — métadonnées légères
- `get_transcription_detail(id)` — détail complet

**Actions :**
1. Enrichir `list_transcriptions` avec filtres consolidés.
2. Descriptions distinctes orientées intent :
   - `list_transcriptions`: "Search and list voice transcriptions from CRM meetings, calls, and recordings. Returns metadata only (id, date, title, participants, linked entities). Use for browsing or filtering by date/entity."
   - `get_transcription_detail`: "Fetch full content of a single transcription including speaker-segmented text, AI synthesis, action items, and CRM links. Requires transcription UUID."
3. `inputSchema` valide JSON Schema draft-07 (`type:object`, `properties`, `required`, `additionalProperties:false`).
4. **Budget payload `list_transcriptions`** :
   - `limit` default=20, max=50
   - Exclus obligatoires : `full_text`, `segments`, `synthesis_long`, `raw_audio_url`, `embeddings`
   - Cible <15k tokens / 20 items

**Commit :** `MCP P2.1 — Refonte transcription tools + payload budget`

### Phase 2.5 — Commit 2 : Deprecation graceful (NOUVEAU)
1. **Grep usages existants** :
   - Codebase IArche (`src/`, `supabase/functions/`)
   - Recherche workflows n8n (si table `n8n_workflows` ou config externe accessible)
   - Scripts (`scripts/`, `*.sh`, `*.py`)
2. **Garder aliases 30j** : `get_transcription` et `get_transcriptions` deviennent thin wrappers :
   - Délèguent vers `list_transcriptions` ou `get_transcription_detail`
   - Log warning structuré : `console.warn('[MCP-DEPRECATED] tool=get_transcription called, migrate to list_transcriptions, removal=2026-05-20')`
   - Description préfixée `[DEPRECATED — use X]`
3. Ajout entrée `mem://cockpit/transcriptions/deprecation-30j-fr` avec date suppression cible.

**Commit :** `MCP P2.2 — Deprecation wrappers + warning logs (30j)`

### Phase 3 — Validation post-merge
1. Curl `tools/list` → vérifier présence des 4 noms (2 actifs + 2 deprecated wrappers), schemas valides.
2. Curl `list_transcriptions` avec apikey → mesurer taille réponse (`wc -c`), assert <60KB (~15k tokens).
3. Curl `get_transcription_detail` avec UUID réel.
4. **Critère succès Claude.ai** :
   - Reco connecteur côté Nick
   - Prompt test : "liste mes transcriptions du jour via Cockpit IArche"
   - **Vérification stricte logs Supabase** : `method=tools/call` + `tool_name=list_transcriptions` + namespace `Cockpit IArche` (PAS `ALMA by IArche:voice_transcribe`)
   - Query `function_edge_logs` filtrée pour confirmer

### Phase 4 — Suppression dure (commit séparé, J+30)
Conditionnée à : 0 appel sur les wrappers deprecated dans logs des 7 derniers jours.
**Commit futur :** `MCP P2.3 — Remove deprecated transcription aliases`

### Phase 5 — Si échec persiste après Commit 1+2 (commits 3-7 séparés, PR groupé)
Stop dès que résolu :
- **Commit 3** — Logging structuré JSON-line + header `X-Request-Id`
- **Commit 4** — CORS : `Mcp-Session-Id` dans `Allow-Headers` + `Expose-Headers`
- **Commit 5** — Conformité `initialize` (`protocolVersion: "2024-11-05"`, capabilities, serverInfo)
- **Commit 6** — Normalisation tous schemas tools/list (descriptions <1024 chars, draft-07)
- **Commit 7** — Vérif `StreamableHttpTransport` mcp-lite ≥0.10

Rollback granulaire garanti.

### Hors scope (tickets séparés)
- Implémenter `get_solutions`
- Migration OAuth2

### Livrables
- Rapport diff Phase 1
- Commits 1 + 2 mergés/déployés/validés
- Curl + log Supabase prouvant `tool_name=list_transcriptions` namespace Cockpit
- Commit 3 (suppression dure) planifié J+30
