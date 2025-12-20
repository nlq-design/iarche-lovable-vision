# Brand Book IArche

**Version :** 4.2  
**Date :** 20 Décembre 2024  
**Document de référence pour l'identité visuelle IArche**

> ⚠️ **MISE À JOUR v4.2** : Arcs décoratifs subtils ajoutés à tous les éditeurs médias. Voir section 15.5.

---

## TABLE DES MATIÈRES

1. [Positionnement de Marque](#1-positionnement-de-marque)
2. [Logo](#2-logo)
3. [Système de Titres](#3-système-de-titres---gradienttitle)
4. [Palette Couleurs](#4-palette-couleurs)
5. [Typographie](#5-typographie)
6. [Arrière-plan](#6-arrière-plan---backgroundlayout)
7. [Animations SVG](#7-animations-svg---lignes-canalisation)
8. [Composant ArticlePlaceholder](#8-composant-articleplaceholder)
9. [Rectangles Décoratifs](#9-rectangles-décoratifs)
10. [Animations - Récapitulatif](#10-animations---récapitulatif-complet)
11. [Composants CTA](#11-composants-cta)
12. [Iconographie](#12-iconographie)
13. [Structure des Pages](#13-structure-des-pages)
14. [Ton de Voix](#14-ton-de-voix)
15. [Module Médias](#15-module-médias---génération-pdf--png)
16. [Module FormBuilder](#16-module-formbuilder---formulaires-personnalisés)
17. [Module Réservation](#17-module-réservation---prise-de-rendez-vous)
18. [Design System Tokens](#18-design-system-tokens---référence-technique)
19. [Checklist Validation](#19-checklist-validation)

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

### 2.2 Arc décoratif IArche (v4.0)

> **IMPORTANT v4.0** : L'arc de cercle remplace TOUTES les barres gradient horizontales sur le site.

**L'arc de cercle est l'UNIQUE élément décoratif** reproduisant la "virgule" du logo officiel (de I vers E).

**Composant principal :** `src/components/ui/LogoArc.tsx`

**Fichier SVG officiel :**
- **Source** : `/public/logos/iarche-arc.svg` (URLs directes)
- **Assets** : `src/assets/arc-iarche-v4.svg` (import ES6 pour composants React)

**Spécifications de l'arc (ratio ~3.27:1) :**

| Taille | Largeur | Hauteur | Usage |
|--------|---------|---------|-------|
| sm | 100px | 30px | Cards, petits titres |
| md | 160px | 49px | Titres de section (défaut) |
| lg | 240px | 73px | Grands titres de page |
| xl | 360px | 110px | Hero section |

**Gradient :** Bleu Nuit (#1A2B4A) → Terracotta (#B04A32) (intégré dans le SVG)

**Usage :**

```tsx
import LogoArc from '@/components/ui/LogoArc';

// Sous un titre de page
<LogoArc size="md" className="mx-auto mb-6" />

// Dans un éditeur média
import { HTMLLogoArc } from '@/components/admin/medias/html/HTMLLogoArc';
<HTMLLogoArc size="sm" />
```

### 2.3 Règle d'utilisation de l'arc

| Contexte | Arc autorisé |
|----------|--------------|
| Sous les titres de page | ✅ Oui |
| Sous les titres de section | ✅ Oui |
| Sous le logo dans les cards | ❌ NON |
| Dans ArticlePlaceholder | ❌ NON (logo seul) |
| Dans les éditeurs média | ✅ Oui |

### 2.4 Logo Editor - Exports configurables

**Route admin :** `/admin/medias/logo`

**Modes d'export (sélectionnables individuellement par variante) :**
- **Seul** : Logo PNG uniquement
- **+ Arc** : Logo + arc décoratif IArche
- **Complet** : Logo + arc + mesh background

**Variantes disponibles :**
- Gradient (principal, fond Blanc Cassé)
- Blanc (fonds sombres, fond Bleu Nuit)
- Terracotta (accent, fond Blanc Cassé)

**Taille d'arc configurable :** sm / md / lg / xl

### 2.5 Déclinaisons fichiers

| Version | Fichier | Usage |
|---------|---------|-------|
| **Principale (gradient)** | `logo-iarche.svg` | Usage standard web et print |
| **PNG transparent** | `logo-iarche.png` | Réseaux sociaux, présentations |
| **Monochrome blanc** | `logo-iarche-white.svg` | Fonds sombres |
| **Monochrome Bleu Nuit** | `logo-iarche-dark.svg` | Version sobre, fonds clairs |
| **Arc de référence** | `public/assets/arc-reference-v4.png` | Référence visuelle |

### 2.6 Zone de protection

Espace minimum autour du logo : **hauteur du "I"** sur tous les côtés.

### 2.7 Tailles minimales

| Support | Taille minimale |
|---------|-----------------|
| Web | 80px de largeur |
| Print | 25mm de largeur |
| Favicon | 32x32px (version simplifiée "IA") |

### 2.8 Usages interdits

- ❌ Modifier les couleurs du gradient
- ❌ Étirer ou déformer le logo
- ❌ Ajouter des effets (ombre, contour, 3D)
- ❌ Placer sur fond qui réduit la lisibilité
- ❌ Utiliser une autre typographie
- ❌ Utiliser une barre droite au lieu de l'arc (v4.0)
- ❌ Placer l'arc sous le logo dans les cards

---

## 3. SYSTÈME DE TITRES - GradientTitle

### 3.1 Composant réutilisable

**Fichier :** `src/components/ui/GradientTitle.tsx`

Le composant `GradientTitle` standardise l'affichage des titres avec gradient animé et **arc décoratif IArche** (v4.0).

### 3.2 Variantes de taille

| Taille | Typographie | Arc décoratif | Usage |
|--------|-------------|---------------|-------|
| **sm** | text-base md:text-lg font-semibold | arc sm (100×6px) | Titres dans les cards |
| **md** | text-2xl md:text-3xl font-bold | arc md (160×10px) | Titres de sections |
| **lg** | text-3xl md:text-5xl font-bold | arc lg (240×15px) | Titres de pages |
| **xl** | text-5xl md:text-6xl lg:text-7xl font-semibold | arc xl (360×22px) | Hero principal |


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

```tsx
// Titre de page (lg)
<GradientTitle size="lg">Actualités</GradientTitle>

// Titre de card (sm)
<GradientTitle size="sm" as="h2" centered={false} textClassName="line-clamp-2">
  {article.title}
</GradientTitle>

// Hero principal (xl)
<GradientTitle size="xl" className="mb-0">
  <span>IArche</span>
</GradientTitle>
```

---

## 4. PALETTE COULEURS

### 4.1 Tokens CSS (Design System)

Toutes les couleurs sont définies en HSL dans `src/index.css` et utilisées via tokens CSS.

**Couleurs principales :**

| Token | HSL | HEX équivalent | Usage |
|-------|-----|----------------|-------|
| `--primary` | 218 47% 20% | #1A2B4A | Bleu Nuit - Titres, logo, éléments structurants |
| `--accent` | 12 60% 44% | #B04A32 | Terracotta - CTA, accents, focus (WCAG AA) |
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

**Keyframe animation :**
```css
@keyframes patternScroll {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}
```

---

## 7. ANIMATIONS SVG - Lignes Canalisation

### 7.1 Description

Lignes SVG animées représentant des "canalisations" formant une arche. Présentes sur :
- Hero section (page d'accueil)
- Composant ArticlePlaceholder
- Module Médias (PDF et PNG)

### 7.2 Spécifications techniques

| Propriété | Valeur |
|-----------|--------|
| Stroke width | 2px (hero) / 3px (placeholder) / 7px (PDF) |
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

### 7.4 Tracé des lignes

| Ligne | Tracé |
|-------|-------|
| Ligne 1 | Entrée droite → coin haut-gauche (30%) → sortie bas-gauche |
| Ligne 2 | Entrée gauche → coin haut-droite (70%) → sortie bas-droite |

### 7.5 Couleurs par thème

| Thème | Ligne 1 | Ligne 2 |
|-------|---------|---------|
| **Bleu Nuit (dark)** | Terracotta | Terracotta |
| **Blanc Cassé (light)** | Bleu Nuit | Terracotta |

---

## 8. COMPOSANT ArticlePlaceholder

### 8.1 Description

**Fichier :** `src/components/ui/ArticlePlaceholder.tsx`

Composant placeholder affichant le logo IArche avec gradient animé, barre décorative et arches SVG croisées. Utilisé quand aucune image de couverture n'est disponible.

### 8.2 Variantes de taille

| Variante | Logo | Barre décorative | Usage |
|----------|------|------------------|-------|
| `default` | text-3xl md:text-4xl | w-12 h-0.5 | Cards listing |
| `large` | text-4xl md:text-5xl | w-20 h-1 | Pages détail |

### 8.3 Structure visuelle

```
┌─────────────────────────────────────┐
│  ╲─────────────────────────╱        │ ← Ligne SVG 1 (Bleu→Terracotta)
│    ╲                     ╱          │
│           IArche                    │ ← Logo gradient animé
│           ══════                    │ ← Barre décorative
│    ╱                     ╲          │
│  ╱─────────────────────────╲        │ ← Ligne SVG 2 (Terracotta→Bleu)
└─────────────────────────────────────┘
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
- Underline dynamique avec stroke gradient (apparaît au hover uniquement)

### 11.2 GradientButton

**Fichier :** `src/components/ui/GradientButton.tsx`

Bouton avec fond gradient et effets hover.

### 11.3 IArcheLink

Lien secondaire avec texte Bleu Nuit et flèche Terracotta.

**Caractéristiques :**
- Texte en Bleu Nuit (`text-primary`)
- Flèche Terracotta (`text-accent`)
- Underline animé au hover (pas de soulignement permanent)

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

### 13.1 Pages publiques (22+ pages)

| Route | Titre |
|-------|-------|
| `/` | Accueil (Hero) |
| `/actualites` | Actualités |
| `/articles` | Articles |
| `/cas-clients` | Cas clients |
| `/livres-blancs` | Livres blancs |
| `/ateliers-webinaires` | Ateliers & Webinaires |
| `/services` | Services |
| `/solutions` | Solutions |
| `/contact` | Nous contacter |
| `/newsletter` | Newsletter |
| `/livre-or` | Livre d'or |
| `/rendez-vous/:slug` | Prise de rendez-vous |
| `/mentions-legales` | Mentions légales |
| `/conditions-generales` | Conditions générales |
| `/confidentialite` | Politique de confidentialité |
| `/status` | Status |
| `/f/:slug` | Formulaires publics |
| `/actualites/:slug` | Détail actualité |
| `/articles/:slug` | Détail article |
| `/services/:slug` | Détail service |
| `/solutions/:slug` | Détail solution |
| `/cas-clients/:slug` | Détail cas client |
| `/livres-blancs/:slug` | Détail livre blanc |
| `/ateliers-webinaires/:slug` | Détail atelier |

### 13.2 Pages admin (40+ pages)

| Route | Fonction |
|-------|----------|
| `/admin` | Tableau de bord |
| `/admin/formulaires` | Gestion formulaires |
| `/admin/formulaires/:id` | Éditeur formulaire |
| `/admin/formulaires/:id/responses` | Réponses formulaire |
| `/admin/form-responses` | Vue globale réponses |
| `/admin/medias` | Module médias |
| `/admin/leads` | Leads consolidés |
| `/admin/articles` | Gestion articles |
| `/admin/actualites` | Gestion actualités |
| `/admin/cas-clients` | Gestion cas clients |
| `/admin/livres-blancs` | Gestion livres blancs |
| `/admin/ateliers-webinaires` | Gestion ateliers |
| `/admin/rendez-vous` | Gestion réservations |
| `/admin/emails` | Configuration emails |
| `/admin/cta-analytics` | Analytics CTA |
| `/admin/parametres` | Paramètres généraux |
| ... | (40+ routes admin) |

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

### 14.3 Mots interdits

- ❌ "formation" → ✅ "accompagnement"
- ❌ "coaching" → ✅ "accompagnement"
- ❌ "périmètre" → ✅ "projet"
- ❌ "scalable" → ✅ "adaptée à vos besoins"
- ❌ "maturité IA" → ✅ "adaptés aux PME"

---

## 15. MODULE MÉDIAS - Génération PDF & PNG

### 15.1 Description

Module d'administration (`/admin/medias`) permettant de créer des contenus PDF et PNG conformes à la charte graphique IArche.

**Architecture fichiers :**
```
src/components/admin/medias/
├── shared/
│   ├── tokens.ts      ← Source unique de vérité
│   └── index.ts
├── html/              ← Composants pour PNG
│   ├── HTMLBaseTemplate.tsx
│   ├── HTMLCanalisationLines.tsx
│   ├── HTMLMeshBackground.tsx
│   ├── HTMLGradientBar.tsx
│   └── HTMLLogo.tsx
├── pdf/               ← Composants pour PDF
│   ├── PDFCanalisationLines.tsx
│   ├── PDFMeshBackground.tsx
│   ├── PDFGradientBar.tsx
│   └── PDFLogo.tsx
└── templates/
    ├── CarouselPDF.tsx
    └── PresentationPDF.tsx
```

### 15.2 Éditeurs disponibles

**PDF :**
- Carrousel LinkedIn/Instagram
- Présentations 16:9

**PNG :**
| Éditeur | Route | Dimensions |
|---------|-------|------------|
| Banner LinkedIn | `/admin/medias/banner` | 1584×396 |
| Post | `/admin/medias/post` | 1200×1200, 1200×627 |
| Story | `/admin/medias/story` | 1080×1920 |
| Thumbnail | `/admin/medias/thumbnail` | 1920×1080, 1280×720 |
| OpenGraph | `/admin/medias/opengraph` | 1200×630 |
| Header Email | `/admin/medias/header-email` | 600×150 |
| Signature | `/admin/medias/signature` | 600×200 |
| Logo | `/admin/medias/logo` | 100/250/500px |
| Favicon | `/admin/medias/favicon` | Multi-format |
| QR Code | `/admin/medias/qrcode` | Personnalisable |

### 15.3 Modes d'export unifiés

| Mode | Label | Contenu exporté |
|------|-------|-----------------|
| `simple` | Simple | Contenu uniquement |
| `with-bar` | + Barre | Contenu + barre décorative |
| `full` | Complet | Contenu + barre + mesh + canalisations |

### 15.4 Qualité PNG configurable

Tous les éditeurs PNG offrent un sélecteur de qualité (pixelRatio) :

| Niveau | PixelRatio | Usage recommandé |
|--------|------------|------------------|
| **Standard** | 4x | Web, réseaux sociaux |
| **Haute** | 6x | Print standard, présentations (par défaut) |
| **Ultra** | 8x | Impression haute qualité, archivage |

**Tailles d'export résultantes (exemple Banner 1584×396) :**
- Standard (4x) : 6336 × 1584 px
- Haute (6x) : 9504 × 2376 px
- Ultra (8x) : 12672 × 3168 px

La qualité sélectionnée est persistée dans les templates personnalisés.

### 15.5 Arcs décoratifs SVG (v4.2)

> **Nouveauté v4.2** : Tous les éditeurs médias incluent des arcs décoratifs subtils en zones mortes.

**Documentation complète :** [docs/MEDIA_MODULES_V4.2.md](docs/MEDIA_MODULES_V4.2.md)

#### Principe

Les arcs décoratifs sont des courbes de Bézier SVG positionnées en **zones mortes extrêmes** (coins avec positions négatives) pour ajouter une touche d'identité visuelle sans interférer avec le contenu.

#### Spécifications par module

| Module | Position | Dimensions | Opacity | StrokeWidth |
|--------|----------|------------|---------|-------------|
| CarouselEditor | `-bottom-24 -right-24` | 48×48 | 0.05 | 1.5 |
| PresentationEditor | `-top-20 -right-20` | 40×40 | 0.05 | 1.5 |
| BrochureWebView | `-bottom-48 -right-48` | 64×64 | 0.03 | 2 |
| BannerEditor | `-bottom-6 -right-12` | 24×24 | 0.05 | 1.5 |
| PostEditor | `-bottom-24 -right-24` | 48×48 | 0.05 | 1.5 |
| StoryEditor | `-top-20 -right-20` | 40×40 | 0.05 | 1.5 |

#### Couleurs adaptatives

```typescript
const arcColor = theme === 'dark' || theme === 'terra' || theme === 'contrast' 
  ? '#ffffff'  // Blanc pour thèmes sombres
  : '#B04A32'; // Terracotta pour thème clair
```

#### Code de référence

```tsx
{/* v4.2 - Arc décoratif en zone morte extrême */}
<div 
  className="absolute -bottom-24 -right-24 w-48 h-48 pointer-events-none opacity-[0.05]" 
  style={{ zIndex: 0 }}
>
  <svg viewBox="0 0 200 200" className="w-full h-full">
    <path 
      d="M200 0 Q200 200 0 200" 
      fill="none" 
      stroke={isDark ? '#ffffff' : '#B04A32'} 
      strokeWidth="1.5"
    />
  </svg>
</div>
```

#### Règles importantes

| ✅ À faire | ❌ À éviter |
|-----------|------------|
| Positions négatives (hors cadre) | Placement près du logo |
| Opacité ≤ 0.05 | Opacité > 0.10 |
| `pointer-events-none` | Éléments interactifs |
| `zIndex: 0` (arrière-plan) | Superposition au contenu |

---

## 16. MODULE FORMBUILDER - Formulaires personnalisés

### 16.1 Description

Module complet de création et gestion de formulaires personnalisés avec interface drag-and-drop, design IArche intégré, et analytics.

**Routes :**
- `/admin/formulaires` — Liste des formulaires
- `/admin/formulaires/:id` — Éditeur drag-and-drop
- `/admin/formulaires/:id/responses` — Réponses par formulaire
- `/admin/form-responses` — Vue globale des réponses
- `/formulaires/:slug` — Page publique du formulaire

### 16.2 Types de champs (21 types)

**Champs de saisie :**
| Type | Icône | Description |
|------|-------|-------------|
| text | Type | Champ texte court |
| email | Mail | Email avec validation |
| phone | Phone | Téléphone avec format |
| number | Hash | Nombre avec min/max |
| textarea | AlignLeft | Texte long multiligne |
| select | ChevronDown | Liste déroulante |
| radio | Circle | Choix unique |
| checkbox | CheckSquare | Choix multiple |
| date | Calendar | Sélecteur de date |
| time | Clock | Sélecteur d'heure |
| datetime | CalendarClock | Date et heure |
| file | Upload | Upload fichier |
| rating | Star | Notation étoiles |
| scale | Sliders | Échelle numérique |
| boolean | ToggleLeft | Oui/Non |
| signature | PenTool | Signature manuscrite |

**Champs de mise en page :**
| Type | Icône | Description |
|------|-------|-------------|
| heading | Heading | Titre de section |
| paragraph | FileText | Texte explicatif |
| divider | Minus | Séparateur horizontal |
| rgpd | Shield | Consentement RGPD |

### 16.3 Design personnalisable

Chaque formulaire peut être personnalisé :

| Option | Description |
|--------|-------------|
| **Couleurs** | Primary, secondary, background, text |
| **Logo** | URL du logo personnalisé |
| **Barre gradient** | Affichage et taille (sm/md/lg/xl) |
| **Canalisations** | Lignes SVG décoratives |
| **Border radius** | none/sm/md/lg |

**Couleurs par défaut IArche :**
```json
{
  "primary": "#1A2B4A",
  "secondary": "#D15A3E",
  "background": "#FAF9F7",
  "text": "#4A5568"
}
```

### 16.4 Fonctionnalités

- **Drag-and-drop** : Réorganisation des champs
- **Preview temps réel** : Aperçu instantané
- **Validation** : Required, min/max, patterns
- **Analytics** : Vues, starts, soumissions
- **Export** : CSV et JSON
- **QR Code** : Génération automatique
- **Templates** : Sauvegarde et réutilisation

### 16.5 Architecture technique

**Tables Supabase :**
- `forms` — Définition des formulaires
- `form_responses` — Réponses soumises
- `form_analytics` — Événements de tracking

**Hooks :**
- `useForms()` — CRUD formulaires
- `useFormResponses()` — Gestion réponses
- `useFormAnalytics()` — Tracking analytics

---

## 17. MODULE RÉSERVATION - Prise de rendez-vous

### 17.1 Description

Module de prise de rendez-vous intégré avec synchronisation Zoom et Google Calendar.

**Route publique :** `/rendez-vous/:slug`

### 17.2 Types de rendez-vous

| Type | Durée | Description |
|------|-------|-------------|
| Premier échange | 30 min | Découverte rapide des besoins |
| Présentation | 60 min | Présentation approfondie des solutions |

### 17.3 Types de réunion

| Type | Icône | Description |
|------|-------|-------------|
| **Visio** | Video | Génère automatiquement un lien Zoom |
| **Téléphone** | Phone | Demande le numéro de téléphone |
| **Présentiel** | MapPin | Indique l'adresse des bureaux (Bayonne) |

### 17.4 Génération des créneaux

**Règle fondamentale :** Les créneaux sont proposés uniquement sur des **heures fixes** (9h, 10h, 11h...), jamais sur des intervalles basés sur la durée.

**Exclusions automatiques :**
- Créneaux déjà réservés (table `bookings`)
- Créneaux busy dans Google Calendar
- Créneaux dans le passé
- Créneaux dont la fin dépasse la disponibilité

### 17.5 Flow de réservation

```
┌─────────────────────────────────────────────────────────┐
│  1. TYPE DE RÉUNION                                     │
│     ○ Visio (Zoom)  ○ Téléphone  ○ Présentiel          │
├─────────────────────────────────────────────────────────┤
│  2. SÉLECTION DATE                                      │
│     [    Calendrier avec jours disponibles    ]        │
├─────────────────────────────────────────────────────────┤
│  3. SÉLECTION CRÉNEAU                                   │
│     [ 9h00 ] [ 10h00 ] [ 11h00 ] [ 14h00 ] ...        │
├─────────────────────────────────────────────────────────┤
│  4. INFORMATIONS                                        │
│     Nom* | Email* | Téléphone | Entreprise | Message   │
├─────────────────────────────────────────────────────────┤
│  5. INVITÉS (optionnel)                                 │
│     [+ Ajouter un invité] → Email des invités          │
├─────────────────────────────────────────────────────────┤
│  6. CONFIRMATION                                        │
│     ✓ RDV créé + Email envoyé + .ics en pièce jointe  │
└─────────────────────────────────────────────────────────┘
```

### 17.6 Intégrations

**Zoom API :**
- Création automatique de réunion pour type "Visio"
- Lien `join_url` envoyé par email et stocké en BDD
- Authentification Server-to-Server OAuth

**Google Calendar API :**
- Vérification des disponibilités (freebusy)
- Création d'événements avec attendees
- Synchronisation bidirectionnelle

### 17.7 Emails automatiques

| Destinataire | Contenu |
|--------------|---------|
| **Prospect** | Confirmation + récapitulatif + fichier .ics + lien Zoom |
| **Invités** | Invitation + fichier .ics + lien Zoom |
| **Admin** | Notification nouveau RDV avec détails complets |

### 17.8 Administration

**Route :** `/admin/rendez-vous`

**Onglets :**
- **Réservations** : Liste, statuts, actions (annuler, voir)
- **Disponibilités** : Configuration par jour de la semaine
- **Types** : Gestion des types de RDV (durée, buffer, couleur)

---

## 18. DESIGN SYSTEM TOKENS - Référence technique

### 18.1 Tokens CSS (index.css)

```css
:root {
  /* Couleurs principales */
  --primary: 218 47% 20%;        /* Bleu Nuit */
  --accent: 12 60% 44%;          /* Terracotta (WCAG AA) */
  --background: 30 14% 98%;      /* Blanc Cassé */
  --foreground: 0 0% 18%;        /* Anthracite */
  
  /* Couleurs secondaires */
  --secondary: 30 20% 93%;       /* Gris Sable */
  --muted-foreground: 0 0% 40%;  /* Texte secondaire */
  --border: 30 16% 88%;          /* Bordures */
  --success: 153 34% 36%;        /* Vert Sauge */
  --destructive: 12 55% 50%;     /* Terracotta doux */
  
  /* Système */
  --radius: 0.75rem;
  --ring: 12 60% 44%;            /* Focus ring */
}
```

### 18.2 Tokens partagés médias (shared/tokens.ts)

```typescript
export const IARCHE_COLORS = {
  bleuNuit: '#1A2B4A',
  terracotta: '#D15A3E',
  blancCasse: '#FAF9F7',
  grisTexte: '#4A5568',
  // + variantes alpha
};

export const GRADIENTS = {
  bar: { angle: 90, stops: ['bleuNuit', 'terracotta', 'bleuNuit'] },
  text: { angle: 270, stops: ['bleuNuit', 'terracotta', 'bleuNuit', 'terracotta'] },
};

export const BAR_SIZES = {
  sm: { width: 48, height: 2 },
  md: { width: 80, height: 4 },
  lg: { width: 96, height: 4 },
  xl: { width: 128, height: 6 },
};
```

---

## 19. CHECKLIST VALIDATION

### 19.1 Éléments visuels obligatoires

- [ ] Logo IArche avec gradient animé + barre décorative
- [ ] Fond Blanc Cassé (#FAF9F7)
- [ ] Quadrillages diagonaux animés (BackgroundLayout)
- [ ] Titres avec GradientTitle (taille appropriée)
- [ ] Barre décorative sous chaque titre
- [ ] Focus ring Terracotta (WCAG AAA)

### 19.2 Animations obligatoires

- [ ] Gradient text 8s sur logo IArche
- [ ] PatternScroll 40s sur quadrillages
- [ ] FadeIn 0.6s sur éléments
- [ ] PageTransition 0.4s entre pages
- [ ] Canalisation lines 6s (hero/placeholder)

### 19.3 Cohérence tokens

- [ ] Toutes les couleurs via tokens CSS (pas de HEX hardcodé)
- [ ] Typographie Manrope uniquement (Helvetica pour PDF)
- [ ] Border-radius via --radius token
- [ ] Espacements via classes Tailwind standard

### 19.4 Formulaires et Réservations

- [ ] Couleurs personnalisables respectant la charte
- [ ] Barre décorative optionnelle
- [ ] Focus ring Terracotta sur tous les inputs
- [ ] Validation client-side avec feedback visuel
- [ ] URL de production (iarche.fr) pour liens copiés
- [ ] Créneaux de réservation sur heures fixes uniquement

---

**Document mis à jour le 3 Décembre 2025**  
**Version 3.1 - Inclut Module Réservation complet**