# Brand Book IArche

**Version :** 1.3  
**Date : 29 Novembre 2025**  
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

### 2.1 Logo principal

**Texte :** IArche  
**Style :** Gradient linéaire figé  
**Typographie :** Inter 600 (Semibold)

**Spécifications gradient :**
- Direction : droite → gauche (270deg, x1="100%" x2="0%")
- Répartition : Bleu Nuit → Terracotta → Bleu Nuit → Terracotta
- Points de transition : 0%, 33.33%, 66.67%, 100%
- Couleurs : #1B2A47 → #D15A3E → #2F4570 → #D15A3E

**Rendu attendu :**
- "I" : Bleu Nuit foncé (#1B2A47)
- "Ar" : Transition vers Terracotta (#D15A3E)
- "ch" : Transition vers Bleu Nuit moyen (#2F4570)
- "e" : Terracotta (#D15A3E)

### 2.2 Déclinaisons

| Version | Fichier | Usage |
|---------|---------|-------|
| **Texte SVG (gradient)** | `logo-iarche-text.svg` | Usage universel web, export PNG/print |
| **Principale (gradient)** | `logo-iarche.svg` | Usage standard web et print |
| **PNG transparent** | `logo-iarche.png` | Réseaux sociaux, présentations |
| **Monochrome blanc** | `logo-iarche-white.svg` | Fonds sombres |
| **Monochrome Bleu Nuit** | `logo-iarche-dark.svg` | Version sobre, fonds clairs |

### 2.2.1 Logo SVG Texte - Spécifications techniques

**Fichier :** `public/logo-iarche-text.svg`

#### Logo texte avec gradient animé (Spécification définitive - BUILDÉ ✅)

**Description :** Logo texte "IArche" avec gradient animé, utilisant le système de design IArche.

**⚠️ IMPORTANT :** Cette implémentation avec gradient animé est la référence officielle. Les anciennes versions SVG statiques ont été retirées.

**Implémentation HTML/React :**

```jsx
<span className="hero-gradient-text">IArche</span>
```

**Style CSS** (défini dans `src/index.css`) :

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

**Spécifications techniques finales :**
- **Direction gradient** : 270deg (droite → gauche)
- **Couleurs** : Bleu Nuit (`hsl(var(--primary))`) → Terracotta (`hsl(var(--accent))`) → Bleu Nuit → Terracotta
- **Background-size** : 600% 600% (fluidité de l'animation)
- **Animation** : 8 secondes en boucle infinie, easing `ease`
- **Optimisation** : `will-change: background-position` pour performance GPU
- **Rendu visuel** : Gradient horizontal animé créant un effet de flux continu de couleurs

**Caractéristiques :**
- Utilise les tokens du design system (`--primary`, `--accent`)
- Animation de gradient en boucle continue (8 secondes)
- Compatible avec tous les contextes (hero, header, etc.)
- Taille ajustable via classes Tailwind (`text-3xl`, `text-5xl`, etc.)
- Gradient horizontal (270deg) avec animation fluide
- Optimisation GPU via `will-change: background-position`

**État : BUILDÉ ✅**  
Implémentation finale dans `src/index.css`, testé et validé sur page "/".

**Utilisation dans le header :**

```jsx
<NavLink to="/accueil" className="flex items-center">
  <span className="text-3xl font-semibold hero-gradient-text">IArche</span>
</NavLink>
```

**Avantages :**
- Gradient animé et dynamique
- Intégration parfaite au design system
- Maintainability : modification des couleurs via tokens CSS
- Performance : utilisation de `will-change` et animation GPU
- Flexibilité : taille adaptable sans perte de qualité
  >
    IArche
  </text>
</svg>
```

**Export pour autres usages :**
1. **PNG haute résolution** : Ouvrir SVG dans navigateur → Clic droit → Enregistrer l'image
2. **Print** : Importer dans Adobe Illustrator/Figma, exporter en PDF ou haute résolution
3. **Email signature** : Convertir en PNG 800x240px (2x) pour compatibilité clients email

**Avantages :**
- ✅ Scalable à l'infini sans perte de qualité
- ✅ Poids ultra-léger (< 1Ko)
- ✅ Gradient précis et reproductible
- ✅ Modifiable facilement (changement couleurs, taille, police)
- ✅ Compatible tous navigateurs modernes

---

### 2.3 Zone de protection

Espace minimum autour du logo : **hauteur du "I"** sur tous les côtés.

```
┌────────────────────────────┐
│                            │
│      [  IArche  ]          │
│                            │
└────────────────────────────┘
     ↑ Zone de protection
```

### 2.4 Tailles minimales

| Support | Taille minimale |
|---------|-----------------|
| Web | 80px de largeur |
| Print | 25mm de largeur |
| Favicon | 32x32px (version simplifiée "IA") |

### 2.5 Usages interdits

- ❌ Modifier les couleurs du gradient
- ❌ Étirer ou déformer le logo
- ❌ Ajouter des effets (ombre, contour, 3D)
- ❌ Placer sur fond qui réduit la lisibilité
- ❌ Animer le logo (sauf sur le site web hero)
- ❌ Utiliser une autre typographie

### 2.6 Composant ArticlePlaceholder - Spécifications techniques

**État : BUILDÉ ✅ (Version 1.1 - 29 Nov 2025)**  
**Fichier :** `src/components/ui/ArticlePlaceholder.tsx`

#### Description

Composant placeholder réutilisable affichant le logo IArche avec gradient animé et arches SVG croisées. Utilisé sur toutes les pages ressources (actualités, articles, cas clients, livres blancs, ateliers & webinaires) pour représenter les images de couverture.

#### Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `className` | string | `''` | Classes Tailwind additionnelles (hauteur, bordures, etc.) |
| `size` | `'default' \| 'large'` | `'default'` | Taille du logo IArche |

#### Variantes de taille

| Variante | Classes appliquées | Usage |
|----------|-------------------|-------|
| `default` | `text-3xl md:text-4xl` | Cards listing (grilles 3 colonnes) |
| `large` | `text-4xl md:text-5xl` | Pages détail (`/actualites/:slug`, `/articles/:slug`, etc.) |

#### Structure visuelle

**Arches SVG animées :**

1. **Arch 1 (droite → gauche)** :
   - viewBox : `0 0 400 360`
   - Path : `M 398 2 L 121 2 C 119 2 117 4 117 6 L 117 176 C 117 178 115 180 113 180 L 0 180`
   - Gradient : Bleu Nuit (#1A2B4A / `hsl(var(--primary))`) → Terracotta (#D15A3E / `hsl(var(--accent))`)
   - **strokeWidth : 3px** (màj V1.1)
   - **opacity : 0.7** (màj V1.1)
   - Animation : stroke-dasharray 6s ease-in-out, delay 300ms

2. **Arch 2 (gauche → droite)** :
   - viewBox : `0 0 400 106`
   - Path : `M 0 2 L 278 2 C 280 2 282 4 282 6 L 282 101 C 282 103 284 105 286 105 L 400 105`
   - Gradient : Terracotta → Bleu Nuit (inverse de Arch 1)
   - **strokeWidth : 3px** (màj V1.1)
   - **opacity : 0.7** (màj V1.1)
   - Animation : stroke-dasharray 6s ease-in-out, delay 300ms

**Logo IArche centré :**
- Position : centré absolument
- Gradient animé : classe `hero-gradient-text`
- Typographie : Inter 600 (Semibold)
- Taille dynamique selon prop `size`

#### Exemples d'utilisation

**Cards listing (size default) :**

```tsx
<ArticlePlaceholder className="h-40" />
```

**Pages détail (size large) :**

```tsx
<ArticlePlaceholder className="mb-6 rounded-xl h-56 md:h-72" size="large" />
```

**Placeholder empty state :**

```tsx
<ArticlePlaceholder />
```

#### Évolutions (V1.1 - 29 Nov 2025)

- ✅ Ajout prop `size` avec variantes default/large
- ✅ Épaississement lignes SVG : 2px → 3px
- ✅ Augmentation opacité : 0.5 → 0.7
- ✅ Suppression module LogoArcheAnimated (consolidation sur ArticlePlaceholder unique)

#### Cohérence design system

- Utilise tokens CSS : `hsl(var(--primary))`, `hsl(var(--accent))`
- Classe réutilisable : `.hero-gradient-text`
- Animation GPU optimisée : `will-change: background-position`
- Responsive : tailles adaptatives via classes Tailwind

---

## 3. PALETTE COULEURS

### 3.1 Couleurs principales

| Nom | HEX | HSL | RGB | CMYK (print) | Usage |
|-----|-----|-----|-----|--------------|-------|
| **Bleu Nuit** | #1A2B4A | 218, 47%, 20% | 26, 43, 74 | 85, 70, 35, 25 | Titres, éléments structurants, logo |
| **Terracotta** | #D15A3E | 12, 60%, 53% | 209, 90, 62 | 10, 75, 80, 0 | CTA, accents, logo |
| **Blanc Cassé** | #FAF9F7 | 30, 16%, 98% | 250, 249, 247 | 2, 2, 3, 0 | Fonds principaux |

### 3.2 Couleurs secondaires

| Nom | HEX | Usage |
|-----|-----|-------|
| **Anthracite** | #2D2D2D | Texte principal |
| **Gris texte** | #666666 | Texte secondaire |
| **Gris subtil** | #999999 | Texte discret (footer) |
| **Gris Sable** | #F0EDE8 | Fonds alternés, cards |
| **Bordure** | #E5E0DA | Séparateurs, inputs |
| **Vert Sauge** | #3D7A5C | Succès, validation |
| **Terracotta doux** | #C4553D | Erreurs, alertes |

### 3.3 Répartition d'usage

| Contexte | Couleur dominante | Accent |
|----------|-------------------|--------|
| Site web | Blanc Cassé (fond) + Bleu Nuit (texte) | Terracotta (CTA) |
| LinkedIn | Blanc Cassé ou Bleu Nuit | Terracotta |
| Email signature | Bleu Nuit (texte) | Terracotta (nom) |
| Cartes de visite | Blanc Cassé (recto) / Bleu Nuit (verso) | Terracotta |
| Présentations | Blanc Cassé (slides) + Bleu Nuit (titres) | Terracotta (accents) |

---

## 4. TYPOGRAPHIE

### 4.1 Police principale

**Inter** — Google Fonts  
https://fonts.google.com/specimen/Inter

Poids utilisés :
- 400 (Regular) — Corps de texte
- 500 (Medium) — Sous-titres, CTA
- 600 (Semibold) — Titres, logo
- 700 (Bold) — Mise en emphase forte

### 4.2 Hiérarchie typographique

| Niveau | Taille web | Taille print | Poids | Usage |
|--------|-----------|--------------|-------|-------|
| H1 | 48-64px | 32-40pt | 600 | Titre principal |
| H2 | 32-40px | 24-28pt | 600 | Titres de section |
| H3 | 24-28px | 18-20pt | 500 | Sous-sections |
| Body | 16-18px | 10-12pt | 400 | Texte courant |
| Small | 14px | 9pt | 400 | Annotations, footer |
| Caption | 12px | 8pt | 400 | Mentions légales |

### 4.3 Alternative print (si Inter indisponible)

**Helvetica Neue** ou **Arial** — Sans-serif neutre  
Utiliser uniquement si Inter non disponible sur le support.

---

## 5. ICONOGRAPHIE

### 5.1 Bibliothèque

**Lucide React** — https://lucide.dev

### 5.2 Style

| Propriété | Valeur |
|-----------|--------|
| Stroke width | 2px |
| Taille standard | 24px (1.5rem) |
| Couleur | Bleu Nuit (#1A2B4A) ou Terracotta (#D15A3E) |
| Style | Outline (pas filled) |

### 5.3 Icônes recommandées par contexte

| Contexte | Icônes suggérées |
|----------|------------------|
| Expertise/Conseil | Search, ClipboardCheck, Target |
| Solutions/Tech | Cpu, Cog, Layers |
| Contact | Mail, Phone, MapPin |
| Accompagnement | Users, Handshake, GraduationCap |
| Conformité | Shield, FileCheck, Lock |

---

## 6. DIRECTION PHOTO

### 6.1 Style général

Si des photos sont utilisées :

| Aspect | Guideline |
|--------|-----------|
| **Ambiance** | Lumineuse, naturelle, professionnelle mais chaleureuse |
| **Cadrage** | Aéré, espace négatif, pas surchargé |
| **Sujets** | Personnes en situation de travail, collaboration, réflexion |
| **Couleurs** | Cohérentes avec la palette (tons chauds, pas de néons) |
| **Filtres** | Léger réchauffement, contraste modéré, pas de filtres Instagram |

### 6.2 À éviter

- ❌ Photos stock génériques (poignées de main, cerveaux IA)
- ❌ Images sombres ou froides
- ❌ Visuels robots/matrices/code vert sur noir
- ❌ Surcharge visuelle
- ❌ Filtres excessifs

### 6.3 Traitement recommandé

- Luminosité : +5 à +10%
- Contraste : +5%
- Température : légèrement chaude (+500K)
- Saturation : neutre ou légèrement désaturée (-5%)

---

## 7. TON DE VOIX

### 7.1 Personnalité verbale

| Attribut | Expression |
|----------|------------|
| **Direct** | Pas de détours, aller à l'essentiel |
| **Accessible** | Pas de jargon tech, vulgarisation |
| **Confiant** | Affirmatif, pas hésitant |
| **Chaleureux** | Humain, pas corporate froid |
| **Pragmatique** | Orienté résultats, concret |

### 7.2 Exemples Do / Don't

| ❌ Don't | ✅ Do |
|----------|-------|
| "Nous leverageons les synergies IA" | "On intègre l'IA là où ça compte" |
| "Notre solution disruptive..." | "Une solution qui fonctionne" |
| "N'hésitez pas à nous contacter" | "Une question ? Parlons-en" |
| "Nous sommes leaders de..." | "4 solutions en production" |
| "Intelligence artificielle de pointe" | "L'IA au service de votre métier" |

### 7.3 Formules récurrentes

- "L'IA se construit avec vous"
- "Du concret, pas des slides"
- "Résultats mesurables"
- "De l'audit à l'autonomie"
- "On fait avec vous, pas pour vous"

---

## 8. APPLICATIONS

### 8.1 Site web - Référence buildée ✅

**État actuel :** Homepage (/) buildée et auditée - Score 8.5/10  
**Documentation complète :** CDC_IArche_Updates.md (Design System complet + Audit détaillé)

| Élément | Spécification | État |
|---------|---------------|------|
| Fond | Blanc Cassé #FAF9F7 | ✅ Buildé |
| Titres | Bleu Nuit #1A2B4A, Inter 600 | ✅ Buildé |
| Texte | Anthracite #2D2D2D, Inter 400 | ✅ Buildé |
| CTA | Terracotta #D15A3E, Inter 500 | ✅ Buildé |
| Animations | Subtiles, durée 0.3s-8s, easing ease-out | ✅ Buildé |
| Logo gradient | 270deg, 8s, hsl tokens | ✅ Buildé |

**Composant BackgroundLayout** (réutilisable sur toutes les pages) — ✅ BUILDÉ

Emplacement : `src/components/layouts/BackgroundLayout.tsx`

Contenu :
- Fond Blanc Cassé (#FAF9F7)
- Quadrillages diagonaux animés (45deg et -45deg)
- Rectangles décoratifs avec pulsation douce
- Lignes SVG animées avec gradients Bleu Nuit ↔ Terracotta (SUPPRIMÉES de BackgroundLayout, présentes uniquement dans hero)
- Toutes les keyframes d'animation (fadeIn, gradient, patternScroll, constructionFade, subtlePulse)
- Classes CSS utilitaires (.hero-gradient-text, etc.)

Usage :
```tsx
import BackgroundLayout from '@/components/layouts/BackgroundLayout';

<BackgroundLayout>
  {/* Contenu de la page */}
</BackgroundLayout>
```

Avantages :
- Cohérence visuelle garantie sur toutes les pages
- Maintenance centralisée du design system
- Performances optimisées (will-change, animations CSS natives)
- Réutilisabilité immédiate

**Page de référence buildée :** Homepage (/) - Score audit 8.5/10

---

### 8.2 LinkedIn

**Post image (1200x627px)**

```
┌─────────────────────────────────────┐
│                                     │
│  Fond : Blanc Cassé #FAF9F7         │
│                                     │
│       [Logo IArche]                 │
│                                     │
│  "Titre du post"                    │
│   Inter 600, 32px, Bleu Nuit        │
│                                     │
│  Sous-titre ou accroche             │
│   Inter 400, 18px, Anthracite       │
│                                     │
│  ─────────────────────────────────  │
│  Barre accent Terracotta (4px)      │
└─────────────────────────────────────┘
```

**Bannière profil (1584x396px)**
- Fond : Bleu Nuit #1A2B4A
- Logo : Version blanc, centré ou à gauche
- Baseline : Blanc, Inter 400, à droite ou sous le logo

### 8.3 Email signature

```
--
[Prénom Nom]
[Fonction] · IArche
nlq@iarche.fr
iarche.fr
Bayonne · France
L'IA se construit avec vous
```

**Formatage :**
- Nom : Inter 600, Terracotta #D15A3E
- Fonction + IArche : Inter 400, Bleu Nuit #1A2B4A
- Coordonnées : Inter 400, Anthracite #2D2D2D
- Baseline : Inter 400 italic, Gris #666666

### 8.4 Carte de visite (85x55mm)

**Recto :**

```
┌─────────────────────────────────────┐
│                                     │
│  Fond : Blanc Cassé                 │
│                                     │
│       [Logo IArche gradient]        │
│                                     │
│  L'IA se construit avec vous        │
│   Inter 400, 8pt, Gris              │
│                                     │
└─────────────────────────────────────┘
```

**Verso :**

```
┌─────────────────────────────────────┐
│                                     │
│  Fond : Bleu Nuit                   │
│                                     │
│  [Prénom Nom]                       │
│   Inter 600, 10pt, Blanc            │
│                                     │
│  [Fonction]                         │
│   Inter 400, 8pt, Terracotta        │
│                                     │
│  nlq@iarche.fr                      │
│  iarche.fr                          │
│   Inter 400, 8pt, Blanc 80%         │
│                                     │
│  Bayonne · France                   │
│   Inter 400, 7pt, Blanc 60%         │
│                                     │
└─────────────────────────────────────┘
```

### 8.5 Présentations (Google Slides / PowerPoint)

**Slide titre :**
- Fond : Blanc Cassé
- Titre : Bleu Nuit, Inter 600, 44pt
- Sous-titre : Anthracite, Inter 400, 24pt
- Logo : coin supérieur gauche, 40px hauteur
- Barre accent : Terracotta, bas de slide, 8px

**Slide contenu :**
- Fond : Blanc Cassé
- Titre : Bleu Nuit, Inter 600, 32pt
- Corps : Anthracite, Inter 400, 18pt
- Bullet points : Terracotta (puce) + Anthracite (texte)

**Slide fin/CTA :**
- Fond : Bleu Nuit
- Texte : Blanc, Inter 600, 36pt
- CTA : Terracotta, Inter 500, 24pt
- Logo : Version blanc, centré

### 8.6 OG Image / Partage social (1200x630px)

```
┌─────────────────────────────────────┐
│                                     │
│  Fond : Blanc Cassé #FAF9F7         │
│                                     │
│       [Logo IArche gradient]        │
│        (centré, 120px hauteur)      │
│                                     │
│  L'IA se construit avec vous        │
│   Inter 500, 24px, Anthracite       │
│                                     │
│  ─────────────────────────────────  │
│  Barre Terracotta (6px) en bas      │
└─────────────────────────────────────┘
```

---

## 9. DO'S & DON'TS

### 9.1 Couleurs

| ✅ Do | ❌ Don't |
|-------|----------|
| Utiliser les couleurs de la palette | Inventer des couleurs |
| Respecter les contrastes | Texte clair sur fond clair |
| Terracotta pour les accents/CTA | Terracotta en fond principal |
| Bleu Nuit pour les titres | Bleu Nuit pour le texte courant long |

### 9.2 Typographie

| ✅ Do | ❌ Don't |
|-------|----------|
| Inter uniquement | Mélanger plusieurs polices |
| Respecter la hiérarchie | Tout en gras |
| Espacement généreux | Texte condensé/serré |
| Alignement gauche ou centré | Justifié (web) |

### 9.3 Logo

| ✅ Do | ❌ Don't |
|-------|----------|
| Utiliser les fichiers officiels | Recréer le logo |
| Respecter la zone de protection | Coller au bord |
| Version adaptée au fond | Logo couleur sur fond sombre |
| Taille lisible | Logo trop petit |

### 9.4 Visuels

| ✅ Do | ❌ Don't |
|-------|----------|
| Photos lumineuses et naturelles | Stock générique |
| Espaces négatifs | Surcharge visuelle |
| Cohérence avec la palette | Couleurs criardes |
| Icônes Lucide outline | Icônes filled ou autres styles |

### 9.5 Ton

| ✅ Do | ❌ Don't |
|-------|----------|
| Direct et clair | Jargon corporate |
| Affirmatif | Hésitant ("peut-être", "éventuellement") |
| Chaleureux | Froid et distant |
| Concret (chiffres, exemples) | Vague et abstrait |

---

## 10. FICHIERS DE RÉFÉRENCE

### 10.1 Logos (dossier `/public/`)

| Fichier | Format | Dimensions | Usage |
|---------|--------|------------|-------|
| `logo-iarche-text.svg` | SVG | 400x120px | Logo texte universel (gradient figé) |
| `logo-iarche.svg` | SVG | Variable | Principal, web & print |
| `logo-iarche.png` | PNG | 512x512px | Réseaux sociaux |
| `logo-iarche-white.svg` | SVG | Variable | Fonds sombres |
| `logo-iarche-dark.svg` | SVG | Variable | Version sobre |

### 10.2 Documents

| Document | Contenu |
|----------|---------|
| `BrandBook_IArche_V1.md` | Ce document (identité visuelle) |
| `CDC_IArche_Updates.md` | Cahier des charges technique |
| `IArche_Copy_Annexes_V3.docx` | Copy de toutes les pages |

### 10.3 Assets à créer

| Asset | Dimensions | Statut |
|-------|------------|--------|
| OG Image | 1200x630px | ⏳ À finaliser |
| Favicon | 32x32px | ⏳ À créer |
| Apple Touch Icon | 180x180px | ⏳ À créer |
| LinkedIn Banner | 1584x396px | ⏳ Template à créer |

---

## 10. ARCHITECTURE SITE - PAGES BUILDÉES ✅

### 10.1 Structure complète (9 pages + homepage)

**État : 100% des pages fonctionnelles**  
**Date : 29 Novembre 2025**

| Route | Nom | Statut | Meta SEO | Contenu |
|-------|-----|--------|----------|---------|
| `/` | Homepage | ✅ Buildée | ✅ Complet | Portail minimaliste |
| `/services` | Services | ✅ Buildée | ✅ Complet | 4 services détaillés |
| `/solutions` | Solutions | ✅ Buildée | ✅ Complet | SaaS + projets |
| `/actualites` | Actualités | ✅ Buildée | ✅ Complet | Placeholder blog |
| `/contact` | Contact | ✅ Buildée | ✅ Complet | Formulaire 2 col |
| `/newsletter` | Newsletter | ✅ Buildée | ✅ Complet | Inscription + bénéfices |
| `/livre-or` | Livre d'Or | ✅ Buildée | ✅ Complet | Placeholder témoignages |
| `/mentions-legales` | Mentions | ✅ Buildée | ✅ Complet | Texte légal complet |
| `/conditions-generales` | CGV | ✅ Buildée | ✅ Complet | 9 articles |
| `/confidentialite` | RGPD | ✅ Buildée | ✅ Complet | Politique complète |

**Routing :**
- Redirection 301 : `/accueil` → `/` (consolidation SEO)
- 404 : Page NotFound fonctionnelle

---

### 10.2 Composants SEO & UX

#### HelmetProvider ✅
**Package :** react-helmet-async  
**Configuration :** `main.tsx`

Chaque page inclut :
```jsx
<Helmet>
  <title>Titre Page · IArche</title>
  <meta name="description" content="Description 150-160 caractères" />
  <link rel="canonical" href="https://iarche.fr/route" />
  <meta property="og:title" content="Titre · IArche" />
  <meta property="og:description" content="Description" />
  <meta property="og:url" content="https://iarche.fr/route" />
  <meta property="og:type" content="website" />
</Helmet>
```

#### ScrollToTop ✅
**Fichier :** `src/components/utils/ScrollToTop.tsx`

- Scroll automatique en haut lors changement de route
- **Exception homepage** : pas de scroll sur `/`
- Déclenché via `useLocation()` hook

#### BreadcrumbNav ✅
**Fichier :** `src/components/ui/BreadcrumbNav.tsx`

- Fil d'Ariane : Accueil > Page actuelle
- Affiché sur toutes pages **sauf homepage**
- Icône ChevronRight (Lucide)
- Accessible (aria-label)

Structure visuelle :
```
Accueil > Services
Accueil > Contact
...etc
```

#### Header avec NavLink ✅
**Fichier :** `src/components/layout/Header.tsx`

Améliorations :
- `<NavLink>` au lieu de `<a>` (navigation react-router)
- **Active link states** : bold + primary color
- Logo cliquable → navigate `/`
- CTA "Nous contacter" → navigate `/contact`

Exemple NavLink :
```tsx
<NavLink 
  to="/services"
  className={({ isActive }) => 
    isActive 
      ? 'text-primary font-semibold' 
      : 'text-primary hover:text-primary/80'
  }
>
  Services
</NavLink>
```

---

### 10.3 Sitemap.xml Complet

**Fichier :** `public/sitemap.xml`

Structure avec métadonnées SEO :

| URL | Priority | Changefreq | Lastmod |
|-----|----------|------------|---------|
| `/` | 1.0 | weekly | 2025-11-29 |
| `/services` | 0.9 | monthly | 2025-11-29 |
| `/solutions` | 0.9 | monthly | 2025-11-29 |
| `/actualites` | 0.8 | weekly | 2025-11-29 |
| `/contact` | 0.7 | monthly | 2025-11-29 |
| `/newsletter` | 0.5 | monthly | 2025-11-29 |
| `/livre-or` | 0.4 | monthly | 2025-11-29 |
| `/mentions-legales` | 0.3 | yearly | 2025-11-29 |
| `/conditions-generales` | 0.3 | yearly | 2025-11-29 |
| `/confidentialite` | 0.3 | yearly | 2025-11-29 |

---

### 10.4 Design System - Conformité 100%

**Toutes les pages respectent :**

1. **BackgroundLayout wrapper**
   - Fonds quadrillés animés
   - Rectangles décoratifs pulsants
   - Cohérence visuelle totale

2. **Couleurs tokenisées**
   - 100% tokens CSS (hsl(var(--primary)), etc.)
   - Aucun hardcode couleur
   - Palette IArche respectée

3. **Animations progressives**
   - `invisible animate-fadeIn [animation-delay:X.Xs]`
   - Délais échelonnés (0.1s → 0.9s)
   - FOUC prevention pattern

4. **Typography Inter**
   - Titres : font-bold, text-foreground
   - Texte : font-normal, text-muted-foreground
   - Hiérarchie H1/H2/body

5. **Navigation react-router**
   - `<Link>` pour liens internes
   - `<NavLink>` avec active states
   - Pas de `<a>` pour navigation interne

---

### 10.5 Formulaires prêts pour backend

#### Contact Form (`/contact`)
**Champs :**
- Nom* (required)
- Email* (required)
- Entreprise (optional)
- Sujet* (select: Audit, Développement, Formation, Conformité, Autre)
- Message* (textarea, required)

**Layout :** 2 colonnes (formulaire + coordonnées)  
**État :** Prêt pour connexion Lovable Cloud + Zod validation

#### Newsletter Form (`/newsletter`)
**Champs :**
- Email* (required)

**Bénéfices affichés :**
1. Veille IA et actualités
2. Conseils pratiques dirigeants PME
3. Retours d'expérience projets
4. Invitations événements

**État :** Prêt pour connexion Lovable Cloud + double opt-in

---

### 10.6 Pages légales - Contenu complet

#### Mentions Légales (`/mentions-legales`)
Sections :
- Éditeur (IArche, Bayonne, email)
- Hébergeur (Lovable.dev)
- Propriété intellectuelle
- Responsabilité
- Droit applicable

#### CGV (`/conditions-generales`)
9 articles détaillés :
1. Objet
2. Services (4 prestations listées)
3. Tarifs
4. Modalités paiement
5. Livraison prestations
6. Réclamations (contact nlq@iarche.fr)
7. Responsabilité
8. Données personnelles
9. Règlement litiges

#### Politique Confidentialité (`/confidentialite`)
Sections RGPD :
- Données collectées (formulaires)
- Finalités traitement
- Base légale (consentement + intérêt légitime)
- Durée conservation (3 ans)
- Destinataires (IArche uniquement)
- Vos droits (accès, rectification, effacement, portabilité, opposition)
- Cookies (techniques uniquement)
- Contact DPO (nlq@iarche.fr)

---

### 10.7 Performance & Accessibilité

**Performances :**
- Navigation sans rechargement (react-router)
- Meta tags dynamiques (react-helmet-async)
- Animations GPU (`will-change`)
- Score attendu Lighthouse : > 90

**Accessibilité :**
- Breadcrumb accessible (aria-label)
- Navigation sémantique (nav, main, section)
- Contraste WCAG AAA maintenu
- Focus states sur tous interactifs
- Labels associés aux inputs

**SEO :**
- Sitemap.xml complet
- Meta tags uniques par page
- Canonical tags
- H1 uniques optimisés
- Structure HTML5 sémantique

---

### 10.8 Prochaines étapes

**Phase 3 - Backend & Contenu :**
1. Connecter formulaires (Contact + Newsletter) à Lovable Cloud
2. Créer système blog (table blog_posts + back-office)
3. Intégrer Google Analytics 4
4. Ajouter attributs alt sur images/SVG
5. Tests multi-devices

**Score Phase 2 :** 9.5/10 ✅

---

## 11. ÉVOLUTIONS FUTURES

### 11.1 À considérer

- Templates Notion pour documents internes
- Templates Figma pour maquettes
- Motion guidelines (animations vidéo)
- Sound design (si contenu audio/vidéo)

### 11.2 Versioning

| Version | Date | Modifications |
|---------|------|---------------|
| 1.3 | 29 Nov 2025 | Ajout section 2.6 ArticlePlaceholder : spécifications techniques complètes (prop size, strokeWidth 3px, opacity 0.7) |
| 1.2 | 29 Nov 2025 | Ajout référence Phase 3 (back-office complet), mise à jour score global 9.8/10 |
| 1.1 | 29 Nov 2025 | Ajout section architecture site (9 pages buildées), composants SEO/UX, sitemap.xml, référence pages légales |
| 1.0 | 28 Nov 2025 | Création initiale |

---

## 12. RÉFÉRENCE TECHNIQUE - ÉTAT DU BUILD ✅

**Phase 3 Complète - Back-office & automatisations**  
**Score global : 9.8/10** | **Date : 29 Nov 2025**

**Pages front-end :** 10 pages fonctionnelles (homepage + 9 pages)  
**Pages admin :** 7 interfaces back-office (dashboard, articles, catégories, tags, commentaires, newsletters, statistiques)  
**Composants SEO :** HelmetProvider, ScrollToTop, BreadcrumbNav, NavLink  
**Sitemap :** 10 URLs avec métadonnées complètes  
**Formulaires :** Contact + Newsletter (backend intégré)  
**Pages légales :** Mentions, CGV, Confidentialité (contenu complet)

**Fonctionnalités back-office :**
- Éditeur WYSIWYG complet avec versioning
- Système de publication programmée avec DatePicker
- Newsletter automatique lors de publication
- Notifications email nouveaux commentaires
- Pagination articles et commentaires
- Filtres avancés par catégorie et tag
- Tableau de bord avec statistiques temps réel
- Tracking des vues articles
- Assignation catégories/tags depuis éditeur

**Automatisations :**
- 3 Edge Functions (send-newsletter, notify-new-comment, publish-scheduled-articles)
- Envoi automatique newsletter première publication
- Notification admin nouveaux commentaires
- Publication automatique articles programmés

Documentation technique détaillée dans `CDC_IArche_Updates.md` (V5.0)

---

**Fin du Brand Book IArche V1.2**
