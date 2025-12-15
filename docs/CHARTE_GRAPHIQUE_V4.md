# IArche Charte Graphique v4.0

## Changements majeurs

### Logo
- **Logo officiel SVG** : Remplace le texte gradient animé
- **Variantes** : main (gradient), white, dark
- **Icône** : Arc seul pour favicon/PWA

### Éléments décoratifs
- **Arc décoratif** : Reproduction de la "virgule" du logo (I→E)
- **Remplace** : Barre gradient horizontale ET lignes canalisation
- **Tailles** : sm (60px), md (100px), lg (160px), xl (220px)

### Suppressions v4.0
- ❌ Lignes canalisation (HTMLCanalisationLines, PDFCanalisationLines)
- ❌ AnimatedArcs (remplacé par arc statique du logo)
- ❌ Texte gradient "IArche" (remplacé par logo SVG)

### Fichiers logo
- `/logos/iarche-main.svg` - Logo principal gradient
- `/logos/iarche-white.svg` - Logo blanc
- `/logos/iarche-dark.svg` - Logo Bleu Nuit
- `/logos/iarche-icon-32.svg` - Favicon
- `/logos/iarche-icon-512.svg` - PWA icon

### Composants mis à jour
- `Logo.tsx` - Affiche le logo SVG officiel
- `LogoArc.tsx` - Arc décoratif (virgule du logo)
- `GradientTitle.tsx` - Utilise LogoArc sous les titres
- `hero-section.tsx` - Logo SVG + arc au lieu de texte gradient
- `HTMLBaseTemplate.tsx` - Sans canalisations
- Tous les éditeurs médias - Options canalisation supprimées

### Couleurs (inchangées)
- Bleu Nuit: `hsl(218, 47%, 20%)` / #1A2B4A
- Terracotta: `hsl(12, 60%, 44%)` / #B04A32
- Blanc Cassé: `hsl(30, 14%, 98%)` / #FAF9F7
