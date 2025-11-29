# Guide rapide : Tests de cohérence des resource_type

## 🚀 Démarrage rapide

### Option 1 : Widget visuel en développement (recommandé)

1. Lancez l'application : `npm run dev`
2. Ouvrez la console du navigateur (F12)
3. Consultez les logs automatiques : `✅ Resource Type Consistency: All checks passed`
4. Cliquez sur le bouton **"🔍 Dev: Resource Types"** en bas à droite
5. Ou utilisez le raccourci **`Ctrl + Shift + V`**

### Option 2 : Script CLI

Exécutez depuis la racine du projet :

```bash
node scripts/verify-resource-types.js
```

Ce script :
- ✅ Vérifie l'unicité des types et routes
- ✅ Valide l'existence des fichiers
- ✅ Analyse les filtres Supabase dans le code
- ✅ Contrôle les routes dans App.tsx
- 📊 Affiche un tableau récapitulatif

### Option 3 : Intégration dans votre workflow

**Avant chaque commit :**
```bash
node scripts/verify-resource-types.js && git commit -m "..."
```

**Avant chaque déploiement :**
```bash
node scripts/verify-resource-types.js && npm run build
```

## 📋 Checklist de vérification manuelle

Avant d'ajouter un nouveau type de ressource :

- [ ] Définir le mapping dans `src/utils/verifyResourceTypeConsistency.ts`
- [ ] Créer la page publique avec le bon filtre `.eq('resource_type', 'mon-type')`
- [ ] Créer la page admin avec le bon filtre `.eq('resource_type', 'mon-type')`
- [ ] Ajouter les routes dans `src/App.tsx` :
  - [ ] Route publique `/mon-type`
  - [ ] Route de liste admin `/admin/mon-type`
  - [ ] Route de création `/admin/mon-type/new`
  - [ ] Route d'édition `/admin/mon-type/:id`
  - [ ] Route d'historique `/admin/mon-type/:id/history`
- [ ] Mettre à jour `AdminSidebar.tsx` avec le lien
- [ ] Exécuter `node scripts/verify-resource-types.js`
- [ ] Vérifier dans le navigateur avec le widget visuel

## 🔍 Comprendre les résultats

### ✅ Succès
```
✅ Resource Type Consistency: All checks passed
```
Tout est correct, aucune action requise.

### ❌ Erreurs
```
❌ src/pages/Articles.tsx: Filtre .eq('resource_type', 'article') manquant ou incorrect
```
**Action** : Ouvrir le fichier et corriger le filtre Supabase.

### ⚠️ Avertissements
```
⚠️ Route de création manquante dans App.tsx: /admin/podcasts/new
```
**Action** : Ajouter la route manquante dans App.tsx.

## 🛠️ Cas d'usage courants

### Vérifier après une modification
```bash
# Après avoir modifié un filtre
node scripts/verify-resource-types.js
```

### Déboguer un problème d'affichage
1. Ouvrir la console (F12)
2. Chercher `📍 Public Route:` ou `📍 Admin Route:`
3. Vérifier que le resource_type correspond

### Ajouter un nouveau type
1. Suivre la checklist ci-dessus
2. Exécuter le script CLI
3. Corriger les erreurs signalées
4. Ré-exécuter jusqu'à obtenir ✅

## 📚 Documentation complète

Pour plus de détails, consultez [RESOURCE_TYPE_TESTING.md](./RESOURCE_TYPE_TESTING.md)
