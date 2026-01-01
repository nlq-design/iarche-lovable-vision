# Cahier des Charges — Module Upload Cockpit

**Version** : 1.0.0  
**Date** : 2026-01-01  
**Statut** : 🔵 À IMPLÉMENTER  
**Priorité** : Haute

---

## 1. Vue d'ensemble

### 1.1 Objectif
Créer un module centralisé d'upload de fichiers dans le Cockpit permettant :
- L'import de documents variés (PDF, DOCX, TXT, fichiers texte collés)
- La liaison multi-entités (Projets, Solutions, Leads, Documents générés)
- L'analyse IA automatique avec extraction de contenu
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

## 2. Architecture technique

### 2.1 Nouvelle table : `uploaded_files`

```sql
CREATE TABLE public.uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  
  -- Métadonnées fichier
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'txt', 'pasted_text'
  mime_type TEXT,
  file_size_bytes BIGINT,
  storage_path TEXT, -- Chemin dans le bucket Storage
  
  -- Contenu extrait par IA
  extracted_content TEXT, -- Texte brut extrait
  ai_summary TEXT, -- Résumé IA
  ai_metadata JSONB DEFAULT '{}', -- Tags, entités détectées, etc.
  
  -- Liaisons multi-entités (toutes optionnelles)
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  solution_id UUID, -- Référence article de type 'solution'
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  generated_document_id UUID REFERENCES generated_documents(id) ON DELETE SET NULL,
  
  -- Statut traitement
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  processing_error TEXT,
  
  -- Audit
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_uploaded_files_project ON uploaded_files(project_id);
CREATE INDEX idx_uploaded_files_lead ON uploaded_files(lead_id);
CREATE INDEX idx_uploaded_files_solution ON uploaded_files(solution_id);
CREATE INDEX idx_uploaded_files_status ON uploaded_files(processing_status);
```

### 2.2 Bucket Storage
- **Nom** : `cockpit-uploads`
- **Public** : Non (accès via RLS)
- **Limite fichier** : 50 MB (configurable)
- **Types acceptés** : PDF, DOCX, DOC, TXT, MD, RTF, ODT

### 2.3 RLS Policies
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

## 3. Flux utilisateur

### 3.1 Upload de fichier

```
┌─────────────────────────────────────────────────────────────┐
│                    /cockpit/upload                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Zone de dépôt (Drag & Drop)                        │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  📁 Glissez vos fichiers ici ou cliquez             │   │
│  │     PDF, DOCX, TXT • Max 50 MB                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  OU                                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📝 Coller du texte                                  │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  [Zone de texte multi-lignes]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│  LIER À (optionnel, multi-sélection possible) :            │
│                                                             │
│  ☐ Projet    [Select: Liste des projets actifs    ▼]       │
│  ☐ Solution  [Select: Liste des solutions         ▼]       │
│  ☐ Lead      [Select: Liste des leads récents     ▼]       │
│  ☐ Document  [Select: Documents générés           ▼]       │
│                                                             │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│  ☑ Analyser avec IA (extraction + résumé)                  │
│                                                             │
│  [        UPLOADER ET ANALYSER        ]                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Liste des fichiers uploadés

```
┌─────────────────────────────────────────────────────────────┐
│  Fichiers uploadés                          [+ Nouveau]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔍 [Recherche...]  [Filtre: Type ▼] [Filtre: Statut ▼]    │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📄 Proposition_Commerciale_Acme.pdf                   │ │
│  │    Type: PDF • 2.3 MB • ✅ Analysé                     │ │
│  │    Lié à: 🏢 Projet Acme Corp • 👤 Jean Dupont        │ │
│  │    [Voir] [Modifier liaisons] [🗑️]                    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📝 Notes_Reunion_15dec.txt                            │ │
│  │    Type: TXT • 45 KB • ⏳ En cours d'analyse          │ │
│  │    Lié à: 💡 Solution Data Analytics                  │ │
│  │    [Voir] [Modifier liaisons] [🗑️]                    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Edge Function : `process-uploaded-file`

### 4.1 Responsabilités
1. Récupérer le fichier depuis Storage
2. Extraire le contenu textuel (PDF → texte, DOCX → texte)
3. Appeler Lovable AI pour analyse et résumé
4. Mettre à jour `uploaded_files` avec le contenu extrait
5. Optionnel : créer des embeddings pour recherche sémantique

### 4.2 Prompt IA dédié

**Slug** : `document-analysis`  
**Catégorie** : `agent`

```
Tu es un assistant d'analyse documentaire expert. Analyse le document fourni et extrais :

1. **RÉSUMÉ** (3-5 phrases) : Synthèse du contenu principal
2. **POINTS CLÉS** : Liste des informations importantes
3. **ENTITÉS DÉTECTÉES** :
   - Personnes mentionnées
   - Entreprises/Organisations
   - Dates importantes
   - Montants/Chiffres clés
4. **TYPE DE DOCUMENT** : (contrat, proposition, compte-rendu, spécification, autre)
5. **ACTIONS SUGGÉRÉES** : Recommandations basées sur le contenu

Format de sortie : JSON structuré
```

---

## 5. Composants React

### 5.1 Arborescence

```
src/
├── pages/cockpit/
│   └── CockpitUploads.tsx          # Page principale
├── components/cockpit/uploads/
│   ├── FileUploadZone.tsx          # Zone drag & drop
│   ├── TextPasteZone.tsx           # Zone texte collé
│   ├── EntityLinkSelector.tsx      # Sélecteur multi-entités
│   ├── UploadedFilesList.tsx       # Liste des fichiers
│   ├── UploadedFileCard.tsx        # Carte fichier individuel
│   ├── FileDetailSheet.tsx         # Détail d'un fichier
│   └── ProcessingStatus.tsx        # Indicateur de statut
└── hooks/cockpit/
    └── useCockpitUploads.ts        # Hook CRUD + upload
```

### 5.2 Hook principal

```typescript
// useCockpitUploads.ts
export function useCockpitUploads() {
  // Fetch all uploads for workspace
  const { data: uploads, isLoading, refetch } = useQuery(...)
  
  // Upload file to Storage + create record
  const uploadFile = useMutation(...)
  
  // Upload pasted text (no Storage, direct to DB)
  const uploadText = useMutation(...)
  
  // Update entity links
  const updateLinks = useMutation(...)
  
  // Trigger AI processing
  const processFile = useMutation(...)
  
  // Delete file
  const deleteFile = useMutation(...)
  
  return { uploads, isLoading, uploadFile, uploadText, updateLinks, processFile, deleteFile, refetch }
}
```

---

## 6. Gestion des fichiers volumineux

### 6.1 Stratégie
- **< 5 MB** : Upload direct, traitement synchrone
- **5-20 MB** : Upload direct, traitement asynchrone (Edge Function)
- **20-50 MB** : Upload chunked, traitement asynchrone
- **> 50 MB** : Rejeté avec message explicatif

### 6.2 Feedback utilisateur
- Barre de progression pour upload
- Statut en temps réel (pending → processing → completed)
- Notification toast à la fin du traitement

---

## 7. Intégration avec modules existants

### 7.1 Depuis /cockpit/projects
- Bouton "📎 Ajouter un fichier" dans ProjectDetailSheet
- Affiche les fichiers liés au projet
- Peut uploader directement avec project_id pré-rempli

### 7.2 Depuis /cockpit/leads
- Bouton "📎 Documents" dans LeadDetailSheet
- Liste les fichiers associés au lead
- Upload rapide avec lead_id pré-rempli

### 7.3 Depuis /cockpit/solutions
- Section "Ressources" dans SolutionDetailSheet
- Fichiers de support commercial
- Upload avec solution_id pré-rempli

### 7.4 Depuis /cockpit/documents
- Liaison avec documents générés
- Comparaison source/output

---

## 8. Sécurité

### 8.1 Validation fichiers
- Vérification MIME type côté serveur
- Scan antivirus (optionnel, via service externe)
- Limite de taille stricte

### 8.2 Accès
- RLS basé sur workspace_id
- Seuls les cockpit_admin peuvent supprimer
- Logs d'audit pour chaque opération

---

## 9. Roadmap d'implémentation

### Phase 1 : Fondations ✅ TODO
- [ ] Migration DB : table `uploaded_files`
- [ ] Bucket Storage : `cockpit-uploads`
- [ ] Hook `useCockpitUploads`
- [ ] Page `/cockpit/upload` basique

### Phase 2 : Upload & Liaisons ✅ TODO
- [ ] Composant `FileUploadZone`
- [ ] Composant `TextPasteZone`
- [ ] Composant `EntityLinkSelector`
- [ ] Liste des fichiers uploadés

### Phase 3 : Traitement IA ✅ TODO
- [ ] Edge Function `process-uploaded-file`
- [ ] Prompt IA `document-analysis`
- [ ] Affichage contenu extrait
- [ ] Résumé IA dans FileDetailSheet

### Phase 4 : Intégration modules ✅ TODO
- [ ] Boutons upload dans ProjectDetailSheet
- [ ] Boutons upload dans LeadDetailSheet
- [ ] Boutons upload dans SolutionDetailSheet

---

## 10. Métriques de succès

| Métrique | Objectif |
|----------|----------|
| Temps upload < 5MB | < 3 secondes |
| Temps traitement IA | < 30 secondes |
| Taux d'extraction réussie | > 95% |
| Formats supportés | PDF, DOCX, TXT, MD |

---

**Dernière mise à jour** : 2026-01-01  
**Auteur** : Lovable AI Agent
