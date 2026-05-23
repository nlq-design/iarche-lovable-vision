# Uplift Visuel IArche ← ALMA (Chatbot RAG Platform)

**Date :** 2026-05-23
**Auteur :** Audit Lovable
**Statut :** Audit livré — aucune modification de code effectuée
**Source de vérité Alma :** projet workspace `Chatbot RAG Platform` (`763e4863-cade-414a-8577-f98c6ff8a741`)

---

## 0. Règle d'or (verrou non négociable)

> **Tout pattern repris d'Alma doit soit utiliser exclusivement les tokens IArche v4, soit respecter explicitement la Charte Graphique v4 (Bleu Nuit `#1A2B4A`, Terracotta `#B04A32`, Blanc Cassé `#FAF9F7`, Manrope, Arc IArche comme unique décor).**
>
> Aucun token additionnel, aucune nouvelle famille typographique, aucune palette parallèle (`--wl-*`), aucun mode sombre, aucun emoji.

---

## 1. Constat fondateur

Les tokens HSL d'Alma sont **strictement identiques** à ceux d'IArche :

| Token | IArche | Alma | Statut |
|---|---|---|---|
| `--primary` | `218 47% 20%` | `218 47% 20%` | ✅ identique |
| `--accent` | `12 60% 44%` | `12 60% 44%` | ✅ identique |
| `--background` | `30 14% 98%` | `30 14% 98%` | ✅ identique |
| `--secondary` | `30 20% 93%` | `30 20% 93%` | ✅ identique |
| `--radius` | `0.75rem` | `0.75rem` | ✅ identique |
| Typo | Manrope | Manrope | ✅ identique |

**Conclusion :** le saut visuel d'Alma est **100% compositionnel** (rythme, hiérarchie, ombres, animations, micro-patterns). Aucun risque de dérive chromatique à porter ces patterns vers IArche.

---

## 2. Inventaire des patterns Alma transposables

### 2.1 Hero "ambient lights" + dot grid

**Source Alma** (`src/pages/Index.tsx`, l. 171-182) :

```tsx
<section className="relative overflow-hidden pt-24 sm:pt-36 pb-12 sm:pb-16">
  <div className="absolute inset-0 pointer-events-none">
    <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
    <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
    <div className="absolute inset-0 opacity-[0.03]" style={{
      backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
      backgroundSize: '32px 32px',
    }} />
  </div>
  ...
</section>
```

**Mapping IArche :** 100% tokens, aucune adaptation. Remplace `BackgroundLayout` actuel qui peut être surchargé d'éléments décoratifs.

**Cible :** `src/components/ui/hero-section.tsx`, `BackgroundLayout.tsx`.

---

### 2.2 Hand-drawn underline sous le mot-clé (à remplacer par Arc IArche)

**Source Alma** (l. 191-198) :

```tsx
<h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.1] text-foreground tracking-tight">
  {heroTitle}{' '}
  <span className="relative inline-block">
    <span className="text-accent">{heroHighlight}</span>
    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12">
      <path d="M2 8C50 2 150 2 198 8" stroke="hsl(var(--accent))" strokeWidth="3" opacity="0.4" />
    </svg>
  </span>
</h1>
```

**Mapping IArche STRICT :** **remplacer le squiggle SVG inline par le composant `<LogoArc size="sm" />`** déjà présent dans la charte v4 (`src/components/ui/LogoArc.tsx`). L'Arc IArche est l'unique élément décoratif autorisé par la charte ; cette substitution **renforce** la charte au lieu de la diluer.

**Variante :** `<LogoArc size="sm" className="absolute -bottom-3 left-0" />` sous le mot terracotta.

---

### 2.3 Mock product preview dans le hero

**Source Alma** (l. 219-254) : carte `rounded-2xl shadow-2xl shadow-foreground/10 p-1` avec browser-chrome (3 dots), KPI tiles, agent card preview.

**Mapping IArche :** dans le hero, remplacer la zone droite par un mockup affichant **soit** le Cockpit IArche (Dashboard intelligence) **soit** un extrait Vivier — illustration qui sert le narratif "architecte IA opérationnel". Les 3 dots restent en `bg-destructive`, `bg-[hsl(38,92%,50%)]` (à remplacer par un token IArche `bg-amber-500` ou créer un alias), `bg-success`.

**Adaptation chromatique :** les `hsl(38,92%,50%)` (orange browser) et `hsl(142,71%,45%)` (vert) doivent être **remplacés par `bg-success`** (déjà défini IArche) et un nouveau alias `bg-warning` si besoin — sinon réutiliser `bg-accent/60` pour cohérence stricte.

**Cible :** `HeroSection.tsx`.

---

### 2.4 Badge "New / Nouveau" outline accent

**Source Alma** (l. 187-189) :

```tsx
<Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs font-semibold border-accent/30 text-accent">
  <Zap className="w-3 h-3 mr-1.5" /> Nouveau · …
</Badge>
```

**Mapping IArche :** identique. Aucun emoji (charte). Remplacer `Zap` par une icône Lucide neutre (`Sparkles`, `Flame`, ou rien).

**Cible :** Hero IArche, AccrocheSection, ServicesSection (badges section).

---

### 2.5 Feature cards "lift on hover"

**Source Alma** (l. 282-291, FeaturesPage.tsx l. 127-141) :

```tsx
<Card className="group border-0 shadow-md shadow-foreground/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full">
  <CardContent className="p-8">
    <div className="w-12 h-12 rounded-xl bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center mb-5 transition-colors">
      <Icon className="w-6 h-6 text-accent" />
    </div>
    <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
  </CardContent>
</Card>
```

**Mapping IArche :** 100% identique. Tokens charte respectés.

**Cible :** `ServicesSection`, `ExemplesSection`, `SolutionsSection`, toutes les cards de listing Cockpit/Admin/Viviers.

---

### 2.6 Numbered steps "How it works"

**Source Alma** (l. 312-328) : 4 colonnes, icône tile `bg-accent/10`, label `tracking-widest uppercase` avec numéro, flèche connectrice desktop.

**Mapping IArche :** identique. Apporte une narrative "process" qui manque actuellement à la home IArche.

**Cible :** **nouvelle section** `HowItWorksSection.tsx` entre `PresentationSection` et `ExemplesSection`, ou refonte de `PresentationSection`.

---

### 2.7 Section CTA finale "dark island"

**Source Alma** (l. 446-473) : carte `rounded-3xl` fond `linear-gradient(135deg, #1B2D4B 0%, #0f1d33 100%)` avec dot pattern animé en overlay, CTA terracotta avec halo.

**Mapping IArche STRICT :** garder le gradient **dans la palette charte** : `from-primary to-primary/90` (Bleu Nuit pur, pas de variation arbitraire). Conserver le dot pattern (subtil, opacity 0.08, blanc cassé). CTA `bg-accent shadow-lg shadow-accent/20`.

**Cible :** remplace/uplift `SolutionsCTASection.tsx` actuel.

---

### 2.8 Stats row post-hero

**Source Alma** (l. 258-265) : 4 colonnes `text-4xl font-extrabold` au-dessus du fold de section suivante.

**Mapping IArche :** identique. Données suggérées : "PME accompagnées", "Projets IA livrés", "Heures de conseil", "Région d'origine : Bayonne".

**Cible :** insertion sous `HeroSection`.

---

### 2.9 Public Navbar minimaliste sticky

**Source Alma** (`src/components/ui/PublicNavbar.tsx`) : `sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl`, h-16, logo + 3 liens + CTA terracotta.

**Mapping IArche :** très probablement plus léger et lisible que le `Header.tsx` actuel. À auditer dans la phase d'implémentation (extraction des liens IArche existants).

**Cible :** `src/components/layout/Header.tsx`.

---

### 2.10 Public Footer dark Bleu Nuit

**Source Alma** (`src/components/ui/PublicFooter.tsx`) : fond `#1B2D4B` (= primary), 5 colonnes, sections uppercase tracking-wider en `text-foreground/50`, hover sur liens `hover:text-accent`, social tile `w-9 h-9 rounded-lg bg-foreground/10 hover:bg-accent`.

**Mapping IArche :** identique. Remplacer `#1B2D4B` par `hsl(var(--primary))`, `#FAF9F7` par `hsl(var(--background))`, `#B4482D` par `hsl(var(--accent))`.

**Cible :** `src/components/layout/Footer.tsx`.

---

### 2.11 Pricing cards "popular outlined"

**Source Alma** (l. 376-406) : card `border-2 border-accent shadow-xl shadow-accent/10` avec badge centré `-top-3 left-1/2 -translate-x-1/2`.

**Mapping IArche :** identique. Réutilisable pour `CockpitPricing.tsx` (déjà existant) et toute page tarifaire.

---

### 2.12 Testimonials avec étoiles accent

**Source Alma** (l. 419-441) : `fill-accent text-accent` sur les étoiles, avatar `bg-accent text-accent-foreground`.

**Mapping IArche :** identique. À utiliser dans `CasClients.tsx` et `LivreOr.tsx`.

---

## 3. Patterns Alma à REJETER (filtre charte)

| Pattern | Raison du rejet |
|---|---|
| `.dark` mode (CSS vars dark) | IArche est **light-only** (règle Core mémoire) |
| Tokens `--wl-primary`, `--wl-secondary`, `--wl-accent` | Spécifiques white-label Alma, hors scope IArche |
| `bg-[hsl(38,92%,50%)]` (orange browser dot) | Hors palette charte — remplacer par token |
| `bg-[hsl(142,71%,45%)]` (vert mockup) | Remplacer par `bg-success` (déjà charte) |
| Couleur `#0f1d33` (gradient CTA dark) | Variation arbitraire du Bleu Nuit — utiliser `primary/90` |
| `<span className="text-[hsl(218,47%,20%)]">` inline | Forme acceptable mais préférer `text-primary` pour cohérence |
| Squiggle SVG hand-drawn sous mot-clé | **Remplacer par `<LogoArc>`** (élément décoratif unique charte) |
| `animation: pulse` sur dot pattern CTA | Garder mais respecter `prefers-reduced-motion` (déjà dans `index.css` IArche) |
| Icônes décoratives emoji éventuelles | Charte = zéro emoji |

---

## 4. Plan de bataille — ordre & estimation

### Lot 1 — Site public (PRIORITÉ MAX)

**Objectif :** uplift visible de la home publique `/` + pages clés.

| Étape | Fichiers cibles | Effort |
|---|---|---|
| 1.1 Hero refondu (ambient lights + dot grid + LogoArc + mockup Cockpit) | `src/components/ui/hero-section.tsx` | M |
| 1.2 Stats row post-hero | nouveau bloc dans Hero ou `Index.tsx` | S |
| 1.3 Header sticky backdrop-blur | `src/components/layout/Header.tsx` | S |
| 1.4 Cards "lift on hover" généralisées | `ServicesSection`, `ExemplesSection`, `SolutionsSection`, `AccrocheSection` | M |
| 1.5 Nouvelle `HowItWorksSection` (4 steps numérotés) | nouveau `src/components/sections/HowItWorksSection.tsx` | M |
| 1.6 CTA finale "dark island" | `src/components/sections/SolutionsCTASection.tsx` | S |
| 1.7 Footer Bleu Nuit refondu | `src/components/layout/Footer.tsx` | M |
| 1.8 Badges section outline accent | composants sections | XS |
| 1.9 Application sur pages annexes (`Services`, `Solutions`, `Actualites`, `CasClients`, `LivresBlancs`, `AteliersWebinaires`, `Newsletter`, `Contact`) | pages publiques | L |

**Effort total Lot 1 :** ~6-8h équivalent agent (1-2 itérations).

---

### Lot 2 — Cockpit CRM

**Objectif :** harmoniser le Cockpit avec le langage visuel uplifté du site.

| Étape | Fichiers cibles | Effort |
|---|---|---|
| 2.1 Cards widgets dashboard "lift on hover" + icon tile accent | composants Cockpit dashboard | M |
| 2.2 Empty states harmonisés (déjà `EmptyState` standard) | rappel standard charte | XS |
| 2.3 Section headers `text-3xl font-extrabold tracking-tight` | pages Cockpit | S |
| 2.4 Drawer / Modal headers avec Badge outline accent | composants Cockpit | S |
| 2.5 Kpi tiles uniformes (variante Alma stats row) | dashboard intelligence | M |

**Effort total Lot 2 :** ~4-6h.

---

### Lot 3 — Admin

**Objectif :** alignement listings & dashboards Admin.

| Étape | Fichiers cibles | Effort |
|---|---|---|
| 3.1 Cards listings (Articles, Newsletters, Forms, Brochures, Solutions…) | pages `src/pages/admin/*` | M |
| 3.2 Headers de page avec arc IArche | AdminLayout / pages | S |
| 3.3 Stats Admin Dashboard (AdvancedStats, CTAAnalytics, SecurityDashboard) | composants admin | M |

**Effort total Lot 3 :** ~3-5h.

---

### Lot 4 — Viviers

**Objectif :** alignement Viviers dashboards et detail.

| Étape | Fichiers cibles | Effort |
|---|---|---|
| 4.1 Dashboard Viviers cards | `ViviersDashboard.tsx`, `ViviersListDetail.tsx` | M |
| 4.2 Lead detail card refonte | `VivierLeadDetail.tsx` | S |
| 4.3 Graph page accent harmonisé | `VivierGraph.tsx` | S |

**Effort total Lot 4 :** ~2-4h.

---

## 5. Standards techniques transverses (à appliquer dans tous les lots)

1. **Aucune couleur hardcodée** : remplacer toute `#FAF9F7`, `#1B2D4B`, `#B4482D`, `hsl(... )` brute par `hsl(var(--background))`, `hsl(var(--primary))`, `hsl(var(--accent))` ou les utilitaires Tailwind `bg-primary`, `text-accent`, etc.
2. **Aucun emoji** dans les sections ou composants.
3. **Arc IArche obligatoire** pour décor de titre (jamais sous un logo).
4. **`prefers-reduced-motion`** respecté (déjà dans `src/index.css`).
5. **`shadow-foreground/5`** comme ombre de base, jamais `shadow-black/20`.
6. **`group-hover` Tailwind** pour les animations de cards (pas de JS).
7. **Pas de `motion-framer`** si simple `transition-all duration-300` Tailwind suffit (perf + bundle).
8. **`<LogoArc>` composant existant** privilégié partout pour remplacer toute barre gradient résiduelle.
9. **Composants standards** : `LoadingState`, `EmptyState` (mémoire Core) — ne pas réinventer.
10. **Aucune nouvelle dépendance** npm.

---

## 6. Quick wins immédiats (si validation Lot 1)

Les 3 changements qui produiront 80% du saut perçu, par ordre d'impact :

1. **Hero ambient lights + dot grid + LogoArc sous le mot-clé highlight** → effet "wow" instantané sur la home publique.
2. **Cards lift on hover généralisées** (sections + cockpit + admin + viviers) → cohérence et premium feel sur tout le produit.
3. **Footer Bleu Nuit refondu** → fin de page mémorable, signature de marque.

---

## 7. Hors scope explicite (à ne PAS faire)

- ❌ Modifier le contenu textuel (titres, paragraphes, CTAs labels).
- ❌ Modifier la structure de navigation (routes, menu items).
- ❌ Modifier la logique métier (hooks, queries, RLS, edge functions).
- ❌ Ajouter ou supprimer des sections sans validation explicite (sauf `HowItWorksSection` listée).
- ❌ Toucher au Cockpit chatbot live, transcriptions, AI orchestration.
- ❌ Toucher aux composants `mem://design/visual-identity` validés (LogoArc, GradientTitle).

---

## 8. Validation requise avant implémentation

Avant de lancer le **Lot 1**, j'ai besoin de :

- [ ] **GO Lot 1** explicite.
- [ ] Confirmation : la `HowItWorksSection` (4 steps) est-elle souhaitée OU faut-il uplift l'existante `PresentationSection` à la place ?
- [ ] Confirmation : le mockup dans le hero affichera **Cockpit dashboard** (recommandé) ou **autre visuel** (à fournir) ?
- [ ] Confirmation : on remplace bien le squiggle Alma par `<LogoArc>` (recommandé charte) — ou tu préfères tester d'abord les deux côte à côte ?

---

**Fin du document. Aucun fichier code n'a été modifié.**
