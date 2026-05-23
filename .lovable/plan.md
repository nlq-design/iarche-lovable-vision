# Phase IA-1 — Multi-Prompt Router contextuel

## Objectif
Remplacer le prompt monolithique de `cockpit-ai-copilot` par un **router d'intent** qui sélectionne dynamiquement un prompt spécialisé selon la nature de la requête utilisateur. Gain attendu : réponses plus précises, tokens réduits (~30-40%), maintenabilité accrue.

## Architecture cible

```text
User message
   │
   ▼
[1] Intent Classifier (Gemini Flash Lite, ~50 tokens)
   │   → returns: { intent: "crm_query" | "task_action" | "synthesis" | "interview" | "general" }
   ▼
[2] Prompt Router (lookup ai_prompts par slug)
   │   → charge le prompt spécialisé + injecte contexte ciblé
   ▼
[3] LLM Call (Gemini Flash / Pro selon intent)
   │   → cache sémantique M6 en amont (déjà en place)
   ▼
Response
```

## Les 5 prompts spécialisés (table `ai_prompts`)

| Slug | Intent | Modèle | Contexte injecté |
|---|---|---|---|
| `copilot-router-classifier` | — (classifier) | gemini-2.5-flash-lite | message brut seul |
| `copilot-crm-query` | Recherche entité / question factuelle | gemini-2.5-flash | CRM entities + completeness |
| `copilot-task-action` | Créer tâche / note / action | gemini-2.5-flash | Pipeline + opportunités actives |
| `copilot-synthesis` | Synthèse multi-source | gemini-2.5-pro | Notes + transcriptions + deltas temporels |
| `copilot-interview` | Mode interview proactif | gemini-2.5-flash | Champs CRM manquants (completeness < 70%) |
| `copilot-general` | Fallback conversationnel | gemini-2.5-flash | Owner context minimal |

## Plan d'implémentation

### Étape 1 — Seed des prompts (migration SQL)
- INSERT des 6 entrées dans `ai_prompts` (5 spécialisés + 1 classifier)
- Chaque prompt suit la Charte Nicolas (Bayonne, Zero Friction, owner_context)
- Variables d'injection respectent le contrat `{{crm_context}}`, `{{temporal_deltas}}`, etc.

### Étape 2 — Module router (edge function)
- Nouveau fichier : `supabase/functions/cockpit-ai-copilot/router.ts`
  - `classifyIntent(message)` → appel Gemini Flash Lite, parse JSON strict
  - `loadPromptBySlug(slug)` → fetch depuis `ai_prompts` (avec cache 5min in-memory)
  - `buildContextForIntent(intent, userId, workspaceId)` → injection ciblée
- Branchement dans `cockpit-ai-copilot/index.ts` : remplace l'appel direct par `router.dispatch()`
- Conservation du cache sémantique M6 **en amont** du classifier (fingerprint sur message brut)

### Étape 3 — Observabilité
- Ajout colonne `intent_detected` dans `ai_metrics` (TEXT nullable)
- Trace dans `RagDiagnosticsDrawer` : badge "Intent: crm_query" + modèle effectif
- Métrique `voice_usage_daily` étendue : breakdown par intent

### Étape 4 — Tests & validation
- 10 requêtes types couvrant chaque intent → vérifier classification correcte
- Mesure tokens avant/après sur cas réels (objectif -30%)
- Pas de régression sur cache hit rate (M6)

## Garde-fous

- **Classifier failure** → fallback automatique sur `copilot-general` (jamais d'erreur 500 user-facing)
- **Slug introuvable** dans `ai_prompts` → fallback `copilot-general` + log warning
- **Multi-tenant** : tous les contextes injectés respectent `workspace_id` (RLS déjà durcie phase #2)
- **Cache M6** : clé inclut `intent` pour éviter collisions entre prompts spécialisés

## Détails techniques

- **Edge function** : npm: imports, verify_jwt = true (déjà le défaut)
- **Cascade providers** : Lovable AI Gateway > OpenAI > Anthropic (déjà en place via Retry Manager)
- **Mémoire** : nouvelle entrée `mem://cockpit/intelligence/multi-prompt-router-v1` après build

## Livrables

1. 1 migration SQL (seed 6 prompts + colonne `intent_detected`)
2. `router.ts` (~150 lignes)
3. Patch `cockpit-ai-copilot/index.ts` (~20 lignes modifiées)
4. Patch `RagDiagnosticsDrawer.tsx` (affichage intent)
5. Mémoire projet mise à jour

## Estimation
45-60 min build + 10 min tests = **~70 min** total.
