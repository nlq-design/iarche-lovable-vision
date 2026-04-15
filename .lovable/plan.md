

# Plan : Programme Événement Figé + PDF QR Code + Landing Page avec Formulaire

## Contexte actuel

- La génération d'invitation via `generate-document` fonctionne et stocke le JSON dans `generated_documents` (avec `article_id`, `slug`, `version`, `status`, `supersedes_document_id`)
- `AdminInvitationPreview.tsx` affiche le document en mode brochure (admin only)
- Les formulaires existent dans la table `forms` avec `article_id` pour le lien événement
- La route `/formulaires/:slug` affiche un formulaire public via `FormPublic.tsx`
- La table `generated_documents` a déjà un champ `slug` (nullable) pour l'accès public

## Ce qui sera implémenté

### 1. Version figée du document généré
- A la génération, le document reçoit automatiquement un `slug` unique (ex: `programme-vague-ia-2026`) et un `version` ("v1")
- Bouton "Regénérer" crée un nouveau document avec `supersedes_document_id` pointant vers l'ancien, version incrémentée
- Le statut passe de `draft` -> `approved` via un bouton "Figer la version" dans le preview admin
- Une fois `approved`, le contenu n'est plus modifiable

### 2. Génération PDF avec QR Code
- Nouveau bouton "Télécharger PDF" dans `AdminInvitationPreview.tsx`
- Utilisation de `window.print()` amélioré + ajout d'une section QR Code en bas du document
- Le QR Code pointe vers la landing page d'inscription (point 3)
- Librairie : `qrcode` (npm) pour générer le QR code en base64 côté client
- Le PDF inclut : hero, sections, QR code, pied de page IArche

### 3. Landing Page publique avec formulaire intégré
- Nouvelle route : `/evenements/:slug` (page publique, pas d'auth)
- Cette page affiche le contenu figé du `generated_document` (même mise en forme brochure que l'admin preview) + le formulaire d'inscription lié à l'article
- Flux : charge le `generated_document` par `slug` -> récupère `article_id` -> charge le `form` lié via `article_id` -> affiche le formulaire inline
- Le QR Code du PDF pointe vers cette URL

### 4. Admin : actions consolidées
Dans `AdminAteliersWebinaires.tsx`, le bouton "Programme" existant est enrichi :
- Après génération : toast avec lien vers le preview admin
- Dans le preview admin : boutons "Figer", "PDF", "Copier lien public"
- Le lien public est `/evenements/{slug-du-document}`

## Détails techniques

### Migration SQL
```sql
-- Ajouter un index unique sur le slug des generated_documents
CREATE UNIQUE INDEX idx_generated_documents_slug 
ON public.generated_documents(slug) WHERE slug IS NOT NULL;
```

### Edge function `generate-document`
- Auto-génère le `slug` à partir du titre de l'article (slugify) + année
- Vérifie l'unicité et suffixe si nécessaire

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `supabase/functions/generate-document/index.ts` | Ajouter génération auto du `slug` et `version: "v1"` |
| `src/pages/admin/AdminInvitationPreview.tsx` | Ajouter boutons Figer/PDF/QR/Lien public, section QR code |
| `src/pages/EventLanding.tsx` | **Nouveau** — Landing page publique brochure + formulaire |
| `src/App.tsx` | Ajouter route `/evenements/:slug` |
| `src/pages/admin/AdminAteliersWebinaires.tsx` | Ajuster le toast post-génération |
| Migration SQL | Index unique sur `slug` |

### Contraintes identifiées

1. **RLS** : La landing page est publique — il faut une policy SELECT sur `generated_documents` pour `anon` filtré par `status = 'approved'` et `slug IS NOT NULL`
2. **Formulaire** : Le lien form<->article existe déjà via `forms.article_id`. La landing page le résout automatiquement
3. **QR Code** : Généré côté client (pas d'edge function supplémentaire), package `qrcode` à installer
4. **PDF** : `window.print()` avec styles `@media print` dédiés. Le QR code apparaît uniquement dans le PDF/print
5. **Slug unicité** : L'edge function doit vérifier et suffixer si un slug existe déjà
6. **Version figée** : Un document `approved` ne peut plus être modifié — l'UI masque les boutons d'édition

