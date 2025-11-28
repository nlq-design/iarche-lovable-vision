# Cahier des Charges IArche - Mises à Jour

**Version mise à jour : V3.1**  
**Date : 28 Novembre 2025**  
**Basé sur : CDC_IArche_V3.docx**

---

## MODIFICATIONS MAJEURES

### 1. ARCHITECTURE DES PAGES

#### ✅ CONFIRMÉ - Structure simplifiée
- **Homepage** (/)
- **Hub Expertise** (/expertise)
- **4 sous-pages Expertise** :
  - /expertise/conseil-audit
  - /expertise/solutions-integration
  - /expertise/accompagnement-autonomie
  - /expertise/reglementation-conformite
- **Page Solutions unique** (/solutions) - **MODIFICATION**
- **À propos** (/a-propos)
- **Ressources/Blog** (/ressources)
- **Contact** (/contact)

**TOTAL : 10 pages (au lieu de 14)**

---

### 2. SOLUTIONS SAAS - CHANGEMENT MAJEUR ❗

#### ❌ ANNULÉ : Pages individuelles par solution
Le CDC V3 prévoyait 4 pages dédiées :
- /solutions/legal-tech
- /solutions/team5-connect
- /solutions/collaboration
- /solutions/conversationnelle

#### ✅ NOUVEAU : Page Solutions unique
**URL : /solutions**

**Structure :**
- Une seule page listant tous les projets/solutions
- Certains projets avec nom visible + description complète
- D'autres projets avec description uniquement (anonymisés)
- Les solutions accessibles publiquement auront un lien vers plus d'infos
- **Objectif : éviter le cannibalisme SEO entre solutions et agence**

**Rationale :**
- Pas de concurrence entre activité agence et activité éditeur
- Crédibilité via projets réels sans détourner les leads agence
- Plus de flexibilité pour communiquer sur projets confidentiels

---

### 3. PRISE DE CONTACT - CHANGEMENT MAJEUR ❗

#### ❌ ANNULÉ : Intégration Cal.com
Le CDC V3 prévoyait :
- Réservation de créneaux via Cal.com
- Intégration widget externe

#### ✅ NOUVEAU : Formulaire de contact maison
**Raison : Sortir des dépendances externes**

**Spécifications formulaire :**
- Formulaire custom développé en interne
- Champs requis : Nom, Email, Entreprise, Message
- Validation client-side avec Zod
- Envoi via edge function (Lovable Cloud)
- Notification email au fondateur
- Stockage en base de données (optionnel pour suivi)
- **IMPORTANT : Validation stricte pour sécurité (cf. input-validation-security)**

**CTA à modifier :**
- "Réserver un appel" → "Nous contacter"
- "Réserver un créneau" → "Envoyer un message"

---

### 4. SECTION FONDATEUR - MODIFICATION

#### ❌ RETIRÉ : Mise en avant du fondateur
Le CDC V3 incluait :
- Photo fondateur
- Bio 2-3 phrases
- Lien LinkedIn

#### ✅ NOUVEAU : Crédibilité par les projets
**Page À propos :**
- Focus sur la vision et le modèle IArche (agence + éditeur)
- Mention du fondateur minimale (nom + titre uniquement)
- **Pas de photo, pas de bio détaillée**
- La crédibilité vient des solutions en production

---

### 5. CONTENU VISUEL - MODIFICATION

#### ❌ ANNULÉ : Génération d'images IA
Pas de génération d'images conceptuelles via IA

#### ✅ NOUVEAU : Approche visuelle
- Intégration logo IArche fourni ultérieurement
- Utilisation d'espacements, typographie et couleurs pour créer l'impact visuel
- Composants 21st.dev comme base structurelle
- **Approche minimaliste et élégante sans dépendre des visuels**

---

### 6. BACK-OFFICE - AJOUT ✅

#### ✅ REQUIS dès V1 : CMS / Back-office
**Non mentionné clairement dans CDC V3, maintenant confirmé :**

**Solution : Lovable Cloud activé**
- Gestion du contenu blog/ressources
- Gestion des projets/solutions affichés
- Base de données pour formulaire contact
- Edge functions pour logique serveur

**Tables à prévoir :**
- `blog_posts` (titre, slug, contenu, date, auteur, statut)
- `projects` (nom, description, catégorie, statut, visibilité)
- `contact_submissions` (nom, email, entreprise, message, date, statut)

---

### 7. PLANNING - MODIFICATION

#### ❌ RETIRÉ : Délais fixes
Le CDC V3 mentionnait :
- Phase 1 : 1 sem
- Phase 2 : 2 sem
- Phase 3 : 1 sem
- etc.

#### ✅ NOUVEAU : Approche itérative sans deadline
**Principe : "On réalise tout ensemble, progressivement"**
- Pas de communication sur délais
- Avancement selon disponibilité et feedback
- Priorisation flexible selon besoins business

---

### 8. DOMAINES - REPORT

#### ⏸️ EN ATTENTE : Configuration domaines
- iarche.fr et iarche.io pas encore configurés
- Redirection entre domaines à définir ultérieurement
- **Ne pas traiter dans la V1**

---

## ÉLÉMENTS CONSERVÉS DU CDC V3

### ✅ Direction artistique intacte
- Palette couleurs (Bleu Nuit #1A2B4A, Terracotta #D15A3E, etc.)
- Typographie Inter
- Composants UI (border-radius, shadows, etc.)
- ADN visuel : sobre, chaleureux, professionnel, anti-template

### ✅ Positionnement conservé
- Baseline : "L'IA se construit avec vous"
- 4 pôles d'expertise maintenus
- Proposition de valeur inchangée
- Cible : PME françaises

### ✅ SEO et technique
- Architecture en silo
- Mots-clés identifiés conservés
- Performance Lighthouse > 90
- Stack : Lovable (React/Vite) + Tailwind + Lovable Cloud

### ✅ Intégration 21st.dev
- Composants proposés au fur et à mesure de la construction
- Adaptation obligatoire à la charte IArche
- Mapping couleurs conservé

---

## PROCHAINES ÉTAPES

1. **Validation de cette mise à jour CDC** par le client
2. **Définir la priorisation des pages** :
   - Option A : Homepage seule (validation identité visuelle)
   - Option B : Homepage + 2 hubs (structure navigable)
   - Option C : Toutes les pages d'un coup
3. **Activer Lovable Cloud** pour back-office
4. **Proposer composants 21st.dev** pertinents au fil du dev
5. **Développement itératif** avec feedback continu

---

## RÉPONSES AUX QUESTIONS - CLARIFICATIONS FINALES ✅

### A. Structure du blog/ressources (/ressources)
**✅ CONFIRMÉ : Bibliothèque d'actualités avec back-office**

**Spécifications :**
- Blog avec articles réguliers (potentiellement quotidiens)
- Contenu : actualités IA, avancées technologiques, retours d'expérience projets
- Gestion 100% via back-office Lovable Cloud
- Structure blog avec section "Articles à venir" pour V1
- Possibilité d'intégrer articles existants dès le départ si disponibles

**Tables Supabase requises :**
```sql
blog_posts:
  - id (uuid)
  - title (text)
  - slug (text, unique)
  - excerpt (text)
  - content (text)
  - featured_image (text, nullable)
  - author (text)
  - published_at (timestamp)
  - status (enum: draft, published)
  - created_at (timestamp)
  - updated_at (timestamp)
```

---

### B. Page Solutions - Niveau de détail
**✅ CONFIRMÉ : 5 projets avec CTA "En savoir plus"**

**Spécifications :**
- 5 projets/solutions à afficher dès V1
- CTA "En savoir plus" sur chaque projet
- Trois options pour le CTA :
  1. **Modale** avec détails complets (recommandé pour projets internes)
  2. **Formulaire de demande de documentation** (capture leads)
  3. **Lien externe** (si solution a site dédié)

**Logique :**
- Projets nommés publics : modale avec détails
- Projets confidentiels/en cours : formulaire pour doc (capture email)

**Table Supabase requise :**
```sql
projects:
  - id (uuid)
  - name (text)
  - description (text)
  - category (text)
  - status (enum: available, coming_soon, confidential)
  - is_public (boolean)
  - cta_type (enum: modal, form, external_link)
  - cta_url (text, nullable)
  - image_url (text, nullable)
  - order (integer)
  - created_at (timestamp)
```

---

### C. Navigation header
**✅ CONFIRMÉ :**
- Expertise : Dropdown avec 5 liens (hub + 4 sous-pages)
- Solutions : Lien simple vers page unique

---

### D. Formulaire contact - Notifications
**✅ CONFIRMÉ :**
- Email de notification : **adresse email professionnelle du fondateur** (à fournir)
- **Email de confirmation automatique** à l'utilisateur : OUI
- Stockage en base : Historique complet pour suivi + tableau de bord admin

**Spécifications techniques :**
- Edge function avec Resend pour envoi emails
- Double envoi : notification fondateur + confirmation utilisateur
- Validation stricte avec Zod (sécurité)
- Stockage contact_submissions en DB

**Table Supabase requise :**
```sql
contact_submissions:
  - id (uuid)
  - name (text)
  - email (text)
  - company (text)
  - message (text)
  - status (enum: new, read, replied, archived)
  - created_at (timestamp)
```

**Secrets requis :**
- `RESEND_API_KEY` (pour envoi emails)
- `CONTACT_EMAIL` (email destinataire notifications)

---

### E. Ordre de développement
**✅ CONFIRMÉ : Homepage complète → validation → suite**

**Approche validée :**
1. **Phase 1 - Homepage seule** :
   - Design system complet (couleurs, typo, composants)
   - Hero adapté du composant 21st.dev
   - Section problème/accroche
   - 4 pôles Expertise (cards)
   - Section crédibilité SaaS
   - CTA final
   - → **VALIDATION AVANT SUITE**

2. **Phase 2 - Navigation + Hubs** (après validation homepage) :
   - Header avec navigation dropdown
   - Footer
   - Hub Expertise
   - Page Solutions unique

3. **Phase 3 - Profondeur** (itératif) :
   - 4 sous-pages Expertise
   - Page À propos
   - Page Contact avec formulaire
   - Page Ressources/Blog

---

### F. Intégration composant 21st.dev
**✅ CONFIRMÉ : Composant hero fourni**

**Composant source :** `dynamic-animated-hero-section-with-gradient.tsx`

**Adaptations appliquées à la charte IArche :**
- ❌ Fond noir → ✅ Blanc Cassé #FAF9F7
- ❌ Dégradé rose/bleu/cyan → ✅ Bleu Nuit #1A2B4A avec accent Terracotta
- ❌ Lignes blanches → ✅ Lignes Terracotta (#D15A3E)
- ❌ Bouton blanc → ✅ Bouton Terracotta (#D15A3E)
- ❌ Texte générique → ✅ Copy IArche :
  - Titre H1 : "IArche" (en Terracotta)
  - Baseline : "L'IA se construit avec vous"
  - Suppression du sur-titre "Agence IA · Bayonne"
- ✅ Animations optimisées : Progressive staggered, pulse subtil (3s), patterns ultra-lents (45s)
- ✅ Typographie Inter

---

## DÉVELOPPEMENT EN COURS

### Étape actuelle : Homepage V1
- [x] Lovable Cloud activé
- [x] CDC mis à jour avec réponses finales
- [x] Design system configuré (index.css + tailwind.config.ts)
- [x] Composant hero adapté à charte IArche (animations A+B appliquées)
- [x] Copy hero finalisé (IArche + baseline)
- [x] Ancrage géographique ajouté ("Bayonne · France" en bas de page)
- [x] Intégration design system : utilisation token `text-primary` pour cohérence globale
- [x] CTA textuel bleu avec animation hover
- [x] Animations dynamiques optimisées (gradients, lignes SVG)
- [x] Repositionnement titre "IArche" (espacement vertical augmenté)
- [x] Correction bug FOUC (Flash of Unstyled Content)
- [ ] Homepage assemblée (sections suivantes à ajouter)
- [ ] Validation client

---

## DESIGN SYSTEM & CHARTE GRAPHIQUE - RÉFÉRENTIEL V1

**Date : 28 Novembre 2025**  
**Version : 1.0**  
**Objectif : Référence pour toutes les pages futures et médias de communication**

---

### 1. PALETTE COULEURS (HSL)

#### Couleurs Principales
```css
--primary: 12 60% 53%           /* Terracotta #D15A3E - Couleur de marque */
--primary-glow: 12 70% 65%      /* Terracotta lumineux - Accents */
--background: 30 16% 98%        /* Blanc Cassé #FAF9F7 - Fond principal */
--foreground: 218 47% 20%       /* Bleu Nuit #1A2B4A - Texte principal */
```

#### Couleurs Secondaires
```css
--muted: 30 16% 88%             /* Sable Doux #E5E3DF - Éléments subtils */
--muted-foreground: 218 20% 40% /* Gris Bleuté - Texte secondaire */
--text-subtle: 0 0% 60%         /* Gris clair #999999 - Info passive footer */
--border: 30 12% 85%            /* Bordures subtiles */
```

#### Couleurs Système
```css
--accent: 218 47% 30%           /* Bleu intermédiaire - Interactions */
--destructive: 0 70% 50%        /* Rouge - Actions destructives */
--success: 142 71% 45%          /* Vert - Validations */
```

**RÈGLE CRITIQUE :** Toujours utiliser les tokens CSS (ex: `text-primary`, `bg-background`) plutôt que des valeurs directes. Jamais de `text-white`, `bg-black`, etc.

---

### 2. TYPOGRAPHIE

#### Famille de Police
**Inter** - Police par défaut sur tout le site
- Disponible via Google Fonts
- Poids utilisés : 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

#### Hiérarchie Typographique
```css
/* Titre H1 - Hero principal */
font-size: 3rem (48px) mobile → 4rem (64px) desktop
font-weight: 600 (Semibold)
line-height: tight (1.1)
color: primary (avec effet gradient animé)

/* Titre H2 - Sections principales */
font-size: 2rem (32px) mobile → 2.5rem (40px) desktop
font-weight: 600 (Semibold)
line-height: tight (1.2)
color: foreground

/* Titre H3 - Sous-sections */
font-size: 1.5rem (24px) mobile → 1.75rem (28px) desktop
font-weight: 500 (Medium)
color: foreground

/* Body - Texte courant */
font-size: 1rem (16px) mobile → 1.125rem (18px) desktop
font-weight: 400 (Regular)
line-height: relaxed (1.625)
color: muted-foreground

/* Small - Annotations */
font-size: 0.875rem (14px)
font-weight: 400 (Regular)
color: muted-foreground
```

---

### 3. ANIMATIONS & EFFETS

#### A. Animations Hero Section

##### Gradient Texte "IArche"
```css
Animation: gradient 15s ease infinite
Effet: Dégradé animé Bleu Nuit → Terracotta → Bleu Nuit
Background: linear-gradient(270deg, hsl(218, 47%, 20%), hsl(12, 60%, 53%), hsl(218, 47%, 35%), hsl(12, 60%, 53%))
Background-size: 600% 600%
Optimisation: will-change: background-position
```

##### Fade In Staggeré (Apparition progressive)
```css
Animation: fadeIn 0.8s ease-out forwards
Effet: Opacité 0 → 1 + Translation Y(20px → 0)
Optimisation: visibility: hidden → visible (évite FOUC)
Optimisation: will-change: opacity, transform, visibility
Délais staggerés:
  - Titre H1: 0s
  - Baseline: 0.2s
  - CTA: 0.4s
```

##### Lignes SVG Animées
```css
Animation: Dessin progressif avec stroke-dashoffset
Durée: 2s ease-in-out
Délai staggeré: 0.5s entre chaque ligne
Couleurs: Dégradés Bleu Nuit → Terracotta (alternance)
Opacité: 0.6 (subtile)
```

##### Patterns de Fond (Ultra subtils)
```css
Animation: patternScroll 20s linear infinite
Effet: Translation douce des motifs de fond
Opacité: 0.1-0.2 (très discrète)
Pattern: Lignes diagonales répétées 45deg
```

##### Rectangles Constructions (Éléments décoratifs)
```css
Animation: constructionFade 4s ease-in-out infinite
Effet: Pulsation opacité + scale subtil
Délais staggerés: 0s, 1s, 2s, 3s
Bordures: border-border/30 (très subtiles)
```

#### B. CTA Textuel Bleu (Call-to-Action)

##### Spécifications
```css
Type: Lien textuel (pas de bouton rempli)
Couleur: text-primary (Terracotta)
Font-size: 1.125rem (18px)
Font-weight: 500 (Medium)
Display: inline-flex avec icône flèche
Gap: 0.5rem → 0.75rem au hover
```

##### Animation Hover
```css
Transition: all 300ms ease
Effet 1: Gap augmente (flèche s'éloigne)
Effet 2: Flèche translate-x-1 (avance de 4px)
Effet 3: Couleur maintenue (pas de changement)
```

**Principe :** CTA minimaliste sans fond, privilégiant la typographie et le mouvement subtil. Anti-bouton massif.

---

### 4. COMPOSITION & LAYOUT

#### Espacements Verticaux
```css
/* Hero Section */
min-height: 100vh (plein écran)
padding-y: 5rem (80px)
Titre "IArche" margin-bottom: 5rem mobile → 7rem desktop (espacement majeur)
Baseline margin-bottom: 2.5rem
CTA margin-bottom: Auto

/* Sections générales */
Section padding: 4rem mobile → 6rem desktop
Container max-width: 1280px
Container padding-x: 1.5rem
```

#### Grilles & Cards
```css
/* Grid système (futur) */
grid-gap: 2rem mobile → 3rem desktop
columns: 1 mobile → 2 tablet → 3 desktop

/* Cards projets (futur) */
padding: 2rem
border-radius: 0.75rem (12px)
border: 1px solid border
background: background
hover: shadow-lg + scale(1.02)
transition: 300ms ease
```

---

### 5. PRINCIPES DE DESIGN

#### Philosophie Visuelle
- **Minimalisme élégant** : Privilégier les espaces, la typographie et les animations subtiles
- **Anti-template** : Éviter les codes visuels génériques (pas de purple gradients, pas d'IA clipart)
- **Dynamisme contrôlé** : Animations présentes mais jamais envahissantes
- **Chaleur professionnelle** : Terracotta apporte chaleur sans perdre la crédibilité

#### Hiérarchie Visuelle
1. **Titre principal** : Grande taille + gradient animé = point focal
2. **Baseline** : Texte secondaire mais lisible, couleur muted-foreground
3. **CTA** : Couleur primary pour attirer l'œil, animation invite au clic
4. **Éléments décoratifs** : Opacité basse, mouvement lent, jamais distrayants

#### Règles d'Animation
- **Performance** : `will-change` sur propriétés animées (opacity, transform, background-position)
- **FOUC Prevention** : `visibility: hidden` initial + `visibility: visible` dans keyframe
- **Durées** : 
  - Micro-interactions : 200-300ms
  - Apparitions : 800ms-1.2s
  - Animations continues : 15s-20s
- **Easing** : `ease-out` pour apparitions, `ease-in-out` pour boucles, `linear` pour patterns

---

### 6. COMPOSANTS UI (SHADCN)

#### Tokens Sémantiques Utilisés
```css
--background      /* Fond principal des surfaces */
--foreground      /* Texte sur background */
--primary         /* Couleur de marque principale */
--primary-foreground /* Texte sur primary (blanc) */
--muted           /* Surface secondaire */
--muted-foreground /* Texte secondaire */
--border          /* Bordures subtiles */
--accent          /* Surfaces d'interactions */
```

#### Variantes Boutons (Future usage)
```css
/* Variant "default" (primary rempli) */
background: primary
color: primary-foreground
hover: opacity-90

/* Variant "outline" (contour) */
border: 1px solid border
color: foreground
hover: bg-accent

/* Variant "ghost" (transparent) */
color: foreground
hover: bg-accent

/* Variant "link" (textuel - utilisé actuellement) */
color: primary
text-decoration: underline-offset-4
hover: underline
```

---

### 7. RESPONSIVE DESIGN

#### Breakpoints Tailwind
```css
sm: 640px   /* Petit mobile → Tablette */
md: 768px   /* Tablette */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

#### Stratégie Mobile-First
- Base : Mobile (320px-640px)
- Ajustements progressifs via `md:`, `lg:`, `xl:`
- Hero : Centré vertical sur toutes tailles
- Typographie : Scale up de ~25% sur desktop
- Espacements : +50% sur desktop vs mobile

---

### 8. ACCESSIBILITÉ

#### Contraste
- Ratio texte/fond : ≥ 4.5:1 (WCAG AA)
- primary sur background : ✅ Conforme
- foreground sur background : ✅ Conforme
- muted-foreground sur background : ✅ Conforme

#### Navigation Clavier
- CTA accessible via Tab
- Focus visible : ring-2 ring-primary ring-offset-2
- Animations respectent `prefers-reduced-motion` (à implémenter)

---

### 9. PERFORMANCE

#### Optimisations Appliquées
- `will-change` sur animations continues (background-position, opacity, transform)
- `visibility: hidden` initial pour éviter FOUC
- CSS inline dans composant Hero (évite FOUC)
- SVG optimisé avec gradients réutilisables
- Pas d'images lourdes (design typographique)

#### Objectifs Lighthouse
- Performance : > 90
- Accessibility : > 95
- Best Practices : > 95
- SEO : > 95

---

### 10. GUIDELINES POUR FUTURES PAGES

#### À Respecter Impérativement
1. **Couleurs** : Utiliser exclusivement les tokens CSS définis
2. **Typographie** : Inter uniquement, respecter la hiérarchie établie
3. **Animations** : Privilégier les apparitions staggerées (0.2s entre éléments)
4. **CTA** : Style textuel minimaliste avec flèche animée (sauf cas exceptionnels)
5. **Espacements** : Utiliser les multiples de 1rem (Tailwind: 4, 8, 12, 16, 20, 24, 32)
6. **Contraste** : Toujours valider le ratio > 4.5:1

#### À Adapter Selon Contexte
- Intensité des animations (plus subtil sur pages longues)
- Grilles de contenu (2 ou 3 colonnes selon densité)
- Ajout de variantes boutons (outline, default) si besoin CTA secondaires

#### À Éviter Absolument
- Couleurs hardcodées (`text-white`, `bg-black`, `border-gray-300`)
- Animations trop rapides (< 200ms) ou trop lentes (> 20s pour continues)
- Fonts autres que Inter
- Gradients non alignés avec la palette (rose, violet, cyan)
- Images générées par IA générique

---

### 11. EXPORTS & ASSETS

#### Logo IArche
- **Statut** : À fournir ultérieurement
- **Formats attendus** : SVG (prioritaire), PNG haute résolution
- **Usage** : Header (40-50px hauteur), Footer (30px hauteur)

#### Iconographie
- **Source** : Lucide React (déjà installé)
- **Style** : Stroke 2px, couleur primary ou foreground
- **Taille standard** : 24px (1.5rem)

#### Médias Communication
**Principe :** Tous les éléments visuels doivent pouvoir être recréés à partir de ce CDC
- Palette couleurs HSL exportable
- Typographie Inter (Google Fonts)
- Animations CSS reproductibles
- Composants React réutilisables

---

### 12. ÉVOLUTIONS FUTURES IDENTIFIÉES

#### Page Solutions
- Cards projets avec hover effects (scale + shadow)
- Modales pour détails projets (overlay semi-transparent)
- Tags catégories avec couleur accent

#### Page Expertise
- Grid 2x2 sur desktop, 1 col mobile
- Icons Lucide pour chaque pôle
- Hover state avec border-primary

#### Navigation Header
- Dropdown Expertise avec animation slide-down
- Sticky header avec shadow au scroll
- Mobile menu avec drawer (vaul)

#### Page Blog/Ressources
- Card articles avec image featured
- Filtres par catégorie
- Pagination ou infinite scroll

---

## DÉCISIONS TECHNIQUES FINALES

### Bug FOUC (Flash of Unstyled Content) - RÉSOLU ✅

**Problème identifié :**
- Pendant le build/HMR, le contenu textuel apparaît brièvement déplacé avant que les animations se déclenchent
- Causé par `opacity: 0` sans `visibility: hidden`

**Solution appliquée :**
```css
/* Animation fadeIn mise à jour */
@keyframes fadeIn {
  0% {
    opacity: 0;
    visibility: hidden;
    transform: translateY(20px);
  }
  1% {
    visibility: visible; /* Visible dès 1% pour éviter le flash */
  }
  100% {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
}

/* Classes avec optimisations */
.hero-animate-fadeIn {
  animation: fadeIn 0.8s ease-out forwards;
  opacity: 0;
  visibility: hidden;
  will-change: opacity, transform, visibility;
}

.hero-gradient-text {
  /* ... */
  will-change: background-position;
}

.hero-pulse-animation {
  /* ... */
  will-change: box-shadow;
}
```

**Bénéfices :**
- Plus de décalage visuel pendant le build
- Layout stable dès le premier render
- Performance maintenue via `will-change`

---

## RÉSUMÉ MODIFICATIONS 28 NOVEMBRE 2025

### Changements Appliqués
1. ✅ **CTA Hero** : Bouton plein remplacé par lien textuel bleu (Terracotta) avec animation hover flèche
2. ✅ **Repositionnement Titre** : "IArche" espacé davantage de la baseline (mb-20 md:mb-28)
3. ✅ **Animations Dynamiques** : Gradient texte + lignes SVG + patterns maintenues et optimisées
4. ✅ **Correction Bug FOUC** : Ajout `visibility: hidden/visible` + `will-change` sur toutes animations
5. ✅ **Documentation Complète** : Design system & charte graphique finalisés pour référence future
6. ✅ **Hiérarchie Footer** : Différenciation visuelle coordonnées vs CTA question (voir détails ci-dessous)
7. ✅ **Espacement Vertical** : Augmentation espace entre CTA "Découvrir" et footer (mb-10 → mb-16)
8. ✅ **Micro-typographie** : Espace fine avant flèche "Une question ?" pour élégance typographique

### Détails Hiérarchie Visuelle Footer (Ajout du 28 Nov 2025)

**Problématique identifiée :**
Les deux lignes du footer (coordonnées + CTA question) avaient la même couleur, créant une hiérarchie floue.

**Solution appliquée :**

#### 1. Nouvelle couleur Design System
```css
/* index.css */
--text-subtle: 0 0% 60%;  /* Gris clair #999999 - Info passive */

/* tailwind.config.ts */
"text-subtle": "hsl(var(--text-subtle))",
```

#### 2. Footer - Hiérarchie différenciée
```jsx
/* Ligne 1 : Coordonnées (Info passive) */
<p style={{ color: 'hsl(var(--text-subtle))' }}>
  Bayonne · France · <a href="mailto:nlq@iarche.fr">nlq@iarche.fr</a>
</p>

/* Ligne 2 : CTA Question (Action) */
<a className="text-muted-foreground hover:text-accent">
  Une question ?<span className="inline-block w-1"></span>→
</a>
```

**Mapping couleurs :**
| Élément | Couleur par défaut | Couleur hover | Rationale |
|---------|-------------------|---------------|-----------|
| Coordonnées | `text-subtle` (#999) | `hover:underline` (email) | Info passive, discrète |
| "Une question ?" | `text-muted-foreground` (#666) | `hover:text-accent` (terracotta) | Action, plus visible |

**Effets appliqués :**
- **Coordonnées** : Gris très clair, hover underline sur email uniquement
- **CTA Question** : Gris plus foncé, hover couleur terracotta pour inciter au clic
- **Underline retiré** : Pas de soulignement par défaut sur "Une question ?", évite l'effet "lien classique"
- **Espace fine** : `<span className="inline-block w-1"></span>` (4px) avant flèche pour élégance typographique

**Bénéfices :**
- Hiérarchie claire : coordonnées = passif, question = actif
- Élégance renforcée (underline retiré, espace fine)
- Cohérence design system (nouvelles couleurs tokenisées)

### Prochaines Actions
- [ ] Valider identité visuelle Hero avec client
- [ ] Poursuivre assemblage Homepage (sections suivantes)
- [ ] Préparer composants réutilisables (cards, buttons variants, etc.)

---

---

*Fin des mises à jour CDC V3.1*
