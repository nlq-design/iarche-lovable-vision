

# Plan : Edition inline du programme avant figement

## Constat

Le preview actuel (`AdminInvitationPreview.tsx`) affiche les sections en `dangerouslySetInnerHTML` — lecture seule. Aucune possibilité d'éditer le texte, les titres, ou la mise en forme. Une fois figé (`approved`), le contenu doit devenir non-modifiable.

## Solution

Rendre chaque section éditable en mode brouillon via le composant `LazyQuill` (déjà dans le projet). Ajouter l'édition des titres de section et des métadonnées hero. Sauvegarder les modifications dans `content_json` en base.

## Modifications sur `AdminInvitationPreview.tsx`

### Mode brouillon (status != 'approved')

1. **Titres de section** : remplacer les `<h2>` par des `<input>` éditables inline, stylés identiquement
2. **Contenu de section** : remplacer `dangerouslySetInnerHTML` par `<LazyQuill>` avec toolbar bold/italic/underline/lists/links
3. **Métadonnées hero** : titre, date, lieu, type d'événement — tous éditables via inputs inline
4. **Bouton "Enregistrer"** : sauvegarde le `content_json` modifié en base (update sur `generated_documents`)
5. **Indicateur visuel** : bordure pointillée subtile autour des zones éditables + tooltip "Cliquez pour modifier"

### Mode figé (status == 'approved')

- Tout revient en lecture seule (`dangerouslySetInnerHTML` comme aujourd'hui)
- Aucun input, aucun Quill affiché
- Le bouton "Enregistrer" disparaît

### Toolbar Quill

Configuration minimale adaptée au format brochure :
- Bold, Italic, Underline
- Listes (puces, numérotées)
- Titres (h3, h4)
- Liens
- Clean formatting

### Sauvegarde

- Bouton "Enregistrer les modifications" dans la toolbar admin (à côté de "Figer")
- Appel `supabase.update({ content_json })` sur `generated_documents`
- Toast de confirmation
- Auto-détection des changements (bouton grisé si rien n'a changé)

## Fichier impacté

| Fichier | Action |
|---------|--------|
| `src/pages/admin/AdminInvitationPreview.tsx` | Ajout état local éditable, LazyQuill conditionnel, sauvegarde, inputs hero |

Aucune migration. Aucun nouveau fichier. Le composant `LazyQuill` existe déjà dans `src/components/admin/LazyQuill.tsx`.

