# IArche Charte Graphique v4.0

## Changements majeurs

### Logo
- **Logo officiel SVG** : Remplace le texte gradient animé
- **Variantes** : main (gradient), white, dark
- **Icône** : Arc seul pour favicon/PWA

### Élément décoratif unique : Arc IArche

**L'arc de cercle est l'UNIQUE élément décoratif du site.**

- **Forme** : Courbe de Bézier reproduisant la "virgule" du logo officiel (I→E)
- **Gradient** : Bleu Nuit (#1A2B4A) → Terracotta (#B04A32)
- **S'affine** progressivement de gauche à droite
- **Remplace TOUTES les barres gradient horizontales**
- **NE JAMAIS placer sous un logo** (réservé aux titres et identité site)

### Tailles de l'arc

| Taille | Largeur | Hauteur | Usage |
|--------|---------|---------|-------|
| sm | 80px | 10px | Cards, petits titres |
| md | 120px | 14px | Titres de section (défaut) |
| lg | 180px | 20px | Grands titres de page |
| xl | 260px | 28px | Hero section |

### Fichier de référence

L'arc utilise directement le fichier PNG de référence fourni :
- **Source** : `src/assets/arc-iarche-v4.png` (import ES6 pour composants React)
- **Public** : `public/assets/arc-iarche-v4.png` (pour PDF et URLs directes)

Aucun path SVG n'est généré - le fichier PNG exact est utilisé tel quel.

### Fond de page
- **Fond uni** : `#FAF9F7` (Blanc Cassé) - `hsl(30, 14%, 98%)`
- Remplace le fond quadrillé animé (mesh)

### Suppressions v4.0
- ❌ Barres gradient horizontales (`div bg-gradient-to-r`)
- ❌ HTMLGradientBar / PDFGradientBar (remplacés par HTMLLogoArc / PDFLogoArc)
- ❌ Lignes canalisation (HTMLCanalisationLines, PDFCanalisationLines)
- ❌ AnimatedArcs (remplacé par arc statique)
- ❌ Texte gradient "IArche" (remplacé par logo SVG)
- ❌ Fond quadrillé animé (mesh) - remplacé par fond uni #FAF9F7
- ❌ HTMLMeshBackground / PDFMeshBackground (supprimés)
- ❌ Animation patternScroll (supprimée)

### Fichiers logo
- `/logos/iarche-main.svg` - Logo principal gradient
- `/logos/iarche-white.svg` - Logo blanc
- `/logos/iarche-dark.svg` - Logo Bleu Nuit
- `/logos/iarche-icon-32.svg` - Favicon
- `/logos/iarche-icon-512.svg` - PWA icon
- `/public/assets/arc-reference-v4.png` - Image de référence de l'arc

### Composants

| Composant | Fichier | Usage |
|-----------|---------|-------|
| LogoArc | `src/components/ui/LogoArc.tsx` | Arc pour pages publiques |
| HTMLLogoArc | `src/components/admin/medias/html/HTMLLogoArc.tsx` | Arc pour éditeurs média HTML |
| PDFLogoArc | `src/components/admin/medias/pdf/PDFLogoArc.tsx` | Arc pour exports PDF |
| GradientTitle | `src/components/ui/GradientTitle.tsx` | Titre + arc (showArc prop) |

### Règles d'utilisation

1. **Sous les titres de page** : Oui, via `GradientTitle` ou `LogoArc` direct
2. **Sous les titres de section** : Oui
3. **Sous le logo dans les cards** : ❌ NON - arc réservé aux titres
4. **Dans les éditeurs média** : Oui, remplace les anciennes barres

### Couleurs (inchangées)
- Bleu Nuit: `hsl(218, 47%, 20%)` / #1A2B4A
- Terracotta: `hsl(12, 60%, 44%)` / #B04A32
- Blanc Cassé: `hsl(30, 14%, 98%)` / #FAF9F7

### Migration

Toutes les occurrences de :
```tsx
<div className="... bg-gradient-to-r from-primary via-accent to-primary ..."></div>
```

Doivent être remplacées par :
```tsx
import LogoArc from '@/components/ui/LogoArc';
<LogoArc size="md" className="..." />
```
