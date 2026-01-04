# CDC Module Viviers - IArche

**Version:** 2.0.0  
**Statut:** 📋 SPÉCIFICATION VALIDÉE (AI-POWERED)  
**Date:** 2026-01-04  
**Auteur:** Lovable AI

---

## 1. Vue d'ensemble

### 1.1 Objectif
Module **distinct** de gestion des **leads froids** (viviers) permettant d'importer, stocker et qualifier des prospects issus de sources externes (INSEE, Google Business, listes enrichies, CSV).

### 1.2 Architecture modules IArche

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MODULES IARCHE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  /              → Site public (vitrine, blog, formulaires)          │
│                   Auth: public                                       │
│                                                                      │
│  /admin         → Back-office éditorial (articles, médias)          │
│                   Auth: admin role                                   │
│                                                                      │
│  /cockpit       → CRM commercial (leads chauds, pipeline)           │
│                   Auth: cockpit_user + step-up MFA                   │
│                                                                      │
│  /viviers       → Base prospects froids (100k+ lignes)              │ ◄── NEW
│                   Auth: cockpit_user + step-up MFA (identique)       │
│                   Layout: VivierLayout (dédié)                       │
│                   Accès: Badge orange dans header Cockpit            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Flux CRM complet

```
/viviers (froid)                    /cockpit
      │                                 │
      │ promotion                       │ auto-sync (formulaires)
      ▼                                 ▼
┌────────────────────────────────────────────┐
│              /cockpit/leads                 │
│            (leads qualifiés)                │
└─────────────────┬──────────────────────────┘
                  │
                  ▼
         /cockpit/pipeline → /cockpit/projets
```

### 1.4 Sources de données

| Source | Description | Format |
|--------|-------------|--------|
| INSEE | Registre entreprises France | CSV |
| Google Business | Extraction commerces locaux | CSV |
| Listes enrichies | Fichiers prospects achetés | CSV/XLSX |
| Scraping autorisé | Données publiques | JSON/CSV |

---

## 2. Architecture technique

### 2.1 Routes

| Route | Description | Composant | Layout |
|-------|-------------|-----------|--------|
| `/viviers` | Liste des leads froids | `Viviers.tsx` | `VivierLayout` |
| `/viviers/:id` | Détail d'un lead froid | `VivierDetail.tsx` | `VivierLayout` |
| `/viviers/import` | Interface d'import | `VivierImport.tsx` | `VivierLayout` |

### 2.2 Composants

```
src/
├── components/
│   └── viviers/
│       ├── VivierLayout.tsx         # Layout dédié module
│       ├── VivierHeader.tsx         # Header minimaliste
│       ├── VivierTable.tsx          # Table avec pagination serveur
│       ├── VivierFilters.tsx        # Filtres avancés
│       ├── VivierDetailSheet.tsx    # Vue détail
│       ├── VivierImportWizard.tsx   # Wizard import multi-étapes
│       ├── VivierScoreBadge.tsx     # Affichage score coloré
│       └── ProtectedVivierRoute.tsx # Auth guard
│
├── hooks/
│   └── viviers/
│       ├── useViviers.ts            # CRUD + pagination
│       ├── useVivierImport.ts       # Import CSV/XLSX/paste
│       ├── useVivierPromotion.ts    # Promotion → leads
│       └── useVivierScoring.ts      # Calcul scoring auto
│
└── pages/
    └── viviers/
        ├── Viviers.tsx              # Liste principale
        ├── VivierDetail.tsx         # Page détail
        └── VivierImport.tsx         # Page import
```

### 2.3 Schéma de données

```sql
-- Table principale des viviers (leads froids)
CREATE TABLE public.viviers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifiants externes
  external_id TEXT,                    -- ID source (SIRET, etc.)
  source TEXT NOT NULL,                -- 'insee', 'google_business', 'enriched_list', 'manual'
  source_file TEXT,                    -- Nom du fichier CSV importé
  batch_id UUID,                       -- ID du lot d'import
  
  -- Données entreprise
  company_name TEXT,
  siret TEXT,
  siren TEXT,
  naf_code TEXT,
  legal_form TEXT,
  
  -- Contact principal
  contact_name TEXT,
  contact_position TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  linkedin_url TEXT,
  
  -- Adresse
  address TEXT,
  postal_code TEXT,
  city TEXT,
  region TEXT,
  country TEXT DEFAULT 'France',
  
  -- Données business
  industry TEXT,
  company_size TEXT,                   -- 'tpe', 'pme', 'eti', 'ge'
  revenue_range TEXT,
  employee_count INTEGER,
  creation_date DATE,
  
  -- Scoring & qualification
  cold_score INTEGER DEFAULT 0,        -- Score de potentiel (0-100)
  scoring_criteria JSONB DEFAULT '{}', -- Détails du scoring
  tags TEXT[] DEFAULT '{}',
  
  -- Statut
  status TEXT DEFAULT 'new',           -- 'new', 'contacted', 'interested', 'not_interested', 'promoted', 'invalid'
  promoted_to_lead_id UUID,            -- FK vers leads si promu
  promoted_at TIMESTAMPTZ,
  
  -- Métadonnées
  raw_data JSONB DEFAULT '{}',         -- Données brutes du CSV
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Workspace
  workspace_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- Index pour recherche performante sur 100k+ lignes
CREATE INDEX idx_viviers_email ON public.viviers(email);
CREATE INDEX idx_viviers_siret ON public.viviers(siret);
CREATE INDEX idx_viviers_company ON public.viviers(company_name);
CREATE INDEX idx_viviers_city ON public.viviers(city);
CREATE INDEX idx_viviers_status ON public.viviers(status);
CREATE INDEX idx_viviers_source ON public.viviers(source);
CREATE INDEX idx_viviers_score ON public.viviers(cold_score DESC);
CREATE INDEX idx_viviers_batch ON public.viviers(batch_id);

-- Table des imports (batches)
CREATE TABLE public.vivier_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  source TEXT NOT NULL,
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  duplicate_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',       -- 'pending', 'processing', 'completed', 'failed'
  error_log JSONB DEFAULT '[]',
  column_mapping JSONB DEFAULT '{}',   -- Mapping colonnes CSV → champs DB
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  workspace_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- RLS
ALTER TABLE public.viviers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vivier_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage viviers"
  ON public.viviers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage vivier_imports"
  ON public.vivier_imports FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

### 2.4 Hooks

```typescript
// src/hooks/viviers/useViviers.ts
export function useViviers() {
  // CRUD viviers
  // Filtrage avancé
  // Pagination serveur (100k lignes)
  // Stats
}

// src/hooks/viviers/useVivierImport.ts
export function useVivierImport() {
  // Upload CSV/XLSX
  // Paste depuis tableur
  // Mapping colonnes
  // Import batch
  // Détection doublons
}

// src/hooks/viviers/useVivierPromotion.ts
export function useVivierPromotion() {
  // Promotion vivier → lead (suppression après)
  // Enrichissement si email existe dans leads
  // Bulk promotion
}

// src/hooks/viviers/useVivierScoring.ts
export function useVivierScoring() {
  // Calcul automatique du score
  // Règles configurables
}
```

### 2.3 Hooks

```typescript
// src/hooks/cockpit/useCockpitViviers.ts
export function useCockpitViviers() {
  // CRUD viviers
  // Filtrage avancé
  // Pagination (100k lignes)
  // Stats
}

// src/hooks/cockpit/useVivierImport.ts
export function useVivierImport() {
  // Upload CSV
  // Mapping colonnes
  // Import batch
  // Détection doublons
}

// src/hooks/cockpit/useVivierPromotion.ts
export function useVivierPromotion() {
  // Promotion vivier → lead
  // Bulk promotion
}
```

---

## 3. Fonctionnalités

### 3.1 Import multi-format

**Formats supportés:**
- CSV (séparateur auto-détecté)
- XLSX (Excel)
- Copier-coller depuis tableur

**Interface d'import:**
1. Upload fichier OU coller données depuis tableur
2. Prévisualisation des 10 premières lignes
3. Mapping colonnes (drag & drop ou select)
4. Détection automatique des colonnes standards
5. Validation avant import
6. Progress bar pour gros fichiers
7. Rapport d'import (succès, doublons, erreurs)

**Colonnes mappables (toutes prioritaires):**

| Groupe | Colonnes |
|--------|----------|
| Essentiels | company_name, siret, email, phone |
| Adresse | address, postal_code, city, region |
| Business | industry, company_size, revenue_range, employee_count |
| Contact | contact_name, contact_position, linkedin_url |

**Détection doublons:**
- Par email (prioritaire)
- Par SIRET
- Par combo company_name + city

**Gestion doublons vivier ↔ leads existants:**
> Si un email existe déjà dans `leads`, le vivier **enrichit le lead** existant (merge des données manquantes) au lieu de créer un doublon.

### 3.2 Liste des viviers

**Affichage:**
- Table avec pagination serveur (50/page)
- Colonnes configurables
- Tri multi-colonnes
- Recherche full-text

**Filtres:**
- Source (INSEE, Google Business, etc.)
- Statut (new, contacted, interested, etc.)
- Région/Ville
- Secteur d'activité
- Taille entreprise
- Score (plages)
- Tags
- Batch d'import

**Actions bulk:**
- Sélection multiple
- Promotion vers leads (bulk)
- Changement de statut
- Attribution de tags
- Export sélection

### 3.3 Détail vivier

**Onglets:**
1. **Informations** - Données entreprise et contact
2. **Historique** - Actions effectuées
3. **Notes** - Notes libres

**Actions:**
- Éditer les informations
- Changer le statut
- Promouvoir vers /leads
- Marquer invalide
- Supprimer

### 3.4 Promotion vers Leads

**Workflow:**
```
Vivier (froid) ──promotion──▶ Lead (qualifié)
     │                              │
     │ [SUPPRIMÉ]                   │ source = 'vivier'
     │                              │ source_id = vivier.id (conservé)
     ▼                              ▼
[Entrée supprimée]         [Actif dans leads]
```

> **Post-promotion:** L'entrée vivier est **supprimée** après promotion. Les données sont transférées intégralement vers leads, avec `source_id` pointant vers l'ancien ID vivier pour traçabilité.

**Données transférées:**
- Toutes les infos entreprise/contact
- Tags
- Notes
- raw_data (données brutes CSV originales)

### 3.5 Scoring automatique

**Critères de scoring (0-100):**

| Critère | Points | Condition |
|---------|--------|-----------|
| Email valide | +15 | Format email correct |
| Téléphone | +10 | Numéro renseigné |
| SIRET valide | +15 | 14 chiffres vérifiés |
| Secteur cible | +20 | Match avec secteurs prioritaires |
| Taille PME/ETI | +15 | company_size in ('pme', 'eti') |
| Région IDF | +10 | postal_code starts with 75/77/78/91/92/93/94/95 |
| Site web | +10 | URL renseignée |
| LinkedIn | +5 | Profil renseigné |

**Calcul:** Score = Σ points applicables (max 100)

**Seuils:**
- 🔴 0-30: Froid
- 🟠 31-60: Tiède  
- 🟢 61-100: Chaud (prioritaire)

---

## 4. UI/UX

### 4.1 Accès au module /viviers

**Depuis /cockpit:** Badge orange en haut à droite du header Cockpit

```
┌─────────────────────────────────────────────────────────────┐
│ COCKPIT                              [🟠 Viviers (12.4k)] ──┼──▶ /viviers
├─────────────────────────────────────────────────────────────┤
│ Sidebar                              Content                 │
│ ├── Dashboard                                               │
│ ├── Pipeline                                                │
│ ├── Leads                                                   │
│ └── ...                                                     │
└─────────────────────────────────────────────────────────────┘
```

**Module /viviers (layout dédié):**

```
┌─────────────────────────────────────────────────────────────┐
│ VIVIERS                    [Import] [← Retour Cockpit]       │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│  Filtres: [Source ▼] [Score ▼] [Région ▼] [Recherche...]    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Table (pagination serveur)                              │ │
│  │ Entreprise | Contact | Score | Source | Actions         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Précédent] Page 1/2000 [Suivant]                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Design

- **VivierLayout:** Header minimaliste + contenu (pas de sidebar lourde)
- **Liste:** Table dense avec infos essentielles
- **Score visuel:** Jauge colorée (🔴 froid → 🟠 tiède → 🟢 chaud)
- **Statut badges:** Couleurs distinctives par statut
- **Import:** Wizard multi-étapes
- **Badge header Cockpit:** Marqueur orange avec compteur cliquable

---

## 5. Intégration AI Agent

### 5.1 Architecture AI-Powered

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI CONTROL PLANE - VIVIERS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  /admin/ai-prompts                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Prompts Viviers (catégorie: vivier)                             ││
│  │                                                                  ││
│  │ • vivier-score   : Scoring intelligent multi-critères           ││
│  │ • vivier-target  : Ciblage/segmentation par profil              ││
│  │ • vivier-clean   : Détection doublons/invalides                 ││
│  │ • vivier-enrich  : Enrichissement Pappers/web                   ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ai-agent-orchestrator (Tools Viviers)                               │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ search_viviers     : Recherche sémantique + filtres             ││
│  │ score_viviers      : Scoring batch (100k lignes)                ││
│  │ target_viviers     : Sélection par segment                      ││
│  │ clean_viviers      : Nettoyage doublons/invalides               ││
│  │ enrich_viviers     : Enrichissement Pappers batch               ││
│  │ export_viviers     : Export CSV/XLSX segmenté                   ││
│  │ promote_viviers    : Promotion batch → leads                    ││
│  │ update_viviers     : Modification batch (tags, notes, status)   ││
│  │ delete_viviers     : Suppression batch                          ││
│  │ annotate_viviers   : Ajout notes/tags AI                        ││
│  │ stats_viviers      : Statistiques agrégées                      ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Interface utilisateur hybride

```
┌─────────────────────────────────────────────────────────────────────┐
│ VIVIERS                               [Import] [← Retour Cockpit]    │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 🤖 Actions IA rapides:                                          ││
│  │ [Score tout] [Cibler PME IT] [Nettoyer] [Enrichir] [Exporter]   ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Filtres: [Source ▼] [Score ▼] [Région ▼] [Recherche...]            │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Table (pagination serveur)                                      ││
│  │ ☑ | Entreprise | Contact | Score | Source | Actions            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  [Sélection: 2,340] → [🤖 Traiter avec IA]                          │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 💬 Agent IA Viviers                                      [−][×] ││
│  │ ─────────────────────────────────────────────────────────────── ││
│  │ > Cible les entreprises tech en IDF avec +50 employés          ││
│  │                                                                  ││
│  │ 🤖 J'ai trouvé 1,234 entreprises correspondantes.               ││
│  │    Voulez-vous que je les score et exporte ?                    ││
│  │                                                                  ││
│  │ [Oui, score et exporte] [Afficher dans la liste] [Annuler]      ││
│  │                                                                  ││
│  │ [Écrire une commande...]                              [Envoyer] ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Mode autonome

**Principe:** L'IA peut exécuter des actions batch sans validation manuelle.

```typescript
// Configuration mode autonome
const AI_VIVIER_CONFIG = {
  autonomousMode: true,           // Mode pilote auto activé
  maxBatchSize: 10000,            // Limite par opération
  allowedActions: [
    'score',                      // Scoring illimité
    'target',                     // Ciblage illimité
    'annotate',                   // Tags/notes illimité
    'export',                     // Export illimité
  ],
  requireConfirmation: [
    'promote',                    // Promotion → leads = confirmation
    'delete',                     // Suppression = confirmation
    'enrich',                     // Enrichissement Pappers = coût API
  ],
  logging: true,                  // Log toutes les actions AI
};
```

### 5.4 Prompts IA (ai_prompts table)

```sql
-- Prompts à insérer dans ai_prompts
INSERT INTO ai_prompts (slug, name, category, system_prompt, model_config) VALUES

('vivier-score', 'Scoring Viviers', 'vivier', 
'Tu es un expert en qualification de prospects B2B. 
Score chaque vivier de 0 à 100 selon:
- Complétude données (email, téléphone, SIRET): 30 pts
- Secteur cible (tech, conseil, industrie): 25 pts  
- Taille entreprise (PME/ETI prioritaires): 20 pts
- Localisation (IDF, grandes métropoles): 15 pts
- Signaux business (site web, LinkedIn): 10 pts
Retourne un JSON avec score et détails.', 
'{"model": "google/gemini-2.5-flash", "temperature": 0.1}'),

('vivier-target', 'Ciblage Viviers', 'vivier',
'Tu es un expert en segmentation commerciale B2B.
Analyse la requête utilisateur et génère les critères de filtrage SQL.
Critères disponibles: source, company_size, industry, region, city, cold_score, tags.
Retourne un JSON avec les filtres et une estimation du nombre de résultats.',
'{"model": "google/gemini-2.5-flash", "temperature": 0.2}'),

('vivier-clean', 'Nettoyage Viviers', 'vivier',
'Tu es un expert en qualité de données B2B.
Identifie les entrées à nettoyer:
- Doublons (même email, même SIRET, même nom+ville)
- Emails invalides ou génériques (info@, contact@)
- Données incohérentes (SIRET invalide, téléphone mal formaté)
- Entreprises fermées ou inactives
Retourne la liste des IDs à supprimer/merger avec justification.',
'{"model": "google/gemini-2.5-flash", "temperature": 0.1}'),

('vivier-enrich', 'Enrichissement Viviers', 'vivier',
'Tu es un expert en enrichissement de données entreprise.
Pour chaque SIRET, récupère via Pappers:
- Forme juridique, capital, date création
- Effectifs, chiffre d''affaires
- Dirigeants, secteur NAF
Priorise les viviers avec score > 50 et données incomplètes.',
'{"model": "google/gemini-2.5-flash", "temperature": 0.1}');
```

### 5.5 Tools Orchestrator

```typescript
// Définition des tools pour ai-agent-orchestrator
const VIVIER_TOOLS = [
  {
    name: "search_viviers",
    description: "Recherche sémantique dans les viviers",
    parameters: {
      query: "string - Requête de recherche",
      filters: "object - Filtres optionnels (source, score_min, region...)",
      limit: "number - Max résultats (default 50)"
    }
  },
  {
    name: "score_viviers",
    description: "Calcule le score de qualification pour une liste de viviers",
    parameters: {
      vivier_ids: "string[] - IDs à scorer (ou 'all' pour tout)",
      criteria: "object - Critères de scoring personnalisés (optionnel)"
    }
  },
  {
    name: "target_viviers",
    description: "Sélectionne les viviers correspondant à un profil cible",
    parameters: {
      segment: "string - Description du segment (ex: 'PME tech IDF')",
      max_results: "number - Limite de résultats"
    }
  },
  {
    name: "clean_viviers",
    description: "Détecte et nettoie les doublons/invalides",
    parameters: {
      mode: "'detect' | 'clean' - Détection seule ou nettoyage",
      dry_run: "boolean - Simulation sans suppression"
    }
  },
  {
    name: "enrich_viviers",
    description: "Enrichit les viviers via Pappers API",
    parameters: {
      vivier_ids: "string[] - IDs à enrichir",
      fields: "string[] - Champs à enrichir"
    }
  },
  {
    name: "export_viviers",
    description: "Exporte une sélection en CSV/XLSX",
    parameters: {
      vivier_ids: "string[] - IDs à exporter",
      format: "'csv' | 'xlsx'",
      columns: "string[] - Colonnes à inclure"
    }
  },
  {
    name: "promote_viviers",
    description: "Promeut des viviers vers la table leads",
    parameters: {
      vivier_ids: "string[] - IDs à promouvoir"
    }
  },
  {
    name: "update_viviers",
    description: "Met à jour en batch (status, tags, notes)",
    parameters: {
      vivier_ids: "string[] - IDs à modifier",
      updates: "object - Champs à modifier"
    }
  },
  {
    name: "delete_viviers",
    description: "Supprime des viviers (avec confirmation)",
    parameters: {
      vivier_ids: "string[] - IDs à supprimer"
    }
  },
  {
    name: "stats_viviers",
    description: "Retourne les statistiques agrégées",
    parameters: {
      group_by: "string - Champ de regroupement (source, region, score_range)"
    }
  }
];
```

---

## 6. Performance

### 6.1 Optimisations pour 100k+ lignes

1. **Pagination serveur** - Jamais charger toutes les données
2. **Index SQL** - Sur tous les champs de recherche/filtre
3. **Debounce recherche** - 300ms avant requête
4. **Virtualisation liste** - Si scroll infini demandé
5. **Cache React Query** - staleTime: 5min pour les stats

### 6.2 Import gros fichiers

1. **Chunking** - Import par lots de 1000 lignes
2. **Worker/Edge Function** - Traitement asynchrone
3. **Progress feedback** - % completion en temps réel

### 6.3 Actions AI batch

1. **Streaming** - Feedback temps réel sur progression
2. **Chunking** - Traitement par lots de 500 pour scoring
3. **Queue** - File d'attente pour opérations lourdes

---

## 7. Sécurité

- RLS activé sur toutes les tables
- Accès authentifié (cockpit_user + step-up MFA)
- Validation des fichiers uploadés
- Sanitization des données CSV
- Rate limiting sur actions AI batch
- Logging complet des opérations AI

---

## 8. Roadmap

### Phase 1 - MVP Foundation
- [ ] Table `viviers` + `vivier_imports`
- [ ] VivierLayout + routes /viviers/*
- [ ] Page liste avec pagination serveur
- [ ] Page détail
- [ ] Import CSV/XLSX/paste
- [ ] Promotion unitaire vers leads
- [ ] Badge accès dans header Cockpit

### Phase 2 - AI Integration
- [ ] Prompts vivier-* dans ai_prompts
- [ ] Tools orchestrator (search, score, target, clean)
- [ ] Interface hybride (boutons + chat)
- [ ] Scoring automatique batch
- [ ] Mode autonome configurable

### Phase 3 - Advanced Features
- [ ] Enrichissement Pappers batch (vivier-enrich)
- [ ] Export segmenté CSV/XLSX
- [ ] Actions bulk avec IA
- [ ] Analytics et rapports
- [ ] Détection doublons cross-leads

---

## 9. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-01-04 | Spécification initiale |
| 1.1.0 | 2026-01-04 | Ajout scoring auto, doublons enrichissement, post-promotion suppression |
| 1.2.0 | 2026-01-04 | Module distinct /viviers, VivierLayout dédié, accès header Cockpit |
| 2.0.0 | 2026-01-04 | **AI-Powered** : intégration ai-prompts, 10 tools orchestrator, mode autonome, interface hybride |
