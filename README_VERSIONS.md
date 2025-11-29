# Système d'historique des versions - Guide d'utilisation

## Vue d'ensemble

Le système d'historique des versions sauvegarde automatiquement chaque modification d'article, permettant de :
- Voir toutes les versions précédentes d'un article
- Restaurer une ancienne version en un clic
- Comparer les changements entre versions

## Comment ça fonctionne

### Sauvegarde automatique

À chaque fois que vous **modifiez** un article existant :
1. L'ancienne version est automatiquement sauvegardée
2. Un numéro de version incrémental est attribué (v1, v2, v3...)
3. La nouvelle version devient la version active

**Important** : Les versions ne sont créées que lors de modifications d'articles existants, pas lors de la création initiale.

### Accéder à l'historique

Deux façons d'accéder à l'historique des versions :

**1. Depuis la liste des articles** (`/admin`) :
- Cliquez sur l'icône **📜 Historique** (entre Œil et Crayon)
- Accès direct à l'historique de l'article

**2. Depuis l'éditeur d'article** (`/admin/articles/:id`) :
- Bouton **📜 Historique** en haut à droite
- Visible uniquement lors de la modification d'un article existant

### Voir l'historique

La page d'historique affiche :
- Liste de toutes les versions (de la plus récente à la plus ancienne)
- Numéro de version (v1, v2, v3...)
- Titre de l'article à cette version
- Extrait (si disponible)
- Date et heure de création de la version
- Actions disponibles pour chaque version

### Restaurer une version

Pour restaurer une ancienne version :
1. Allez sur la page d'historique de l'article
2. Trouvez la version que vous souhaitez restaurer
3. Cliquez sur **🔄 Restaurer**
4. Confirmez l'action dans la popup
5. L'article est restauré à cette version

**Important** : La restauration remplace complètement la version actuelle par la version sélectionnée. Cette action crée une nouvelle version avec le contenu restauré.

### Prévisualiser une version

Pour voir à quoi ressemblait l'article dans une version spécifique :
- Cliquez sur l'icône **👁️** à côté de la version
- L'article s'ouvre dans un nouvel onglet tel qu'il était à cette version

## Génération automatique de slug alternatif

### Problème résolu

Auparavant, si vous tentiez d'utiliser un slug déjà existant, l'éditeur :
- Affichait une erreur
- Bloquait la sauvegarde
- Vous obligeait à trouver manuellement un slug disponible

### Nouvelle solution

Maintenant, le système génère **automatiquement** un slug alternatif :

**Lors de la création d'article** :
1. Vous tapez le titre : "Mon Article"
2. Le slug généré : `mon-article`
3. Si `mon-article` existe déjà :
   - Le système essaie automatiquement `mon-article-2`
   - Si occupé aussi, essaie `mon-article-3`
   - Continue jusqu'à trouver un slug disponible
4. Une notification vous informe du slug utilisé

**Lors de la modification manuelle du slug** :
1. Vous modifiez le slug manuellement
2. Si le slug existe déjà :
   - Une erreur s'affiche (bordure rouge)
   - Une suggestion de slug alternatif apparaît
   - Vous pouvez accepter la suggestion ou chercher un autre slug

### Règles de génération

Le système génère des slugs alternatifs avec cette logique :
- Slug de base : `mon-article`
- Si occupé : `mon-article-2`
- Si occupé : `mon-article-3`
- Continue jusqu'à 100 tentatives
- Au-delà : utilise un timestamp unique

## Cas d'usage pratiques

### Scénario 1 : Correction d'erreur

1. Vous publiez un article avec une erreur
2. Vous corrigez l'erreur et sauvegardez
3. La version avec l'erreur est conservée dans l'historique
4. Si besoin, vous pouvez voir exactement ce qui a changé

### Scénario 2 : Expérimentation

1. Vous voulez tester une nouvelle structure d'article
2. Vous modifiez complètement le contenu
3. Si vous n'êtes pas satisfait, restaurez simplement l'ancienne version
4. Aucun risque de perdre votre travail original

### Scénario 3 : Audit et conformité

1. Un client demande "qui a modifié quoi et quand ?"
2. Consultez l'historique complet des versions
3. Voyez toutes les modifications avec dates et auteurs
4. Parfait pour la traçabilité et la conformité

### Scénario 4 : Titres similaires

1. Vous créez "Guide IA pour PME"
2. Plus tard, vous créez "Guide IA pour PME" (même titre)
3. Le système génère automatiquement `guide-ia-pour-pme-2`
4. Pas de conflit, pas d'erreur, tout fonctionne

## Limitations et notes

### Limitations actuelles

- Les versions sont créées uniquement lors de **modifications**, pas lors de la création initiale
- Pas de limite sur le nombre de versions sauvegardées
- Pas encore de comparaison visuelle entre deux versions (feature future)
- Pas de gestion des tags/catégories dans l'historique (feature future)

### Bonnes pratiques

**Avant modifications importantes** :
- Vérifiez qu'une version a bien été sauvegardée
- L'historique est votre filet de sécurité

**Organisation** :
- Ajoutez des notes dans l'extrait pour identifier facilement les versions
- Utilisez des titres explicites pour retrouver rapidement les versions

**Restauration** :
- Lisez bien la version avant de restaurer
- La restauration est immédiate et remplace la version actuelle

### Performance

- Les versions sont stockées dans une table séparée
- Pas d'impact sur les performances de lecture des articles publiés
- Les index optimisent les requêtes d'historique

## Sécurité

- Seuls les **admins** peuvent voir et restaurer les versions
- Les versions sont protégées par RLS (Row Level Security)
- Toute restauration est tracée avec l'ID de l'auteur
- Les versions ne sont jamais supprimées automatiquement

## Support et dépannage

### L'historique est vide
- Normal pour les articles jamais modifiés
- Les versions sont créées lors de la première modification

### Une version ne s'affiche pas correctement
- Vérifiez que l'article n'a pas été supprimé
- Les versions restent même si l'article est supprimé (protection des données)

### Le bouton Historique n'apparaît pas
- Le bouton n'est visible que pour les articles existants (pas lors de la création)
- Vérifiez que vous êtes connecté en tant qu'admin

## Roadmap future

Fonctionnalités prévues :
- Comparaison visuelle entre deux versions (diff)
- Notes/commentaires sur les versions
- Gestion des tags/catégories dans l'historique
- Export de l'historique en JSON
- Fusion de versions
