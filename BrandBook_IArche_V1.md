# Brand Book IArche

**Version :** 2.0  
**Date : 1er Décembre 2025**  
**Document de référence pour l'identité visuelle IArche**

---

## 1. POSITIONNEMENT DE MARQUE

### 1.1 Mission
Accompagner les dirigeants de PME françaises dans l'intégration concrète de l'intelligence artificielle, de l'audit à l'autonomie.

### 1.2 Vision
Devenir le partenaire IA de référence pour les PME françaises qui veulent des résultats, pas des promesses.

### 1.3 Baseline
**"L'IA se construit avec vous"**

Cette baseline exprime :
- Le partenariat (avec vous, pas pour vous)
- Le processus concret (se construit, pas "se rêve")
- L'implication mutuelle (collaboration, pas prestation)

### 1.4 Valeurs de marque

| Valeur | Expression |
|--------|------------|
| **Concret** | Résultats mesurables, pas de jargon, preuves tangibles (4 SaaS en production) |
| **Partenaire** | On fait avec, pas pour. Objectif : rendre le client autonome |
| **Pragmatique** | Solutions qui marchent, pas innovations pour le buzz |
| **Clarté** | Pas de jargon tech, communication accessible |
| **Ancré** | Basé à Bayonne, expertise française, proximité |

### 1.5 Ce que IArche est / n'est pas

| IArche EST | IArche N'EST PAS |
|------------|------------------|
| Partenaire qui accompagne | Prestataire qui exécute |
| Pragmatique et concret | Vendeur de rêve IA |
| Agence + Éditeur SaaS | Cabinet de conseil pur |
| Expert accessible | Startup jargonnante |
| Ancré localement, portée nationale | Agence parisienne déconnectée |

---

## 2. LOGO

### 2.1 Logo principal - Texte avec gradient animé

**Texte :** IArche  
**Style :** Gradient linéaire animé  
**Typographie :** Manrope 600 (Semibold)

**Implémentation standard :**

```jsx
<span className="hero-gradient-text text-3xl font-semibold">IArche</span>
```

**Spécifications du gradient animé :**

| Propriété | Valeur |
|-----------|--------|
| Direction | 270deg (droite → gauche) |
| Couleurs | Bleu Nuit → Terracotta → Bleu Nuit → Terracotta |
| Background-size | 600% 600% |
| Animation | 8 secondes, ease, boucle infinie |
| Optimisation | `will-change: background-position` |

**CSS défini dans `src/index.css` :**

```css
@keyframes gradientText {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.hero-gradient-text {
  background: linear-gradient(270deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)), hsl(var(--accent)));
  background-size: 600% 600%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientText 8s ease infinite;
  will-change: background-position;
}
```

### 2.2 Logo avec barre décorative

**NOUVEAUTÉ V2.0 :** Le logo IArche est toujours accompagné d'une barre décorative gradient positionnée en dessous.

**Spécifications de la barre décorative :**

| Taille | Largeur | Épaisseur | Contexte |
|--------|---------|-----------|----------|
| sm | 48px | 2px | Placeholder cards, petits formats |
| md | 80px | 4px | Header, formats moyens |
| lg | 96px | 4px | Formats intermédiaires |
| xl | 128px | 6px | Hero, grands formats |

### 2.3 Logo Editor - Exports configurables

**Route admin :** `/admin/medias/logo`

**Modes d'export (sélectionnables individuellement par variante) :**
- **Seul** : Logo PNG uniquement
- **+ Barre** : Logo + barre décorative gradient
- **Complet** : Logo + barre + mesh background + lignes canalisation

**Variantes disponibles :**
- Gradient (principal, fond Blanc Cassé)
- Blanc (fonds sombres, fond Bleu Nuit)
- Terracotta (accent, fond Blanc Cassé)

**Taille de barre configurable :** sm / md / lg / xl (indépendant de la taille d'export logo)

| Contexte d'usage historique | Largeur barre | Épaisseur | Marge supérieure |
|-----------------------------|---------------|-----------|------------------|
| Hero (xl) | w-32 (128px) | h-1.5 (6px) | mt-2 |
| Header | w-16 (64px) | h-1 (4px) | mt-1 |
| Placeholder cards | w-12 (48px) | h-0.5 (2px) | mt-2 |
| Placeholder large | w-20 (80px) | h-1 (4px) | mt-2 |

**Style de la barre :**

```css
.decorative-bar {
  background: linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)));
  border-radius: 9999px; /* rounded-full */
}
```

### 2.3 Déclinaisons fichiers

| Version | Fichier | Usage |
|---------|---------|-------|
| **Principale (gradient)** | `logo-iarche.svg` | Usage standard web et print |
| **PNG transparent** | `logo-iarche.png` | Réseaux sociaux, présentations |
| **Monochrome blanc** | `logo-iarche-white.svg` | Fonds sombres |
| **Monochrome Bleu Nuit** | `logo-iarche-dark.svg` | Version sobre, fonds clairs |

### 2.4 Zone de protection

Espace minimum autour du logo : **hauteur du "I"** sur tous les côtés.

### 2.5 Tailles minimales

| Support | Taille minimale |
|---------|-----------------|
| Web | 80px de largeur |
| Print | 25mm de largeur |
| Favicon | 32x32px (version simplifiée "IA") |

### 2.6 Usages interdits

- ❌ Modifier les couleurs du gradient
- ❌ Étirer ou déformer le logo
- ❌ Ajouter des effets (ombre, contour, 3D)
- ❌ Placer sur fond qui réduit la lisibilité
- ❌ Utiliser une autre typographie
- ❌ Supprimer la barre décorative

---

## 3. SYSTÈME DE TITRES - GradientTitle

### 3.1 Composant réutilisable

**Fichier :** `src/components/ui/GradientTitle.tsx`

Le composant `GradientTitle` standardise l'affichage des titres avec gradient animé et barre décorative proportionnelle.

### 3.2 Variantes de taille

| Taille | Typographie | Barre décorative | Usage |
|--------|-------------|------------------|-------|
| **sm** | text-base md:text-lg font-semibold | w-12 h-0.5 mt-1 | Titres dans les cards |
| **md** | text-2xl md:text-3xl font-bold | w-20 h-1 mt-2 | Titres de sections |
| **lg** | text-3xl md:text-5xl font-bold | w-24 h-1 mt-2 | Titres de pages |
| **xl** | text-5xl md:text-6xl lg:text-7xl font-semibold | w-32 h-1.5 mt-2 | Hero principal |

### 3.3 Props du composant

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `children` | ReactNode | - | Contenu du titre |
| `size` | 'sm' \| 'md' \| 'lg' \| 'xl' | 'lg' | Taille du titre |
| `as` | 'h1' \| 'h2' \| 'h3' \| 'h4' \| 'span' | 'h1' | Élément HTML |
| `centered` | boolean | true | Centrage du titre |
| `className` | string | '' | Classes wrapper |
| `textClassName` | string | '' | Classes texte (ex: line-clamp-2) |

### 3.4 Exemples d'utilisation

**Titre de page (lg) :**
```tsx
<GradientTitle size="lg">Actualités</GradientTitle>
```

**Titre de card (sm) :**
```tsx
<GradientTitle size="sm" as="h2" centered={false} textClassName="line-clamp-2">
  {article.title}
</GradientTitle>
```

**Hero principal (xl) :**
```tsx
<GradientTitle size="xl" className="mb-0">
  <span>IArche</span>
</GradientTitle>
```

### 3.5 Application sur le site

| Page/Composant | Taille utilisée |
|----------------|-----------------|
| Hero section (/) | xl |
| Header (logo) | Barre manuelle h-1 |
| Pages listing (/actualites, /articles, etc.) | lg |
| Pages slug (/actualites/:slug, etc.) | lg |
| Cards articles | sm |
| RelatedArticles cards | sm |
| Sections (Newsletter, etc.) | md |

---

## 4. PALETTE COULEURS

### 4.1 Tokens CSS (Design System)

Toutes les couleurs sont définies en HSL dans `src/index.css` et utilisées via tokens CSS.

**Couleurs principales :**

| Token | HSL | HEX équivalent | Usage |
|-------|-----|----------------|-------|
| `--primary` | 218 47% 20% | #1A2B4A | Bleu Nuit - Titres, logo, éléments structurants |
| `--accent` | 12 60% 53% | #D15A3E | Terracotta - CTA, accents, focus |
| `--background` | 30 14% 98% | #FAF9F7 | Blanc Cassé - Fond principal |
| `--foreground` | 0 0% 18% | #2D2D2D | Anthracite - Texte principal |

**Couleurs secondaires :**

| Token | HSL | Usage |
|-------|-----|-------|
| `--secondary` | 30 20% 93% | Gris Sable - Fonds alternés, cards |
| `--muted-foreground` | 0 0% 40% | Texte secondaire |
| `--text-subtle` | 0 0% 40% | Texte discret (meilleur contraste WCAG) |
| `--border` | 30 16% 88% | Bordures, séparateurs |
| `--success` | 153 34% 36% | Vert Sauge - Validation |
| `--destructive` | 12 55% 50% | Terracotta doux - Erreurs |

### 4.2 Utilisation dans Tailwind

```tsx
// ✅ Correct - Utilise les tokens
<div className="bg-background text-primary border-border" />
<span className="text-accent" />

// ❌ Interdit - Couleurs hardcodées
<div className="bg-[#FAF9F7]" />
<span className="text-[#D15A3E]" />
```

### 4.3 Focus et accessibilité

**Focus ring standardisé (WCAG AAA) :**

```css
*:focus-visible {
  outline: 2px solid hsl(var(--accent)); /* Terracotta */
  outline-offset: 2px;
  border-radius: 0.25rem;
}
```

---

## 5. TYPOGRAPHIE

### 5.1 Police principale

**Manrope** — Google Fonts  
https://fonts.google.com/specimen/Manrope

Poids utilisés :
- 400 (Regular) — Corps de texte
- 500 (Medium) — Sous-titres, CTA
- 600 (Semibold) — Titres, logo
- 700 (Bold) — Mise en emphase forte

**Configuration Tailwind :**
```ts
fontFamily: {
  sans: ['Manrope', 'system-ui', 'sans-serif'],
}
```

### 5.2 Hiérarchie typographique

| Niveau | Taille web | Poids | Usage |
|--------|-----------|-------|-------|
| H1 | text-3xl md:text-5xl | 700 (bold) | Titre principal page |
| H1 Hero | text-5xl md:text-6xl lg:text-7xl | 600 (semibold) | Hero IArche |
| H2 | text-2xl md:text-3xl | 700 (bold) | Titres de section |
| H3 | text-base md:text-lg | 600 (semibold) | Titres cards |
| Body | text-base (16px) | 400 | Texte courant |
| Small | text-sm (14px) | 400 | Annotations |
| Caption | text-xs (12px) | 400 | Dates, mentions |

### 5.3 Mise en valeur SEO (strong)

Les balises `<strong>` dans le contenu éditorial utilisent le Bleu IArche avec surlignage subtil :

```css
article strong {
  color: hsl(var(--primary));
  font-weight: 600;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    transparent 40%,
    hsla(218, 47%, 20%, 0.08) 40%,
    hsla(218, 47%, 20%, 0.08) 100%
  );
  padding: 0.1em 0.2em;
  border-radius: 2px;
}
```

---

## 6. ARRIÈRE-PLAN - BackgroundLayout

### 6.1 Composant principal

**Fichier :** `src/components/layouts/BackgroundLayout.tsx`

Composant wrapper réutilisable appliquant le design system IArche sur toutes les pages.

### 6.2 Structure visuelle

```
┌────────────────────────────────────────────────┐
│  BACKGROUND (#FAF9F7 - Blanc Cassé)            │
│                                                │
│  ╲╱ Quadrillage diagonal 45° (opacity: 0.2)    │
│  ╱╲ Animation: patternScroll 40s linear        │
│                                                │
│  ╱╲ Quadrillage diagonal -45° (opacity: 0.1)   │
│  ╲╱ Animation: patternScroll 40s, delay 10s    │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  CONTENU PRINCIPAL (z-index: 10)         │  │
│  │  - Header, sections, footer              │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

### 6.3 Quadrillages diagonaux (maillage)

**Quadrillage 1 (45°) :**
```css
{
  background: repeating-linear-gradient(
    45deg, 
    transparent, 
    transparent 20px, 
    hsl(var(--border)) 20px, 
    hsl(var(--border)) 22px
  );
  opacity: 0.2;
  animation: patternScroll 40s linear infinite;
}
```

**Quadrillage 2 (-45°) :**
```css
{
  background: repeating-linear-gradient(
    -45deg, 
    transparent, 
    transparent 20px, 
    hsl(var(--border)) 20px, 
    hsl(var(--border)) 22px
  );
  opacity: 0.1;
  animation: patternScroll 40s linear infinite;
  animation-delay: 10s;
}
```

**Keyframe animation :**
```css
@keyframes patternScroll {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}
```

### 6.4 Usage

```tsx
import BackgroundLayout from '@/components/layouts/BackgroundLayout';

const Page = () => (
  <BackgroundLayout>
    <Header />
    {/* Contenu */}
    <Footer />
  </BackgroundLayout>
);
```

---

## 7. ANIMATIONS SVG - Lignes Canalisation

### 7.1 Description

Lignes SVG animées représentant des "canalisations" formant une arche. Présentes sur :
- Hero section (page d'accueil)
- Composant ArticlePlaceholder

### 7.2 Spécifications techniques

**Structure générale :**

| Propriété | Valeur |
|-----------|--------|
| Stroke width | 2px (hero) / 3px (placeholder) |
| Opacity | 0.5 (hero) / 0.7 (placeholder) |
| Animation | stroke-dasharray/dashoffset |
| Durée | 6 secondes |
| Easing | ease-in-out |
| Délai | 300-500ms |

### 7.3 Gradients des lignes

**Ligne 1 (droite → gauche) :**
```svg
<linearGradient id="canalisationGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stopColor="hsl(var(--primary))" />   <!-- Bleu Nuit -->
  <stop offset="100%" stopColor="hsl(var(--accent))" />  <!-- Terracotta -->
</linearGradient>
```

**Ligne 2 (gauche → droite) :**
```svg
<linearGradient id="canalisationGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stopColor="hsl(var(--accent))" />    <!-- Terracotta -->
  <stop offset="100%" stopColor="hsl(var(--primary))" /> <!-- Bleu Nuit -->
</linearGradient>
```

### 7.4 Animation JavaScript

```javascript
useEffect(() => {
  document.querySelectorAll('.canalisation-line').forEach(path => {
    const svgPath = path as SVGGeometryElement;
    const len = svgPath.getTotalLength();
    
    // Configuration initiale
    path.style.strokeDasharray = `${len}px`;
    path.style.strokeDashoffset = `${len}px`;
    
    // Animation de tracé progressif
    setTimeout(() => {
      path.style.transition = 'stroke-dashoffset 6s ease-in-out';
      path.style.strokeDashoffset = '0px';
    }, 500);
  });
}, []);
```

### 7.5 CSS des lignes

```css
.canalisation-line {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  opacity: 0.5;
}
```

---

## 8. COMPOSANT ArticlePlaceholder

### 8.1 Description

**Fichier :** `src/components/ui/ArticlePlaceholder.tsx`

Composant placeholder affichant le logo IArche avec gradient animé, barre décorative et arches SVG croisées. Utilisé quand aucune image de couverture n'est disponible.

### 8.2 Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `className` | string | '' | Classes Tailwind (hauteur, etc.) |
| `size` | 'default' \| 'large' | 'default' | Taille du logo et de la barre |

### 8.3 Variantes de taille

| Variante | Logo | Barre décorative | Usage |
|----------|------|------------------|-------|
| `default` | text-3xl md:text-4xl | w-12 h-0.5 | Cards listing |
| `large` | text-4xl md:text-5xl | w-20 h-1 | Pages détail |

### 8.4 Structure visuelle

```
┌─────────────────────────────────────┐
│  ╲─────────────────────────╱        │ ← Ligne SVG 1 (Bleu→Terracotta)
│    ╲                     ╱          │
│      ╲                 ╱            │
│                                     │
│           IArche                    │ ← Logo gradient animé
│           ══════                    │ ← Barre décorative
│                                     │
│      ╱                 ╲            │
│    ╱                     ╲          │
│  ╱─────────────────────────╲        │ ← Ligne SVG 2 (Terracotta→Bleu)
└─────────────────────────────────────┘
```

### 8.5 Arches SVG

**Arch 1 (droite → gauche) :**
- viewBox: `0 0 400 360`
- Path: `M 398 2 L 121 2 C 119 2 117 4 117 6 L 117 176 C 117 178 115 180 113 180 L 0 180`
- strokeWidth: 3px
- opacity: 0.7

**Arch 2 (gauche → droite) :**
- viewBox: `0 0 400 106`
- Path: `M 0 2 L 278 2 C 280 2 282 4 282 6 L 282 101 C 282 103 284 105 286 105 L 400 105`
- strokeWidth: 3px
- opacity: 0.7

### 8.6 Exemples d'utilisation

**Cards listing :**
```tsx
<ArticlePlaceholder className="h-40" />
```

**Pages détail :**
```tsx
<ArticlePlaceholder className="mb-6 rounded-xl h-56 md:h-72" size="large" />
```

---

## 9. RECTANGLES DÉCORATIFS

### 9.1 Description

Rectangles avec bordures discrètes et animation de pulsation, présents uniquement sur la page Hero (/).

### 9.2 Spécifications

| Propriété | Valeur |
|-----------|--------|
| Bordure | 1px solid hsl(var(--border) / 0.3) |
| Border-radius | 0.5rem (rounded-lg) |
| Animation | constructionFade 6s ease-in-out infinite |
| Délais | 0s, 1s, 2s, 3s (cascade) |

### 9.3 Keyframe

```css
@keyframes constructionFade {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}
```

### 9.4 Positions

| Rectangle | Position | Taille |
|-----------|----------|--------|
| 1 | top-20 left-10 | w-32 h-32 |
| 2 | bottom-32 right-20 | w-24 h-24 |
| 3 | top-1/2 right-10 | w-40 h-40 |
| 4 | bottom-20 left-1/4 | w-28 h-28 |

---

## 10. ANIMATIONS - Récapitulatif complet

### 10.1 Keyframes définies (tailwind.config.ts)

| Animation | Durée | Easing | Usage |
|-----------|-------|--------|-------|
| `fadeIn` | 0.6s | ease-out | Apparition éléments |
| `gradientText` | 8s | ease | Logo IArche |
| `patternScroll` | 40s | linear | Quadrillages fond |
| `constructionFade` | 6s | ease-in-out | Rectangles décoratifs |
| `subtlePulse` | 3s | ease-in-out | Pulsation douce |
| `accordion-down/up` | 0.2s | ease-out | Accordéons |

### 10.2 Animations CSS personnalisées (index.css)

| Animation | Durée | Usage |
|-----------|-------|-------|
| `pageTransition` | 0.4s | Transition entre pages |
| `gradientText` | 8s | Classe .hero-gradient-text |

### 10.3 Animations JavaScript

| Animation | Durée | Délai | Usage |
|-----------|-------|-------|-------|
| Canalisation lines | 6s | 300-500ms | Lignes SVG hero/placeholder |

### 10.4 Accessibilité - Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 11. COMPOSANTS CTA

### 11.1 GradientLink

**Fichier :** `src/components/ui/GradientLink.tsx`

Lien avec texte en gradient animé et flèche → dynamique.

**Caractéristiques :**
- Texte avec classe `hero-gradient-text`
- Flèche → avec animation translate-x au hover
- Underline dynamique avec stroke gradient

### 11.2 GradientButton

**Fichier :** `src/components/ui/GradientButton.tsx`

Bouton avec fond gradient et effets hover.

### 11.3 IArcheLink

Lien secondaire avec texte Bleu Nuit et flèche Terracotta.

---

## 12. ICONOGRAPHIE

### 12.1 Bibliothèque

**Lucide React** — https://lucide.dev

### 12.2 Style

| Propriété | Valeur |
|-----------|--------|
| Stroke width | 2px |
| Taille standard | 24px (1.5rem) |
| Couleur | `hsl(var(--primary))` ou `hsl(var(--accent))` |
| Style | Outline (pas filled) |

---

## 13. STRUCTURE DES PAGES

### 13.1 Pages listing (14 pages)

| Route | Titre | GradientTitle |
|-------|-------|---------------|
| `/actualites` | Actualités | size="lg" |
| `/articles` | Articles | size="lg" |
| `/cas-clients` | Cas clients | size="lg" |
| `/livres-blancs` | Livres blancs | size="lg" |
| `/ateliers-webinaires` | Ateliers & Webinaires | size="lg" |
| `/services` | Services | size="lg" |
| `/solutions` | Solutions | size="lg" |
| `/contact` | Nous contacter | size="lg" |
| `/newsletter` | Newsletter | size="lg" |
| `/livre-or` | Livre d'or | size="lg" |
| `/mentions-legales` | Mentions légales | size="lg" |
| `/conditions-generales` | Conditions générales | size="lg" |
| `/confidentialite` | Politique de confidentialité | size="lg" |
| `/status` | Status | size="lg" |

### 13.2 Pages slug (détail)

| Route pattern | GradientTitle | ArticlePlaceholder |
|---------------|---------------|-------------------|
| `/actualites/:slug` | size="lg" | size="large" |
| `/articles/:slug` | size="lg" | size="large" |
| `/cas-clients/:slug` | size="lg" | size="large" |
| `/livres-blancs/:slug` | size="lg" | size="large" |
| `/ateliers-webinaires/:slug` | size="lg" | size="large" |
| `/services/:slug` | size="lg" | - |
| `/solutions/:slug` | size="lg" | - |

### 13.3 Cards dans les listings

Toutes les cards utilisent :
- `GradientTitle size="sm"` pour le titre
- `ArticlePlaceholder` (default) si pas d'image

---

## 14. TON DE VOIX

### 14.1 Personnalité verbale

| Attribut | Expression |
|----------|------------|
| **Direct** | Pas de détours, aller à l'essentiel |
| **Accessible** | Pas de jargon tech, vulgarisation |
| **Confiant** | Affirmatif, pas hésitant |
| **Chaleureux** | Humain, pas corporate froid |
| **Pragmatique** | Orienté résultats, concret |

### 14.2 Exemples Do / Don't

| ❌ Don't | ✅ Do |
|----------|-------|
| "Nous leverageons les synergies IA" | "On intègre l'IA là où ça compte" |
| "Notre solution disruptive..." | "Une solution qui fonctionne" |
| "N'hésitez pas à nous contacter" | "Une question ? Parlons-en" |
| "Nous sommes leaders de..." | "4 solutions en production" |

### 14.3 Formules récurrentes

- "L'IA se construit avec vous"
- "Du concret, pas des slides"
- "Résultats mesurables"
- "De l'audit à l'autonomie"
- "On fait avec vous, pas pour vous"

---

## 15. MODULE MÉDIAS - Génération PDF & PNG

### 15.1 Description

Module d'administration (`/admin/medias`) permettant de créer des contenus PDF et PNG conformes à la charte graphique IArche :
- **Carrousels LinkedIn/Instagram** (PDF)
- **Présentations PDF (16:9)**
- **Documents Word**
- **Visuels PNG** : Banner, Post, Story, Thumbnail, OpenGraph, HeaderEmail, Signature

**Architecture fichiers :**
```
src/components/admin/medias/
├── shared/
│   ├── tokens.ts      ← Source unique de vérité (couleurs, gradients, tailles)
│   └── index.ts       ← Export centralisé
├── html/              ← Composants pour PNG (via html-to-image)
│   ├── tokens.ts
│   ├── HTMLBaseTemplate.tsx
│   ├── HTMLCanalisationLines.tsx
│   ├── HTMLMeshBackground.tsx
│   ├── HTMLGradientBar.tsx
│   └── HTMLLogo.tsx
├── pdf/               ← Composants pour PDF (@react-pdf/renderer)
│   ├── tokens.ts
│   ├── PDFCanalisationLines.tsx
│   ├── PDFMeshBackground.tsx
│   ├── PDFGradientBar.tsx
│   └── PDFLogo.tsx
└── templates/
    ├── CarouselPDF.tsx
    └── PresentationPDF.tsx
```

### 15.2 Tokens partagés (Single Source of Truth)

**Fichier :** `src/components/admin/medias/shared/tokens.ts`

| Catégorie | Contenu |
|-----------|---------|
| **COLORS** | bleuNuit (#1A2B4A), terracotta (#D15A3E), blancCasse (#FAF9F7), variantes alpha |
| **GRADIENTS** | bar (90°), barReverse, background (135°), text (270°) |
| **FONTS** | html: Manrope, pdf: Helvetica |
| **BAR_SIZES** | sm (48×2), md (80×4), lg (96×4), xl (128×6) |
| **LOGO_SIZES** | sm (24px), md (32px), lg (48px), xl (64px) |
| **EXPORT_FORMATS** | Toutes dimensions (carousel, banner, post, story, thumbnail, etc.) |

### 15.3 Lignes Canalisation (signature visuelle)

Reproduction des lignes SVG animées du hero section, en version statique.

**PDF :** `src/components/admin/medias/pdf/PDFCanalisationLines.tsx`  
**PNG :** `src/components/admin/medias/html/HTMLCanalisationLines.tsx`

**Spécifications techniques :**

| Propriété | PDF | PNG |
|-----------|-----|-----|
| Stroke width | 7px fixe | 3-8px (selon format) |
| Opacity | 0.6 | 0.25-0.5 (selon format) |
| Stroke linecap | round | round |
| Coins | Quadratic Bezier | Quadratic Bezier |

**Tracé des lignes :**

| Ligne | Tracé |
|-------|-------|
| Ligne 1 | Entrée droite → coin haut-gauche (30%) → sortie bas-gauche |
| Ligne 2 | Entrée gauche → coin haut-droite (70%) → sortie bas-droite |

**Couleurs par thème :**

| Thème | Ligne 1 | Ligne 2 |
|-------|---------|---------|
| **Bleu Nuit (dark)** | Terracotta | Terracotta |
| **Blanc Cassé (light)** | Bleu Nuit | Terracotta |

### 15.4 Éditeurs PNG avec Canalisations

| Éditeur | Route | Dimensions | Opacity | StrokeWidth |
|---------|-------|------------|---------|-------------|
| Banner LinkedIn | `/admin/medias/banner` | 1584×396 | 0.4 | 5 |
| Post Square | `/admin/medias/post` | 1200×1200 | 0.4 | 6 |
| Post Landscape | `/admin/medias/post` | 1200×627 | 0.4 | 5 |
| Story | `/admin/medias/story` | 1080×1920 | 0.5 | 8 |
| Thumbnail 1080p | `/admin/medias/thumbnail` | 1920×1080 | 0.4 | 7 |
| Thumbnail 720p | `/admin/medias/thumbnail` | 1280×720 | 0.4 | 5 |
| OpenGraph | `/admin/medias/opengraph` | 1200×630 | 0.4 | 5 |
| Header Email | `/admin/medias/header-email` | 600×150 | 0.25-0.35 | 2-3 |
| Signature | `/admin/medias/signature` | 600×200 | N/A (table HTML) | N/A |

### 15.5 Logo PDF/PNG

| Thème | Variante logo | Composant PDF | Composant HTML |
|-------|---------------|---------------|----------------|
| Bleu Nuit | Terracotta (orange fixe) | PDFImageLogo | HTMLLogo |
| Blanc Cassé | Gradient | PDFImageLogo | HTMLLogo |

### 15.6 Autres éléments visuels

| Élément | PDF | PNG | Description |
|---------|-----|-----|-------------|
| Barre décorative | PDFGradientBar | HTMLGradientBar | 4 tailles (sm/md/lg/xl) |
| Motif diagonal | PDFMeshBackground | HTMLMeshBackground | Quadrillage 45° |
| Arches coins | PDFArches | HTMLArches | Version simplifiée (coins uniquement) |

### 15.7 Formats d'export

**PDF :**

| Format | Dimensions | Usage |
|--------|------------|-------|
| LinkedIn Carousel | 1080 × 1350 px | Posts carrousel LinkedIn |
| Instagram Carousel | 1080 × 1080 px | Posts carrousel Instagram |
| Présentation | 1920 × 1080 px | Slides 16:9 |
| A4 | 595 × 842 px | Documents imprimables |

**PNG :**

| Format | Dimensions | Usage |
|--------|------------|-------|
| Banner LinkedIn | 1584 × 396 px | Bannière profil/page |
| Post Square | 1200 × 1200 px | Posts carrés |
| Post Landscape | 1200 × 627 px | Posts paysage |
| Story | 1080 × 1920 px | Stories verticales |
| Thumbnail 1080p | 1920 × 1080 px | Miniatures YouTube |
| Thumbnail 720p | 1280 × 720 px | Miniatures YouTube |
| OpenGraph | 1200 × 630 px | Partage réseaux sociaux |
| Header Email | 600 × 150 px | En-tête newsletter |
| Signature | 600 × 200 px | Signature email |

### 15.8 Workflow de création

1. Accéder à `/admin/medias`
2. Choisir l'onglet (Documents PDF ou Visuels PNG)
3. Sélectionner un template
4. Remplir le contenu (titre, sous-titre, etc.)
5. Choisir le thème de départ (Bleu Nuit ou Blanc Cassé)
6. Prévisualiser en temps réel
7. Exporter (PDF ou PNG)

---

## 16. CHECKLIST VALIDATION

### 16.1 Éléments visuels obligatoires

- [ ] Logo IArche avec gradient animé + barre décorative
- [ ] Fond Blanc Cassé (#FAF9F7)
- [ ] Quadrillages diagonaux animés (BackgroundLayout)
- [ ] Titres avec GradientTitle (taille appropriée)
- [ ] Barre décorative sous chaque titre
- [ ] Focus ring Terracotta (WCAG AAA)

### 16.2 Animations obligatoires

- [ ] Gradient text 8s sur logo IArche
- [ ] PatternScroll 40s sur quadrillages
- [ ] FadeIn 0.6s sur éléments
- [ ] PageTransition 0.4s entre pages
- [ ] Canalisation lines 6s (hero/placeholder)

### 16.3 Cohérence tokens

- [ ] Toutes les couleurs via tokens CSS (pas de HEX hardcodé)
- [ ] Typographie Manrope uniquement (Helvetica pour PDF)
- [ ] Border-radius via --radius token
- [ ] Espacements via classes Tailwind standard

### 16.4 Éléments PDF/PNG obligatoires

- [ ] Lignes canalisation (7px PDF, 3-8px PNG selon format)
- [ ] Logo (terracotta sur dark, gradient sur light)
- [ ] Barres décoratives proportionnelles (sm/md/lg/xl)
- [ ] Motif diagonal mesh en arrière-plan
- [ ] Alternance thèmes dark/light entre slides (PDF)
- [ ] Canalisations avec opacity adaptée au format (PNG)

---

**Document mis à jour le 2 Décembre 2025**  
**Version 2.2 - Inclut harmonisation tokens PDF/PNG et lignes canalisation unifiées**
