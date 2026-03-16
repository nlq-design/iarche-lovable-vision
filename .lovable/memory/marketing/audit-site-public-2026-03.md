# Audit Site Public iarche.fr — Mars 2026

## 🟢 Points Forts (ce qui fonctionne bien)

### SEO & Métadonnées
- ✅ `react-helmet-async` sur **toutes les pages** avec `<title>`, `<meta description>`, `<canonical>`
- ✅ JSON-LD **riche** : Organization, BreadcrumbList, Article, FAQPage, Event, VideoObject, Book, SoftwareApplication, Service, ItemList, AggregateRating
- ✅ Open Graph + Twitter Cards sur toutes les pages
- ✅ `robots.txt` bien configuré (admin/cockpit/api bloqués)
- ✅ Sitemap dynamique via edge function (articles publiés + pages statiques)
- ✅ Google Search Console vérifié
- ✅ Geo tags pour SEO local (Bayonne, 64100)
- ✅ Balise `<h1>` sémantique sur homepage ("L'IA se construit avec vous")
- ✅ `hreflang="fr"` sur la homepage

### Performance
- ✅ GTM chargé en **deferred** (interaction ou 4s timeout) — excellent pour FCP
- ✅ Lazy loading (React.lazy) sur pages secondaires + toutes les pages admin
- ✅ Preload du logo LCP avec `fetchpriority="high"`
- ✅ Preconnect Supabase + Google Fonts
- ✅ Prefetch routes stratégiques dans `<head>`
- ✅ Pagination côté client sur toutes les listes (9 items/page)

### Accessibilité
- ✅ `aria-label` sur tous les liens sociaux du footer
- ✅ `aria-hidden="true"` sur les icônes décoratives
- ✅ `sr-only` sur le slogan Hero
- ✅ Focus visible (`focus-visible:ring-2`) sur les liens de navigation
- ✅ Alt text dynamique sur les ResourceCards (`alt={title}`)
- ✅ Burger menu : `aria-label` conditionnel (Ouvrir/Fermer)

### Architecture
- ✅ Layout unifié (BackgroundLayout + Header + Footer)
- ✅ Composant `ResourceCard` réutilisé sur 5+ pages de listing
- ✅ CTA tracking unifié via `useCTATracking()`
- ✅ Validation Zod sur formulaires (contact, newsletter)
- ✅ ScrollToTop sauf homepage (preserve portal effect)
- ✅ Page 404 brandée avec suggestions de navigation

---

## 🔴 Problèmes Critiques (P0)

### 1. Images de couverture sans `loading="lazy"`
**Fichier** : `ResourceCard.tsx` ligne 64-68
- Les images `<img>` des cartes n'ont pas `loading="lazy"` ni `decoding="async"`
- Impact : LCP et CLS sur les pages de listing (Articles, Actualités, etc.)
- **Fix** : Ajouter `loading="lazy" decoding="async"` sur toutes les images de cartes

### 2. Footer utilise des couleurs hardcodées au lieu des tokens
**Fichier** : `Footer.tsx`
- `text-[hsl(45,20%,85%)]`, `bg-gradient-to-br from-[hsl(220,25%,12%)]`, etc.
- Violation du design system — impossible à thématiser
- **Fix** : Créer des tokens sémantiques `--footer-bg`, `--footer-text`, etc.

### 3. Pas de `<nav>` sémantique sur le footer
**Fichier** : `Footer.tsx`
- Les colonnes de liens ne sont pas wrappées dans `<nav aria-label="...">`
- Impact : Accessibilité, navigation par lecteur d'écran
- **Fix** : Ajouter `<nav aria-label="Services">`, `<nav aria-label="Ressources">`, etc.

### 4. Lien footer `/rendez-vous` vs `/rendez-vous/premier-echange`
**Fichier** : `Footer.tsx` ligne 144
- Le lien "Prendre rendez-vous" pointe vers `/rendez-vous` (page listing)
- Incohérent avec l'intention CTA — devrait pointer vers `/rendez-vous/premier-echange`
- **Fix** : Corriger le `to` du NavLink

---

## 🟡 Problèmes Importants (P1)

### 5. Duplication OG tags entre `index.html` et `Index.tsx`
- `index.html` contient des OG tags génériques (lignes 61-72)
- `Index.tsx` via Helmet les surcharge — mais sur les pages non-homepage, les tags `index.html` restent en fallback
- **Risque** : Double injection de meta tags OG sur certaines pages
- **Fix** : Supprimer les OG tags de `index.html` et s'appuyer uniquement sur Helmet

### 6. Pas de `<main>` sémantique
- Les pages utilisent `<section>` directement sans wrapper `<main>`
- Sauf sur `BackgroundLayout` — vérifier s'il wrappe en `<main>`
- Impact : Accessibilité (landmark navigation)

### 7. Pages de listing sans JSON-LD CollectionPage
- `Articles.tsx`, `CasClients.tsx`, `LivresBlancs.tsx` ont BreadcrumbList mais pas de JSON-LD `CollectionPage` ou `ItemList`
- `Services.tsx` a un `ItemList` — bon modèle à répliquer
- **Fix** : Ajouter JSON-LD ItemList sur toutes les pages de listing

### 8. Hero `<h1>` trop discret visuellement
- Le `<h1>` est `text-lg md:text-xl text-muted-foreground` — très petit pour un H1
- Le logo au-dessus est visuellement dominant mais n'est pas le H1
- **Risque SEO** : Le H1 paraît secondaire visuellement
- **Fix** : Augmenter la taille ou revoir la hiérarchie visuelle

### 9. Absence de `rel="noopener noreferrer"` systématique
- Footer : ✅ Présent sur les liens sociaux
- Vérifier les autres pages (articles avec liens externes, etc.)

### 10. Newsletter : email exposé dans le tracking
- `Newsletter.tsx` ligne 33 : `trackCTAClick('newsletter_inscription', 'newsletter_page', email)`
- L'email est envoyé comme paramètre au tracking — potentiel RGPD issue
- **Fix** : Ne pas passer l'email au tracking CTA

---

## 🔵 Améliorations Recommandées (P2)

### 11. Pas de `<time>` sémantique pour les dates
- `ResourceCard.tsx` affiche les dates mais sans balise `<time datetime="...">`
- Impact : Rich snippets et accessibilité
- **Fix** : Utiliser `<time datetime={createdAt}>`

### 12. Manque skip-to-content
- Pas de lien "Aller au contenu" pour les utilisateurs clavier
- **Fix** : Ajouter un lien skip-to-content en haut du Header

### 13. Pas de breadcrumb visible sur la homepage
- Les breadcrumbs sont sur les pages internes mais absents de la homepage
- Acceptable mais on pourrait afficher "Accueil" pour la cohérence

### 14. Chatbot Dialog : pas vérifié pour l'accessibilité
- `ChatbotDialog` importé dans le Hero — vérifier `role="dialog"`, focus trap, etc.

### 15. Prefetch dans `index.html` utilise `as="document"`
- `<link rel="prefetch" href="/services" as="document">` — dans une SPA React, ce prefetch ne fait rien d'utile car les routes sont client-side
- **Fix** : Supprimer ces prefetch inutiles ou les remplacer par du prefetch de chunks JS

### 16. PWA : manifest.json incomplet
- Manque les tailles d'icônes 192x192 et 512x512 (requis pour installabilité)
- Manque `orientation`, `categories`
- **Fix** : Compléter le manifest avec les icônes requises

### 17. `alternateName: "Collabor IA"` dans le JSON-LD
- `Index.tsx` ligne 57 : ancien nom de marque encore présent
- **Fix** : Supprimer ou mettre à jour

---

## 📊 Résumé Score

| Critère | Score | Notes |
|---------|-------|-------|
| SEO On-Page | 8.5/10 | Excellent — JSON-LD riche, canonical, OG |
| Performance | 7.5/10 | Bon — GTM deferred, lazy routes. Images à optimiser |
| Accessibilité | 7/10 | Bon — aria-labels présents. Manque nav, main, skip-to-content |
| Architecture | 9/10 | Très bon — composants réutilisables, tracking unifié |
| Design System | 6.5/10 | Footer avec couleurs hardcodées, à tokeniser |
| RGPD | 8/10 | Bon — cookie banner, Confidentialité. Email dans tracking à corriger |
| PWA | 5/10 | Basique — manifest incomplet |

**Score Global : 7.4/10**

---

## 🎯 Plan d'Action Prioritisé

### Sprint 1 (Quick Wins — P0)
1. `loading="lazy"` + `decoding="async"` sur ResourceCard images
2. Fix lien footer `/rendez-vous` → `/rendez-vous/premier-echange`
3. Supprimer `alternateName: "Collabor IA"` du JSON-LD
4. Retirer l'email du tracking newsletter

### Sprint 2 (SEO + A11y — P1)
5. Supprimer OG tags dupliqués de `index.html`
6. Ajouter JSON-LD ItemList sur pages de listing manquantes
7. Wrapper les colonnes footer dans `<nav>` sémantique
8. Ajouter `<time>` sémantique dans ResourceCard
9. Ajouter skip-to-content link

### Sprint 3 (Design System — P2)
10. Tokeniser les couleurs du Footer
11. Compléter manifest.json pour PWA
12. Nettoyer les prefetch inutiles dans index.html
