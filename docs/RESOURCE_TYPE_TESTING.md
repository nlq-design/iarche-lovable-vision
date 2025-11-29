# Documentation : Tests de cohérence des resource_type

## Vue d'ensemble

Le système de vérification automatique garantit que les filtres `resource_type` sont cohérents entre :
- Les pages publiques (`/articles`, `/actualites`, etc.)
- Les pages admin (`/admin/articles`, `/admin/actualites`, etc.)
- Les routes de création et d'édition
- Les mappings d'URL

## Architecture

### Fichiers principaux

1. **`src/utils/verifyResourceTypeConsistency.ts`**
   - Source de vérité canonique pour tous les mappings
   - Fonctions utilitaires de validation
   - Configuration centralisée des 5 types de ressources

2. **`src/components/dev/ResourceTypeValidator.tsx`**
   - Composant de développement uniquement (désactivé en production)
   - Affichage visuel des résultats de validation
   - Logs dans la console pour le débogage

## Utilisation

### En développement

Le validateur s'exécute automatiquement en mode développement :

1. **Console du navigateur** : Les résultats de validation apparaissent automatiquement
2. **Widget visuel** : Cliquez sur le bouton "🔍 Dev: Resource Types" en bas à droite
3. **Raccourci clavier** : `Ctrl + Shift + V` pour afficher/masquer le validateur

### Vérifications effectuées

✅ **Unicité des resource_types**
- Vérifie qu'aucun type n'est défini en double

✅ **Unicité des routes publiques**
- Vérifie qu'aucune route `/articles`, `/actualites`, etc. n'est dupliquée

✅ **Unicité des routes admin**
- Vérifie qu'aucune route `/admin/articles`, `/admin/actualites`, etc. n'est dupliquée

✅ **Cohérence des noms de fichiers**
- Vérifie que tous les fichiers de pages ont l'extension `.tsx`

✅ **Validation de la route actuelle**
- Affiche le mapping attendu pour la page en cours de consultation

## Mappings canoniques

```typescript
const RESOURCE_TYPE_MAPPINGS = [
  {
    resourceType: 'article',
    publicRoute: '/articles',
    adminRoute: '/admin/articles',
    // ...
  },
  {
    resourceType: 'actualite',
    publicRoute: '/actualites',
    adminRoute: '/admin/actualites',
    // ...
  },
  // ... 3 autres types
];
```

## Fonctions utilitaires

### `isValidResourceType(type: string)`
Vérifie qu'un resource_type est valide.

```typescript
if (isValidResourceType('article')) {
  // Type valide
}
```

### `getMappingForResourceType(type: string)`
Obtient le mapping complet pour un resource_type donné.

```typescript
const mapping = getMappingForResourceType('actualite');
console.log(mapping.publicRoute); // "/actualites"
```

### `getPublicUrlFromResourceType(resourceType: string, slug: string)`
Génère une URL publique depuis un resource_type et un slug.

```typescript
const url = getPublicUrlFromResourceType('article', 'mon-article');
// Résultat: "/articles/mon-article"
```

### `validateSupabaseFilter(pageType, route, filterValue)`
Valide qu'un filtre Supabase utilise le bon resource_type.

```typescript
const result = validateSupabaseFilter('public', '/articles', 'article');
console.log(result.valid); // true
```

## Ajouter un nouveau type de ressource

Pour ajouter un nouveau type (ex: `podcast`) :

1. **Éditer `src/utils/verifyResourceTypeConsistency.ts`**
   ```typescript
   {
     publicRoute: '/podcasts',
     adminRoute: '/admin/podcasts',
     createRoute: '/admin/podcasts/new',
     editRoute: '/admin/podcasts/:id',
     resourceType: 'podcast',
     publicPageFile: 'src/pages/Podcasts.tsx',
     adminPageFile: 'src/pages/admin/AdminPodcasts.tsx',
   }
   ```

2. **Créer les pages correspondantes**
   - `src/pages/Podcasts.tsx` avec filtre `.eq('resource_type', 'podcast')`
   - `src/pages/admin/AdminPodcasts.tsx` avec filtre `.eq('resource_type', 'podcast')`

3. **Ajouter les routes dans `src/App.tsx`**

4. **Vérifier avec le validateur**
   - Le système détectera automatiquement la nouvelle configuration
   - Vérifiez la console et le widget visuel

## Désactivation

Le validateur est automatiquement désactivé en production (`NODE_ENV=production`).

Pour le désactiver manuellement en développement :
1. Commenter l'import dans `src/App.tsx`
2. Ou retirer le composant `<ResourceTypeValidator />`

## Dépannage

### Le widget ne s'affiche pas
- Vérifiez que vous êtes en mode développement (`npm run dev`)
- Regardez la console pour les logs automatiques
- Essayez le raccourci `Ctrl + Shift + V`

### Erreurs de validation
Les erreurs s'affichent en rouge avec le préfixe `❌`. Vérifiez :
1. Les filtres `.eq('resource_type', ...)` dans les pages
2. Les mappings dans `verifyResourceTypeConsistency.ts`
3. Les routes dans `App.tsx`

### Warnings (avertissements)
Les warnings s'affichent en jaune avec le préfixe `⚠️`. Ils indiquent :
- Des problèmes de nommage de fichiers
- Des incohérences mineures qui n'empêchent pas le fonctionnement

## Logs console

Format des logs en développement :

```
✅ Resource Type Consistency: All checks passed
📍 Public Route: /articles → resource_type='article'
```

En cas d'erreur :

```
❌ Resource Type Consistency: Issues detected
❌ Des resource_types en double ont été détectés
⚠️ Le fichier public pour article n'a pas l'extension .tsx
```

## Maintenance

**À faire régulièrement :**
- Vérifier les logs console après chaque ajout de type
- Consulter le widget visuel lors du développement de nouvelles pages
- Mettre à jour la documentation si de nouveaux patterns apparaissent

**Lors des revues de code :**
- Vérifier que les nouveaux filtres Supabase utilisent les bonnes valeurs
- Confirmer que les routes sont ajoutées dans `App.tsx`
- S'assurer que les mappings sont à jour
