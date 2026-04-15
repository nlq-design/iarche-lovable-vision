

# Plan : Mise en forme cohérente du formulaire d'inscription événement

## Problèmes identifiés

1. **Champs incompatibles** : Les formulaires en DB utilisent `name` comme identifiant, mais `EventLandingForm` référence `field.id` — les champs ne s'affichent probablement pas ou les valeurs ne sont pas capturées correctement.
2. **Mise en page basique** : Prénom et Nom empilés verticalement au lieu d'être côte à côte. Pas de grille responsive.
3. **Style incohérent** : Le formulaire utilise un `Button` standard alors que le reste de la brochure utilise les couleurs IArche (Night Blue, Terracotta). Pas d'espacement harmonieux avec les sections brochure.
4. **Pas de consentement RGPD** : Le formulaire d'inscription natif (`AtelierInscriptionForm`) a un checkbox marketing, celui de la landing n'en a pas.

## Modifications prévues

### 1. `EventLandingForm.tsx` — Refonte complète

- **Résolution `id`/`name`** : Utiliser `field.name || field.id` comme clé de champ pour compatibilité avec les deux formats.
- **Grille responsive** : Prénom + Nom sur la même ligne (`grid grid-cols-2 gap-4`) sur desktop, empilés sur mobile.
- **Styles IArche** : Bouton CTA en gradient Terracotta, inputs avec focus ring cohérent, espacement `space-y-5` au lieu de `space-y-4`.
- **Consentement marketing** : Ajout d'un checkbox RGPD optionnel en bas du formulaire.
- **Message succès enrichi** : Reprendre le style de `AtelierInscriptionForm` (icône CheckCircle, message structuré).
- **Placeholder intelligents** : Si le champ a un placeholder, l'afficher ; sinon en générer un cohérent.

### 2. `EventLanding.tsx` — Cohérence visuelle

- Section formulaire : fond légèrement différencié (`bg-primary/5`), bordure accentuée pour guider l'oeil.
- Titre "Inscription" avec sous-texte explicatif ("Remplissez ce formulaire pour confirmer votre participation").
- Espacement harmonisé entre sections.

### 3. `AdminInvitationPreview.tsx` — Même cohérence

- Harmoniser les espacements des sections avec la landing publique.
- S'assurer que le print/PDF conserve les mêmes proportions.

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/events/EventLandingForm.tsx` | Refonte : grille, id/name compat, RGPD, style IArche |
| `src/pages/EventLanding.tsx` | Section formulaire enrichie visuellement |
| `src/pages/admin/AdminInvitationPreview.tsx` | Harmonisation espacement |

Aucune migration DB nécessaire. Aucun changement d'edge function.

