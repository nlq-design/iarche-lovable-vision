# Cahier des Charges — Module Upload Cockpit

**Version** : 1.2.0  
**Date** : 2026-01-01  
**Statut** : 🔵 À IMPLÉMENTER  
**Priorité** : Haute

---

## 1. Vue d'ensemble

### 1.1 Objectif
Créer un module centralisé d'upload de fichiers dans le Cockpit permettant :
- L'import de documents variés (PDF, DOCX, TXT, fichiers texte collés)
- La liaison multi-entités (Projets, Solutions, Leads, Documents générés)
- L'analyse IA automatique avec extraction de contenu et OCR
- Le stockage sécurisé avec gestion des fichiers volumineux

### 1.2 Route
`/cockpit/upload`

### 1.3 Intégrations
| Module | Route | Type de liaison |
|--------|-------|-----------------|
| Projets | `/cockpit/projects` | FK `project_id` |
| Solutions | `/cockpit/solutions` | FK `solution_id` (via articles) |
| Leads | `/cockpit/leads` | FK `lead_id` |
| Documents | `/cockpit/documents` | FK `generated_document_id` |

---

## 2. ANALYSE TECHNIQUE EXPERTE

### 2.1 Contraintes Identifiées

#### 🔴 C1 — Limite Storage Supabase (CRITIQUE)
| Aspect | Contrainte | Impact |
|--------|-----------|--------|
| Upload direct | 6 MB max par défaut via REST API | Fichiers > 6 MB échouent silencieusement |
| Resumable upload | Requis pour fichiers > 6 MB | Complexité implémentation |
| Timeout Edge Function | 60s max (plan gratuit) | Fichiers volumineux = timeout |

**Solution préconisée :**
```typescript
// Stratégie upload adaptatif
if (fileSize < 5 * 1024 * 1024) {
  // Upload direct via supabase.storage.upload()
} else {
  // Resumable upload via TUS protocol
  // Supabase supporte TUS nativement
  const { data } = await supabase.storage
    .from('cockpit-uploads')
    .createSignedUploadUrl(path);
  // Client-side chunked upload
}
```

#### 🔴 C2 — Extraction PDF/DOCX côté Edge Function (CRITIQUE)
| Aspect | Contrainte | Impact |
|--------|-----------|--------|
| Deno runtime | Pas de `pdf-parse` natif | Impossible d'extraire PDF en Edge |
| Bibliothèques Node.js | Non compatibles Deno | Pas de `mammoth` pour DOCX |
| Mémoire limitée | 512 MB max Edge Function | OOM sur gros fichiers |

**Solutions préconisées :**

| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| **A. OCR LLM externe** | APIs déjà configurées, précision élevée | Coût tokens |
| **B. Client-side extraction** | Pas de latence serveur | Sécurité moindre, JS uniquement |
| **C. pdf.js + mammoth.js (Client)** | Gratuit, contrôle total | Implémentation complexe |

**Recommandation : Option C (Client-side) + fallback Option A (OCR LLM)**
```typescript
// 1. Extraire le texte côté client avec pdf.js / mammoth.js
// 2. Envoyer le texte extrait à l'Edge Function
// 3. Si extraction échoue (PDF scanné/image), fallback OCR via LLM Vision
```

#### 🔴 C3 — OCR pour documents scannés et images (NOUVEAU)
| Aspect | Solution | Configuration |
|--------|----------|---------------|
| PDF scannés | LLM Vision API | OPENAI_API_KEY / ANTHROPIC_API_KEY configurés |
| Images (JPG, PNG, WEBP) | LLM Vision API | GPT-4 Vision ou Claude Vision |
| Documents manuscrits | LLM Vision API | Haute précision OCR |

**Stratégie OCR via LLM externes (APIs déjà configurées) :**

```typescript
// Secrets disponibles dans l'environnement Supabase :
// - OPENAI_API_KEY ✅
// - ANTHROPIC_API_KEY ✅
// - OPENROUTER_API_KEY ✅

interface OCRStrategy {
  provider: 'openai' | 'anthropic' | 'openrouter';
  model: string;
  capability: string;
}

const OCR_PROVIDERS: OCRStrategy[] = [
  {
    provider: 'openai',
    model: 'gpt-4o',
    capability: 'Vision + OCR haute précision, extraction structurée'
  },
  {
    provider: 'anthropic', 
    model: 'claude-3-5-sonnet-20241022',
    capability: 'Vision + OCR, excellent pour documents complexes'
  },
  {
    provider: 'openrouter',
    model: 'anthropic/claude-3-5-sonnet',
    capability: 'Fallback via OpenRouter si quota dépassé'
  }
];

// Implémentation Edge Function
async function extractTextWithOCR(imageBase64: string, mimeType: string): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extrais TOUT le texte visible dans cette image/document de manière fidèle et structurée.
              
Règles :
- Conserve la mise en forme (titres, listes, tableaux)
- Transcris les tableaux en format Markdown
- Indique [illisible] pour les passages non déchiffrables
- Ne résume pas, extrais verbatim`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0
    })
  });

  const result = await response.json();
  return result.choices[0].message.content;
}
```

**Fallback Anthropic Claude :**
```typescript
async function extractTextWithClaudeOCR(imageBase64: string, mimeType: string): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: `Extrais TOUT le texte de ce document de manière fidèle et structurée. 
Conserve la mise en forme originale. Transcris les tableaux en Markdown.`
            }
          ]
        }
      ]
    })
  });

  const result = await response.json();
  return result.content[0].text;
}
```

#### 🟡 C4 — Traitement asynchrone obligatoire
| Aspect | Contrainte | Impact |
|--------|-----------|--------|
| UX bloquante | Analyse IA peut prendre 30-60s | Utilisateur attend |
| Timeout client | Fetch timeout par défaut ~30s | Erreur côté front |

**Solution : Architecture événementielle**
```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Client     │────▶│  Upload + Insert │────▶│  Webhook/Trigger │
│   Upload     │     │  status=pending  │     │  process-file    │
└──────────────┘     └──────────────────┘     └──────────────────┘
                                                      │
                              ┌───────────────────────┘
                              ▼
                     ┌──────────────────┐
                     │  Update record   │
                     │  status=completed│
                     └──────────────────┘
```

#### 🟡 C5 — Duplication potentielle fichiers
| Aspect | Contrainte | Impact |
|--------|-----------|--------|
| Même fichier uploadé 2x | Hash non vérifié | Stockage gaspillé |
| Même contenu, nom différent | Pas de déduplication | Doublons invisibles |

**Solution : Hash SHA-256**
```sql
ALTER TABLE uploaded_files ADD COLUMN content_hash TEXT;
CREATE UNIQUE INDEX idx_uploaded_files_hash ON uploaded_files(content_hash) WHERE content_hash IS NOT NULL;
```

#### 🟡 C6 — Quotas et limites workspace
| Aspect | Contrainte | Impact |
|--------|-----------|--------|
| Pas de limite définie | Un workspace peut saturer le bucket | Coûts imprévus |

**Solution : Champs quota**
```sql
ALTER TABLE workspaces ADD COLUMN storage_quota_bytes BIGINT DEFAULT 5368709120; -- 5 GB
ALTER TABLE workspaces ADD COLUMN storage_used_bytes BIGINT DEFAULT 0;

-- Trigger pour mise à jour automatique
CREATE OR REPLACE FUNCTION update_workspace_storage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workspaces 
  SET storage_used_bytes = storage_used_bytes + NEW.file_size_bytes
  WHERE id = NEW.workspace_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 🟢 C7 — Formats non supportés
| Format | Solution |
|--------|----------|
| Images (JPG, PNG, WEBP) | OCR via GPT-4 Vision / Claude Vision |
| PDF scannés | OCR via LLM Vision (détection automatique) |
| Excel (XLSX) | SheetJS client-side |
| Archives (ZIP) | Décompression client |

---

### 2.2 Dépendances Existantes à Réutiliser

| Composant existant | Réutilisation | Module source |
|-------------------|---------------|---------------|
| `FileUploader` | Zone drag & drop cockpit | `src/components/cockpit/FileUploader.tsx` |
| `process-voice-transcription` | Pattern async processing | Edge Function |
| `voice-transcriptions` bucket | Pattern RLS storage | Supabase Storage |
| `useCockpitProjectDocuments` | Pattern hook CRUD | Hooks cockpit |

### 2.3 APIs LLM déjà configurées (pour OCR)

| Secret | Provider | Modèle Vision | Statut |
|--------|----------|---------------|--------|
| `OPENAI_API_KEY` | OpenAI | GPT-4o / GPT-4 Vision | ✅ Configuré |
| `ANTHROPIC_API_KEY` | Anthropic | Claude 3.5 Sonnet Vision | ✅ Configuré |
| `OPENROUTER_API_KEY` | OpenRouter | Multi-providers | ✅ Configuré |

---

## 3. SUGGESTIONS EXPERT — FONCTIONNALITÉS COMPLÉMENTAIRES

### 3.1 🚀 Intégration Agent IA (HAUTE VALEUR)

Connecter le module Upload à l'Agent IA existant via de nouveaux outils :

```typescript
// Nouveaux outils Agent pour uploaded_files
const uploadTools = [
  {
    name: "get_uploaded_files",
    level: "N0",
    description: "Liste les fichiers uploadés avec filtres (projet, lead, solution, statut)"
  },
  {
    name: "analyze_uploaded_file",
    level: "N1", 
    description: "Lance/relance l'analyse IA sur un fichier existant"
  },
  {
    name: "link_file_to_entity",
    level: "N1",
    description: "Lie un fichier à une nouvelle entité (projet, lead, solution)"
  },
  {
    name: "search_in_files",
    level: "N0",
    description: "Recherche sémantique dans le contenu extrait des fichiers"
  }
];
```

### 3.2 📄 Génération automatique de documents

Si un fichier est un brief/demande client :
1. Détection automatique du type (brief, RFP, specs client)
2. Proposition de génération CDC/Devis basé sur le contenu
3. Pré-remplissage des champs dans `/cockpit/documents`

```typescript
// ai_metadata enrichi
interface AIFileMetadata {
  document_type: 'brief' | 'rfp' | 'specs' | 'contract' | 'report' | 'other';
  detected_entities: {
    companies: string[];
    people: string[];
    dates: string[];
    amounts: { value: number; currency: string }[];
  };
  suggested_actions: {
    type: 'generate_quote' | 'create_project' | 'schedule_meeting';
    context: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  key_requirements: string[];
  estimated_budget_range?: { min: number; max: number };
}
```

### 3.3 🔗 Versioning de fichiers

Gérer les versions d'un même document :

```sql
ALTER TABLE uploaded_files ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE uploaded_files ADD COLUMN parent_file_id UUID REFERENCES uploaded_files(id);
ALTER TABLE uploaded_files ADD COLUMN is_latest BOOLEAN DEFAULT true;

-- Index pour récupérer la dernière version
CREATE INDEX idx_uploaded_files_latest ON uploaded_files(parent_file_id, is_latest) WHERE is_latest = true;
```

### 3.4 📊 Embeddings pour recherche sémantique

Réutiliser l'architecture RAG existante :

```sql
-- Lier uploaded_files à resource_embeddings existant
ALTER TABLE resource_embeddings ADD COLUMN uploaded_file_id UUID REFERENCES uploaded_files(id);

-- Ou nouvelle table dédiée si volume important
CREATE TABLE file_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_file_id UUID NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content_chunk TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_file_embeddings_vector ON file_embeddings USING ivfflat (embedding vector_cosine_ops);
```

### 3.5 🔔 Notifications et Activity Log

Intégration avec le système de notifications existant :

```sql
-- Trigger pour activity_log sur upload
CREATE OR REPLACE FUNCTION log_file_upload()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (
    workspace_id,
    entity_type,
    entity_id,
    activity_type,
    title,
    content,
    pending_ai_review,
    metadata
  ) VALUES (
    NEW.workspace_id,
    'uploaded_file',
    NEW.id,
    'new_upload',
    'Nouveau fichier : ' || NEW.original_filename,
    'Fichier ' || NEW.file_type || ' uploadé',
    true, -- Pour que l'agent soit notifié
    jsonb_build_object('file_type', NEW.file_type, 'file_size', NEW.file_size_bytes)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_file_upload
  AFTER INSERT ON uploaded_files
  FOR EACH ROW EXECUTE FUNCTION log_file_upload();
```

### 3.6 📱 Partage et liens publics

Permettre le partage sécurisé de fichiers :

```sql
ALTER TABLE uploaded_files ADD COLUMN share_token TEXT UNIQUE;
ALTER TABLE uploaded_files ADD COLUMN share_expires_at TIMESTAMPTZ;
ALTER TABLE uploaded_files ADD COLUMN share_password_hash TEXT;
ALTER TABLE uploaded_files ADD COLUMN download_count INTEGER DEFAULT 0;

-- Génération token sécurisé
CREATE OR REPLACE FUNCTION generate_share_link(file_id UUID, expires_in_days INTEGER DEFAULT 7)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token TEXT;
BEGIN
  token := encode(gen_random_bytes(32), 'hex');
  UPDATE uploaded_files 
  SET share_token = token,
      share_expires_at = now() + (expires_in_days || ' days')::interval
  WHERE id = file_id;
  RETURN token;
END;
$$;
```

### 3.7 🏷️ Tags et catégorisation

Système de tags pour organisation :

```sql
ALTER TABLE uploaded_files ADD COLUMN tags TEXT[] DEFAULT '{}';
ALTER TABLE uploaded_files ADD COLUMN category TEXT; -- 'commercial', 'technique', 'juridique', 'rh'

CREATE INDEX idx_uploaded_files_tags ON uploaded_files USING GIN(tags);
```

### 3.8 📈 Analytics fichiers

Métriques d'utilisation :

```sql
CREATE TABLE file_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_file_id UUID REFERENCES uploaded_files(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'view', 'download', 'share', 'reanalyze'
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_file_analytics_file ON file_analytics(uploaded_file_id, created_at DESC);
```

---

## 4. Architecture Technique Révisée

### 4.1 Table `uploaded_files` (Enrichie)

```sql
CREATE TABLE public.uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  
  -- Métadonnées fichier
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'txt', 'pasted_text', 'xlsx', 'image'
  mime_type TEXT,
  file_size_bytes BIGINT,
  storage_path TEXT, -- Chemin dans le bucket Storage
  content_hash TEXT, -- SHA-256 pour déduplication
  
  -- Versioning
  version INTEGER DEFAULT 1,
  parent_file_id UUID REFERENCES uploaded_files(id),
  is_latest BOOLEAN DEFAULT true,
  
  -- Contenu extrait par IA
  extracted_content TEXT, -- Texte brut extrait
  ai_summary TEXT, -- Résumé IA
  ai_metadata JSONB DEFAULT '{}', -- Tags, entités détectées, actions suggérées
  
  -- OCR
  ocr_required BOOLEAN DEFAULT false, -- Indique si OCR a été nécessaire
  ocr_provider TEXT, -- 'openai', 'anthropic', 'openrouter'
  ocr_confidence FLOAT, -- Score de confiance OCR
  
  -- Liaisons multi-entités (toutes optionnelles, MULTI possible)
  project_ids UUID[] DEFAULT '{}', -- Plusieurs projets possibles
  solution_ids UUID[] DEFAULT '{}', -- Plusieurs solutions possibles
  lead_ids UUID[] DEFAULT '{}', -- Plusieurs leads possibles
  generated_document_id UUID REFERENCES generated_documents(id) ON DELETE SET NULL,
  
  -- Catégorisation
  category TEXT, -- 'commercial', 'technique', 'juridique', 'rh', 'autre'
  tags TEXT[] DEFAULT '{}',
  
  -- Partage
  share_token TEXT UNIQUE,
  share_expires_at TIMESTAMPTZ,
  share_password_hash TEXT,
  download_count INTEGER DEFAULT 0,
  
  -- Statut traitement
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed, needs_ocr
  processing_error TEXT,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  
  -- Audit
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_uploaded_files_workspace ON uploaded_files(workspace_id);
CREATE INDEX idx_uploaded_files_projects ON uploaded_files USING GIN(project_ids);
CREATE INDEX idx_uploaded_files_leads ON uploaded_files USING GIN(lead_ids);
CREATE INDEX idx_uploaded_files_solutions ON uploaded_files USING GIN(solution_ids);
CREATE INDEX idx_uploaded_files_status ON uploaded_files(processing_status);
CREATE INDEX idx_uploaded_files_category ON uploaded_files(category);
CREATE INDEX idx_uploaded_files_tags ON uploaded_files USING GIN(tags);
CREATE INDEX idx_uploaded_files_hash ON uploaded_files(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX idx_uploaded_files_latest ON uploaded_files(parent_file_id, is_latest) WHERE is_latest = true;
```

### 4.2 Bucket Storage
- **Nom** : `cockpit-uploads`
- **Public** : Non (accès via RLS + signed URLs)
- **Limite fichier** : 50 MB (configurable)
- **Types acceptés** : PDF, DOCX, DOC, TXT, MD, RTF, ODT, XLSX, XLS, JPG, PNG, WEBP

### 4.3 RLS Policies
```sql
-- Lecture : utilisateurs cockpit avec accès workspace
CREATE POLICY "uploaded_files_select" ON uploaded_files
  FOR SELECT USING (can_access_entity_workspace(workspace_id, auth.uid()));

-- Insert : utilisateurs cockpit
CREATE POLICY "uploaded_files_insert" ON uploaded_files
  FOR INSERT WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));

-- Update : utilisateurs cockpit
CREATE POLICY "uploaded_files_update" ON uploaded_files
  FOR UPDATE USING (can_access_entity_workspace(workspace_id, auth.uid()));

-- Delete : admin cockpit uniquement
CREATE POLICY "uploaded_files_delete" ON uploaded_files
  FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'));
```

---

## 5. Flux Utilisateur

### 5.1 Upload de fichier

```
┌─────────────────────────────────────────────────────────────┐
│                    /cockpit/upload                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Zone de dépôt (Drag & Drop)                        │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  📁 Glissez vos fichiers ici ou cliquez             │   │
│  │     PDF, DOCX, TXT, XLSX, Images • Max 50 MB        │   │
│  │     ⚡ Upload en cours : [████████░░] 80%           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  OU                                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📝 Coller du texte                                  │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  [Zone de texte multi-lignes]                       │   │
│  │  Compteur : 2,345 caractères                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│  LIER À (multi-sélection possible) :                       │
│                                                             │
│  ☑ Projets   [Multi-select: Projet A, Projet B     ▼]     │
│  ☐ Solutions [Multi-select: Solution 1             ▼]     │
│  ☑ Leads     [Multi-select: Jean Dupont            ▼]     │
│  ☐ Document  [Select: CDC Projet X                 ▼]     │
│                                                             │
│  Catégorie : [Commercial ▼]  Tags : [+ajouter]             │
│                                                             │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│  ☑ Analyser avec IA (extraction + résumé + actions)        │
│  ☐ Générer embeddings (recherche sémantique)               │
│  ☑ OCR automatique si nécessaire (via GPT-4/Claude)        │
│                                                             │
│  [        UPLOADER ET ANALYSER        ]                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Liste des fichiers uploadés

```
┌─────────────────────────────────────────────────────────────┐
│  Fichiers uploadés                          [+ Nouveau]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔍 [Recherche...]  [Catégorie ▼] [Statut ▼] [Entité ▼]    │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📄 Proposition_Commerciale_Acme.pdf        v2 ↻      │ │
│  │    Type: PDF • 2.3 MB • ✅ Analysé • 📥 3 téléch.    │ │
│  │    Lié à: 🏢 Projet Acme Corp • 👤 Jean Dupont       │ │
│  │    🏷️ commercial, devis                               │ │
│  │    💡 Action suggérée: Générer devis                  │ │
│  │    [Voir] [Liaisons] [Partager] [Versions] [🗑️]       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 🖼️ Scan_Contrat_Signé.jpg               🔍 OCR       │ │
│  │    Type: Image • 1.8 MB • ✅ OCR GPT-4 • Conf: 97%   │ │
│  │    Lié à: 🏢 Projet Beta Corp                         │ │
│  │    🏷️ juridique, contrat                              │ │
│  │    [Voir] [Liaisons] [Partager] [🗑️]                  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📝 Notes_Reunion_15dec.txt                            │ │
│  │    Type: TXT • 45 KB • ⏳ En cours d'analyse          │ │
│  │    Lié à: 💡 Solution Data Analytics                  │ │
│  │    [Voir] [Liaisons] [🗑️]                             │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Edge Function : `process-uploaded-file`

### 6.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              process-uploaded-file                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  INPUT: { file_id, extracted_text?, force_ocr? }           │
│                                                             │
│  1. Si extracted_text fourni (client-side extraction)      │
│     → Passer directement à l'analyse IA                    │
│                                                             │
│  2. Si fichier image OU PDF scanné OU force_ocr            │
│     → OCR via LLM Vision (GPT-4o / Claude)                 │
│     ┌────────────────────────────────────────┐             │
│     │  Stratégie OCR (fallback cascade) :    │             │
│     │  1. OpenAI GPT-4o Vision               │             │
│     │  2. Anthropic Claude 3.5 Sonnet        │             │
│     │  3. OpenRouter (fallback)              │             │
│     └────────────────────────────────────────┘             │
│                                                             │
│  3. Analyse IA (Lovable AI gemini-2.5-flash)               │
│     → Résumé, entités, type document, actions suggérées    │
│                                                             │
│  4. Génération embeddings (optionnel)                      │
│     → Chunking + appel generate-embeddings                 │
│                                                             │
│  5. Mise à jour uploaded_files                             │
│     → extracted_content, ai_summary, ai_metadata           │
│     → ocr_required, ocr_provider, ocr_confidence           │
│     → processing_status = 'completed'                      │
│                                                             │
│  OUTPUT: { success, summary, actions_suggested, ocr_used } │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Logique OCR

```typescript
// process-uploaded-file/index.ts

async function processFile(fileId: string, extractedText?: string, forceOcr?: boolean) {
  const file = await getFileRecord(fileId);
  const isImageFile = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mime_type);
  const isPdfScanné = file.mime_type === 'application/pdf' && !extractedText;
  
  let content = extractedText;
  let ocrUsed = false;
  let ocrProvider: string | null = null;
  let ocrConfidence: number | null = null;
  
  // Détection besoin OCR
  if (forceOcr || isImageFile || isPdfScanné) {
    // Télécharger le fichier du Storage
    const fileBuffer = await downloadFromStorage(file.storage_path);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    
    // OCR via LLM Vision (cascade de providers)
    try {
      const ocrResult = await performOCR(base64, file.mime_type);
      content = ocrResult.text;
      ocrUsed = true;
      ocrProvider = ocrResult.provider;
      ocrConfidence = ocrResult.confidence;
    } catch (error) {
      await updateFileStatus(fileId, 'failed', `OCR failed: ${error.message}`);
      throw error;
    }
  }
  
  // Analyse IA du contenu
  const analysis = await analyzeContent(content);
  
  // Mise à jour du record
  await updateFileRecord(fileId, {
    extracted_content: content,
    ai_summary: analysis.summary,
    ai_metadata: analysis,
    ocr_required: ocrUsed,
    ocr_provider: ocrProvider,
    ocr_confidence: ocrConfidence,
    processing_status: 'completed',
    processing_completed_at: new Date().toISOString()
  });
  
  return { success: true, summary: analysis.summary, ocr_used: ocrUsed };
}

async function performOCR(base64: string, mimeType: string): Promise<{
  text: string;
  provider: string;
  confidence: number;
}> {
  // Essai 1: OpenAI GPT-4o
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (OPENAI_API_KEY) {
    try {
      const result = await ocrWithOpenAI(base64, mimeType, OPENAI_API_KEY);
      return { text: result, provider: 'openai', confidence: 0.95 };
    } catch (e) {
      console.warn('OpenAI OCR failed, trying Anthropic...', e);
    }
  }
  
  // Essai 2: Anthropic Claude
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  if (ANTHROPIC_API_KEY) {
    try {
      const result = await ocrWithClaude(base64, mimeType, ANTHROPIC_API_KEY);
      return { text: result, provider: 'anthropic', confidence: 0.93 };
    } catch (e) {
      console.warn('Anthropic OCR failed, trying OpenRouter...', e);
    }
  }
  
  // Essai 3: OpenRouter (fallback)
  const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
  if (OPENROUTER_API_KEY) {
    const result = await ocrWithOpenRouter(base64, mimeType, OPENROUTER_API_KEY);
    return { text: result, provider: 'openrouter', confidence: 0.90 };
  }
  
  throw new Error('No OCR provider available');
}
```

### 6.3 Prompt IA `document-analysis`

**À ajouter dans `ai_prompts` table :**

```json
{
  "slug": "document-analysis",
  "name": "Analyse documentaire Cockpit",
  "category": "agent",
  "system_prompt": "Tu es un assistant d'analyse documentaire expert pour IArche. Analyse le document fourni et extrais les informations structurées suivantes.\n\n## FORMAT DE SORTIE (JSON STRICT)\n\n```json\n{\n  \"summary\": \"Résumé en 3-5 phrases\",\n  \"document_type\": \"brief|rfp|specs|contract|report|invoice|email|meeting_notes|other\",\n  \"key_points\": [\"Point 1\", \"Point 2\"],\n  \"entities\": {\n    \"companies\": [\"Nom entreprise\"],\n    \"people\": [{\"name\": \"Nom\", \"role\": \"Rôle\", \"email\": \"email@...\"}],\n    \"dates\": [{\"date\": \"YYYY-MM-DD\", \"context\": \"Échéance projet\"}],\n    \"amounts\": [{\"value\": 10000, \"currency\": \"EUR\", \"context\": \"Budget estimé\"}]\n  },\n  \"suggested_actions\": [\n    {\n      \"type\": \"generate_quote|create_project|schedule_meeting|create_task|link_to_lead\",\n      \"priority\": \"high|medium|low\",\n      \"description\": \"Description de l'action\",\n      \"context\": \"Justification\"\n    }\n  ],\n  \"requirements\": [\"Exigence 1\", \"Exigence 2\"],\n  \"tags_suggested\": [\"commercial\", \"urgent\"]\n}\n```\n\n## RÈGLES\n- Extraire UNIQUEMENT les informations présentes dans le document\n- Ne pas inventer de données\n- Prioriser les actions selon l'urgence détectée\n- Identifier les contacts pour création de leads",
  "model_config": {
    "model": "google/gemini-2.5-flash",
    "temperature": 0.1,
    "max_tokens": 2000
  }
}
```

### 6.4 Prompt OCR `document-ocr`

**À ajouter dans `ai_prompts` table :**

```json
{
  "slug": "document-ocr",
  "name": "OCR documentaire",
  "category": "agent",
  "system_prompt": "Tu es un système OCR de haute précision. Extrais TOUT le texte visible dans l'image/document fourni.\n\n## RÈGLES D'EXTRACTION\n- Conserve la mise en forme originale (titres, sous-titres, listes)\n- Transcris les tableaux en format Markdown\n- Indique [illisible] pour les passages non déchiffrables\n- Respecte l'ordre de lecture naturel (gauche→droite, haut→bas)\n- Ne résume pas, extrais verbatim\n- Conserve les numéros, dates, montants exactement comme écrits\n\n## FORMAT DE SORTIE\nTexte brut structuré, sans JSON.",
  "model_config": {
    "model": "gpt-4o",
    "temperature": 0,
    "max_tokens": 4096
  }
}
```

---

## 7. Composants React

### 7.1 Arborescence

```
src/
├── pages/cockpit/
│   └── CockpitUploads.tsx              # Page principale
├── components/cockpit/uploads/
│   ├── FileUploadZone.tsx              # Zone drag & drop + resumable
│   ├── TextPasteZone.tsx               # Zone texte collé
│   ├── MultiEntitySelector.tsx         # Sélecteur multi-entités (arrays)
│   ├── UploadedFilesList.tsx           # Liste des fichiers
│   ├── UploadedFileCard.tsx            # Carte fichier individuel
│   ├── FileDetailSheet.tsx             # Détail d'un fichier
│   ├── FileVersionsPanel.tsx           # Historique versions
│   ├── FileShareDialog.tsx             # Génération lien partage
│   ├── ProcessingStatus.tsx            # Indicateur de statut (avec OCR)
│   ├── SuggestedActionsPanel.tsx       # Actions suggérées par IA
│   ├── OCRResultViewer.tsx             # Visualisation résultat OCR
│   └── ClientSideExtractor.tsx         # Extraction PDF/DOCX côté client
└── hooks/cockpit/
    └── useCockpitUploads.ts            # Hook CRUD + upload + processing
```

### 7.2 Hook principal

```typescript
// useCockpitUploads.ts
export function useCockpitUploads() {
  // Fetch all uploads for workspace
  const { data: uploads, isLoading, refetch } = useQuery(...)
  
  // Upload file to Storage + create record (avec resumable pour gros fichiers)
  const uploadFile = useMutation(async ({ file, links, extractLocally, enableOcr }) => {
    // 1. Hash du fichier pour déduplication
    const hash = await computeSHA256(file);
    
    // 2. Vérifier si hash existe déjà
    const existing = await checkExistingHash(hash);
    if (existing) return { duplicate: true, existingId: existing.id };
    
    // 3. Extraction locale si demandé (PDF/DOCX)
    let extractedText = null;
    if (extractLocally && ['pdf', 'docx'].includes(getFileType(file))) {
      extractedText = await extractTextClientSide(file);
    }
    
    // 4. Upload (direct ou resumable selon taille)
    const storagePath = await uploadToStorage(file);
    
    // 5. Créer record
    const record = await createRecord({ file, storagePath, hash, extractedText, links });
    
    // 6. Déclencher traitement async (avec flag OCR)
    await triggerProcessing(record.id, extractedText, enableOcr);
    
    return record;
  });
  
  // Upload pasted text (no Storage, direct to DB)
  const uploadText = useMutation(...)
  
  // Update entity links
  const updateLinks = useMutation(...)
  
  // Trigger AI processing (with OCR option)
  const processFile = useMutation(...)
  
  // Generate share link
  const shareFile = useMutation(...)
  
  // Upload new version
  const uploadVersion = useMutation(...)
  
  // Delete file
  const deleteFile = useMutation(...)
  
  return { 
    uploads, isLoading, 
    uploadFile, uploadText, updateLinks, 
    processFile, shareFile, uploadVersion, deleteFile, 
    refetch 
  }
}
```

---

## 8. Gestion des fichiers volumineux

### 8.1 Stratégie révisée

| Taille | Stratégie Upload | Extraction | Traitement |
|--------|------------------|------------|------------|
| < 5 MB | Direct | Client-side | Synchrone |
| 5-20 MB | Direct | Client-side | Asynchrone |
| 20-50 MB | Resumable (TUS) | Client-side | Asynchrone |
| > 50 MB | **Rejeté** | N/A | N/A |

### 8.2 Stratégie OCR selon type

| Type fichier | Extraction | OCR nécessaire |
|--------------|------------|----------------|
| PDF texte | pdf.js client | Non |
| PDF scanné | N/A | Oui (LLM Vision) |
| DOCX | mammoth.js client | Non |
| Image (JPG/PNG/WEBP) | N/A | Oui (LLM Vision) |
| TXT/MD | Lecture directe | Non |
| XLSX | SheetJS client | Non |

### 8.3 Implémentation Resumable Upload

```typescript
// Utiliser @uppy/tus pour upload resumable
import Tus from '@uppy/tus';

const uppy = new Uppy()
  .use(Tus, {
    endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
    headers: {
      authorization: `Bearer ${session.access_token}`,
    },
    chunkSize: 6 * 1024 * 1024, // 6 MB chunks
  });
```

### 8.4 Feedback utilisateur amélioré
- Barre de progression avec vitesse estimée
- Statut en temps réel (Realtime Supabase)
- Indicateur OCR en cours avec provider utilisé
- Notification push à la fin du traitement
- Retry automatique en cas d'échec réseau

---

## 9. Intégration avec modules existants

### 9.1 Depuis /cockpit/projects
- Bouton "📎 Ajouter un fichier" dans ProjectDetailSheet
- Affiche les fichiers liés au projet (via `project_ids` array)
- Peut uploader directement avec project_id pré-rempli
- Actions suggérées visibles

### 9.2 Depuis /cockpit/leads
- Bouton "📎 Documents" dans LeadDetailSheet
- Liste les fichiers associés au lead
- Upload rapide avec lead_id pré-rempli
- Détection automatique nouveaux contacts dans fichiers

### 9.3 Depuis /cockpit/solutions
- Section "Ressources" dans SolutionDetailSheet
- Fichiers de support commercial
- Upload avec solution_id pré-rempli

### 9.4 Depuis /cockpit/documents
- Liaison avec documents générés
- Comparaison source/output
- Versioning croisé

### 9.5 Intégration Agent IA
- Notification via `pending_ai_review` sur nouveaux uploads
- Outils `get_uploaded_files`, `analyze_uploaded_file`, `search_in_files`
- Actions suggérées exécutables par l'agent

---

## 10. Sécurité

### 10.1 Validation fichiers
- Vérification MIME type côté client ET serveur
- Limite de taille stricte (50 MB)
- Hash SHA-256 pour intégrité
- Scan contenu (pas d'exécutables)

### 10.2 Accès
- RLS basé sur workspace_id
- Signed URLs pour téléchargement (expiration 1h)
- Liens de partage avec expiration et mot de passe optionnel
- Seuls les cockpit_admin peuvent supprimer

### 10.3 Audit
- Log dans activity_log pour chaque opération
- Compteur de téléchargements
- Historique des versions
- Traçabilité provider OCR utilisé

---

## 11. Roadmap d'implémentation Révisée

### Phase 1 : Fondations ✅ TODO
- [ ] Migration DB : table `uploaded_files` enrichie (avec champs OCR)
- [ ] Bucket Storage : `cockpit-uploads` avec policies
- [ ] Hook `useCockpitUploads` basique
- [ ] Page `/cockpit/upload` structure

### Phase 2 : Upload & Extraction ✅ TODO
- [ ] Composant `FileUploadZone` (direct + resumable)
- [ ] Extraction client-side (pdf.js + mammoth.js)
- [ ] Composant `TextPasteZone`
- [ ] Hash SHA-256 et déduplication
- [ ] Gestion quota workspace

### Phase 3 : Traitement IA + OCR ✅ TODO
- [ ] Edge Function `process-uploaded-file` avec OCR
- [ ] Prompt IA `document-analysis` dans ai_prompts
- [ ] Prompt IA `document-ocr` dans ai_prompts
- [ ] Cascade OCR (OpenAI → Anthropic → OpenRouter)
- [ ] Affichage contenu extrait + résultat OCR
- [ ] Panel actions suggérées
- [ ] Intégration Realtime pour statut

### Phase 4 : Liaisons Multi-Entités ✅ TODO
- [ ] Composant `MultiEntitySelector`
- [ ] Boutons upload dans ProjectDetailSheet
- [ ] Boutons upload dans LeadDetailSheet
- [ ] Boutons upload dans SolutionDetailSheet
- [ ] Activity log trigger

### Phase 5 : Fonctionnalités Avancées ✅ TODO
- [ ] Versioning fichiers
- [ ] Liens de partage sécurisés
- [ ] Génération embeddings + recherche sémantique
- [ ] Outils Agent IA (4 nouveaux outils)
- [ ] Analytics fichiers

---

## 12. Métriques de succès

| Métrique | Objectif |
|----------|----------|
| Temps upload < 5 MB | < 3 secondes |
| Temps upload 5-20 MB | < 15 secondes |
| Temps traitement IA | < 45 secondes |
| Temps OCR LLM | < 30 secondes |
| Taux d'extraction réussie (texte) | > 98% |
| Taux d'extraction OCR réussie | > 95% |
| Formats supportés | PDF, DOCX, TXT, MD, XLSX, Images |
| Précision entités détectées | > 85% |
| Actions suggérées pertinentes | > 70% |
| Précision OCR (documents clairs) | > 97% |

---

## 13. Dépendances à installer

```bash
# Client-side extraction
npm install pdfjs-dist mammoth

# Resumable upload (optionnel, si @uppy)
npm install @uppy/core @uppy/tus

# Hash SHA-256 (Web Crypto API natif, pas de dep)
```

---

## 14. Coûts estimés OCR

| Provider | Modèle | Coût estimé/page | Notes |
|----------|--------|------------------|-------|
| OpenAI | GPT-4o | ~$0.01-0.03 | Haute précision, rapide |
| Anthropic | Claude 3.5 Sonnet | ~$0.01-0.02 | Excellent pour docs complexes |
| OpenRouter | Variable | ~$0.01-0.03 | Fallback, tarifs variables |

**Budget mensuel estimé** : 100 documents OCR/mois = ~$2-3/mois

---

**Dernière mise à jour** : 2026-01-01  
**Version** : 1.2.0  
**Auteur** : Lovable AI Agent (Analyse Expert V1.2 - OCR LLM)
