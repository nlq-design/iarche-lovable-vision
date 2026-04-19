

# Inventaire exhaustif des routes frontend — Plan

## Méthode (lecture seule, 100% fichiers)

1. **Source primaire** : `src/App.tsx` (déclaration centrale des routes via React Router).
2. **Sources secondaires** :
   - `code--list_dir src/pages/`, `src/pages/admin/`, `src/pages/cockpit/`, `src/pages/partner/` → fichiers .tsx réellement présents
   - Grep `<Route path=` dans tout `src/` pour détecter sous-routeurs éventuels
   - Grep `lazy(` dans `App.tsx` pour distinguer lazy loaded (chargement à la demande) vs eager (chargé au démarrage)
3. **Pour les composants clés affichés** : lecture ciblée du haut de fichier (10-20 lignes : imports principaux) uniquement quand le rôle n'est pas évident depuis le nom.
4. **Pour l'accès** : lecture des wrappers déjà connus (`ProtectedAdminRoute`, `ProtectedCockpitRoute`, `ProtectedPartnerRoute`) + repérage des `<Route>` non wrappés = publique.
5. **Statut complétude** : déduit du croisement (présence dans navigation + memory files + taille du fichier). Marqué "inconnu" si aucun signal fiable.

## Livrable (1 réponse markdown)

### Section A — Tableau par module

Ordre : **Site public → Admin → Cockpit → Partenaire (Vivier inclus dans Cockpit selon arborescence)**.

Colonnes : `Path | Fichier .tsx | Rôle (FR simple) | Accès | Layout | Lazy | Composants clés | Statut`.

**Distinction visuelle** : 
- ✅ = confirmé par lecture App.tsx
- 🔍 = fichier présent mais routage à vérifier
- 💭 = évoqué de mémoire, non vérifié

### Section B — 4 analyses transverses

1. **Routes dupliquées** : grep croisé `src/pages/Admin*.tsx` vs `src/pages/admin/*.tsx` (pattern historique fréquent dans le projet).
2. **Routes manquantes pour SaaS multi-client** : checklist explicite des 9 routes citées par l'utilisateur (/signup, /verify-email, /forgot-password, /pricing, /account/settings, /workspace/settings, /billing, /legal/*, /rgpd) → présent / absent / partiel.
3. **Routes orphelines** : pages dans `src/pages/` sans `<Route>` correspondant dans App.tsx (= code mort potentiel).
4. **Mismatch protection** : routes publiques contenant des données sensibles, ou routes protégées qui pourraient être publiques (analyse par nom + composants clés).

### Section C — Vulgarisation

Chaque terme entre parenthèses : route (URL de l'application), lazy loading (chargement différé du code à la première visite), layout (gabarit visuel commun à plusieurs pages), protected route (route conditionnée à une authentification/un rôle), wrapper (composant qui en enveloppe un autre), eager (chargé immédiatement au démarrage), etc.

### Section D — Limites assumées

Bloc "Ce que je ne peux pas garantir sans exécution" :
- Routes générées dynamiquement (ex: `/article/:slug`) → je liste le pattern, pas les valeurs réelles
- Sous-routeurs imbriqués si présents hors App.tsx
- Statut "fini" basé sur présence + taille fichier, pas sur tests fonctionnels

## Fichiers à lire (estimation)

- `src/App.tsx` (lecture intégrale)
- `code--list_dir` sur 4 dossiers : `src/pages/`, `src/pages/admin/`, `src/pages/cockpit/`, `src/pages/partner/`
- `code--search_files` : `<Route path=` (détection sous-routeurs)
- 5-10 fichiers ciblés en lecture haut-de-fichier pour clarifier rôles ambigus

## Hors scope

- Lecture intégrale des composants de page
- Audit accessibilité / SEO par page
- Analyse runtime (logs Vercel, clics utilisateurs)
- Routes des edge functions (déjà couvert audit 03)

