# Plan Design v2 — Élévation visuelle du site public

Objectif : porter le site public (`/`, hors `/admin` et `/cockpit`) au niveau d'une plateforme premium (référence : plateformes RAG modernes — Glean, Perplexity Enterprise, Mendable, Vectara). Identité IArche préservée : Blanc Cassé `#FAF9F7`, Night Blue `#1A2B4A`, Terracotta `#B04A32`, Manrope, zéro emoji.

---

## Lot D1 — Fondations du design system (socle)

1. **Tokens étendus** dans `index.css` + `tailwind.config.ts`
   - Échelle de surfaces (`--surface-1` à `--surface-4`) + bordures hairline (`--border-subtle`, `--border-strong`)
   - Échelle d'ombres "soft elevation" (4 niveaux) + ombres terracotta pour accents
   - Gradients sémantiques : `--gradient-night`, `--gradient-terracotta-glow`, `--gradient-mesh-hero`
   - Radius cohérents (xs/sm/md/lg/xl/2xl) — actuellement irrégulier
2. **Typographie éditoriale**
   - Échelle fluide (`clamp()`) pour H1→H6 + display
   - Letter-spacing serré sur titres (-0.02em), tracking aéré sur eyebrows (+0.12em uppercase)
   - Composant `<Eyebrow>` réutilisable (label section)
3. **Motion primitives** (Framer Motion déjà présent)
   - Variants partagés : `fadeUp`, `staggerChildren`, `revealMask`, `magneticHover`
   - Hook `useInViewReveal` standardisé

## Lot D2 — Composants signatures réutilisables

4. `<SectionShell>` — wrapper avec eyebrow, titre, sous-titre, padding et grid cohérents (remplace les 11 variantes actuelles)
5. `<NoiseOverlay>` + `<GrainTexture>` — micro-texture sur fonds Night Blue (premium feel)
6. `<GradientMesh>` animé léger pour Hero (blobs Night Blue/Terracotta, blur, parallax souris)
7. `<MarqueeLogos>` clients/partenaires — défilement infini, pause hover
8. `<StatCounter>` — chiffres animés (déjà partiel sur Hero, à généraliser)
9. `<BeforeAfterSlider>` ou `<DiffCard>` pour cas clients
10. `<TimelineProcess>` verticale animée (méthodologie)
11. `<TestimonialCard>` premium (photo, citation, logo, lien étude de cas)

## Lot D3 — Refonte page par page

12. **Home (`Index.tsx`)** — Hero avec GradientMesh + LogoArc animé, section "Trusted by" (marquee), HowItWorks revu en timeline, ajout section "Pour qui ?" segmentée (PME / ETI / Industrie), proof bar avec stats animées, CTA final immersif full-bleed.
13. **Services & Solutions** — passage en grille bento (cartes asymétriques), icônes custom line-art au lieu d'emoji/lucide brut, hover reveal description longue.
14. **Cas clients** — layout magazine, image cover ratio 4/3, métriques en overlay, filtres par secteur sticky.
15. **Articles / Actualités / Livres Blancs** — grille masonry éditoriale, carte article avec ratio cover 16/10, tag pill, temps de lecture, auteur.
16. **Ateliers / Webinaires** — cartes événement avec countdown live, badge statut (à venir / replay), CTA inscription proéminent.
17. **IArche Labs** — page lab/R&D avec esthétique plus technique (mono accent, schémas, badges "experiment").
18. **Contact / RDV** — split-screen : formulaire à gauche, carte interactive + infos + photo Nicolas à droite. Confirmation animée.
19. **FAQ** — accordéon avec ancre URL, recherche en haut, regroupement par thème, sidebar navigation sticky.
20. **Livre d'Or** — mur de témoignages masonry, filtres par note/secteur.
21. **Pages légales** (CGV, Mentions, Confidentialité, Charte) — gabarit "document" épuré avec sommaire sticky.

## Lot D4 — Navigation & chrome

22. **Header** — version sticky avec fond glassmorphism au scroll, mega-menu Services/Solutions (preview cartes), CTA "Prendre RDV" terracotta toujours visible.
23. **Footer** — refonte 4 colonnes + newsletter inline + badges trust (RGPD, Made in France), micro-animation logo.
24. **Breadcrumbs** visuels (déjà côté SEO Lot 2) + page transitions Framer Motion (`AnimatePresence`).
25. **Scroll progress bar** Terracotta fine en haut des articles longs.

## Lot D5 — Micro-interactions & finition

26. Cursor follower discret (desktop) sur zones interactives clés
27. Magnetic buttons sur CTA primaires
28. Reveal masks sur titres hero (split text)
29. Image hover : zoom + overlay Night Blue 20%
30. Skeleton loaders cohérents (remplacer spinners)
31. Toasts redesignés (Sonner) selon DS

## Lot D6 — Accessibilité & qualité

32. Audit contrastes WCAG AA sur toutes combinaisons tokens
33. Focus rings visibles cohérents (ring-2 ring-terracotta offset-2)
34. `prefers-reduced-motion` respecté sur toutes animations
35. Alt text systématique, aria-labels nav/CTA icônes seules
36. Lighthouse cible : Perf ≥ 90, A11y ≥ 95, Best Practices = 100

## Lot D7 — Responsive & performance visuelle

37. Refonte breakpoints mobile (audit page par page sur 375/768/1024/1440)
38. Images : `srcset` + AVIF/WebP, lazy systématique, LCP < 2.5s
39. Fonts : `font-display: swap`, preload Manrope variable
40. Code-split routes lourdes (déjà partiel)

---

## Détails techniques

- **Stack** : React 18 + Tailwind v3 + Framer Motion + shadcn/ui (déjà en place)
- **Pas de nouvelle dépendance lourde** ; éventuellement `@studio-freight/lenis` pour smooth scroll si validé
- **Tokens HSL only** dans `index.css`, mapping via `tailwind.config.ts`
- **Aucune modification** de `/admin`, `/cockpit`, `/partner`, `/viviers`, `/onboarding`, `/auth`
- Chaque lot livré en PR mentale isolée, vérification visuelle via preview avant lot suivant

## Ordre d'exécution recommandé

```
D1 (socle tokens/typo/motion)
  └─> D2 (composants signatures)
        └─> D3 (refonte pages — Home → Services → Solutions → Cas clients → reste)
              └─> D4 (header/footer/nav)
                    └─> D5 (micro-interactions)
                          └─> D6 (a11y)
                                └─> D7 (responsive/perf)
```

Estimation : 7 lots, ~2-3 itérations par lot. Validation visuelle à chaque palier.

## Prochaine étape

Valider ce plan, puis je démarre **Lot D1** (tokens étendus + typographie fluide + motion primitives) — base indispensable avant tout refresh visuel.
