# Bundle Analyzer - Guide d'utilisation

## Génération du rapport

Le bundle analyzer est configuré pour générer un rapport visuel à chaque build de production.

### Commande
```bash
npm run build
```

### Résultat
Fichier généré : `dist/stats.html`

Ouvrir ce fichier dans un navigateur pour visualiser :
- **Répartition du bundle** : taille de chaque dépendance
- **Taille gzipped** : poids réel après compression serveur
- **Taille Brotli** : compression moderne (encore plus légère)
- **Treemap interactif** : identifier les plus gros modules

## Objectifs d'optimisation

### Baseline actuelle (Phase 1+2)
- Bundle initial : ~150KB (après lazy loading Recharts + React Quill)
- Images WebP : -60% poids
- Prefetch routes : navigation instantanée

### Cibles à surveiller
1. **Recharts** : doit être lazy-loadé ✅
2. **React Quill** : doit être lazy-loadé ✅
3. **Autres dépendances > 50KB** : identifier pour lazy loading potentiel
4. **Code dupliqué** : identifier les imports redondants

## Actions selon le rapport

### Si Recharts/Quill apparaissent dans le bundle initial
→ Problème de lazy loading, vérifier les imports

### Si nouvelles dépendances > 100KB
→ Envisager lazy loading ou alternative plus légère

### Si code dupliqué détecté
→ Refactoriser en composants partagés

### Si total bundle > 300KB
→ Audit approfondi requis

## Suivi recommandé
- Générer rapport après chaque ajout de dépendance majeure
- Comparer avant/après pour valider optimisations
- Archiver rapports pour suivi historique (optionnel)
