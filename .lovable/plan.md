

# Responsive Mobile — EventLanding.tsx

## Problèmes

| Zone | Problème | Impact mobile (375px) |
|------|----------|----------------------|
| Hero | `minHeight: 400px` fixe | Occupe tout l'écran, scroll obligatoire |
| Hero | `p-10` padding | 40px chaque côté = 295px de contenu |
| Container | `px-6` + cards `px-8` | Double padding = ~260px utile |
| Programme table | `table-fixed` 3 colonnes | Colonnes écrasées, texte illisible |
| Inscription | `p-8` fixe | Trop d'espace perdu |
| H1 | `text-3xl` minimum | Titres longs débordent visuellement |

## Corrections (fichier unique : `EventLanding.tsx`)

1. **Hero** : `min-h-[280px] md:min-h-[400px]`, padding `p-6 md:p-16`
2. **Container** : `px-4 md:px-6`
3. **Cards internes** : `px-4 md:px-8`, `pt-6 md:pt-8`, `pb-6 md:pb-8`
4. **Programme table** : remplacer `table-fixed` par `table-auto` + sur mobile, transformer en cards empilées (chaque row = un bloc vertical horaire/thème/intervenant) via classes responsive `hidden md:table-cell` + bloc mobile `md:hidden`
5. **Inscription** : `p-4 md:p-8`
6. **H1** : `text-2xl md:text-5xl`
7. **Footer** : `p-4 md:p-8`
8. **Prose classes** : réduire les padding table internes `[&_th]:px-2 md:[&_th]:px-4`

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/pages/EventLanding.tsx` | Tous les ajustements responsive ci-dessus |

Zero migration. Zero nouveau composant.

