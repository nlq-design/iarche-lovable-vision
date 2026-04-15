

# Plan : Edition inline transparente (WYSIWYG sans blocs)

## Problème

Le mode édition actuel utilise des composants Quill avec toolbar visible et des inputs avec bordures pointillées — cela casse l'architecture visuelle de consultation. L'utilisateur veut que le mode édition soit **visuellement identique** au mode consultation, avec chaque élément texte directement cliquable et modifiable in-place.

## Approche

Remplacer **tous les Quill editors** par des `contentEditable` divs et **tous les inputs avec bordures** par des inputs transparents sans bordure. Le rendu en mode brouillon sera pixel-identical au mode figé, sauf que le texte est cliquable et modifiable. Une mini toolbar flottante apparaît uniquement à la sélection de texte pour le gras/italique/lien.

## Modifications sur `AdminInvitationPreview.tsx`

### 1. Supprimer LazyQuill — utiliser `contentEditable`

- Chaque section `.content` : un `<div contentEditable>` avec les mêmes classes prose que le mode figé
- `onBlur` capture le `innerHTML` et met à jour `editSections`
- `onInput` pour détecter les changements en temps réel (hasChanges)

### 2. Inputs transparents partout

- Titre hero, type événement, date, lieu : inputs **sans bordure** (pas de `border-dashed`), mêmes classes que les `<h1>`, `<Badge>`, `<span>` du mode figé
- Titres de section : input sans bordure, mêmes classes que le `<h2>` figé
- Footer texte : `contentEditable` sur le paragraphe
- Section QR : titre "Inscription" et texte descriptif éditables

### 3. Toolbar flottante contextuelle

- Un composant `FloatingToolbar` qui apparaît au-dessus de la sélection
- Actions : Bold, Italic, Underline, Link (via `document.execCommand`)
- Se masque quand la sélection disparaît
- Ne s'affiche que si `!isApproved`

### 4. Suppression complète des conditionnels `!isApproved ? (editor) : (display)`

- Un seul rendu pour les deux modes
- En mode brouillon : `contentEditable={true}` + inputs éditables
- En mode figé : `contentEditable={false}` + inputs `readOnly`
- Zéro différence visuelle entre les deux états

### 5. Éléments éditables

| Élément | Méthode |
|---------|---------|
| Type événement (badge hero) | Input transparent dans le badge |
| Titre événement (h1 hero) | Input transparent, mêmes classes h1 |
| Date, Lieu (pills hero) | Inputs transparents dans les pills |
| Titres de section | Input transparent, mêmes classes h2 |
| Contenu de section | `contentEditable` div avec classes prose |
| Titre "Inscription" QR | Input transparent |
| Texte descriptif QR | `contentEditable` span |
| Footer texte | `contentEditable` p |

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/pages/admin/AdminInvitationPreview.tsx` | Refonte complète : suppression Quill, contentEditable partout, FloatingToolbar inline |
| `src/components/admin/LazyQuill.tsx` | Aucune modification (reste pour d'autres usages) |

Aucune migration DB. Aucune edge function.

