# CDC Amélioration Recherche IA - Module Viviers

**Version:** 1.0.0  
**Statut:** 🚧 EN COURS  
**Date:** 2026-01-11  
**Module parent:** /viviers  
**Auteur:** Lovable AI

---

## TL;DR

Amélioration progressive du module Recherche IA sur `/viviers/leads` en 3 phases :
- **Phase 1** : Quick Wins (historique, suggestions, preview)
- **Phase 2** : Combinaison filtres + Export XLSX direct
- **Phase 3** : Intelligence avancée (recommandations proactives)

---

## 1. État Actuel

### 1.1 Composants Existants

| Composant | Fichier | Rôle |
|-----------|---------|------|
| VivierAISearch | `src/components/viviers/VivierAISearch.tsx` | Interface recherche langage naturel |
| vivier-ai-search | `supabase/functions/vivier-ai-search/index.ts` | Edge function parsing NL → filtres |
| VivierListsPanel | `src/components/viviers/VivierListsPanel.tsx` | Gestion des listes sauvegardées |

### 1.2 Fonctionnalités Actuelles

- ✅ Recherche en langage naturel → extraction de filtres via Gemini
- ✅ Application des filtres sur la vue leads
- ✅ Sauvegarde en liste dynamique
- ✅ Exemples de requêtes prédéfinis

### 1.3 Limitations Identifiées

- ❌ Pas d'historique des recherches
- ❌ Suggestions non contextuelles
- ❌ Pas de prévisualisation inline des résultats
- ❌ IA ne tient pas compte des filtres déjà appliqués
- ❌ Export uniquement via page principale
- ❌ Route `/viviers/lists/:id` non implémentée
- ❌ Pas d'analyse de cohorte / recommandations

---

## 2. Architecture Cible

### 2.1 Diagramme de flux

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RECHERCHE IA AMÉLIORÉE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │
│  │  Historique  │    │  Suggestions │    │   Preview    │           │
│  │  localStorage│───►│  Contextuelles│───►│   5 leads   │           │
│  │  (10 max)    │    │  (smart)     │    │   inline    │           │
│  └──────────────┘    └──────────────┘    └──────────────┘           │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     VivierAISearch V2                          │ │
│  │  ┌─────────────────────────────────────────────────────────┐   │ │
│  │  │ Input: "PME IT score > 60" + Filtres actifs: [Paris]    │   │ │
│  │  └─────────────────────────────────────────────────────────┘   │ │
│  │                           │                                    │ │
│  │                           ▼                                    │ │
│  │  ┌─────────────────────────────────────────────────────────┐   │ │
│  │  │  Edge Function: Combine requête + filtres existants     │   │ │
│  │  └─────────────────────────────────────────────────────────┘   │ │
│  │                           │                                    │ │
│  │           ┌───────────────┼───────────────┐                    │ │
│  │           ▼               ▼               ▼                    │ │
│  │    [Appliquer]      [Export XLSX]   [→ Campagne]              │ │
│  │                                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                  Recommandations Proactives                    │ │
│  │  💡 "3 200 leads qualifiés non contactés depuis 30j"          │ │
│  │  💡 "Secteur IT : taux réponse 2x supérieur"                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Phases d'Implémentation

### 3.1 Phase 1 - Quick Wins ⭐

**Objectif** : Améliorer l'UX immédiate sans changement backend

| Feature | Description | Stockage |
|---------|-------------|----------|
| Historique | 10 dernières recherches | localStorage `vivier-ai-history` |
| Suggestions | Basées sur filtres actifs + historique | Client-side |
| Preview | 5 premiers résultats inline | Response existante |

**Fichiers modifiés** :
- `src/components/viviers/VivierAISearch.tsx`

**Nouveaux composants** :
- Aucun (intégration dans l'existant)

### 3.2 Phase 2 - Combinaison + Export ⭐⭐

**Objectif** : IA consciente du contexte + actions directes

| Feature | Description | Impact |
|---------|-------------|--------|
| Filtres combinés | IA applique SUR les filtres déjà sélectionnés | Modif edge function |
| Export direct | Bouton XLSX depuis résultats IA | Client-side |
| Création campagne | Redirection vers `/viviers/campaigns?...` | Client-side |

**Fichiers modifiés** :
- `src/components/viviers/VivierAISearch.tsx`
- `supabase/functions/vivier-ai-search/index.ts`

### 3.3 Phase 3 - Intelligence Avancée ⭐⭐⭐

**Objectif** : Recommandations proactives et insights

| Feature | Description | Source données |
|---------|-------------|----------------|
| Recommandations | Badge avec opportunités détectées | Query stats |
| Analyse cohorte | Comparaison taux réponse par segment | `vivier_campaigns` stats |

**Nouveaux composants** :
- `src/components/viviers/VivierInsights.tsx`

---

## 4. Spécifications Techniques

### 4.1 Historique (localStorage)

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

### 4.2 Suggestions Contextuelles

```typescript
interface SmartSuggestion {
  text: string;           // Ex: "Ajouter: score > 60"
  action: 'refine' | 'new';
  filters?: Partial<SearchFilters>;
}

// Logique:
// 1. Si filtres actifs → suggérer affinements
// 2. Si historique → suggérer requêtes similaires
// 3. Si stats dispo → suggérer segments intéressants
```

### 4.3 Edge Function - Filtres Combinés

```typescript
// Nouveau body:
{
  query: string;
  limit: number;
  existingFilters?: SearchFilters;  // ← NOUVEAU
}

// L'IA reçoit le contexte des filtres déjà appliqués
// et génère des filtres ADDITIONNELS (pas de remplacement)
```

### 4.4 Export XLSX Direct

```typescript
// Réutilise la logique existante de ViviersLeads
// Mais sur les résultats IA uniquement
import * as XLSX from 'xlsx';

const exportAIResults = (results: AISearchResult['results']) => {
  const ws = XLSX.utils.json_to_sheet(results);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Recherche IA');
  XLSX.writeFile(wb, `vivier-ai-${Date.now()}.xlsx`);
};
```

---

## 5. Route Manquante - /viviers/lists/:id

### 5.1 Page à créer

| Élément | Valeur |
|---------|--------|
| Route | `/viviers/lists/:id` |
| Fichier | `src/pages/viviers/ViviersListDetail.tsx` |
| Layout | `VivierLayout` |

### 5.2 Fonctionnalités

- Afficher les métadonnées de la liste (nom, type, critères)
- Lister les leads membres (avec pagination)
- Actions : Sync (dynamique), Export, Envoyer campagne, Supprimer

---

## 6. Critères de Validation

### 6.1 Phase 1

- [ ] Historique affiché (dropdown ou liste sous input)
- [ ] Suggestions contextuelles visibles
- [ ] Preview 5 leads inline après recherche
- [ ] Aucune régression sur fonctionnalités existantes

### 6.2 Phase 2

- [ ] IA prend en compte les filtres actifs
- [ ] Export XLSX fonctionne depuis résultats IA
- [ ] Bouton "→ Campagne" redirige correctement

### 6.3 Phase 3

- [ ] Badge recommandations affiché
- [ ] Insights basés sur données réelles

### 6.4 Route Listes

- [ ] Page `/viviers/lists/:id` accessible
- [ ] Leads affichés avec pagination
- [ ] Actions fonctionnelles

---

## 7. Changelog

| Version | Date | Changements |
|---------|------|-------------|
| 1.0.0 | 2026-01-11 | Création CDC initial |

---

*Document généré par Lovable AI - Module Viviers*
