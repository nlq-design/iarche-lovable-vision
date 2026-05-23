# Phase IA-1 (révisé) — Router d'intent sur `ai-agent-orchestrator`

## Cible confirmée par audit

- **Fichier** : `supabase/functions/ai-agent-orchestrator/index.ts` (9 687 lignes)
- **Prompt monolithique** : `master-agent` = **27 368 caractères** (~6 800 tokens système chargés à CHAQUE appel)
- **Consommateurs** : Chat Cockpit, Telegram, API directe — toutes intents confondues
- **Contenu actuel** : identité + règles d'exécution + mapping tâche→prompt (130+ outils) + style réponse + hiérarchie + canaux

## Constat

Chaque message utilisateur (même trivial type "qui est ce lead ?") consomme les 6,8K tokens du prompt complet, alors que **<20% du contenu est pertinent** pour une intent donnée.

## Architecture cible — modulaire, pas révolutionnaire

```text
User message
   │
   ▼
[1] Intent Classifier (Gemini Flash Lite, ~100 tokens, cache 60s)
   │   → { intent: "crm_query" | "doc_generation" | "vivier" | "analysis" | "general" }
   ▼
[2] Prompt Composer
   │   = master-agent-core (slim ~8K)  +  module_{intent} (~2-4K)
   ▼
[3] Appel LLM existant (ai-agent-orchestrator inchangé en aval)
```

## Décomposition du prompt `master-agent` (27K → 8K core + 5 modules)

| Nouveau slug | Contenu extrait | Taille cible | Chargé quand |
|---|---|---|---|
| `master-agent-core` | Identité, règles exécution, session memory, recherche avant création | ~8K | TOUJOURS |
| `master-agent-module-crm` | Mapping CRUD leads/partners/contacts + scoring + matching | ~3K | intent=crm_query, general |
| `master-agent-module-docs` | Mapping génération devis/CDC/proposition + emails | ~3K | intent=doc_generation |
| `master-agent-module-analysis` | Synthèses 360°, transcriptions, OCR, copilot | ~4K | intent=analysis |
| `master-agent-module-vivier` | Prospection B2B + campagnes | ~2K | intent=vivier |
| `master-agent-module-general` | Tools-reference condensé fallback | ~2K | intent=general |

**Économie attendue** : 6800 tokens → ~2800 tokens en moyenne = **-58% tokens système**.

## Plan d'implémentation

### Étape 1 — Migration SQL (seed des 6 nouveaux prompts)
- INSERT `master-agent-core` + 5 modules dans `ai_prompts` (category="agent")
- Découpage manuel propre depuis `master-agent` actuel (préserver intégralement les règles)
- `master-agent` ANCIEN conservé en fallback (versionné v9, jamais supprimé tant que router non validé)

### Étape 2 — Module router (nouveau fichier partagé)
- `supabase/functions/_shared/intent-router.ts`
  - `classifyIntent(message, history)` → Lovable AI Gateway / gemini-2.5-flash-lite, JSON strict, fallback `general` sur erreur
  - `composeSystemPrompt(intent, supabase)` → `loadPrompt('master-agent-core') + loadPrompt('master-agent-module-' + intent)`
  - Cache fingerprint message → intent (60s, in-memory) pour éviter re-classification

### Étape 3 — Branchement dans `ai-agent-orchestrator/index.ts`
- Ligne 9112 : remplacer `getSystemPrompt(supabase)` (qui charge master-agent unique) par `composeSystemPromptForRequest(supabase, message)`
- Toutes les autres fonctions (tools, governor, ui-navigation) restent inchangées
- ~15 lignes modifiées

### Étape 4 — Observabilité
- Ajout colonne `intent_classified` (TEXT) + `prompt_modules_loaded` (TEXT[]) dans `ai_usage_metrics`
- Log chaque dispatch dans `console.log` JSON structuré (déjà standard)
- Pas de nouveau dashboard cette itération — métriques exploitables via `/admin/observability/ai`

### Étape 5 — Validation
- 8 requêtes types couvrant chaque intent → vérifier classification correcte
- Comparaison tokens master-agent vs router sur 10 cas réels (objectif -50%)
- Fallback testé : si classifier crash → load `master-agent` complet (continuité garantie)

## Garde-fous

- **Classifier failure** → fallback automatique sur `master-agent` original. Aucune régression user-facing possible.
- **Slug module manquant** → load `master-agent-module-general` + log warning
- **Cache classifier** : clé = hash(message + dernier message assistant) — TTL 60s
- **Telegram & Chat Cockpit** : transparents, aucune modif frontend

## Détails techniques

- **Edge function** : `npm:` specifiers, `verify_jwt = true` (déjà en place)
- **Cache prompts** : réutilise le cache 5min de `prompt-loader.ts` existant
- **Multi-tenant** : aucun impact (prompts sont workspace-NULL = globaux)
- **Cascade providers** : héritée du Retry Manager existant

## Livrables

1. 1 migration SQL = INSERT 6 prompts + 2 colonnes `ai_usage_metrics`
2. `supabase/functions/_shared/intent-router.ts` (~120 lignes)
3. Patch `ai-agent-orchestrator/index.ts` (~15 lignes)
4. Mémoire `mem://cockpit/intelligence/multi-prompt-router-v1`

## Estimation

- Découpage propre du prompt master-agent (étape la plus délicate) : 25 min
- Code router + branchement : 15 min
- Migration + validation : 15 min
- **Total : ~55 min**

## ROI

- **-58% tokens système moyens** sur tous canaux chat (Cockpit + Telegram + API)
- À volume actuel : économie tangible immédiate sur quota Lovable AI Gateway
- Maintenabilité : modules éditables indépendamment via `/admin/ai-prompts` (déjà en place)
- Réversibilité totale : un feature flag DB peut basculer router ON/OFF en 1 seconde
