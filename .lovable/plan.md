

# Audit & Cahier des charges : Module Programme Invitation

## Problemes identifies

### 1. Debordement de texte (critique)
- Les `contentEditable` divs dans `AdminInvitationPreview.tsx` n'ont **aucune contrainte `overflow`** — le contenu HTML genere (tableaux larges, texte long sans retour a la ligne) depasse les cartes.
- Classes manquantes : `overflow-hidden`, `overflow-x-auto` sur les conteneurs prose, `break-words` / `word-break: break-word` sur le texte.
- Le probleme affecte potentiellement aussi `EventLanding.tsx` (memes classes prose, meme absence de contrainte overflow).

### 2. FloatingToolbar incomplete
- Actuellement : Bold, Italic, Underline, Lists, Link — **aucun controle de taille de texte**.
- Pas de heading (H2, H3, H4) pour structurer les programmes detailles.
- Pas de separateur horizontal (`<hr>`) pour scinder les blocs.
- Pas d'alignement texte (gauche, centre).

### 3. Parite brouillon / public non garantie
- Admin utilise `max-w-4xl` + `px-6` — identique au public. OK.
- Admin hero : `minHeight: 400px` vs public `360px` — **divergence**.
- Admin footer : utilise `editMetadata.footerText` vs public hardcode `© 2026 IArche` — le footer edite n'est **pas lu par la page publique** (elle ignore `qrTitle`, `qrDescription`, `footerText`).
- Public `EventLanding.tsx` ne lit pas les champs metadata `qrTitle`, `qrDescription`, `footerText` — ces modifications sont perdues a la publication.

### 4. Inputs a largeur fixe dans le hero
- Les inputs date/lieu ont `w-40` fixe — si le texte est plus long, il est tronque au lieu de s'adapter.

---

## Plan d'implementation

### Etape 1 — Corriger les debordements (Admin + Public)

**Fichiers** : `AdminInvitationPreview.tsx`, `EventLanding.tsx`

- Ajouter `overflow-x-auto` sur les divs prose (pour les tableaux larges).
- Ajouter `break-words` / `[overflow-wrap:break-word]` sur les conteneurs texte.
- Forcer `[&_table]:table-fixed` ou `[&_table]:max-w-full` pour empecher les tableaux de deborder.
- Inputs hero : remplacer `w-40` par `w-auto min-w-[2ch]` pour s'adapter au contenu.

### Etape 2 — Enrichir la FloatingToolbar

**Fichier** : `FloatingToolbar.tsx`

Ajouter au menu contextuel :
- **Tailles de titre** : H2, H3, H4, Paragraphe (via `document.execCommand('formatBlock', false, 'h2')`)
- **Separateur** : insertion `<hr>` pour structurer les programmes
- **Alignement** : gauche, centre (via `justifyLeft`, `justifyCenter`)
- **Taille de police** : petit / normal / grand (via style inline `fontSize`)
- Organiser en groupes separes par des dividers visuels

### Etape 3 — Parite Admin/Public

**Fichiers** : `AdminInvitationPreview.tsx`, `EventLanding.tsx`

- Harmoniser `minHeight` hero a `400px` sur les deux.
- Faire lire par `EventLanding.tsx` les champs `qrTitle`, `qrDescription`, `footerText` depuis `content_json.metadata` — sinon les modifications admin sont ignorees.
- Ajouter le type `qrTitle`, `qrDescription`, `footerText` a l'interface `InvitationMetadata` dans `EventLanding.tsx`.

### Etape 4 — Ajout de lignes dans les programmes

Deja fonctionnel via `contentEditable` + Enter. La toolbar enrichie (Etape 2) permettra en plus de :
- Inserer des listes a puces/numerotees
- Ajouter des sous-titres H3/H4
- Inserer des separateurs `<hr>`

---

## Fichiers impactes

| Fichier | Action |
|---------|--------|
| `src/components/admin/FloatingToolbar.tsx` | Ajout H2/H3/H4, taille police, alignement, separateur |
| `src/pages/admin/AdminInvitationPreview.tsx` | Fix overflow, inputs adaptatifs, harmonisation hero |
| `src/pages/EventLanding.tsx` | Fix overflow, lecture metadata editee, harmonisation hero |

Aucune migration DB. Aucune edge function.

