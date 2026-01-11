# CDC Amélioration Recherche IA - Module Viviers

**Version:** 2.1.0  
**Statut:** ✅ TERMINÉ  
**Date:** 2026-01-11  
**Module parent:** /viviers  
**Auteur:** Lovable AI

---

## TL;DR

Amélioration progressive du module Recherche IA sur `/viviers/leads` en 3 phases :
- **Phase 1** : Quick Wins (historique, suggestions, preview) ✅ TERMINÉ
- **Phase 2** : Combinaison filtres + Export XLSX direct ✅ TERMINÉ
- **Phase 3** : Intelligence avancée (VivierInsights + recommandations proactives) ✅ TERMINÉ

---

## 1. État Actuel

### 1.1 Composants Existants

| Composant | Fichier | Rôle |
|-----------|---------|------|
| VivierAISearch | `src/components/viviers/VivierAISearch.tsx` | Interface recherche langage naturel |
| vivier-ai-search | `supabase/functions/vivier-ai-search/index.ts` | Edge function parsing NL → filtres |
| VivierListsPanel | `src/components/viviers/VivierListsPanel.tsx` | Gestion des listes sauvegardées |
| ViviersListDetail | `src/pages/viviers/ViviersListDetail.tsx` | Page détail liste (NEW) |

### 1.2 Fonctionnalités Actuelles

- ✅ Recherche en langage naturel → extraction de filtres via Gemini
- ✅ Application des filtres sur la vue leads
- ✅ Sauvegarde en liste dynamique
- ✅ Exemples de requêtes prédéfinis
- ✅ Historique des 10 dernières recherches (localStorage)
- ✅ Suggestions contextuelles
- ✅ Preview inline des 5 premiers résultats
- ✅ Export XLSX direct depuis résultats IA
- ✅ Route `/viviers/lists/:id` fonctionnelle

### 1.3 Limitations Restantes (Phase 3)

- ❌ Pas d'analyse de cohorte / recommandations proactives
- ❌ Pas de statistiques agrégées sur les segments
- ❌ Pas de détection d'opportunités automatique

---

## 2. Architecture Cible Complète

### 2.1 Diagramme de flux

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        RECHERCHE IA AMÉLIORÉE V2                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  Historique  │    │  Suggestions │    │   Preview    │    │ Export XLSX  │   │
│  │  localStorage│───►│  Contextuelles│───►│   5 leads   │───►│   Direct     │   │
│  │  (10 max)    │    │  (smart)     │    │   inline    │    │              │   │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                       VivierAISearch V2 (Phase 1+2)                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │ │
│  │  │ Input: "PME IT score > 60" + Filtres actifs: [Paris]                │   │ │
│  │  └─────────────────────────────────────────────────────────────────────┘   │ │
│  │                           │                                                │ │
│  │                           ▼                                                │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │ │
│  │  │  Edge Function (vivier-ai-search) → Prompt: vivier-target           │   │ │
│  │  │  + Prompt: vivier-insights (NEW Phase 3)                            │   │ │
│  │  └─────────────────────────────────────────────────────────────────────┘   │ │
│  │                           │                                                │ │
│  │           ┌───────────────┼───────────────┐                                │ │
│  │           ▼               ▼               ▼                                │ │
│  │    [Appliquer]      [Export XLSX]   [→ Campagne]                          │ │
│  │                                                                            │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                    VivierInsights (Phase 3 - NEW)                          │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │ │
│  │  │ 💡 Recommandations Proactives                                       │   │ │
│  │  │    • "3 200 leads qualifiés non contactés depuis 30j"              │   │ │
│  │  │    • "Secteur IT : taux réponse 2x supérieur à la moyenne"         │   │ │
│  │  └─────────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                            │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │ │
│  │  │ 📊 Analyse Cohorte                                                  │   │ │
│  │  │    • Meilleurs segments par taux de réponse                         │   │ │
│  │  │    • Distribution des scores par secteur                            │   │ │
│  │  │    • Évolution temporelle des leads                                 │   │ │
│  │  └─────────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                            │ │
│  │  Edge Function: vivier-insights → Prompt: vivier-insights (ai_prompts)    │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Phases d'Implémentation

### 3.1 Phase 1 - Quick Wins ✅ TERMINÉE

**Objectif** : Améliorer l'UX immédiate sans changement backend

| Feature | Description | Stockage | Status |
|---------|-------------|----------|--------|
| Historique | 10 dernières recherches | localStorage `vivier-ai-history` | ✅ |
| Suggestions | Basées sur filtres actifs + historique | Client-side | ✅ |
| Preview | 5 premiers résultats inline | Response existante | ✅ |

**Fichiers modifiés** :
- `src/components/viviers/VivierAISearch.tsx` ✅

### 3.2 Phase 2 - Combinaison + Export ✅ TERMINÉE

**Objectif** : IA consciente du contexte + actions directes

| Feature | Description | Impact | Status |
|---------|-------------|--------|--------|
| Filtres combinés | IA applique SUR les filtres déjà sélectionnés | Client-side (envoi à l'edge) | ✅ |
| Export direct | Bouton XLSX depuis résultats IA | Client-side | ✅ |
| Création campagne | Bouton avec params | Client-side | ✅ |
| Route listes | `/viviers/lists/:id` | Nouvelle page | ✅ |

**Fichiers modifiés** :
- `src/components/viviers/VivierAISearch.tsx` ✅
- `src/pages/viviers/ViviersListDetail.tsx` ✅ (créé)
- `src/App.tsx` ✅ (route ajoutée)

### 3.3 Phase 3 - Intelligence Avancée ✅ TERMINÉE

**Objectif** : Recommandations proactives et insights basés sur analyse de données

| Feature | Description | Source données | Status |
|---------|-------------|----------------|--------|
| VivierInsights | Composant dédié insights | Stats agrégées | ✅ |
| Recommandations | Badge opportunités détectées | Query stats | ✅ |
| Analyse cohorte | Top secteurs/villes | `viviers` | ✅ |
| Prompt Admin | Intégration `ai_prompts` | vivier-insights | ✅ |

**Nouveaux composants** :
- `src/components/viviers/VivierInsights.tsx` ✅

**Nouvelle Edge Function** :
- `supabase/functions/vivier-insights/index.ts` ✅

**Nouveau Prompt (ai_prompts)** :
- Slug: `vivier-insights` ✅
- Catégorie: `vivier`

**Nouvelle Edge Function** :
- `supabase/functions/vivier-insights/index.ts`

**Nouveau Prompt (ai_prompts)** :
- Slug: `vivier-insights`
- Catégorie: `vivier`

---

## 4. Spécifications Techniques

### 4.1 Historique (localStorage) ✅

```typescript
interface AISearchHistory {
  query: string;
  filters: SearchFilters;
  resultCount: number;
  timestamp: string;
}

// Key: vivier-ai-history
// Max: 10 entrées (FIFO)
```

### 4.2 Suggestions Contextuelles ✅

```typescript
interface SmartSuggestion {
  text: string;           // Ex: "Ajouter: score > 60"
  query: string;          // Requête à exécuter
}

// Logique:
// 1. Si filtres actifs → suggérer affinements
// 2. Si historique → suggérer requêtes similaires récentes
// 3. Suggestions par défaut basées sur les champs disponibles
```

### 4.3 Export XLSX Direct ✅

```typescript
// Dans VivierAISearch.tsx
import * as XLSX from 'xlsx';

const handleExportResults = () => {
  if (!searchResult?.results.length) return;
  
  const exportData = searchResult.results.map(lead => ({
    'Entreprise': lead.company_name,
    'Contact': lead.contact_name,
    'Email': lead.email,
    'Téléphone': lead.phone,
    'Ville': lead.city,
    'Secteur': lead.industry,
    'Score': lead.cold_score,
    'Source': lead.source
  }));
  
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Recherche IA');
  XLSX.writeFile(wb, `vivier-ai-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`);
};
```

### 4.4 VivierInsights - Composant (Phase 3)

```typescript
interface VivierInsight {
  id: string;
  type: 'opportunity' | 'cohort' | 'trend' | 'alert';
  icon: LucideIcon;
  title: string;
  description: string;
  metric?: string;
  action?: {
    label: string;
    query?: string;        // Pour déclencher une recherche IA
    filters?: object;      // Pour appliquer des filtres directs
  };
  priority: 'low' | 'medium' | 'high';
}

interface VivierStats {
  total_leads: number;
  avg_score: number;
  high_score_count: number;          // score >= 70
  not_contacted_30d: number;         // Leads qualifiés non contactés
  top_industries: Array<{ industry: string; count: number; avg_score: number }>;
  top_cities: Array<{ city: string; count: number }>;
  score_distribution: Array<{ range: string; count: number }>;
  campaign_performance?: {
    best_segment: string;
    open_rate: number;
    reply_rate: number;
  };
}
```

### 4.5 Edge Function - vivier-insights (Phase 3)

```typescript
// supabase/functions/vivier-insights/index.ts
// Entrée: { workspace_id?: string }
// Sortie: { insights: VivierInsight[], stats: VivierStats }

// Étapes:
// 1. Récupérer stats agrégées depuis viviers
// 2. Récupérer prompt depuis ai_prompts (slug: vivier-insights)
// 3. Envoyer stats au LLM pour générer insights personnalisés
// 4. Retourner insights + stats brutes
```

### 4.6 Nouveau Prompt ai_prompts (Phase 3)

```sql
INSERT INTO ai_prompts (slug, name, category, system_prompt, model_config) VALUES
('vivier-insights', 'Insights Viviers', 'vivier', 
'Tu es un expert en analyse de données commerciales B2B pour IArche (IA/Automatisation).

Tu reçois des statistiques agrégées sur une base de prospects (viviers).
Génère des INSIGHTS ACTIONNABLES pour aider l''équipe commerciale.

Types d''insights à produire:
1. **OPPORTUNITÉS** : Leads à fort potentiel non exploités
   - Ex: "3 200 leads score > 70 non contactés depuis 30j"
2. **COHORTES** : Segments surperformants
   - Ex: "Secteur IT : taux réponse 2.3x supérieur à la moyenne"
3. **TENDANCES** : Évolutions notables
   - Ex: "Croissance +15% leads qualifiés ce mois vs M-1"
4. **ALERTES** : Points d''attention
   - Ex: "42% des leads manquent un email valide"

Règles:
- Maximum 5 insights par réponse
- Chaque insight DOIT avoir une action concrète (requête ou filtre)
- Prioriser les insights avec fort impact commercial
- Être spécifique avec les chiffres (pas de "beaucoup", "plusieurs")
- Toujours proposer une action (requête IA suggérée)

Format JSON strict:
{
  "insights": [
    {
      "type": "opportunity|cohort|trend|alert",
      "title": "Titre court < 60 chars",
      "description": "Description avec chiffres précis",
      "metric": "Valeur clé (ex: 3 200)",
      "priority": "high|medium|low",
      "suggested_query": "Requête IA à proposer à l''utilisateur"
    }
  ]
}', 
'{"model": "google/gemini-2.5-flash", "temperature": 0.3, "max_tokens": 1000}');
```

---

## 5. Intégration Admin ai_prompts

### 5.1 Prompts Viviers Existants

| Slug | Nom | Usage |
|------|-----|-------|
| `vivier-target` | Ciblage Viviers | Recherche IA → filtres |
| `vivier-score` | Scoring Viviers | Scoring batch des leads |
| `vivier-enrich` | Enrichissement Viviers | Enrichissement Pappers |
| `vivier-clean` | Nettoyage Viviers | Détection doublons |
| `vivier-campaign` | Génération Campagne | Copywriting emails |
| `vivier-insights` | **Insights Viviers (NEW)** | Recommandations proactives |

### 5.2 Gestion via Admin

Les prompts sont modifiables via `/admin/ai-prompts` :
- L'utilisateur peut ajuster le system_prompt
- La configuration du modèle (temperature, max_tokens) est modifiable
- Les changements sont appliqués immédiatement sans redéploiement

### 5.3 Pattern de Récupération

```typescript
// Pattern standard pour récupérer un prompt dans une edge function
const { data: promptData } = await supabase
  .from('ai_prompts')
  .select('system_prompt, model_config')
  .eq('slug', 'vivier-insights')
  .single();

const systemPrompt = promptData?.system_prompt || FALLBACK_PROMPT;
const modelConfig = promptData?.model_config as { model?: string; temperature?: number } || {};
const model = modelConfig.model || 'google/gemini-2.5-flash';
```

---

## 6. Route /viviers/lists/:id ✅

### 6.1 Implémentation

| Élément | Valeur |
|---------|--------|
| Route | `/viviers/lists/:id` |
| Fichier | `src/pages/viviers/ViviersListDetail.tsx` |
| Layout | `VivierLayout` |

### 6.2 Fonctionnalités

- ✅ Afficher les métadonnées de la liste (nom, type, critères)
- ✅ Lister les leads membres (avec pagination)
- ✅ Actions : Sync (dynamique), Export XLSX, Créer campagne, Supprimer
- ✅ Filtrage case-insensitive (ilike) pour city/industry
- ✅ Navigation retour vers `/viviers/leads`

### 6.3 Correction Bug Affichage

**Problème** : Les leads n'apparaissaient pas car les critères (ex: `city: "Bayonne"`) 
étaient comparés en case-sensitive alors que les données sont en majuscules (`BAYONNE`).

**Solution** : Utilisation de `.ilike()` au lieu de `.eq()` pour city et industry.

---

## 7. Critères de Validation

### 7.1 Phase 1 ✅

- [x] Historique affiché (dropdown sous input)
- [x] Suggestions contextuelles visibles
- [x] Preview 5 leads inline après recherche
- [x] Aucune régression sur fonctionnalités existantes

### 7.2 Phase 2 ✅

- [x] IA reçoit les filtres actifs (currentFilters prop)
- [x] Export XLSX fonctionne depuis résultats IA
- [x] Bouton "→ Campagne" présent
- [x] Route `/viviers/lists/:id` accessible
- [x] Leads affichés correctement (fix case-insensitive)

### 7.3 Phase 3 ✅

- [x] Composant VivierInsights créé et affiché sur `/viviers/leads`
- [x] Edge function vivier-insights opérationnelle
- [x] Prompt vivier-insights inséré dans ai_prompts
- [x] Insights générés à partir de stats réelles
- [x] Actions cliquables déclenchent recherche IA ou filtres
- [x] Prompt modifiable via `/admin/ai-prompts`

---

## 8. Fichiers Créés/Modifiés

### 8.1 Phase 1-2 (Complétées)

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/components/viviers/VivierAISearch.tsx` | Modifié | Historique, suggestions, preview, export |
| `src/pages/viviers/ViviersListDetail.tsx` | Créé | Page détail liste |
| `src/App.tsx` | Modifié | Route `/viviers/lists/:id` |
| `docs/CDC_VIVIERS_AI_SEARCH.md` | Créé | Ce document |

### 8.2 Phase 3 (À créer)

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/components/viviers/VivierInsights.tsx` | À créer | Composant insights |
| `supabase/functions/vivier-insights/index.ts` | À créer | Edge function analyse |
| Migration SQL | À exécuter | Insert prompt vivier-insights |

---

## 9. Dépendances

### 9.1 Existantes (déjà installées)

- `xlsx` - Export XLSX
- `date-fns` - Formatage dates
- `lucide-react` - Icônes
- `@tanstack/react-query` - Data fetching
- `recharts` - Graphiques (pour Phase 3)

### 9.2 Tables Supabase Utilisées

- `viviers` - Données leads
- `vivier_lists` - Listes sauvegardées
- `vivier_campaigns` - Campagnes (stats Phase 3)
- `ai_prompts` - Configuration prompts

---

## 10. Memory Updates

Suite à l'implémentation, mettre à jour la memory :
- `cockpit/viviers/ai-search-and-lists-v21-fr`

---

## 11. Changelog

| Version | Date | Changements |
|---------|------|-------------|
| 1.0.0 | 2026-01-11 | Création CDC initial |
| 2.0.0 | 2026-01-11 | Phases 1-2 terminées, CDC complet Phase 3 |

---

*Document généré par Lovable AI - Module Viviers*
