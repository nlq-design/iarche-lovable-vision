# Système de Blog IArche - Guide d'utilisation

## Vue d'ensemble

Le système de blog complet a été implémenté avec back-office Lovable Cloud pour gérer les articles d'actualités IA. Le système inclut :

- ✅ Base de données articles, catégories et tags
- ✅ Système de rôles admin sécurisé
- ✅ Back-office complet avec éditeur riche
- ✅ Pages publiques d'actualités et détails d'articles
- ✅ Tracking GTM automatique des événements
- ✅ Banner de consentement RGPD
- ✅ Historique des versions avec restauration
- ✅ Génération automatique de slugs alternatifs
- ✅ Prévisualisation des articles avant publication

## Accès au back-office

### URL : `/admin`

Pour accéder au back-office, vous devez :
1. Créer un compte utilisateur
2. Assigner le rôle admin à cet utilisateur

### Créer votre premier compte admin

1. **Créer un utilisateur via l'interface Supabase** :
   - Allez dans votre backend Lovable Cloud
   - Onglet "Authentication" → "Users"
   - Cliquez sur "Add User"
   - Entrez votre email et mot de passe
   - Sauvegardez

2. **Assigner le rôle admin** :
   - Allez dans l'onglet "Database" → "Tables"
   - Sélectionnez la table `user_roles`
   - Cliquez sur "Insert" → "Insert Row"
   - Remplissez :
     - `user_id` : Copiez l'ID de l'utilisateur créé à l'étape 1
     - `role` : Sélectionnez `admin`
   - Sauvegardez

3. **Connectez-vous** :
   - Allez sur `https://votre-site.lovable.app/admin`
   - Entrez votre email et mot de passe
   - Vous avez maintenant accès au back-office !

## Fonctionnalités du back-office

### Créer un article

1. Connectez-vous au back-office `/admin`
2. Cliquez sur "Nouvel article"
3. Remplissez les champs :
   - **Titre** : Le titre de votre article (obligatoire)
   - **Slug** : L'URL de l'article (généré automatiquement, modifiable)
   - **Extrait** : Court résumé affiché dans la liste d'articles
   - **Image de couverture** : URL d'une image (optionnel)
   - **Contenu** : Utilisez l'éditeur riche pour rédiger votre article
   - **Publier** : Activez pour rendre l'article visible publiquement
4. Cliquez sur "Créer l'article"

### Modifier un article

1. Dans la liste des articles, cliquez sur l'icône "crayon"
2. Modifiez les champs souhaités
3. Cliquez sur "Mettre à jour"

### Supprimer un article

1. Dans la liste des articles, cliquez sur l'icône "corbeille"
2. Confirmez la suppression

### Visualiser un article publié

1. Cliquez sur l'icône "œil" pour voir l'article tel qu'il apparaît aux visiteurs
2. Ou allez sur `/actualites` pour voir tous les articles publiés

### Prévisualiser un article (brouillon ou publié)

1. Dans l'éditeur d'article, cliquez sur "Prévisualiser"
2. L'article s'ouvre dans un nouvel onglet
3. Les admins peuvent voir les brouillons en prévisualisation

### Voir l'historique des versions

1. Depuis la liste des articles `/admin`, cliquez sur l'icône "historique" (📜)
2. Ou depuis l'éditeur, cliquez sur le bouton "Historique" en haut à droite
3. Consultez toutes les versions précédentes de l'article
4. Restaurez une ancienne version en un clic

**Note** : Consultez **README_VERSIONS.md** pour le guide complet de l'historique des versions.

### Génération automatique de slugs

Le système génère automatiquement des slugs alternatifs si le slug souhaité existe déjà :
- Titre : "Mon Article" → Slug : `mon-article`
- Si `mon-article` existe → essaie `mon-article-2`
- Continue jusqu'à trouver un slug disponible
- Vous recevez une notification du slug utilisé

**Note** : Consultez **README_VERSIONS.md** pour plus de détails sur la gestion des slugs.

## Éditeur de contenu

L'éditeur ReactQuill vous permet de :
- Formater le texte (gras, italique, souligné, barré)
- Créer des titres (H1, H2, H3)
- Créer des listes à puces et numérotées
- Insérer des liens et des images
- Nettoyer le formatage

## Catégories et tags (pré-configurés)

### Catégories disponibles :
- Intelligence Artificielle
- PME & Transformation
- Cas d'usage
- Réglementation
- Tutoriels

### Tags disponibles :
- RAG
- ChatGPT
- Automatisation
- AI Act
- RGPD
- OpenAI
- LLM
- Data

*Note : Pour l'instant, les catégories et tags sont visibles uniquement dans la base de données. L'interface de gestion sera ajoutée dans une future mise à jour.*

## Pages publiques

### Page liste des articles : `/actualites`
- Affiche tous les articles publiés
- Grille responsive (3 colonnes desktop, 2 tablette, 1 mobile)
- Carte avec image, titre, extrait et date
- Clic sur une carte pour voir le détail

### Page détail d'article : `/actualites/:slug`
- URL personnalisée basée sur le slug
- Affiche l'article complet avec contenu formaté
- Bouton retour vers la liste
- SEO optimisé avec meta tags dynamiques

## Tracking GTM et Analytics

### Événements trackés automatiquement :

1. **Contact form** : `contact_form_submit`
   - Déclenché lors de l'envoi du formulaire de contact
   - Variables : `form_subject`

2. **Newsletter** : `newsletter_signup`
   - Déclenché lors de l'inscription à la newsletter
   - Variables : `email`

3. **Création d'article** : `article_created`
   - Déclenché quand un admin crée un article
   - Variables : `article_title`

4. **Mise à jour d'article** : `article_updated`
   - Déclenché quand un admin met à jour un article
   - Variables : `article_id`, `article_title`

5. **Consentement cookies** : `cookie_consent_given`
   - Déclenché quand l'utilisateur accepte/refuse les cookies
   - Variables : `consent_analytics`, `consent_marketing`

### Configuration dans GTM

Pour créer des déclencheurs personnalisés dans GTM :

1. Allez dans votre compte GTM
2. Créez un nouveau déclencheur de type "Événement personnalisé"
3. Nom de l'événement : Utilisez les noms ci-dessus (ex: `contact_form_submit`)
4. Créez une balise GA4 Event avec ce déclencheur
5. Publiez

## Banner de consentement RGPD

Le banner de consentement cookies apparaît automatiquement lors de la première visite. Il permet :

- **Tout accepter** : Active Analytics et Marketing
- **Personnaliser** : Choix granulaire par catégorie
- **Tout refuser** : Désactive tous les trackers optionnels

### Catégories de cookies :
1. **Essentiels** : Toujours activés (fonctionnement du site)
2. **Analytiques** : Google Analytics (optionnel)
3. **Marketing** : Publicité et remarketing (optionnel)

Le consentement est stocké dans `localStorage` et respecte la réglementation RGPD.

## Sécurité

### Row Level Security (RLS)

Toutes les tables sont protégées par RLS :
- Les articles publiés sont visibles par tous
- Seuls les admins peuvent créer/modifier/supprimer des articles
- Les utilisateurs ne peuvent voir que leurs propres rôles

### Système de rôles

Les rôles sont stockés dans une table séparée `user_roles` pour éviter les attaques d'escalade de privilèges. La vérification se fait côté serveur avec une fonction `has_role()` sécurisée.

## Support

Pour toute question ou problème :
- Vérifiez d'abord que vous avez bien le rôle admin assigné
- Consultez les logs dans le backend Lovable Cloud
- Vérifiez que l'authentification est bien configurée (auto-confirm email activé)

## Roadmap future

Fonctionnalités prévues :
- Interface de gestion des catégories et tags
- Upload d'images directement dans l'éditeur
- Gestion des commentaires
- SEO avancé avec rich snippets
- Comparaison visuelle entre versions (diff)

## Documentation complémentaire

- **README_VERSIONS.md** : Guide complet de l'historique des versions et gestion des slugs
- **README_GTM.md** : Configuration détaillée de Google Tag Manager
