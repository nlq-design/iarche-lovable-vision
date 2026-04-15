

# Fix : Bug formulaire — tous les champs partagent la meme cle

## Cause racine

Les champs du formulaire en base ont une propriete `name` (prenom, nom, email, etc.) mais **pas de propriete `id`**. Or `fieldKey()` utilise `field.id` qui retourne `undefined` pour tous les champs. Resultat : tous les inputs ecrivent dans `values[undefined]`, d'ou la propagation de la saisie.

## Fix

Dans `EventLandingForm.tsx`, modifier `fieldKey` pour utiliser `name` en fallback :

```typescript
const fieldKey = (field: FormField) => field.id || (field as any).name || field.label;
```

C'est la seule ligne a modifier. Les 5 champs auront alors des cles uniques : `prenom`, `nom`, `email`, `entreprise`, `telephone`.

## Fichier impacte

| Fichier | Modification |
|---------|-------------|
| `src/components/events/EventLandingForm.tsx` | L.28 : fallback `name` puis `label` dans `fieldKey` |

Zero migration. Aucun autre fichier touche.

