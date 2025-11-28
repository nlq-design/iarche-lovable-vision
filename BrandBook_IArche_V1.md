# Brand Book IArche

**Version :** 1.0  
**Date :** 28 Novembre 2025  
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

## 11. ÉVOLUTIONS FUTURES

### 11.1 À considérer

- Templates Notion pour documents internes
- Templates Figma pour maquettes
- Motion guidelines (animations vidéo)
- Sound design (si contenu audio/vidéo)

### 11.2 Versioning

| Version | Date | Modifications |
|---------|------|---------------|
| 1.2 | 28 Nov 2025 | Terminologie : "Audit, Dev, Accompagnement, Conformité" / Navigation : "Nos Solutions" (gradient) + "Actualités" / Footer : ajout nav |
| 1.1 | 28 Nov 2025 | Mise à jour specs logo gradient (buildé), référence page "/" auditée (8.5/10) |
| 1.0 | 28 Nov 2025 | Création initiale |

---

## 12. RÉFÉRENCE TECHNIQUE - ÉTAT DU BUILD ✅

**Homepage (/) - Portail minimaliste**  
**Score : 8.5/10** | **Audit : 28 Nov 2025**

Documentation complète dans `CDC_IArche_Updates.md` (Design System + Audit détaillé)

---

**Fin du Brand Book IArche V1.2**
