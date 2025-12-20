# IArche — Règles Direction Artistique Médias
## Version 4.1 | Gouvernance Visuelle

> **Objectif** : Cohérence + Lisibilité mobile + Rendu premium constant  
> **Définition "Zéro visuel moche"** : Export bloqué si fail WCAG ou safe zones, layout guidé par slots, palette 100% tokens, règles non contournables.

---

## 1. RÈGLES NON NÉGOCIABLES

### RÈGLE 1 — Arc (Élément Signature)

| Contexte | Statut | Taille |
|----------|--------|--------|
| Sous H1 (titre principal) | ✅ Autorisé | `lg` ou `xl` |
| Sous H2 (titre section) | ✅ Autorisé | `md` |
| Séparateur de section | ✅ Autorisé | `md` |
| Header avec logo | ❌ INTERDIT | — |
| Cards (ResourceCard, etc.) | ❌ INTERDIT | — |
| Footer | ❌ INTERDIT | — |
| Signatures email | ❌ INTERDIT | — |
| Taille `sm` | ❌ INTERDIT | Effet "cheap" |

**Règle technique** : Aucun prop `showArc={true}` dans les composants. L'usage est décidé par le layout, jamais par l'utilisateur.

---

### RÈGLE 2 — Thème Terra (Premium Lisible)

| Élément | Valeur obligatoire | Interdit |
|---------|-------------------|----------|
| Texte principal | `#FAF9F7` | Toute autre couleur |
| Texte secondaire | `rgba(250,249,247,0.88)` minimum | Alpha < 0.88 |
| Baseline/Tagline | `#FAF9F7` + `font-weight: 600` min | Gris, alpha faible |
| Accent | `#1A2B4A` (Bleu Nuit) | Terracotta (déjà en fond) |

**Contraste minimum** : 4.5:1 (WCAG AA)

---

### RÈGLE 3 — Exclusions Mutuelles (Anti-Doublon)

| Combinaison | Statut |
|-------------|--------|
| Logo + Arc dans un header | ❌ INTERDIT |
| Double logo (ex: header + footer même zone) | ❌ INTERDIT |
| Arc + Arc (deux arcs visibles simultanément) | ❌ INTERDIT |
| Terracotta texte sur fond Terracotta | ❌ INTERDIT |
| Bleu Nuit texte sur fond Bleu Nuit | ❌ INTERDIT |

---

### RÈGLE 4 — Safe Zones (Marges Obligatoires)

| Format | Dimensions | Safe Zone |
|--------|------------|-----------|
| Carrousel LinkedIn | 1080×1350 | **64px** tous bords |
| Banner LinkedIn | 1584×396 | **48px** H / **32px** V |
| Post carré | 1200×1200 | **80px** tous bords |
| Post paysage | 1200×627 | **64px** H / **48px** V |
| Story | 1080×1920 | **80px** tous bords |
| Thumbnail | 1920×1080 | **96px** tous bords |
| Open Graph | 1200×630 | **64px** tous bords |
| Signature email | 600×200 | **24px** tous bords |
| Header email | 600×150 | **32px** H / **16px** V |

**Règle** : Aucun élément (texte, logo, arc) ne peut toucher ou dépasser la safe zone.

---

## 2. HIÉRARCHIE TYPOGRAPHIQUE

### Ratios Obligatoires

| Niveau | Ratio vs Body | Exemple (body 16px) |
|--------|---------------|---------------------|
| H1 | ≥ 2.5× | 40px+ |
| H2 | ≥ 1.75× | 28px+ |
| H3 | ≥ 1.4× | 22px+ |
| Body | 1× | 16px |
| Caption | 0.875× | 14px |

### Poids Typographiques

| Niveau | Weight |
|--------|--------|
| H1 | 700 (Bold) |
| H2 | 600 (Semibold) |
| H3 | 600 (Semibold) |
| Body | 400 (Regular) |
| Caption | 400 (Regular) |
| Baseline/Tagline | 600 (Semibold) |

### Auto-Typography (Réduction Progressive)

Si le titre dépasse **2 lignes** :
1. Réduction taille : -10% par ligne supplémentaire
2. Resserrage tracking : `letter-spacing: -0.02em`
3. Ajustement line-height : de 1.2 à 1.1

---

## 3. DENSITÉ COGNITIVE

### Limites par Format

| Format | Max blocs texte | Max caractères/slide | Max éléments visuels |
|--------|-----------------|---------------------|---------------------|
| Carrousel | 2 (headline + bullets) | 320 | 3 (logo, arc, icône) |
| Banner | 2 (headline + tagline) | 120 | 2 (logo, photo) |
| Post carré | 3 (hook + bullets + CTA) | 250 | 3 |
| Story | 2 | 180 | 2 |

### Règle Icônes

- **Max 1 icône par bloc**
- **Max 3 icônes par slide/visuel**
- Style : monoline uniquement
- Taille : cohérente avec le texte adjacent

### Règle Photos

- **0 ou 1 photo** (jamais collage)
- Si photo : recadrage automatique + overlay gradient
- Photo hero uniquement, pas de vignettes multiples

---

## 4. PALETTE STRICTE

### Couleurs Autorisées

```
Primaires:
  bleuNuit:     #1A2B4A  (fond dark, texte sur light)
  terracotta:   #B04A32  (accent, fond terra)
  blancCasse:   #FAF9F7  (fond light, texte sur dark/terra)

Texte:
  white:        #FFFFFF  (titres sur dark)
  whiteAlpha80: rgba(255,255,255,0.8)  (sous-texte dark)
  whiteAlpha88: rgba(250,249,247,0.88) (sous-texte terra - minimum)
  subtle:       #666666  (sous-texte light)

Surfaces:
  secondary:    #F5F3EF  (cartes sur light)
  border:       #E8E4DD  (bordures light)
```

### Couleurs INTERDITES

- Gris hors palette (#888, #999, #AAA, etc.)
- Couleurs non-brand (bleu vif, vert, violet, etc.)
- Alpha < 0.4 sur texte

---

## 5. DO / DON'T

### ✅ DO

- Arc sous le titre principal d'une slide
- Logo seul en header (sans arc)
- Blanc cassé sur fond Terra
- Safe zones respectées
- Max 2 niveaux typographiques par zone
- Preview mobile avant export

### ❌ DON'T

- Arc + Logo ensemble en header
- Arc dans les cards
- Texte gris/alpha faible sur Terra
- Éléments touchant les bords
- Plus de 3 blocs texte par slide
- Export sans vérification score qualité
- Taille arc `sm` (effet cheap)
- Double branding (2 logos visibles)

---

## 6. CHECKLIST QA (Avant Export)

```
□ Contraste WCAG AA (4.5:1 texte, 3:1 gros titres)
□ Safe zones respectées (aucune collision)
□ Hiérarchie typo correcte (H1 > H2 > Body)
□ Densité < seuil (caractères, blocs, éléments)
□ Palette 100% tokens (pas de couleur hors charte)
□ Arc correctement placé (ou absent si interdit)
□ Pas de doublon branding
□ Preview mobile LinkedIn vérifié
□ Score qualité ≥ 80/100
```

---

## 7. VERSIONING

| Version | Date | Changements |
|---------|------|-------------|
| v4.0 | 2024-12 | Arc remplace barre, nouveau logo SVG |
| v4.1 | 2024-12 | Terra subtext #FAF9F7, arc retiré des cards |
| v4.2 | À venir | Quality Score, Safe Zones, Layouts à Slots |

---

*Document de gouvernance DA — Source de vérité pour tous les composants médias IArche*
