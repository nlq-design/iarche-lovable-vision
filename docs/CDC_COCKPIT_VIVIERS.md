# CDC Module Viviers - IArche

**Version:** 1.2.0  
**Statut:** 📋 SPÉCIFICATION VALIDÉE  
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

## 5. Performance

### 5.1 Optimisations pour 100k+ lignes

1. **Pagination serveur** - Jamais charger toutes les données
2. **Index SQL** - Sur tous les champs de recherche/filtre
3. **Debounce recherche** - 300ms avant requête
4. **Virtualisation liste** - Si scroll infini demandé
5. **Cache React Query** - staleTime: 5min pour les stats

### 5.2 Import gros fichiers

1. **Chunking** - Import par lots de 1000 lignes
2. **Worker/Edge Function** - Traitement asynchrone
3. **Progress feedback** - % completion en temps réel

---

## 6. Sécurité

- RLS activé sur toutes les tables
- Accès authentifié uniquement
- Validation des fichiers uploadés
- Sanitization des données CSV

---

## 7. Roadmap

### Phase 1 - MVP
- [ ] Table `viviers` + `vivier_imports`
- [ ] Page liste avec filtres basiques
- [ ] Page détail
- [ ] Import CSV simple
- [ ] Promotion unitaire vers leads

### Phase 2 - Enrichissement
- [ ] Scoring automatique
- [ ] Détection doublons avancée
- [ ] Import XLSX
- [ ] Actions bulk

### Phase 3 - Intelligence
- [ ] Enrichissement Pappers automatique
- [ ] Scoring IA
- [ ] Suggestions de promotion
- [ ] Rapports et analytics

---

## 8. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-01-04 | Spécification initiale |
