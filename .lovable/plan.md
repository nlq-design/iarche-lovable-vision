

# Fix page événement : CTA, formulaire et QR code

## Problème

1. **Section "Inscription" avec CTA bleu** : La section `id: 'cta'` dans `content_json` génère un bloc "Je m'inscris gratuitement maintenant !" via `dangerouslySetInnerHTML`. C'est redondant avec le vrai formulaire en bas.
2. **QR code mal placé** : Le QR code est actuellement SOUS le formulaire sur la page publique — il devrait être dans le PDF uniquement, pas sur la page web.
3. **Logique inversée** : Sur la page publique → formulaire (sans QR). Sur le PDF (AdminInvitationPreview) → QR code (pointant vers le formulaire public).

## Actions

### 1. `EventLanding.tsx` — Supprimer section CTA + retirer QR code

- Filtrer la section `id: 'cta'` dans le rendu des `sortedSections` (comme on filtre déjà `id: 'hero'`)
- Retirer le composant `EventQRCode` de la section inscription — garder uniquement le formulaire
- Supprimer l'import `EventQRCode`

```
// Ligne 174 : ajouter le filtre
if (section.id === 'hero' || section.id === 'cta') return null;
```

```
// Lignes 241-247 : supprimer le bloc QR code sous le formulaire
```

### 2. `AdminInvitationPreview.tsx` — Vérifier QR code en place

Le QR code est déjà correctement implémenté dans la preview admin (lignes 514-544) avec le lien public. Rien à modifier ici — c'est exactement le comportement souhaité pour l'impression PDF.

### 3. Nettoyage

- Retirer l'import `EventQRCode` de `EventLanding.tsx`
- Le composant `EventQRCode.tsx` reste disponible pour d'autres usages

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/pages/EventLanding.tsx` | Filtrer section `cta`, supprimer QR code, nettoyer imports |

Migration SQL : aucune.

