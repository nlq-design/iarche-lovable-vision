# Charte IArche v4.0 — Standard d'application Web

> **Statut** : standard de référence pour iarche.fr **et toutes les futures plateformes IArche SAS**.
> **Source de vérité visuelle** : landings `of.iarche.fr` / `samedi-ia.iarche.fr` (repo `iarche-design-system`).
> **Objet de ce document** : traduire ces landings « premium » en système de composants React/Tailwind appliquable, + analyse d'écart + plan d'application.

---

## 1. Intention & principes

Le standard v4.0 n'est pas une palette, c'est une **direction artistique éditoriale** :

1. **Alternance lumière / ombre** — le récit avance en respirant : sections claires (blanc cassé / sable) ↔ sections sombres (bleu nuit profond). C'est LA signature structurante. Le site actuel est mono-tonal (tout clair) → c'est le principal écart.
2. **Sobriété chaude** — bleu nuit = structure/sérieux ; terracotta = chaleur/artisanat/marque. Jamais de couleur « tech » froide.
3. **Matière** — les fonds sombres ont du **grain** (bruit SVG), des **halos radiaux** terracotta, du **verre dépoli** (glass). Rien n'est plat.
4. **Mouvement discret & signé** — **arcs lumineux animés** (point qui glisse), **particules** flottantes, **reveal** au scroll. Jamais gratuit, toujours « premium calme ».
5. **Typo à fort contraste d'échelle** — titres fluides géants (`clamp`), *em* en italique rosé, kickers mono espacés. Le corps reste calme.
6. **Détail artisanal** — liseré terracotta au survol, halos d'icônes, numérotation mono des cartes.

---

## 2. Tokens

### 2.1 Couleurs

| Rôle | Nom | HEX | HSL (`H S% L%`) | Usage |
|---|---|---|---|---|
| Structure | Bleu Nuit | `#1A2B4A` | `219 48% 20%` | texte clair, fonds sombres, `--secondary`/`--foreground` |
| Marque | Terracotta | `#B04A32` | `11 56% 44%` | CTA, accents, `--primary` |
| | Terra deep | `#8E3A26` | `12 58% 35%` | hover terracotta |
| | Terra soft | `#D4937D` | `19 47% 66%` | accents sur sombre, halos |
| | Rouge vif | `#C8431D` | `13 75% 45%` | eyebrow clair, départ de dégradé bouton |
| | Rouge rosé | `#D54B3A` | `7 65% 53%` | ***em* des titres**, traits manuscrits |
| | Rouge POP | `#E55A2B` | `15 79% 53%` | peps maximum (rare) |
| | Terra flame | `#E0654A` | `12 71% 59%` | *em* des titres **sur fond sombre** |
| Validation | Olive | `#3D7A5C` | `150 33% 36%` | succès |
| Fond clair | Blanc Cassé | `#FAF9F7` | `40 23% 97%` | `--background` |
| Fond clair alt | Gris Sable | `#F0EDE8` | `38 21% 93%` | sections claires alternées, cartes solides |
| Fond sombre base | Nuit profond | `#0E1A30` | `219 55% 12%` | base dégradé sombre |
| Fond sombre surface | Nuit surface | `#14233B` | `217 49% 15%` | milieu dégradé sombre |
| Encre | Ink soft | `#4A5568` | `218 17% 35%` | texte secondaire clair |
| Encre | Ink mute | `#6B6259` | `30 9% 38%` | légendes |
| Sur sombre | Crème | `#F4F1EC` | `37 27% 94%` | texte sur sombre |
| Sur sombre | Crème soft | `rgba(244,241,236,.72)` | — | lede sur sombre |
| Sur sombre | Crème mute | `rgba(244,241,236,.46)` | — | notes sur sombre |
| Verre | Glass | `rgba(255,255,255,.05)` | — | fond carte glass |
| Verre | Glass border | `rgba(255,255,255,.12)` | — | bordure glass |
| Lignes | Ligne | `#E5E0DA` | `33 17% 88%` | séparateurs, bordures cartes claires |

### 2.2 Typographie

- **Texte** : `Manrope` 300→800.
- **Mono / kickers** : `JetBrains Mono` 300→500.
- **Titres** : `font-weight: 600`, `letter-spacing: -0.022em` (jusqu'à `-0.035em` sur le H1 hero).
- **Échelle fluide** (`clamp`) :
  - Hero H1 : `clamp(42px, 7.5vw, 82px)` — `line-height: 1.05`, `-0.035em`
  - Section title : `clamp(34px, 5vw, 60px)` — `line-height: 1.04`, `-0.025em`, `max-width: 17ch`
  - Card H3 : `21px` / 600
  - Lede : `clamp(17px, 2.1vw, 20px)`
  - Body : `15.5–16px`
  - Kicker/eyebrow : `12–13px` mono, `text-transform: uppercase`, `letter-spacing: 0.2em`
- **`em` dans les titres** : italique, poids 400–500, couleur **rosé `#D54B3A`** (clair) / **flame `#E0654A`** (sombre).

### 2.3 Rondeurs & ombres

- Radius : `8px` (sm) · `16px` (base) · `24px` (lg) · `32px` (xl) · `100px` (pill).
- Ombre bouton : `0 12px 32px -12px rgba(176,74,50,.7)`.
- Ombre carte glass : `0 20px 50px -34px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.08)`.
- Ombre carte solide (hover) : `0 18px 40px -22px rgba(26,43,74,.28)`.

---

## 3. Système de sections (le cœur du standard)

Chaque section porte un **ton**. Le rythme cible alterne clair/sombre.

### 3.1 `.sec-light` (clair)
`background: #FAF9F7` · texte ink. Variante **`.sec-light--warm`** = `#F0EDE8` (sable) pour alterner deux sections claires consécutives.

### 3.2 `.sec-dark` (sombre) — recette exacte
```css
background:
  radial-gradient(55% 45% at 86% 8%, rgba(176,74,50,.22), transparent 60%),
  radial-gradient(50% 45% at 6% 82%, rgba(213,75,58,.15), transparent 62%),
  linear-gradient(180deg, #0E1A30 0%, #14233B 55%, #0E1A30 100%);
color: #F4F1EC;
```
+ **grain** en `::before` (bruit `feTurbulence`, `opacity:.4`, `mix-blend-mode:overlay`)
+ contenu en `position:relative; z-index:1` au-dessus du grain.

### 3.3 Rythme de page cible (homepage)
| # | Section | Ton actuel | **Ton cible** |
|---|---|---|---|
| 1 | Hero | clair | **SOMBRE** (signature) |
| 2 | Accroche / constat | clair | clair |
| 3 | Services | clair | **SOMBRE** (glass cards) |
| 4 | Présentation / à-propos | clair | clair **warm** (sable) |
| 5 | Exemples / projets | sable | clair |
| 6 | Solutions CTA | clair | **SOMBRE** |
| 7 | Newsletter / final CTA | sable | **SOMBRE** (panneau glow) |
| 8 | Signoff + footer | — | clair → footer nuit |

Padding section : `84px 0` (≥ `96px` sur le hero).

---

## 4. Composants signatures (spec)

| Composant | Spec | État repo |
|---|---|---|
| **Eyebrow / kicker** | mono `JetBrains`, uppercase, `0.2em`, préfixe `✦`/`◆`, terracotta (`accent-vivid` clair / `accent-soft` sombre). Variante hero = pilule bordée. | `ui/eyebrow.tsx` à **upgrader** (mono + ✦) |
| **Section title** | clamp géant + `em` rosé + **arc animé** dessous. | `GradientTitle`+`LogoArc` → **fusionner** en arc *animé* |
| **Arc animé** | SVG parabole `M6 26 Q105 -4 204 26`, trait dégradé terracotta→navy, **point lumineux** `animateMotion` 3s en boucle. | **à créer** (`AnimatedArc`) |
| **Particules** | 5 `<span>` radiaux floutés, `@keyframes floaty` 9s, delays variés, sur hero sombre. | **à créer** (`Particles`) |
| **Bouton primaire** | dégradé `100deg, #C8431D→#B04A32`, pilule, ombre, **lift -2px** + flèche qui glisse + `btn-note`. | `ui/button.tsx` (default) **fait** ; ajouter slot note + flèche |
| **Carte solide** | sable + bordure `--line`, **barre terracotta en haut au hover** + lift, `card-num` mono. | `card.tsx` + variante **à styliser** |
| **Carte glass** | `glass` + bordure verre + `backdrop-blur(14px)`, hover bordure terracotta + lift. | **à créer** (variante) |
| **Chips d'icône** | tuiles 54–56px, claires = aplats teintés / sombres = halos radiaux (terra/soft/olive). | **à créer** |
| **Principles** | liste numérotée mono `01..0n`, fond clair, `strong` ink. | `TimelineProcess` proche → **adapter** |
| **Final CTA glow** | panneau glass à halo radial terracotta, eyebrow centré, dots info, bouton. | **à créer** (`FinalCtaPanel`) |
| **Signoff** | logo centré + slogan `em` rosé + baseline. | partiel (`Logo`) → **assembler** |

---

## 5. Motion

| Effet | Détail | Hook/CSS |
|---|---|---|
| **Reveal au scroll** | `opacity 0→1` + `translateY(22px)→0`, `0.7s`, `once`. | `useInViewReveal` **déjà présent** → généraliser |
| **Arc animé** | point lumineux glissant le long de la parabole, 3–3.5s infini. | SVG `animateMotion` |
| **Particules** | flottaison verticale `±22px`, opacité `.45→.9`, 9s. | `@keyframes floaty` |
| **Hover bouton** | `translateY(-2px)` + `brightness(1.05)` + flèche `translateX(3px)`. | CSS |
| **Hover carte** | lift `-3/-4px` + bordure/halo terracotta + barre haute (solide). | CSS |
| Respect | `prefers-reduced-motion` neutralise tout. | déjà géré |

---

## 6. Layout & rythme

- Conteneurs : `max-width: 1180px` (standard) / `880px` (narrow, texte & CTA).
- Padding conteneur : `28px` mobile → `44px` desktop.
- Grilles cartes : 1 col mobile → `repeat(3, 1fr)` desktop, gap `18–22px`.
- `z-index` : grain `0`, contenu `1`, header `10`.

---

## 7. Mapping React (ce qu'on construit)

Nouveau dossier `src/components/brand/` (primitives réutilisables, exportables vers futures plateformes) :

```
brand/
  Section.tsx        → <Section tone="light|warm|dark"> (grain+halos auto, reveal)
  Eyebrow.tsx        → kicker mono ✦ (remplace/upgrade ui/eyebrow)
  SectionTitle.tsx   → titre clamp + <em> rosé + <AnimatedArc/>
  AnimatedArc.tsx    → arc SVG + point animé
  Particles.tsx      → champ de particules hero
  SolidCard.tsx      → carte sable (barre hover, card-num)
  GlassCard.tsx      → carte verre (fond sombre)
  IconChip.tsx       → tuile d'icône (terra/navy/olive · clair/sombre)
  FinalCtaPanel.tsx  → panneau glass glow
  Signoff.tsx        → logo + slogan + baseline
```
Boutons : `ui/button.tsx` (variant `default` = dégradé pilule, déjà en place).
Le **contenu et les liens ne changent pas** — on remplace l'emballage visuel des sections existantes par ces primitives.

---

## 8. Analyse d'écart — iarche.fr actuel → standard

| Dimension | Actuel | Standard v4.0 | Écart |
|---|---|---|---|
| Alternance sections | quasi nulle (tout clair) | clair/sombre rythmé | **majeur** |
| Hero | clair, plat, CTA fantôme | **sombre**, particules, pilule pleine | **majeur** |
| Matière (grain/glass/halos) | absente | systématique sur sombre | **majeur** |
| Arcs animés | arc statique (`LogoArc`) | **arc animé** signature | moyen |
| Eyebrows | ligne + uppercase | **mono + ✦** terracotta | moyen |
| Titres | scale ok, pas d'`em` rosé | clamp géant + *em* rosé | moyen |
| Cartes | bordure simple | sable+barre hover / glass | moyen |
| Boutons | ✅ pilule dégradé (fait) | idem | ok |
| Reveal scroll | hook présent, peu utilisé | généralisé | mineur |
| Tokens | ✅ alignés v4.0 (fait) | idem + tokens sombre | ok |

---

## 9. Plan d'application (par phases, non hâtif)

**Phase 0 — Fondations** *(fait / à compléter)*
Tokens v4.0 (✅), bouton pilule (✅), ajouter au thème : `--accent-soft/-vivid/-flame`, glass, night-base/surface, classes `.sec-dark`/`.sec-light` (✅ partiel).

**Phase 1 — Primitives `brand/`**
Construire les 10 composants du §7 + leurs styles. Aucune page touchée. Validation isolée (storybook léger / page `/charte-graphique`).

**Phase 2 — Homepage (preuve)**
Recomposer `Index.tsx` selon le rythme §3.3 : **hero sombre**, alternance, glass cards sur Services, panneau final glow. Contenu/liens inchangés. → **Checkpoint visuel avec toi.**

**Phase 3 — Pages clés**
Appliquer le système à Services, Solutions, Contact, IArche Labs (hero sombre + sections alternées + cartes).

**Phase 4 — Pages éditoriales & légales**
Articles/Actualités/Cas clients : header sombre, corps clair lisible. Légales : clair sobre.

**Phase 5 — Durcissement**
Accessibilité (contrastes AA, focus, reduced-motion), responsive, perf (poids SVG/particules), nettoyage hex en dur résiduels.

**Phase 6 — Capitalisation SAS**
Extraire `brand/` + tokens en paquet réutilisable (ou doc d'import) pour les prochaines plateformes IArche SAS.
