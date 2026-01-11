# CDC Module Viviers Campaigns v1.0

> **Date**: 2026-01-11  
> **Statut**: Draft  
> **Priorité**: Phase 8 - Module Campagnes Outbound

---

## 1. Vue d'ensemble

### 1.1 Objectif
Système complet de gestion de campagnes email outbound pour la prospection, intégré au module Viviers. Permet de créer, personnaliser, planifier et suivre des campagnes d'emails de prospection avec analytics détaillées.

### 1.2 Flux utilisateur principal
```
Viviers (Leads qualifiés) 
    → Listes (Segments ciblés) 
        → Campagnes (Emails personnalisés)
            → Analytics (Suivi performance)
```

### 1.3 Personas cibles
- **Commercial** : Crée et envoie des campagnes de prospection
- **Marketing** : Analyse les performances et optimise les templates
- **Admin** : Configure les intégrations et gère les limites

---

## 2. Architecture technique

### 2.1 Structure des routes
```
/cockpit/viviers/campaigns                    # Liste des campagnes
/cockpit/viviers/campaigns/new                # Création campagne
/cockpit/viviers/campaigns/:slug              # Détail campagne
/cockpit/viviers/campaigns/:slug/edit         # Édition campagne
/cockpit/viviers/campaigns/:slug/recipients   # Liste recipients
/cockpit/viviers/campaigns/:slug/analytics    # Analytics détaillées
```

### 2.2 Composants principaux
```
src/pages/cockpit/viviers/
├── VivierCampaigns.tsx              # Liste (existant)
├── VivierCampaignDetail.tsx         # Détail campagne (NEW)
├── VivierCampaignEdit.tsx           # Édition (NEW)
├── VivierCampaignRecipients.tsx     # Recipients (NEW)
└── VivierCampaignAnalytics.tsx      # Analytics (NEW)

src/components/cockpit/viviers/campaigns/
├── CampaignHeader.tsx               # Header avec actions
├── CampaignStats.tsx                # Stats globales
├── CampaignEmailEditor.tsx          # Éditeur WYSIWYG (NEW)
├── CampaignVariables.tsx            # Gestion variables (NEW)
├── CampaignPreview.tsx              # Prévisualisation (NEW)
├── CampaignScheduler.tsx            # Planificateur (NEW)
├── CampaignRecipientsList.tsx       # Liste recipients (NEW)
├── CampaignHTMLGenerator.tsx        # Générateur HTML 4 thèmes (NEW)
├── CampaignTestSender.tsx           # Envoi test (NEW)
├── CampaignImportDialog.tsx         # Import manuel (NEW)
├── CreateCampaignDialog.tsx         # Dialog création (existant)
└── CampaignAnalyticsCharts.tsx      # Graphiques analytics (NEW)

src/hooks/
├── useVivierCampaigns.ts            # CRUD campagnes (existant)
├── useVivierCampaignDetail.ts       # Détail + recipients (NEW)
├── useVivierCampaignStats.ts        # Stats temps réel (NEW)
└── useVivierCampaignTest.ts         # Envoi test (NEW)
```

### 2.3 Schéma de données

#### Table `vivier_campaigns` (existante - à enrichir)
```sql
ALTER TABLE vivier_campaigns ADD COLUMN IF NOT EXISTS
  slug TEXT UNIQUE,                          -- Identifiant URL-friendly
  html_content TEXT,                         -- Contenu HTML complet
  text_content TEXT,                         -- Version texte brut
  template_theme TEXT DEFAULT 'bleu-nuit',   -- Thème du template
  variables JSONB DEFAULT '[]',              -- Variables dynamiques définies
  scheduled_at TIMESTAMPTZ,                  -- Date planifiée
  sent_at TIMESTAMPTZ,                       -- Date d'envoi effectif
  test_sent_at TIMESTAMPTZ,                  -- Dernier test envoyé
  test_recipients TEXT[],                    -- Emails de test
  sender_name TEXT DEFAULT 'IArche',         -- Nom expéditeur
  sender_email TEXT,                         -- Email expéditeur
  reply_to TEXT,                             -- Email de réponse
  daily_limit INTEGER DEFAULT 50,            -- Limite quotidienne
  import_source TEXT,                        -- Source import (manual, list, instantly)
  instantly_campaign_id TEXT,                -- ID campagne Instantly
  metadata JSONB DEFAULT '{}'                -- Métadonnées additionnelles
;

-- Index pour slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_vivier_campaigns_slug ON vivier_campaigns(slug);
```

#### Table `vivier_campaign_recipients` (nouvelle)
```sql
CREATE TABLE public.vivier_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES vivier_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  vivier_id UUID REFERENCES viviers(id) ON DELETE SET NULL,
  
  -- Données contact (snapshot au moment de l'ajout)
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  variables_data JSONB DEFAULT '{}',         -- Données pour variables dynamiques
  
  -- Statuts
  status TEXT DEFAULT 'pending',             -- pending, sent, opened, clicked, replied, bounced, unsubscribed
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_reason TEXT,
  
  -- Tracking
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  click_urls JSONB DEFAULT '[]',             -- URLs cliquées
  
  -- Import
  import_batch_id TEXT,                      -- ID batch d'import
  source TEXT DEFAULT 'list',                -- list, manual, import
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(campaign_id, email)
);

-- Index performance
CREATE INDEX idx_vcr_campaign ON vivier_campaign_recipients(campaign_id);
CREATE INDEX idx_vcr_status ON vivier_campaign_recipients(status);
CREATE INDEX idx_vcr_lead ON vivier_campaign_recipients(lead_id);
CREATE INDEX idx_vcr_email ON vivier_campaign_recipients(email);

-- RLS
ALTER TABLE vivier_campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage campaign recipients"
  ON vivier_campaign_recipients FOR ALL TO authenticated USING (true);
```

#### Table `vivier_campaign_events` (nouvelle - tracking détaillé)
```sql
CREATE TABLE public.vivier_campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES vivier_campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES vivier_campaign_recipients(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL,                  -- sent, opened, clicked, replied, bounced
  event_data JSONB DEFAULT '{}',             -- Données spécifiques (URL cliquée, etc.)
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vce_campaign ON vivier_campaign_events(campaign_id);
CREATE INDEX idx_vce_type ON vivier_campaign_events(event_type);
CREATE INDEX idx_vce_created ON vivier_campaign_events(created_at);

ALTER TABLE vivier_campaign_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view campaign events"
  ON vivier_campaign_events FOR SELECT TO authenticated USING (true);
```

---

## 3. Fonctionnalités détaillées

### 3.1 Page Détail Campagne (`/viviers/campaigns/:slug`)

#### Interface
```
┌─────────────────────────────────────────────────────────────────┐
│ ← Retour    [Campagne: Black Friday 2026]           [🔧] [▶ Envoyer]│
├─────────────────────────────────────────────────────────────────┤
│ Stats rapides:  📧 1,250 recipients │ ✅ 45% open │ 🖱️ 12% click  │
├─────────────────────────────────────────────────────────────────┤
│  [📝 Contenu]  [👥 Recipients]  [📊 Analytics]  [⚙️ Paramètres]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Sujet: Découvrez notre offre exclusive Black Friday              │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    APERÇU EMAIL                              │  │
│  │  [Desktop] [Mobile] [HTML brut]                              │  │
│  │                                                              │  │
│  │  Bonjour {{prenom}},                                         │  │
│  │                                                              │  │
│  │  Chez {{entreprise}}, nous savons que...                     │  │
│  │                                                              │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Variables utilisées: prenom, entreprise, secteur                 │
│                                                                   │
│  [✏️ Modifier]  [📧 Envoyer test]  [📋 Dupliquer]                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### Composants
- **CampaignHeader** : Titre, statut, actions principales
- **CampaignQuickStats** : Métriques temps réel
- **CampaignTabs** : Navigation entre sections
- **CampaignPreview** : Aperçu responsive (desktop/mobile/HTML)

### 3.2 Éditeur Email WYSIWYG

#### Fonctionnalités
- Éditeur riche basé sur TipTap ou Quill (réutiliser LazyQuill existant)
- Insertion de variables dynamiques via bouton dédié
- Templates prédéfinis par thème
- Mode source HTML pour édition avancée
- Auto-save toutes les 30 secondes

#### Variables dynamiques supportées
```typescript
interface CampaignVariable {
  key: string;           // Ex: "prenom"
  label: string;         // Ex: "Prénom"
  source: 'lead' | 'vivier' | 'custom';
  field?: string;        // Champ source (ex: "name")
  fallback?: string;     // Valeur par défaut
}

// Variables système
const SYSTEM_VARIABLES: CampaignVariable[] = [
  { key: 'prenom', label: 'Prénom', source: 'lead', field: 'name' },
  { key: 'nom', label: 'Nom complet', source: 'lead', field: 'name' },
  { key: 'email', label: 'Email', source: 'lead', field: 'email' },
  { key: 'entreprise', label: 'Entreprise', source: 'lead', field: 'company' },
  { key: 'poste', label: 'Poste', source: 'lead', field: 'position' },
  { key: 'secteur', label: 'Secteur', source: 'vivier', field: 'secteur_activite' },
  { key: 'ville', label: 'Ville', source: 'vivier', field: 'ville' },
  { key: 'date_jour', label: 'Date du jour', source: 'custom' },
  { key: 'unsubscribe_link', label: 'Lien désinscription', source: 'custom' },
];
```

#### Interface insertion variable
```
┌─────────────────────────────────┐
│ Insérer une variable            │
├─────────────────────────────────┤
│ 🔍 Rechercher...                │
├─────────────────────────────────┤
│ 📋 Données contact              │
│   {{prenom}} - Prénom           │
│   {{entreprise}} - Entreprise   │
│   {{poste}} - Poste             │
├─────────────────────────────────┤
│ 🏢 Données vivier               │
│   {{secteur}} - Secteur         │
│   {{ville}} - Ville             │
├─────────────────────────────────┤
│ ⚙️ Système                      │
│   {{date_jour}} - Date du jour  │
│   {{unsubscribe_link}} - Lien   │
└─────────────────────────────────┘
```

### 3.3 Générateur HTML 4 Thèmes

> Réutiliser et adapter le composant `BrevoHTMLEditor` de `/admin/emails`

#### Thèmes disponibles
1. **Bleu Nuit** : Fond sombre (#1a1f36), accents bleu électrique
2. **Blanc Cassé** : Fond clair (#f8f7f4), typographie élégante
3. **Terracotta** : Tons chauds, style moderne
4. **Minimaliste** : Noir et blanc, épuré

#### Interface
```
┌─────────────────────────────────────────────────────────────────┐
│ Générateur de Template                                           │
├─────────────────────────────────────────────────────────────────┤
│ Thème: [Bleu Nuit ▼]  Logo: [IArche ▼]  CTA: [Découvrir ▼]      │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌─────────────────────────────────────┐│
│ │                     │  │ <!-- Code HTML généré -->            ││
│ │   APERÇU LIVE       │  │ <!DOCTYPE html>                      ││
│ │                     │  │ <html>                               ││
│ │   [Logo IArche]     │  │   <head>...</head>                   ││
│ │                     │  │   <body style="background:          ││
│ │   Votre contenu     │  │     #1a1f36">                        ││
│ │   ici...            │  │   ...                                ││
│ │                     │  │                                      ││
│ │   [Bouton CTA]      │  │                                      ││
│ │                     │  │                                      ││
│ └─────────────────────┘  └─────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                    [Copier HTML]  [Appliquer à la campagne]      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Import Manuel de Recipients

#### Sources d'import
1. **Depuis une liste Viviers** (existant)
2. **Import CSV/Excel** (nouveau)
3. **Saisie manuelle** (nouveau)
4. **Copier-coller emails** (nouveau)

#### Dialog Import
```
┌─────────────────────────────────────────────────────────────────┐
│ Importer des recipients                                    [X]   │
├─────────────────────────────────────────────────────────────────┤
│ [📋 Liste Viviers] [📤 Fichier CSV] [✍️ Manuel] [📝 Coller]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Mode: Coller des emails                                          │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ Collez vos emails (un par ligne ou séparés par virgules)    │  │
│ │                                                              │  │
│ │ jean.dupont@exemple.fr                                       │  │
│ │ marie.martin@societe.com                                     │  │
│ │ contact@startup.io                                           │  │
│ │                                                              │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ✅ 3 emails valides détectés                                     │
│ ⚠️ 1 email en doublon ignoré                                     │
│                                                                   │
│ Options:                                                          │
│ ☑️ Ignorer les doublons existants                                │
│ ☑️ Créer les leads automatiquement                               │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                              [Annuler]  [Importer 3 recipients]   │
└─────────────────────────────────────────────────────────────────┘
```

#### Mapping CSV
```typescript
interface CSVImportMapping {
  email: string;          // Colonne email (obligatoire)
  name?: string;          // Colonne nom
  company?: string;       // Colonne entreprise
  customFields?: Record<string, string>; // Champs personnalisés → variables
}
```

### 3.5 Email de Test

#### Fonctionnalité
- Envoyer un email test avant validation
- Choix du destinataire test (email personnel ou sélection)
- Aperçu avec variables remplacées par données fictives
- Historique des tests envoyés

#### Interface
```
┌─────────────────────────────────────────────────────────────────┐
│ Envoyer un email de test                                   [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Email destinataire test:                                         │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ votre@email.com                                              │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ Données de test pour les variables:                              │
│ ┌───────────────┬─────────────────────────────────────────────┐  │
│ │ {{prenom}}    │ Jean                                        │  │
│ │ {{entreprise}}│ Acme Corp                                   │  │
│ │ {{secteur}}   │ SaaS B2B                                    │  │
│ └───────────────┴─────────────────────────────────────────────┘  │
│                                                                   │
│ ☑️ Enregistrer comme destinataire test par défaut               │
│                                                                   │
│ Derniers tests:                                                  │
│ • 10:45 - votre@email.com ✅ Envoyé                              │
│ • 09:30 - autre@test.com ✅ Envoyé                               │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                              [Annuler]  [📧 Envoyer le test]      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.6 Planificateur

#### Fonctionnalités
- Planifier envoi à date/heure spécifique
- Respect du fuseau horaire (Europe/Paris)
- Étalement sur plusieurs jours (si > limite quotidienne)
- Annulation possible avant envoi

#### Interface
```
┌─────────────────────────────────────────────────────────────────┐
│ Planifier l'envoi                                          [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 📅 Date d'envoi:        🕐 Heure:                                │
│ ┌─────────────────┐     ┌─────────────────┐                      │
│ │ 15/01/2026      │     │ 09:00           │                      │
│ └─────────────────┘     └─────────────────┘                      │
│                                                                   │
│ ℹ️ Fuseau horaire: Europe/Paris                                  │
│                                                                   │
│ ⚙️ Paramètres d'envoi:                                           │
│ • Recipients: 1,250                                              │
│ • Limite quotidienne: 50 emails/jour                             │
│ • Durée estimée: 25 jours                                        │
│                                                                   │
│ 📊 Calendrier prévisionnel:                                      │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ Jour 1 (15/01): 50 envois                                    │  │
│ │ Jour 2 (16/01): 50 envois                                    │  │
│ │ ...                                                          │  │
│ │ Jour 25 (08/02): 50 envois (fin)                             │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                        [Annuler]  [📅 Planifier pour le 15/01]    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.7 Analytics

#### Métriques principales
```typescript
interface CampaignAnalytics {
  // Globales
  total_recipients: number;
  total_sent: number;
  total_pending: number;
  
  // Engagement
  opens: number;
  open_rate: number;           // opens / sent * 100
  unique_opens: number;
  
  clicks: number;
  click_rate: number;          // clicks / opens * 100
  unique_clicks: number;
  
  replies: number;
  reply_rate: number;          // replies / sent * 100
  
  // Problèmes
  bounces: number;
  bounce_rate: number;
  unsubscribes: number;
  
  // Temporel
  opens_by_hour: Record<string, number>;
  clicks_by_day: Record<string, number>;
  
  // Top performers
  top_clicked_links: Array<{ url: string; clicks: number }>;
  best_open_time: string;      // "Mardi 10h"
}
```

#### Interface Dashboard Analytics
```
┌─────────────────────────────────────────────────────────────────┐
│ Analytics - Campagne Black Friday                                │
├─────────────────────────────────────────────────────────────────┤
│ Période: [Depuis le début ▼]                    [📥 Exporter]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│ │  1,250  │ │   850   │ │  45.2%  │ │  12.3%  │ │   3.1%  │     │
│ │Recipients│ │ Envoyés │ │  Opens  │ │ Clicks  │ │ Replies │     │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘     │
│                                                                   │
│ 📈 Évolution des ouvertures                                      │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │     ▂▄█▆▄▂                                                   │  │
│ │   ▂▄██████▄▂                                                 │  │
│ │ ▂▄████████████▄▂▂▂▂                                          │  │
│ │ Lun  Mar  Mer  Jeu  Ven  Sam  Dim                            │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ 🔗 Liens les plus cliqués                                        │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 1. iarche.fr/offre-black-friday          156 clics (72%)     │  │
│ │ 2. iarche.fr/demo                         42 clics (19%)     │  │
│ │ 3. iarche.fr/contact                      19 clics (9%)      │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ⏰ Meilleurs moments d'ouverture                                 │
│ • Jour: Mardi (28% des ouvertures)                               │
│ • Heure: 10h-11h (34% des ouvertures)                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.8 Liste Recipients avec Statuts

#### Interface
```
┌─────────────────────────────────────────────────────────────────┐
│ Recipients (1,250)                              [+ Importer]     │
├─────────────────────────────────────────────────────────────────┤
│ 🔍 Rechercher...    Statut: [Tous ▼]    [📥 Exporter]            │
├─────────────────────────────────────────────────────────────────┤
│ ☑️ │ Email                  │ Nom        │ Statut    │ Actions  │
├───┼────────────────────────┼────────────┼───────────┼──────────┤
│ ☐ │ jean@acme.fr           │ J. Dupont  │ ✅ Ouvert │ 👁️ 📧    │
│ ☐ │ marie@startup.io       │ M. Martin  │ 🖱️ Cliqué │ 👁️ 📧    │
│ ☐ │ contact@corp.com       │ -          │ 📨 Envoyé │ 👁️ 📧    │
│ ☐ │ info@bounce.test       │ -          │ ❌ Bounce │ 👁️ 🗑️    │
│ ☐ │ lead@pending.com       │ P. Pending │ ⏳ Attente│ 👁️ 🗑️    │
├─────────────────────────────────────────────────────────────────┤
│ [☑️ Sélectionner tout]  Actions groupées: [Supprimer] [Renvoyer]│
└─────────────────────────────────────────────────────────────────┘
```

#### Statuts recipients
| Statut | Icône | Description |
|--------|-------|-------------|
| `pending` | ⏳ | En attente d'envoi |
| `sent` | 📨 | Email envoyé |
| `opened` | ✅ | Email ouvert (au moins 1x) |
| `clicked` | 🖱️ | Lien cliqué |
| `replied` | 💬 | Réponse reçue |
| `bounced` | ❌ | Bounce (email invalide) |
| `unsubscribed` | 🚫 | Désinscrit |

---

## 4. Edge Functions

### 4.1 `send-vivier-campaign-test`
Envoi d'un email de test avec données fictives.

```typescript
// Input
{
  campaign_id: string;
  test_email: string;
  test_data: Record<string, string>;  // Variables de test
}

// Output
{
  success: boolean;
  message_id?: string;
  error?: string;
}
```

### 4.2 `send-vivier-campaign-batch`
Envoi par batch des emails de campagne.

```typescript
// Input
{
  campaign_id: string;
  batch_size?: number;  // Default 50
}

// Output
{
  sent: number;
  failed: number;
  remaining: number;
  errors: Array<{ email: string; error: string }>;
}
```

### 4.3 `vivier-campaign-webhook`
Réception des événements de tracking (opens, clicks, bounces).

```typescript
// Input (webhook payload)
{
  event_type: 'open' | 'click' | 'bounce' | 'reply' | 'unsubscribe';
  recipient_email: string;
  campaign_id?: string;
  metadata: {
    url?: string;        // Pour clicks
    ip?: string;
    user_agent?: string;
  };
}
```

### 4.4 `import-vivier-recipients`
Import de recipients depuis CSV ou liste manuelle.

```typescript
// Input
{
  campaign_id: string;
  source: 'csv' | 'manual' | 'paste';
  data: string | Array<{ email: string; name?: string; company?: string }>;
  options: {
    skip_duplicates: boolean;
    create_leads: boolean;
  };
}

// Output
{
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}
```

---

## 5. Intégrations

### 5.1 Resend (Email transactionnel)
- Envoi des emails de campagne
- Tracking opens/clicks via pixel et liens
- Gestion des bounces

### 5.2 Instantly (optionnel)
- Synchronisation bidirectionnelle
- Webhook pour statuts
- Import/export campagnes

---

## 6. Sécurité et Limites

### 6.1 Rate Limiting
- Max 50 emails/jour par campagne (configurable)
- Délai minimum entre envois: 30 secondes
- Quota global workspace: 1000 emails/jour

### 6.2 Validation
- Vérification format email
- Détection doublons
- Blacklist domaines jetables
- Vérification consentement RGPD

### 6.3 Désinscription
- Lien obligatoire dans chaque email
- Page de désinscription hébergée
- Mise à jour automatique statut

---

## 7. Plan d'implémentation

### Phase 8.1 - Fondations (Jour 1-2)
- [ ] Migration base de données
- [ ] Page détail campagne basique
- [ ] Hook `useVivierCampaignDetail`

### Phase 8.2 - Éditeur & Preview (Jour 3-4)
- [ ] Composant `CampaignEmailEditor`
- [ ] Gestion variables dynamiques
- [ ] Prévisualisation responsive
- [ ] Générateur HTML 4 thèmes

### Phase 8.3 - Recipients (Jour 5-6)
- [ ] Liste recipients avec statuts
- [ ] Import manuel/CSV
- [ ] Dialog import

### Phase 8.4 - Test & Planification (Jour 7)
- [ ] Edge function `send-vivier-campaign-test`
- [ ] Composant `CampaignTestSender`
- [ ] Composant `CampaignScheduler`

### Phase 8.5 - Analytics (Jour 8-9)
- [ ] Page analytics dédiée
- [ ] Graphiques Recharts
- [ ] Export données

### Phase 8.6 - Intégration & Polish (Jour 10)
- [ ] Edge function envoi batch
- [ ] Webhook tracking
- [ ] Tests E2E
- [ ] Documentation

---

## 8. Critères de validation

### Fonctionnel
- [ ] Création campagne avec import recipients
- [ ] Édition contenu avec variables
- [ ] Prévisualisation 4 thèmes
- [ ] Email test fonctionnel
- [ ] Planification d'envoi
- [ ] Analytics temps réel

### Technique
- [ ] Performance < 200ms chargement page
- [ ] RLS correctement configuré
- [ ] Logs edge functions
- [ ] Gestion erreurs complète

### UX
- [ ] Interface intuitive
- [ ] Feedback temps réel
- [ ] Mobile responsive
- [ ] Accessibilité (a11y)

---

**Document maintenu par**: Équipe Cockpit  
**Dernière mise à jour**: 2026-01-11
