# Charte Graphique IArche v4.0

## Changelog v4.0 (Décembre 2024)

### Logo
- **Nouveau design** : Arc au-dessus du texte "IArche" avec gradient Bleu Nuit → Terracotta
- **Variantes** : main (gradient), white (fond sombre), dark (monochrome)
- **Icône** : Symbole arc seul pour favicon/PWA

### Éléments décoratifs
- **Arc** remplace la barre gradient horizontale sous les titres
- **Animations SVG** : Arcs animés au lieu des lignes "canalisation"

### Fichiers logo
- `/logos/iarche-main.svg` - Logo principal gradient
- `/logos/iarche-white.svg` - Logo blanc
- `/logos/iarche-dark.svg` - Logo Bleu Nuit
- `/logos/iarche-vertical.svg` - Version verticale
- `/logos/iarche-icon-32.svg` - Favicon
- `/logos/iarche-icon-512.svg` - PWA/OG

### Couleurs (inchangées)
- Bleu Nuit : #1A2B4A
- Terracotta : #B04A32
- Blanc Cassé : #FAF9F7

### Composants mis à jour
- `Logo.tsx` - Nouveau composant logo SVG
- `LogoArc.tsx` - Arc décoratif
- `AnimatedArcs.tsx` - Animations hero
- `GradientTitle.tsx` - Utilise arc au lieu de barre
- `Header.tsx` - Intègre nouveau logo
