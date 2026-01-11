# CDC Module Viviers - IArche

**Version:** 3.0.0  
**Statut:** ✅ IMPLÉMENTÉ - PRODUCTION READY  
**Date:** 2026-01-11  
**Auteur:** Lovable AI

---

## TL;DR

Architecture dual-stack email pour le module /viviers :

- **Instantly API v2** → Envoi massif cold outreach (13 domaines satellites en warm-up J15)
- **Brevo API v3** → Emails transactionnels leads qualifiés (domaines core iarche.fr/.io)

**Décisions MVP :**
- ✅ Séquences 3 steps incluses (J0, J+3, J+7)
- ✅ Génération IA prioritaire (prompt `vivier-campaign`)
- ✅ Validation 1ère campagne, puis mode autonome

---

## 1. Vue d'ensemble

### 1.1 Objectif
Module **distinct** de gestion des **leads froids** (viviers) permettant d'importer, stocker, qualifier et prospecter des entreprises issues de sources externes (INSEE, Google Business, listes enrichies, CSV).

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
      │ (+ campagne Instantly)          │
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

## 2. Architecture Email Dual-Stack

### 2.1 Vue globale

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ARCHITECTURE EMAIL                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  /VIVIERS (prospects froids)              /COCKPIT (leads chauds)   │
│  ┌────────────────────────┐               ┌────────────────────────┐│
│  │ Envoi massif cold      │               │ Emails transactionnels ││
│  │                        │               │                        ││
│  │ Provider: INSTANTLY    │               │ Provider: BREVO        ││
│  │ API: v2                │               │ API: v3                ││
│  │                        │               │                        ││
│  │ Domaines:              │               │ Domaines:              ││
│  │ • equipe-iarche.fr     │               │ • iarche.fr            ││
│  │ • solutions-iarche.fr  │               │ • iarche.io            ││
│  │ • iarche-labs.fr       │               │                        ││
│  │ • + 10 autres          │               │ (DNS déjà configuré)   ││
│  │                        │               │                        ││
│  │ Volume: 30/j/domaine   │               │ Volume: illimité       ││
│  │ Total: ~390/j actuel   │               │                        ││
│  │ Cible: 4000-6500/j     │               │                        ││
│  └────────────────────────┘               └────────────────────────┘│
│                                                                      │
│  ⚠️ RÈGLE ABSOLUE : iarche.fr et iarche.io JAMAIS cold outreach    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Stack Instantly (Cold Outreach)

| Paramètre | Valeur |
|-----------|--------|
| API Version | V2 |
| Documentation | https://developer.instantly.ai/api/v2 |
| Auth | Bearer Token |
| Plan requis | Growth minimum |

**Endpoints clés :**

| Endpoint | Méthode | Usage |
|----------|---------|-------|
| `/api/v2/leads` | POST | Ajouter prospects à campagne |
| `/api/v2/leads/list` | POST | Lister/rechercher leads |
| `/api/v2/campaigns` | POST | Créer campagne |
| `/api/v2/campaigns` | GET | Récupérer liste campagnes |
| `/api/v2/emails` | GET | Récupérer emails envoyés |
| Webhooks | — | Réponses, bounces, opens |

**Exemple création lead :**

```javascript
const response = await fetch('https://api.instantly.ai/api/v2/leads', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${INSTANTLY_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    campaign_id: 'uuid-campaign',
    email: 'prospect@example.com',
    first_name: 'Jean',
    last_name: 'Dupont',
    company_name: 'ACME SAS',
    custom_variables: {
      sector: 'IT',
      size: 'PME',
      region: 'Nouvelle-Aquitaine'
    }
  })
});
```

### 2.3 Stack Brevo (Transactionnel)

| Paramètre | Valeur |
|-----------|--------|
| API Version | V3 |
| Documentation | https://developers.brevo.com/ |
| Auth | API Key header |
| Domaines configurés | iarche.fr, iarche.io |

**Usage Cockpit uniquement :**
- Confirmations RDV
- Relances leads qualifiés
- Notifications pipeline
- Newsletters opt-in

### 2.4 État Infrastructure Domaines

**Domaines Satellites (Instantly) :**

| Domaine | Statut | Volume actuel | Cible S+4 |
|---------|--------|---------------|-----------|
| equipe-iarche.fr | 🟢 Warm-up J15 | 30/j | 200/j |
| solutions-iarche.fr | 🟢 Warm-up J15 | 30/j | 200/j |
| iarche-labs.* | 🟢 Warm-up J15 | 30/j | 200/j |
| + 10 autres | 🟢 Warm-up J15 | 30/j | 200/j |
| **TOTAL** | 13 domaines | ~390/j | ~2600/j |

**Domaines Core (Brevo) :**

| Domaine | Statut | Usage |
|---------|--------|-------|
| iarche.fr | 🟢 DNS OK | Transactionnel |
| iarche.io | 🟢 DNS OK | Transactionnel |

---

## 3. Architecture technique

### 3.1 Routes

| Route | Description | Composant | Layout |
|-------|-------------|-----------|--------|
| `/viviers` | Liste des leads froids | `Viviers.tsx` | `VivierLayout` |
| `/viviers/:id` | Détail d'un lead froid | `VivierDetail.tsx` | `VivierLayout` |
| `/viviers/import` | Interface d'import | `VivierImport.tsx` | `VivierLayout` |
| `/viviers/campaigns` | Gestion campagnes | `VivierCampaigns.tsx` | `VivierLayout` |
| `/viviers/campaigns/:id` | Détail campagne | `VivierCampaignDetail.tsx` | `VivierLayout` |

### 3.2 Composants

```
src/
├── components/
│   └── viviers/
│       ├── VivierLayout.tsx            # Layout dédié module
│       ├── VivierHeader.tsx            # Header minimaliste
│       ├── VivierTable.tsx             # Table avec pagination serveur
│       ├── VivierFilters.tsx           # Filtres avancés
│       ├── VivierDetailSheet.tsx       # Vue détail
│       ├── VivierImportWizard.tsx      # Wizard import multi-étapes
│       ├── VivierScoreBadge.tsx        # Affichage score coloré
│       ├── ProtectedVivierRoute.tsx    # Auth guard
│       │
│       ├── campaigns/
│       │   ├── CampaignComposer.tsx    # Éditeur campagne
│       │   ├── CampaignPreview.tsx     # Prévisualisation email
│       │   ├── CampaignSequence.tsx    # Éditeur séquence 3 steps
│       │   ├── CampaignStats.tsx       # Dashboard statistiques
│       │   └── DomainSelector.tsx      # Sélection domaine envoi
│       │
│       └── ai/
│           ├── VivierAIChat.tsx        # Chat agent IA
│           └── VivierAIActions.tsx     # Boutons actions rapides
│
├── hooks/
│   └── viviers/
│       ├── useViviers.ts               # CRUD + pagination
│       ├── useVivierImport.ts          # Import CSV/XLSX/paste
│       ├── useVivierPromotion.ts       # Promotion → leads
│       ├── useVivierScoring.ts         # Calcul scoring auto
│       ├── useVivierCampaigns.ts       # CRUD campagnes
│       └── useInstantlySync.ts         # Sync Instantly API
│
└── pages/
    └── viviers/
        ├── Viviers.tsx                 # Liste principale
        ├── VivierDetail.tsx            # Page détail
        ├── VivierImport.tsx            # Page import
        ├── VivierCampaigns.tsx         # Liste campagnes
        └── VivierCampaignDetail.tsx    # Détail campagne
```

### 3.3 Schéma de données complet

```sql
-- ============================================
-- TABLE 1: VIVIERS (leads froids)
-- ============================================
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
  contact_first_name TEXT,
  contact_last_name TEXT,
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
  
  -- RGPD
  consent_marketing BOOLEAN DEFAULT false,
  unsubscribed_at TIMESTAMPTZ,
  
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
CREATE INDEX idx_viviers_consent ON public.viviers(consent_marketing);

-- ============================================
-- TABLE 2: VIVIER_IMPORTS (lots d'import)
-- ============================================
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

-- ============================================
-- TABLE 3: EMAIL_DOMAINS (domaines configurables)
-- ============================================
CREATE TABLE public.email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  
  -- Type
  domain_type VARCHAR(50) NOT NULL,    -- 'satellite' | 'core'
  provider VARCHAR(50) NOT NULL,       -- 'instantly' | 'brevo'
  
  -- Identité
  from_name TEXT NOT NULL,             -- 'IArche' / 'Équipe IArche'
  from_email TEXT NOT NULL,            -- 'contact@equipe-iarche.fr'
  reply_to TEXT,
  
  -- Warm-up tracking (satellites only)
  warmup_started_at DATE,
  warmup_day INTEGER DEFAULT 0,        -- Jour courant du warm-up
  warmup_daily_limit INTEGER DEFAULT 30,
  warmup_status VARCHAR(50) DEFAULT 'warming', -- 'warming', 'ready', 'paused'
  
  -- DNS status
  spf_valid BOOLEAN DEFAULT FALSE,
  dkim_valid BOOLEAN DEFAULT FALSE,
  dmarc_valid BOOLEAN DEFAULT FALSE,
  last_dns_check TIMESTAMPTZ,
  
  -- Usage
  is_active BOOLEAN DEFAULT TRUE,
  daily_sent_count INTEGER DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  last_reset_date DATE,                -- Pour reset quotidien du compteur
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE 4: VIVIER_CAMPAIGNS (campagnes cold)
-- ============================================
CREATE TABLE public.vivier_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',  -- 'draft', 'scheduled', 'active', 'paused', 'completed'
  
  -- Instantly sync
  instantly_campaign_id UUID,
  instantly_status VARCHAR(50),
  instantly_account_id TEXT,           -- Compte Instantly utilisé
  
  -- Contenu
  subject VARCHAR(255),
  body_html TEXT,
  body_text TEXT,
  preview_text VARCHAR(150),
  
  -- Séquence multi-steps
  sequence_steps JSONB DEFAULT '[]',   -- [{step: 1, delay_days: 0, subject, body}, ...]
  
  -- Ciblage
  segment_criteria JSONB,              -- Critères de sélection viviers
  vivier_ids UUID[],                   -- IDs manuellement sélectionnés
  total_recipients INTEGER DEFAULT 0,
  
  -- Config envoi
  domain_id UUID REFERENCES email_domains(id),
  send_schedule JSONB,                 -- {days: ['mon','tue'...], hours: {from: '09:00', to: '18:00'}}
  daily_limit INTEGER DEFAULT 30,
  
  -- AI metadata
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_prompt_slug TEXT,                 -- 'vivier-campaign'
  ai_metadata JSONB,
  
  -- Stats (sync webhook)
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  open_rate NUMERIC(5,2) DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  reply_rate NUMERIC(5,2) DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  bounce_rate NUMERIC(5,2) DEFAULT 0,
  unsubscribe_count INTEGER DEFAULT 0,
  
  -- Timestamps
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  workspace_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- ============================================
-- TABLE 5: VIVIER_CAMPAIGN_RECIPIENTS (logs envoi)
-- ============================================
CREATE TABLE public.vivier_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES vivier_campaigns(id) ON DELETE CASCADE,
  vivier_id UUID REFERENCES viviers(id) ON DELETE SET NULL,
  
  -- Données envoi (snapshot)
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company_name VARCHAR(255),
  custom_variables JSONB,
  
  -- Instantly sync
  instantly_lead_id UUID,
  
  -- Statut par step
  current_step INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'opened', 'replied', 'bounced', 'unsubscribed'
  
  -- Timestamps events
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_type VARCHAR(20),             -- 'hard', 'soft'
  bounce_reason TEXT,
  unsubscribed_at TIMESTAMPTZ,
  
  -- Promotion vers leads
  promoted_to_lead_id UUID REFERENCES leads(id),
  promoted_at TIMESTAMPTZ,
  promotion_reason TEXT,               -- 'reply_interested', 'manual'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index performance
CREATE INDEX idx_vcr_campaign ON vivier_campaign_recipients(campaign_id);
CREATE INDEX idx_vcr_vivier ON vivier_campaign_recipients(vivier_id);
CREATE INDEX idx_vcr_status ON vivier_campaign_recipients(status);
CREATE INDEX idx_vcr_email ON vivier_campaign_recipients(email);
CREATE INDEX idx_campaigns_status ON vivier_campaigns(status);
CREATE INDEX idx_domains_provider ON email_domains(provider);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.viviers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vivier_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vivier_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vivier_campaign_recipients ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Authenticated users can manage email_domains"
  ON public.email_domains FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage vivier_campaigns"
  ON public.vivier_campaigns FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage vivier_campaign_recipients"
  ON public.vivier_campaign_recipients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

---

## 4. Fonctionnalités

### 4.1 Import multi-format

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
| Contact | contact_first_name, contact_last_name, contact_position, linkedin_url |

**Détection doublons:**
- Par email (prioritaire)
- Par SIRET
- Par combo company_name + city

**Gestion doublons vivier ↔ leads existants:**
> Si un email existe déjà dans `leads`, le vivier **enrichit le lead** existant (merge des données manquantes) au lieu de créer un doublon.

### 4.2 Liste des viviers

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
- **Ajouter à campagne**

### 4.3 Détail vivier

**Onglets:**
1. **Informations** - Données entreprise et contact
2. **Historique** - Actions effectuées
3. **Campagnes** - Participation aux campagnes
4. **Notes** - Notes libres

**Actions:**
- Éditer les informations
- Changer le statut
- Promouvoir vers /leads
- Marquer invalide
- Supprimer

### 4.4 Promotion vers Leads

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
- Historique campagnes (en metadata)

### 4.5 Scoring automatique

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

## 5. Module Campagnes Email

### 5.1 Flow utilisateur

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLOW CAMPAGNE /VIVIERS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [1] SEGMENTER                                                       │
│      │                                                               │
│      ├── Filtres manuels (secteur, taille, région)                  │
│      └── IA: "Cible les PME IT en Nouvelle-Aquitaine"               │
│             → vivier-target tool → 2,340 prospects                  │
│                                                                      │
│  [2] COMPOSER CAMPAGNE                                               │
│      │                                                               │
│      ├── Éditeur intégré (subject + body)                           │
│      ├── Variables: {{first_name}}, {{company}}, {{industry}}       │
│      ├── Séquence multi-step :                                       │
│      │   • Step 1: J0 - Email initial                               │
│      │   • Step 2: J+3 - Relance courte                             │
│      │   • Step 3: J+7 - Break-up email                             │
│      └── IA: vivier-campaign prompt → génère contenu                │
│                                                                      │
│  [3] PRÉVISUALISER                                                   │
│      │                                                               │
│      ├── Aperçu email avec variables résolues                       │
│      ├── Estimation volume (X emails sur Y jours)                   │
│      └── Alerte si quota domaines dépassé                           │
│                                                                      │
│  [4] LANCER                                                          │
│      │                                                               │
│      └── POST Instantly API:                                         │
│          • Créer campagne                                            │
│          • Ajouter leads avec custom_variables                      │
│          • Activer envoi                                             │
│                                                                      │
│  [5] DASHBOARD STATS                                                 │
│      │                                                               │
│      ├── Sync via webhooks Instantly                                │
│      ├── Métriques: envoyés, ouverts, réponses, bounces             │
│      └── Action: réponse positive → auto-promote /cockpit           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Séquence 3 Steps (MVP)

```json
{
  "sequence_steps": [
    {
      "step": 1,
      "delay_days": 0,
      "subject": "{{company}} - Opportunité transformation digitale",
      "body": "Bonjour {{first_name}},\n\nJ'accompagne les {{industry}} comme {{company}}..."
    },
    {
      "step": 2,
      "delay_days": 3,
      "subject": "Re: {{company}}",
      "body": "{{first_name}},\n\nJe me permets de relancer mon message..."
    },
    {
      "step": 3,
      "delay_days": 7,
      "subject": "Dernière tentative - {{company}}",
      "body": "{{first_name}},\n\nJe comprends que vous êtes probablement très occupé..."
    }
  ]
}
```

### 5.3 Webhooks Instantly

**Events à écouter :**

| Event | Action |
|-------|--------|
| `email.sent` | Update status → 'sent' |
| `email.opened` | Update status → 'opened', +1 open_count |
| `email.replied` | Update status → 'replied', +1 reply_count |
| `email.bounced` | Update status → 'bounced', +1 bounce_count, flag vivier invalid |
| `lead.interested` | Auto-promote vers /cockpit/leads |
| `lead.unsubscribed` | Update vivier unsubscribed_at |

**Endpoint webhook :**

```typescript
// POST /api/webhooks/instantly
async function handleInstantlyWebhook(req: Request) {
  const signature = req.headers.get('x-instantly-signature');
  
  // Validate signature
  if (!validateSignature(signature, req.body)) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  const { event_type, data } = await req.json();
  
  switch (event_type) {
    case 'email.replied':
      await updateRecipientStatus(data.lead_id, 'replied');
      await incrementCampaignStat(data.campaign_id, 'reply_count');
      
      // Auto-promote si intéressé
      if (data.interest_status === 'interested') {
        await promoteToLead(data.lead_id, 'reply_interested');
      }
      break;
      
    case 'email.bounced':
      await updateRecipientStatus(data.lead_id, 'bounced');
      await flagVivierInvalid(data.email);
      break;
    
    // ... autres events
  }
  
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

---

## 6. Intégration AI Agent

### 6.1 Architecture AI-Powered

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI CONTROL PLANE - VIVIERS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  /admin/ai-prompts                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Prompts Viviers (catégorie: vivier)                             ││
│  │                                                                  ││
│  │ • vivier-score    : Scoring intelligent multi-critères          ││
│  │ • vivier-target   : Ciblage/segmentation par profil             ││
│  │ • vivier-clean    : Détection doublons/invalides                ││
│  │ • vivier-enrich   : Enrichissement Pappers/web                  ││
│  │ • vivier-campaign : Génération séquence email cold              ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ai-agent-orchestrator (Tools Viviers)                               │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ search_viviers       : Recherche sémantique + filtres           ││
│  │ score_viviers        : Scoring batch (100k lignes)              ││
│  │ target_viviers       : Sélection par segment                    ││
│  │ clean_viviers        : Nettoyage doublons/invalides             ││
│  │ enrich_viviers       : Enrichissement Pappers batch             ││
│  │ export_viviers       : Export CSV/XLSX segmenté                 ││
│  │ promote_viviers      : Promotion batch → leads                  ││
│  │ update_viviers       : Modification batch (tags, notes, status) ││
│  │ delete_viviers       : Suppression batch                        ││
│  │ annotate_viviers     : Ajout notes/tags AI                      ││
│  │ stats_viviers        : Statistiques agrégées                    ││
│  │ create_campaign      : Crée campagne Instantly                  ││
│  │ preview_campaign     : Prévisualise email                       ││
│  │ launch_campaign      : Lance envoi campagne                     ││
│  │ stats_campaigns      : Stats des campagnes                      ││
│  │ promote_recipient    : Promeut répondant → lead                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Interface utilisateur hybride

```
┌─────────────────────────────────────────────────────────────────────┐
│ VIVIERS                               [Import] [← Retour Cockpit]    │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 🤖 Actions IA rapides:                                          ││
│  │ [Score tout] [Cibler PME IT] [Nettoyer] [Créer Campagne]        ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Filtres: [Source ▼] [Score ▼] [Région ▼] [Recherche...]            │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Table (pagination serveur)                                      ││
│  │ ☑ | Entreprise | Contact | Score | Source | Actions            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  [Sélection: 2,340] → [📧 Créer Campagne] [🤖 Traiter avec IA]      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 💬 Agent IA Viviers                                      [−][×] ││
│  │ ─────────────────────────────────────────────────────────────── ││
│  │ > Crée une campagne pour les PME tech en IDF                   ││
│  │                                                                  ││
│  │ 🤖 J'ai préparé une campagne 3 steps pour 1,234 prospects.      ││
│  │    Voulez-vous prévisualiser avant lancement ?                  ││
│  │                                                                  ││
│  │ [Prévisualiser] [Lancer maintenant] [Modifier ciblage]          ││
│  │                                                                  ││
│  │ [Écrire une commande...]                              [Envoyer] ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Mode autonome

**Principe:** L'IA peut exécuter des actions batch sans validation manuelle.

```typescript
// Configuration mode autonome
const AI_VIVIER_CONFIG = {
  autonomousMode: true,
  maxBatchSize: 10000,
  allowedActions: [
    'score',                      // Scoring illimité
    'target',                     // Ciblage illimité
    'annotate',                   // Tags/notes illimité
    'export',                     // Export illimité
    'preview_campaign',           // Preview illimité
  ],
  requireConfirmation: [
    'promote',                    // Promotion → leads = confirmation
    'delete',                     // Suppression = confirmation
    'enrich',                     // Enrichissement Pappers = coût API
    'launch_campaign',            // Lancement campagne = confirmation (sauf après 1ère)
  ],
  firstCampaignRequiresApproval: true,  // Après 1ère campagne validée → autonome
  logging: true,
};
```

### 6.4 Prompts IA (ai_prompts table)

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
'{"model": "google/gemini-2.5-flash", "temperature": 0.1, "max_tokens": 2000}'),

('vivier-target', 'Ciblage Viviers', 'vivier',
'Tu es un expert en segmentation commerciale B2B.
Analyse la requête utilisateur et génère les critères de filtrage SQL.
Critères disponibles: source, company_size, industry, region, city, cold_score, tags.
Retourne un JSON avec les filtres et une estimation du nombre de résultats.',
'{"model": "google/gemini-2.5-flash", "temperature": 0.2, "max_tokens": 2000}'),

('vivier-clean', 'Nettoyage Viviers', 'vivier',
'Tu es un expert en qualité de données B2B.
Identifie les entrées à nettoyer:
- Doublons (même email, même SIRET, même nom+ville)
- Emails invalides ou génériques (info@, contact@)
- Données incohérentes (SIRET invalide, téléphone mal formaté)
- Entreprises fermées ou inactives
Retourne la liste des IDs à supprimer/merger avec justification.',
'{"model": "google/gemini-2.5-flash", "temperature": 0.1, "max_tokens": 4000}'),

('vivier-enrich', 'Enrichissement Viviers', 'vivier',
'Tu es un expert en enrichissement de données entreprise.
Pour chaque SIRET, récupère via Pappers:
- Forme juridique, capital, date création
- Effectifs, chiffre d''affaires
- Dirigeants, secteur NAF
Priorise les viviers avec score > 50 et données incomplètes.',
'{"model": "google/gemini-2.5-flash", "temperature": 0.1, "max_tokens": 4000}'),

('vivier-campaign', 'Génération Campagne Vivier', 'vivier',
'Tu es un expert en copywriting B2B et cold email marketing.
Génère une séquence email de prospection personnalisée pour le segment fourni.

Règles:
- 3 emails: Initial (J0), Relance (J+3), Break-up (J+7)
- Objet < 50 caractères, accrocheur, sans spam words
- Corps concis (100-150 mots max par email)
- Ton professionnel mais humain, pas corporate
- Personnalisation avec {{first_name}}, {{company}}, {{industry}}
- CTA clair et unique par email
- Pas de pièces jointes mentionnées
- Signature courte: Prénom + IArche

Retourne JSON:
{
  "sequence_steps": [
    {"step": 1, "delay_days": 0, "subject": "...", "body": "..."},
    {"step": 2, "delay_days": 3, "subject": "...", "body": "..."},
    {"step": 3, "delay_days": 7, "subject": "...", "body": "..."}
  ]
}',
'{"model": "google/gemini-2.5-flash", "temperature": 0.7, "max_tokens": 4000}');
```

### 6.5 Tools Orchestrator (complet)

```typescript
// Définition complète des tools pour ai-agent-orchestrator
const VIVIER_TOOLS = [
  // === GESTION VIVIERS ===
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
      vivier_ids: "string[] - IDs à promouvoir",
      source: "string - Raison ('campaign_reply', 'manual', 'scoring')"
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
  },
  
  // === CAMPAGNES EMAIL ===
  {
    name: "create_campaign",
    description: "Crée une campagne email cold via Instantly",
    parameters: {
      name: "string - Nom de la campagne",
      segment_query: "object - Critères de ciblage",
      vivier_ids: "string[] - Ou IDs spécifiques",
      generate_content: "boolean - Générer via vivier-campaign prompt",
      domain_id: "string - ID du domaine d'envoi"
    }
  },
  {
    name: "preview_campaign",
    description: "Prévisualise un email avec variables résolues",
    parameters: {
      campaign_id: "string - ID de la campagne",
      sample_vivier_id: "string - ID vivier pour preview"
    }
  },
  {
    name: "launch_campaign",
    description: "Lance l'envoi d'une campagne via Instantly",
    parameters: {
      campaign_id: "string - ID de la campagne",
      schedule: "object - Planning optionnel"
    }
  },
  {
    name: "pause_campaign",
    description: "Met en pause une campagne active",
    parameters: {
      campaign_id: "string - ID de la campagne"
    }
  },
  {
    name: "stats_campaigns",
    description: "Retourne les stats des campagnes",
    parameters: {
      campaign_ids: "string[] - IDs ou 'all'"
    }
  },
  {
    name: "promote_recipient",
    description: "Promeut un destinataire de campagne vers leads",
    parameters: {
      recipient_id: "string - ID du recipient",
      reason: "string - Raison de la promotion"
    }
  }
];
```

---

## 7. Sécurité & Contraintes

### 7.1 Rate Limits

| Contrainte | Valeur | Gestion |
|------------|--------|---------|
| Instantly API | 10 req/s | Queue + throttling |
| Volume/domaine/jour | 30 (warm-up) → 500 (mature) | Check avant envoi |
| Bounces max | 5% | Pause auto campagne si dépassé |
| Brevo API | 300/h (free), 40k/h (paid) | Réservé transactionnel |

### 7.2 RGPD

| Règle | Implémentation |
|-------|----------------|
| Consentement | Champ `consent_marketing` vérifié avant envoi cold |
| Unsubscribe | Link dans chaque email + webhook sync |
| Droit oubli | Endpoint suppression + propagation Instantly |
| Données personnelles | Chiffrement at rest (Supabase) |

### 7.3 Sécurité générale

- RLS activé sur toutes les tables
- Accès authentifié (cockpit_user + step-up MFA)
- Validation des fichiers uploadés
- Sanitization des données CSV
- Rate limiting sur actions AI batch
- Rate limiting sur envois email
- Logging complet des opérations AI
- Webhooks sécurisés (signature Instantly)

### 7.4 Secrets requis

```env
# Instantly
INSTANTLY_API_KEY=xxx
INSTANTLY_WEBHOOK_SECRET=xxx

# Brevo (existant)
BREVO_API_KEY=xxx

# Pappers (enrichissement)
PAPPERS_API_KEY=xxx
```

---

## 8. Performance

### 8.1 Optimisations pour 100k+ lignes

1. **Pagination serveur** - Jamais charger toutes les données
2. **Index SQL** - Sur tous les champs de recherche/filtre
3. **Debounce recherche** - 300ms avant requête
4. **Virtualisation liste** - Si scroll infini demandé
5. **Cache React Query** - staleTime: 5min pour les stats

### 8.2 Import gros fichiers

1. **Chunking** - Import par lots de 1000 lignes
2. **Worker/Edge Function** - Traitement asynchrone
3. **Progress feedback** - % completion en temps réel

### 8.3 Actions AI batch

1. **Streaming** - Feedback temps réel sur progression
2. **Chunking** - Traitement par lots de 500 pour scoring
3. **Queue** - File d'attente pour opérations lourdes

### 8.4 Campagnes email

1. **Envoi progressif** - Respecte daily_limit par domaine
2. **Distribution domaines** - Round-robin sur domaines actifs
3. **Retry logic** - 3 tentatives avec backoff exponentiel

---

## 9. État d'Implémentation (Janvier 2026)

### ✅ Phase 1 - MVP Foundation (COMPLÉTÉE)
- [x] Table `viviers` avec tous les champs (100k+ lignes supportées)
- [x] Table `vivier_lists` pour segments statiques/dynamiques
- [x] Table `vivier_list_members` pour liaisons leads-listes
- [x] VivierLayout + VivierSidebar + VivierHeader
- [x] Routes /viviers/*, /viviers/leads, /viviers/leads/:slug
- [x] Page liste avec pagination serveur (25/50/100/200 par page)
- [x] Page détail avec fiche complète (VivierLeadDetail)
- [x] Import CSV/XLSX multi-fichiers avec mapping intelligent
- [x] Badge accès dans header Cockpit

### ✅ Phase 2 - Filtrage & Performance (COMPLÉTÉE)
- [x] Filtres globaux (Couche 1): Statut, Score, Ville, CP, Département, Secteur, Taille, Qualité
- [x] Filtres colonnes (Couche 2): Entreprise, Localisation, Activité, Score, Statut
- [x] **CityAutocomplete**: Recherche ville avec préfixe (ORTHEZ%) + sélection exacte
- [x] Options filtres contextuelles (dropdowns limités aux résultats filtrés)
- [x] Export XLSX respectant les deux couches de filtres (jusqu'à 50k lignes)
- [x] Suppression massive par lots de 100 (évite timeouts)
- [x] Cache React Query agressif (staleTime 30s-2min)
- [x] Index GIN trigram pour recherche rapide

### ✅ Phase 3 - Scoring IA (COMPLÉTÉE)
- [x] VivierScoringPanel avec barre de progression temps réel
- [x] Mode continu pour 114k+ leads
- [x] Parallélisation optimisée (BATCH_SIZE=100, CONCURRENCY=15)
- [x] Gemini-1.5-Flash-Lite pour scoring rapide
- [x] Seuil de qualification: 60/100
- [x] Statistiques: En attente, Élevé (≥70), Moyen (40-69), Faible (<40)

### ✅ Phase 4 - Listes & Segments (COMPLÉTÉE)
- [x] VivierListsPanel pour gestion des listes
- [x] SaveToListDialog pour sauvegarder sélections/filtres
- [x] Types de listes: Statique (IDs fixes) / Dynamique (critères JSON)
- [x] Synchronisation automatique des listes dynamiques
- [x] Navigation vers détail liste (/viviers/lists/:id)

### ✅ Phase 5 - Traçabilité (COMPLÉTÉE)
- [x] VivierActivityTimeline sur fiche lead
- [x] Historique des actions (création, enrichissement, scoring, ajout liste)
- [x] Ajout de notes manuelles dans activity_log
- [x] Champ "Notes" classique conservé pour mémo rapide

### ✅ Phase 6 - Enrichissement (COMPLÉTÉE)
- [x] usePappersVivierEnrich hook
- [x] Enrichissement unitaire via SIRET
- [x] VivierLegalDataCard pour affichage données légales
- [x] Edge function `pappers-lookup`

### ✅ Phase 7 - Campagnes (COMPLÉTÉE)
- [x] Table `vivier_campaigns` avec stats (sent, open, click, reply, bounce)
- [x] useVivierCampaigns hook (CRUD + stats)
- [x] CreateCampaignDialog
- [x] Page /viviers/campaigns (liste campagnes)
- [x] Intégration Instantly via webhooks (edge function `instantly-webhook`)
- [x] Calcul taux en temps réel

### 🔄 Phase 8 - En cours
- [ ] Génération IA de séquences email (vivier-campaign prompt)
- [ ] Prévisualisation email avec variables résolues
- [ ] Détection doublons cross-leads
- [ ] Analytics campagnes avancées

---

## 10. Architecture Implémentée

### 10.1 Pages (/viviers/*)

| Route | Fichier | Description |
|-------|---------|-------------|
| `/viviers` | ViviersDashboard.tsx | Dashboard principal avec stats et raccourcis |
| `/viviers/leads` | ViviersLeads.tsx | Liste leads avec filtres avancés et pagination |
| `/viviers/leads/:slug` | VivierLeadDetail.tsx | Fiche détail lead avec timeline |
| `/viviers/import` | ViviersImport.tsx | Import CSV/XLSX multi-fichiers |
| `/viviers/scoring` | ViviersScoring.tsx | Panel scoring IA avec config |
| `/viviers/campaigns` | ViviersCampaigns.tsx | Liste et gestion campagnes |
| `/viviers/settings` | ViviersSettings.tsx | Configuration API keys et domaines |

### 10.2 Composants (/components/viviers/)

| Composant | Description |
|-----------|-------------|
| VivierLayout.tsx | Layout principal avec sidebar |
| VivierSidebar.tsx | Navigation verticale module |
| VivierHeader.tsx | Header minimaliste |
| VivierTable.tsx | Table avec pagination + filtres colonnes |
| VivierFilters.tsx | Barre de filtres globaux (Couche 1) |
| CityAutocomplete.tsx | Autocomplete ville avec préfixe |
| VivierDetailSheet.tsx | Vue détail en sheet |
| VivierActivityTimeline.tsx | Timeline historique actions |
| VivierLegalDataCard.tsx | Card données légales Pappers |
| VivierScoringPanel.tsx | Panel scoring IA batch |
| VivierListsPanel.tsx | Gestion listes/segments |
| VivierAISearch.tsx | Recherche IA contextuelle |
| SaveToListDialog.tsx | Dialog sauvegarde liste |
| CreateCampaignDialog.tsx | Dialog création campagne |
| ProtectedVivierRoute.tsx | Guard authentification |

### 10.3 Hooks (/hooks/viviers/)

| Hook | Description |
|------|-------------|
| useViviers.ts | CRUD leads + pagination + stats + mutations |
| useVivier.ts | Récupération lead unique par ID |
| useVivierFilterOptions.ts | Options dynamiques pour dropdowns filtres |
| useCitySearch.ts | Recherche villes avec préfixe (autocomplete) |
| useVivierLists.ts | CRUD listes + sync dynamique |
| useVivierCampaigns.ts | CRUD campagnes + stats |
| usePappersVivierEnrich.ts | Enrichissement Pappers |

### 10.4 Optimisations Performance

| Technique | Implémentation |
|-----------|----------------|
| Pagination serveur | Range queries Supabase (25-200/page) |
| Filtres prefix | `city%`, `industry%` au lieu de `%city%` |
| Match exact ville | Autocomplete + `eq('city', value)` |
| Batch delete | Lots de 100 pour éviter URL limits |
| Cache agressif | staleTime 30s (liste), 2min (stats) |
| Select optimisé | Colonnes nécessaires uniquement |
| Count head-only | `select('*', { count: 'exact', head: true })` |

---

## 11. Références

- Instantly API V2: https://developer.instantly.ai/api/v2
- Instantly Leads: https://developer.instantly.ai/api/v2/lead
- Instantly Campaigns: https://developer.instantly.ai/api/v2/campaign
- Instantly Webhooks: https://developer.instantly.ai/webhooks
- Brevo API: https://developers.brevo.com/
- Pappers API: https://www.pappers.fr/api

---

## 12. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-01-04 | Spécification initiale |
| 1.1.0 | 2026-01-04 | Ajout scoring auto, doublons enrichissement, post-promotion suppression |
| 1.2.0 | 2026-01-04 | Module distinct /viviers, VivierLayout dédié, accès header Cockpit |
| 2.0.0 | 2026-01-04 | **AI-Powered** : intégration ai-prompts, 10 tools orchestrator, mode autonome, interface hybride |
| 2.1.0 | 2026-01-04 | **Campaigns** : intégration Brevo/Resend, multi-domaines, vivier-campaign, warm-up, RGPD |
| 2.2.0 | 2026-01-05 | **Instantly** : Dual-stack Instantly (cold) + Brevo (transac), 13 domaines satellites, séquences 3 steps, webhooks, 16 tools orchestrator |
| 3.0.0 | 2026-01-11 | **IMPLÉMENTÉ** : Toutes phases MVP complétées, filtrage optimisé (CityAutocomplete), scoring batch 114k+, listes dynamiques, timeline activité, campagnes Instantly |

---

**Document mis à jour le 2026-01-11 — IArche**
