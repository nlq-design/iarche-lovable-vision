
# Plan : Accès permanent au programme généré

## Problème
Le toast "Programme généré !" disparaît après quelques secondes. Une fois disparu, aucun moyen d'accéder au document depuis la liste des ateliers.

## Solution
Charger les `generated_documents` existants pour chaque atelier et afficher un **lien permanent** vers le dernier programme généré directement dans la carte de l'atelier.

### Modifications sur `AdminAteliersWebinaires.tsx`

1. **Charger les documents existants** : après le chargement des articles, requêter `generated_documents` par `article_id` pour récupérer le dernier document de chaque atelier (trié par `created_at desc`).

2. **Afficher dans la carte** : à côté du badge "Formulaire lié", ajouter un badge cliquable :
   - Si un programme existe : badge vert "Programme v1" cliquable → navigue vers `/admin/invitation/{doc.id}`
   - Si figé (`approved`) : badge avec icône cadenas
   - Sinon : rien (le bouton "Programme" sert à générer)

3. **Après génération** : en plus du toast, recharger les articles pour mettre à jour le badge immédiatement. Le toast reste mais n'est plus le seul point d'accès.

4. **Toast plus persistant** : passer `duration: 10000` (10s au lieu de ~4s par défaut) pour laisser le temps de cliquer.

### Fichier impacté

| Fichier | Action |
|---------|--------|
| `src/pages/admin/AdminAteliersWebinaires.tsx` | Charger `generated_documents`, afficher badge permanent, recharger après génération, toast 10s |

Aucune migration. Aucun nouveau fichier.
