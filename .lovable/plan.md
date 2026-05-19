# RAG Diagnostics — Écran de transparence des chunks injectés

## Objectif
Rendre visible côté Cockpit **ce que le LLM a réellement reçu** comme contexte CRM lors d'une réponse IA : quels chunks, de quel type, avec quel `temporal_weight`, quelle `source_date`, et combien de tokens chacun a coûté.

## Architecture

### 1. Capture — côté `context-maximizer`
Étendre `MaxContextResult` avec un champ `rag_chunks: RagChunkDebug[]` listant les chunks renvoyés par `match_entity_resources` (id, type, title, source_date, temporal_weight, chars, ~tokens). Le builder remonte déjà ces données via le fetcher 4.5 — il suffit de les agréger au lieu de les fondre dans le markdown uniquement.

### 2. Persistance — table `ai_context_traces` (nouvelle)
Une trace par appel copilot, courte rétention (TTL 7 jours via cron).

```text
ai_context_traces
├─ id uuid pk
├─ workspace_id uuid
├─ user_id uuid
├─ mode text              (morning-brief, next-step, meeting-prep…)
├─ entity_type text
├─ entity_id uuid
├─ estimated_tokens int
├─ breakdown jsonb       (Record<section, tokens>)
├─ rag_chunks jsonb      (array d'items diagnostiques)
├─ warnings text[]
├─ created_at timestamptz default now()
```
RLS : `workspace_id` member only. Service role insert depuis l'edge function.

### 3. Edge — `cockpit-ai-copilot`
Après `buildMaxContext`, insère une ligne `ai_context_traces` avant l'appel LLM. Retourne `trace_id` dans la réponse pour permettre au front d'ouvrir le diagnostic.

### 4. UI — `<RagDiagnosticsDrawer />`
- Bouton discret (icône `ScanSearch`) à côté des sorties IA : MorningBrief, NextStep, MeetingPrep, HealthCheck.
- Drawer côté droit, design Night Blue / Blanc Cassé, Manrope.
- 3 sections :
  - **Budget** : barre de tokens (vert/orange/rouge selon mémoire `Token Transparency`), warnings éventuels.
  - **Sections injectées** : tableau `name | tokens | %`.
  - **Chunks RAG (priority 4.5)** : tableau triable
    `Type` (badge couleur) · `Titre` · `Source` (date FR) · `Poids` (badge 1.0/0.6/0.3) · `Tokens`.
- Utilise `LoadingState` / `EmptyState` standards.

### 5. Hook — `useRagTrace(traceId)`
React Query sur `ai_context_traces` filtré par id, scoped workspace.

## Périmètre fichiers
- `supabase/migrations/<ts>_ai_context_traces.sql` (table + RLS + cron purge 7j)
- `supabase/functions/_shared/context-maximizer.ts` (ajout `rag_chunks` dans le retour)
- `supabase/functions/cockpit-ai-copilot/index.ts` (insertion trace + retour `trace_id`)
- `src/hooks/cockpit/useRagTrace.ts` (nouveau)
- `src/components/cockpit/ai/RagDiagnosticsDrawer.tsx` (nouveau)
- Branchement dans les composants qui consomment `useCockpitAICopilot` (MorningBrief, NextStep, MeetingPrep) — petit bouton ouvrant le drawer.

## Hors périmètre
- Pas de modification du modèle LLM, du retrieval ou du prompt.
- Pas d'export PDF / CSV de la trace (à voir si besoin émerge).
- Pas de UI pour parcourir l'historique complet des traces — uniquement la dernière par réponse affichée (l'historique reste en BDD pour audit).

## Coût
Nul côté IA (aucune ré-inférence). +1 INSERT par appel copilot, +1 SELECT par ouverture du drawer.
